import { useEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { useRequest } from '../../booking/RequestProvider'
import { branches } from '../../content/site'
import { media } from '../../content/media'
import { goToSection } from '../../lib/scroll'
import { LushField } from '../brand/LushField'
import { NailPlate } from '../art/NailArt'
import { SpaPlate } from '../art/SpaPlate'
import { Button, LinkButton } from '../ui/Button'
import { Icon } from '../ui/Icon'

const seq = (i: number) => ({ '--i': i }) as CSSProperties

/**
 * With a mouse or trackpad, the layers of the Lush field drift apart a little as the pointer moves,
 * so the pattern reads as layered colour rather than a flat print. Touch screens and reduced motion
 * keep it still.
 */
function useFieldDepth(section: RefObject<HTMLElement | null>, field: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const host = section.current
    const target = field.current
    if (!host || !target) return
    if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const onMove = (e: PointerEvent) => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const box = host.getBoundingClientRect()
        const x = ((e.clientX - box.left) / box.width) * 2 - 1
        const y = ((e.clientY - box.top) / box.height) * 2 - 1
        target.style.setProperty('--fx', x.toFixed(3))
        target.style.setProperty('--fy', y.toFixed(3))
      })
    }
    const onLeave = () => {
      window.cancelAnimationFrame(frame)
      target.style.setProperty('--fx', '0')
      target.style.setProperty('--fy', '0')
    }
    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerleave', onLeave)
    return () => {
      window.cancelAnimationFrame(frame)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
    }
  }, [section, field])
}

export function Hero() {
  const { t, pick } = useI18n()
  const { open } = useRequest()
  const sectionRef = useRef<HTMLElement>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  useFieldDepth(sectionRef, fieldRef)

  return (
    <section ref={sectionRef} id="top" aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* The Lush field: full-bleed behind the visual, running off the page edge. */}
      <div
        ref={fieldRef}
        className="absolute inset-x-0 bottom-0 -z-10 h-[23rem] overflow-hidden sm:h-[30rem] lg:inset-y-0 lg:start-auto lg:end-0 lg:h-auto lg:w-[47%] lg:rounded-es-[3rem]"
      >
        <LushField className="field-in h-full w-full" variant="b" depth />
      </div>

      <div className="container-page grid items-center gap-x-10 lg:min-h-[min(calc(100svh-var(--header-h)),56rem)] lg:grid-cols-12">
        <div className="hero-seq pb-10 pt-8 sm:pt-14 lg:col-span-6 lg:py-24 xl:col-span-6">
          <p className="eyebrow" style={seq(0)}>
            {t.hero.eyebrow}
          </p>
          <h1
            id="hero-title"
            className="display mt-5 text-[clamp(3rem,11.5vw,4.25rem)] sm:text-[clamp(4rem,8vw,6.25rem)] lg:text-[clamp(4.5rem,6.4vw,6.75rem)]"
            style={{ animation: 'none' }}
          >
            <span className="hero-line block" style={seq(0)}>
              {t.hero.titleA}
            </span>
            <span className="hero-line block italic text-rose-ink" style={seq(1)}>
              {t.hero.titleB}
            </span>
          </h1>
          <p className="mt-6 max-w-[30rem] text-lg leading-relaxed text-taupe-ink sm:text-xl" style={seq(4)}>
            {t.hero.lede}
          </p>
          <div className="mt-8 flex flex-col gap-3 xs:flex-row xs:flex-wrap" style={seq(5)}>
            <Button size="lg" onClick={() => open()}>
              {t.cta.request}
            </Button>
            <LinkButton
              size="lg"
              variant="secondary"
              href="#services"
              onClick={(e) => {
                e.preventDefault()
                goToSection('services')
              }}
            >
              {t.cta.explore}
            </LinkButton>
          </div>

          <ul className="mt-10 grid max-w-[34rem] gap-x-8 gap-y-3 border-t border-line pt-5 text-sm sm:grid-cols-2" style={seq(6)}>
            {branches.map((b) => (
              <li key={b.id}>
                <a
                  href="#locations"
                  onClick={(e) => {
                    e.preventDefault()
                    goToSection('locations')
                  }}
                  className="group flex min-h-11 items-start gap-2.5 py-1"
                >
                  <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-gold" />
                  <span>
                    <span className="block font-medium text-charcoal group-hover:underline group-hover:decoration-gold group-hover:underline-offset-4">
                      {pick(b.name)}
                    </span>
                    <span className="block text-taupe-ink">{pick(b.area)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative pb-12 lg:col-span-6 lg:py-16 xl:col-span-6">
          <figure className="relative mx-auto w-[min(78%,26rem)] sm:w-[min(62%,28rem)] lg:ms-[14%] lg:w-[min(76%,30rem)]">
            <div className="hero-card relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-paper p-2.5 shadow-[0_30px_60px_-30px_rgb(125_74_63/0.45)] sm:p-3">
              <div className="sheen relative h-full w-full overflow-hidden rounded-[1.25rem]">
                {media.heroManicure ? (
                  <img
                    src={media.heroManicure.src}
                    width={media.heroManicure.width}
                    height={media.heroManicure.height}
                    alt={pick(media.heroManicure.alt)}
                    fetchPriority="high"
                    className="h-full w-full object-cover"
                    style={{ objectPosition: media.heroManicure.focus }}
                  />
                ) : (
                  <NailPlate
                    layout="hero"
                    shape="almond"
                    finishes={['milky', 'french', 'nude', 'chrome', 'gilded']}
                    tone="cream"
                    className="h-full w-full"
                    label={t.hero.plateAlt}
                    paint="load"
                  />
                )}
              </div>
            </div>
            <div className="spa-in absolute -bottom-8 -start-[14%] w-[46%] rounded-full bg-paper p-2 shadow-[0_24px_48px_-24px_rgb(125_74_63/0.5)] sm:-start-[18%] sm:w-[44%] lg:-bottom-10 lg:-start-[26%]">
              <div className="aspect-square overflow-hidden rounded-full">
                {media.heroSpa ? (
                  <img
                    src={media.heroSpa.src}
                    width={media.heroSpa.width}
                    height={media.heroSpa.height}
                    alt={pick(media.heroSpa.alt)}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: media.heroSpa.focus }}
                  />
                ) : (
                  <SpaPlate className="h-full w-full" label={t.hero.spaAlt} />
                )}
              </div>
            </div>
          </figure>
        </div>
      </div>
    </section>
  )
}
