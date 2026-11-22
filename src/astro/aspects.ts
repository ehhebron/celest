import { angleDiff, norm360 } from './zodiac'

export type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'

export interface AspectDef {
  type: AspectType
  angle: number
  name: string
  nature: 'neutral' | 'harmonious' | 'challenging'
}

export const ASPECTS: AspectDef[] = [
  { type: 'conjunction', angle: 0, name: 'Conjunction', nature: 'neutral' },
  { type: 'sextile', angle: 60, name: 'Sextile', nature: 'harmonious' },
  { type: 'square', angle: 90, name: 'Square', nature: 'challenging' },
  { type: 'trine', angle: 120, name: 'Trine', nature: 'harmonious' },
  { type: 'opposition', angle: 180, name: 'Opposition', nature: 'challenging' },
]

export const ASPECT_BY_TYPE = Object.fromEntries(ASPECTS.map((a) => [a.type, a])) as Record<
  AspectType,
  AspectDef
>

export interface OrbConfig {
  /** Maximum orb in degrees per aspect type. */
  orbs: Record<AspectType, number>
  /** Extra orb when the Sun or Moon is involved. */
  luminaryBonus: number
  /** Multiplier applied when a minor point (node, Chiron, angles) is involved. */
  minorPointFactor: number
}

export const DEFAULT_ORBS: OrbConfig = {
  orbs: { conjunction: 8, opposition: 8, square: 7, trine: 7, sextile: 5 },
  luminaryBonus: 2,
  minorPointFactor: 0.6,
}

export interface AspectPoint {
  id: string
  lon: number
  /** Degrees/day; 0 for angles. */
  speed: number
  luminary?: boolean
  minor?: boolean
}

export interface Aspect {
  a: string
  b: string
  type: AspectType
  /** Absolute deviation from exact, degrees. */
  orb: number
  /** Allowed orb for this pair. */
  maxOrb: number
  /** 1 = exact, 0 = at the edge of the orb. */
  exactness: number
  applying: boolean
}

export function maxOrbFor(type: AspectType, a: AspectPoint, b: AspectPoint, cfg: OrbConfig): number {
  let orb = cfg.orbs[type]
  if (a.luminary || b.luminary) orb += cfg.luminaryBonus
  if (a.minor || b.minor) orb *= cfg.minorPointFactor
  return orb
}

/** Find the aspect (if any) between two longitudes for a given orb config. */
export function aspectBetween(
  a: AspectPoint,
  b: AspectPoint,
  cfg: OrbConfig = DEFAULT_ORBS,
): Aspect | null {
  const sep = Math.abs(angleDiff(a.lon, b.lon))
  let best: Aspect | null = null
  for (const def of ASPECTS) {
    const orb = Math.abs(sep - def.angle)
    const maxOrb = maxOrbFor(def.type, a, b, cfg)
    if (orb <= maxOrb && (!best || orb < best.orb)) {
      // Applying if the separation from exact shrinks a moment later.
      const dt = 0.01
      const later = Math.abs(
        Math.abs(angleDiff(norm360(a.lon + a.speed * dt), norm360(b.lon + b.speed * dt))) - def.angle,
      )
      best = {
        a: a.id,
        b: b.id,
        type: def.type,
        orb,
        maxOrb,
        exactness: 1 - orb / maxOrb,
        applying: later < orb,
      }
    }
  }
  return best
}

export function findAspects(points: AspectPoint[], cfg: OrbConfig = DEFAULT_ORBS): Aspect[] {
  const out: Aspect[] = []
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      // Angles are not aspected to each other (Asc–MC is structural).
      if (points[i].speed === 0 && points[j].speed === 0) continue
      const asp = aspectBetween(points[i], points[j], cfg)
      if (asp) out.push(asp)
    }
  }
  return out.sort((x, y) => y.exactness - x.exactness)
}
