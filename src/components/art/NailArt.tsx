import { useId, type CSSProperties } from 'react'
import type { Finish, NailShape } from '../../content/looks'
import { LushField, type FieldTone } from '../brand/LushField'

/**
 * Illustrated nail plates. They stand in for photography until Lush supplies its own images,
 * and are deliberately illustrations so they can't be mistaken for client results.
 */

export interface NailSpec {
  x: number
  y: number
  angle: number
  w: number
  len: number
  shape: NailShape
  finish: Finish
  /** Accent nail for nail-art looks. */
  accent?: boolean
}

export type PlateLayout = 'hero' | 'portrait' | 'tall' | 'landscape'

const VIEWBOX: Record<PlateLayout, { w: number; h: number }> = {
  hero: { w: 480, h: 600 },
  portrait: { w: 400, h: 500 },
  tall: { w: 300, h: 600 },
  landscape: { w: 640, h: 380 },
}

/** Short shapes are drawn shorter than extensions. */
const SHAPE_LENGTH: Record<NailShape, number> = { almond: 1, coffin: 0.96, oval: 0.8, square: 0.66 }

/** Outline of one nail, cuticle at the origin, pointing up. */
function nailPath(shape: NailShape, w: number, len: number) {
  const h = w / 2
  const base = `C ${h} ${w * 0.34} ${-h} ${w * 0.34} ${-h} 0 Z`
  switch (shape) {
    case 'almond':
      return `M ${-h} 0 L ${-h} ${-len * 0.42} C ${-h} ${-len * 0.8} ${-w * 0.16} ${-len} 0 ${-len} C ${w * 0.16} ${-len} ${h} ${-len * 0.8} ${h} ${-len * 0.42} L ${h} 0 ${base}`
    case 'oval':
      return `M ${-h} 0 L ${-h} ${-len * 0.62} C ${-h} ${-len * 1.03} ${h} ${-len * 1.03} ${h} ${-len * 0.62} L ${h} 0 ${base}`
    case 'square': {
      const r = w * 0.32
      return `M ${-h} 0 L ${-h} ${-len + r} Q ${-h} ${-len} ${-h + r} ${-len} L ${h - r} ${-len} Q ${h} ${-len} ${h} ${-len + r} L ${h} 0 ${base}`
    }
    case 'coffin':
      return `M ${-h} 0 C ${-h} ${-len * 0.45} ${-w * 0.34} ${-len * 0.86} ${-w * 0.27} ${-len} L ${w * 0.27} ${-len} C ${w * 0.34} ${-len * 0.86} ${h} ${-len * 0.45} ${h} 0 ${base}`
  }
}

/** The free edge for French tips: everything above a curved "smile line". */
function tipPath(w: number, len: number, depth: number) {
  const y = -len * (1 - depth)
  return `M ${-w} ${y + len * 0.02} C ${-w * 0.3} ${y - len * 0.18} ${w * 0.3} ${y - len * 0.18} ${w} ${y + len * 0.02} L ${w} ${-len * 1.2} L ${-w} ${-len * 1.2} Z`
}

function smileLine(w: number, len: number, depth: number) {
  const y = -len * (1 - depth)
  return `M ${-w * 0.62} ${y - len * 0.012} C ${-w * 0.3} ${y - len * 0.16} ${w * 0.3} ${y - len * 0.16} ${w * 0.62} ${y - len * 0.012}`
}

function Blossom({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const petals = [0, 72, 144, 216, 288]
  return (
    <g>
      {petals.map((a) => {
        const rad = (a * Math.PI) / 180
        return <circle key={a} cx={cx + Math.sin(rad) * r} cy={cy - Math.cos(rad) * r} r={r * 0.78} fill="#fffaf6" />
      })}
      <circle cx={cx} cy={cy} r={r * 0.5} fill="#c9a25c" />
    </g>
  )
}

function Gradients({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-nude`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#efcdbf" />
        <stop offset="1" stopColor="#d9a595" />
      </linearGradient>
      <linearGradient id={`${id}-sheer`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f6dcd4" />
        <stop offset="1" stopColor="#e9bdb2" />
      </linearGradient>
      <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f6eff2" />
        <stop offset="0.22" stopColor="#d9cbd5" />
        <stop offset="0.42" stopColor="#ffffff" />
        <stop offset="0.6" stopColor="#cdbfcc" />
        <stop offset="0.8" stopColor="#f3e9ee" />
        <stop offset="1" stopColor="#bba9b9" />
      </linearGradient>
      <linearGradient id={`${id}-plum`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#57283f" />
        <stop offset="1" stopColor="#2c1320" />
      </linearGradient>
      <linearGradient id={`${id}-band`} x1="0" y1="0.1" x2="1" y2="0.9">
        <stop offset="0.3" stopColor="#f3c9d0" stopOpacity="0" />
        <stop offset="0.47" stopColor="#f6d9dc" stopOpacity="0.85" />
        <stop offset="0.53" stopColor="#fff1ef" stopOpacity="0.95" />
        <stop offset="0.7" stopColor="#f3c9d0" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-ombre`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fffaf6" />
        <stop offset="0.38" stopColor="#fbeee8" />
        <stop offset="1" stopColor="#e2b1a4" />
      </linearGradient>
      <linearGradient id={`${id}-red`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b8243a" />
        <stop offset="1" stopColor="#7a0f20" />
      </linearGradient>
      <linearGradient id={`${id}-milky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f8e2de" />
        <stop offset="1" stopColor="#efcbc6" />
      </linearGradient>
      <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
    </defs>
  )
}

const BASE_FILL: Record<Finish, string> = {
  nude: 'nude',
  french: 'sheer',
  gilded: 'sheer',
  chrome: 'chrome',
  cateye: 'plum',
  ombre: 'ombre',
  art: 'nude',
  red: 'red',
  milky: 'milky',
}

function Nail({ spec, id, index }: { spec: NailSpec; id: string; index: number }) {
  const { w, shape, finish } = spec
  const len = spec.len * SHAPE_LENGTH[shape]
  const d = nailPath(shape, w, len)
  const clip = `${id}-clip-${index}`
  const glossStrength = finish === 'cateye' || finish === 'red' ? 0.5 : 0.62
  return (
    <g transform={`translate(${spec.x} ${spec.y}) rotate(${spec.angle})`}>
      <clipPath id={clip}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={`url(#${id}-${BASE_FILL[finish]})`} />
      <g clipPath={`url(#${clip})`}>
        {(finish === 'french' || finish === 'gilded') && (
          <>
            <path d={tipPath(w, len, finish === 'gilded' ? 0.3 : 0.27)} fill="#fffcf9" />
            {finish === 'gilded' && (
              <path d={smileLine(w, len, 0.3)} fill="none" stroke="#c39b55" strokeWidth={w * 0.05} strokeLinecap="round" />
            )}
          </>
        )}
        {finish === 'cateye' && <path d={d} fill={`url(#${id}-band)`} />}
        {finish === 'art' && spec.accent && (
          <>
            <Blossom cx={-w * 0.06} cy={-len * 0.6} r={w * 0.15} />
            <Blossom cx={w * 0.17} cy={-len * 0.33} r={w * 0.1} />
            <circle cx={-w * 0.2} cy={-len * 0.26} r={w * 0.045} fill="#c9a25c" />
            <circle cx={w * 0.2} cy={-len * 0.78} r={w * 0.04} fill="#fffaf6" />
          </>
        )}
        {finish === 'art' && !spec.accent && <circle cx={0} cy={-len * 0.5} r={w * 0.04} fill="#c9a25c" opacity="0.9" />}
        {/* Cuticle edge: a faint rim that gives the nail thickness. */}
        <path d={d} fill="none" stroke="#000" strokeOpacity="0.06" strokeWidth={w * 0.05} />
        {/* Gloss: long highlight on the left, a softer one on the right. */}
        <path
          d={`M ${-w * 0.25} ${-len * 0.12} C ${-w * 0.3} ${-len * 0.45} ${-w * 0.22} ${-len * 0.74} ${-w * 0.05} ${-len * 0.88}`}
          fill="none"
          stroke={`url(#${id}-gloss)`}
          strokeOpacity={glossStrength}
          strokeWidth={w * 0.11}
          strokeLinecap="round"
        />
        <path
          d={`M ${w * 0.3} ${-len * 0.2} C ${w * 0.32} ${-len * 0.36} ${w * 0.3} ${-len * 0.5} ${w * 0.24} ${-len * 0.6}`}
          fill="none"
          stroke="#fff"
          strokeOpacity={glossStrength * 0.45}
          strokeWidth={w * 0.05}
          strokeLinecap="round"
        />
      </g>
    </g>
  )
}

type Placement = Pick<NailSpec, 'x' | 'y' | 'angle' | 'w' | 'len'>

function place(specs: Placement[], shape: NailShape, finishes: Finish[], accents: number[]): NailSpec[] {
  // Shorter shapes move up by half the length they lose, so every set stays centred in its frame.
  const lift = (len: number) => (len * (1 - SHAPE_LENGTH[shape])) / 2
  return specs.map((s, i) => ({
    ...s,
    y: s.y - lift(s.len),
    shape,
    finish: finishes[i % finishes.length],
    accent: accents.includes(i),
  }))
}

export function layoutNails(layout: PlateLayout, shape: NailShape, finishes: Finish[]): NailSpec[] {
  switch (layout) {
    case 'hero':
      // A full set in a gentle arc, each nail in a different house finish.
      return place(
        [
          { x: 88, y: 430, angle: -12, w: 60, len: 214 },
          { x: 164, y: 404, angle: -6, w: 64, len: 240 },
          { x: 240, y: 396, angle: 0, w: 66, len: 252 },
          { x: 316, y: 404, angle: 6, w: 64, len: 240 },
          { x: 392, y: 430, angle: 12, w: 60, len: 214 },
        ],
        shape,
        finishes,
        [],
      )
    case 'portrait':
      // Three upright swatches, gently splayed.
      return place(
        [
          { x: 122, y: 392, angle: -10, w: 64, len: 224 },
          { x: 200, y: 380, angle: 0, w: 68, len: 248 },
          { x: 278, y: 392, angle: 10, w: 64, len: 224 },
        ],
        shape,
        finishes,
        [0, 2],
      )
    case 'landscape':
      return place(
        [
          { x: 140, y: 284, angle: -8, w: 54, len: 170 },
          { x: 230, y: 276, angle: -3, w: 56, len: 186 },
          { x: 320, y: 272, angle: 0, w: 58, len: 194 },
          { x: 410, y: 276, angle: 3, w: 56, len: 186 },
          { x: 500, y: 284, angle: 8, w: 54, len: 170 },
        ],
        shape,
        finishes,
        [1, 3],
      )
    case 'tall':
      // Three nails cascading down the frame.
      return place(
        [
          { x: 178, y: 250, angle: 14, w: 58, len: 170 },
          { x: 132, y: 410, angle: -6, w: 58, len: 170 },
          { x: 190, y: 560, angle: 10, w: 58, len: 170 },
        ],
        shape,
        finishes,
        [0, 2],
      )
  }
}

interface PlateProps {
  layout: PlateLayout
  /** Softens the field so the nails stay the focus. */
  softField?: boolean
  shape: NailShape
  finishes: Finish[]
  tone?: FieldTone
  fieldVariant?: 'a' | 'b' | 'c' | 'd'
  className?: string
  /** Accessible description; omit when the plate is decorative. */
  label?: string
  /** Deal the nails in one by one when the plate first appears (hero). */
  animateIn?: boolean
}

export function NailPlate({ layout, shape, finishes, tone = 'blush', fieldVariant = 'a', softField = true, className, label, animateIn = false }: PlateProps) {
  const rawId = useId()
  const id = `n${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const { w, h } = VIEWBOX[layout]
  const nails = layoutNails(layout, shape, finishes)
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <Gradients id={id} />
      <LushField tone={tone} variant={fieldVariant} soft={softField} box={{ width: w, height: h }} />
      {animateIn &&
        nails.map((n, i) => (
          <g key={i} className="nail-in" style={{ '--i': i } as CSSProperties}>
            <path
              d={nailPath(n.shape, n.w, n.len * SHAPE_LENGTH[n.shape])}
              transform={`translate(${n.x + 5} ${n.y + 10}) rotate(${n.angle})`}
              fill="#7d4a3f"
              opacity="0.32"
              filter={`url(#${id}-shadow)`}
            />
            <Nail spec={n} id={id} index={i} />
          </g>
        ))}
      {!animateIn && (
      <>
      <g filter={`url(#${id}-shadow)`} opacity="0.32">
        {nails.map((n, i) => (
          <path
            key={i}
            d={nailPath(n.shape, n.w, n.len * SHAPE_LENGTH[n.shape])}
            transform={`translate(${n.x + 5} ${n.y + 10}) rotate(${n.angle})`}
            fill="#7d4a3f"
          />
        ))}
      </g>
      {nails.map((n, i) => (
        <Nail key={i} spec={n} id={id} index={i} />
      ))}
      </>
      )}
    </svg>
  )
}
