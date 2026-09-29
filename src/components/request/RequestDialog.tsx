import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { useRequest } from '../../booking/RequestProvider'
import { validateStep } from '../../booking/validation'
import { STEPS, type FieldErrors, type RequestDraft } from '../../booking/types'
import { getBranch } from '../../content/site'
import { findLook } from '../../content/looks'
import { useAnnounce } from '../../lib/announce'
import { LanguageToggle } from '../sections/Header'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { StepBranch } from './StepBranch'
import { StepServices } from './StepServices'
import { StepWhen } from './StepWhen'
import { StepDetails } from './StepDetails'
import { StepReview, type Outcome } from './StepReview'

/** Field that receives focus when a step fails validation, in on-screen order. */
const FIELD_ORDER: (keyof RequestDraft | 'account')[] = ['branchId', 'serviceIds', 'date', 'time', 'eventDate', 'groupSize', 'account', 'firstName', 'phone']

export function RequestDialog() {
  const { t, lang, pick } = useI18n()
  const { draft, contact, update, isOpen, close, step, setStep, reset } = useRequest()
  const announce = useAnnounce()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)
  const previousStep = useRef(step)
  const direction = step >= previousStep.current ? 'forward' : 'back'
  useEffect(() => {
    previousStep.current = step
  }, [step])
  const stepId = STEPS[step]
  const titles = [
    t.request.branch.title,
    t.request.services.title,
    t.request.when.title,
    t.request.details.title,
    t.request.review.title,
  ]

  // Fresh messages each time the flow opens; the visitor's answers stay.
  useEffect(() => {
    if (isOpen) {
      setErrors({})
      setOutcome(null)
    }
  }, [isOpen])

  // Move focus to the new step's heading so screen readers announce where they are.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!isOpen) return
    bodyRef.current?.scrollTo({ top: 0 })
    headingRef.current?.focus({ preventScroll: true })
  }, [step, isOpen])

  // Re-word any visible errors when the language changes (and only then, so typing never re-flags a field).
  const latest = useRef({ stepId, draft, t, contact })
  latest.current = { stepId, draft, t, contact }
  useEffect(() => {
    const { stepId: id, draft: d, t: strings, contact: c } = latest.current
    setErrors((current) => (Object.keys(current).length ? validateStep(id, d, strings, c) : current))
  }, [lang])

  // Signing in on the details step clears the "log in to continue" message.
  useEffect(() => {
    if (contact.signedIn) setErrors((current) => (current.account ? {} : current))
  }, [contact.signedIn])

  const set = useCallback(
    <K extends keyof RequestDraft>(field: K, value: RequestDraft[K]) => {
      update({ [field]: value } as Partial<RequestDraft>)
      setErrors((current) => {
        if (!(field in current)) {
          // Picking a service or "help me choose" clears the services error too.
          if ((field === 'helpMeChoose' || field === 'lookRef') && current.serviceIds) {
            const next = { ...current }
            delete next.serviceIds
            return next
          }
          return current
        }
        const next = { ...current }
        delete next[field]
        if (field === 'flexibleTime') delete next.time
        return next
      })
    },
    [update],
  )

  const goNext = () => {
    const found = validateStep(stepId, draft, t, contact)
    const keys = Object.keys(found) as (keyof RequestDraft | 'account')[]
    if (keys.length > 0) {
      setErrors(found)
      announce(t.request.errors.summary(keys.length))
      const first = FIELD_ORDER.find((f) => keys.includes(f))
      if (first) window.requestAnimationFrame(() => document.getElementById(`req-${first}`)?.focus())
      return
    }
    setErrors({})
    setStep(Math.min(step + 1, STEPS.length - 1))
  }

  const goBack = () => {
    setErrors({})
    setOutcome(null)
    setStep(Math.max(step - 1, 0))
  }

  const goToStep = (index: number) => {
    setErrors({})
    setOutcome(null)
    setStep(index)
  }

  // A sent request is finished: closing clears it so the next visit starts fresh.
  const finish = () => {
    if (outcome?.kind === 'received') {
      reset()
      setOutcome(null)
    }
    close()
  }

  // Enter in a text field moves to the next step (sign-in forms inside the step handle their own Enter).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (e.key !== 'Enter' || stepId === 'review' || target.closest('form')) return
    if (target instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit'].includes(target.type)) {
      e.preventDefault()
      goNext()
    }
  }

  const branch = getBranch(draft.branchId)
  const look = findLook(draft.lookRef)
  // Once there's an outcome (sent, copied…), it has its own heading; the review heading and chips step aside.
  const finished = stepId === 'review' && outcome !== null
  const showCarried = step > 0 && !finished && (branch || look || draft.bridal)

  return (
    <Modal
      open={isOpen}
      onClose={finish}
      labelledBy="request-title"
      describedBy={finished ? undefined : 'request-step-title'}
      initialFocus={headingRef}
      className="sheet m-0 h-[100dvh] w-full bg-ivory p-0 md:m-auto md:h-[min(50rem,calc(100dvh-4rem))] md:w-[min(42rem,calc(100vw-4rem))] md:rounded-[1.5rem]"
    >
      <div className="flex h-full flex-col" onKeyDown={onKeyDown}>
        <header className="shrink-0 border-b border-line px-5 pb-4 pt-3 sm:px-8 sm:pt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="request-title" className="eyebrow">
              {draft.bridal ? t.request.bridalTitle : t.request.title}
            </h2>
            <div className="-me-2 flex items-center">
              <LanguageToggle />
              <button
                type="button"
                onClick={finish}
                aria-label={t.request.closeRequest}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-blush-soft"
              >
                <Icon name="close" size={22} />
              </button>
            </div>
          </div>
          <ol className="mt-3 grid grid-cols-5 gap-1.5" aria-label={t.request.stepOf(step + 1, STEPS.length)}>
            {STEPS.map((s, i) => (
              <li key={s} aria-current={i === step ? 'step' : undefined}>
                <span className="block h-1 overflow-hidden rounded-full bg-line">
                  <span
                    className={`block h-full origin-left rounded-full bg-charcoal transition-transform duration-500 ease-[var(--ease-out-soft)] rtl:origin-right ${
                      i <= step ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </span>
                <span className={`mt-1.5 hidden text-xs sm:block ${i === step ? 'text-charcoal' : 'text-taupe-ink'}`}>
                  {t.request.steps[i]}
                </span>
                <span className="sr-only sm:hidden">{t.request.steps[i]}</span>
              </li>
            ))}
          </ol>
        </header>

        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8 sm:py-8">
          {!finished && (
            <>
              <p className="text-sm text-taupe-ink sm:hidden">{t.request.stepOf(step + 1, STEPS.length)}</p>
              <h3
                id="request-step-title"
                ref={headingRef}
                tabIndex={-1}
                className="display text-[2.1rem] leading-tight focus:outline-none sm:text-[2.5rem]"
              >
                {titles[step]}
              </h3>
            </>
          )}

          {showCarried && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-taupe-ink">{t.request.carried}:</span>
              {branch && step !== 0 && <span className="rounded-full bg-blush-soft px-3 py-1">{pick(branch.name)}</span>}
              {look && step !== 1 && (
                <span className="rounded-full bg-blush-soft px-3 py-1">
                  {pick(look.name)} <bdi className="tabular text-taupe-ink">({look.ref})</bdi>
                </span>
              )}
              {draft.bridal && (
                <span className="inline-flex items-center rounded-full bg-blush-soft ps-3">
                  {t.request.message.bridal}
                  <button
                    type="button"
                    onClick={() => set('bridal', false)}
                    aria-label={t.request.removeBridal}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-blush"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </span>
              )}
            </div>
          )}

          <div key={step} className={`${finished ? '' : 'mt-6 '}step-enter step-enter-${direction}`}>
            {stepId === 'branch' && <StepBranch draft={draft} set={set} errors={errors} />}
            {stepId === 'services' && <StepServices draft={draft} set={set} errors={errors} />}
            {stepId === 'when' && <StepWhen draft={draft} set={set} errors={errors} />}
            {stepId === 'details' && <StepDetails draft={draft} set={set} errors={errors} />}
            {stepId === 'review' && (
              <StepReview
                draft={draft}
                goToStep={goToStep}
                outcome={outcome}
                setOutcome={setOutcome}
                onDone={finish}
                onNewRequest={() => {
                  reset()
                  setOutcome(null)
                }}
              />
            )}
          </div>
        </div>

        {!(stepId === 'review' && outcome) && (
          <footer
            className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-ivory px-5 pt-3 sm:px-8 sm:pb-5 sm:pt-4"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            {step > 0 ? (
              <Button variant="quiet" onClick={goBack} className="-ms-3">
                <Icon name="chevronStart" size={18} className="rtl:-scale-x-100" />
                {t.common.back}
              </Button>
            ) : (
              <span />
            )}
            {stepId !== 'review' && !(stepId === 'details' && contact.mode === 'account' && !contact.signedIn) && (
              <Button size="md" className="min-w-36" onClick={goNext}>
                {t.common.continue}
                <Icon name="arrow" size={18} className="rtl:-scale-x-100" />
              </Button>
            )}
          </footer>
        )}
      </div>
    </Modal>
  )
}
