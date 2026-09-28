import type { Localized } from '../i18n/types'
import type { Price } from '../content/services'

/** Shapes returned by the Lush API (server/). */
export type Role = 'customer' | 'staff' | 'admin'
export type RequestStatus = 'new' | 'contacted' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'no_show'

export interface User {
  id: number
  role: Role
  firstName: string
  phone: string
  email: string | null
  branchId: string | null
  lang: 'en' | 'ar'
  disabled: boolean
  createdAt: string
}

export interface ServiceSnapshot {
  id: string
  name: Localized
  price: Price
  durationMin?: number
}

export interface AppointmentRequest {
  id: number
  reference: string
  kind: 'appointment' | 'bridal'
  branchId: string
  services: ServiceSnapshot[]
  lookRef: string | null
  helpMeChoose: boolean
  preferredDate: string
  preferredTime: string | null
  eventDate: string | null
  groupSize: number | null
  notes: string
  lang: 'en' | 'ar'
  status: RequestStatus
  confirmedDate: string | null
  confirmedTime: string | null
  customerMessage: string | null
  createdAt: string
  updatedAt: string
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(code)
  }
}

/** Same-origin JSON requests; the session travels in an httpOnly cookie. */
export async function api<T>(path: string, options: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? 'GET'
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: method === 'GET' ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(options.body ?? {}),
    })
  } catch {
    throw new ApiError(0, 'network')
  }
  const data = (await response.json().catch(() => null)) as ({ error?: string; fields?: Record<string, string> } & T) | null
  if (!response.ok || data === null) throw new ApiError(response.status, data?.error ?? (response.status >= 500 ? 'server' : 'network'), data?.fields ?? {})
  return data
}
