import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from './app'
import { openDatabase } from './db'

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
})

if (production) {
  const dist = resolve('dist')
  const indexHtml = readFileSync(resolve(dist, 'index.html'), 'utf8')

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
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    return c.html(indexHtml, pages.has(path) ? 200 : 404)
  })
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Lush server on http://localhost:${info.port} (${production ? 'production' : 'API only'}, database ${dbPath})`)
})
