import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { useRequest } from '../../booking/RequestProvider'
import { branches, site } from '../../content/site'
import { goToSection } from '../../lib/scroll'
import { Link, navigate as routeTo, usePathname } from '../../lib/router'
import { useAuth } from '../../auth/AuthProvider'
import { AuthDialog } from '../../auth/AuthDialog'
import { Logo } from '../brand/Logo'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { afterDialogClose, Modal } from '../ui/Modal'

export const NAV_ITEMS = [
  { id: 'services', key: 'services' },
  { id: 'work', key: 'work' },
  { id: 'bridal', key: 'bridal' },
  { id: 'locations', key: 'locations' },
] as const

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { t, lang, toggleLang } = useI18n()
  const target = lang === 'en' ? 'ar' : 'en'
  return (
    <button
      type="button"
      onClick={toggleLang}
      lang={target}
      aria-label={t.common.languageToggleLabel}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-[0.95rem] text-charcoal transition-colors duration-200 hover:bg-blush-soft ${
        // The other language's label uses the system font, so English visitors don't download an Arabic webfont for one word.
        target === 'ar' ? 'font-[system-ui,sans-serif]' : 'font-sans'
      } ${className}`}
    >
      {t.common.languageToggle}
    </button>
  )
}

/** "Log in" when signed out; "My appointments" (customers) or "Staff dashboard" (staff) when signed in. */
function AccountEntry({ onLogIn, compact = false }: { onLogIn: () => void; compact?: boolean }) {
  const { t } = useI18n()
  const { status, user } = useAuth()
  if (status !== 'ready') return null
  const cls = compact
    ? 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-charcoal hover:bg-blush-soft'
    : 'inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-[0.95rem] text-charcoal transition-colors duration-200 hover:bg-blush-soft'
  if (!user) {
    return (
      <button type="button" onClick={onLogIn} className={cls} aria-label={compact ? t.nav.login : undefined} aria-haspopup="dialog">
        <Icon name="user" size={compact ? 22 : 18} />
        {!compact && t.nav.login}
      </button>
    )
  }
  const staff = user.role !== 'customer'
  const label = staff ? t.nav.dashboard : t.nav.account
  return (
    <Link to={staff ? '/admin' : '/account'} className={cls} aria-label={compact ? label : undefined}>
      <Icon name="user" size={compact ? 22 : 18} />
      {!compact && label}
    </Link>
  )
}

export function Header() {
  const { t, pick } = useI18n()
  const { open } = useRequest()
  const { status, user } = useAuth()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const menuHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navigate = (id: string) => {
    if (menuOpen) {
      setMenuOpen(false)
      afterDialogClose(() => goToSection(id))
    } else {
      goToSection(id)
    }
  }

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled ? 'border-b border-line bg-ivory/92 backdrop-blur-md' : 'border-b border-transparent bg-ivory'
      }`}
    >
      <a
        href="#main"
        className="absolute start-4 top-2 z-50 -translate-y-24 rounded-full bg-charcoal px-4 py-2 text-sm text-ivory focus:translate-y-0"
      >
        {t.common.skipToContent}
      </a>
      <div className="container-page flex h-[var(--header-h)] items-center justify-between gap-4">
        <a
          href="#top"
          aria-label={t.nav.home}
          className="-ms-1 flex shrink-0 items-center rounded-md p-1"
          onClick={(e) => {
            e.preventDefault()
            if (pathname === '/') window.scrollTo({ top: 0 })
            else routeTo('/')
          }}
        >
          <Logo className="h-9 w-auto sm:h-10" alt="" priority />
        </a>

        <nav aria-label={t.nav.label} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(item.id)
                  }}
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-[0.95rem] text-charcoal transition-colors duration-200 hover:bg-blush-soft"
                >
                  {t.nav[item.key]}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageToggle />
          <div className="hidden xl:block">
            <AccountEntry onLogIn={() => setAuthOpen(true)} />
          </div>
          <div className="xl:hidden">
            <AccountEntry compact onLogIn={() => setAuthOpen(true)} />
          </div>
          <div className="hidden md:block">
            <Button onClick={() => open()}>{t.cta.request}</Button>
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-charcoal hover:bg-blush-soft lg:hidden"
            aria-label={t.nav.openMenu}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" size={24} />
          </button>
        </div>
      </div>

      <Modal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        labelledBy="mobile-menu-title"
        initialFocus={menuHeading}
        className="sheet m-0 h-[100dvh] w-full bg-ivory p-0"
      >
        <div className="flex h-full flex-col">
          <div className="container-page flex h-[var(--header-h)] shrink-0 items-center justify-between">
            <Logo className="h-9 w-auto" alt="Lush" />
            <h2 id="mobile-menu-title" ref={menuHeading} tabIndex={-1} className="sr-only">
              {t.nav.menuTitle}
            </h2>
            <div className="flex items-center gap-1">
              <LanguageToggle />
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-blush-soft"
                aria-label={t.nav.closeMenu}
                onClick={() => setMenuOpen(false)}
              >
                <Icon name="close" size={24} />
              </button>
            </div>
          </div>
          <nav aria-label={t.nav.label} className="container-page flex-1 overflow-y-auto pb-8 pt-6">
            <ul className="border-t border-line">
              {NAV_ITEMS.map((item) => (
                <li key={item.id} className="border-b border-line">
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(item.id)
                    }}
                    className="display flex min-h-16 items-center justify-between py-3 text-[2.25rem]"
                  >
                    {t.nav[item.key]}
                    <Icon name="arrow" size={22} className="text-gold rtl:-scale-x-100" />
                  </a>
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              className="mt-8 w-full"
              onClick={() => {
                setMenuOpen(false)
                afterDialogClose(() => open())
              }}
            >
              {t.cta.request}
            </Button>
            {status === 'ready' && (
              <div className="mt-3">
                {user ? (
                  <Link
                    to={user.role === 'customer' ? '/account' : '/admin'}
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-charcoal/70 text-[0.95rem] font-medium"
                  >
                    <Icon name="user" size={18} />
                    {user.role === 'customer' ? t.nav.account : t.nav.dashboard}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      afterDialogClose(() => setAuthOpen(true))
                    }}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-charcoal/70 text-[0.95rem] font-medium"
                  >
                    <Icon name="user" size={18} />
                    {t.nav.login}
                  </button>
                )}
              </div>
            )}
            <ul className="mt-8 grid gap-1 text-sm">
              {branches.map((b) => (
                <li key={b.id}>
                  <a
                    href={`tel:${b.phoneE164}`}
                    className="flex min-h-11 items-center justify-between gap-4 text-taupe-ink hover:text-charcoal"
                  >
                    <span>{t.locations.callBranch(pick(b.name))}</span>
                    <bdi dir="ltr" className="tabular text-charcoal">
                      {b.phoneDisplay}
                    </bdi>
                  </a>
                </li>
              ))}
            </ul>
            <a
              href={site.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm text-charcoal"
            >
              <Icon name="instagram" />@{site.instagram.handle}
              <span className="sr-only">{t.common.opensInNewTab}</span>
            </a>
          </nav>
        </div>
      </Modal>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  )
}
