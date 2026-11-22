import type { Chart } from './chart'
import { ramc, trueObliquity } from './ephemeris'
import { norm360, type BodyId } from './zodiac'

const D = Math.PI / 180

/** Unit vector in the observer's horizontal frame: x = north, y = west, z = zenith. */
export type Vec3 = [number, number, number]

/** Where a body is in its daily arc, from rising through culmination, setting and the lowest point. */
export type DiurnalPhase =
  | 'rising'
  | 'climbing'
  | 'culminating'
  | 'descending'
  | 'setting'
  | 'just-set'
  | 'sinking'
  | 'lowest'
  | 'returning'
  | 'pre-rising'
  /** Polar latitudes: above the horizon all day, or below it all day. */
  | 'circumpolar'
  | 'never-rises'

export interface HorizonBody {
  id: BodyId
  /** Altitude above the horizon, degrees (geometric: no refraction, geocentric). */
  alt: number
  /** Azimuth, degrees clockwise from north. */
  az: number
  /** Hour angle, degrees in (-180, 180]; negative = east of the meridian (still climbing). */
  hourAngle: number
  /** Diurnal semi-arc, degrees: 180 = never sets, 0 = never rises. */
  semiArc: number
  above: boolean
  phase: DiurnalPhase
  /** Relative to the Sun: rises before it (oriental) or after it (occidental). Null for the Sun and the node. */
  solarPhase: 'oriental' | 'occidental' | null
  /** Ecliptic longitude ahead of the Sun, degrees [0, 360): < 180 = east of the Sun (evening side). */
  elongation: number
  hor: Vec3
}

export interface HorizonModel {
  bodies: HorizonBody[]
  sect: 'day' | 'night'
  sunAltitude: number
  /** Horizontal-frame vector for any ecliptic position, consistent with the chart's angles. */
  eclToHor: (lon: number, lat?: number) => Vec3
}

/** Ecliptic (of date) → horizontal unit vector, given obliquity, local sidereal time and latitude (degrees). */
export function eclipticToHorizontal(lon: number, lat: number, eps: number, lst: number, phi: number): Vec3 {
  const l = lon * D
  const b = lat * D
  const e = eps * D
  const x = Math.cos(b) * Math.cos(l)
  const y = Math.cos(b) * Math.sin(l) * Math.cos(e) - Math.sin(b) * Math.sin(e)
  const z = Math.cos(b) * Math.sin(l) * Math.sin(e) + Math.sin(b) * Math.cos(e)
  const ra = Math.atan2(y, x)
  const dec = Math.asin(Math.max(-1, Math.min(1, z)))
  const h = lst * D - ra
  const p = phi * D
  const south = Math.cos(dec) * Math.cos(h) * Math.sin(p) - Math.sin(dec) * Math.cos(p)
  const west = Math.cos(dec) * Math.sin(h)
  const up = Math.cos(dec) * Math.cos(h) * Math.cos(p) + Math.sin(dec) * Math.sin(p)
  return [-south, west, up]
}

function equatorial(lon: number, lat: number, eps: number): { ra: number; dec: number } {
  const l = lon * D
  const b = lat * D
  const e = eps * D
  const x = Math.cos(b) * Math.cos(l)
  const y = Math.cos(b) * Math.sin(l) * Math.cos(e) - Math.sin(b) * Math.sin(e)
  const z = Math.cos(b) * Math.sin(l) * Math.sin(e) + Math.sin(b) * Math.cos(e)
  return { ra: norm360(Math.atan2(y, x) / D), dec: Math.asin(Math.max(-1, Math.min(1, z))) / D }
}

export function diurnalPhase(hourAngle: number, semiArc: number): DiurnalPhase {
  const H = hourAngle
  const SA = semiArc
  if (SA >= 180) return 'circumpolar'
  if (SA <= 0) return 'never-rises'
  if (Math.abs(H) < SA) {
    if (H < 0) {
      const f = (H + SA) / SA // 0 at rising → 1 at culmination
      return f < 1 / 3 ? 'rising' : f > 2 / 3 ? 'culminating' : 'climbing'
    }
    const g = H / SA // 0 at culmination → 1 at setting
    return g < 1 / 3 ? 'culminating' : g > 2 / 3 ? 'setting' : 'descending'
  }
  const NSA = 180 - SA
  if (H > 0) {
    const k = (H - SA) / NSA // 0 at setting → 1 at lower culmination
    return k < 1 / 3 ? 'just-set' : k > 2 / 3 ? 'lowest' : 'sinking'
  }
  const k = (-H - SA) / NSA // 0 at rising → 1 at lower culmination (counting backwards)
  return k < 1 / 3 ? 'pre-rising' : k > 2 / 3 ? 'lowest' : 'returning'
}

/**
 * Each body's place in the local sky at birth. Built from the chart's own
 * ecliptic positions, true obliquity and RAMC, so it agrees exactly with the
 * wheel: a planet conjunct the Ascendant sits on the eastern horizon.
 * Returns null when the birth time (and so the horizon) is unknown.
 */
export function horizonModel(chart: Chart): HorizonModel | null {
  if (!chart.timeKnown) return null
  const eps = trueObliquity(chart.utc)
  const lst = ramc(chart.utc, chart.input.place.lon)
  const phi = chart.input.place.lat
  const sun = chart.bodies.find((b) => b.id === 'sun')!

  const bodies = chart.bodies.map((b): HorizonBody => {
    const hor = eclipticToHorizontal(b.lon, b.lat, eps, lst, phi)
    const { ra, dec } = equatorial(b.lon, b.lat, eps)
    let hourAngle = norm360(lst - ra)
    if (hourAngle > 180) hourAngle -= 360
    const x = -Math.tan(phi * D) * Math.tan(dec * D)
    const semiArc = x <= -1 ? 180 : x >= 1 ? 0 : Math.acos(x) / D
    const alt = Math.asin(Math.max(-1, Math.min(1, hor[2]))) / D
    const elong = norm360(b.lon - sun.lon)
    return {
      id: b.id,
      alt,
      az: norm360(Math.atan2(-hor[1], hor[0]) / D),
      hourAngle,
      semiArc,
      above: alt > 0,
      phase: diurnalPhase(hourAngle, semiArc),
      solarPhase: b.id === 'sun' || b.id === 'node' ? null : elong > 180 ? 'oriental' : 'occidental',
      elongation: elong,
      hor,
    }
  })
  const sunAltitude = bodies.find((b) => b.id === 'sun')!.alt
  return {
    bodies,
    sect: sunAltitude > 0 ? 'day' : 'night',
    sunAltitude,
    eclToHor: (lon, lat = 0) => eclipticToHorizontal(lon, lat, eps, lst, phi),
  }
}

export function compassPoint(az: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(az / 45) % 8]
}

/** Altitude in degrees of a horizontal-frame unit vector. */
export function altitudeOf(v: Vec3): number {
  return Math.asin(Math.max(-1, Math.min(1, v[2]))) / D
}

/** Angle between two horizontal-frame unit vectors, degrees: the true distance across the sky. */
export function skySeparation(a: Vec3, b: Vec3): number {
  return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / D
}

export type SectRole =
  | 'sect-light'
  | 'luminary-contrary'
  | 'benefic-of-sect'
  | 'benefic-contrary'
  | 'malefic-of-sect'
  | 'malefic-contrary'
  | 'mercury'

export interface SectStatus {
  team: 'diurnal' | 'nocturnal'
  /** The planet's team matches the chart's sect. */
  inSect: boolean
  /** On its preferred side of the horizon: diurnal planets above by day / below by night, nocturnal the reverse. */
  halb: boolean
  role: SectRole
}

const SECT_ROLES: Partial<Record<BodyId, { team: 'diurnal' | 'nocturnal'; day: SectRole; night: SectRole }>> = {
  sun: { team: 'diurnal', day: 'sect-light', night: 'luminary-contrary' },
  moon: { team: 'nocturnal', day: 'luminary-contrary', night: 'sect-light' },
  jupiter: { team: 'diurnal', day: 'benefic-of-sect', night: 'benefic-contrary' },
  venus: { team: 'nocturnal', day: 'benefic-contrary', night: 'benefic-of-sect' },
  saturn: { team: 'diurnal', day: 'malefic-of-sect', night: 'malefic-contrary' },
  mars: { team: 'nocturnal', day: 'malefic-contrary', night: 'malefic-of-sect' },
}

/** Traditional sect condition for the seven visible planets; null for the modern planets and points. */
export function sectStatus(b: HorizonBody, sect: 'day' | 'night'): SectStatus | null {
  let team: 'diurnal' | 'nocturnal'
  let role: SectRole
  const fixed = SECT_ROLES[b.id]
  if (fixed) {
    team = fixed.team
    role = fixed[sect]
  } else if (b.id === 'mercury') {
    // Mercury joins the day team as a morning star, the night team as an evening star.
    team = b.solarPhase === 'oriental' ? 'diurnal' : 'nocturnal'
    role = 'mercury'
  } else return null
  const day = sect === 'day'
  return {
    team,
    role,
    inSect: (team === 'diurnal') === day,
    halb: team === 'diurnal' ? b.above === day : b.above === !day,
  }
}

export type SunCondition = 'cazimi' | 'combust' | 'under-beams' | 'free'

/** Closeness to the Sun in longitude, with the traditional cazimi (17′), combust (8.5°) and under-the-beams (15°) bands. */
export function solarCondition(b: HorizonBody): { condition: SunCondition; distance: number } | null {
  if (b.id === 'sun' || b.id === 'node') return null
  const distance = Math.min(b.elongation, 360 - b.elongation)
  const condition: SunCondition = distance <= 17 / 60 ? 'cazimi' : distance <= 8.5 ? 'combust' : distance <= 15 ? 'under-beams' : 'free'
  return { condition, distance }
}

export type MoonPhase =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'balsamic'

export function moonPhase(elongation: number): MoonPhase {
  const e = norm360(elongation)
  if (e < 10 || e >= 350) return 'new'
  if (e < 80) return 'waxing-crescent'
  if (e < 100) return 'first-quarter'
  if (e < 170) return 'waxing-gibbous'
  if (e < 190) return 'full'
  if (e < 260) return 'waning-gibbous'
  if (e < 280) return 'last-quarter'
  return 'balsamic'
}

export type SkyEventKind = 'rise' | 'culminate' | 'set' | 'lower'

export interface SkyEvent {
  kind: SkyEventKind
  /** Hours from birth to the event: negative = it had already happened. Approximate (sidereal rate). */
  hours: number
}

/** The nearest of the body's four daily turning points (rising, culmination, setting, lower culmination). */
export function nearestEvent(b: HorizonBody): SkyEvent {
  const events: [SkyEventKind, number][] = [
    ['culminate', 0],
    ['lower', 180],
  ]
  if (b.semiArc > 0 && b.semiArc < 180) events.push(['rise', -b.semiArc], ['set', b.semiArc])
  let best: SkyEvent = { kind: 'culminate', hours: Infinity }
  for (const [kind, h] of events) {
    let delta = norm360(h - b.hourAngle)
    if (delta > 180) delta -= 360
    // Hour angle advances 15° per sidereal hour; 0.9973 converts to clock hours.
    const hours = (delta / 15) * 0.99727
    if (Math.abs(hours) < Math.abs(best.hours)) best = { kind, hours }
  }
  return best
}

/** Bodies bright enough to see without a telescope. */
export const NAKED_EYE: ReadonlySet<BodyId> = new Set(['moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'])

export type Visibility = 'visible' | 'twilight' | 'daylight' | 'below' | 'faint' | 'point' | 'sun'

/** Could someone looking up at the birth moment have seen it? */
export function visibility(b: HorizonBody, sunAltitude: number): Visibility {
  if (b.id === 'sun') return 'sun'
  if (b.id === 'node') return 'point'
  if (!NAKED_EYE.has(b.id)) return 'faint'
  if (b.alt <= 2) return 'below'
  const sc = solarCondition(b)
  if (b.id !== 'moon' && sc && sc.condition !== 'free') return 'daylight'
  if (sunAltitude > 0) return b.id === 'moon' ? 'visible' : 'daylight'
  if (sunAltitude > -6) return 'twilight'
  return 'visible'
}
