/** Small brand marks drawn from the salon's own world. */

/** An almond nail in gold: the bullet for lists of what a treatment includes. */
export function AlmondMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 16" aria-hidden="true" focusable="false" className={className}>
      <path d="M1 15.2V7.4C1 3.6 3.3 0.8 5 0.8S9 3.6 9 7.4v7.8c-2.6 1.2-5.4 1.2-8 0Z" fill="currentColor" />
      <path d="M3.1 12.6c-.4-2.6-.2-5.8 1-8" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

/**
 * A soft, uneven edge for a section painted with the Lush field, so the pattern meets the page the way
 * the camouflage shapes meet each other rather than along a ruled line. The path is filled with the
 * colour of the neighbouring section.
 */
export function FieldEdge({ side, className = '' }: { side: 'top' | 'bottom'; className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 64"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none absolute inset-x-0 h-8 w-full sm:h-12 ${side === 'top' ? 'top-0' : 'bottom-0 -scale-y-100'} ${className}`}
    >
      <path
        d="M0 0H1440V30C1382 44 1318 22 1246 28 1160 35 1122 54 1030 50 948 46 904 22 818 24 726 26 690 48 598 46 508 44 470 18 382 20 290 22 250 44 164 42 96 40 52 26 0 34Z"
        fill="currentColor"
      />
    </svg>
  )
}
