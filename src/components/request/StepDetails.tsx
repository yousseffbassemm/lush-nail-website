import { useI18n } from '../../i18n/I18nProvider'
import { useAuth } from '../../auth/AuthProvider'
import { AuthPanel } from '../../auth/AuthPanel'
import { formatPhone } from '../../booking/validation'
import { useRequest } from '../../booking/RequestProvider'
import { Icon } from '../ui/Icon'
import type { StepProps } from './stepTypes'
import { describedBy, Field, FieldError, inputBorder, inputClass } from './Field'

const NOTES_MAX = 500

function Notes({ draft, set }: Pick<StepProps, 'draft' | 'set'>) {
  const { t } = useI18n()
  const d = t.request.details
  return (
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
  )
}

/** Signed in: confirm who's booking. Signed out: create an account or log in, without leaving the flow. */
function AccountDetails({ draft, set, errors }: StepProps) {
  const { t } = useI18n()
  const { user, logOut } = useAuth()
  const d = t.request.details

  if (user) {
    return (
      <div className="grid gap-6">
        <div className="flex items-center gap-4 rounded-2xl border border-line-strong bg-paper p-4 sm:p-5">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush text-rose-ink" aria-hidden="true">
            <Icon name="user" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t.auth.signedInAs(user.firstName)}</p>
            <bdi dir="ltr" className="tabular text-sm text-taupe-ink">
              {formatPhone(user.phone)}
            </bdi>
          </div>
          <button type="button" onClick={() => void logOut()} className="link-underline shrink-0 text-sm">
            {t.auth.notYou}
          </button>
        </div>
        <p className="-mt-3 text-sm text-taupe-ink">{d.signedInHelp}</p>
        <Notes draft={draft} set={set} />
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <p className="text-taupe-ink">{d.accountHelp}</p>
      <div
        id="req-account"
        tabIndex={-1}
        aria-describedby={describedBy('req-account', false, errors.account)}
        className={`rounded-2xl border bg-paper p-5 sm:p-6 ${errors.account ? 'border-danger' : 'border-line-strong'}`}
      >
        <AuthPanel headingLevel="h4" prefill={{ firstName: draft.firstName, phone: draft.phone }} />
      </div>
      <FieldError id="req-account" error={errors.account} />
    </div>
  )
}

export function StepDetails(props: StepProps) {
  const { t } = useI18n()
  const { contact } = useRequest()
  const { draft, set, errors } = props
  const d = t.request.details

  if (contact.mode === 'account') return <AccountDetails {...props} />

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
      <Notes draft={draft} set={set} />
    </div>
  )
}
