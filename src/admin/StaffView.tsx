import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { branches } from '../content/site'
import { formatPhone, isValidPhone } from '../booking/validation'
import { api, ApiError, type User } from '../lib/api'
import { PasswordInput } from '../auth/AuthPanel'
import { Button } from '../components/ui/Button'
import { describedBy, Field, inputBorder, inputClass } from '../components/request/Field'
import { useAuth } from '../auth/AuthProvider'
import { useAdminStrings } from './strings'
import { ResetCodeDialog } from './ResetCodeDialog'

export function StaffView({ user }: { user: User }) {
  const { t, pick } = useI18n()
  const s = useAdminStrings()
  const { sessionEnded } = useAuth()
  const [staff, setStaff] = useState<User[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ firstName: '', phone: '', email: '', password: '', role: 'staff', branchId: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [resetFor, setResetFor] = useState<User | null>(null)

  const load = useCallback(() => {
    api<{ staff: User[] }>('/admin/staff')
      .then(({ staff: list }) => setStaff(list))
      .catch((e) => {
        if (e instanceof ApiError && (e.code === 'unauthorized' || e.code === 'forbidden')) sessionEnded()
        setError('loadError')
      })
  }, [sessionEnded])

  useEffect(load, [load])

  const message = (code: string) => (code === 'loadError' ? s.loadError : (t.auth.errors[code] ?? s.errors[code] ?? t.auth.errors.server))

  const create = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.firstName.trim()) errs.firstName = 'firstName'
    if (!isValidPhone(form.phone)) errs.phone = form.phone ? 'phoneFormat' : 'phone'
    if (form.password.length < 8) errs.password = 'passwordShort'
    setFormErrors(errs)
    setNotice(null)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      await api('/admin/staff', { method: 'POST', body: { ...form, branchId: form.branchId || null } })
      setForm({ firstName: '', phone: '', email: '', password: '', role: 'staff', branchId: '' })
      setNotice({ text: s.staff.created, ok: true })
      load()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'unauthorized') sessionEnded()
      if (err instanceof ApiError && Object.keys(err.fields).length) setFormErrors(err.fields)
      else setNotice({ text: message(err instanceof ApiError ? err.code : 'server'), ok: false })
    } finally {
      setBusy(false)
    }
  }

  const update = async (member: User, patch: Partial<{ role: string; branchId: string | null; disabled: boolean }>) => {
    setError(null)
    try {
      await api(`/admin/staff/${member.id}`, { method: 'PATCH', body: patch })
      load()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'unauthorized') sessionEnded()
      setError(err instanceof ApiError ? err.code : 'server')
    }
  }

  const err = (f: string) => (formErrors[f] ? message(formErrors[f]) : undefined)

  return (
    <div className="grid gap-10 xl:grid-cols-[1fr_24rem]">
      <div>
        <h1 className="display text-[2.5rem]">{s.staff.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-taupe-ink">{s.staff.help}</p>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-[#fbeceb] p-3 text-sm text-danger">
            {message(error)}
          </p>
        )}
        {!staff && !error && (
          <ul className="mt-6 grid gap-3" aria-label={s.loading}>
            {[0, 1, 2].map((i) => (
              <li key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </ul>
        )}
        {staff && (
          <ul className="mt-6 grid gap-3">
            {staff.map((m) => {
              const self = m.id === user.id
              return (
                <li key={m.id} className={`rounded-2xl border border-line bg-paper p-4 ${m.disabled ? 'opacity-70' : ''}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {m.firstName} {self && <span className="text-sm font-normal text-taupe-ink">({s.staff.you})</span>}
                      </p>
                      <bdi dir="ltr" className="tabular text-sm text-taupe-ink">
                        {formatPhone(m.phone)}
                      </bdi>
                      <p className="mt-1 text-xs text-taupe-ink">{m.disabled ? s.staff.disabled : s.staff.active}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label>
                        <span className="sr-only">
                          {s.staff.role}: {m.firstName}
                        </span>
                        <select
                          value={m.role}
                          disabled={self}
                          onChange={(e) => void update(m, { role: e.target.value })}
                          className={`${inputClass} min-h-10 border-line-strong py-1.5 text-sm`}
                        >
                          <option value="staff">{s.staff.roles.staff}</option>
                          <option value="admin">{s.staff.roles.admin}</option>
                        </select>
                      </label>
                      {m.role === 'staff' && (
                        <label>
                          <span className="sr-only">
                            {s.staff.branch}: {m.firstName}
                          </span>
                          <select
                            value={m.branchId ?? ''}
                            onChange={(e) => void update(m, { branchId: e.target.value || null })}
                            className={`${inputClass} min-h-10 border-line-strong py-1.5 text-sm`}
                          >
                            <option value="">{s.staff.anyBranch}</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {pick(b.name)}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {!self && (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => void update(m, { disabled: !m.disabled })}>
                            {m.disabled ? s.staff.enable : s.staff.disable}
                          </Button>
                          <Button size="sm" variant="quiet" onClick={() => setResetFor(m)}>
                            {s.customers.resetCode}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <form noValidate onSubmit={create} className="grid content-start gap-4 rounded-[1.25rem] border border-line bg-paper p-5 sm:p-6">
        <h2 className="display text-[1.75rem] italic">{s.staff.add}</h2>
        <Field id="staff-name" label={s.staff.firstName} error={err('firstName')}>
          <input id="staff-name" value={form.firstName} maxLength={60} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} aria-invalid={err('firstName') ? true : undefined} aria-describedby={describedBy('staff-name', false, err('firstName'))} className={`${inputClass} ${inputBorder(err('firstName'))}`} />
        </Field>
        <Field id="staff-phone" label={s.staff.phone} error={err('phone')}>
          <input id="staff-phone" type="tel" dir="ltr" value={form.phone} maxLength={24} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} aria-invalid={err('phone') ? true : undefined} aria-describedby={describedBy('staff-phone', false, err('phone'))} className={`${inputClass} ${inputBorder(err('phone'))} tabular rtl:text-right`} />
        </Field>
        <Field id="staff-email" label={s.staff.email} optionalLabel={t.auth.optional} error={err('email')}>
          <input id="staff-email" type="email" dir="ltr" value={form.email} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} aria-invalid={err('email') ? true : undefined} aria-describedby={describedBy('staff-email', false, err('email'))} className={`${inputClass} ${inputBorder(err('email'))} rtl:text-right`} />
        </Field>
        <Field id="staff-password" label={s.staff.password} hint={s.staff.passwordHint} error={err('password')}>
          <PasswordInput id="staff-password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} autoComplete="new-password" error={err('password')} hint />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="staff-role" label={s.staff.role}>
            <select id="staff-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className={`${inputClass} border-line-strong`}>
              <option value="staff">{s.staff.roles.staff}</option>
              <option value="admin">{s.staff.roles.admin}</option>
            </select>
          </Field>
          <Field id="staff-branch" label={s.staff.branch}>
            <select id="staff-branch" value={form.branchId} disabled={form.role === 'admin'} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))} className={`${inputClass} border-line-strong`}>
              <option value="">{s.staff.anyBranch}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {pick(b.name)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button type="submit" disabled={busy} aria-busy={busy}>
          {s.staff.create}
        </Button>
        <p role="status" className={`text-sm ${notice?.ok === false ? 'text-danger' : 'text-[#2c5a36]'}`}>
          {notice?.text}
        </p>
      </form>
      <ResetCodeDialog target={resetFor} onClose={() => setResetFor(null)} />
    </div>
  )
}
