import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { useRequest } from '../../booking/RequestProvider'
import { categories, type Modifier, type Service } from '../../content/services'
import { site } from '../../content/site'
import { useAnnounce } from '../../lib/announce'
import { useMenuTab } from '../../lib/menuTab'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

function useModifierText() {
  const { t, amount, pick } = useI18n()
  return (m: Modifier) => {
    switch (m.kind) {
      case 'withoutColour':
        return t.menu.withoutColour
      case 'withColour':
        return t.menu.withColour
      case 'addForColour':
        return t.menu.addForColour(amount(m.amount))
      case 'note':
        return pick(m.text)
    }
  }
}

function ServiceRow({ service, showDuration, index }: { service: Service; showDuration: boolean; index: number }) {
  const { t, pick, price } = useI18n()
  const { draft, toggleService } = useRequest()
  const announce = useAnnounce()
  const modifierText = useModifierText()
  const selected = draft.serviceIds.includes(service.id)
  const name = pick(service.name)
  const includes = service.includes ? pick(service.includes) : null

  return (
    <li className="row-in" style={{ '--i': index } as CSSProperties}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => {
          const added = toggleService(service.id)
          announce(added ? t.menu.added(name) : t.menu.removed(name))
        }}
        className={`group relative isolate grid w-full grid-cols-[1fr_auto] items-start gap-x-3 rounded-xl px-3 py-3 text-start transition-colors duration-200 sm:gap-x-4 sm:px-4 ${
          selected ? '' : 'hover:bg-blush-soft/60'
        }`}
      >
        <span aria-hidden="true" data-on={selected} className="paint-fill absolute inset-0 -z-10 bg-blush-soft" />
        <span className="min-w-0">
          <span className="flex items-end gap-3">
            <span className="min-w-0 text-[1.02rem] leading-snug text-charcoal">{name}</span>
            <span className="leader" aria-hidden="true" />
            {showDuration && service.durationMin && (
              <span className="tabular shrink-0 text-sm text-taupe-ink">{t.common.minutes(service.durationMin)}</span>
            )}
            <span className="tabular shrink-0 whitespace-nowrap text-[1.02rem] font-medium text-charcoal">
              {price(service.price)}
            </span>
          </span>
          {service.modifiers && (
            <span className="mt-0.5 block text-sm italic text-taupe-ink">
              {service.modifiers.map(modifierText).join(' · ')}
            </span>
          )}
          {includes && (
            <span className="mt-1.5 block text-sm leading-relaxed text-taupe-ink">
              <span className="sr-only">{t.menu.includes}: </span>
              {includes.join(' · ')}
            </span>
          )}
        </span>
        <span
          key={selected ? 'on' : 'off'}
          aria-hidden="true"
          className={`${selected ? 'check-pop ' : ''}mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors duration-200 ${
            selected
              ? 'border-charcoal bg-charcoal text-ivory'
              : 'border-line-strong text-taupe group-hover:border-charcoal group-hover:text-charcoal'
          }`}
        >
          <Icon name={selected ? 'check' : 'plus'} size={16} />
        </span>
      </button>
    </li>
  )
}

export function ServiceMenu() {
  const { t, pick, dir } = useI18n()
  const { active, setActive } = useMenuTab()
  const { draft, open } = useRequest()
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const category = categories.find((c) => c.id === active) ?? categories[0]
  const count = draft.serviceIds.length
  const tabList = useRef<HTMLDivElement>(null)
  const [moreTabs, setMoreTabs] = useState(false)
  const updateFade = useCallback(() => {
    const el = tabList.current
    // scrollLeft is negative in right-to-left layouts, so compare distances.
    if (el) setMoreTabs(el.scrollWidth - el.clientWidth - Math.abs(el.scrollLeft) > 4)
  }, [])
  useEffect(() => {
    updateFade()
    // Tab widths settle once the web fonts arrive.
    void document.fonts?.ready.then(updateFade)
    window.addEventListener('resize', updateFade)
    return () => window.removeEventListener('resize', updateFade)
  }, [updateFade, dir])

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    let next = -1
    if (e.key === forward) next = (index + 1) % categories.length
    else if (e.key === backward) next = (index - 1 + categories.length) % categories.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = categories.length - 1
    if (next === -1) return
    e.preventDefault()
    const id = categories[next].id
    setActive(id)
    tabRefs.current[id]?.focus()
  }

  return (
    <section id="services" aria-labelledby="services-title" className="scroll-mt-4 py-20 sm:py-24 lg:py-32">
      <div className="container-page">
        <div className="reveal grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="eyebrow">{t.menu.eyebrow}</p>
            <h2 id="services-title" className="display mt-4 text-[clamp(2.75rem,6vw,4.75rem)]">
              {t.menu.title}
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-taupe-ink">{t.menu.lede}</p>
            <a
              href={site.priceListUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-charcoal"
            >
              {t.menu.priceList}
              <Icon name="external" size={16} />
              <span className="sr-only">{t.common.opensInNewTab}</span>
            </a>
          </div>
        </div>

        <div
          role="tablist"
          aria-label={t.menu.tabsLabel}
          ref={tabList}
          onScroll={updateFade}
          // On phones the tabs scroll sideways; while more tabs are hidden past the edge, that edge fades.
          className={`no-scrollbar sticky top-[var(--header-h)] z-20 -mx-4 mt-10 flex gap-1 overflow-x-auto border-b border-line bg-ivory/95 px-4 backdrop-blur-md sm:mx-0 sm:px-0 ${
            moreTabs ? 'fade-end' : ''
          }`}
        >
          {categories.map((c, i) => {
            const selected = c.id === category.id
            return (
              <button
                key={c.id}
                ref={(el) => {
                  tabRefs.current[c.id] = el
                }}
                id={`tab-${c.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="menu-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(c.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`relative min-h-12 shrink-0 px-4 pb-3 pt-2 text-[1.02rem] transition-colors duration-200 after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-gold after:transition-transform after:duration-300 after:ease-[var(--ease-out-soft)] ${
                  selected ? 'font-medium text-charcoal after:scale-x-100' : 'text-taupe-ink after:scale-x-0 hover:text-charcoal hover:after:scale-x-50'
                }`}
              >
                {pick(c.title)}
              </button>
            )
          })}
        </div>

        <div
          id="menu-panel"
          role="tabpanel"
          aria-labelledby={`tab-${category.id}`}
          tabIndex={0}
          className="mt-8 rounded-sm focus-visible:outline-offset-8"
        >
          {/* Sections flow into balanced columns, like a printed menu; a section never splits. */}
          <div key={category.id} className={category.sections.length > 1 ? 'lg:columns-2 lg:gap-16' : 'max-w-3xl'}>
            {category.sections.map((section) => (
              <div key={section.id} className="mb-12 min-w-0 break-inside-avoid last:mb-0">
                <div className="flex items-baseline justify-between gap-4 border-b border-line px-3 pb-3 sm:px-4">
                  <h3 className="display text-[1.9rem] italic leading-tight">
                    {pick(section.title)}
                    {section.note && (
                      <span className="ms-3 font-sans text-sm not-italic tracking-normal text-taupe-ink">
                        {pick(section.note)}
                      </span>
                    )}
                  </h3>
                  {section.showsDuration && (
                    <span className="eyebrow shrink-0 !text-[0.7rem]" aria-hidden="true">
                      {t.menu.duration}
                    </span>
                  )}
                </div>
                <ul className="mt-2 grid gap-0.5">
                  {section.services.map((s, i) => (
                    <ServiceRow key={s.id} service={s} showDuration={Boolean(section.showsDuration)} index={i} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-taupe-ink">{t.menu.confirmNote}</p>
          {count > 0 && (
            <div className="flex items-center gap-4">
              <span key={count} className="bump text-sm text-charcoal" aria-live="off">
                {t.cta.selectedCount(count)}
              </span>
              <div className="hidden md:block">
                <Button onClick={() => open()}>{t.cta.continueRequest}</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
