import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { useAuth } from '../auth/AuthProvider'
import { AuthPanel, PasswordInput } from '../auth/AuthPanel'
import { useRequest } from '../booking/RequestProvider'
import { formatCairoDate, formatCairoDateTime, formatTime, nowInCairo } from '../booking/cairoTime'
import { formatPhone } from '../booking/validation'
import { getBranch, type BranchId } from '../content/site'
import { findLook } from '../content/looks'
import { api, ApiError, type AppointmentRequest, type User } from '../lib/api'
import { useAnnounce } from '../lib/announce'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { StatusPill } from '../components/ui/StatusPill'
import { describedBy, Field, inputBorder, inputClass } from '../components/request/Field'
import { LushField } from '../components/brand/LushField'

const OPEN_STATUSES = ['new', 'contacted', 'confirmed']

/** The day that matters for a request: the confirmed day once there is one, otherwise the preferred day. */
const dayOf = (r: AppointmentRequest) => (r.status === 'confirmed' ? (r.confirmedDate ?? r.preferredDate) : r.preferredDate)

function isUpcoming(r: AppointmentRequest, today: string) {
  return OPEN_STATUSES.includes(r.status) && dayOf(r) >= today
}

function RequestCard({ request, onChange, onStale }: { request: AppointmentRequest; onChange: (r: AppointmentRequest) => void; onStale: () => void }) {
  const { t, lang, pick } = useI18n()
  const { sessionEnded } = useAuth()
  const announce = useAnnounce()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const branch = getBranch(request.branchId as BranchId)
  const look = findLook(request.lookRef)
  const today = nowInCairo().date
  const confirmed = request.status === 'confirmed'
  const date = confirmed ? request.confirmedDate : request.preferredDate
  const time = confirmed ? request.confirmedTime : request.preferredTime
  const open = OPEN_STATUSES.includes(request.status)
  const canCancel = open && (date ?? '') >= today
  const passedUnconfirmed = open && !confirmed && (date ?? '') < today

  const titleParts = [
    ...request.services.map((s) => (s.durationMin ? `${s.name[lang]} · ${t.common.minutes(s.durationMin)}` : s.name[lang])),
    ...(look ? [`${t.request.services.look}: ${pick(look.name)}`] : []),
    ...(request.helpMeChoose ? [t.request.review.helpMeChoose] : []),
  ]

  const cancel = async () => {
    setBusy(true)
    setError(null)
    try {
      const { request: updated } = await api<{ request: AppointmentRequest }>(`/requests/${request.reference}/cancel`, { method: 'POST' })
      onChange(updated)
      announce(t.account.cancelledNotice)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'unauthorized') sessionEnded()
      // The branch changed it meanwhile, or its day has passed: show the latest state.
      if (e instanceof ApiError && (e.code === 'invalid_transition' || e.code === 'too_late')) onStale()
      setError(t.auth.errors[e instanceof ApiError ? e.code : 'server'] ?? t.auth.errors.server)
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <li className="reveal rounded-[1.25rem] border border-line bg-paper p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusPill status={request.status} label={t.account.status[request.status]} />
        <span className="text-xs text-taupe-ink">
          {t.account.reference} <bdi className="tabular">{request.reference}</bdi>
        </span>
      </div>
      <h3 className="display mt-3 text-[1.6rem] leading-snug">
        {request.kind === 'bridal' && <span className="me-2 font-sans text-xs uppercase tracking-[0.14em] text-gold-ink rtl:tracking-normal">{t.account.bridal}</span>}
        {titleParts.join(' · ')}
      </h3>
      <dl className="mt-3 grid gap-1 text-sm">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-taupe-ink">{confirmed ? t.account.confirmedFor : t.account.preferred}:</dt>
          <dd className={confirmed ? 'font-medium' : ''}>
            {date ? formatCairoDate(date, lang) : ''} · {time ? `${formatTime(time, lang)} (${t.request.when.cairo})` : t.account.anyTime}
          </dd>
        </div>
        {branch && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="sr-only">{t.request.review.branch}</dt>
            <dd className="text-taupe-ink">
              {pick(branch.name)} · {pick(branch.area)} ·{' '}
              <a href={`tel:${branch.phoneE164}`} className="link-underline">
                <bdi dir="ltr">{branch.phoneDisplay}</bdi>
              </a>
            </dd>
          </div>
        )}
      </dl>
      <p className="mt-3 text-sm text-charcoal/80">{passedUnconfirmed ? t.account.datePassed : t.account.statusHelp[request.status]}</p>
      {request.customerMessage && (
        <blockquote className="mt-3 border-s-2 border-gold ps-3 text-sm">
          <span className="block text-xs text-taupe-ink">{t.account.messageFromBranch}</span>
          <span dir="auto">{request.customerMessage}</span>
        </blockquote>
      )}
      <p className="mt-3 text-xs text-taupe-ink">
        {t.account.received} {formatCairoDateTime(request.createdAt, lang)}
      </p>

      {canCancel && (
        <div className="mt-4 border-t border-line pt-4">
          {confirming ? (
            <div role="group" aria-label={t.account.cancelConfirmTitle} className="flex flex-wrap items-center gap-3">
              <p className="w-full text-sm">
                <strong className="font-medium">{t.account.cancelConfirmTitle}</strong> {t.account.cancelConfirmBody}
              </p>
              <Button size="sm" onClick={cancel} disabled={busy} aria-busy={busy}>
                {t.account.confirmCancel}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
                {t.account.keep}
              </Button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="link-underline min-h-10 text-sm font-medium">
              {t.account.cancel}
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </li>
  )
}

function AccountDetails({ user }: { user: User }) {
  const { t, setLang } = useI18n()
  const { setUser, sessionEnded } = useAuth()
  const uid = useId().replace(/:/g, '')
  const [profile, setProfile] = useState({ firstName: user.firstName, email: user.email ?? '', lang: user.lang })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' })
  const [profileState, setProfileState] = useState<{ errors: Record<string, string>; message?: string; busy?: boolean }>({ errors: {} })
  const [passwordState, setPasswordState] = useState<{ errors: Record<string, string>; message?: string; busy?: boolean }>({ errors: {} })
  const err = (errors: Record<string, string>, f: string) => (errors[f] ? (t.auth.errors[errors[f]] ?? t.auth.errors.server) : undefined)

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setProfileState({ errors: {}, busy: true })
    try {
      const { user: updated } = await api<{ user: User }>('/account', { method: 'PATCH', body: profile })
      setUser(updated)
      setLang(updated.lang)
      setProfileState({ errors: {}, message: t.account.saved })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'unauthorized') sessionEnded()
      setProfileState({ errors: error instanceof ApiError ? error.fields : {}, message: error instanceof ApiError && !Object.keys(error.fields).length ? t.auth.errors[error.code] : undefined })
    }
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (passwords.newPassword.length < 8) {
      setPasswordState({ errors: { newPassword: 'passwordShort' } })
      return
    }
    setPasswordState({ errors: {}, busy: true })
    try {
      await api('/account/password', { method: 'POST', body: passwords })
      setPasswords({ currentPassword: '', newPassword: '' })
      setPasswordState({ errors: {}, message: t.account.passwordChanged })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'unauthorized') sessionEnded()
      setPasswordState({ errors: error instanceof ApiError ? error.fields : {}, message: error instanceof ApiError && !Object.keys(error.fields).length ? t.auth.errors[error.code] : undefined })
    }
  }

  const id = (f: string) => `${uid}-${f}`

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form noValidate onSubmit={saveProfile} className="grid content-start gap-4">
        <h3 className="display text-[1.75rem] italic">{t.account.details}</h3>
        <Field id={id('firstName')} label={t.auth.firstName} error={err(profileState.errors, 'firstName')}>
          <input
            id={id('firstName')}
            value={profile.firstName}
            maxLength={60}
            autoComplete="given-name"
            onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
            aria-invalid={profileState.errors.firstName ? true : undefined}
            aria-describedby={describedBy(id('firstName'), false, err(profileState.errors, 'firstName'))}
            className={`${inputClass} ${inputBorder(err(profileState.errors, 'firstName'))}`}
          />
        </Field>
        <Field id={id('phone')} label={t.auth.phone}>
          <input id={id('phone')} value={formatPhone(user.phone)} readOnly dir="ltr" className={`${inputClass} border-line bg-ivory tabular rtl:text-right`} />
        </Field>
        <Field id={id('email')} label={t.auth.email} optionalLabel={t.auth.optional} error={err(profileState.errors, 'email')}>
          <input
            id={id('email')}
            type="email"
            dir="ltr"
            value={profile.email}
            maxLength={120}
            autoComplete="email"
            onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
            aria-invalid={profileState.errors.email ? true : undefined}
            aria-describedby={describedBy(id('email'), false, err(profileState.errors, 'email'))}
            className={`${inputClass} ${inputBorder(err(profileState.errors, 'email'))} rtl:text-right`}
          />
        </Field>
        <Field id={id('lang')} label={t.account.language}>
          <select
            id={id('lang')}
            value={profile.lang}
            onChange={(e) => setProfile((p) => ({ ...p, lang: e.target.value as 'en' | 'ar' }))}
            className={`${inputClass} border-line-strong`}
          >
            <option value="en">English</option>
            <option value="ar">عربي</option>
          </select>
        </Field>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={profileState.busy}>
            {t.account.save}
          </Button>
          <p role="status" className="text-sm text-taupe-ink">
            {profileState.message}
          </p>
        </div>
      </form>

      <form noValidate onSubmit={savePassword} className="grid content-start gap-4">
        <h3 className="display text-[1.75rem] italic">{t.account.changePassword}</h3>
        <Field id={id('current')} label={t.auth.currentPassword} error={err(passwordState.errors, 'currentPassword')}>
          <PasswordInput
            id={id('current')}
            value={passwords.currentPassword}
            onChange={(v) => setPasswords((p) => ({ ...p, currentPassword: v }))}
            autoComplete="current-password"
            error={err(passwordState.errors, 'currentPassword')}
          />
        </Field>
        <Field id={id('new')} label={t.auth.newPassword} hint={t.auth.passwordHint} error={err(passwordState.errors, 'newPassword')}>
          <PasswordInput
            id={id('new')}
            value={passwords.newPassword}
            onChange={(v) => setPasswords((p) => ({ ...p, newPassword: v }))}
            autoComplete="new-password"
            error={err(passwordState.errors, 'newPassword')}
            hint
          />
        </Field>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="secondary" disabled={passwordState.busy}>
            {t.account.updatePassword}
          </Button>
          <p role="status" className="text-sm text-taupe-ink">
            {passwordState.message}
          </p>
        </div>
      </form>
    </div>
  )
}

export function AccountPage() {
  const { t } = useI18n()
  const { status, user, logOut, sessionEnded } = useAuth()
  const { open } = useRequest()
  const [requests, setRequests] = useState<AppointmentRequest[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    document.title = `${t.account.title} · ${t.common.businessName}`
  }, [t])

  const lastLoad = useRef(0)
  const load = useCallback(async () => {
    lastLoad.current = Date.now()
    setLoadError(false)
    try {
      const { requests: list } = await api<{ requests: AppointmentRequest[] }>('/requests')
      setRequests(list)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'unauthorized') sessionEnded()
      setLoadError(true)
    }
  }, [sessionEnded])

  useEffect(() => {
    if (user) void load()
    else setRequests(null)
  }, [user, load])

  // A request sent from this page (the header or mobile bar) appears without a reload.
  useEffect(() => {
    const refresh = () => {
      if (user) void load()
    }
    window.addEventListener('lush:request-sent', refresh)
    return () => window.removeEventListener('lush:request-sent', refresh)
  }, [user, load])

  // Coming back to the tab shows the branch's latest replies (at most every 20 seconds).
  useEffect(() => {
    const onReturn = () => {
      if (user && document.visibilityState === 'visible' && Date.now() - lastLoad.current > 20_000) void load()
    }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [user, load])

  const today = nowInCairo().date
  const upcoming = requests?.filter((r) => isUpcoming(r, today)) ?? []
  const past = requests?.filter((r) => !isUpcoming(r, today)) ?? []
  const replace = (updated: AppointmentRequest) => setRequests((list) => list?.map((r) => (r.id === updated.id ? updated : r)) ?? null)

  return (
    <section aria-labelledby="account-title" className="relative isolate min-h-[70vh] overflow-hidden pb-24 pt-12 sm:pt-16">
      <div className="absolute inset-x-0 top-0 -z-10 h-72 opacity-70" aria-hidden="true">
        <LushField className="h-full w-full" variant="c" soft />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-ivory" />
      </div>
      <div className="container-page">
        {status === 'loading' && <p className="py-20 text-center text-taupe-ink">{t.account.loading}</p>}

        {status === 'offline' && <p className="mx-auto max-w-lg rounded-2xl bg-blush-soft p-5">{t.auth.offline}</p>}

        {status === 'ready' && !user && (
          <div className="mx-auto max-w-md rounded-[1.5rem] border border-line bg-paper p-6 shadow-[0_24px_60px_-40px_rgb(125_74_63/0.5)] sm:p-8">
            <h1 id="account-title" className="eyebrow mb-4">
              {t.account.logInTitle}
            </h1>
            <AuthPanel initialMode="login" headingLevel="h2" />
          </div>
        )}

        {status === 'ready' && user && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">{t.account.title}</p>
                <h1 id="account-title" className="display mt-3 text-[clamp(2.75rem,6vw,4.5rem)]">
                  {t.account.hello(user.firstName)}
                </h1>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => open()}>{t.account.requestAnother}</Button>
                <Button variant="secondary" onClick={() => void logOut()}>
                  <Icon name="logout" size={18} className="rtl:-scale-x-100" />
                  {t.auth.logOut}
                </Button>
              </div>
            </div>

            <div className="mt-12" aria-busy={requests === null && !loadError}>
              {requests === null && !loadError && (
                <ul className="grid gap-4 md:grid-cols-2" aria-label={t.account.loading}>
                  {[0, 1].map((i) => (
                    <li key={i} className="skeleton h-56 rounded-[1.25rem]" />
                  ))}
                </ul>
              )}
              {loadError && (
                <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-blush-soft p-5">
                  <p>{t.account.loadError}</p>
                  <Button size="sm" variant="secondary" onClick={() => void load()}>
                    <Icon name="refresh" size={16} />
                    {t.account.retry}
                  </Button>
                </div>
              )}
              {requests && requests.length === 0 && (
                <div className="rounded-[1.25rem] border border-dashed border-line-strong p-8 text-center">
                  <p className="display text-[1.75rem]">{t.account.empty}</p>
                  <Button className="mt-5" onClick={() => open()}>
                    {t.account.requestAnother}
                  </Button>
                </div>
              )}
              {upcoming.length > 0 && (
                <>
                  <h2 className="display text-[2rem] italic">{t.account.upcoming}</h2>
                  <ul className="mt-5 grid gap-4 md:grid-cols-2">
                    {upcoming.map((r) => (
                      <RequestCard key={r.id} request={r} onChange={replace} onStale={() => void load()} />
                    ))}
                  </ul>
                </>
              )}
              {past.length > 0 && (
                <>
                  <h2 className="display mt-14 text-[2rem] italic">{t.account.past}</h2>
                  <ul className="mt-5 grid gap-4 md:grid-cols-2">
                    {past.map((r) => (
                      <RequestCard key={r.id} request={r} onChange={replace} onStale={() => void load()} />
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="mt-16 border-t border-line pt-12">
              <AccountDetails user={user} />
            </div>
          </>
        )}
      </div>
    </section>
  )
}
