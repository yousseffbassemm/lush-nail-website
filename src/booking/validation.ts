import type { Strings } from '../i18n/strings'
import { addDays, isIsoDate, nowInCairo } from './cairoTime'
import { STEPS, type FieldErrors, type RequestDraft, type StepId } from './types'

const ARABIC_INDIC = /[٠-٩۰-۹]/g

/** Converts Arabic-Indic digits and strips spacing so "٠١٠ ١٢٣٤ ٥٦٧٨" and "010-1234-5678" both work. */
export function normalizePhone(raw: string) {
  const latin = raw.replace(ARABIC_INDIC, (ch) => {
    const code = ch.charCodeAt(0)
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660)
  })
  return latin.replace(/[\s\-().]/g, '')
}

export function isValidPhone(raw: string) {
  const phone = normalizePhone(raw)
  if (/^01[0125]\d{8}$/.test(phone)) return true // Egyptian mobile, local format
  if (/^(\+|00)201[0125]\d{8}$/.test(phone)) return true // Egyptian mobile, international format
  if (/^(\+|00)(?!20)\d{8,15}$/.test(phone)) return true // other countries
  return false
}

/**
 * One canonical form per number (E.164), so "010 1234 5678", "+20 10 1234 5678" and
 * "٠١٠١٢٣٤٥٦٧٨" all identify the same account. Returns null for numbers that aren't valid.
 */
export function toE164(raw: string): string | null {
  if (!isValidPhone(raw)) return null
  const phone = normalizePhone(raw)
  if (phone.startsWith('01')) return `+2${phone}`
  if (phone.startsWith('00')) return `+${phone.slice(2)}`
  return phone
}

/** Local display format for Egyptian numbers ("010 1234 5678"); international numbers as stored. */
export function formatPhone(e164: string) {
  const m = /^\+20(1\d)(\d{4})(\d{4})$/.exec(e164)
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164
}

/**
 * How the visitor identifies themselves:
 * - 'account': signed in to a Lush account (the normal case when the API is reachable);
 * - 'manual': no API available, so name and number are typed into the request itself.
 */
export interface ContactContext {
  mode: 'account' | 'manual'
  signedIn: boolean
}

const MANUAL: ContactContext = { mode: 'manual', signedIn: false }

export function validateStep(step: StepId, d: RequestDraft, t: Strings, contact: ContactContext = MANUAL, now = nowInCairo()): FieldErrors {
  const e = t.request.errors
  const errors: FieldErrors = {}

  switch (step) {
    case 'branch':
      if (!d.branchId) errors.branchId = e.branch
      break

    case 'services':
      if (d.serviceIds.length === 0 && !d.helpMeChoose && !d.lookRef) errors.serviceIds = e.services
      break

    case 'when': {
      if (!d.date) errors.date = e.date
      else if (!isIsoDate(d.date)) errors.date = e.date
      else if (d.date < now.date) errors.date = e.datePast
      else if (d.date > addDays(now.date, 365)) errors.date = e.dateFar

      if (!d.flexibleTime) {
        if (!/^\d{2}:\d{2}$/.test(d.time)) errors.time = e.time
        else if (!errors.date && d.date === now.date && d.time <= now.time) errors.time = e.timePast
      }

      if (d.bridal) {
        if (d.eventDate && (!isIsoDate(d.eventDate) || d.eventDate < now.date)) errors.eventDate = e.eventDatePast
        if (d.groupSize) {
          const n = Number(normalizePhone(d.groupSize))
          if (!Number.isInteger(n) || n < 1 || n > 30) errors.groupSize = e.groupSize
        }
      }
      break
    }

    case 'details':
      if (contact.mode === 'account') {
        if (!contact.signedIn) errors.account = e.account
        break
      }
      if (!d.firstName.trim()) errors.firstName = e.firstName
      if (!d.phone.trim()) errors.phone = e.phone
      else if (!isValidPhone(d.phone)) errors.phone = e.phoneFormat
      break

    case 'review':
      break
  }
  return errors
}

/** The first step that still needs input, used to resume a request where it makes sense. */
export function firstIncompleteStep(d: RequestDraft, t: Strings, contact: ContactContext = MANUAL): number {
  const index = STEPS.findIndex((step) => Object.keys(validateStep(step, d, t, contact)).length > 0)
  return index === -1 ? STEPS.length - 1 : index
}
