import { navigate } from './router'

/** Scroll to a section and move focus to its heading, so keyboard and screen reader users land there too. */
export function goToSection(id: string) {
  // Sections live on the home page; from another page, go home first, then scroll once it has rendered.
  if (window.location.pathname !== '/') {
    navigate('/', { keepScroll: true })
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => goToSection(id)))
    return
  }
  const section = document.getElementById(id)
  if (!section) return
  section.scrollIntoView({ block: 'start' })
  const heading = section.querySelector<HTMLElement>('h1, h2')
  if (heading) {
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }
  const url = new URL(window.location.href)
  url.hash = id
  window.history.replaceState(window.history.state, '', url)
}
