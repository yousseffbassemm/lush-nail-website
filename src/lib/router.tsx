import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

/** A very small client-side router: /, /account and /admin. */
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') window.addEventListener('popstate', notify)

export function navigate(to: string, { replace = false, keepScroll = false } = {}) {
  const url = new URL(to, window.location.href)
  // Keep the visitor's language across pages.
  const lang = new URLSearchParams(window.location.search).get('lang')
  if (lang && !url.searchParams.has('lang')) url.searchParams.set('lang', lang)
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url)
  notify()
  if (!keepScroll && !url.hash) window.scrollTo({ top: 0 })
}

export function usePathname() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => window.location.pathname,
  )
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return (
    <a
      href={to}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e)
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        navigate(to)
      }}
      {...rest}
    />
  )
}
