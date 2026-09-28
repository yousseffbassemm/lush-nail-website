import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { strings, type Strings } from './strings'
import type { Lang, Localized } from './types'
import type { Price } from '../content/services'
import { storage } from '../lib/storage'

interface I18nValue {
  lang: Lang
  dir: 'ltr' | 'rtl'
  t: Strings
  setLang: (lang: Lang) => void
  toggleLang: () => void
  /** Pick the current language from a localized value. */
  pick: <T>(value: Localized<T>) => T
  amount: (n: number) => string
  price: (price: Price) => string
}

const I18nContext = createContext<I18nValue | null>(null)
const STORAGE_KEY = 'lush.lang'

function initialLang(): Lang {
  const fromUrl = new URLSearchParams(window.location.search).get('lang')
  if (fromUrl === 'ar' || fromUrl === 'en') return fromUrl
  const stored = storage.get(STORAGE_KEY)
  return stored === 'ar' ? 'ar' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const t = strings[lang]
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    const root = document.documentElement
    root.lang = lang === 'ar' ? 'ar-EG' : 'en'
    root.dir = dir
    document.title = t.meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.description)
    storage.set(STORAGE_KEY, lang)
    const url = new URL(window.location.href)
    if (lang === 'ar') url.searchParams.set('lang', 'ar')
    else url.searchParams.delete('lang')
    window.history.replaceState(window.history.state, '', url)
  }, [lang, dir, t])

  const setLang = useCallback((next: Lang) => setLangState(next), [])
  const toggleLang = useCallback(() => setLangState((l) => (l === 'en' ? 'ar' : 'en')), [])

  const value = useMemo<I18nValue>(() => {
    const amount = (n: number) => (lang === 'ar' ? `${n} ج.م` : `${n} LE`)
    return {
      lang,
      dir,
      t,
      setLang,
      toggleLang,
      pick: (v) => v[lang],
      amount,
      price: (p) =>
        p.kind === 'fixed'
          ? amount(p.amount)
          : lang === 'ar'
            ? `${p.min}–${p.max} ج.م ${t.menu.perNail}`
            : `${p.min}–${p.max} LE ${t.menu.perNail}`,
    }
  }, [lang, dir, t, setLang, toggleLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
