import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { api, ApiError } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useAdminStrings } from './strings'

/** Confirms, then shows a one-time password reset code for staff to pass on. */
export function ResetCodeDialog({ target, onClose }: { target: { id: number; firstName: string } | null; onClose: () => void }) {
  const { lang } = useI18n()
  const s = useAdminStrings()
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const firstButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setCode(null)
    setError(null)
  }, [target])

  const create = async () => {
    if (!target) return
    setBusy(true)
    try {
      setCode(await api<{ code: string; expiresAt: string }>(`/admin/users/${target.id}/reset-code`, { method: 'POST' }))
    } catch (e) {
      setError(s.errors[e instanceof ApiError ? e.code : 'not_found'] ?? s.loadError)
    } finally {
      setBusy(false)
    }
  }

  const expires = code
    ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit', hour12: true }).format(
        new Date(code.expiresAt),
      )
    : ''

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      labelledBy="reset-title"
      initialFocus={firstButton}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[1.25rem] bg-ivory p-0"
    >
      {target && (
        <div className="grid gap-4 p-6">
          <h2 id="reset-title" className="display text-[1.75rem] leading-tight">
            {code ? s.reset.title : s.reset.confirmTitle(target.firstName)}
          </h2>
          {!code ? (
            <>
              <p className="text-sm text-taupe-ink">{s.reset.confirmBody}</p>
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <Button ref={firstButton} onClick={() => void create()} disabled={busy} aria-busy={busy}>
                  {s.reset.create}
                </Button>
                <Button variant="quiet" onClick={onClose}>
                  {s.reset.cancel}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-charcoal/85">{s.reset.body(target.firstName)}</p>
              <p dir="ltr" className="tabular select-all rounded-xl bg-paper py-4 text-center font-mono text-3xl tracking-[0.2em]" aria-live="polite">
                {code.code}
              </p>
              <p className="text-center text-sm text-taupe-ink">{s.reset.expires(expires)}</p>
              <Button onClick={onClose}>{s.reset.done}</Button>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
