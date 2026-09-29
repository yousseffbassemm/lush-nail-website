import { lazy, Suspense, useEffect } from 'react'
import { I18nProvider, useI18n } from './i18n/I18nProvider'
import { AuthProvider } from './auth/AuthProvider'
import { RequestProvider } from './booking/RequestProvider'
import { AnnounceProvider } from './lib/announce'
import { MenuTabProvider } from './lib/menuTab'
import { usePathname } from './lib/router'
import { useRevealOnScroll } from './lib/reveal'
import { Header } from './components/sections/Header'
import { Hero } from './components/sections/Hero'
import { ServiceMenu } from './components/sections/ServiceMenu'
import { Gallery } from './components/sections/Gallery'
import { Experience } from './components/sections/Experience'
import { Bridal } from './components/sections/Bridal'
import { Locations } from './components/sections/Locations'
import { Faq } from './components/sections/Faq'
import { Footer } from './components/sections/Footer'
import { MobileBar } from './components/sections/MobileBar'
import { RequestDialog } from './components/request/RequestDialog'
import { AccountPage } from './pages/AccountPage'
import { NotFoundPage } from './pages/NotFoundPage'

// Staff code is only downloaded by people who open /admin.
const AdminApp = lazy(() => import('./admin/AdminApp'))

function HomePage() {
  const { t } = useI18n()
  useEffect(() => {
    document.title = t.meta.title
  }, [t])
  // A link to a section (/#bridal) opens there once the page has rendered.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return
    const frame = window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }))
    return () => window.cancelAnimationFrame(frame)
  }, [])
  return (
    <>
      <Hero />
      <ServiceMenu />
      <Gallery />
      <Experience />
      <Bridal />
      <Locations />
      <Faq />
    </>
  )
}

function Routes() {
  const path = usePathname().replace(/\/+$/, '') || '/'
  useRevealOnScroll()
  if (path === '/admin' || path.startsWith('/admin/')) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-ivory" aria-busy="true" />}>
        <AdminApp />
      </Suspense>
    )
  }
  return (
    <MenuTabProvider>
      <Header />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {path === '/' ? <HomePage /> : path === '/account' ? <AccountPage /> : <NotFoundPage />}
      </main>
      <Footer />
      <MobileBar />
      <RequestDialog />
    </MenuTabProvider>
  )
}

export function App() {
  return (
    <I18nProvider>
      <AnnounceProvider>
        <AuthProvider>
          <RequestProvider>
            <Routes />
          </RequestProvider>
        </AuthProvider>
      </AnnounceProvider>
    </I18nProvider>
  )
}
