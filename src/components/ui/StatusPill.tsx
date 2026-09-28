import type { RequestStatus } from '../../lib/api'

/** Status colours: text on tint, all at least 4.5:1. */
const STYLES: Record<RequestStatus, string> = {
  new: 'bg-blush text-[#874b44]',
  contacted: 'bg-peach text-[#7a4a1e]',
  confirmed: 'bg-[#e2eee3] text-[#2c5a36]',
  declined: 'bg-[#f5e3e1] text-danger',
  cancelled: 'bg-line text-charcoal-soft',
  completed: 'bg-[#ece7e2] text-charcoal',
  no_show: 'bg-[#f5e3e1] text-danger',
}

export function StatusPill({ status, label, className = '' }: { status: RequestStatus; label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status]} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  )
}
