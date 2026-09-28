import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { getBranch, site } from '../../content/site'
import { findLook } from '../../content/looks'
import { findService } from '../../content/services'
import { composeMessage, serviceLabel, whatsappUrl } from '../../booking/message'
import { formatCairoDate, formatTime } from '../../booking/cairoTime'
import { normalizePhone } from '../../booking/validation'
import { appointmentProvider } from '../../booking/provider'
import type { RequestDraft } from '../../booking/types'
import { Button, LinkButton } from '../ui/Button'
import { Icon } from '../ui/Icon'

export type Outcome =
  | { kind: 'whatsapp' }
  | { kind: 'copied' }
  | { kind: 'copyFailed' }
  | { kind: 'received'; reference: string }
  | { kind: 'failed' }

async function copyToClipboard(text: string, fallback: HTMLTextAreaElement | null) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    if (!fallback) return false
    fallback.value = text
    fallback.select()
    try {
      return document.execCommand('copy')
    } catch {
      return false
    }
  }
}

function Row({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-line py-4 first:pt-0">
      <dt className="text-sm text-taupe-ink">{label}</dt>
      <dd className="col-start-1 mt-1 text-charcoal">{children}</dd>
      <dd className="col-start-2 row-span-2 row-start-1 self-start">
        <button
          type="button"
          onClick={onEdit}
          className="link-underline inline-flex min-h-11 items-center px-1 text-sm font-medium"
          aria-label={`${t.common.edit}: ${label}`}
        >
          {t.common.edit}
        </button>
      </dd>
    </div>
  )
}

interface Props {
  draft: RequestDraft
  goToStep: (index: number) => void
  outcome: Outcome | null
  setOutcome: (o: Outcome | null) => void
  onDone: () => void
  onNewRequest: () => void
}

export function StepReview({ draft, goToStep, outcome, setOutcome, onDone, onNewRequest }: Props) {
  const { t, lang, pick, price } = useI18n()
  const r = t.request.review
  const a = t.request.after
  const branch = getBranch(draft.branchId)
  const look = findLook(draft.lookRef)
  const message = composeMessage(draft, lang)
  const fallbackRef = useRef<HTMLTextAreaElement>(null)
  const outcomeRef = useRef<HTMLDivElement>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (outcome) outcomeRef.current?.focus()
  }, [outcome])

  if (!branch) return null
  const branchName = pick(branch.name)

  const copy = async () => {
    const ok = await copyToClipboard(message, fallbackRef.current)
    setOutcome(ok ? { kind: 'copied' } : { kind: 'copyFailed' })
  }

  const submit = async () => {
    if (!appointmentProvider) return
    setSubmitting(true)
    try {
      const result = await appointmentProvider.submit({ draft, lang, message, timeZone: 'Africa/Cairo' })
      setOutcome(result.status === 'received' ? { kind: 'received', reference: result.reference } : { kind: 'failed' })
    } catch {
      setOutcome({ kind: 'failed' })
    } finally {
      setSubmitting(false)
    }
  }

  if (outcome) {
    const content = {
      whatsapp: { title: a.whatsappTitle, body: a.whatsappBody },
      copied: { title: a.copyTitle, body: a.copyBody },
      copyFailed: { title: a.copyFailedTitle, body: a.copyFailedBody },
      received: { title: a.receivedTitle, body: outcome.kind === 'received' ? a.receivedBody(outcome.reference) : '' },
      failed: { title: a.failedTitle, body: a.failedBody },
    }[outcome.kind]
    return (
      <div ref={outcomeRef} tabIndex={-1} className="grid gap-5 focus:outline-none" role="status">
        <div className="rounded-2xl bg-blush-soft p-5 sm:p-6">
          <h3 className="display text-[1.9rem] leading-tight">{content.title}</h3>
          <p className="mt-2 text-charcoal/85">{content.body}</p>
          {outcome.kind !== 'received' && outcome.kind !== 'failed' && (
            <p className="mt-3 text-sm font-medium">{r.confirmNote}</p>
          )}
        </div>
        {outcome.kind === 'copyFailed' && (
          <textarea
            readOnly
            value={message}
            rows={10}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-xl border border-line-strong bg-paper p-4 text-sm leading-relaxed"
            aria-label={r.preview}
          />
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <LinkButton variant="secondary" href={`tel:${branch.phoneE164}`}>
            <Icon name="phone" size={18} />
            {r.call(branchName)}
          </LinkButton>
          {outcome.kind === 'failed' && (
            <Button variant="secondary" onClick={() => setOutcome(null)}>
              {t.common.back}
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row">
          <Button onClick={onDone}>{a.done}</Button>
          <Button variant="quiet" onClick={onNewRequest}>
            {a.newRequest}
          </Button>
        </div>
      </div>
    )
  }

  const services = draft.serviceIds.map((id) => findService(id)?.service).filter((s) => s !== undefined)

  return (
    <div className="grid gap-6">
      <div className="flex gap-3 rounded-2xl bg-blush-soft p-4 sm:p-5">
        <Icon name="calendar" size={22} className="mt-0.5 shrink-0 text-rose-ink" />
        <p>
          <strong className="block font-medium">{r.confirmNote}</strong>
          <span className="text-sm text-charcoal/80">{r.branchWillContact}</span>
        </p>
      </div>

      <dl>
        <Row label={r.branch} onEdit={() => goToStep(0)}>
          {branchName} <span className="text-taupe-ink">· {pick(branch.area)}</span>
        </Row>
        <Row label={r.services} onEdit={() => goToStep(1)}>
          <ul className="grid gap-1">
            {services.map((s) => (
              <li key={s.id} className="flex items-end gap-3">
                <span>{serviceLabel(s, lang)}</span>
                <span className="leader" aria-hidden="true" />
                <span className="tabular whitespace-nowrap text-sm">{price(s.price)}</span>
              </li>
            ))}
            {look && (
              <li>
                {t.request.services.look}: {pick(look.name)} <bdi className="tabular text-sm text-taupe-ink">({look.ref})</bdi>
              </li>
            )}
            {draft.helpMeChoose && <li>{r.helpMeChoose}</li>}
          </ul>
        </Row>
        <Row label={r.when} onEdit={() => goToStep(2)}>
          {formatCairoDate(draft.date, lang)}
          <span className="block text-taupe-ink">
            {draft.flexibleTime ? r.anyTime : `${formatTime(draft.time, lang)} · ${t.request.when.cairo}`}
          </span>
          {draft.bridal && draft.eventDate && (
            <span className="block text-sm text-taupe-ink">
              {r.eventDate}: {formatCairoDate(draft.eventDate, lang)}
            </span>
          )}
          {draft.bridal && draft.groupSize && (
            <span className="block text-sm text-taupe-ink">
              {r.groupSize}: <span className="tabular">{normalizePhone(draft.groupSize)}</span>
            </span>
          )}
        </Row>
        <Row label={r.details} onEdit={() => goToStep(3)}>
          <bdi>{draft.firstName.trim()}</bdi> ·{' '}
          <bdi dir="ltr" className="tabular">
            {normalizePhone(draft.phone)}
          </bdi>
          {draft.notes.trim() && (
            <span dir="auto" className="mt-1 block whitespace-pre-line text-start text-sm text-taupe-ink">
              {draft.notes.trim()}
            </span>
          )}
        </Row>
      </dl>

      <div>
        <h3 className="display text-[1.75rem] italic">{r.howToSend}</h3>
        {!branch.whatsapp && !appointmentProvider && <p className="mt-1 text-sm text-taupe-ink">{r.noWhatsapp}</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {appointmentProvider && (
            <Button size="lg" onClick={submit} disabled={submitting} aria-busy={submitting} className="sm:col-span-2">
              {submitting ? r.submitting : r.submit}
            </Button>
          )}
          {branch.whatsapp && (
            <div className="sm:col-span-2">
              <LinkButton
                size="lg"
                className="w-full"
                href={whatsappUrl(branch.whatsapp.e164, message)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOutcome({ kind: 'whatsapp' })}
              >
                <Icon name="whatsapp" />
                {r.whatsapp}
                <span className="sr-only">{t.common.opensInNewTab}</span>
              </LinkButton>
              <p className="mt-2 text-sm text-taupe-ink">{r.whatsappHelp}</p>
            </div>
          )}
          <Button size="lg" variant={branch.whatsapp || appointmentProvider ? 'secondary' : 'primary'} onClick={copy}>
            <Icon name="copy" size={18} />
            {r.copy}
          </Button>
          <LinkButton size="lg" variant="secondary" href={`tel:${branch.phoneE164}`}>
            <Icon name="phone" size={18} />
            {r.call(branchName)}
          </LinkButton>
          <LinkButton
            variant="quiet"
            className="sm:col-span-2"
            href={site.instagram.messageUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              // Copy first so the visitor can paste the request into the Instagram conversation.
              void copyToClipboard(message, fallbackRef.current).then((ok) =>
                setOutcome(ok ? { kind: 'copied' } : { kind: 'copyFailed' }),
              )
            }}
          >
            <Icon name="instagram" size={18} />
            {r.instagram}
            <span className="sr-only">{t.common.opensInNewTab}</span>
          </LinkButton>
        </div>
      </div>

      <details className="group rounded-2xl border border-line bg-paper">
        <summary className="flex min-h-12 list-none items-center justify-between px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
          {r.preview}
          <Icon name="chevronDown" size={18} className="transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <pre dir="auto" className="whitespace-pre-wrap border-t border-line px-4 py-4 font-sans text-sm leading-relaxed text-charcoal/85">
          {message}
        </pre>
      </details>

      {/* Off-screen but inside the dialog, so the copy fallback works while the page behind is inert. */}
      <textarea ref={fallbackRef} readOnly tabIndex={-1} aria-hidden="true" className="pointer-events-none fixed -start-[9999px] top-0 h-px w-px opacity-0" />
    </div>
  )
}
