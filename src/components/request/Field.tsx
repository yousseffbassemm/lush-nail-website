import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'

export const inputClass =
  'block w-full min-h-12 rounded-xl border bg-paper px-4 py-2.5 text-base text-charcoal placeholder:text-taupe/80 ' +
  'transition-[border-color,box-shadow] duration-200 focus:outline-none focus-visible:outline-none ' +
  'focus:border-charcoal focus:shadow-[0_0_0_3px_rgb(40_35_32/0.12)] disabled:cursor-not-allowed disabled:bg-ivory disabled:text-taupe'

export function inputBorder(error?: string) {
  return error ? 'border-danger' : 'border-line-strong'
}

/** aria-describedby value for a field's hint and error. */
export function describedBy(id: string, hint?: boolean, error?: string) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null
  return (
    <p id={`${id}-error`} className="mt-2 flex items-start gap-1.5 text-sm text-danger">
      <Icon name="close" size={16} className="mt-0.5 shrink-0" />
      <span>{error}</span>
    </p>
  )
}

interface FieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  optionalLabel?: string
  aside?: ReactNode
  children: ReactNode
}

export function Field({ id, label, hint, error, optionalLabel, aside, children }: FieldProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.95rem] font-medium text-charcoal">
          {label}
          {optionalLabel && <span className="ms-2 text-sm font-normal text-taupe-ink">({optionalLabel})</span>}
        </label>
        {aside}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mb-2 text-sm text-taupe-ink">
          {hint}
        </p>
      )}
      {children}
      <FieldError id={id} error={error} />
    </div>
  )
}

/** A checkbox or radio presented as a large, tappable card. */
export function ChoiceCard({
  type,
  id,
  name,
  checked,
  onChange,
  children,
  describedById,
  invalid,
}: {
  type: 'checkbox' | 'radio'
  id: string
  name: string
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  describedById?: string
  invalid?: boolean
}) {
  return (
    <label
      htmlFor={id}
      className={`relative flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-colors duration-200 sm:p-5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-charcoal ${
        checked ? 'border-charcoal bg-blush-soft' : invalid ? 'border-danger bg-paper' : 'border-line-strong bg-paper hover:border-charcoal/60'
      }`}
    >
      <input
        type={type}
        id={id}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={describedById}
        aria-invalid={invalid || undefined}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center border transition-colors duration-200 ${
          type === 'radio' ? 'rounded-full' : 'rounded-md'
        } ${checked ? 'border-charcoal bg-charcoal text-ivory' : 'border-line-strong bg-paper'}`}
      >
        {checked && <Icon name="check" size={15} />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  )
}
