import { useI18n } from '../../i18n/I18nProvider'
import { Icon } from '../ui/Icon'

export function Faq() {
  const { t } = useI18n()
  return (
    <section aria-labelledby="faq-title" className="border-t border-line bg-paper py-20 sm:py-24 lg:py-32">
      <div className="container-page grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="eyebrow">{t.faq.eyebrow}</p>
          <h2 id="faq-title" className="display mt-4 text-[clamp(2.5rem,5vw,4rem)]">
            {t.faq.title}
          </h2>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          {t.faq.items.map((item) => (
            <details key={item.q} className="group border-b border-line first:border-t">
              <summary className="flex min-h-16 list-none items-center justify-between gap-6 py-4 text-start text-lg text-charcoal [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <Icon
                  name="chevronDown"
                  className="shrink-0 text-gold transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="max-w-[40rem] pb-6 leading-relaxed text-taupe-ink">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
