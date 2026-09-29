import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { useAuth } from '../auth/AuthProvider'
import { branches, getBranch, type BranchId } from '../content/site'
import { findLook } from '../content/looks'
import { formatCairoDateShort, formatCairoDateTime, formatTime } from '../booking/cairoTime'
import { formatPhone } from '../booking/validation'
import { api, ApiError, type AppointmentRequest, type RequestStatus, type User } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { StatusPill } from '../components/ui/StatusPill'
import { inputClass } from '../components/request/Field'
import { useAdminStrings } from './strings'
import { RequestDrawer } from './RequestDrawer'

export type StaffRequest = AppointmentRequest & { customer: { id: number; firstName: string; phone: string; email: string | null } }

type Filter = 'open' | 'today' | 'contacted' | 'confirmed' | 'closed' | 'all'
const FILTER_STATUSES: Record<Filter, RequestStatus[]> = {
  open: ['new'],
  today: ['confirmed'],
  contacted: ['contacted'],
  confirmed: ['confirmed'],
  closed: ['declined', 'cancelled', 'completed', 'no_show'],
  all: [],
}
const POLL_MS = 30_000

function queryFor(filter: Filter, q: string, branch: string, kind: string) {
  const params = new URLSearchParams()
  const statuses = FILTER_STATUSES[filter]
  if (statuses.length) params.set('status', statuses.join(','))
  if (filter === 'today') params.set('today', '1')
  if (q) params.set('q', q)
  if (branch) params.set('branch', branch)
  if (kind) params.set('kind', kind)
  return params.toString()
}

export function requestSummary(r: AppointmentRequest, lang: 'en' | 'ar', s: ReturnType<typeof useAdminStrings>) {
  const look = findLook(r.lookRef)
  return [
    ...r.services.map((x) => x.name[lang] + (x.durationMin ? ` · ${x.durationMin}′` : '')),
    ...(look ? [`${s.look}: ${look.name[lang]}`] : []),
    ...(r.helpMeChoose ? [s.helpMeChoose] : []),
  ].join(', ')
}

export function WhenCell({ r }: { r: AppointmentRequest }) {
  const { lang } = useI18n()
  const s = useAdminStrings()
  if (r.status === 'confirmed' && r.confirmedDate) {
    return (
      <span className="font-medium">
        {formatCairoDateShort(r.confirmedDate, lang)} · {r.confirmedTime ? formatTime(r.confirmedTime, lang) : s.anyTime}
      </span>
    )
  }
  return (
    <span>
      {formatCairoDateShort(r.preferredDate, lang)} · {r.preferredTime ? formatTime(r.preferredTime, lang) : s.anyTime}
      <span className="block text-xs text-taupe-ink">{s.preferred}</span>
    </span>
  )
}

export function RequestsView({ user }: { user: User }) {
  const { lang, pick } = useI18n()
  const { sessionEnded } = useAuth()
  const s = useAdminStrings()
  // Opened from a customer's card: show all of that customer's requests.
  const [initialQuery] = useState(() => new URLSearchParams(window.location.search).get('q')?.slice(0, 60) ?? '')
  const [filter, setFilter] = useState<Filter>(initialQuery ? 'all' : 'open')
  const [query, setQuery] = useState(initialQuery)
  const [debounced, setDebounced] = useState(initialQuery)
  const [branch, setBranch] = useState('')
  const [kind, setKind] = useState('')
  const [data, setData] = useState<{ requests: StaffRequest[]; counts: Partial<Record<RequestStatus, number>>; today: number; query: string } | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  // Newest request time already on screen, so only genuinely new arrivals get highlighted.
  const newestSeen = useRef<string | null>(null)
  // Filters can change faster than the server answers; only the latest answer is shown.
  const latest = useRef(0)
  const [fresh, setFresh] = useState<Set<number>>(new Set())
  const canPickBranch = user.role === 'admin' || !user.branchId

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 300)
    return () => window.clearTimeout(id)
  }, [query])

  // Once the search changes, drop the customer link's ?q= so a reload doesn't bring it back.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has('q') && url.searchParams.get('q') !== debounced) {
      url.searchParams.delete('q')
      window.history.replaceState(null, '', url)
    }
  }, [debounced])

  const load = useCallback(async () => {
    const call = ++latest.current
    setLoading(true)
    const query = queryFor(filter, debounced, branch, kind)
    try {
      const result = await api<{ requests: StaffRequest[]; counts: Partial<Record<RequestStatus, number>>; today: number }>(`/admin/requests?${query}`)
      if (call !== latest.current) return
      const before = newestSeen.current
      setFresh(new Set(before ? result.requests.filter((r) => r.createdAt > before).map((r) => r.id) : []))
      for (const r of result.requests) if (!newestSeen.current || r.createdAt > newestSeen.current) newestSeen.current = r.createdAt
      setData({ ...result, query })
      setError(false)
      setUpdatedAt(new Date().toISOString())
    } catch (e) {
      if (call !== latest.current) return
      if (e instanceof ApiError && (e.code === 'unauthorized' || e.code === 'forbidden')) sessionEnded()
      setError(true)
    } finally {
      if (call === latest.current) setLoading(false)
    }
  }, [filter, debounced, branch, kind, sessionEnded])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [load])

  const counts = data?.counts ?? {}
  const countFor = (f: Filter) =>
    f === 'today'
      ? (data?.today ?? 0)
      : f === 'all'
        ? Object.values(counts).reduce((a, b) => a + (b ?? 0), 0)
        : FILTER_STATUSES[f].reduce((a, st) => a + (counts[st] ?? 0), 0)

  useEffect(() => {
    const waiting = counts.new ?? 0
    document.title = `${waiting ? `(${waiting}) ` : ''}${s.title} · Lush`
  }, [counts.new, s.title])

  const requests = data?.requests ?? []
  // While a new filter or search loads, the old list stays but dims, so the page doesn't jump.
  const outdated = !!data && data.query !== queryFor(filter, query.trim(), branch, kind)

  return (
    <div>
      <h1 className="sr-only">{s.tabs.requests}</h1>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label={s.columns.status} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {(Object.keys(FILTER_STATUSES) as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors duration-200 ${
                filter === f ? 'border-charcoal bg-charcoal text-ivory' : 'border-line-strong bg-paper hover:border-charcoal'
              }`}
            >
              {s.filters[f]}
              <span
                className={`tabular min-w-6 rounded-full px-1.5 text-xs ${
                  filter === f ? 'bg-ivory/20' : f === 'open' && countFor(f) > 0 ? 'bg-rose-ink text-ivory' : 'bg-line'
                }`}
              >
                {data ? countFor(f) : '–'}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-taupe-ink">
          {updatedAt && <span aria-live="polite">{s.updated(formatCairoDateTime(updatedAt, lang))}</span>}
          <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading} aria-busy={loading}>
            <Icon name="refresh" size={16} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />
            {s.refresh}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="relative block">
          <span className="sr-only">{s.search}</span>
          <Icon name="search" size={18} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-taupe" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={s.searchPlaceholder}
            className={`${inputClass} border-line-strong ps-10`}
          />
        </label>
        {canPickBranch && (
          <label>
            <span className="sr-only">{s.branch}</span>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className={`${inputClass} border-line-strong`}>
              <option value="">{s.allBranches}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {pick(b.name)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="sr-only">{s.type}</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${inputClass} border-line-strong`}>
            <option value="">{s.allTypes}</option>
            <option value="appointment">{s.appointment}</option>
            <option value="bridal">{s.bridal}</option>
          </select>
        </label>
      </div>

      <div className="mt-6" aria-busy={!data && !error}>
        {!data && !error && (
          <ul className="grid gap-3" aria-label={s.loading}>
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </ul>
        )}
        {error && (
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-blush-soft p-5" role="alert">
            <p>{s.loadError}</p>
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              {s.retry}
            </Button>
          </div>
        )}
        {data && requests.length === 0 && !outdated && (
          <p className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-taupe-ink">
            {debounced ? s.emptySearch : s.emptyRequests}
          </p>
        )}

        {requests.length > 0 && (
          <div className={`transition-opacity duration-200 ${outdated ? 'opacity-50' : ''}`}>
            {/* Desktop: table */}
            <div className="hidden overflow-hidden rounded-2xl border border-line bg-paper lg:block">
              <table className="w-full text-start text-sm">
                <thead className="bg-ivory text-xs uppercase tracking-[0.08em] text-taupe-ink rtl:tracking-normal">
                  <tr>
                    {[s.columns.customer, s.columns.services, s.columns.when, s.columns.branch, s.columns.status, s.columns.received].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-start font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r.id)}
                      className={`cursor-pointer border-t border-line align-top transition-colors duration-200 hover:bg-blush-soft/50 ${fresh.has(r.id) ? 'row-fresh' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <button type="button" onClick={() => setSelected(r.id)} className="text-start font-medium hover:underline" aria-haspopup="dialog">
                          {r.customer.firstName}
                        </button>
                        <bdi dir="ltr" className="tabular block text-xs text-taupe-ink">
                          {formatPhone(r.customer.phone)}
                        </bdi>
                      </td>
                      <td className="max-w-[22rem] px-4 py-3.5">
                        {r.kind === 'bridal' && (
                          <span className="me-1.5 rounded-full bg-gold-soft/40 px-2 py-0.5 text-[0.7rem] font-medium text-gold-ink">{s.bridal}</span>
                        )}
                        {requestSummary(r, lang, s)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <WhenCell r={r} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">{pick(getBranch(r.branchId as BranchId)?.name ?? { en: r.branchId, ar: r.branchId })}</td>
                      <td className="px-4 py-3.5">
                        <StatusPill status={r.status} label={s.status[r.status]} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-taupe-ink">
                        {formatCairoDateTime(r.createdAt, lang)}
                        <bdi className="tabular block text-xs">{r.reference}</bdi>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile and tablet: cards */}
            <ul className="grid gap-3 lg:hidden">
              {requests.map((r) => (
                <li key={r.id} className={fresh.has(r.id) ? 'row-fresh rounded-2xl' : ''}>
                  <button
                    type="button"
                    onClick={() => setSelected(r.id)}
                    aria-haspopup="dialog"
                    className="block w-full rounded-2xl border border-line bg-paper p-4 text-start transition-colors duration-200 hover:border-charcoal/40"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium">{r.customer.firstName}</span>
                      <StatusPill status={r.status} label={s.status[r.status]} />
                    </span>
                    <span className="mt-1 block text-sm">
                      {r.kind === 'bridal' && <span className="me-1.5 font-medium text-gold-ink">{s.bridal} ·</span>}
                      {requestSummary(r, lang, s)}
                    </span>
                    <span className="mt-2 flex flex-wrap items-start justify-between gap-2 text-sm text-taupe-ink">
                      <WhenCell r={r} />
                      <span>{pick(getBranch(r.branchId as BranchId)?.name ?? { en: r.branchId, ar: r.branchId })}</span>
                    </span>
                    <span className="mt-2 flex flex-wrap justify-between gap-2 border-t border-line pt-2 text-xs text-taupe-ink">
                      <span>
                        {s.columns.received} {formatCairoDateTime(r.createdAt, lang)}
                      </span>
                      <bdi className="tabular">{r.reference}</bdi>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <RequestDrawer id={selected} onClose={() => setSelected(null)} onChanged={() => void load()} />
    </div>
  )
}
