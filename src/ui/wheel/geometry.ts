import { norm360 } from '../../astro/zodiac'

export const SIZE = 1000
export const C = SIZE / 2

export const R = {
  transitOuter: 494,
  transitGlyph: 463,
  transitInner: 434,
  outer: 428,
  zodiacInner: 370,
  tickLong: 356,
  tickMid: 360,
  tickShort: 364,
  planet: 318,
  label: 277,
  house: 238,
  aspect: 214,
} as const

/** Scale applied to the natal wheel when the transit ring is hidden. */
export const NATAL_ONLY_SCALE = R.transitOuter / R.outer - 0.02

/**
 * Screen angle (degrees, counter-clockwise from 3 o'clock) for an ecliptic
 * longitude, with `ascendant` placed at 9 o'clock.
 */
export function screenAngle(lon: number, ascendant: number): number {
  return 180 + lon - ascendant
}

export function polar(r: number, angleDeg: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180
  return { x: C + r * Math.cos(a), y: C - r * Math.sin(a) }
}

/** SVG path of an annular sector between two screen angles (CCW from a1 to a2). */
export function annularSector(r1: number, r2: number, a1: number, a2: number): string {
  const p1 = polar(r2, a1)
  const p2 = polar(r2, a2)
  const p3 = polar(r1, a2)
  const p4 = polar(r1, a1)
  const large = norm360(a2 - a1) > 180 ? 1 : 0
  // Screen y is flipped, so CCW in math = sweep-flag 0 in SVG.
  return [
    `M${p1.x} ${p1.y}`,
    `A${r2} ${r2} 0 ${large} 0 ${p2.x} ${p2.y}`,
    `L${p3.x} ${p3.y}`,
    `A${r1} ${r1} 0 ${large} 1 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ')
}

export function arcPath(r: number, a1: number, a2: number): string {
  const p1 = polar(r, a1)
  const p2 = polar(r, a2)
  const large = norm360(a2 - a1) > 180 ? 1 : 0
  return `M${p1.x} ${p1.y} A${r} ${r} 0 ${large} 0 ${p2.x} ${p2.y}`
}

export interface SpreadItem {
  id: string
  lon: number
}

/**
 * Fan clustered points apart so that neighbours are at least `minSep`
 * degrees apart, keeping each cluster centred on its true positions.
 * Returns display longitudes keyed by id.
 */
export function spreadLongitudes(items: SpreadItem[], minSep: number): Record<string, number> {
  const n = items.length
  const out: Record<string, number> = {}
  if (n === 0) return out
  if (n * minSep >= 360) minSep = 360 / n

  const sorted = [...items].sort((a, b) => norm360(a.lon) - norm360(b.lon))
  // Start the linear order at the largest gap so no cluster straddles the seam.
  let seam = 0
  let maxGap = -1
  for (let i = 0; i < n; i++) {
    const gap = norm360(sorted[(i + 1) % n].lon - sorted[i].lon) || (n === 1 ? 360 : 0)
    if (gap > maxGap) {
      maxGap = gap
      seam = (i + 1) % n
    }
  }
  const order = [...sorted.slice(seam), ...sorted.slice(0, seam)]
  const base = order[0].lon
  const pos = order.map((it) => {
    let l = norm360(it.lon - base)
    if (l < 0) l += 360
    return l
  })

  // Cluster merging: each cluster is laid out evenly around its mean true position.
  type Cluster = { start: number; end: number; center: number }
  let clusters: Cluster[] = pos.map((p, i) => ({ start: i, end: i, center: p }))
  const layoutStart = (c: Cluster) => c.center - ((c.end - c.start) * minSep) / 2
  const layoutEnd = (c: Cluster) => c.center + ((c.end - c.start) * minSep) / 2
  let changed = true
  while (changed) {
    changed = false
    const merged: Cluster[] = []
    for (const c of clusters) {
      const prev = merged[merged.length - 1]
      if (prev && layoutEnd(prev) + minSep > layoutStart(c) + 1e-9) {
        const start = prev.start
        const end = c.end
        let sum = 0
        for (let i = start; i <= end; i++) sum += pos[i]
        merged[merged.length - 1] = { start, end, center: sum / (end - start + 1) }
        changed = true
      } else merged.push(c)
    }
    // Wrap-around: last cluster colliding with the first.
    if (merged.length > 1) {
      const first = merged[0]
      const last = merged[merged.length - 1]
      if (layoutEnd(last) + minSep > layoutStart(first) + 360 + 1e-9) {
        // Rare: everything is one ring-spanning cluster. Spread evenly.
        if (merged.length === 2 && first.start === 0 && last.end === n - 1) {
          merged.splice(0, 2, { start: 0, end: n - 1, center: pos.reduce((a, b) => a + b, 0) / n })
          changed = true
        }
      }
    }
    clusters = merged
  }

  for (const c of clusters) {
    const s = layoutStart(c)
    for (let i = c.start; i <= c.end; i++) {
      out[order[i].id] = norm360(base + s + (i - c.start) * minSep)
    }
  }
  return out
}
