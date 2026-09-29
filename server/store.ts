import { findService, type Price } from '../src/content/services'
import type { Localized } from '../src/i18n/types'
import { nowIso, transaction, type DB, type RequestStatus, type Role } from './db'
import { newToken, randomCode, sha256 } from './security'

// ---------------------------------------------------------------- users

export interface UserRow {
  id: number
  role: Role
  first_name: string
  phone: string
  email: string | null
  password_hash: string
  branch_id: string | null
  lang: 'en' | 'ar'
  disabled: number
  created_at: string
}

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    role: u.role,
    firstName: u.first_name,
    phone: u.phone,
    email: u.email,
    branchId: u.branch_id,
    lang: u.lang,
    disabled: Boolean(u.disabled),
    createdAt: u.created_at,
  }
}
export type PublicUser = ReturnType<typeof publicUser>

export const isStaff = (u: Pick<UserRow, 'role'>) => u.role === 'staff' || u.role === 'admin'

export function findUserByPhone(db: DB, phone: string) {
  return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as UserRow | undefined
}

export function findUserById(db: DB, id: number) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

export function emailTaken(db: DB, email: string, exceptUserId?: number) {
  const row = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email) as { id: number } | undefined
  return Boolean(row && row.id !== exceptUserId)
}

export function insertUser(
  db: DB,
  u: { role: Role; firstName: string; phone: string; email: string | null; passwordHash: string; branchId: string | null; lang: 'en' | 'ar' },
) {
  const result = db
    .prepare(
      `INSERT INTO users (role, first_name, phone, email, password_hash, branch_id, lang, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(u.role, u.firstName, u.phone, u.email, u.passwordHash, u.branchId, u.lang, nowIso())
  return findUserById(db, Number(result.lastInsertRowid))!
}

// ---------------------------------------------------------------- sessions

const DAY = 24 * 60 * 60 * 1000
export const sessionLifetime = (role: Role) => (role === 'customer' ? 30 * DAY : 12 * 60 * 60 * 1000)

export function createSession(db: DB, user: UserRow) {
  const token = newToken()
  const now = Date.now()
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date(now).toISOString())
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    sha256(token),
    user.id,
    new Date(now).toISOString(),
    new Date(now + sessionLifetime(user.role)).toISOString(),
  )
  return token
}

export function findSessionUser(db: DB, token: string) {
  return db
    .prepare(
      `SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.disabled = 0`,
    )
    .get(sha256(token), nowIso()) as UserRow | undefined
}

export function deleteSession(db: DB, token: string) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token))
}

/** Signs a user out everywhere, optionally keeping the current session. */
export function deleteUserSessions(db: DB, userId: number, keepToken?: string) {
  if (keepToken) db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(userId, sha256(keepToken))
  else db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}

// ---------------------------------------------------------------- password reset codes

const RESET_CODE_LIFETIME = 30 * 60 * 1000
export const RESET_CODE_MAX_ATTEMPTS = 5

export function issueResetCode(db: DB, userId: number, createdBy: number) {
  const code = randomCode(8)
  const expiresAt = new Date(Date.now() + RESET_CODE_LIFETIME).toISOString()
  transaction(db, () => {
    db.prepare('DELETE FROM reset_codes WHERE user_id = ?').run(userId)
    db.prepare('INSERT INTO reset_codes (user_id, code_hash, created_by, expires_at) VALUES (?, ?, ?, ?)').run(
      userId,
      sha256(code),
      createdBy,
      expiresAt,
    )
  })
  return { code: `${code.slice(0, 4)}-${code.slice(4)}`, expiresAt }
}

export function activeResetCode(db: DB, userId: number) {
  return db
    .prepare('SELECT * FROM reset_codes WHERE user_id = ? AND used_at IS NULL AND expires_at > ? ORDER BY id DESC LIMIT 1')
    .get(userId, nowIso()) as { id: number; code_hash: string; attempts: number } | undefined
}

// ---------------------------------------------------------------- appointment requests

export interface RequestRow {
  id: number
  reference: string
  user_id: number
  kind: 'appointment' | 'bridal'
  branch_id: string
  services_json: string
  look_ref: string | null
  help_me_choose: number
  preferred_date: string
  preferred_time: string | null
  event_date: string | null
  group_size: number | null
  notes: string
  lang: 'en' | 'ar'
  status: RequestStatus
  confirmed_date: string | null
  confirmed_time: string | null
  customer_message: string | null
  created_at: string
  updated_at: string
}

/** Services are stored as they were on the menu when the request was made. */
export interface ServiceSnapshot {
  id: string
  name: Localized
  price: Price
  durationMin?: number
}

export function snapshotServices(ids: string[]): ServiceSnapshot[] {
  return ids.flatMap((id) => {
    const found = findService(id)?.service
    return found ? [{ id, name: found.name, price: found.price, durationMin: found.durationMin }] : []
  })
}

export function serializeRequest(r: RequestRow) {
  return {
    id: r.id,
    reference: r.reference,
    kind: r.kind,
    branchId: r.branch_id,
    services: JSON.parse(r.services_json) as ServiceSnapshot[],
    lookRef: r.look_ref,
    helpMeChoose: Boolean(r.help_me_choose),
    preferredDate: r.preferred_date,
    preferredTime: r.preferred_time,
    eventDate: r.event_date,
    groupSize: r.group_size,
    notes: r.notes,
    lang: r.lang,
    status: r.status,
    confirmedDate: r.confirmed_date,
    confirmedTime: r.confirmed_time,
    customerMessage: r.customer_message,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}
export type PublicRequest = ReturnType<typeof serializeRequest>

export interface NewRequest {
  kind: 'appointment' | 'bridal'
  branchId: string
  serviceIds: string[]
  lookRef: string | null
  helpMeChoose: boolean
  preferredDate: string
  preferredTime: string | null
  eventDate: string | null
  groupSize: number | null
  notes: string
  lang: 'en' | 'ar'
}

function uniqueReference(db: DB) {
  for (;;) {
    const reference = `LSH-${randomCode(6)}`
    if (!db.prepare('SELECT 1 FROM requests WHERE reference = ?').get(reference)) return reference
  }
}

export function insertRequest(db: DB, userId: number, input: NewRequest) {
  return transaction(db, () => {
    const now = nowIso()
    const result = db
      .prepare(
        `INSERT INTO requests (reference, user_id, kind, branch_id, services_json, look_ref, help_me_choose,
          preferred_date, preferred_time, event_date, group_size, notes, lang, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
      )
      .run(
        uniqueReference(db),
        userId,
        input.kind,
        input.branchId,
        JSON.stringify(snapshotServices(input.serviceIds)),
        input.lookRef,
        input.helpMeChoose ? 1 : 0,
        input.preferredDate,
        input.preferredTime,
        input.eventDate,
        input.groupSize,
        input.notes,
        input.lang,
        now,
        now,
      )
    const id = Number(result.lastInsertRowid)
    addEvent(db, id, userId, 'created', 'new', null)
    return getRequest(db, id)!
  })
}

export function getRequest(db: DB, id: number) {
  return db.prepare('SELECT * FROM requests WHERE id = ?').get(id) as RequestRow | undefined
}

export function getRequestByReference(db: DB, reference: string) {
  return db.prepare('SELECT * FROM requests WHERE reference = ?').get(reference) as RequestRow | undefined
}

export function listUserRequests(db: DB, userId: number) {
  return db
    .prepare('SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 200')
    .all(userId) as unknown as RequestRow[]
}

export function addEvent(db: DB, requestId: number, actorId: number | null, type: string, status: string | null, note: string | null) {
  db.prepare('INSERT INTO request_events (request_id, actor_id, type, status, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    requestId,
    actorId,
    type,
    status,
    note,
    nowIso(),
  )
}

export function listEvents(db: DB, requestId: number) {
  return (
    db
      .prepare(
        `SELECT e.id, e.type, e.status, e.note, e.created_at, u.first_name AS actor_name, u.role AS actor_role
         FROM request_events e LEFT JOIN users u ON u.id = e.actor_id
         WHERE e.request_id = ? ORDER BY e.id ASC`,
      )
      .all(requestId) as unknown as {
      id: number
      type: string
      status: string | null
      note: string | null
      created_at: string
      actor_name: string | null
      actor_role: Role | null
    }[]
  ).map((e) => ({
    id: e.id,
    type: e.type,
    status: e.status,
    note: e.note,
    createdAt: e.created_at,
    actorName: e.actor_name,
    actorRole: e.actor_role,
  }))
}

/** Which status changes staff can make. Closed requests can be reopened as "contacted". */
export const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  new: ['contacted', 'confirmed', 'declined', 'cancelled'],
  contacted: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['confirmed', 'completed', 'no_show', 'cancelled'],
  declined: ['contacted'],
  cancelled: ['contacted'],
  completed: ['contacted'],
  no_show: ['contacted'],
}

export const CUSTOMER_CANCELLABLE: RequestStatus[] = ['new', 'contacted', 'confirmed']

export function updateStatus(
  db: DB,
  requestId: number,
  actorId: number,
  change: { status: RequestStatus; confirmedDate?: string | null; confirmedTime?: string | null; customerMessage?: string | null },
  eventType = 'status',
) {
  return transaction(db, () => {
    const current = getRequest(db, requestId)!
    const confirming = change.status === 'confirmed'
    db.prepare(
      `UPDATE requests SET status = ?, confirmed_date = ?, confirmed_time = ?, customer_message = ?, updated_at = ? WHERE id = ?`,
    ).run(
      change.status,
      confirming ? (change.confirmedDate ?? current.confirmed_date) : current.confirmed_date,
      confirming ? (change.confirmedTime ?? current.confirmed_time) : current.confirmed_time,
      change.customerMessage === undefined ? current.customer_message : change.customerMessage || null,
      nowIso(),
      requestId,
    )
    addEvent(db, requestId, actorId, eventType, change.status, change.customerMessage || null)
    return getRequest(db, requestId)!
  })
}

// ---------------------------------------------------------------- staff views

export interface StaffScope {
  /** null = all branches (admins, and staff without a branch). */
  branchId: string | null
}

export function scopeFor(user: UserRow): StaffScope {
  return { branchId: user.role === 'admin' ? null : user.branch_id }
}

export interface RequestFilters {
  status?: RequestStatus[]
  branchId?: string
  kind?: 'appointment' | 'bridal'
  q?: string
  /** Only appointments confirmed for this Cairo date (YYYY-MM-DD), in time order. */
  confirmedOn?: string
}

export function listRequestsForStaff(db: DB, scope: StaffScope, filters: RequestFilters) {
  const where: string[] = []
  const params: (string | number)[] = []
  const branch = scope.branchId ?? filters.branchId
  if (branch) {
    where.push('r.branch_id = ?')
    params.push(branch)
  }
  if (filters.status?.length) {
    where.push(`r.status IN (${filters.status.map(() => '?').join(', ')})`)
    params.push(...filters.status)
  }
  if (filters.kind) {
    where.push('r.kind = ?')
    params.push(filters.kind)
  }
  if (filters.confirmedOn) {
    where.push("r.status = 'confirmed' AND r.confirmed_date = ?")
    params.push(filters.confirmedOn)
  }
  if (filters.q) {
    const like = `%${filters.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`
    const digits = phoneDigits(filters.q)
    where.push(`(r.reference LIKE ? ESCAPE '\\' OR u.first_name LIKE ? ESCAPE '\\'${digits ? ' OR u.phone LIKE ?' : ''})`)
    params.push(like, like)
    if (digits) params.push(`%${digits}%`)
  }
  const sql = `
    SELECT r.*, u.first_name AS customer_name, u.phone AS customer_phone, u.email AS customer_email
    FROM requests r JOIN users u ON u.id = r.user_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${
      // Schedules read in time order; everything else newest first.
      filters.confirmedOn || (filters.status?.length === 1 && filters.status[0] === 'confirmed')
        ? 'r.confirmed_date ASC, r.confirmed_time ASC'
        : 'r.created_at DESC'
    } LIMIT 300`
  const rows = db.prepare(sql).all(...params) as unknown as (RequestRow & { customer_name: string; customer_phone: string; customer_email: string | null })[]
  return rows.map((r) => ({
    ...serializeRequest(r),
    customer: { id: r.user_id, firstName: r.customer_name, phone: r.customer_phone, email: r.customer_email },
  }))
}

export function statusCounts(db: DB, scope: StaffScope, branchId?: string) {
  const branch = scope.branchId ?? branchId
  const rows = (
    branch
      ? db.prepare('SELECT status, COUNT(*) AS n FROM requests WHERE branch_id = ? GROUP BY status').all(branch)
      : db.prepare('SELECT status, COUNT(*) AS n FROM requests GROUP BY status').all()
  ) as { status: RequestStatus; n: number }[]
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<RequestStatus, number>>
}

/** Appointments confirmed for a given day, for the "Today" count. */
export function confirmedCount(db: DB, scope: StaffScope, date: string, branchId?: string) {
  const branch = scope.branchId ?? branchId
  const row = (
    branch
      ? db.prepare("SELECT COUNT(*) AS n FROM requests WHERE status = 'confirmed' AND confirmed_date = ? AND branch_id = ?").get(date, branch)
      : db.prepare("SELECT COUNT(*) AS n FROM requests WHERE status = 'confirmed' AND confirmed_date = ?").get(date)
  ) as { n: number }
  return row.n
}

export function inScope(scope: StaffScope, request: Pick<RequestRow, 'branch_id'>) {
  return !scope.branchId || scope.branchId === request.branch_id
}

/**
 * The digits to look for in stored numbers (+20…), when a search looks like a phone number:
 * "010 1234", "+20 10…" or Arabic-Indic digits. Anything with letters (a name, a reference) isn't one.
 */
export function phoneDigits(q: string) {
  const ascii = q.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
  if (!/^[\d\s+().-]+$/.test(ascii)) return null
  const digits = ascii.replace(/\D/g, '').replace(/^0/, '')
  return digits.length >= 3 ? digits : null
}

export function listCustomers(db: DB, q: string) {
  const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`
  const digits = phoneDigits(q)
  const rows = db
    .prepare(
      `SELECT u.*, COUNT(r.id) AS request_count, MAX(r.created_at) AS last_request_at
       FROM users u LEFT JOIN requests r ON r.user_id = u.id
       WHERE u.role = 'customer' ${q ? `AND (u.first_name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\'${digits ? ' OR u.phone LIKE ?' : ''})` : ''}
       GROUP BY u.id ORDER BY u.created_at DESC LIMIT 200`,
    )
    .all(...(q ? [like, like, ...(digits ? [`%${digits}%`] : [])] : [])) as unknown as (UserRow & {
    request_count: number
    last_request_at: string | null
  })[]
  return rows.map((r) => ({ ...publicUser(r), requestCount: r.request_count, lastRequestAt: r.last_request_at }))
}

export function listStaff(db: DB) {
  return (db.prepare(`SELECT * FROM users WHERE role IN ('staff', 'admin') ORDER BY role DESC, first_name`).all() as unknown as UserRow[]).map(
    publicUser,
  )
}
