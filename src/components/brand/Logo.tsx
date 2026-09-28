/** The Lush script logo, vectorised from the official price list artwork. */
export function Logo({ className = 'h-10 w-auto', alt = 'Lush' }: { className?: string; alt?: string }) {
  return <img src="/brand/lush-logo.svg" alt={alt} width={506} height={169} className={className} decoding="async" />
}
