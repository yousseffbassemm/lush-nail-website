import { test, expect, cairoDate, customerWithRequest, DEMO, signIn, settle, expectNoA11yViolations, expectNoHorizontalOverflow } from './fixtures'
import type { Page } from '@playwright/test'

const dialog = (page: Page) => page.locator('dialog[open]')
const project = () => test.info().project.name

async function openRequest(page: Page) {
  if (project() === 'mobile') await page.locator('main').getByRole('button', { name: /Request an appointment|اطلبي موعد/ }).first().click()
  else await page.locator('header').getByRole('button', { name: /Request an appointment|اطلبي موعد/ }).click()
  await expect(dialog(page)).toBeVisible()
}

test.describe('accessibility and motion', () => {
  test('every step of the request flow is accessible, in English and Arabic', async ({ page }) => {
    await signIn(page, DEMO.customer)
    await page.goto('/')
    await page.evaluate(() => sessionStorage.clear())
    await page.reload()
    await openRequest(page)
    await expectNoA11yViolations(page, 'request: branch')
    await dialog(page).getByText('New Cairo', { exact: true }).click()
    await dialog(page).getByRole('button', { name: 'Continue' }).click()
    await dialog(page).getByLabel('Search the menu').fill('gel')
    await expectNoA11yViolations(page, 'request: services (search)')
    await dialog(page).getByLabel('Search the menu').fill('')
    await dialog(page).getByRole('button', { name: 'Continue' }).click()
    await expectNoA11yViolations(page, 'request: services (error)')
    await dialog(page).getByText('Help me choose', { exact: true }).click()
    await dialog(page).getByRole('button', { name: 'Continue' }).click()
    await dialog(page).getByLabel('Preferred date').fill(cairoDate(3))
    await dialog(page).getByLabel('Preferred time').fill('12:30')
    await expectNoA11yViolations(page, 'request: when')
    await dialog(page).getByRole('button', { name: 'Continue' }).click()
    await expectNoA11yViolations(page, 'request: details')
    await dialog(page).getByRole('button', { name: 'Continue' }).click()
    await expectNoA11yViolations(page, 'request: review')
    await expectNoHorizontalOverflow(page)

    await dialog(page).getByRole('button', { name: 'اعرض الموقع بالعربي' }).click()
    await expect(dialog(page).getByRole('heading', { name: 'راجعي طلبك' })).toBeVisible()
    await expectNoA11yViolations(page, 'request: review (ar)')
    for (let i = 0; i < 4; i++) await dialog(page).getByRole('button', { name: 'رجوع' }).click()
    await expect(dialog(page).getByRole('heading', { name: 'اختاري الفرع' })).toBeVisible()
    await expectNoA11yViolations(page, 'request: branch (ar)')
    await expectNoHorizontalOverflow(page)
  })

  test('the look viewer, sign-in dialog and mobile menu are accessible', async ({ page }) => {
    await page.goto('/#work')
    await page.getByRole('button', { name: 'View Pearl chrome' }).click()
    await expectNoA11yViolations(page, 'look viewer')
    await page.keyboard.press('Escape')

    if (project() === 'mobile') {
      await page.getByRole('button', { name: 'Open menu' }).click()
      await expectNoA11yViolations(page, 'mobile menu')
      await dialog(page).getByRole('button', { name: /Log in/ }).click()
    } else {
      await page.locator('header').getByRole('button', { name: 'Log in' }).click()
    }
    await expect(dialog(page).getByRole('heading', { name: /Log in/ })).toBeVisible()
    await expectNoA11yViolations(page, 'sign-in dialog')
    await dialog(page).getByRole('tab', { name: 'New account' }).click()
    await expectNoA11yViolations(page, 'sign-up dialog')
  })

  test('the staff dashboard is accessible in Arabic, with the drawer open', async ({ page }) => {
    const customer = await customerWithRequest()
    await signIn(page, DEMO.admin)
    await page.goto('/admin?lang=ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.getByRole('button', { name: /^الكل/ }).click()
    await expectNoA11yViolations(page, 'admin requests (ar)')
    await expectNoHorizontalOverflow(page)
    await page.getByPlaceholder(/الاسم/).fill(customer.request.reference)
    await expect(page.locator('main button[aria-haspopup="dialog"]:visible')).toHaveCount(1)
    await page.locator('main button[aria-haspopup="dialog"]:visible').first().click()
    await expect(dialog(page).locator('#drawer-title')).toContainText(customer.request.reference)
    await expectNoA11yViolations(page, 'request drawer (ar)')
    await page.goto('/admin/customers?lang=ar')
    await expect(page.getByRole('heading', { level: 1, name: 'العملاء' })).toBeVisible()
    await expect(page.locator('main li').first()).toBeVisible()
    await expectNoA11yViolations(page, 'admin customers (ar)')
    await page.goto('/admin/staff?lang=ar')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('main li').first()).toBeVisible()
    await expectNoA11yViolations(page, 'admin staff (ar)')
    await expectNoHorizontalOverflow(page)
  })

  test('the account page is accessible in Arabic', async ({ page }) => {
    const customer = await customerWithRequest()
    await signIn(page, customer)
    await page.goto('/account?lang=ar')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(customer.firstName)
    await expect(page.locator('li', { hasText: customer.request.reference })).toBeVisible()
    await expectNoA11yViolations(page, 'account (ar)')
    await expectNoHorizontalOverflow(page)
  })

  test('sections are never left hidden, with or without motion', async ({ page }) => {
    await page.goto('/')
    const hidden = () =>
      page.locator('.reveal').evaluateAll((els) => els.filter((el) => Number(getComputedStyle(el).opacity) < 1).length)
    if (project() === 'motion') {
      // Below the fold, sections wait to rise in until they are scrolled to.
      expect(await hidden()).toBeGreaterThan(0)
      await page.locator('#locations').scrollIntoViewIfNeeded()
      await settle(page)
      await expect(page.locator('#locations .reveal').first()).toHaveCSS('opacity', '1')
      // Scroll through everything from the top; nothing may stay invisible afterwards.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      for (let y = 0; y < 30; y++) {
        const done = await page.evaluate(() => {
          window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'instant' })
          return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
        })
        if (done) break
        await page.waitForTimeout(120)
      }
      await settle(page)
    }
    expect(await hidden()).toBe(0)
  })

  test('every illustrated nail ends up painted, with or without motion', async ({ page }) => {
    await page.goto('/')
    const unfinished = () =>
      page.evaluate(() => {
        const strokes = [...document.querySelectorAll('.paint-stroke')].filter((el) => parseFloat(getComputedStyle(el).strokeDashoffset) !== 0)
        const coats = [...document.querySelectorAll('.nail-detail, .top-coat')].filter((el) => getComputedStyle(el).opacity !== '1')
        return { strokes: strokes.length, coats: coats.length, total: document.querySelectorAll('.paint-stroke').length }
      })
    if (project() === 'motion') {
      // The gallery waits with bare nails until it's seen, then paints them.
      const before = await unfinished()
      expect(before.strokes).toBeGreaterThan(0)
      await page.getByRole('button', { name: 'View Pearl chrome' }).scrollIntoViewIfNeeded()
      await page.getByRole('button', { name: 'View Classic red' }).scrollIntoViewIfNeeded()
      await settle(page)
    }
    const after = await unfinished()
    expect(after.total).toBeGreaterThan(30)
    expect(after).toMatchObject({ strokes: 0, coats: 0 })
  })

  test('the hero text is readable within a second and a half', async ({ page }) => {
    await page.goto('/')
    const started = Date.now()
    // The words and buttons; the decorative plate may keep playing a little longer.
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a) => {
            const el = (a.effect as KeyframeEffect | null)?.target
            return el instanceof HTMLElement && !!el.closest('.hero-seq, .hero-line')
          })
          .map((a) => a.finished),
      ),
    )
    expect(Date.now() - started).toBeLessThan(1_500)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('opacity', '1')
  })

  test('if the booking service is unreachable, the request can still be copied or phoned in', async ({ page, context, guard }) => {
    guard.allow(/requestfailed: .*\/api\//)
    guard.allow(/Failed to load resource: net::ERR_FAILED/)
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    let checks = 0
    await page.route('**/api/**', (route) => {
      if (route.request().url().endsWith('/api/auth/me')) checks++
      return route.abort('failed')
    })
    await page.goto('/')
    // The site retries once before falling back to message-or-call requests.
    await expect.poll(() => checks).toBeGreaterThanOrEqual(2)
    await expect(page.locator('header').getByRole('button', { name: 'Log in' })).toHaveCount(0)
    await openRequest(page)
    await dialog(page).getByText('Heliopolis', { exact: true }).click()
    await dialog(page).getByRole('button', { name: 'Continue' }).click()
    await dialog(page).getByText('Help me choose', { exact: true }).click()
    await dialog(page).getByRole('button', { name: 'Continue' }).click()
    await dialog(page).getByLabel('Preferred date').fill(cairoDate(4))
    await dialog(page).getByText('I’m flexible on time that day').click()
    await dialog(page).getByRole('button', { name: 'Continue' }).click()
    // Offline, the details step asks for a name and number only: no account, no password.
    await expect(dialog(page).getByLabel('Password', { exact: true })).toHaveCount(0)
    await dialog(page).getByLabel('First name').fill('Nour')
    await dialog(page).getByLabel('Mobile number').fill('0100 123 4567')
    await dialog(page).getByRole('button', { name: 'Continue' }).click()
    await expect(dialog(page).getByRole('button', { name: 'Send request' })).toHaveCount(0)
    await expect(dialog(page).getByRole('link', { name: 'Call Heliopolis' })).toHaveAttribute('href', 'tel:+201033115133')
    await expectNoA11yViolations(page, 'review (manual)')
    await dialog(page).getByRole('button', { name: 'Copy request' }).click()
    await expect(dialog(page).getByRole('heading', { name: 'Your request is copied' })).toBeVisible()
    // Nothing claims the request was sent or confirmed.
    await expect(dialog(page)).not.toContainText(/Request sent|confirmed\b(?! once)/i)
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toContain('Nour')
    expect(copied).toContain('01001234567')
    expect(copied).toContain('Heliopolis')
  })
})
