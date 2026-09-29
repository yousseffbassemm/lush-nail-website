import { test as base, expect, request as playwrightRequest, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Every test fails if the page logs a console error or warning, throws, or gets an unexpected
 * failed response. Tests that deliberately trigger an error (a wrong password) allow it explicitly.
 */
export interface Guard {
  allow: (pattern: RegExp) => void
}

export const test = base.extend<{ guard: Guard }>({
  guard: [
    async ({ page }, use) => {
      const problems: string[] = []
      const allowed: RegExp[] = []
      page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') problems.push(`console.${m.type()}: ${m.text()}`)
      })
      page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
      page.on('response', (r) => {
        if (r.status() >= 400) problems.push(`http ${r.status()}: ${r.request().method()} ${new URL(r.url()).pathname}`)
      })
      page.on('requestfailed', (r) => {
        const error = r.failure()?.errorText ?? ''
        // Navigations cancel in-flight requests; that isn't a defect.
        if (!error.includes('ERR_ABORTED')) problems.push(`requestfailed: ${r.url()} ${error}`)
        if (!new URL(r.url()).hostname.match(/^(localhost|127\.0\.0\.1)$/)) problems.push(`external request: ${r.url()}`)
      })
      await use({ allow: (p) => allowed.push(p) })
      const real = problems.filter((p) => !allowed.some((a) => a.test(p)))
      expect(real, 'console errors, page errors or failed requests').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

export const DEMO = {
  admin: { phone: '010 0000 0001', password: 'demo-admin-2026', name: 'Demo Owner' },
  staff: { phone: '010 0000 0002', password: 'demo-staff-2026', name: 'Demo Reception' },
  customer: { phone: '010 0000 0003', password: 'demo-customer-2026', name: 'Demo Customer' },
}

/** Signs in through the API; the browser context shares the session cookie. */
export async function signIn(page: Page, who: { phone: string; password: string }) {
  const origin = new URL(page.url() === 'about:blank' ? (test.info().project.use.baseURL as string) : page.url()).origin
  const res = await page.request.post('/api/auth/login', { headers: { origin }, data: who })
  expect(res.status(), 'demo sign-in').toBe(200)
}

export async function signOut(page: Page) {
  const origin = new URL(test.info().project.use.baseURL as string).origin
  await page.request.post('/api/auth/logout', { headers: { origin }, data: {} })
}

/** A Cairo calendar date, `days` from today. */
export function cairoDate(days: number) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date())
  const [y, m, d] = today.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** A mobile number no other test uses. */
export function uniquePhone() {
  return `0111${String(Date.now()).slice(-7)}`
}

/** Waits until entrance animations and transitions have settled (looping ones are ignored). */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const running = () =>
      document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity)
    // Content that arrives a moment later (a list loading, a section revealing) starts new motion,
    // so wait until nothing has moved for a short while.
    for (let round = 0; round < 40; round++) {
      await frames()
      const list = running()
      if (list.length) {
        await Promise.all(list.map((a) => a.finished.catch(() => undefined)))
        continue
      }
      await new Promise((r) => setTimeout(r, 150))
      if (!running().length) return
    }
  })
}

export async function expectNoA11yViolations(page: Page, label: string) {
  // Scanning mid-animation would measure half-faded text, so let the motion finish first.
  await settle(page)
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze()
  const summary = results.violations.map(
    (v) =>
      `${v.id}: ${v.nodes
        .slice(0, 3)
        .map((n) => {
          const data = n.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined
          return `${n.target.join(' ')}${data?.fgColor ? ` (${data.fgColor} on ${data.bgColor}, ${data.contrastRatio})` : ''}`
        })
        .join(' | ')}`,
  )
  expect(summary, `accessibility violations on ${label}`).toEqual([])
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(0)
}

/** A separate API client (its own cookies), for arranging data a test needs. */
export async function apiAs(who?: { phone: string; password: string }) {
  const baseURL = test.info().project.use.baseURL as string
  const ctx = await playwrightRequest.newContext({ baseURL, extraHTTPHeaders: { origin: new URL(baseURL).origin } })
  if (who) expect((await ctx.post('/api/auth/login', { data: who })).status()).toBe(200)
  return ctx
}

/** Creates a customer with one request through the API. */
export async function customerWithRequest(body: Record<string, unknown> = {}) {
  const phone = uniquePhone()
  const password = 'e2e-customer-pass'
  const firstName = `Test${phone.slice(-4)}`
  const ctx = await apiAs()
  const signup = await ctx.post('/api/auth/signup', { data: { firstName, phone, password, lang: 'en' } })
  expect(signup.status()).toBe(201)
  const created = await ctx.post('/api/requests', {
    data: { branchId: 'new-cairo', serviceIds: ['gel-x'], date: cairoDate(2), time: '15:00', notes: '', lang: 'en', ...body },
  })
  expect(created.status()).toBe(201)
  const { request } = (await created.json()) as { request: { id: number; reference: string } }
  return { ctx, phone, password, firstName, request }
}
