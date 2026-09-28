import { useI18n } from '../../i18n/I18nProvider'
import { branches } from '../../content/site'
import type { StepProps } from './stepTypes'
import { ChoiceCard, describedBy, FieldError } from './Field'

export function StepBranch({ draft, set, errors }: StepProps) {
  const { t, pick } = useI18n()
  const error = errors.branchId
  return (
    <fieldset>
      <legend className="sr-only">{t.request.branch.title}</legend>
      <p className="mb-5 text-taupe-ink">{t.request.branch.help}</p>
      <div className="grid gap-3">
        {branches.map((b, i) => (
          <ChoiceCard
            key={b.id}
            type="radio"
            id={i === 0 ? 'req-branchId' : `req-branch-${b.id}`}
            name="branch"
            checked={draft.branchId === b.id}
            onChange={() => set('branchId', b.id)}
            describedById={describedBy('req-branchId', false, error)}
            invalid={Boolean(error)}
          >
            <span className="display block text-[1.9rem] leading-tight">{pick(b.name)}</span>
            <span className="mt-1 block text-sm text-taupe-ink">{pick(b.addressLines).join(' · ')}</span>
            <bdi dir="ltr" className="tabular mt-1 block text-sm text-charcoal">
              {b.phoneDisplay}
            </bdi>
          </ChoiceCard>
        ))}
      </div>
      <FieldError id="req-branchId" error={error} />
    </fieldset>
  )
}
