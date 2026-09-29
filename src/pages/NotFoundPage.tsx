import { useEffect } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { Link } from '../lib/router'
import { LushField } from '../components/brand/LushField'
import { buttonClasses } from '../components/ui/Button'

export function NotFoundPage() {
  const { t } = useI18n()
  useEffect(() => {
    document.title = `${t.notFound.title} · ${t.common.businessName}`
  }, [t])
  return (
    <section aria-labelledby="not-found-title" className="relative isolate overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 opacity-60" aria-hidden="true">
        <LushField className="h-full w-full" variant="b" soft />
      </div>
      <div className="container-page max-w-2xl text-center">
        <img src="/brand/lush-butterfly.svg" alt="" width={66} height={74} className="mx-auto h-12 w-auto" />
        <h1 id="not-found-title" className="display mt-6 text-[clamp(2.5rem,7vw,4.5rem)]">
          {t.notFound.title}
        </h1>
        <p className="mt-4 text-lg text-taupe-ink">{t.notFound.body}</p>
        <Link to="/" className={buttonClasses('primary', 'lg', 'mt-8')}>
          {t.notFound.home}
        </Link>
      </div>
    </section>
  )
}
