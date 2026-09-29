import { test, expect, apiAs, cairoDate, customerWithRequest, DEMO, signIn, uniquePhone, expectNoA11yViolations, expectNoHorizontalOverflow } from './fixtures'
import type { Locator, Page } from '@playwright/test'

const dialog = (page: Page) => page.locator('dialog[open]')
const project = () => test.info().project.name
const toArabicDigits = (s: string) => s.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])

/** Presses Tab until the target has focus, the way a keyboard user gets there. */
async function tabTo(page: Page, target: Locator, max = 40) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('could not reach the element with Tab')
}

test.describe('edge cases', () => {
  test('tablet width: every main screen fits and stays accessible', async ({ page }) => {
    test.skip(project() !== 'desktop', 'one viewport change is enough')
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await expectNoHorizontalOverflow(page)
    await expectNoA11yViolations(page, 'home (768)')
    await page.locator('main').getByRole('button', { name: 'Request an appointment' }).first().click()
    await expect(dialog(page)).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expectNoA11yViolations(page, 'request (768)')
    await page.keyboard.press('Escape')

    const customer = await customerWithRequest()
    await signIn(page, customer)
    await page.goto('/account?lang=ar')
    await expect(page.locator('li', { hasText: customer.request.reference })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expectNoA11yViolations(page, 'account (768, ar)')

    await signIn(page, DEMO.admin)
    await page.goto('/admin?lang=en')
    await page.getByRole('button', { name: /^All/ }).click()
    await expect(page.locator('main button[aria-haspopup="dialog"]:visible').first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expectNoA11yViolations(page, 'admin (768)')
  })

  test('back and forward move between the site, the account and the dashboard', async ({ page }) => {
    const customer = await customerWithRequest()
    await signIn(page, customer)
    await page.goto('/')
    const header = page.locator('header')
    await header.getByRole('link', { name: 'My appointments' }).locator('visible=true').first().click()
    await expect(page).toHaveURL(/\/account$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`Hello, ${customer.firstName}`)
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Beautiful nails.')
    await page.goForward()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`Hello, ${customer.firstName}`)

    // A section link from the account page lands on that section of the home page.
    if (project() === 'mobile') {
      await page.getByRole('button', { name: 'Open menu' }).click()
      await dialog(page).getByRole('link', { name: 'Bridal' }).click()
    } else {
      await header.getByRole('link', { name: 'Bridal' }).click()
    }
    await expect(page.getByRole('heading', { name: 'For the days before the day' })).toBeInViewport()
    await page.goBack()
    await expect(page).toHaveURL(/\/account$/)
  })

  test('very long names and notes never break a layout', async ({ page }) => {
    const longName = 'Anastasia-Marguerite Elisabetta Konstantinopoulou-Fairweather'.slice(0, 60)
    const longNote = `${'Superlongwordwithoutanyspaces'.repeat(6)} ${'and some ordinary words too, '.repeat(12)}`.slice(0, 500)
    const api = await apiAs()
    const phone = uniquePhone()
    await api.post('/api/auth/signup', { data: { firstName: longName, phone, password: 'long-name-2026', lang: 'en' } })
    const created = await api.post('/api/requests', {
      data: { branchId: 'new-cairo', serviceIds: ['gel-x', 'chrome-finish', 'cateye-design'], date: cairoDate(3), time: '13:00', notes: longNote, lang: 'en' },
    })
    expect(created.status()).toBe(201)
    const { request } = (await created.json()) as { request: { reference: string } }
    await api.dispose()

    await signIn(page, { phone, password: 'long-name-2026' })
    await page.goto('/account')
    await expect(page.locator('li', { hasText: request.reference })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await signIn(page, DEMO.admin)
    await page.goto('/admin')
    await page.getByRole('button', { name: /^All/ }).click()
    await page.getByPlaceholder('Name, mobile or reference').fill(request.reference)
    await expect(page.locator('main button[aria-haspopup="dialog"]:visible')).toHaveCount(1)
    await expectNoHorizontalOverflow(page)
    await page.locator('main button[aria-haspopup="dialog"]:visible').first().click()
    await expect(dialog(page).getByText('Superlongword', { exact: false })).toBeVisible()
    // Nothing in the drawer is wider than the drawer.
    const overflow = await dialog(page).evaluate((d) => [...d.querySelectorAll('*')].some((el) => el.getBoundingClientRect().right > d.getBoundingClientRect().right + 1))
    expect(overflow).toBe(false)
  })

  test('a request can be made with the keyboard alone', async ({ page }) => {
    test.skip(project() === 'mobile', 'keyboard use is a desktop concern')
    await signIn(page, DEMO.customer)
    await page.goto('/')
    await page.evaluate(() => sessionStorage.clear())
    await page.reload()
    const open = page.locator('header').getByRole('button', { name: 'Request an appointment' })
    await tabTo(page, open)
    await page.keyboard.press('Enter')
    await expect(dialog(page).getByRole('heading', { name: 'Choose your branch' })).toBeVisible()

    await tabTo(page, dialog(page).getByRole('radio', { name: /New Cairo/ }))
    await page.keyboard.press('Space')
    await expect(dialog(page).getByRole('radio', { name: /New Cairo/ })).toBeChecked()
    await tabTo(page, dialog(page).getByRole('button', { name: 'Continue' }))
    await page.keyboard.press('Enter')

    await tabTo(page, dialog(page).getByLabel('Search the menu'))
    await page.keyboard.type('pedicure')
    await tabTo(page, dialog(page).getByRole('checkbox', { name: /^Basic pedicure/ }))
    await page.keyboard.press('Space')
    await tabTo(page, dialog(page).getByRole('button', { name: 'Continue' }))
    await page.keyboard.press('Enter')

    await tabTo(page, dialog(page).getByLabel('Preferred date'))
    await dialog(page).getByLabel('Preferred date').fill(cairoDate(6))
    await tabTo(page, dialog(page).getByLabel('Preferred time'))
    await dialog(page).getByLabel('Preferred time').fill('15:00')
    // Enter in a field moves on to the next step.
    await page.keyboard.press('Enter')
    await expect(dialog(page).getByRole('heading', { name: 'How can the branch reach you?' })).toBeVisible()
    await tabTo(page, dialog(page).getByRole('button', { name: 'Continue' }))
    await page.keyboard.press('Enter')

    const send = dialog(page).getByRole('button', { name: 'Send request' })
    await tabTo(page, send)
    await page.keyboard.press('Enter')
    await expect(dialog(page).getByRole('heading', { name: 'Request sent' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    await expect(open).toBeFocused()
  })

  test('an Arabic-speaking customer books entirely in Arabic, typing Arabic digits', async ({ page }) => {
    await page.goto('/?lang=ar')
    await page.evaluate(() => sessionStorage.clear())
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    if (project() === 'mobile') await page.locator('main').getByRole('button', { name: 'اطلبي موعدك' }).first().click()
    else await page.locator('header').getByRole('button', { name: 'اطلبي موعدك' }).click()
    await dialog(page).getByText('مصر الجديدة', { exact: true }).click()
    await dialog(page).getByRole('button', { name: 'التالي' }).click()
    await dialog(page).getByText('محتاجة مساعدة في الاختيار', { exact: true }).click()
    await dialog(page).getByRole('button', { name: 'التالي' }).click()
    await dialog(page).getByLabel('اليوم المناسب').fill(cairoDate(8))
    await dialog(page).getByText('أي وقت في اليوم ده يناسبني').click()
    await dialog(page).getByRole('button', { name: 'التالي' }).click()

    const phone = uniquePhone()
    await dialog(page).getByLabel('الاسم الأول').fill('ياسمين')
    await dialog(page).getByLabel('رقم الموبايل').fill(toArabicDigits(phone))
    await dialog(page).getByLabel('كلمة السر', { exact: true }).fill('yasmin-pass-2026')
    await dialog(page).getByRole('button', { name: 'اعملي الحساب' }).click()
    await dialog(page).getByLabel('ملاحظات').fill('عايزة لون نود هادي')
    await dialog(page).getByRole('button', { name: 'التالي' }).click()
    await expect(dialog(page).getByRole('heading', { name: 'راجعي طلبك' })).toBeVisible()
    await expectNoA11yViolations(page, 'review (ar, signed up)')
    await dialog(page).getByRole('button', { name: 'ابعتي الطلب' }).click()
    await expect(dialog(page).getByRole('heading', { name: 'طلبك اتبعت' })).toBeVisible()
    await dialog(page).getByRole('button', { name: 'شوفي مواعيدي' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('أهلاً ياسمين')
    await expect(page.locator('main')).toContainText('في انتظار التأكيد')
    await expectNoHorizontalOverflow(page)

    // The branch sees the same number, in international form, and the Arabic note.
    const staff = await apiAs(DEMO.admin)
    const list = (await (await staff.get(`/api/admin/requests?q=${phone.slice(-7)}`)).json()) as {
      requests: { customer: { phone: string; firstName: string }; notes: string; lang: string; branchId: string }[]
    }
    await staff.dispose()
    expect(list.requests[0]).toMatchObject({
      customer: { phone: `+20${phone.slice(1)}`, firstName: 'ياسمين' },
      notes: 'عايزة لون نود هادي',
      lang: 'ar',
      branchId: 'heliopolis',
    })
  })

  test('closing the panel while a request is still sending never leads to sending it twice', async ({ page }) => {
    const phone = uniquePhone()
    const api = await apiAs()
    await api.post('/api/auth/signup', { data: { firstName: 'Salma', phone, password: 'salma-pass-2026', lang: 'en' } })
    await signIn(page, { phone, password: 'salma-pass-2026' })
    await page.goto('/')
    await page.evaluate(() => sessionStorage.clear())
    await page.reload()
    // A slow connection: the request takes a couple of seconds to arrive.
    await page.route('**/api/requests', async (route) => {
      if (route.request().method() === 'POST') await new Promise((r) => setTimeout(r, 1500))
      await route.continue()
    })
    const opener =
      project() === 'mobile'
        ? page.locator('main').getByRole('button', { name: 'Request an appointment' }).first()
        : page.locator('header').getByRole('button', { name: 'Request an appointment' })
    await opener.click()
    await dialog(page).getByText('New Cairo', { exact: true }).click()
    await dialog(page).getByRole('button', { name: 'Continue' }).click()
    await dialog(page).getByText('Help me choose', { exact: true }).click()
    await dialog(page).getByRole('button', { name: 'Continue' }).click()
    await dialog(page).getByLabel('Preferred date').fill(cairoDate(5))
    await dialog(page).getByText('I’m flexible on time that day').click()
    await dialog(page).getByRole('button', { name: 'Continue' }).click()
    await dialog(page).getByRole('button', { name: 'Continue' }).click()
    const sent = page.waitForResponse((r) => r.url().endsWith('/api/requests') && r.request().method() === 'POST')
    await dialog(page).getByRole('button', { name: 'Send request' }).click()
    await expect(dialog(page).getByRole('button', { name: 'Sending…' })).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    await sent

    // Opening again starts a new request rather than offering to send the last one again.
    await opener.click()
    await expect(dialog(page).getByRole('heading', { name: 'Choose your branch' })).toBeVisible()
    await expect(dialog(page).getByRole('button', { name: 'Send request' })).toHaveCount(0)
    const list = (await (await api.get('/api/requests')).json()) as { requests: unknown[] }
    expect(list.requests).toHaveLength(1)
    await api.dispose()
  })

  test('a staff member disabled mid-shift is signed out at their next action', async ({ page, guard }) => {
    guard.allow(/http 401: GET \/api\/admin\/requests/)
    guard.allow(/status of 401/)
    const admin = await apiAs(DEMO.admin)
    const phone = uniquePhone()
    const created = await admin.post('/api/admin/staff', {
      data: { firstName: 'Temp', phone, password: 'temp-staff-2026', role: 'staff', branchId: 'new-cairo' },
    })
    const { user } = (await created.json()) as { user: { id: number } }
    await signIn(page, { phone, password: 'temp-staff-2026' })
    await page.goto('/admin')
    await expect(page.getByText('New Cairo branch')).toBeVisible()

    await admin.patch(`/api/admin/staff/${user.id}`, { data: { disabled: true } })
    await admin.dispose()
    // Refreshing is their next action — unless a background refresh has already noticed and signed them out.
    await page
      .getByRole('button', { name: 'Refresh' })
      .click({ timeout: 3000 })
      .catch(() => undefined)
    await expect(page.getByRole('heading', { name: 'Staff sign-in', level: 1 })).toBeVisible()
  })
})
