import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { useRequest } from '../../booking/RequestProvider'
import { looks, type Finish, type Look } from '../../content/looks'
import { findService } from '../../content/services'
import { site } from '../../content/site'
import { NailPlate, type PlateLayout } from '../art/NailArt'
import type { FieldTone } from '../brand/LushField'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { afterDialogClose, Modal } from '../ui/Modal'

const TONE: Record<Finish, FieldTone> = {
  nude: 'blush',
  french: 'peach',
  chrome: 'mist',
  cateye: 'rose',
  ombre: 'cream',
  art: 'blush',
  red: 'cream',
  gilded: 'peach',
  milky: 'mist',
}

const FIELD_VARIANT = ['a', 'b', 'c', 'd'] as const

const TILE_CLASS: Record<Look['size'], string> = {
  large: 'col-span-2 row-span-2',
  tall: 'row-span-2',
  wide: 'col-span-2',
  regular: '',
}

const TILE_LAYOUT: Record<Look['size'], PlateLayout> = {
  large: 'portrait',
  tall: 'tall',
  wide: 'landscape',
  regular: 'portrait',
}

function LookImage({ look, layout, index, className, label }: { look: Look; layout: PlateLayout; index: number; className?: string; label?: string }) {
  const { pick } = useI18n()
  if (look.photo) {
    return (
      <img
        src={look.photo.src}
        width={look.photo.width}
        height={look.photo.height}
        alt={label ? pick(look.photo.alt) : ''}
        loading="lazy"
        decoding="async"
        className={`object-cover ${className ?? ''}`}
        style={{ objectPosition: look.photo.focus }}
      />
    )
  }
  return (
    <NailPlate
      layout={layout}
      shape={look.shape}
      finishes={[look.finish]}
      tone={TONE[look.finish]}
      fieldVariant={FIELD_VARIANT[index % 4]}
      className={className}
      label={label}
    />
  )
}

function lookServices(look: Look) {
  return look.serviceIds.map((id) => findService(id)?.service).filter((s) => s !== undefined)
}

function LookViewer({ index, onClose, onNavigate }: { index: number | null; onClose: () => void; onNavigate: (i: number) => void }) {
  const { t, pick, price, dir } = useI18n()
  const { open } = useRequest()
  const heading = useRef<HTMLHeadingElement>(null)
  const current = index === null ? null : looks[index]
  const services = current ? lookServices(current) : []

  const go = (delta: number) => {
    if (index === null) return
    onNavigate((index + delta + looks.length) % looks.length)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const prev = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    if (e.key === next) {
      e.preventDefault()
      go(1)
    } else if (e.key === prev) {
      e.preventDefault()
      go(-1)
    }
  }

  return (
    <Modal
      open={current !== null}
      onClose={onClose}
      labelledBy="look-title"
      describedBy="look-description"
      initialFocus={heading}
      className="sheet m-0 h-[100dvh] w-full overflow-hidden bg-ivory p-0 md:m-auto md:h-fit md:max-h-[calc(100dvh-4rem)] md:w-[min(60rem,calc(100vw-4rem))] md:rounded-[1.5rem]"
    >
      {current && index !== null && (
        <div className="flex h-full flex-col md:grid md:h-[min(40rem,calc(100dvh-4rem))] md:grid-cols-[1.05fr_1fr]" onKeyDown={onKeyDown}>
          <div className="relative h-[46dvh] shrink-0 overflow-hidden md:h-full">
            <LookImage key={current.ref} look={current} layout="portrait" index={index} className="fade-swap h-full w-full" label={pick(current.name)} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <p className="eyebrow">
                {t.work.reference} <bdi className="tabular">{current.ref}</bdi>
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.common.close}
                className="-me-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-blush-soft"
              >
                <Icon name="close" size={22} />
              </button>
            </div>
            <h2 id="look-title" key={current.ref} ref={heading} tabIndex={-1} className="fade-swap display mt-3 text-[2.75rem]">
              {pick(current.name)}
            </h2>
            <p id="look-description" className="mt-3 text-taupe-ink">
              {pick(current.description)}
            </p>

            {services.length > 0 && (
              <div className="mt-6">
                <h3 className="eyebrow">{t.work.related}</h3>
                <ul className="mt-2 border-t border-line">
                  {services.map((s) => (
                    <li key={s.id} className="flex items-end gap-3 border-b border-line py-2.5 text-[0.98rem]">
                      <span>{pick(s.name)}</span>
                      <span className="leader" aria-hidden="true" />
                      <span className="tabular whitespace-nowrap font-medium">{price(s.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-auto pt-8">
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  const seed = { lookRef: current.ref, serviceIds: current.serviceIds.slice(0, 1) }
                  onClose()
                  afterDialogClose(() => open(seed))
                }}
              >
                {t.work.enquire}
              </Button>
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line hover:border-charcoal"
                  aria-label={t.work.previous}
                >
                  <Icon name="chevronStart" className="rtl:-scale-x-100" />
                </button>
                <span className="tabular text-sm text-taupe-ink" aria-live="polite">
                  {t.work.counter(index + 1, looks.length)}
                </span>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line hover:border-charcoal"
                  aria-label={t.work.next}
                >
                  <Icon name="chevronEnd" className="rtl:-scale-x-100" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function Gallery() {
  const { t, pick, price } = useI18n()
  const [viewing, setViewing] = useState<number | null>(null)

  return (
    <section id="work" aria-labelledby="work-title" className="bg-paper py-20 sm:py-24 lg:py-32">
      <div className="container-page">
        <div className="reveal grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-6">
            <p className="eyebrow">{t.work.eyebrow}</p>
            <h2 id="work-title" className="display mt-4 text-[clamp(2.75rem,6vw,4.75rem)]">
              {t.work.title}
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <p className="text-taupe-ink">{t.work.lede}</p>
            <a
              href={site.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-charcoal"
            >
              <Icon name="instagram" size={18} />
              {t.work.instagram}
              <span className="sr-only">{t.common.opensInNewTab}</span>
            </a>
          </div>
        </div>

        <p className="mt-10 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-taupe-ink rtl:tracking-normal">
          <span className="h-px w-8 bg-gold" aria-hidden="true" />
          {t.work.illustrated}
        </p>

        <div className="mt-4 [container-type:inline-size]">
        <ul className="grid auto-rows-[50cqw] grid-flow-dense grid-cols-2 gap-3 sm:gap-4 lg:auto-rows-[24cqw] lg:grid-cols-4">
          {looks.map((look, i) => {
            const services = lookServices(look)
            const lead = services[0]
            return (
              <li key={look.ref} className={`reveal ${TILE_CLASS[look.size]}`} style={{ '--i': i % 4 } as CSSProperties}>
                <button
                  type="button"
                  onClick={() => setViewing(i)}
                  aria-label={t.work.open(pick(look.name))}
                  aria-haspopup="dialog"
                  className="tile-lift group flex h-full w-full flex-col overflow-hidden rounded-[1.25rem] bg-ivory text-start"
                >
                  <span className="tile-sheen relative block min-h-0 flex-1 overflow-hidden">
                    <LookImage
                      look={look}
                      layout={TILE_LAYOUT[look.size]}
                      index={i}
                      className="h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.025] motion-reduce:group-hover:scale-100"
                    />
                  </span>
                  <span className="flex items-baseline justify-between gap-3 px-3.5 py-3 sm:px-4">
                    <span className="display truncate text-[1.35rem] sm:text-[1.5rem]">{pick(look.name)}</span>
                    {lead && (
                      <span className="tabular hidden shrink-0 text-xs text-taupe-ink sm:inline">
                        {pick(lead.name)} · {price(lead.price)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        </div>
      </div>

      <LookViewer index={viewing} onClose={() => setViewing(null)} onNavigate={setViewing} />
    </section>
  )
}
