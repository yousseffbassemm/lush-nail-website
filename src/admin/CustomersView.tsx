import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { formatCairoDateTime } from '../booking/cairoTime'
import { formatPhone } from '../booking/validation'
import { api, ApiError, type User } from '../lib/api'
import { useAuth } from '../auth/AuthProvider'
import { Link } from '../lib/router'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { inputClass } from '../components/request/Field'
import { useAdminStrings } from './strings'
import { ResetCodeDialog } from './ResetCodeDialog'

type Customer = User & { requestCount: number; lastRequestAt: string | null }

/** +201001234567 → 01001234567, the form staff type into the requests search. */
const localPhone = (e164: string) => (e164.startsWith('+20') ? `0${e164.slice(3)}` : e164)

export function CustomersView() {
  const { lang } = useI18n()
  const s = useAdminStrings()
  const { sessionEnded } = useAuth()
  const [query, setQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[] | null>(null)
  const [error, setError] = useState(false)
  const [resetFor, setResetFor] = useState<Customer | null>(null)

  useEffect(() => {
    let current = true
    const id = window.setTimeout(() => {
      api<{ customers: Customer[] }>(`/admin/customers?q=${encodeURIComponent(query.trim())}`)
        .then(({ customers: list }) => {
          if (!current) return
          setCustomers(list)
          setError(false)
        })
        .catch((e) => {
          if (!current) return
          if (e instanceof ApiError && (e.code === 'unauthorized' || e.code === 'forbidden')) sessionEnded()
          setError(true)
        })
    }, 250)
    return () => {
      current = false
      window.clearTimeout(id)
    }
  }, [query, sessionEnded])

  return (
    <div>
      <h1 className="display text-[2.5rem]">{s.customers.title}</h1>
      <p className="mt-1 text-sm text-taupe-ink">{s.customers.help}</p>
      <label className="relative mt-5 block max-w-md">
        <span className="sr-only">{s.search}</span>
        <Icon name="search" size={18} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-taupe" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={s.customers.searchPlaceholder}
          className={`${inputClass} border-line-strong ps-10`}
        />
      </label>

      <div className="mt-6">
        {error && (
          <p role="alert" className="rounded-2xl bg-blush-soft p-5">
            {s.loadError}
          </p>
        )}
        {!customers && !error && (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label={s.loading}>
            {[0, 1, 2].map((i) => (
              <li key={i} className="skeleton h-32 rounded-2xl" />
            ))}
          </ul>
        )}
        {customers?.length === 0 && <p className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-taupe-ink">{s.customers.empty}</p>}
        {customers && customers.length > 0 && (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {customers.map((c) => (
              <li key={c.id} className="rounded-2xl border border-line bg-paper p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{c.firstName}</p>
                    <a href={`tel:${c.phone}`} className="text-sm text-taupe-ink hover:underline">
                      <bdi dir="ltr" className="tabular">
                        {formatPhone(c.phone)}
                      </bdi>
                    </a>
                    {c.email && <p className="truncate text-sm text-taupe-ink">{c.email}</p>}
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setResetFor(c)}>
                    {s.customers.resetCode}
                  </Button>
                </div>
                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-taupe-ink">
                  <div className="flex gap-1">
                    <dt>{s.customers.requests}:</dt>
                    <dd className="tabular text-charcoal">
                      {c.requestCount > 0 ? (
                        <Link to={`/admin?q=${encodeURIComponent(localPhone(c.phone))}`} className="underline underline-offset-2 hover:text-rose-ink">
                          {c.requestCount}
                          <span className="sr-only"> · {s.customers.seeRequests(c.firstName)}</span>
                        </Link>
                      ) : (
                        c.requestCount
                      )}
                    </dd>
                  </div>
                  {c.lastRequestAt && (
                    <div className="flex gap-1">
                      <dt>{s.customers.lastRequest}:</dt>
                      <dd>{formatCairoDateTime(c.lastRequestAt, lang)}</dd>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <dt>{s.customers.joined}:</dt>
                    <dd>{formatCairoDateTime(c.createdAt, lang)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ResetCodeDialog target={resetFor} onClose={() => setResetFor(null)} />
    </div>
  )
}
