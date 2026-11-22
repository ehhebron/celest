import { ASPECTS, type AspectType } from './aspects'
import type { Chart } from './chart'
import { bodyLongitude, isBodyAvailable } from './ephemeris'
import { angleDiff, norm360, type BodyId } from './zodiac'

export const TRANSIT_BODIES: BodyId[] = [
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter',
  'saturn', 'uranus', 'neptune', 'pluto', 'node', 'chiron',
]

export interface TransitPosition {
  id: BodyId
  lon: number
}

export function transitPositions(date: Date): TransitPosition[] {
  return TRANSIT_BODIES.filter((id) => isBodyAvailable(id, date)).map((id) => ({
    id,
    lon: bodyLongitude(id, date),
  }))
}

export interface TransitAspect {
  transit: BodyId
  natal: string
  type: AspectType
  orb: number
  /** When the aspect is (or was) exact, nearest to the given date. Null if none found in the window. */
  exact: Date | null
  applying: boolean
}

const DAY = 86400000
/** Search window (days, each side) and sample step for finding exact hits. */
const SEARCH: Partial<Record<BodyId, [number, number]>> = {
  moon: [2, 0.1],
  sun: [6, 0.5],
  mercury: [20, 1],
  venus: [20, 1],
  mars: [30, 1],
  jupiter: [150, 3],
  saturn: [200, 4],
  uranus: [300, 5],
  neptune: [300, 5],
  pluto: [300, 5],
  node: [60, 2],
  chiron: [300, 5],
}

/** Transit orbs are tight: these are "in effect now" contacts. */
export const TRANSIT_ORB: Record<AspectType, number> = {
  conjunction: 2,
  opposition: 2,
  square: 1.5,
  trine: 1.5,
  sextile: 1,
}

/** Signed deviation from exactness relative to one of the two aspect targets. */
function deviation(lonT: number, natal: number, angle: number, side: 1 | -1): number {
  return angleDiff(lonT, norm360(natal + side * angle))
}

function findExact(id: BodyId, natalLon: number, angle: number, side: 1 | -1, around: Date): Date | null {
  const [window, step] = SEARCH[id] ?? [30, 1]
  const t0 = around.getTime()
  let best: number | null = null
  let prevT = t0 - window * DAY
  let prevF = deviation(bodyLongitude(id, new Date(prevT)), natalLon, angle, side)
  for (let t = prevT + step * DAY; t <= t0 + window * DAY; t += step * DAY) {
    const f = deviation(bodyLongitude(id, new Date(t)), natalLon, angle, side)
    // Sign change (and not a ±180 wrap) brackets a root.
    if (Math.sign(f) !== Math.sign(prevF) && Math.abs(f - prevF) < 90) {
      let lo = prevT
      let hi = t
      let flo = prevF
      for (let k = 0; k < 40 && hi - lo > 30000; k++) {
        const mid = (lo + hi) / 2
        const fm = deviation(bodyLongitude(id, new Date(mid)), natalLon, angle, side)
        if (Math.sign(fm) === Math.sign(flo)) {
          lo = mid
          flo = fm
        } else hi = mid
      }
      const root = (lo + hi) / 2
      if (best === null || Math.abs(root - t0) < Math.abs(best - t0)) best = root
    }
    prevT = t
    prevF = f
  }
  return best === null ? null : new Date(best)
}

export interface NatalPoint {
  id: string
  lon: number
}

export function natalPoints(chart: Chart): NatalPoint[] {
  const pts: NatalPoint[] = chart.bodies
    .filter((b) => b.id !== 'node' && b.id !== 'chiron')
    .map((b) => ({ id: b.id, lon: b.lon }))
  if (chart.angles) {
    pts.push({ id: 'asc', lon: chart.angles.asc }, { id: 'mc', lon: chart.angles.mc })
  }
  return pts
}

/** Quick check (no exact-date search): which contacts are within orb at `date`. */
export function activeContacts(positions: TransitPosition[], natal: NatalPoint[]) {
  const out: { transit: BodyId; natal: string; type: AspectType; orb: number; side: 1 | -1 }[] = []
  for (const t of positions) {
    for (const n of natal) {
      for (const def of ASPECTS) {
        for (const side of [1, -1] as const) {
          if (def.angle === 0 && side === -1) continue
          if (def.angle === 180 && side === -1) continue
          const orb = Math.abs(deviation(t.lon, n.lon, def.angle, side))
          if (orb <= TRANSIT_ORB[def.type]) out.push({ transit: t.id, natal: n.id, type: def.type, orb, side })
        }
      }
    }
  }
  return out.sort((a, b) => a.orb - b.orb)
}

/** Active transit-to-natal aspects with their nearest exact dates. */
export function transitAspects(chart: Chart, date: Date, opts: { includeMoon?: boolean } = {}): TransitAspect[] {
  const natal = natalPoints(chart)
  const positions = transitPositions(date).filter((p) => opts.includeMoon || p.id !== 'moon')
  return activeContacts(positions, natal).map((c) => {
    const def = ASPECTS.find((a) => a.type === c.type)!
    const natalLon = natal.find((n) => n.id === c.natal)!.lon
    const exact = findExact(c.transit, natalLon, def.angle, c.side, date)
    const later = Math.abs(
      deviation(bodyLongitude(c.transit, new Date(date.getTime() + DAY / 4)), natalLon, def.angle, c.side),
    )
    return {
      transit: c.transit,
      natal: c.natal,
      type: c.type,
      orb: c.orb,
      exact,
      applying: later < c.orb,
    }
  })
}
