/**
 * Sends a request to the Lush API (server/), which stores it for the branch to confirm in /admin.
 *
 * The visitor must be signed in. If the API can't be reached at all, the review step falls back to
 * copy / call / WhatsApp (for verified branches) and never claims anything was sent.
 */
import { api, type AppointmentRequest } from '../lib/api'
import type { Lang } from '../i18n/types'
import type { RequestDraft } from './types'
import { normalizePhone } from './validation'

export async function sendRequest(draft: RequestDraft, lang: Lang) {
  const { request } = await api<{ request: AppointmentRequest }>('/requests', {
    method: 'POST',
    body: {
      branchId: draft.branchId,
      serviceIds: draft.serviceIds,
      helpMeChoose: draft.helpMeChoose,
      lookRef: draft.lookRef,
      bridal: draft.bridal,
      date: draft.date,
      time: draft.flexibleTime ? null : draft.time,
      eventDate: draft.bridal ? draft.eventDate || null : null,
      groupSize: draft.bridal && draft.groupSize ? Number(normalizePhone(draft.groupSize)) : null,
      notes: draft.notes,
      lang,
    },
  })
  return request
}

/** Which step of the flow fixes a field the server rejected. */
export const FIELD_STEP: Record<string, number> = {
  branchId: 0,
  serviceIds: 1,
  lookRef: 1,
  date: 2,
  time: 2,
  eventDate: 2,
  groupSize: 2,
  notes: 3,
}
