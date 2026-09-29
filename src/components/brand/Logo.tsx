/** The Lush script logo, vectorised from the official price list artwork. */
export function Logo({ className = 'h-10 w-auto', alt = 'Lush', priority = false }: { className?: string; alt?: string; priority?: boolean }) {
  return (
    <img
      src="/brand/lush-logo.svg"
      alt={alt}
      width={506}
      height={169}
      className={className}
      // The header logo is often the first thing painted, so it's fetched first; the others wait their turn.
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
    />
  )
}
