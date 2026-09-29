import { test, expect, expectNoA11yViolations, expectNoHorizontalOverflow } from './fixtures'

const isMobile = () => test.info().project.name === 'mobile'

test.describe('visitor', () => {
  test('home page renders cleanly in English and Arabic', async ({ page }) => {
    const response = await page.goto('/')
    // The production server locks pages down (the Vite dev server doesn't, so only check there).
    if (String(test.info().project.use.baseURL).endsWith(':4321')) {
      const headers = response!.headers()
      expect(headers['content-security-policy']).toContain("script-src 'self' 'sha256-")
      expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
      expect(headers['x-frame-options']).toBe('DENY')
      expect(headers['cache-control']).toBe('no-cache')
    }
    await expect(page).toHaveTitle(/Lush Nail Salon & Spa/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Beautiful nails.')
    await expect(page.getByRole('link', { name: 'Lush Nail Salon & Spa, back to top' }).locator('img')).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expectNoA11yViolations(page, 'home (en)')

    await page.locator('header').getByRole('button', { name: 'اعرض الموقع بالعربي' }).click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar-EG')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('أظافر جميلة')
    await expect(page).toHaveURL(/lang=ar/)
    await expectNoHorizontalOverflow(page)
    await expectNoA11yViolations(page, 'home (ar)')
  })

  test('navigation reaches every section', async ({ page }) => {
    await page.goto('/')
    const targets = [
      ['Services', 'Services & prices'],
      ['Our Work', 'Start with a look'],
      ['Bridal', 'For the days before the day'],
      ['Locations', 'Two branches in Cairo'],
    ] as const
    for (const [link, heading] of targets) {
      if (isMobile()) {
        await page.getByRole('button', { name: 'Open menu' }).click()
        await page.locator('dialog[open]').getByRole('link', { name: link }).click()
        await expect(page.locator('dialog[open]')).toHaveCount(0)
      } else {
        await page.locator('header nav').getByRole('link', { name: link }).click()
      }
      const h = page.getByRole('heading', { name: heading, level: 2 })
      await expect(h).toBeInViewport()
      await expect(h).toBeFocused()
    }
  })

  test('a link to a section opens at that section', async ({ page }) => {
    await page.goto('/#bridal')
    await expect(page.getByRole('heading', { name: 'For the days before the day' })).toBeInViewport()
  })

  test('menu tabs work with mouse and keyboard, and services can be selected', async ({ page }) => {
    await page.goto('/#services')
    const tabs = page.getByRole('tablist', { name: 'Service categories' })
    await tabs.getByRole('tab', { name: 'Skin' }).click()
    await expect(page.getByRole('heading', { name: 'Facial treatments' })).toBeVisible()
    await tabs.getByRole('tab', { name: 'Skin' }).press('ArrowRight')
    await expect(tabs.getByRole('tab', { name: 'Spa & Body' })).toBeFocused()
    await expect(tabs.getByRole('tab', { name: 'Spa & Body' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Waxing or sugar')).toBeVisible()
    await page.keyboard.press('End')
    await expect(tabs.getByRole('tab', { name: 'Bridal' })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Home')
    await expect(tabs.getByRole('tab', { name: 'Nails' })).toHaveAttribute('aria-selected', 'true')

    const gelX = page.locator('#menu-panel').getByRole('button', { name: /^Gel X/ })
    await gelX.click()
    await expect(gelX).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('1 service selected').first()).toBeVisible()
    await gelX.click()
    await expect(gelX).toHaveAttribute('aria-pressed', 'false')
  })

  test('massage shows printed durations and nail art shows its price range', async ({ page }) => {
    await page.goto('/#services')
    await page.getByRole('tab', { name: 'Spa & Body' }).click()
    await expect(page.locator('#menu-panel').getByRole('button', { name: /Regular massage.*30 min.*600 LE/ })).toBeVisible()
    await page.getByRole('tab', { name: 'Nails' }).click()
    await expect(page.locator('#menu-panel').getByRole('button', { name: /Nail art.*30–60 LE per nail/ })).toBeVisible()
  })

  test('gallery viewer opens, browses with the keyboard and restores focus', async ({ page }) => {
    await page.goto('/#work')
    const tile = page.getByRole('button', { name: 'View Pearl chrome' })
    await tile.click()
    const viewer = page.locator('dialog[open]')
    await expect(viewer.getByRole('heading', { name: 'Pearl chrome' })).toBeVisible()
    await expect(viewer.getByText('Chrome finish')).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(viewer.getByRole('heading', { name: 'Cat-eye plum' })).toBeVisible()
    await viewer.getByRole('button', { name: 'Previous look' }).click()
    await expect(viewer.getByRole('heading', { name: 'Pearl chrome' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog[open]')).toHaveCount(0)
    await expect(tile).toBeFocused()
  })

  test('experience links switch the menu to that category', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'See Skin' }).click()
    await expect(page.getByRole('tab', { name: 'Skin' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { name: 'Facial treatments' })).toBeInViewport()
  })

  test('FAQ answers open and close', async ({ page }) => {
    await page.goto('/')
    const q = page.getByText('Is my appointment confirmed when I send a request?')
    await q.click()
    await expect(page.getByText('Not yet. Your appointment is confirmed once the branch replies.')).toBeVisible()
    await q.click()
    await expect(page.getByText('Not yet. Your appointment is confirmed once the branch replies.')).toBeHidden()
  })

  test('language choice survives reloads and other pages', async ({ page }) => {
    await page.goto('/')
    await page.locator('header').getByRole('button', { name: 'اعرض الموقع بالعربي' }).click()
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.goto('/account')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('سجلي دخول')
    await page.getByRole('button', { name: 'View the site in English' }).first().click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  })

  test('outbound links go only to verified destinations and open safely', async ({ page }) => {
    await page.goto('/')
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => ({ href: a.getAttribute('href')!, target: a.getAttribute('target'), rel: a.getAttribute('rel') })))
    const allowed = [
      /^#|^\/(#.*)?$|^\/account$|^\/admin$/,
      /^tel:\+201064205204$|^tel:\+201033115133$/,
      /^https:\/\/www\.instagram\.com\/lushnailsalonspa\/$/,
      /^https:\/\/share\.google\/(2i9ywsEqEBSprMnFR|jjMSd7ndVvkRPeHfl)$/,
      /^https:\/\/drive\.google\.com\/file\/d\/1KbPrcYD4-cQhg-XCMTQ9drVSRL204BWs\/view$/,
    ]
    for (const link of hrefs) {
      expect(allowed.some((r) => r.test(link.href)), `unexpected link ${link.href}`).toBe(true)
      if (link.target === '_blank') expect(link.rel).toContain('noopener')
    }
  })

  test('an unknown address shows a helpful page', async ({ page, guard }) => {
    // The page is served with a real 404 status, which the browser reports in the console.
    guard.allow(/http 404: GET \/nothing-here/)
    guard.allow(/status of 404/)
    await page.goto('/nothing-here')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('can’t find')
    await page.getByRole('link', { name: 'Back to the home page' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Beautiful nails.')
  })
})
