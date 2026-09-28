import { findLook } from '../content/looks'
import { findService, type Service } from '../content/services'
import { getBranch } from '../content/site'
import type { Lang } from '../i18n/types'
import { strings } from '../i18n/strings'
import { formatCairoDate, formatTime } from './cairoTime'
import { normalizePhone } from './validation'
import type { RequestDraft } from './types'

/** Service name with its printed duration, so "Regular massage · 30 min" and "· 60 min" stay distinct. */
export function serviceLabel(service: Service, lang: Lang) {
  const name = service.name[lang]
  return service.durationMin ? `${name} · ${strings[lang].common.minutes(service.durationMin)}` : name
}

/** The request as plain text, ready to paste into WhatsApp, SMS or Instagram, or to read out on a call. */
export function composeMessage(d: RequestDraft, lang: Lang) {
  const m = strings[lang].request.message
  const branch = getBranch(d.branchId)
  const look = findLook(d.lookRef)
  const services = d.serviceIds
    .map((id) => findService(id)?.service)
    .filter((s): s is Service => Boolean(s))
    .map((s) => serviceLabel(s, lang))

  const lines: string[] = [m.greeting(branch ? branch.name[lang] : '')]
  if (d.bridal) lines.push(m.bridal)
  lines.push('')
  if (services.length) lines.push(`${m.services}: ${services.join(lang === 'ar' ? '، ' : ', ')}`)
  if (look) lines.push(`${m.look}: ${look.name[lang]} (${look.ref})`)
  if (d.helpMeChoose) lines.push(m.helpMeChoose)
  if (d.date) lines.push(`${m.date}: ${formatCairoDate(d.date, lang)}`)
  lines.push(`${m.time}: ${d.flexibleTime || !d.time ? m.anyTime : `${formatTime(d.time, lang)} ${m.cairoTime}`}`)
  if (d.bridal && d.eventDate) lines.push(`${m.eventDate}: ${formatCairoDate(d.eventDate, lang)}`)
  if (d.bridal && d.groupSize) lines.push(`${m.groupSize}: ${normalizePhone(d.groupSize)}`)
  lines.push(`${m.name}: ${d.firstName.trim()}`)
  lines.push(`${m.phone}: ${normalizePhone(d.phone)}`)
  if (d.notes.trim()) lines.push(`${m.notes}: ${d.notes.trim()}`)
  lines.push('', m.closing)
  return lines.join('\n')
}

/** wa.me link with the message prefilled. Only used for branches whose WhatsApp number is verified. */
export function whatsappUrl(e164: string, text: string) {
  return `https://wa.me/${e164.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}
