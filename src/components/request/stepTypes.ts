import type { FieldErrors, RequestDraft } from '../../booking/types'

export interface StepProps {
  draft: RequestDraft
  set: <K extends keyof RequestDraft>(field: K, value: RequestDraft[K]) => void
  errors: FieldErrors
}
