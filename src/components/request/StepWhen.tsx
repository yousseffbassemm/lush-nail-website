import { useI18n } from '../../i18n/I18nProvider'
import { addDays, nowInCairo } from '../../booking/cairoTime'
import type { StepProps } from './stepTypes'
import { ChoiceCard, describedBy, Field, inputBorder, inputClass } from './Field'

export function StepWhen({ draft, set, errors }: StepProps) {
  const { t } = useI18n()
  const w = t.request.when
  const today = nowInCairo().date
  const maxDate = addDays(today, 365)

  return (
    <div className="grid gap-6">
      <p id="req-when-help" className="text-taupe-ink">
        {w.help}
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="req-date" label={w.date} error={errors.date}>
          <input
            id="req-date"
            type="date"
            required
            min={today}
            max={maxDate}
            value={draft.date}
            onChange={(e) => set('date', e.target.value)}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={describedBy('req-date', false, errors.date) ?? 'req-when-help'}
            className={`${inputClass} ${inputBorder(errors.date)}`}
          />
        </Field>
        <Field
          id="req-time"
          label={w.time}
          error={errors.time}
          aside={<span className="text-xs text-taupe-ink">{w.cairo}</span>}
        >
          <input
            id="req-time"
            type="time"
            step={900}
            required={!draft.flexibleTime}
            disabled={draft.flexibleTime}
            value={draft.flexibleTime ? '' : draft.time}
            onChange={(e) => set('time', e.target.value)}
            aria-invalid={errors.time ? true : undefined}
            aria-describedby={describedBy('req-time', false, errors.time) ?? 'req-when-help'}
            className={`${inputClass} ${inputBorder(errors.time)}`}
          />
        </Field>
      </div>

      <ChoiceCard
        type="checkbox"
        id="req-flexibleTime"
        name="flexibleTime"
        checked={draft.flexibleTime}
        onChange={(checked) => set('flexibleTime', checked)}
      >
        <span className="block">{w.flexible}</span>
      </ChoiceCard>

      {draft.bridal && (
        <div className="grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
          <Field id="req-eventDate" label={w.eventDate} optionalLabel={w.optional} error={errors.eventDate}>
            <input
              id="req-eventDate"
              type="date"
              min={today}
              value={draft.eventDate}
              onChange={(e) => set('eventDate', e.target.value)}
              aria-invalid={errors.eventDate ? true : undefined}
              aria-describedby={describedBy('req-eventDate', false, errors.eventDate)}
              className={`${inputClass} ${inputBorder(errors.eventDate)}`}
            />
          </Field>
          <Field id="req-groupSize" label={w.groupSize} optionalLabel={w.optional} error={errors.groupSize}>
            <input
              id="req-groupSize"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={2}
              value={draft.groupSize}
              onChange={(e) => set('groupSize', e.target.value)}
              aria-invalid={errors.groupSize ? true : undefined}
              aria-describedby={describedBy('req-groupSize', false, errors.groupSize)}
              className={`${inputClass} ${inputBorder(errors.groupSize)} tabular`}
            />
          </Field>
        </div>
      )}
    </div>
  )
}
