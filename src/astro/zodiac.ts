export type Element = 'fire' | 'earth' | 'air' | 'water'
export type Modality = 'cardinal' | 'fixed' | 'mutable'

export type SignId =
  | 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo'
  | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces'

export interface SignInfo {
  id: SignId
  name: string
  element: Element
  modality: Modality
}

const ELEMENTS: Element[] = ['fire', 'earth', 'air', 'water']
const MODALITIES: Modality[] = ['cardinal', 'fixed', 'mutable']
const SIGN_IDS: SignId[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
]

export const SIGNS: SignInfo[] = SIGN_IDS.map((id, i) => ({
  id,
  name: id[0].toUpperCase() + id.slice(1),
  element: ELEMENTS[i % 4],
  modality: MODALITIES[i % 3],
}))

export type BodyId =
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter'
  | 'saturn' | 'uranus' | 'neptune' | 'pluto' | 'node' | 'chiron'

export interface BodyInfo {
  id: BodyId
  name: string
  /** Counted in element/modality balance (traditional weighting). */
  balanceWeight: number
}

export const BODIES: BodyInfo[] = [
  { id: 'sun', name: 'Sun', balanceWeight: 3 },
  { id: 'moon', name: 'Moon', balanceWeight: 3 },
  { id: 'mercury', name: 'Mercury', balanceWeight: 2 },
  { id: 'venus', name: 'Venus', balanceWeight: 2 },
  { id: 'mars', name: 'Mars', balanceWeight: 2 },
  { id: 'jupiter', name: 'Jupiter', balanceWeight: 1 },
  { id: 'saturn', name: 'Saturn', balanceWeight: 1 },
  { id: 'uranus', name: 'Uranus', balanceWeight: 0.5 },
  { id: 'neptune', name: 'Neptune', balanceWeight: 0.5 },
  { id: 'pluto', name: 'Pluto', balanceWeight: 0.5 },
  { id: 'node', name: 'North Node', balanceWeight: 0 },
  { id: 'chiron', name: 'Chiron', balanceWeight: 0 },
]

export const BODY_BY_ID = Object.fromEntries(BODIES.map((b) => [b.id, b])) as Record<BodyId, BodyInfo>

export function norm360(deg: number): number {
  const d = deg % 360
  return d < 0 ? d + 360 : d
}

/** Signed smallest difference a - b in (-180, 180]. */
export function angleDiff(a: number, b: number): number {
  let d = norm360(a - b)
  if (d > 180) d -= 360
  return d
}

export function signOf(lon: number): SignInfo {
  return SIGNS[Math.floor(norm360(lon) / 30) % 12]
}

export function degreeInSign(lon: number): number {
  return norm360(lon) % 30
}

/** 123.456 -> "3°27′" (degrees within sign). */
export function formatDegree(lon: number, opts: { approx?: boolean } = {}): string {
  const inSign = degreeInSign(lon)
  let d = Math.floor(inSign)
  let m = Math.round((inSign - d) * 60)
  if (m === 60) {
    d += 1
    m = 0
  }
  if (d === 30) {
    // Never display 30° — that's 0° of the next sign, but we keep the sign stable.
    d = 29
    m = 59
  }
  if (opts.approx) return `~${d}°`
  return `${d}°${String(m).padStart(2, '0')}′`
}

export function formatPosition(lon: number, opts: { approx?: boolean } = {}): string {
  return `${formatDegree(lon, opts)} ${signOf(lon).name}`
}
