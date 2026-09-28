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

export function validateStep(step: StepId, d: RequestDraft, t: Strings, now = nowInCairo()): FieldErrors {
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
export function firstIncompleteStep(d: RequestDraft, t: Strings): number {
  const index = STEPS.findIndex((step) => Object.keys(validateStep(step, d, t)).length > 0)
  return index === -1 ? STEPS.length - 1 : index
}
