import { useI18n } from '../../i18n/I18nProvider'
import { useRequest } from '../../booking/RequestProvider'
import { Button } from '../ui/Button'

/**
 * Persistent appointment action on small screens. The page reserves its height (see --bar-h in
 * index.css), so it never covers the footer, and it sits inside the safe area on notched phones.
 */
export function MobileBar() {
  const { t } = useI18n()
  const { draft, open, isOpen } = useRequest()
  const count = draft.serviceIds.length

  return (
    <div
      className={`bar-in fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/95 backdrop-blur-md transition-transform duration-300 md:hidden ${
        isOpen ? 'translate-y-full' : ''
      }`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-3 px-4 pt-3">
        {count > 0 && (
          <p key={count} className="bump min-w-0 flex-1 text-sm leading-tight text-charcoal">
            {t.cta.selectedCount(count)}
          </p>
        )}
        <Button className={count > 0 ? 'shrink-0' : 'w-full'} onClick={() => open()}>
          {count > 0 ? t.cta.continueRequest : t.cta.request}
        </Button>
      </div>
    </div>
  )
}
