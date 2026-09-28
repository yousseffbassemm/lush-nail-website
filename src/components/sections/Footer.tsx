import { useI18n } from '../../i18n/I18nProvider'
import { branches, site } from '../../content/site'
import { goToSection } from '../../lib/scroll'
import { Logo } from '../brand/Logo'
import { Icon } from '../ui/Icon'
import { NAV_ITEMS } from './Header'

export function Footer() {
  const { t, pick, lang, setLang } = useI18n()

  return (
    <footer className="bg-charcoal text-ivory/85">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12 lg:py-16">
        <div className="lg:col-span-4">
          <Logo className="h-12 w-auto" alt="Lush Nail Salon & Spa" />
          <p className="mt-4 text-sm tracking-[0.14em] text-gold-soft rtl:tracking-normal">{t.common.tagline}</p>
          <p className="mt-1 text-sm text-ivory/70">{t.common.selfCare}</p>
        </div>

        <nav aria-labelledby="footer-explore" className="lg:col-span-2">
          <h2 id="footer-explore" className="text-xs uppercase tracking-[0.16em] text-ivory/60 rtl:tracking-normal">
            {t.footer.explore}
          </h2>
          <ul className="mt-3 grid">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    goToSection(item.id)
                  }}
                  className="inline-flex min-h-10 items-center text-ivory/85 hover:text-ivory"
                >
                  {t.nav[item.key]}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-4">
          <h2 className="text-xs uppercase tracking-[0.16em] text-ivory/60 rtl:tracking-normal">{t.footer.branches}</h2>
          <ul className="mt-3 grid gap-4">
            {branches.map((b) => (
              <li key={b.id} className="text-sm leading-relaxed">
                <p className="text-base text-ivory">{pick(b.name)}</p>
                <p className="text-ivory/70">{pick(b.addressLines).join(lang === 'ar' ? '، ' : ', ')}</p>
                <div className="mt-1 flex flex-wrap gap-x-5">
                  <a href={`tel:${b.phoneE164}`} className="inline-flex min-h-10 items-center hover:text-ivory">
                    <bdi dir="ltr" className="tabular">
                      {b.phoneDisplay}
                    </bdi>
                  </a>
                  <a
                    href={b.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center gap-1 underline decoration-ivory/30 underline-offset-4 hover:decoration-ivory"
                  >
                    {t.locations.directions}
                    <span className="sr-only">{t.common.opensInNewTab}</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-xs uppercase tracking-[0.16em] text-ivory/60 rtl:tracking-normal">{t.footer.follow}</h2>
          <a
            href={site.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-10 items-center gap-2 hover:text-ivory"
          >
            <Icon name="instagram" size={18} />
            <bdi dir="ltr">@{site.instagram.handle}</bdi>
            <span className="sr-only">{t.common.opensInNewTab}</span>
          </a>
          <h2 className="mt-6 text-xs uppercase tracking-[0.16em] text-ivory/60 rtl:tracking-normal">{t.footer.language}</h2>
          <div className="mt-2 flex gap-2" role="group" aria-label={t.footer.language}>
            <button
              type="button"
              lang="en"
              aria-pressed={lang === 'en'}
              onClick={() => setLang('en')}
              className={`min-h-10 rounded-full px-4 text-sm ${lang === 'en' ? 'bg-ivory text-charcoal' : 'border border-ivory/30 hover:border-ivory'}`}
            >
              English
            </button>
            <button
              type="button"
              lang="ar"
              aria-pressed={lang === 'ar'}
              onClick={() => setLang('ar')}
              className={`min-h-10 rounded-full px-4 text-sm ${lang === 'ar' ? '' : 'font-[system-ui,sans-serif]'} ${lang === 'ar' ? 'bg-ivory text-charcoal' : 'border border-ivory/30 hover:border-ivory'}`}
            >
              عربي
            </button>
          </div>
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ivory/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {t.common.businessName}. {t.footer.note}
          </p>
          <a
            href={site.priceListUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 underline decoration-ivory/30 underline-offset-4 hover:text-ivory"
          >
            {t.footer.priceList}
            <Icon name="external" size={14} />
            <span className="sr-only">{t.common.opensInNewTab}</span>
          </a>
        </div>
      </div>
    </footer>
  )
}
