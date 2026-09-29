import { test } from 'node:test'
import assert from 'node:assert/strict'

// Cheaper password hashing for tests only; must be set before the security module loads.
process.env.LUSH_SCRYPT_N = '16384'
const { createApp } = await import('../app')
const { openDatabase } = await import('../db')
const { hashPassword } = await import('../security')
const { insertUser } = await import('../store')
const { addDays, nowInCairo } = await import('../../src/booking/cairoTime')

const ORIGIN = 'http://localhost'

function setup() {
  const db = openDatabase(':memory:')
  const app = createApp({ db, secureCookies: false })
  return { db, app }
}

type App = ReturnType<typeof setup>['app']

/** A tiny browser: keeps its session cookie and sends same-origin JSON. */
function client(app: App) {
  let cookie = ''
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await app.request(`${ORIGIN}${path}`, {
      method,
      headers: {
        ...(method === 'GET' ? {} : { 'content-type': 'application/json', origin: ORIGIN }),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0]
    const json = (await res.json().catch(() => null)) as any
    return { status: res.status, json, headers: res.headers }
  }
  return { get: (p: string) => call('GET', p), post: (p: string, b?: unknown, h?: Record<string, string>) => call('POST', p, b, h), patch: (p: string, b?: unknown) => call('PATCH', p, b) }
}

async function makeStaff(db: ReturnType<typeof setup>['db'], role: 'staff' | 'admin', phone: string, branchId: string | null) {
  insertUser(db, { role, firstName: role, phone, email: null, passwordHash: await hashPassword('staff-password-1'), branchId, lang: 'en' })
}

const tomorrow = () => addDays(nowInCairo().date, 1)
const request = (overrides: Record<string, unknown> = {}) => ({
  branchId: 'new-cairo',
  serviceIds: ['gel-x'],
  date: tomorrow(),
  time: '16:30',
  notes: 'Almond',
  lang: 'en',
  ...overrides,
})

test('sign up, stay signed in, sign out', async () => {
  const { app } = setup()
  const c = client(app)
  const signup = await c.post('/api/auth/signup', { firstName: 'Mariam', phone: '010 1234 5678', password: 'correct horse', lang: 'ar' })
  assert.equal(signup.status, 201)
  assert.equal(signup.json.user.phone, '+201012345678')
  assert.equal(signup.json.user.role, 'customer')
  assert.match(signup.headers.get('set-cookie')!, /HttpOnly/i)
  assert.match(signup.headers.get('set-cookie')!, /SameSite=Lax/i)
  assert.equal((await c.get('/api/auth/me')).json.user.firstName, 'Mariam')
  await c.post('/api/auth/logout')
  assert.equal((await c.get('/api/auth/me')).json.user, null)
})

test('sign-up validation and duplicate numbers', async () => {
  const { app } = setup()
  const c = client(app)
  const bad = await c.post('/api/auth/signup', { firstName: '', phone: '0101', password: 'short' })
  assert.equal(bad.status, 400)
  assert.deepEqual(bad.json.fields, { firstName: 'firstName', phone: 'phoneFormat', password: 'passwordShort' })
  await c.post('/api/auth/signup', { firstName: 'A', phone: '01012345678', password: 'password-1' })
  // Same number written differently (international format, Arabic-Indic digits) is the same account.
  const again = await client(app).post('/api/auth/signup', { firstName: 'B', phone: '+20 ١٠١٢٣٤٥٦٧٨', password: 'password-2' })
  assert.equal(again.status, 409)
  assert.equal(again.json.fields.phone, 'phoneTaken')
})

test('log in accepts any format of the number; wrong details give one generic error', async () => {
  const { app } = setup()
  await client(app).post('/api/auth/signup', { firstName: 'A', phone: '01012345678', password: 'password-1' })
  const c = client(app)
  assert.equal((await c.post('/api/auth/login', { phone: '01012345678', password: 'nope-nope' })).json.error, 'bad_credentials')
  assert.equal((await c.post('/api/auth/login', { phone: '01099999999', password: 'password-1' })).json.error, 'bad_credentials')
  const ok = await c.post('/api/auth/login', { phone: '+201012345678', password: 'password-1' })
  assert.equal(ok.status, 200)
})

test('cross-site and non-JSON writes are refused', async () => {
  const { app } = setup()
  const evil = await client(app).post('/api/auth/signup', { firstName: 'A', phone: '01012345678', password: 'password-1' }, { origin: 'https://evil.example' })
  assert.equal(evil.status, 403)
  const res = await app.request(`${ORIGIN}/api/auth/login`, { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'text/plain' }, body: 'x' })
  assert.equal(res.status, 400)
})

test('login attempts are rate limited', async () => {
  const { app } = setup()
  const c = client(app)
  let last = 0
  for (let i = 0; i < 11; i++) last = (await c.post('/api/auth/login', { phone: '01012345678', password: 'x' })).status
  assert.equal(last, 429)
})

test('customers send requests, see them, and cancel them', async () => {
  const { app } = setup()
  const c = client(app)
  assert.equal((await c.post('/api/requests', request())).status, 401)
  await c.post('/api/auth/signup', { firstName: 'Nour', phone: '01012345678', password: 'password-1' })

  const past = await c.post('/api/requests', request({ date: addDays(nowInCairo().date, -1) }))
  assert.equal(past.json.fields.date, 'datePast')
  const nothing = await c.post('/api/requests', request({ serviceIds: [] }))
  assert.equal(nothing.json.fields.serviceIds, 'services')
  const unknown = await c.post('/api/requests', request({ serviceIds: ['free-everything'] }))
  assert.equal(unknown.json.fields.serviceIds, 'unknownService')

  const created = await c.post('/api/requests', request({ lookRef: 'LK-03' }))
  assert.equal(created.status, 201)
  assert.match(created.json.request.reference, /^LSH-[0-9A-Z]{6}$/)
  assert.equal(created.json.request.status, 'new')
  assert.equal(created.json.request.services[0].price.amount, 1000)

  const mine = await c.get('/api/requests')
  assert.equal(mine.json.requests.length, 1)

  // Another customer can't see or cancel it.
  const other = client(app)
  await other.post('/api/auth/signup', { firstName: 'Other', phone: '01112345678', password: 'password-1' })
  assert.equal((await other.get('/api/requests')).json.requests.length, 0)
  assert.equal((await other.post(`/api/requests/${created.json.request.reference}/cancel`)).status, 404)

  const cancelled = await c.post(`/api/requests/${created.json.request.reference}/cancel`)
  assert.equal(cancelled.json.request.status, 'cancelled')
  assert.equal((await c.post(`/api/requests/${created.json.request.reference}/cancel`)).status, 409)
})

test("staff see requests for their branch only, and customers can't reach staff pages", async () => {
  const { app, db } = setup()
  await makeStaff(db, 'staff', '+201000000002', 'new-cairo')
  const customer = client(app)
  await customer.post('/api/auth/signup', { firstName: 'Salma', phone: '01012345678', password: 'password-1' })
  await customer.post('/api/requests', request({ branchId: 'new-cairo' }))
  const helio = await customer.post('/api/requests', request({ branchId: 'heliopolis' }))

  assert.equal((await customer.get('/api/admin/requests')).status, 403)
  assert.equal((await client(app).get('/api/admin/requests')).status, 401)

  const staff = client(app)
  assert.equal((await staff.post('/api/auth/login', { phone: '01000000002', password: 'staff-password-1' })).status, 200)
  const list = await staff.get('/api/admin/requests')
  assert.equal(list.json.requests.length, 1)
  assert.equal(list.json.requests[0].branchId, 'new-cairo')
  assert.equal(list.json.requests[0].customer.firstName, 'Salma')
  assert.equal((await staff.get(`/api/admin/requests/${helio.json.request.id}`)).status, 404)
  assert.equal((await staff.get('/api/admin/staff')).status, 403)
  // Staff accounts can't file customer requests.
  const own = await staff.post('/api/requests', request())
  assert.equal(own.status, 403)
  assert.equal(own.json.error, 'staff_account')
})

test('confirming needs a date and time, and the customer sees the confirmation', async () => {
  const { app, db } = setup()
  await makeStaff(db, 'admin', '+201000000001', null)
  const customer = client(app)
  await customer.post('/api/auth/signup', { firstName: 'Farida', phone: '01012345678', password: 'password-1' })
  const { request: r } = (await customer.post('/api/requests', request())).json

  const admin = client(app)
  await admin.post('/api/auth/login', { phone: '01000000001', password: 'staff-password-1' })
  const missing = await admin.post(`/api/admin/requests/${r.id}/status`, { status: 'confirmed' })
  assert.deepEqual(missing.json.fields, { confirmedDate: 'date', confirmedTime: 'time' })

  const confirmed = await admin.post(`/api/admin/requests/${r.id}/status`, {
    status: 'confirmed',
    confirmedDate: tomorrow(),
    confirmedTime: '17:00',
    customerMessage: 'See you at 5.',
  })
  assert.equal(confirmed.json.request.status, 'confirmed')
  assert.deepEqual(confirmed.json.transitions, ['confirmed', 'completed', 'no_show', 'cancelled'])

  const seen = (await customer.get('/api/requests')).json.requests[0]
  assert.equal(seen.status, 'confirmed')
  assert.equal(seen.confirmedTime, '17:00')
  assert.equal(seen.customerMessage, 'See you at 5.')

  await admin.post(`/api/admin/requests/${r.id}/notes`, { note: 'Prefers Nada.' })
  const detail = await admin.get(`/api/admin/requests/${r.id}`)
  assert.deepEqual(
    detail.json.events.map((e: { type: string }) => e.type),
    ['created', 'status', 'note'],
  )
  // Internal notes never reach the customer.
  assert.equal(JSON.stringify((await customer.get('/api/requests')).json).includes('Nada'), false)

  // An action based on an out-of-date view is refused rather than applied to the new state.
  const stale = await admin.post(`/api/admin/requests/${r.id}/status`, { status: 'declined', from: 'new' })
  assert.equal(stale.status, 409)
  assert.equal(stale.json.error, 'stale')

  await admin.post(`/api/admin/requests/${r.id}/status`, { status: 'completed', from: 'confirmed' })
  assert.equal((await admin.post(`/api/admin/requests/${r.id}/status`, { status: 'confirmed', confirmedDate: tomorrow(), confirmedTime: '10:00' })).status, 409)
})

test('staff-issued reset codes work once and sign the customer out elsewhere', async () => {
  const { app, db } = setup()
  await makeStaff(db, 'staff', '+201000000002', null)
  const phone = client(app)
  const signup = await phone.post('/api/auth/signup', { firstName: 'Hana', phone: '01012345678', password: 'old-password' })

  const staff = client(app)
  await staff.post('/api/auth/login', { phone: '01000000002', password: 'staff-password-1' })
  const issued = await staff.post(`/api/admin/users/${signup.json.user.id}/reset-code`)
  assert.match(issued.json.code, /^[0-9A-Z]{4}-[0-9A-Z]{4}$/)

  const laptop = client(app)
  assert.equal((await laptop.post('/api/auth/reset', { phone: '01012345678', code: 'WRONG-CODE', password: 'new-password' })).json.error, 'code_invalid')
  const reset = await laptop.post('/api/auth/reset', { phone: '01012345678', code: issued.json.code.toLowerCase(), password: 'new-password' })
  assert.equal(reset.status, 200)
  assert.equal((await phone.get('/api/auth/me')).json.user, null, 'old session revoked')
  assert.equal((await client(app).post('/api/auth/reset', { phone: '01012345678', code: issued.json.code, password: 'x-password' })).json.error, 'code_invalid')
  assert.equal((await client(app).post('/api/auth/login', { phone: '01012345678', password: 'new-password' })).status, 200)

  // Staff can't issue codes for other staff; admins can.
  const other = await (async () => {
    await makeStaff(db, 'staff', '+201000000009', null)
    return db.prepare("SELECT id FROM users WHERE phone = '+201000000009'").get() as { id: number }
  })()
  assert.equal((await staff.post(`/api/admin/users/${other.id}/reset-code`)).status, 403)
})

test('admins manage staff but cannot lock themselves out', async () => {
  const { app, db } = setup()
  await makeStaff(db, 'admin', '+201000000001', null)
  const admin = client(app)
  const me = await admin.post('/api/auth/login', { phone: '01000000001', password: 'staff-password-1' })
  const created = await admin.post('/api/admin/staff', { firstName: 'Reception', phone: '01000000002', password: 'reception-1', role: 'staff', branchId: 'heliopolis' })
  assert.equal(created.status, 201)
  assert.equal(created.json.user.branchId, 'heliopolis')

  const reception = client(app)
  await reception.post('/api/auth/login', { phone: '01000000002', password: 'reception-1' })
  assert.equal((await reception.get('/api/admin/requests')).status, 200)

  await admin.patch(`/api/admin/staff/${created.json.user.id}`, { disabled: true })
  assert.equal((await reception.get('/api/admin/requests')).status, 401, 'disabled staff are signed out')
  assert.equal((await admin.patch(`/api/admin/staff/${me.json.user.id}`, { disabled: true })).status, 409)
})

test('confirmed days must be ahead, and customers cannot cancel once the day has passed', async () => {
  const { app, db } = setup()
  await makeStaff(db, 'admin', '+201000000001', null)
  const customer = client(app)
  await customer.post('/api/auth/signup', { firstName: 'Yasmin', phone: '01012345678', password: 'password-1' })
  const { request: r } = (await customer.post('/api/requests', request())).json
  const admin = client(app)
  await admin.post('/api/auth/login', { phone: '01000000001', password: 'staff-password-1' })

  const yesterday = addDays(nowInCairo().date, -1)
  const past = await admin.post(`/api/admin/requests/${r.id}/status`, { status: 'confirmed', confirmedDate: yesterday, confirmedTime: '12:00' })
  assert.equal(past.json.fields.confirmedDate, 'datePast')
  const far = await admin.post(`/api/admin/requests/${r.id}/status`, { status: 'confirmed', confirmedDate: addDays(nowInCairo().date, 400), confirmedTime: '12:00' })
  assert.equal(far.json.fields.confirmedDate, 'dateFar')

  // A confirmed appointment whose day is over is for the branch to close, not the customer.
  db.prepare("UPDATE requests SET status = 'confirmed', confirmed_date = ?, confirmed_time = '12:00' WHERE id = ?").run(yesterday, r.id)
  const late = await customer.post(`/api/requests/${r.reference}/cancel`)
  assert.equal(late.status, 409)
  assert.equal(late.json.error, 'too_late')
  // The same goes for later on the day itself, once the confirmed time has come.
  db.prepare("UPDATE requests SET confirmed_date = ?, confirmed_time = '00:00' WHERE id = ?").run(nowInCairo().date, r.id)
  assert.equal((await customer.post(`/api/requests/${r.reference}/cancel`)).json.error, 'too_late')
})

test('searching by reference or name never matches phone numbers by accident', async () => {
  const { phoneDigits } = await import('../store')
  assert.equal(phoneDigits('LSH-3VT545'), null, 'a reference is not a phone number')
  assert.equal(phoneDigits('Nour 2'), null)
  assert.equal(phoneDigits('010 1234'), '101234')
  assert.equal(phoneDigits('+20 10 1234'), '20101234')
  assert.equal(phoneDigits('٠١٠١٢٣'), '10123', 'Arabic-Indic digits')
  assert.equal(phoneDigits('01'), null, 'too short to search')

  const { app, db } = setup()
  await makeStaff(db, 'admin', '+201000000001', null)
  const a = client(app)
  await a.post('/api/auth/signup', { firstName: 'Aya', phone: '01012345678', password: 'password-1' })
  const { request: mine } = (await a.post('/api/requests', request())).json
  // Another customer whose number contains the digits of Aya's reference.
  const b = client(app)
  const refDigits = mine.reference.replace(/\D/g, '').padEnd(3, '7')
  await b.post('/api/auth/signup', { firstName: 'Bella', phone: `011${refDigits.padStart(8, '9').slice(0, 8)}`, password: 'password-1' })
  await b.post('/api/requests', request())
  const admin = client(app)
  await admin.post('/api/auth/login', { phone: '01000000001', password: 'staff-password-1' })
  const found = await admin.get(`/api/admin/requests?q=${mine.reference}`)
  assert.deepEqual(
    found.json.requests.map((r: { reference: string }) => r.reference),
    [mine.reference],
  )
})

test('signing in again replaces the session this browser had', async () => {
  const { app } = setup()
  const send = (path: string, body: unknown, cookie = '') =>
    app.request(`${ORIGIN}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN, ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    })
  const first = (await send('/api/auth/signup', { firstName: 'Rana', phone: '01012345678', password: 'password-1' })).headers.get('set-cookie')!.split(';')[0]
  const second = (await send('/api/auth/login', { phone: '01012345678', password: 'password-1' }, first)).headers.get('set-cookie')!.split(';')[0]
  assert.notEqual(first, second)
  const me = async (cookie: string) => ((await (await app.request(`${ORIGIN}/api/auth/me`, { headers: { cookie } })).json()) as { user: unknown }).user
  assert.equal(await me(first), null)
  assert.notEqual(await me(second), null)
})
