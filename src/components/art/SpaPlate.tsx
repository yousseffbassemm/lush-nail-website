import { LushField } from '../brand/LushField'

/**
 * Supporting hero illustration: rolled towels and a bowl of warm water, drawn in fine line
 * in the manner of the line illustrations on Lush's Instagram highlight covers.
 */
export function SpaPlate({ className, label }: { className?: string; label?: string }) {
  const ink = '#9a7b4f'
  return (
    <svg
      viewBox="0 0 320 320"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <LushField tone="peach" variant="c" box={{ width: 320, height: 320 }} />
      <g fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Steam */}
        <path d="M150 70 c-10 14 10 22 0 36 c-8 12 6 18 0 28" />
        <path d="M172 58 c-10 14 10 22 0 36 c-8 12 6 18 0 28" />
        <path d="M194 72 c-9 12 9 20 0 32 c-7 10 5 16 0 24" />
        {/* Bowl */}
        <path d="M112 168 h132 c0 38 -30 62 -66 62 s-66 -24 -66 -62 z" fill="#fffaf5" />
        <path d="M120 168 c18 8 98 8 116 0" />
        <path d="M152 232 h52" />
        {/* Petal floating on the water */}
        <path d="M168 164 c6 -8 16 -8 22 0 c-6 6 -16 6 -22 0 z" fill="#efc3b8" />
        {/* Rolled towels */}
        <g fill="#fffaf5">
          <path d="M44 262 h108 a24 24 0 0 1 0 48 h-108 z" />
          <circle cx="152" cy="286" r="24" />
          <path d="M152 274 a12 12 0 1 1 -12 12 a7 7 0 0 1 7 -7" />
          <path d="M170 222 h96 a22 22 0 0 1 0 44 h-96 z" />
          <circle cx="266" cy="244" r="22" />
          <path d="M266 233 a11 11 0 1 1 -11 11 a6 6 0 0 1 6 -6" />
        </g>
        <path d="M60 272 h70 M60 300 h60 M186 232 h58 M186 256 h46" strokeOpacity="0.45" />
      </g>
    </svg>
  )
}
