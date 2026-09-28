import { useI18n } from '../../i18n/I18nProvider'
import type { StepProps } from './stepTypes'
import { describedBy, Field, inputBorder, inputClass } from './Field'

const NOTES_MAX = 500

export function StepDetails({ draft, set, errors }: StepProps) {
  const { t } = useI18n()
  const d = t.request.details

  return (
    <div className="grid gap-6">
      <p className="text-taupe-ink">{d.help}</p>
      <Field id="req-firstName" label={d.firstName} error={errors.firstName}>
        <input
          id="req-firstName"
          type="text"
          required
          autoComplete="given-name"
          maxLength={60}
          value={draft.firstName}
          onChange={(e) => set('firstName', e.target.value)}
          aria-invalid={errors.firstName ? true : undefined}
          aria-describedby={describedBy('req-firstName', false, errors.firstName)}
          className={`${inputClass} ${inputBorder(errors.firstName)}`}
        />
      </Field>
      <Field id="req-phone" label={d.phone} hint={d.phoneHint} error={errors.phone}>
        <input
          id="req-phone"
          type="tel"
          required
          dir="ltr"
          autoComplete="tel"
          inputMode="tel"
          maxLength={24}
          value={draft.phone}
          onChange={(e) => set('phone', e.target.value)}
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={describedBy('req-phone', true, errors.phone)}
          className={`${inputClass} ${inputBorder(errors.phone)} tabular rtl:text-right`}
        />
      </Field>
      <Field
        id="req-notes"
        label={d.notes}
        optionalLabel={t.request.when.optional}
        aside={
          <span className="tabular text-xs text-taupe-ink" aria-hidden="true">
            {draft.notes.length}/{NOTES_MAX}
          </span>
        }
      >
        <textarea
          id="req-notes"
          rows={4}
          maxLength={NOTES_MAX}
          value={draft.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder={draft.bridal ? d.bridalNotesPlaceholder : d.notesPlaceholder}
          className={`${inputClass} border-line-strong resize-y leading-relaxed`}
        />
      </Field>
    </div>
  )
}
