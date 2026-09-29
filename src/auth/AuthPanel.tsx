import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { branches } from '../content/site'
import { isValidPhone } from '../booking/validation'
import { ApiError, type User } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { describedBy, Field, inputBorder, inputClass } from '../components/request/Field'
import { useAuth } from './AuthProvider'

export type AuthMode = 'signup' | 'login' | 'reset'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  error,
  hint,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  autoComplete: 'current-password' | 'new-password'
  error?: string
  hint?: boolean
}) {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        maxLength={128}
        dir="ltr"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClass} ${inputBorder(error)} pe-12 rtl:text-right`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
        aria-pressed={visible}
        className="absolute inset-y-0 end-0 inline-flex w-12 items-center justify-center rounded-e-xl text-taupe-ink hover:text-charcoal"
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} size={20} />
      </button>
    </div>
  )
}

interface Props {
  initialMode?: AuthMode
  /** Details the visitor already typed elsewhere, e.g. in the request flow. */
  prefill?: { firstName?: string; phone?: string }
  onDone?: (user: User) => void
  /** Heading level inside the host (dialog or request step). */
  headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  intro?: ReactNode
  /** Staff sign-in hides account creation. */
  allowSignup?: boolean
  /** Replaces the log-in heading and help text. */
  loginCopy?: { title: string; help: string }
  /** Reports the name and number as they're typed, so a host (the request flow) can keep them. */
  onContactChange?: (field: 'firstName' | 'phone', value: string) => void
}

export function AuthPanel({ initialMode = 'signup', prefill, onDone, headingLevel = 'h2', intro, allowSignup = true, loginCopy, onContactChange }: Props) {
  const { t, lang } = useI18n()
  const { signUp, logIn, resetPassword, status } = useAuth()
  const uid = useId().replace(/:/g, '')
  const a = t.auth
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [form, setForm] = useState({
    firstName: prefill?.firstName ?? '',
    phone: prefill?.phone ?? '',
    email: '',
    password: '',
    code: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const alertRef = useRef<HTMLParagraphElement>(null)
  const Heading = headingLevel

  const id = (field: string) => `${uid}-${field}`
  const message = (code: string) => a.errors[code] ?? a.errors.server
  const set = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (field === 'firstName' || field === 'phone') onContactChange?.(field, value)
    setErrors((e) => {
      if (!(field in e)) return e
      const next = { ...e }
      delete next[field]
      return next
    })
  }

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setErrors({})
    setFormError(null)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (mode === 'signup' && !form.firstName.trim()) e.firstName = 'firstName'
    if (!form.phone.trim()) e.phone = 'phone'
    else if (!isValidPhone(form.phone)) e.phone = 'phoneFormat'
    if (mode === 'signup' && form.email.trim() && !EMAIL.test(form.email.trim())) e.email = 'email'
    if (mode === 'reset' && !form.code.trim()) e.code = 'code'
    if (!form.password) e.password = 'password'
    else if (mode !== 'login' && form.password.length < 8) e.password = 'passwordShort'
    return e
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setFormError(null)
    const found = validate()
    if (Object.keys(found).length) {
      setErrors(found)
      const first = ['firstName', 'phone', 'email', 'code', 'password'].find((f) => f in found)
      if (first) document.getElementById(id(first))?.focus()
      return
    }
    setBusy(true)
    try {
      const user =
        mode === 'signup'
          ? await signUp({ firstName: form.firstName.trim(), phone: form.phone, email: form.email.trim(), password: form.password, lang })
          : mode === 'login'
            ? await logIn({ phone: form.phone, password: form.password })
            : await resetPassword({ phone: form.phone, code: form.code, password: form.password })
      onDone?.(user)
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length) {
        setErrors(error.fields)
        const first = Object.keys(error.fields)[0]
        document.getElementById(id(first))?.focus()
      } else {
        setFormError(message(error instanceof ApiError ? error.code : 'server'))
        window.requestAnimationFrame(() => alertRef.current?.focus())
      }
    } finally {
      setBusy(false)
    }
  }

  if (status === 'offline') {
    return <p className="rounded-2xl bg-blush-soft p-4 text-sm">{a.offline}</p>
  }

  const titles = { signup: a.signUpTitle, login: loginCopy?.title ?? a.logInTitle, reset: a.resetTitle }
  const helps = { signup: a.signUpHelp, login: loginCopy?.help ?? a.logInHelp, reset: a.resetHelp }
  const err = (field: string) => (errors[field] ? message(errors[field]) : undefined)

  return (
    <div>
      {mode !== 'reset' && allowSignup && (
        <div role="tablist" aria-label={a.logInTab} className="mb-5 grid grid-cols-2 rounded-full bg-blush-soft p-1 text-sm">
          {(['signup', 'login'] as const).map((m) => (
            <button
              key={m}
              id={id(`tab-${m}`)}
              type="button"
              role="tab"
              aria-selected={mode === m}
              aria-controls={id('panel')}
              tabIndex={mode === m ? 0 : -1}
              onClick={() => switchMode(m)}
              onKeyDown={(e) => {
                // Two tabs: either arrow key (or Home/End) moves to the other one.
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
                e.preventDefault()
                const next = e.key === 'Home' ? 'signup' : e.key === 'End' ? 'login' : m === 'signup' ? 'login' : 'signup'
                switchMode(next)
                document.getElementById(id(`tab-${next}`))?.focus()
              }}
              className={`min-h-11 rounded-full px-4 font-medium transition-[background-color,color,box-shadow] duration-200 ${
                mode === m ? 'bg-paper text-charcoal shadow-[0_1px_3px_rgb(40_35_32/0.12)]' : 'text-taupe-ink hover:text-charcoal'
              }`}
            >
              {m === 'signup' ? a.signUpTab : a.logInTab}
            </button>
          ))}
        </div>
      )}

      <div
        id={id('panel')}
        {...(mode !== 'reset' && allowSignup ? { role: 'tabpanel', 'aria-labelledby': id(`tab-${mode}`) } : {})}
      >
      <Heading className="display text-[1.9rem] leading-tight">{titles[mode]}</Heading>
      <p className="mt-1 text-sm text-taupe-ink">{intro && mode === 'signup' ? intro : helps[mode]}</p>

      {mode === 'reset' && (
        <ul className="mt-3 grid gap-1 text-sm">
          {branches.map((b) => (
            <li key={b.id}>
              <a href={`tel:${b.phoneE164}`} className="link-underline inline-flex min-h-10 items-center gap-2">
                <Icon name="phone" size={16} className="text-gold" />
                {b.name[lang]} · <bdi dir="ltr" className="tabular">{b.phoneDisplay}</bdi>
              </a>
            </li>
          ))}
        </ul>
      )}

      <form noValidate onSubmit={submit} className="mt-5 grid gap-4">
        {formError && (
          <p ref={alertRef} tabIndex={-1} role="alert" className="rounded-xl border border-danger/30 bg-[#fbeceb] p-3 text-sm text-danger">
            {formError}
          </p>
        )}
        {mode === 'signup' && (
          <Field id={id('firstName')} label={a.firstName} error={err('firstName')}>
            <input
              id={id('firstName')}
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              autoComplete="given-name"
              maxLength={60}
              aria-invalid={err('firstName') ? true : undefined}
              aria-describedby={describedBy(id('firstName'), false, err('firstName'))}
              className={`${inputClass} ${inputBorder(err('firstName'))}`}
            />
          </Field>
        )}
        <Field id={id('phone')} label={a.phone} error={err('phone')}>
          <input
            id={id('phone')}
            type="tel"
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            maxLength={24}
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            aria-invalid={err('phone') ? true : undefined}
            aria-describedby={describedBy(id('phone'), false, err('phone'))}
            className={`${inputClass} ${inputBorder(err('phone'))} tabular rtl:text-right`}
          />
        </Field>
        {mode === 'signup' && errors.phone === 'phoneTaken' && (
          <button type="button" onClick={() => switchMode('login')} className="link-underline -mt-2 justify-self-start text-sm font-medium">
            {a.logInWithNumber}
          </button>
        )}
        {mode === 'signup' && (
          <Field id={id('email')} label={a.email} optionalLabel={a.optional} error={err('email')}>
            <input
              id={id('email')}
              type="email"
              dir="ltr"
              autoComplete="email"
              maxLength={120}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              aria-invalid={err('email') ? true : undefined}
              aria-describedby={describedBy(id('email'), false, err('email'))}
              className={`${inputClass} ${inputBorder(err('email'))} rtl:text-right`}
            />
          </Field>
        )}
        {mode === 'reset' && (
          <Field id={id('code')} label={a.code} error={err('code')}>
            <input
              id={id('code')}
              dir="ltr"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              maxLength={12}
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
              aria-invalid={err('code') ? true : undefined}
              aria-describedby={describedBy(id('code'), false, err('code'))}
              className={`${inputClass} ${inputBorder(err('code'))} tabular tracking-[0.2em] uppercase rtl:text-right`}
            />
          </Field>
        )}
        <Field
          id={id('password')}
          label={mode === 'reset' ? a.newPassword : a.password}
          hint={mode === 'login' ? undefined : a.passwordHint}
          error={err('password')}
        >
          <PasswordInput
            id={id('password')}
            value={form.password}
            onChange={(v) => set('password', v)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            error={err('password')}
            hint={mode !== 'login'}
          />
        </Field>

        {mode === 'signup' && <p className="text-xs leading-relaxed text-taupe-ink">{a.consent}</p>}

        <Button type="submit" size="lg" disabled={busy} aria-busy={busy} className="w-full">
          {busy ? a.working : mode === 'signup' ? a.createAccount : mode === 'login' ? a.logIn : a.resetSubmit}
        </Button>

        {mode === 'login' && (
          <button type="button" onClick={() => switchMode('reset')} className="link-underline justify-self-center text-sm">
            {a.forgot}
          </button>
        )}
        {mode === 'reset' && (
          <button type="button" onClick={() => switchMode('login')} className="link-underline justify-self-center text-sm">
            {a.backToLogin}
          </button>
        )}
      </form>
      </div>
    </div>
  )
}
