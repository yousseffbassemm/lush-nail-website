import { site } from '../content/site'
import type { Lang } from '../i18n/types'

/** The current calendar date and wall-clock time in Cairo, whatever the visitor's device zone is. */
export function nowInCairo(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: site.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00'
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

/** Adds whole days to a YYYY-MM-DD calendar date. */
export function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

/** A Cairo calendar date for display, e.g. "Thursday 2 October 2026". */
export function formatCairoDate(isoDate: string, lang: Lang) {
  if (!isIsoDate(isoDate)) return isoDate
  const [y, m, d] = isoDate.split('-').map(Number)
  // Noon UTC keeps the calendar day stable; the date itself was chosen as a Cairo date.
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)))
}

/** A wall-clock time for display, e.g. "4:30 pm". */
export function formatTime(hhmm: string, lang: Lang) {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!match) return hhmm
  const date = new Date(Date.UTC(2000, 0, 1, Number(match[1]), Number(match[2])))
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(date)
}

/** A moment (ISO timestamp) shown as Cairo date and time, e.g. "28 Sep, 4:32 pm". */
export function formatCairoDateTime(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    timeZone: site.timeZone,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}

/** A short Cairo calendar date, e.g. "Thu 2 Oct". */
export function formatCairoDateShort(isoDate: string, lang: Lang) {
  if (!isIsoDate(isoDate)) return isoDate
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)))
}
