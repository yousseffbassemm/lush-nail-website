import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { sessionStore } from '../lib/storage'
import { useI18n } from '../i18n/I18nProvider'
import { firstIncompleteStep } from './validation'
import { emptyDraft, STEPS, type RequestDraft, type RequestSeed } from './types'

interface RequestValue {
  draft: RequestDraft
  update: (patch: Partial<RequestDraft>) => void
  toggleService: (id: string) => boolean
  isOpen: boolean
  step: number
  setStep: (step: number) => void
  open: (seed?: RequestSeed) => void
  close: () => void
  reset: () => void
}

const RequestContext = createContext<RequestValue | null>(null)
const STORAGE_KEY = 'lush.request.v1'

function loadDraft(): RequestDraft {
  const raw = sessionStore.get(STORAGE_KEY)
  if (!raw) return emptyDraft
  try {
    const parsed = JSON.parse(raw) as Partial<RequestDraft>
    return { ...emptyDraft, ...parsed, serviceIds: Array.isArray(parsed.serviceIds) ? parsed.serviceIds : [] }
  } catch {
    return emptyDraft
  }
}

export function RequestProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<RequestDraft>(loadDraft)
  const [isOpen, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const draftRef = useRef(draft)
  draftRef.current = draft

  // Keep an unfinished request for the session, so a reload or language switch loses nothing.
  useEffect(() => {
    sessionStore.set(STORAGE_KEY, JSON.stringify(draft))
  }, [draft])

  const update = useCallback((patch: Partial<RequestDraft>) => setDraft((d) => ({ ...d, ...patch })), [])

  const toggleService = useCallback((id: string) => {
    const has = draftRef.current.serviceIds.includes(id)
    setDraft((d) => ({
      ...d,
      serviceIds: has ? d.serviceIds.filter((s) => s !== id) : [...d.serviceIds, id],
    }))
    return !has
  }, [])

  const open = useCallback(
    (seed: RequestSeed = {}) => {
      const current = draftRef.current
      const next: RequestDraft = {
        ...current,
        branchId: seed.branchId ?? current.branchId,
        serviceIds: seed.serviceIds
          ? [...current.serviceIds, ...seed.serviceIds.filter((id) => !current.serviceIds.includes(id))]
          : current.serviceIds,
        lookRef: seed.lookRef ?? current.lookRef,
        bridal: seed.bridal ?? current.bridal,
      }
      setDraft(next)
      // Start at the first step that still needs an answer; everything carried in stays visible there.
      setStep(Math.min(firstIncompleteStep(next, t), STEPS.length - 1))
      setOpen(true)
    },
    [t],
  )

  const close = useCallback(() => setOpen(false), [])

  const reset = useCallback(() => {
    setDraft(emptyDraft)
    setStep(0)
  }, [])

  const value = useMemo(
    () => ({ draft, update, toggleService, isOpen, step, setStep, open, close, reset }),
    [draft, update, toggleService, isOpen, step, open, close, reset],
  )

  return <RequestContext.Provider value={value}>{children}</RequestContext.Provider>
}

export function useRequest() {
  const ctx = useContext(RequestContext)
  if (!ctx) throw new Error('useRequest must be used inside RequestProvider')
  return ctx
}
