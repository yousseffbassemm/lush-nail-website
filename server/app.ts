import { Hono, type Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'
import type { z } from 'zod'
import { toE164 } from '../src/booking/validation'
import { nowInCairo } from '../src/booking/cairoTime'
import { transaction, type DB, type RequestStatus } from './db'
import {
  fieldErrors,
  loginSchema,
  noteSchema,
  passwordChangeSchema,
  profileSchema,
  requestSchema,
  resetSchema,
  signupSchema,
  staffCreateSchema,
  staffUpdateSchema,
  statusChangeSchema,
} from './schemas'
import { burnPasswordCheck, hashPassword, normaliseCode, RateLimiter, safeEqualHex, sha256, verifyPassword } from './security'
import {
  activeResetCode,
  addEvent,
  createSession,
  CUSTOMER_CANCELLABLE,
  deleteSession,
  deleteUserSessions,
  emailTaken,
  findSessionUser,
  findUserById,
  findUserByPhone,
  getRequest,
  getRequestByReference,
  inScope,
  insertRequest,
  insertUser,
  isStaff,
  issueResetCode,
  listCustomers,
  listEvents,
  listRequestsForStaff,
  listStaff,
  listUserRequests,
  publicUser,
  RESET_CODE_MAX_ATTEMPTS,
  scopeFor,
  serializeRequest,
  sessionLifetime,
  STATUS_TRANSITIONS,
  statusCounts,
  confirmedCount,
  updateStatus,
  type UserRow,
} from './store'

export interface AppOptions {
  db: DB
  /** Send cookies with the Secure flag (required in production, over HTTPS). */
  secureCookies: boolean
  /** Public origin, e.g. https://lushnailsalonspa.com. Needed behind a TLS-terminating proxy. */
  appOrigin?: string
  /** Trust X-Forwarded-For / X-Forwarded-Proto from a reverse proxy. */
  trustProxy?: boolean
  /** Multiplies every rate limit. Only the end-to-end test server raises it; production uses 1. */
  rateLimitScale?: number
}

type Env = { Variables: { user: UserRow | null; token: string | null } }

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function createApp({ db, secureCookies, appOrigin, trustProxy = false, rateLimitScale = 1 }: AppOptions) {
  const app = new Hono<Env>()
  const cookieName = secureCookies ? '__Host-lush_session' : 'lush_session'

  const scaled = (n: number) => Math.max(1, Math.round(n * rateLimitScale))
  const limits = {
    login: new RateLimiter(scaled(10), 15 * 60 * 1000),
    signup: new RateLimiter(scaled(8), 60 * 60 * 1000),
    reset: new RateLimiter(scaled(10), 15 * 60 * 1000),
    request: new RateLimiter(scaled(10), 60 * 60 * 1000),
  }

  const clientIp = (c: Context<Env>) => {
    if (trustProxy) {
      const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      if (forwarded) return forwarded
    }
    const incoming = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming
    return incoming?.socket?.remoteAddress ?? 'unknown'
  }

  const expectedOrigin = (c: Context<Env>) => {
    if (appOrigin) return appOrigin
    const url = new URL(c.req.url)
    const proto = trustProxy ? c.req.header('x-forwarded-proto')?.split(',')[0]?.trim() : null
    return proto ? `${proto}://${url.host}` : url.origin
  }

  const invalid = (c: Context<Env>, error: z.ZodError) => c.json({ error: 'invalid', fields: fieldErrors(error) }, 400)
  const fail = (c: Context<Env>, status: 400 | 401 | 403 | 404 | 409 | 429, error: string) => c.json({ error }, status)

  const readJson = async (c: Context<Env>) => {
    try {
      return await c.req.json()
    } catch {
      return {}
    }
  }

  const startSession = (c: Context<Env>, user: UserRow) => {
    const token = createSession(db, user)
    setCookie(c, cookieName, token, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'Lax',
      path: '/',
      maxAge: Math.floor(sessionLifetime(user.role) / 1000),
    })
  }

  // ---------------------------------------------------------------- middleware

  app.use('/api/*', secureHeaders({ crossOriginResourcePolicy: 'same-origin', xFrameOptions: 'DENY' }))
  // Every legitimate request body is tiny; refuse anything large before parsing it.
  app.use('/api/*', bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: 'too_large' }, 413) }))

  app.use('/api/*', async (c, next) => {
    c.header('Cache-Control', 'no-store')
    if (!SAFE_METHODS.has(c.req.method)) {
      // Cross-site request protection: same-origin JSON only (sessions also use SameSite=Lax).
      const origin = c.req.header('origin')
      const fetchSite = c.req.header('sec-fetch-site')
      if (origin ? origin !== expectedOrigin(c) : fetchSite && fetchSite !== 'same-origin') return fail(c, 403, 'forbidden')
      if (!c.req.header('content-type')?.toLowerCase().startsWith('application/json')) return fail(c, 400, 'json')
    }
    const token = getCookie(c, cookieName) ?? null
    const user = token ? (findSessionUser(db, token) ?? null) : null
    c.set('token', user ? token : null)
    c.set('user', user)
    await next()
  })

  const requireUser = (c: Context<Env>) => c.get('user')

  const requireStaff = (c: Context<Env>) => {
    const user = c.get('user')
    return user && isStaff(user) ? user : null
  }

  // ---------------------------------------------------------------- auth

  app.get('/api/auth/me', (c) => {
    const user = c.get('user')
    return c.json({ user: user ? publicUser(user) : null })
  })

  app.post('/api/auth/signup', async (c) => {
    if (!limits.signup.take(clientIp(c))) return fail(c, 429, 'rate_limited')
    const parsed = signupSchema.safeParse(await readJson(c))
    if (!parsed.success) return invalid(c, parsed.error)
    const input = parsed.data
    if (findUserByPhone(db, input.phone)) return c.json({ error: 'invalid', fields: { phone: 'phoneTaken' } }, 409)
    if (input.email && emailTaken(db, input.email)) return c.json({ error: 'invalid', fields: { email: 'emailTaken' } }, 409)
    const user = insertUser(db, {
      role: 'customer',
      firstName: input.firstName,
      phone: input.phone,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      branchId: null,
      lang: input.lang,
    })
    const previous = c.get('token')
    if (previous) deleteSession(db, previous)
    startSession(c, user)
    return c.json({ user: publicUser(user) }, 201)
  })

  app.post('/api/auth/login', async (c) => {
    const parsed = loginSchema.safeParse(await readJson(c))
    if (!parsed.success) return invalid(c, parsed.error)
    const phone = toE164(parsed.data.phone)
    const key = `${clientIp(c)}|${phone ?? parsed.data.phone}`
    if (!limits.login.take(key)) return fail(c, 429, 'rate_limited')
    const user = phone ? findUserByPhone(db, phone) : undefined
    if (!user || user.disabled) {
      await burnPasswordCheck(parsed.data.password)
      return fail(c, 401, 'bad_credentials')
    }
    if (!(await verifyPassword(parsed.data.password, user.password_hash))) return fail(c, 401, 'bad_credentials')
    limits.login.reset(key)
    const previous = c.get('token')
    if (previous) deleteSession(db, previous)
    startSession(c, user)
    return c.json({ user: publicUser(user) })
  })

  app.post('/api/auth/logout', (c) => {
    const token = c.get('token')
    if (token) deleteSession(db, token)
    deleteCookie(c, cookieName, { path: '/', secure: secureCookies })
    return c.json({ ok: true })
  })

  /** Password reset with a one-time code issued by staff (no email or SMS provider is connected). */
  app.post('/api/auth/reset', async (c) => {
    if (!limits.reset.take(clientIp(c))) return fail(c, 429, 'rate_limited')
    const parsed = resetSchema.safeParse(await readJson(c))
    if (!parsed.success) return invalid(c, parsed.error)
    const phone = toE164(parsed.data.phone)
    const user = phone ? findUserByPhone(db, phone) : undefined
    const code = user ? activeResetCode(db, user.id) : undefined
    if (!user || user.disabled || !code) return fail(c, 400, 'code_invalid')
    if (code.attempts >= RESET_CODE_MAX_ATTEMPTS) return fail(c, 400, 'code_invalid')
    if (!safeEqualHex(sha256(normaliseCode(parsed.data.code)), code.code_hash)) {
      db.prepare('UPDATE reset_codes SET attempts = attempts + 1 WHERE id = ?').run(code.id)
      return fail(c, 400, 'code_invalid')
    }
    const hash = await hashPassword(parsed.data.password)
    transaction(db, () => {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id)
      db.prepare('UPDATE reset_codes SET used_at = ? WHERE id = ?').run(new Date().toISOString(), code.id)
      deleteUserSessions(db, user.id)
    })
    startSession(c, user)
    return c.json({ user: publicUser(findUserById(db, user.id)!) })
  })

  // ---------------------------------------------------------------- the customer's own account

  app.patch('/api/account', async (c) => {
    const user = requireUser(c)
    if (!user) return fail(c, 401, 'unauthorized')
    const parsed = profileSchema.safeParse(await readJson(c))
    if (!parsed.success) return invalid(c, parsed.error)
    const next = parsed.data
    if (next.email && emailTaken(db, next.email, user.id)) return c.json({ error: 'invalid', fields: { email: 'emailTaken' } }, 409)
    db.prepare('UPDATE users SET first_name = ?, email = ?, lang = ? WHERE id = ?').run(
      next.firstName ?? user.first_name,
      next.email === undefined ? user.email : next.email,
      next.lang ?? user.lang,
      user.id,
    )
    return c.json({ user: publicUser(findUserById(db, user.id)!) })
  })

  app.post('/api/account/password', async (c) => {
    const user = requireUser(c)
    if (!user) return fail(c, 401, 'unauthorized')
    if (!limits.login.take(`pw|${user.id}`)) return fail(c, 429, 'rate_limited')
    const parsed = passwordChangeSchema.safeParse(await readJson(c))
    if (!parsed.success) return invalid(c, parsed.error)
    if (!(await verifyPassword(parsed.data.currentPassword, user.password_hash)))
      return c.json({ error: 'invalid', fields: { currentPassword: 'passwordWrong' } }, 400)
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(parsed.data.newPassword), user.id)
    deleteUserSessions(db, user.id, c.get('token') ?? undefined)
    return c.json({ ok: true })
  })

  // ---------------------------------------------------------------- appointment requests (customer)

  app.get('/api/requests', (c) => {
    const user = requireUser(c)
    if (!user) return fail(c, 401, 'unauthorized')
    return c.json({ requests: listUserRequests(db, user.id).map(serializeRequest) })
  })

  app.post('/api/requests', async (c) => {
    const user = requireUser(c)
    if (!user) return fail(c, 401, 'unauthorized')
    if (!limits.request.take(`req|${user.id}`)) return fail(c, 429, 'rate_limited')
    const parsed = requestSchema.safeParse(await readJson(c))
    if (!parsed.success) return invalid(c, parsed.error)
    const r = parsed.data
    const created = insertRequest(db, user.id, {
      kind: r.bridal ? 'bridal' : 'appointment',
      branchId: r.branchId,
      serviceIds: [...new Set(r.serviceIds)],
      lookRef: r.lookRef,
      helpMeChoose: r.helpMeChoose,
      preferredDate: r.date,
      preferredTime: r.time,
      eventDate: r.bridal ? r.eventDate : null,
      groupSize: r.bridal ? r.groupSize : null,
      notes: r.notes,
      lang: r.lang,
    })
    return c.json({ request: serializeRequest(created) }, 201)
  })

  app.post('/api/requests/:reference/cancel', (c) => {
    const user = requireUser(c)
    if (!user) return fail(c, 401, 'unauthorized')
    const request = getRequestByReference(db, c.req.param('reference'))
    if (!request || request.user_id !== user.id) return fail(c, 404, 'not_found')
    if (!CUSTOMER_CANCELLABLE.includes(request.status)) return fail(c, 409, 'invalid_transition')
    // Once the day has passed there is nothing left to cancel; the branch records what happened.
    const day = request.status === 'confirmed' ? request.confirmed_date : request.preferred_date
    if (day && day < nowInCairo().date) return fail(c, 409, 'too_late')
    const updated = updateStatus(db, request.id, user.id, { status: 'cancelled' }, 'cancelled_by_customer')
    return c.json({ request: serializeRequest(updated) })
  })

  // ---------------------------------------------------------------- staff

  app.get('/api/admin/requests', (c) => {
    const staff = requireStaff(c)
    if (!staff) return fail(c, c.get('user') ? 403 : 401, c.get('user') ? 'forbidden' : 'unauthorized')
    const scope = scopeFor(staff)
    const statusParam = c.req.query('status')
    const status = statusParam
      ? (statusParam.split(',').filter((s) => s in STATUS_TRANSITIONS) as RequestStatus[])
      : undefined
    const kind = c.req.query('kind')
    const branchId = c.req.query('branch') || undefined
    const today = nowInCairo().date
    const requests = listRequestsForStaff(db, scope, {
      status,
      branchId,
      kind: kind === 'bridal' || kind === 'appointment' ? kind : undefined,
      q: c.req.query('q')?.trim().slice(0, 60) || undefined,
      confirmedOn: c.req.query('today') === '1' ? today : undefined,
    })
    return c.json({ requests, counts: statusCounts(db, scope, branchId), today: confirmedCount(db, scope, today, branchId), scope })
  })

  app.get('/api/admin/requests/:id', (c) => {
    const staff = requireStaff(c)
    if (!staff) return fail(c, c.get('user') ? 403 : 401, c.get('user') ? 'forbidden' : 'unauthorized')
    const request = getRequest(db, Number(c.req.param('id')))
    if (!request || !inScope(scopeFor(staff), request)) return fail(c, 404, 'not_found')
    const customer = findUserById(db, request.user_id)!
    return c.json({
      request: serializeRequest(request),
      customer: publicUser(customer),
      events: listEvents(db, request.id),
      transitions: STATUS_TRANSITIONS[request.status],
    })
  })

  app.post('/api/admin/requests/:id/status', async (c) => {
    const staff = requireStaff(c)
    if (!staff) return fail(c, c.get('user') ? 403 : 401, c.get('user') ? 'forbidden' : 'unauthorized')
    const request = getRequest(db, Number(c.req.param('id')))
    if (!request || !inScope(scopeFor(staff), request)) return fail(c, 404, 'not_found')
    const parsed = statusChangeSchema.safeParse(await readJson(c))
    if (!parsed.success) return invalid(c, parsed.error)
    if (!STATUS_TRANSITIONS[request.status].includes(parsed.data.status)) return fail(c, 409, 'invalid_transition')
    const updated = updateStatus(db, request.id, staff.id, parsed.data)
    return c.json({ request: serializeRequest(updated), events: listEvents(db, request.id), transitions: STATUS_TRANSITIONS[updated.status] })
  })

  app.post('/api/admin/requests/:id/notes', async (c) => {
    const staff = requireStaff(c)
    if (!staff) return fail(c, c.get('user') ? 403 : 401, c.get('user') ? 'forbidden' : 'unauthorized')
    const request = getRequest(db, Number(c.req.param('id')))
    if (!request || !inScope(scopeFor(staff), request)) return fail(c, 404, 'not_found')
    const parsed = noteSchema.safeParse(await readJson(c))
    if (!parsed.success) return invalid(c, parsed.error)
    addEvent(db, request.id, staff.id, 'note', null, parsed.data.note)
    return c.json({ events: listEvents(db, request.id) })
  })

  app.get('/api/admin/customers', (c) => {
    const staff = requireStaff(c)
    if (!staff) return fail(c, c.get('user') ? 403 : 401, c.get('user') ? 'forbidden' : 'unauthorized')
    return c.json({ customers: listCustomers(db, c.req.query('q')?.trim().slice(0, 60) ?? '') })
  })

  /** Staff read the code to the customer (phone or WhatsApp); it works once, for 30 minutes. */
  app.post('/api/admin/users/:id/reset-code', (c) => {
    const staff = requireStaff(c)
    if (!staff) return fail(c, c.get('user') ? 403 : 401, c.get('user') ? 'forbidden' : 'unauthorized')
    const target = findUserById(db, Number(c.req.param('id')))
    if (!target || target.id === staff.id) return fail(c, 404, 'not_found')
    if (target.role !== 'customer' && staff.role !== 'admin') return fail(c, 403, 'forbidden')
    return c.json(issueResetCode(db, target.id, staff.id))
  })

  // ---------------------------------------------------------------- admins only: staff accounts

  const requireAdmin = (c: Context<Env>) => {
    const user = c.get('user')
    return user?.role === 'admin' ? user : null
  }

  app.get('/api/admin/staff', (c) => {
    if (!requireAdmin(c)) return fail(c, c.get('user') ? 403 : 401, c.get('user') ? 'forbidden' : 'unauthorized')
    return c.json({ staff: listStaff(db) })
  })

  app.post('/api/admin/staff', async (c) => {
    if (!requireAdmin(c)) return fail(c, c.get('user') ? 403 : 401, c.get('user') ? 'forbidden' : 'unauthorized')
    const parsed = staffCreateSchema.safeParse(await readJson(c))
    if (!parsed.success) return invalid(c, parsed.error)
    const input = parsed.data
    if (findUserByPhone(db, input.phone)) return c.json({ error: 'invalid', fields: { phone: 'phoneTaken' } }, 409)
    if (input.email && emailTaken(db, input.email)) return c.json({ error: 'invalid', fields: { email: 'emailTaken' } }, 409)
    const user = insertUser(db, {
      role: input.role,
      firstName: input.firstName,
      phone: input.phone,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      branchId: input.role === 'admin' ? null : input.branchId,
      lang: 'en',
    })
    return c.json({ user: publicUser(user) }, 201)
  })

  app.patch('/api/admin/staff/:id', async (c) => {
    const admin = requireAdmin(c)
    if (!admin) return fail(c, c.get('user') ? 403 : 401, c.get('user') ? 'forbidden' : 'unauthorized')
    const target = findUserById(db, Number(c.req.param('id')))
    if (!target || !isStaff(target)) return fail(c, 404, 'not_found')
    const parsed = staffUpdateSchema.safeParse(await readJson(c))
    if (!parsed.success) return invalid(c, parsed.error)
    // An admin can't lock themselves out or remove their own admin role.
    if (target.id === admin.id && (parsed.data.disabled || parsed.data.role === 'staff')) return fail(c, 409, 'self_lockout')
    const role = parsed.data.role ?? target.role
    const branchId = role === 'admin' ? null : parsed.data.branchId === undefined ? target.branch_id : parsed.data.branchId
    const disabled = parsed.data.disabled ?? Boolean(target.disabled)
    db.prepare('UPDATE users SET role = ?, branch_id = ?, disabled = ? WHERE id = ?').run(role, branchId, disabled ? 1 : 0, target.id)
    if (disabled) deleteUserSessions(db, target.id)
    return c.json({ user: publicUser(findUserById(db, target.id)!) })
  })

  // ---------------------------------------------------------------- fallbacks

  app.all('/api/*', (c) => fail(c, 404, 'not_found'))

  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'server' }, 500)
  })

  return app
}
