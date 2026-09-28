import type { BranchId } from '../content/site'

export interface RequestDraft {
  branchId: BranchId | null
  serviceIds: string[]
  helpMeChoose: boolean
  /** Gallery look reference, e.g. "LK-03". */
  lookRef: string | null
  bridal: boolean
  /** Preferred date, YYYY-MM-DD, interpreted as a Cairo calendar date. */
  date: string
  /** Preferred time, HH:MM, Cairo wall-clock time. */
  time: string
  flexibleTime: boolean
  /** Bridal only. */
  eventDate: string
  groupSize: string
  firstName: string
  phone: string
  notes: string
}

export const emptyDraft: RequestDraft = {
  branchId: null,
  serviceIds: [],
  helpMeChoose: false,
  lookRef: null,
  bridal: false,
  date: '',
  time: '',
  flexibleTime: false,
  eventDate: '',
  groupSize: '',
  firstName: '',
  phone: '',
  notes: '',
}

/** What another part of the site can carry into the request when it opens the flow. */
export interface RequestSeed {
  branchId?: BranchId
  serviceIds?: string[]
  lookRef?: string
  bridal?: boolean
}

export type StepId = 'branch' | 'services' | 'when' | 'details' | 'review'
export const STEPS: readonly StepId[] = ['branch', 'services', 'when', 'details', 'review']

export type FieldName = keyof RequestDraft | 'account'
export type FieldErrors = Partial<Record<FieldName, string>>
