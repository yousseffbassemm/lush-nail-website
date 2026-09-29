import { z } from 'zod'
import { branches } from '../src/content/site'
import { findService } from '../src/content/services'
import { findLook } from '../src/content/looks'
import { addDays, isIsoDate, nowInCairo } from '../src/booking/cairoTime'
import { toE164 } from '../src/booking/validation'
import { REQUEST_STATUSES } from './db'

/**
 * Error messages are codes; the client turns them into English or Arabic.
 * Rules mirror the client's validation, so a request that passes in the browser passes here.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BRANCH_IDS = branches.map((b) => b.id) as [string, ...string[]]

export const phoneSchema = z
  .string()
  .max(40)
  .transform((value, ctx) => {
    const e164 = toE164(value)
    if (!e164) {
      ctx.addIssue({ code: 'custom', message: value.trim() ? 'phoneFormat' : 'phone' })
      return z.NEVER
    }
    return e164
  })

const firstName = z.string().trim().min(1, 'firstName').max(60, 'tooLong')
const password = z.string().min(8, 'passwordShort').max(128, 'passwordLong')
const email = z
  .string()
  .trim()
  .max(120, 'tooLong')
  .nullish()
  .transform((v) => (v ? v.toLowerCase() : null))
  .refine((v) => v === null || EMAIL.test(v), 'email')
const lang = z.enum(['en', 'ar'])

export const signupSchema = z.object({ firstName, phone: phoneSchema, email, password, lang: lang.default('en') })

export const loginSchema = z.object({ phone: z.string().max(40), password: z.string().min(1, 'password').max(128) })

export const resetSchema = z.object({ phone: z.string().max(40), code: z.string().trim().min(1, 'code').max(20), password })

export const profileSchema = z.object({ firstName: firstName.optional(), email: email.optional(), lang: lang.optional() })

export const passwordChangeSchema = z.object({ currentPassword: z.string().min(1, 'password').max(128), newPassword: password })

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time')

export const requestSchema = z
  .object({
    branchId: z.enum(BRANCH_IDS, 'branch'),
    serviceIds: z.array(z.string().max(60)).max(20).default([]),
    helpMeChoose: z.boolean().default(false),
    lookRef: z.string().max(10).nullish().transform((v) => v || null),
    bridal: z.boolean().default(false),
    date: z.string(),
    time: hhmm.nullish().transform((v) => v || null),
    eventDate: z.string().nullish().transform((v) => v || null),
    groupSize: z.union([z.number(), z.string()]).nullish().transform((v) => (v === '' || v == null ? null : Number(v))),
    notes: z.string().max(500, 'tooLong').default('').transform((v) => v.trim()),
    lang: lang.default('en'),
  })
  .superRefine((r, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    const now = nowInCairo()
    const unknown = r.serviceIds.filter((id) => !findService(id))
    if (unknown.length) issue('serviceIds', 'unknownService')
    if (r.lookRef && !findLook(r.lookRef)) issue('lookRef', 'unknownLook')
    if (r.serviceIds.length === 0 && !r.helpMeChoose && !r.lookRef) issue('serviceIds', 'services')
    if (!isIsoDate(r.date)) issue('date', 'date')
    else if (r.date < now.date) issue('date', 'datePast')
    else if (r.date > addDays(now.date, 365)) issue('date', 'dateFar')
    else if (r.time && r.date === now.date && r.time <= now.time) issue('time', 'timePast')
    if (r.eventDate && (!isIsoDate(r.eventDate) || r.eventDate < now.date)) issue('eventDate', 'eventDatePast')
    if (r.groupSize !== null && (!Number.isInteger(r.groupSize) || r.groupSize < 1 || r.groupSize > 30)) issue('groupSize', 'groupSize')
  })

export const statusChangeSchema = z
  .object({
    status: z.enum(REQUEST_STATUSES),
    confirmedDate: z.string().nullish(),
    confirmedTime: hhmm.nullish(),
    customerMessage: z.string().trim().max(300, 'tooLong').nullish(),
  })
  .superRefine((r, ctx) => {
    if (r.status !== 'confirmed') return
    const today = nowInCairo().date
    if (!r.confirmedDate || !isIsoDate(r.confirmedDate)) ctx.addIssue({ code: 'custom', path: ['confirmedDate'], message: 'date' })
    else if (r.confirmedDate < today) ctx.addIssue({ code: 'custom', path: ['confirmedDate'], message: 'datePast' })
    else if (r.confirmedDate > addDays(today, 365)) ctx.addIssue({ code: 'custom', path: ['confirmedDate'], message: 'dateFar' })
    if (!r.confirmedTime) ctx.addIssue({ code: 'custom', path: ['confirmedTime'], message: 'time' })
  })

export const noteSchema = z.object({ note: z.string().trim().min(1, 'note').max(1000, 'tooLong') })

export const staffCreateSchema = z.object({
  firstName,
  phone: phoneSchema,
  email,
  password,
  role: z.enum(['staff', 'admin']),
  branchId: z.enum(BRANCH_IDS).nullish().transform((v) => v ?? null),
})

export const staffUpdateSchema = z.object({
  role: z.enum(['staff', 'admin']).optional(),
  branchId: z.enum(BRANCH_IDS).nullish(),
  disabled: z.boolean().optional(),
})

/** Flattens zod issues into { field: code } for the client. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
