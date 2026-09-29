import { useEffect } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { useAuth } from '../auth/AuthProvider'
import { AuthPanel } from '../auth/AuthPanel'
import { getBranch, type BranchId } from '../content/site'
import { Link, navigate, usePathname } from '../lib/router'
import { Logo } from '../components/brand/Logo'
import { LanguageToggle } from '../components/sections/Header'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { useAdminStrings } from './strings'
import { RequestsView } from './RequestsView'
import { CustomersView } from './CustomersView'
import { StaffView } from './StaffView'

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="min-h-screen bg-ivory">
      <a
        href="#admin-main"
        className="absolute start-4 top-2 z-50 -translate-y-24 rounded-full bg-charcoal px-4 py-2 text-sm text-ivory focus:translate-y-0"
      >
        {t.common.skipToContent}
      </a>
      {children}
    </div>
  )
}

export default function AdminApp() {
  const { pick } = useI18n()
  const { status, user, logOut } = useAuth()
  const s = useAdminStrings()
  const path = usePathname()

  useEffect(() => {
    document.title = `${s.title} · Lush`
    const robots = document.querySelector('meta[name="robots"]')
    robots?.setAttribute('content', 'noindex, nofollow')
  }, [s])

  // Addresses a staff member can't use (another admin's page, a typo) fall back to requests.
  const known = path === '/admin' || path === '/admin/' || path.startsWith('/admin/customers') || (path.startsWith('/admin/staff') && user?.role === 'admin')
  useEffect(() => {
    if (user && user.role !== 'customer' && !known) navigate('/admin', { replace: true })
  }, [user, known])

  if (status === 'loading') {
    return (
      <Shell>
        <p className="p-10 text-center text-taupe-ink" role="status">
          {s.loading}
        </p>
      </Shell>
    )
  }

  if (status === 'offline') {
    return (
      <Shell>
        <p className="mx-auto mt-20 max-w-md rounded-2xl bg-blush-soft p-6" role="alert">
          {s.offline}
        </p>
      </Shell>
    )
  }

  if (!user || user.role === 'customer') {
    return (
      <Shell>
        <main id="admin-main" className="grid min-h-screen place-items-center px-4 py-10">
          <div className="w-full max-w-md rounded-[1.5rem] border border-line bg-paper p-6 shadow-[0_24px_60px_-40px_rgb(125_74_63/0.5)] sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <Logo className="h-9 w-auto" alt="Lush" />
              <LanguageToggle />
            </div>
            {user ? (
              <div className="grid gap-4">
                <h1 className="display text-[2rem] leading-tight">{s.notStaffTitle}</h1>
                <p className="text-taupe-ink">{s.notStaffBody}</p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => void logOut()}>{s.logOut}</Button>
                  <Link to="/" className="inline-flex min-h-12 items-center px-2 text-sm underline underline-offset-4">
                    {s.viewSite}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <AuthPanel initialMode="login" allowSignup={false} headingLevel="h1" loginCopy={{ title: s.loginTitle, help: s.loginHelp }} />
              </>
            )}
          </div>
        </main>
      </Shell>
    )
  }

  const scopeBranch = user.role === 'admin' ? null : getBranch(user.branchId as BranchId)
  const tabs = [
    { to: '/admin', label: s.tabs.requests, match: path === '/admin' || path === '/admin/' },
    { to: '/admin/customers', label: s.tabs.customers, match: path.startsWith('/admin/customers') },
    ...(user.role === 'admin' ? [{ to: '/admin/staff', label: s.tabs.staff, match: path.startsWith('/admin/staff') }] : []),
  ]
  const view = path.startsWith('/admin/customers') ? 'customers' : path.startsWith('/admin/staff') && user.role === 'admin' ? 'staff' : 'requests'

  return (
    <Shell>
      <header className="sticky top-0 z-30 border-b border-line bg-ivory/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-4">
            <Link to="/admin" aria-label={s.title} className="rounded-md">
              <Logo className="h-8 w-auto" alt="" />
            </Link>
            <div className="border-s border-line ps-4 leading-tight">
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-taupe-ink">{scopeBranch ? s.branchScope(pick(scopeBranch.name)) : s.allBranches}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <LanguageToggle />
            <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 hover:bg-blush-soft">
              <Icon name="external" size={16} />
              <span className="hidden sm:inline">{s.viewSite}</span>
              <span className="sr-only sm:hidden">{s.viewSite}</span>
            </Link>
            <span className="hidden px-2 text-taupe-ink md:inline">{s.signedIn(user.firstName)}</span>
            <button
              type="button"
              onClick={() => void logOut()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 hover:bg-blush-soft"
            >
              <Icon name="logout" size={16} className="rtl:-scale-x-100" />
              <span className="hidden sm:inline">{s.logOut}</span>
              <span className="sr-only sm:hidden">{s.logOut}</span>
            </button>
          </div>
        </div>
        <nav aria-label={s.title} className="mx-auto max-w-[90rem] px-4 sm:px-8">
          <ul className="-mb-px flex gap-1">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  aria-current={tab.match ? 'page' : undefined}
                  className={`relative inline-flex min-h-11 items-center px-3 text-[0.95rem] transition-colors duration-200 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full ${
                    tab.match ? 'font-medium text-charcoal after:bg-gold' : 'text-taupe-ink hover:text-charcoal'
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="admin-main" tabIndex={-1} className="mx-auto max-w-[90rem] px-4 pb-20 pt-6 focus:outline-none sm:px-8">
        {view === 'requests' && <RequestsView user={user} />}
        {view === 'customers' && <CustomersView />}
        {view === 'staff' && <StaffView user={user} />}
      </main>
    </Shell>
  )
}
