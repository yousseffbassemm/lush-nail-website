import { test, expect, apiAs, cairoDate, customerWithRequest, DEMO, signIn, uniquePhone, expectNoA11yViolations, expectNoHorizontalOverflow } from './fixtures'
import type { Page } from '@playwright/test'

const drawer = (page: Page) => page.locator('dialog[open]')

/** Finds a request by its reference and opens it (table row on desktop, card on mobile). */
async function openRequest(page: Page, reference: string) {
  await page.getByRole('button', { name: /^All/ }).click()
  await page.getByPlaceholder('Name, mobile or reference').fill(reference)
  await expect(page.locator('main button[aria-haspopup="dialog"]:visible')).toHaveCount(1)
  await page.locator('main button[aria-haspopup="dialog"]:visible').first().click()
  await expect(drawer(page).locator('#drawer-title')).toContainText(reference)
}

test.describe('staff dashboard', () => {
  test('staff sign in and see only their branch; wrong passwords and customers are kept out', async ({ page, guard }) => {
    guard.allow(/http 401: POST \/api\/auth\/login/)
    guard.allow(/status of 401/)
    const helio = await customerWithRequest({ branchId: 'heliopolis' })
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Staff sign-in', level: 1 })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'New account' })).toHaveCount(0)
    await page.getByLabel('Mobile number').fill(DEMO.staff.phone)
    await page.getByLabel('Password', { exact: true }).fill('not-the-password')
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('don’t match')
    await page.getByLabel('Password', { exact: true }).fill(DEMO.staff.password)
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.getByText('New Cairo branch')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Staff', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: /^All/ }).click()
    await page.getByPlaceholder('Name, mobile or reference').fill(helio.request.reference)
    await expect(page.getByText('No requests match your search.')).toBeVisible()
    await expectNoA11yViolations(page, 'admin requests')
    await expectNoHorizontalOverflow(page)

    // A staff member who types /admin/staff lands back on requests.
    await page.goto('/admin/staff')
    await expect(page).toHaveURL(/\/admin$/)

    // A customer who opens /admin is told it's for staff.
    await page.getByRole('button', { name: 'Log out' }).locator('visible=true').first().click()
    await signIn(page, { phone: helio.phone, password: helio.password })
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'This area is for Lush staff' })).toBeVisible()
  })

  test('confirm, reschedule and complete a request; the customer sees each change', async ({ page, browser }) => {
    const customer = await customerWithRequest({ notes: 'Short almond please' })
    await signIn(page, DEMO.staff)
    await page.goto('/admin')
    await openRequest(page, customer.request.reference)
    await expect(drawer(page).getByText('Short almond please')).toBeVisible()
    await expect(drawer(page).getByRole('link', { name: 'Call' })).toHaveAttribute('href', /^tel:\+20/)
    await expectNoA11yViolations(page, 'request drawer')

    await drawer(page).getByRole('button', { name: 'Mark as contacted' }).click()
    await expect(drawer(page).getByText('Contacted').first()).toBeVisible()
    await drawer(page).getByRole('button', { name: 'Confirm appointment' }).click()
    await drawer(page).getByLabel('Time').fill('')
    await drawer(page).getByRole('button', { name: 'Save' }).click()
    await expect(drawer(page).getByText('Choose a time.')).toBeVisible()
    await drawer(page).getByLabel('Time').fill('16:00')
    await drawer(page).getByLabel('Message to the customer').fill('See you at 4.')
    await drawer(page).getByRole('button', { name: 'Save' }).click()
    await expect(drawer(page).getByText('Confirmed for')).toBeVisible()

    await drawer(page).getByLabel('Only staff see notes.').fill('Prefers Nada.')
    await drawer(page).getByRole('button', { name: 'Add note' }).click()
    await expect(drawer(page).getByText('Prefers Nada.')).toBeVisible()

    const seen = await customer.ctx.get('/api/requests')
    const mine = ((await seen.json()) as { requests: { status: string; confirmedTime: string; customerMessage: string }[] }).requests[0]
    expect(mine).toMatchObject({ status: 'confirmed', confirmedTime: '16:00', customerMessage: 'See you at 4.' })
    expect(JSON.stringify(await seen.json())).not.toContain('Nada')

    await drawer(page).getByRole('button', { name: 'Change confirmed time' }).click()
    await drawer(page).getByLabel('Time').fill('17:30')
    await drawer(page).getByRole('button', { name: 'Save' }).click()
    await expect(drawer(page).getByText('5:30 pm').first()).toBeVisible()
    await drawer(page).getByRole('button', { name: 'Mark completed' }).click()
    await expect(drawer(page).getByRole('button', { name: 'Reopen' })).toBeVisible()
    await expect(drawer(page).locator('ol li')).toHaveCount(6)

    // The customer's own page reflects it.
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, reducedMotion: 'reduce' })
    const customerPage = await context.newPage()
    await signIn(customerPage, customer)
    await customerPage.goto('/account')
    await expect(customerPage.locator('li', { hasText: customer.request.reference })).toContainText('Completed')
    await context.close()
  })

  test('decline with a message the customer can read', async ({ page }) => {
    const customer = await customerWithRequest()
    await signIn(page, DEMO.staff)
    await page.goto('/admin')
    await openRequest(page, customer.request.reference)
    await drawer(page).getByRole('button', { name: 'Decline' }).click()
    await drawer(page).getByLabel('Message to the customer').fill('Fully booked that day, please call us.')
    await drawer(page).getByRole('button', { name: 'Save' }).click()
    await expect(drawer(page).getByText('Declined').first()).toBeVisible()
    const mine = ((await (await customer.ctx.get('/api/requests')).json()) as { requests: { status: string; customerMessage: string }[] }).requests[0]
    expect(mine).toMatchObject({ status: 'declined', customerMessage: 'Fully booked that day, please call us.' })
    await page.keyboard.press('Escape')
    await expect(drawer(page)).toHaveCount(0)
  })

  test('when two people act on one request, the second sees what the first did', async ({ page, guard }) => {
    guard.allow(/http 409: POST \/api\/admin\/requests\/\d+\/status/)
    guard.allow(/status of 409/)
    const customer = await customerWithRequest()
    await signIn(page, DEMO.staff)
    await page.goto('/admin')
    await openRequest(page, customer.request.reference)
    // Meanwhile, the owner declines it from another device.
    const admin = await apiAs(DEMO.admin)
    await admin.post(`/api/admin/requests/${customer.request.id}/status`, { data: { status: 'declined', customerMessage: 'Fully booked.' } })
    await admin.dispose()
    // "Mark as contacted" was meant for a new request; it mustn't quietly reopen a declined one.
    await drawer(page).getByRole('button', { name: 'Mark as contacted' }).click()
    await expect(drawer(page).getByRole('alert')).toContainText('Someone else updated this request')
    await expect(drawer(page).getByText('Declined').first()).toBeVisible()
    await expect(drawer(page).getByRole('button', { name: 'Reopen' })).toBeVisible()
    const mine = ((await (await customer.ctx.get('/api/requests')).json()) as { requests: { status: string }[] }).requests[0]
    expect(mine.status).toBe('declined')
  })

  test('status filters, today view and search', async ({ page }) => {
    const customer = await customerWithRequest({ date: cairoDate(1), time: '10:00' })
    const admin = await apiAs(DEMO.admin)
    await admin.post(`/api/admin/requests/${customer.request.id}/status`, { data: { status: 'confirmed', confirmedDate: cairoDate(0), confirmedTime: '23:45' } })
    await admin.dispose()
    await signIn(page, DEMO.admin)
    await page.goto('/admin')
    await page.getByRole('button', { name: /^Today/ }).click()
    await expect(page.locator('main').getByText(customer.firstName).locator('visible=true').first()).toBeVisible()
    await page.getByRole('button', { name: /^Closed/ }).click()
    await page.getByPlaceholder('Name, mobile or reference').fill('no-such-thing')
    await expect(page.getByText('No requests match your search.')).toBeVisible()
    await page.getByPlaceholder('Name, mobile or reference').fill(customer.phone.slice(-6))
    await page.getByRole('button', { name: /^All/ }).click()
    await expect(page.locator('main').getByText(customer.firstName).locator('visible=true').first()).toBeVisible()
  })

  test('customers list and password reset codes', async ({ page }) => {
    const customer = await customerWithRequest()
    await signIn(page, DEMO.staff)
    await page.goto('/admin/customers')
    await page.getByPlaceholder('Name, mobile or email').fill(customer.firstName)
    const card = page.locator('li', { hasText: customer.firstName })
    await expect(card).toContainText(/Requests:\s*1/)
    await card.getByRole('button', { name: 'Reset code' }).click()
    await page.getByRole('button', { name: 'Create code' }).click()
    await expect(drawer(page).getByText(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/)).toBeVisible()
    await expectNoA11yViolations(page, 'reset code dialog')
    await drawer(page).getByRole('button', { name: 'Done' }).click()
    await expect(drawer(page)).toHaveCount(0)

    // The request count leads to that customer's requests, whatever their status.
    await card.getByRole('link', { name: new RegExp(`See ${customer.firstName}’s requests`) }).click()
    await expect(page).toHaveURL(/\/admin\?q=0/)
    await expect(page.getByRole('button', { name: /^All/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByPlaceholder('Name, mobile or reference')).toHaveValue(/^0\d{10}$/)
    await expect(page.locator('main').getByText(customer.request.reference).locator('visible=true').first()).toBeVisible()
  })

  test('admins add staff, set their branch and disable them, but cannot lock themselves out', async ({ page, guard }) => {
    guard.allow(/http 409: POST \/api\/admin\/staff/)
    guard.allow(/status of 409/)
    await signIn(page, DEMO.admin)
    await page.goto('/admin/staff')
    await expect(page.getByRole('heading', { name: 'Staff', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Enter your first name.')).toBeVisible()

    const phone = uniquePhone()
    const name = `Mariam${phone.slice(-4)}`
    await page.getByLabel('First name').fill(name)
    await page.getByLabel('Mobile number (login)').fill(phone)
    await page.getByLabel('Temporary password').fill('mariam-temp-1')
    await page.getByLabel('Branch', { exact: true }).selectOption('heliopolis')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Staff account created.')).toBeVisible()
    const row = page.locator('li', { hasText: name })
    await expect(row.getByLabel(/Branch/)).toHaveValue('heliopolis')

    await page.getByLabel('First name').fill('Duplicate')
    await page.getByLabel('Mobile number (login)').fill(phone)
    await page.getByLabel('Temporary password').fill('mariam-temp-1')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('An account with this number already exists.', { exact: false })).toBeVisible()

    await row.getByRole('button', { name: 'Disable' }).click()
    await expect(row).toContainText('Disabled')
    await row.getByRole('button', { name: 'Enable' }).click()
    await expect(row).toContainText('Active')

    const me = page.locator('li', { hasText: '(you)' })
    await expect(me.getByRole('button', { name: 'Disable' })).toHaveCount(0)
    await expect(me.getByLabel(/Role/)).toBeDisabled()
    await expectNoA11yViolations(page, 'staff management')
  })
})
