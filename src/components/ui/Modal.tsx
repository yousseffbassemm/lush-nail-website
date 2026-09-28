import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'

let openCount = 0

interface Props {
  open: boolean
  onClose: () => void
  labelledBy: string
  describedBy?: string
  /** Element to focus when the dialog opens. Defaults to the dialog's first focusable element. */
  initialFocus?: RefObject<HTMLElement | null>
  className?: string
  children: ReactNode
}

/**
 * Native <dialog> shown modally: the browser traps focus and makes the page inert.
 * Escape closes it, a click on the backdrop closes it, and focus returns to whatever opened it.
 *
 * Closing always goes through the `open` prop, and focus is restored synchronously at that moment,
 * so another dialog can open straight afterwards without the two competing for focus.
 */
export function Modal({ open, onClose, labelledBy, describedBy, initialFocus, className = '', children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
      openCount += 1
      document.documentElement.style.overflow = 'hidden'
      initialFocus?.current?.focus({ preventScroll: true })
    } else if (!open && dialog.open) {
      dialog.close()
      openCount = Math.max(0, openCount - 1)
      if (openCount === 0) document.documentElement.style.overflow = ''
      const target = returnTo.current
      returnTo.current = null
      // If whatever opened the dialog has gone (e.g. a list row that changed), land on the main content.
      if (target && document.contains(target)) target.focus({ preventScroll: true })
      else document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true })
    }
  }, [open, initialFocus])

  // If the browser closes the dialog by itself, keep React's state in step.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handleClose = () => {
      if (returnTo.current) onCloseRef.current()
    }
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [])

  useEffect(() => {
    const dialog = ref.current
    return () => {
      if (dialog?.open) {
        dialog.close()
        openCount = Math.max(0, openCount - 1)
        if (openCount === 0) document.documentElement.style.overflow = ''
      }
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={className}
      onCancel={(e) => {
        e.preventDefault()
        onCloseRef.current()
      }}
      onClick={(e) => {
        // A click on the dialog element itself (not its content) is a click on the backdrop.
        if (e.target === e.currentTarget) onCloseRef.current()
      }}
    >
      {children}
    </dialog>
  )
}

/** Run after the current dialog has closed and restored focus, e.g. to open the next one. */
export function afterDialogClose(fn: () => void) {
  window.setTimeout(fn, 0)
}
