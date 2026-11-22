import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react'
import type { Aspect } from '../astro/aspects'
import type { Chart } from '../astro/chart'
import type { BodyId, SignId } from '../astro/zodiac'

export type Selection =
  | { kind: 'body'; id: BodyId }
  | { kind: 'angle'; id: 'asc' | 'mc' }
  | { kind: 'sign'; id: SignId }
  | { kind: 'house'; n: number }
  | { kind: 'aspect'; a: string; b: string }
  | { kind: 'transit'; id: BodyId }

export function sameSelection(a: Selection | null, b: Selection | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function aspectKey(a: { a: string; b: string }): string {
  return `${a.a}-${a.b}`
}

export interface LitSet {
  points: Set<string>
  aspects: Set<string>
  signs: Set<string>
  houses: Set<number>
  transits: Set<string>
  contacts: Set<string>
}

/** Everything that should stay bright when `focus` is highlighted. */
export function litFor(
  focus: Selection | null,
  chart: Chart,
  contacts: { transit: string; natal: string }[] = [],
): LitSet | null {
  if (!focus) return null
  const lit: LitSet = {
    points: new Set(),
    aspects: new Set(),
    signs: new Set(),
    houses: new Set(),
    transits: new Set(),
    contacts: new Set(),
  }
  const addAspectsOf = (id: string, list: Aspect[]) => {
    for (const a of list) {
      if (a.a === id || a.b === id) {
        lit.aspects.add(aspectKey(a))
        lit.points.add(a.a)
        lit.points.add(a.b)
      }
    }
  }
  switch (focus.kind) {
    case 'body':
    case 'angle':
      lit.points.add(focus.id)
      addAspectsOf(focus.id, chart.aspects)
      for (const c of contacts) {
        if (c.natal === focus.id) {
          lit.transits.add(c.transit)
          lit.contacts.add(`${c.transit}-${c.natal}`)
        }
      }
      break
    case 'aspect':
      lit.points.add(focus.a)
      lit.points.add(focus.b)
      lit.aspects.add(aspectKey(focus))
      break
    case 'sign':
      lit.signs.add(focus.id)
      for (const b of chart.bodies) if (b.sign.id === focus.id) lit.points.add(b.id)
      break
    case 'house':
      lit.houses.add(focus.n)
      for (const b of chart.bodies) if (b.house === focus.n) lit.points.add(b.id)
      break
    case 'transit':
      lit.transits.add(focus.id)
      for (const c of contacts) {
        if (c.transit === focus.id) {
          lit.points.add(c.natal)
          lit.contacts.add(`${c.transit}-${c.natal}`)
        }
      }
      break
  }
  return lit
}

/** Props that make an SVG element a keyboard- and pointer-accessible selectable target. */
export function interactive(
  sel: Selection,
  onSelect: (s: Selection | null) => void,
  onHover: (s: Selection | null) => void,
) {
  return {
    tabIndex: 0,
    role: 'button',
    onClick: (e: MouseEvent) => {
      e.stopPropagation()
      onSelect(sel)
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(sel)
      }
    },
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') onHover(sel)
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') onHover(null)
    },
    onFocus: () => onHover(sel),
    onBlur: () => onHover(null),
  }
}
