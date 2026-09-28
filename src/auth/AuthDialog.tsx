import { useRef } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { navigate } from '../lib/router'
import { useAnnounce } from '../lib/announce'
import { Icon } from '../components/ui/Icon'
import { Modal, afterDialogClose } from '../components/ui/Modal'
import { AuthPanel, type AuthMode } from './AuthPanel'

/** Log in / create account, opened from the header or the account page. */
export function AuthDialog({ open, mode = 'login', onClose }: { open: boolean; mode?: AuthMode; onClose: () => void }) {
  const { t } = useI18n()
  const announce = useAnnounce()
  const closeRef = useRef<HTMLButtonElement>(null)
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="auth-dialog-title"
      initialFocus={closeRef}
      className="sheet m-0 h-[100dvh] w-full overflow-y-auto bg-ivory p-0 md:m-auto md:h-fit md:max-h-[calc(100dvh-4rem)] md:w-[min(30rem,calc(100vw-4rem))] md:rounded-[1.5rem]"
    >
      <div className="px-6 pb-8 pt-4 sm:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="auth-dialog-title" className="eyebrow">
            {t.nav.login}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="-me-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-blush-soft"
          >
            <Icon name="close" size={22} />
          </button>
        </div>
        {open && (
          <AuthPanel
            key={mode}
            initialMode={mode}
            headingLevel="h3"
            onDone={(user) => {
              announce(t.auth.signedInAs(user.firstName))
              onClose()
              if (user.role !== 'customer') afterDialogClose(() => navigate('/admin'))
            }}
          />
        )}
      </div>
    </Modal>
  )
}
