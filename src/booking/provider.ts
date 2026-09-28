/**
 * Connection point for a real booking system (a scheduling tool, CRM or the salon's own backend).
 *
 * Nothing is connected today. With `appointmentProvider` set to null, the review step offers the
 * contact options that genuinely work — copy, call, Instagram, and WhatsApp for verified branches —
 * and never claims that a request was sent or an appointment booked.
 *
 * To connect a system, implement AppointmentProvider and export it below. The review step then shows
 * "Send request" and reports the provider's real outcome. A provider must resolve `received` only once
 * the system has stored the request; confirmation still comes from the branch.
 */
import type { RequestDraft } from './types'
import type { Lang } from '../i18n/types'

export interface AppointmentSubmission {
  draft: RequestDraft
  /** Language the visitor used, so the branch can reply in kind. */
  lang: Lang
  /** The same plain-text summary the visitor saw. */
  message: string
  timeZone: 'Africa/Cairo'
}

export type SubmitResult = { status: 'received'; reference: string } | { status: 'failed'; reason?: string }

export interface AppointmentProvider {
  name: string
  submit: (submission: AppointmentSubmission) => Promise<SubmitResult>
}

export const appointmentProvider: AppointmentProvider | null = null
