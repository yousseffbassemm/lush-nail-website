import type { CSSProperties } from 'react'
import { FIELD_LAYERS, FIELD_VIEWBOX } from '../../brand/lushField'

export type FieldTone = 'blush' | 'peach' | 'mist' | 'rose' | 'cream'

/** Six tones per field, lightest to deepest. `blush` uses the site tokens. */
const TONES: Record<FieldTone, readonly string[]> = {
  blush: [0, 1, 2, 3, 4, 5].map((i) => `var(--color-field-${i})`),
  peach: ['#fcf5ed', '#faebe0', '#f7e0d3', '#f3d4c5', '#eec7b7', '#e8bba9'],
  mist: ['#f7f2f1', '#f2eaea', '#ece0e2', '#e5d6d9', '#ddcbcf', '#d5c1c6'],
  rose: ['#f6e2de', '#f0d3cd', '#e9c3bc', '#e1b2aa', '#d8a198', '#ce9188'],
  cream: ['#fdf9f0', '#fbf2e5', '#f8e9d8', '#f4dfcb', '#efd4bd', '#e9c9b0'],
}

interface Props {
  tone?: FieldTone
  className?: string
  /** Mirror or rotate the pattern so repeated uses don't look identical. */
  variant?: 'a' | 'b' | 'c' | 'd'
  /** Lower-contrast layers, for behind illustrations and text. */
  soft?: boolean
  /** Render as a nested <svg> inside another SVG, filling the given box. */
  box?: { width: number; height: number }
  /** Give each layer its own depth, so the pattern can drift apart slightly with the pointer (hero). */
  depth?: boolean
}

const VARIANT_TRANSFORM: Record<NonNullable<Props['variant']>, string | undefined> = {
  a: undefined,
  b: 'translate(458 0) scale(-1 1)',
  c: 'translate(458 660) rotate(180)',
  d: 'translate(0 660) scale(1 -1)',
}

/**
 * The Lush field: the camouflage pattern from Lush's printed price list, redrawn as vector layers.
 * Used sparingly — behind the hero, bridal section and illustrated plates.
 */
export function LushField({ tone = 'blush', className, variant = 'a', soft = false, box, depth = false }: Props) {
  const colors = TONES[tone]
  return (
    <svg
      viewBox={FIELD_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={`${className ?? ''}${depth ? ' field-depth' : ''}`}
      {...(box ? { width: box.width, height: box.height } : {})}
    >
      <rect width="458" height="660" style={{ fill: colors[0] }} />
      <g transform={VARIANT_TRANSFORM[variant]} opacity={soft ? 0.55 : undefined}>
        {FIELD_LAYERS.map((d, i) =>
          depth ? (
            <g key={i} className="field-layer" style={{ '--d': i + 1 } as CSSProperties}>
              <path d={d} style={{ fill: colors[i + 1] }} />
            </g>
          ) : (
            <path key={i} d={d} style={{ fill: colors[i + 1] }} />
          ),
        )}
      </g>
    </svg>
  )
}
