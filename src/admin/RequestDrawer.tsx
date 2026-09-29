import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { useAuth } from '../auth/AuthProvider'
import { getBranch, type BranchId } from '../content/site'
import { findLook } from '../content/looks'
import { formatCairoDate, formatCairoDateTime, formatTime, nowInCairo } from '../booking/cairoTime'
import { formatPhone } from '../booking/validation'
import { api, ApiError, type AppointmentRequest, type RequestStatus, type User } from '../lib/api'
import { Button, LinkButton } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { StatusPill } from '../components/ui/StatusPill'
import { Field, inputClass } from '../components/request/Field'
import { useAdminStrings } from './strings'

interface Detail {
  request: AppointmentRequest
  customer: User
  events: { id: number; type: string; status: string | null; note: string | null; createdAt: string; actorName: string | null; actorRole: string | null }[]
  transitions: RequestStatus[]
}

/** A status change the staff member is about to make; confirm, reschedule, decline and cancel take extra input. */
type Pending = { status: RequestStatus; kind: 'confirm' | 'reschedule' | 'decline' | 'cancel' | 'simple' }

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-5">
      <h3 className="eyebrow mb-3">{title}</h3>
      {children}
    </section>
  )
}

export function RequestDrawer({ id, onClose, onChanged }: { id: number | null; onClose: () => void; onChanged: () => void }) {
  const { lang, pick, price } = useI18n()
  const { sessionEnded } = useAuth()
  const s = useAdminStrings()
  const d = s.detail
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [form, setForm] = useState({ date: '', time: '', message: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  // Switching language mid-edit must not reload the request or throw away what was typed.
  const strings = useRef(s)
  strings.current = s

  useEffect(() => {
    setDetail(null)
    setPending(null)
    setError(null)
    setNote('')
    setSaved(false)
    setFormErrors({})
    if (id === null) return
    let current = true
    api<Detail>(`/admin/requests/${id}`)
      .then((d) => current && setDetail(d))
      .catch((e) => {
        if (!current) return
        if (e instanceof ApiError && e.code === 'unauthorized') sessionEnded()
        setError(strings.current.errors[e instanceof ApiError ? e.code : 'not_found'] ?? strings.current.loadError)
      })
    return () => {
      current = false
    }
  }, [id, sessionEnded])

  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.code === 'unauthorized') sessionEnded()
    if (e instanceof ApiError && Object.keys(e.fields).length) {
      setFormErrors(Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, s.errors[v] ?? v])))
    } else setError(s.errors[e instanceof ApiError ? e.code : 'not_found'] ?? s.loadError)
    // Someone else changed this request meanwhile: show its current state and actions.
    if (e instanceof ApiError && (e.code === 'invalid_transition' || e.code === 'stale') && id !== null) {
      setPending(null)
      api<Detail>(`/admin/requests/${id}`)
        .then((fresh) => {
          setDetail(fresh)
          onChanged()
        })
        .catch(() => undefined)
    }
  }

  const start = (p: Pending) => {
    const r = detail!.request
    setPending(p)
    setFormErrors({})
    setSaved(false)
    const today = nowInCairo().date
    const suggested = r.confirmedDate ?? r.preferredDate
    setForm({
      date: suggested < today ? today : suggested,
      time: r.confirmedTime ?? r.preferredTime ?? '',
      message: '',
    })
    if (p.kind === 'simple') void submit(p)
  }

  const submit = async (p: Pending = pending!) => {
    const withDate = p.kind === 'confirm' || p.kind === 'reschedule'
    if (withDate) {
      const errs: Record<string, string> = {}
      if (!form.date) errs.confirmedDate = s.errors.date
      if (!form.time) errs.confirmedTime = s.errors.time
      if (Object.keys(errs).length) {
        setFormErrors(errs)
        return
      }
    }
    setBusy(true)
    setError(null)
    try {
      const result = await api<Omit<Detail, 'customer'>>(`/admin/requests/${id}/status`, {
        method: 'POST',
        body: {
          status: p.status,
          from: detail?.request.status,
          ...(withDate ? { confirmedDate: form.date, confirmedTime: form.time } : {}),
          ...(p.kind !== 'simple' && form.message.trim() ? { customerMessage: form.message.trim() } : {}),
        },
      })
      setDetail((current) => (current ? { ...current, ...result } : current))
      setPending(null)
      setSaved(true)
      onChanged()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  const addNote = async () => {
    if (!note.trim()) {
      setFormErrors({ note: s.errors.note })
      return
    }
    setBusy(true)
    try {
      const { events } = await api<{ events: Detail['events'] }>(`/admin/requests/${id}/notes`, { method: 'POST', body: { note } })
      setDetail((current) => (current ? { ...current, events } : current))
      setNote('')
      setFormErrors({})
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  const r = detail?.request
  const branch = r ? getBranch(r.branchId as BranchId) : undefined
  const look = r ? findLook(r.lookRef) : undefined
  const actions: { key: string; label: string; pending: Pending; primary?: boolean }[] = []
  if (detail && r) {
    const can = (st: RequestStatus) => detail.transitions.includes(st)
    if (can('contacted') && r.status === 'new') actions.push({ key: 'contacted', label: d.markContacted, pending: { status: 'contacted', kind: 'simple' } })
    if (can('confirmed') && r.status !== 'confirmed') actions.push({ key: 'confirm', label: d.confirm, pending: { status: 'confirmed', kind: 'confirm' }, primary: true })
    if (can('confirmed') && r.status === 'confirmed') actions.push({ key: 'reschedule', label: d.reschedule, pending: { status: 'confirmed', kind: 'reschedule' } })
    if (can('completed')) actions.push({ key: 'completed', label: d.complete, pending: { status: 'completed', kind: 'simple' }, primary: true })
    if (can('no_show')) actions.push({ key: 'no_show', label: d.noShow, pending: { status: 'no_show', kind: 'simple' } })
    if (can('declined')) actions.push({ key: 'declined', label: d.decline, pending: { status: 'declined', kind: 'decline' } })
    if (can('cancelled')) actions.push({ key: 'cancelled', label: d.cancel, pending: { status: 'cancelled', kind: 'cancel' } })
    if (can('contacted') && r.status !== 'new') actions.push({ key: 'reopen', label: d.reopen, pending: { status: 'contacted', kind: 'simple' } })
  }

  const waDigits = detail?.customer.phone.replace(/\D/g, '')

  return (
    <Modal
      open={id !== null}
      onClose={onClose}
      labelledBy="drawer-title"
      initialFocus={closeRef}
      className="drawer m-0 h-[100dvh] max-h-[100dvh] w-full bg-ivory p-0 sm:ms-auto sm:w-[min(36rem,100vw)]"
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-7">
          <h2 id="drawer-title" className="text-sm font-medium">
            {r ? (
              <>
                <bdi className="tabular">{r.reference}</bdi>
                {r.kind === 'bridal' && <span className="ms-2 text-gold-ink">· {s.bridal}</span>}
              </>
            ) : (
              s.loading
            )}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={d.close}
            className="-me-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-blush-soft"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-10 sm:px-7">
          {error && (
            <p role="alert" className="mt-5 rounded-xl bg-[#fbeceb] p-3 text-sm text-danger">
              {error}
            </p>
          )}
          {!detail && !error && <p className="py-10 text-center text-taupe-ink">{s.loading}</p>}

          {detail && r && (
            <>
              <div className="flex flex-wrap items-center gap-3 py-5">
                <StatusPill status={r.status} label={s.status[r.status]} />
                <span className="text-sm text-taupe-ink">{formatCairoDateTime(r.createdAt, lang)}</span>
                {saved && (
                  <span role="status" className="text-sm text-[#2c5a36]">
                    {d.saved}
                  </span>
                )}
              </div>

              <Section title={d.customer}>
                <p className="display text-[1.9rem] leading-tight">{detail.customer.firstName}</p>
                <bdi dir="ltr" className="tabular text-taupe-ink">
                  {formatPhone(detail.customer.phone)}
                </bdi>
                {detail.customer.email && <p className="text-sm text-taupe-ink">{detail.customer.email}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <LinkButton size="sm" variant="secondary" href={`tel:${detail.customer.phone}`}>
                    <Icon name="phone" size={16} />
                    {d.call}
                  </LinkButton>
                  <LinkButton size="sm" variant="secondary" href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener noreferrer">
                    <Icon name="whatsapp" size={16} />
                    {d.whatsapp}
                  </LinkButton>
                  {detail.customer.email && (
                    <LinkButton size="sm" variant="secondary" href={`mailto:${detail.customer.email}`}>
                      {d.email}
                    </LinkButton>
                  )}
                </div>
              </Section>

              <Section title={d.request}>
                <dl className="grid grid-cols-2 gap-3 text-sm [&>div]:col-span-2">
                  <div>
                    <dt className="text-taupe-ink">{s.columns.branch}</dt>
                    <dd>{branch ? `${pick(branch.name)} · ${pick(branch.area)}` : r.branchId}</dd>
                  </div>
                  <div>
                    <dt className="text-taupe-ink">{d.menuPrices}</dt>
                    <dd>
                      <ul className="mt-1 grid gap-1">
                        {r.services.map((x) => (
                          <li key={x.id} className="flex items-end gap-3">
                            <span>
                              {x.name[lang]}
                              {x.durationMin ? ` · ${x.durationMin}′` : ''}
                            </span>
                            <span className="leader" aria-hidden="true" />
                            <span className="tabular whitespace-nowrap">{price(x.price)}</span>
                          </li>
                        ))}
                        {look && (
                          <li>
                            {s.look}: {pick(look.name)} <bdi className="tabular text-taupe-ink">({look.ref})</bdi>
                          </li>
                        )}
                        {r.helpMeChoose && <li>{s.helpMeChoose}</li>}
                      </ul>
                    </dd>
                  </div>
                  <div className="!col-span-1">
                    <dt className="text-taupe-ink">{d.preferredDate}</dt>
                    <dd>{formatCairoDate(r.preferredDate, lang)}</dd>
                  </div>
                  <div className="!col-span-1">
                    <dt className="text-taupe-ink">{d.preferredTime}</dt>
                    <dd>{r.preferredTime ? formatTime(r.preferredTime, lang) : s.anyTime}</dd>
                  </div>
                  {r.status === 'confirmed' && r.confirmedDate && (
                    <div className="rounded-xl bg-[#e2eee3] p-3">
                      <dt className="text-[#2c5a36]">{d.confirmedFor}</dt>
                      <dd className="font-medium">
                        {formatCairoDate(r.confirmedDate, lang)} · {r.confirmedTime ? formatTime(r.confirmedTime, lang) : ''}
                      </dd>
                    </div>
                  )}
                  {r.eventDate && (
                    <div>
                      <dt className="text-taupe-ink">{d.eventDate}</dt>
                      <dd>{formatCairoDate(r.eventDate, lang)}</dd>
                    </div>
                  )}
                  {r.groupSize && (
                    <div>
                      <dt className="text-taupe-ink">{d.groupSize}</dt>
                      <dd className="tabular">{r.groupSize}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-taupe-ink">{d.notes}</dt>
                    <dd dir="auto" className="whitespace-pre-line text-start">
                      {r.notes || <span className="text-taupe-ink">{d.noNotes}</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-taupe-ink">{d.language}</dt>
                    <dd>{r.lang === 'ar' ? 'عربي' : 'English'}</dd>
                  </div>
                  {r.customerMessage && (
                    <div>
                      <dt className="text-taupe-ink">{d.messageToCustomer}</dt>
                      <dd dir="auto" className="text-start">
                        {r.customerMessage}
                      </dd>
                    </div>
                  )}
                </dl>
              </Section>

              {actions.length > 0 && (
                <Section title={d.actions}>
                  {!pending ? (
                    <div className="flex flex-wrap gap-2">
                      {actions.map((a) => (
                        <Button key={a.key} size="sm" variant={a.primary ? 'primary' : 'secondary'} disabled={busy} onClick={() => start(a.pending)}>
                          {a.label}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-4 rounded-2xl border border-line-strong bg-paper p-4">
                      <p className="font-medium">{actions.find((a) => a.pending.kind === pending.kind && a.pending.status === pending.status)?.label}</p>
                      {(pending.kind === 'confirm' || pending.kind === 'reschedule') && (
                        <div className="grid grid-cols-2 gap-3">
                          <Field id="confirm-date" label={d.date} error={formErrors.confirmedDate}>
                            <input
                              id="confirm-date"
                              type="date"
                              min={nowInCairo().date}
                              value={form.date}
                              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                              className={`${inputClass} ${formErrors.confirmedDate ? 'border-danger' : 'border-line-strong'}`}
                            />
                          </Field>
                          <Field id="confirm-time" label={d.time} error={formErrors.confirmedTime}>
                            <input
                              id="confirm-time"
                              type="time"
                              step={900}
                              value={form.time}
                              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                              className={`${inputClass} ${formErrors.confirmedTime ? 'border-danger' : 'border-line-strong'}`}
                            />
                          </Field>
                        </div>
                      )}
                      {pending.kind !== 'simple' && (
                        <Field id="customer-message" label={d.messageToCustomer} hint={d.messageHint} error={formErrors.customerMessage}>
                          <textarea
                            id="customer-message"
                            rows={2}
                            maxLength={300}
                            dir="auto"
                            value={form.message}
                            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                            className={`${inputClass} border-line-strong`}
                          />
                        </Field>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => void submit()} disabled={busy} aria-busy={busy}>
                          {d.save}
                        </Button>
                        <Button size="sm" variant="quiet" onClick={() => setPending(null)}>
                          {d.back}
                        </Button>
                      </div>
                    </div>
                  )}
                </Section>
              )}

              <Section title={d.internalNote}>
                <Field id="internal-note" label={d.internalNoteHint} error={formErrors.note}>
                  <textarea
                    id="internal-note"
                    rows={2}
                    maxLength={1000}
                    dir="auto"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className={`${inputClass} ${formErrors.note ? 'border-danger' : 'border-line-strong'}`}
                  />
                </Field>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => void addNote()} disabled={busy}>
                  <Icon name="note" size={16} />
                  {d.addNote}
                </Button>
              </Section>

              <Section title={d.history}>
                <ol className="relative grid gap-4 border-s border-line ps-5">
                  {detail.events
                    .slice()
                    .reverse()
                    .map((e) => (
                      <li key={e.id} className="relative text-sm">
                        <span className="absolute -start-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-ivory bg-gold" aria-hidden="true" />
                        <p>
                          <span className="font-medium">{d.events[e.type] ?? e.type}</span>
                          {e.status && e.type === 'status' && <> · {s.status[e.status]}</>}
                        </p>
                        {e.note && (
                          <p dir="auto" className="mt-0.5 whitespace-pre-line text-start text-charcoal/85">
                            {e.note}
                          </p>
                        )}
                        <p className="text-xs text-taupe-ink">
                          {formatCairoDateTime(e.createdAt, lang)}
                          {e.actorName && ` · ${d.by(e.actorName)}`}
                        </p>
                      </li>
                    ))}
                </ol>
              </Section>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
