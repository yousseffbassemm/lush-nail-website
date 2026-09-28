import { useI18n } from '../../i18n/I18nProvider'
import { useRequest } from '../../booking/RequestProvider'
import { branches } from '../../content/site'
import { Button, LinkButton } from '../ui/Button'
import { Icon } from '../ui/Icon'

export function Locations() {
  const { t, pick } = useI18n()
  const { open } = useRequest()

  return (
    <section id="locations" aria-labelledby="locations-title" className="py-20 sm:py-24 lg:py-32">
      <div className="container-page">
        <p className="eyebrow">{t.locations.eyebrow}</p>
        <h2 id="locations-title" className="display mt-4 text-[clamp(2.75rem,6vw,4.75rem)]">
          {t.locations.title}
        </h2>

        <div className="mt-12 grid border-t border-line md:grid-cols-2">
          {branches.map((b, i) => {
            const name = pick(b.name)
            return (
              <article
                key={b.id}
                aria-labelledby={`branch-${b.id}`}
                className={`flex flex-col py-10 md:py-12 ${i === 0 ? 'md:pe-12 lg:pe-20' : 'border-t border-line md:border-t-0 md:border-s md:ps-12 lg:ps-20'}`}
              >
                <h3 id={`branch-${b.id}`} className="display text-[clamp(2.5rem,5vw,3.75rem)]">
                  {name}
                </h3>
                <address className="mt-4 not-italic text-lg leading-relaxed text-taupe-ink">
                  {pick(b.addressLines).map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
                <p className="mt-4">
                  <span className="sr-only">{t.locations.phone}: </span>
                  <a
                    href={`tel:${b.phoneE164}`}
                    className="link-underline tabular inline-flex min-h-11 items-center gap-2 text-lg text-charcoal"
                    aria-label={`${t.locations.callBranch(name)}, ${b.phoneDisplay}`}
                  >
                    <Icon name="phone" size={18} className="text-gold" />
                    <bdi dir="ltr">{b.phoneDisplay}</bdi>
                  </a>
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button onClick={() => open({ branchId: b.id })} aria-label={t.locations.requestAt(name)}>
                    {t.locations.requestHere}
                  </Button>
                  <LinkButton
                    variant="secondary"
                    href={b.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t.locations.directions}: ${name} ${t.common.opensInNewTab}`}
                  >
                    <Icon name="pin" size={18} />
                    {t.locations.directions}
                  </LinkButton>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
