import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { compress } from 'hono/compress'
import { createApp } from './app'
import { openDatabase } from './db'
import { hasStaffAccounts } from './store'

/**
 * Production: serves the built site from dist/ and the API from one process.
 * Development: `npm run dev` runs this for /api while Vite serves the site and proxies /api here.
 */
const production = process.env.NODE_ENV === 'production' || process.argv.includes('--production')
const port = Number(process.env.PORT ?? 8787)
const dbPath = process.env.DB_PATH ?? 'data/lush.db'

const db = openDatabase(dbPath)
const app = createApp({
  db,
  secureCookies: production && process.env.INSECURE_COOKIES !== '1',
  appOrigin: process.env.APP_ORIGIN,
  trustProxy: process.env.TRUST_PROXY === '1',
  rateLimitScale: Number(process.env.LUSH_RATE_LIMIT_SCALE) || 1,
  demoHints: !production,
})

if (production) {
  const dist = resolve('dist')
  const indexHtml = readFileSync(resolve(dist, 'index.html'), 'utf8')

  // Pages may only run the site's own scripts: the bundle, plus the inline scripts in index.html pinned by hash.
  const inlineScripts = [...indexHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`,
  )
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${inlineScripts.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
  // Text files (the page, scripts, styles, SVGs) travel compressed; fonts and images are already compact.
  app.use('*', compress())
  app.use('*', async (c, next) => {
    await next()
    if (!c.res.headers.get('content-type')?.includes('text/html')) {
      // Unhashed files in public/ (logo, icons) may change between deploys, so they're cached for a day.
      if (!c.req.path.startsWith('/assets/') && !c.req.path.startsWith('/api/') && c.res.ok) c.header('Cache-Control', 'public, max-age=86400')
      return
    }
    c.header('Content-Security-Policy', csp)
    c.header('X-Frame-Options', 'DENY')
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
    // The page itself is always revalidated, so a new deploy is picked up at once; its assets are immutable.
    c.header('Cache-Control', 'no-cache')
  })

  app.use('/assets/*', async (c, next) => {
    await next()
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
  })
  app.use('/*', serveStatic({ root: './dist' }))
  // Single-page app: pages are all index.html; unknown addresses get a 404 status with the same page,
  // which shows a friendly "can't find that page".
  const pages = new Set(['/', '/account', '/admin', '/admin/customers', '/admin/staff'])
  app.get('*', (c) => {
    const path = c.req.path.replace(/\/+$/, '') || '/'
    if (path.startsWith('/admin')) c.header('X-Robots-Tag', 'noindex, nofollow')
    return c.html(indexHtml, pages.has(path) ? 200 : 404)
  })
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Lush server on http://localhost:${info.port} (${production ? 'production' : 'API only'}, database ${dbPath})`)
  if (!hasStaffAccounts(db)) {
    console.log(
      `No staff accounts in ${dbPath} yet, so nobody can sign in at /admin. Create the owner's account with \`npm run create-admin\`` +
        (production ? '.' : ', or add demo accounts with `npm run seed:demo`.'),
    )
  }
})
