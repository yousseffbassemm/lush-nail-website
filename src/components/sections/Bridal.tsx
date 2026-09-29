import type { CSSProperties } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { useRequest } from '../../booking/RequestProvider'
import { bridalOffer, categories } from '../../content/services'
import { LushField } from '../brand/LushField'
import { AlmondMark, FieldEdge } from '../brand/Marks'
import { Button } from '../ui/Button'

export function Bridal() {
  const { t, pick, price } = useI18n()
  const { open } = useRequest()
  const packages = categories.find((c) => c.id === 'bridal')!.sections.flatMap((s) => s.services)

  return (
    <section id="bridal" aria-labelledby="bridal-title" className="relative isolate overflow-hidden py-20 sm:py-24 lg:py-32">
      <LushField className="absolute inset-0 -z-10 h-full w-full" variant="d" soft />
      <FieldEdge side="top" className="text-ivory" />
      <FieldEdge side="bottom" className="text-ivory" />
      <div className="container-page">
        <div className="reveal mx-auto max-w-[44rem] text-center">
          <img src="/brand/lush-butterfly.svg" alt="" width={66} height={74} className="mx-auto h-12 w-auto" loading="lazy" />
          <p className="eyebrow mt-5 !text-charcoal">{t.bridal.eyebrow}</p>
          <h2 id="bridal-title" className="display mt-4 text-[clamp(2.75rem,6vw,4.75rem)]">
            {t.bridal.title}
          </h2>
          <p className="mt-5 text-lg text-charcoal/80">{t.bridal.lede}</p>
        </div>

        <ul className="mx-auto mt-12 grid max-w-[64rem] gap-5 md:grid-cols-2 lg:mt-16 lg:gap-8">
          {packages.map((pkg, index) => {
            const name = pick(pkg.name)
            return (
              <li
                key={pkg.id}
                style={{ '--i': index + 1 } as CSSProperties}
                className="reveal relative flex flex-col rounded-[1.5rem] bg-paper/95 p-7 shadow-[0_24px_60px_-36px_rgb(125_74_63/0.55)] sm:p-10"
              >
                {/* Inner gold hairline, like the frame of a printed menu card. */}
                <span className="pointer-events-none absolute inset-2.5 rounded-[1.1rem] border border-gold-soft/80" aria-hidden="true" />
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="display text-[2.25rem] sm:text-[2.6rem]">{name}</h3>
                  <p className="tabular shrink-0 text-xl font-medium text-gold-ink">{price(pkg.price)}</p>
                </div>
                <p className="eyebrow mt-6">{t.bridal.includes}</p>
                <ul className="mt-3 grid gap-2.5 text-[1rem]">
                  {pkg.includes &&
                    pick(pkg.includes).map((item) => (
                      <li key={item} className="flex gap-3">
                        <AlmondMark className="mt-[0.3em] h-[0.95em] w-auto shrink-0 text-gold" />
                        <span>{item}</span>
                      </li>
                    ))}
                </ul>
                <div className="mt-auto pt-8">
                  <Button
                    variant="secondary"
                    className="w-full whitespace-normal text-center"
                    onClick={() => open({ bridal: true, serviceIds: [pkg.id] })}
                  >
                    {t.bridal.enquirePackage(name)}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="reveal mx-auto mt-12 max-w-[40rem] text-center lg:mt-16">
          <h3 className="display text-[2rem] italic">{t.bridal.customTitle}</h3>
          <p className="mt-3 text-charcoal/85">
            {t.bridal.customBody(bridalOffer.moreThanServices, bridalOffer.brideDiscountPercent, bridalOffer.bridesmaidDiscountPercent)}
          </p>
          <p className="mt-2 text-sm text-charcoal/75">{t.bridal.customNote}</p>
          <Button size="lg" className="mt-7" onClick={() => open({ bridal: true })}>
            {t.bridal.enquire}
          </Button>
        </div>
      </div>
    </section>
  )
}
