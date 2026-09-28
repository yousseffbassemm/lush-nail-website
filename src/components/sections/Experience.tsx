import type { CSSProperties } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { categories, findService, type CategoryId } from '../../content/services'
import { serviceLabel } from '../../booking/message'
import { useMenuTab } from '../../lib/menuTab'
import { Icon } from '../ui/Icon'

/** Each starting point shows two real menu items so the copy stays tied to the price list. */
const ENTRIES: { key: 'hands' | 'skin' | 'spa'; category: CategoryId; anchors: string[] }[] = [
  { key: 'hands', category: 'nails', anchors: ['basic-manicure', 'gel-x'] },
  { key: 'skin', category: 'skin', anchors: ['dermaplaning', 'basic-facial'] },
  { key: 'spa', category: 'spa', anchors: ['moroccan-bath-jacuzzi', 'head-spa'] },
]

export function Experience() {
  const { t, pick, price, lang } = useI18n()
  const { showCategory } = useMenuTab()

  return (
    <section aria-labelledby="experience-title" className="py-20 sm:py-24 lg:py-32">
      <div className="container-page grid gap-12 lg:grid-cols-12">
        <div className="reveal lg:sticky lg:top-[calc(var(--header-h)+3rem)] lg:col-span-5 lg:self-start">
          <p className="eyebrow">{t.experience.eyebrow}</p>
          <h2 id="experience-title" className="display mt-4 text-[clamp(2.5rem,5vw,4rem)]">
            {t.experience.title}
          </h2>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-taupe-ink">{t.experience.body}</p>
        </div>

        <ul className="lg:col-span-6 lg:col-start-7">
          {ENTRIES.map((entry, index) => {
            const category = categories.find((c) => c.id === entry.category)!
            const copy = t.experience[entry.key]
            return (
              <li key={entry.key} className="reveal border-t border-line py-8 first:border-t-0 first:pt-0 lg:first:pt-2" style={{ '--i': index } as CSSProperties}>
                <h3 className="display text-[2rem] italic">{copy.title}</h3>
                <p className="mt-2 text-taupe-ink">{copy.body}</p>
                <ul className="mt-4 grid max-w-[26rem] gap-1.5 text-[0.95rem]">
                  {entry.anchors.map((id) => {
                    const service = findService(id)?.service
                    if (!service) return null
                    return (
                      <li key={id} className="flex items-end gap-3">
                        <span>{serviceLabel(service, lang)}</span>
                        <span className="leader" aria-hidden="true" />
                        <span className="tabular whitespace-nowrap font-medium">{price(service.price)}</span>
                      </li>
                    )
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => showCategory(entry.category)}
                  className="link-underline mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium"
                >
                  {t.experience.see(pick(category.title))}
                  <Icon name="arrow" size={16} className="rtl:-scale-x-100" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
