import { useEffect } from 'react'

/**
 * Adds `is-visible` to `.reveal` elements the first time they scroll into view, which plays their
 * entrance (see index.css). New elements (a menu tab, a new page) are picked up automatically.
 * With reduced motion, or without IntersectionObserver, everything is simply shown.
 */
export function useRevealOnScroll() {
  useEffect(() => {
    const showAll = () => document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => el.classList.add('is-visible'))
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches || !('IntersectionObserver' in window)) {
      showAll()
      const mo = new MutationObserver(showAll)
      mo.observe(document.body, { childList: true, subtree: true })
      return () => mo.disconnect()
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-visible')
          io.unobserve(entry.target)
        }
      },
      // Fires once the element's top passes the lower tenth of the screen; works for very tall sections too.
      { rootMargin: '0px 0px -10% 0px', threshold: 0 },
    )
    const scan = () => document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => io.observe(el))
    scan()
    let frame = 0
    const mo = new MutationObserver(() => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(scan)
    })
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mo.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [])
}
