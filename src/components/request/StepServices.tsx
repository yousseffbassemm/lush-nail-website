import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { categories, findService, type CategoryId } from '../../content/services'
import { findLook } from '../../content/looks'
import { serviceLabel } from '../../booking/message'
import { NailPlate } from '../art/NailArt'
import { Icon } from '../ui/Icon'
import type { StepProps } from './stepTypes'
import { ChoiceCard, describedBy, FieldError, inputClass } from './Field'

function normalise(text: string) {
  return text
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function StepServices({ draft, set, errors }: StepProps) {
  const { t, lang, price, pick } = useI18n()
  const [query, setQuery] = useState('')
  const error = errors.serviceIds
  const look = findLook(draft.lookRef)

  const orderedCategories = useMemo(
    () => (draft.bridal ? [...categories.filter((c) => c.id === 'bridal'), ...categories.filter((c) => c.id !== 'bridal')] : categories),
    [draft.bridal],
  )

  const [expanded, setExpanded] = useState<Set<CategoryId>>(() => {
    const open = new Set<CategoryId>()
    for (const id of draft.serviceIds) {
      const hit = findService(id)
      if (hit) open.add(hit.category.id)
    }
    if (draft.bridal) open.add('bridal')
    return open
  })

  const toggleCategory = (id: CategoryId) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleService = (id: string, checked: boolean) =>
    set('serviceIds', checked ? [...draft.serviceIds, id] : draft.serviceIds.filter((s) => s !== id))

  const q = normalise(query.trim())
  const matches = (name: { en: string; ar: string }) => !q || normalise(name.en).includes(q) || normalise(name.ar).includes(q)
  const filtered = orderedCategories
    .map((c) => ({
      category: c,
      services: c.sections.flatMap((s) => s.services).filter((s) => matches(s.name) || matches(c.title)),
    }))
    .filter((group) => group.services.length > 0)

  return (
    <div className="grid gap-6">
      <p className="text-taupe-ink">{t.request.services.help}</p>

      {look && (
        <div className="flex items-center gap-4 rounded-2xl border border-line-strong bg-paper p-3">
          <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl">
            <NailPlate layout="portrait" shape={look.shape} finishes={[look.finish]} className="h-full w-full" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow !text-[0.7rem]">{t.request.services.look}</p>
            <p className="display text-[1.5rem] leading-tight">{pick(look.name)}</p>
            <bdi className="tabular text-xs text-taupe-ink">{look.ref}</bdi>
          </div>
          <button
            type="button"
            onClick={() => set('lookRef', null)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-taupe-ink hover:bg-blush-soft hover:text-charcoal"
            aria-label={`${t.request.services.removeLook}: ${pick(look.name)}`}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      <div>
        <h3 className="text-[0.95rem] font-medium">{t.request.services.selected}</h3>
        {draft.serviceIds.length === 0 ? (
          <p className="mt-2 text-sm text-taupe-ink">{t.request.services.noneSelected}</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {draft.serviceIds.map((id) => {
              const service = findService(id)?.service
              if (!service) return null
              const label = serviceLabel(service, lang)
              return (
                <li key={id} className="inline-flex items-center gap-1 rounded-full border border-charcoal/70 bg-paper ps-3.5 text-sm">
                  <span className="py-1.5">
                    {label} <span className="tabular text-taupe-ink">· {price(service.price)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleService(id, false)}
                    aria-label={`${t.common.remove}: ${label}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-blush-soft"
                  >
                    <Icon name="close" size={15} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <ChoiceCard
        type="checkbox"
        id="req-serviceIds"
        name="helpMeChoose"
        checked={draft.helpMeChoose}
        onChange={(checked) => set('helpMeChoose', checked)}
        describedById={describedBy('req-serviceIds', false, error)}
        invalid={Boolean(error)}
      >
        <span className="block font-medium">{t.request.services.helpMeChoose}</span>
        <span className="block text-sm text-taupe-ink">{t.request.services.helpMeChooseBody}</span>
      </ChoiceCard>
      <FieldError id="req-serviceIds" error={error} />

      <div>
        <label htmlFor="req-search" className="text-[0.95rem] font-medium">
          {t.request.services.search}
        </label>
        <input
          id="req-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.request.services.searchPlaceholder}
          className={`${inputClass} border-line-strong mt-1.5`}
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>

      <div className="grid gap-2">
        <div role="status">
          {filtered.length === 0 && <p className="rounded-xl bg-blush-soft p-4 text-sm">{t.request.services.noResults(query.trim())}</p>}
        </div>
        {filtered.map(({ category, services }) => {
          const isOpen = Boolean(q) || expanded.has(category.id)
          const panelId = `req-cat-${category.id}`
          const selectedHere = services.filter((s) => draft.serviceIds.includes(s.id)).length
          return (
            <div key={category.id} className="rounded-2xl border border-line bg-paper">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleCategory(category.id)}
                disabled={Boolean(q)}
                className="flex min-h-14 w-full items-center justify-between gap-4 px-4 text-start disabled:cursor-default"
              >
                <span className="font-medium">
                  {t.request.services.showCategory(pick(category.title), services.length)}
                </span>
                <span className="flex items-center gap-2 text-sm text-taupe-ink">
                  {selectedHere > 0 && <span className="tabular rounded-full bg-charcoal px-2 py-0.5 text-xs text-ivory">{selectedHere}</span>}
                  {!q && <Icon name="chevronDown" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
                </span>
              </button>
              <ul id={panelId} hidden={!isOpen} className="border-t border-line px-2 py-2">
                {services.map((s) => {
                  const checked = draft.serviceIds.includes(s.id)
                  const inputId = `req-svc-${s.id}`
                  return (
                    <li key={s.id}>
                      <label
                        htmlFor={inputId}
                        className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-charcoal ${
                          checked ? 'bg-blush-soft' : 'hover:bg-blush-soft/60'
                        }`}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleService(s.id, e.target.checked)}
                          className="h-5 w-5 shrink-0 accent-charcoal"
                        />
                        <span className="min-w-0 flex-1 text-[0.97rem] leading-snug">{serviceLabel(s, lang)}</span>
                        <span className="tabular shrink-0 whitespace-nowrap text-sm text-taupe-ink">{price(s.price)}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
