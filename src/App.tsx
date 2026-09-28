import { I18nProvider } from './i18n/I18nProvider'
import { RequestProvider } from './booking/RequestProvider'
import { AnnounceProvider } from './lib/announce'
import { MenuTabProvider } from './lib/menuTab'
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

export function App() {
  return (
    <I18nProvider>
      <AnnounceProvider>
        <RequestProvider>
          <MenuTabProvider>
            <Header />
            <main id="main" tabIndex={-1} className="focus:outline-none">
              <Hero />
              <ServiceMenu />
              <Gallery />
              <Experience />
              <Bridal />
              <Locations />
              <Faq />
            </main>
            <Footer />
            <MobileBar />
            <RequestDialog />
          </MenuTabProvider>
        </RequestProvider>
      </AnnounceProvider>
    </I18nProvider>
  )
}
