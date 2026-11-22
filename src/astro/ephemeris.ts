import {
  AstroTime,
  Body,
  GeoMoonState,
  GeoVector,
  HelioVector,
  MakeTime,
  Rotation_EQD_ECT,
  Rotation_EQJ_ECT,
  RotateVector,
  SiderealTime,
  Vector,
} from 'astronomy-engine'
import { CHIRON_JD0_TDB, CHIRON_STEP_DAYS, CHIRON_X, CHIRON_Y, CHIRON_Z } from './data/chironTable'
import { norm360, type BodyId } from './zodiac'

const RAD = 180 / Math.PI
/** Julian date of the astronomy-engine epoch (J2000.0). */
const J2000_JD = 2451545.0
const LIGHT_DAYS_PER_AU = 0.0057755183

const ENGINE_BODY: Partial<Record<BodyId, Body>> = {
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto,
}

export interface BodyPosition {
  /** Apparent geocentric ecliptic longitude of date, degrees [0, 360). */
  lon: number
  /** Ecliptic latitude, degrees. */
  lat: number
  /** Longitude speed, degrees/day (negative = retrograde). */
  speed: number
}

export function toAstroTime(date: Date | AstroTime): AstroTime {
  return date instanceof AstroTime ? date : MakeTime(date)
}

function eclipticOfDate(eqj: Vector, time: AstroTime): { lon: number; lat: number } {
  const v = RotateVector(Rotation_EQJ_ECT(time), eqj)
  const r = Math.hypot(v.x, v.y, v.z)
  return { lon: norm360(Math.atan2(v.y, v.x) * RAD), lat: Math.asin(v.z / r) * RAD }
}

export const CHIRON_RANGE = {
  start: new Date(Date.UTC(1800, 0, 1)),
  end: new Date(Date.UTC(2150, 0, 1)),
}

function chironHelio(time: AstroTime): Vector {
  // AstroTime.tt is days since J2000 in TT (≈ TDB to within 2 ms).
  const jd = time.tt + J2000_JD
  const f = (jd - CHIRON_JD0_TDB) / CHIRON_STEP_DAYS
  const n = CHIRON_X.length
  if (f < 1 || f > n - 3) {
    throw new RangeError('Chiron is only available between 1800 and 2150')
  }
  // 4-point Lagrange interpolation around the bracketing interval.
  const i = Math.floor(f) - 1
  const t = f - i
  const w = [
    (-(t - 1) * (t - 2) * (t - 3)) / 6,
    (t * (t - 2) * (t - 3)) / 2,
    (-t * (t - 1) * (t - 3)) / 2,
    (t * (t - 1) * (t - 2)) / 6,
  ]
  const interp = (arr: number[]) =>
    (w[0] * arr[i] + w[1] * arr[i + 1] + w[2] * arr[i + 2] + w[3] * arr[i + 3]) * 1e-6
  return new Vector(interp(CHIRON_X), interp(CHIRON_Y), interp(CHIRON_Z), time)
}

function chironGeo(time: AstroTime): Vector {
  const earth = HelioVector(Body.Earth, time)
  // Light-time iteration (Chiron is 8–19 AU away: ~1-2.6 h).
  let c = chironHelio(time)
  for (let k = 0; k < 2; k++) {
    const dist = Math.hypot(c.x - earth.x, c.y - earth.y, c.z - earth.z)
    c = chironHelio(time.AddDays(-dist * LIGHT_DAYS_PER_AU))
  }
  // Annual aberration: shift by Earth's velocity / c (first order).
  const e2 = HelioVector(Body.Earth, time.AddDays(0.01))
  const k = LIGHT_DAYS_PER_AU / 0.01
  const g = new Vector(c.x - earth.x, c.y - earth.y, c.z - earth.z, time)
  const d = Math.hypot(g.x, g.y, g.z)
  return new Vector(
    g.x + d * (e2.x - earth.x) * k,
    g.y + d * (e2.y - earth.y) * k,
    g.z + d * (e2.z - earth.z) * k,
    time,
  )
}

/**
 * True (osculating) lunar node: the ascending node of the Moon's
 * instantaneous geocentric orbit on the ecliptic of date.
 */
function trueNode(time: AstroTime): { lon: number; lat: number } {
  const s = GeoMoonState(time)
  const rot = Rotation_EQJ_ECT(time)
  const r = RotateVector(rot, new Vector(s.x, s.y, s.z, time))
  const v = RotateVector(rot, new Vector(s.vx, s.vy, s.vz, time))
  const hx = r.y * v.z - r.z * v.y
  const hy = r.z * v.x - r.x * v.z
  return { lon: norm360(Math.atan2(hx, -hy) * RAD), lat: 0 }
}

function rawPosition(id: BodyId, time: AstroTime): { lon: number; lat: number } {
  if (id === 'node') return trueNode(time)
  if (id === 'chiron') return eclipticOfDate(chironGeo(time), time)
  const body = ENGINE_BODY[id]
  if (!body) throw new Error(`Unknown body ${id}`)
  return eclipticOfDate(GeoVector(body, time, true), time)
}

const SPEED_STEP: Partial<Record<BodyId, number>> = { moon: 0.05, node: 0.5 }

export function bodyPosition(id: BodyId, date: Date | AstroTime): BodyPosition {
  const time = toAstroTime(date)
  const p = rawPosition(id, time)
  const h = SPEED_STEP[id] ?? 0.25
  const before = rawPosition(id, time.AddDays(-h)).lon
  const after = rawPosition(id, time.AddDays(h)).lon
  let delta = after - before
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return { lon: p.lon, lat: p.lat, speed: delta / (2 * h) }
}

/** Longitude only; cheaper (no speed). */
export function bodyLongitude(id: BodyId, date: Date | AstroTime): number {
  return rawPosition(id, toAstroTime(date)).lon
}

export function isBodyAvailable(id: BodyId, date: Date): boolean {
  if (id !== 'chiron') return true
  return date >= CHIRON_RANGE.start && date < CHIRON_RANGE.end
}

/** True obliquity of the ecliptic, degrees. */
export function trueObliquity(date: Date | AstroTime): number {
  const m = Rotation_EQD_ECT(toAstroTime(date)).rot
  return Math.acos(m[2][2]) * RAD
}

/** Greenwich apparent sidereal time, degrees. */
export function gastDegrees(date: Date | AstroTime): number {
  return SiderealTime(toAstroTime(date)) * 15
}

/** Local apparent sidereal time (RAMC), degrees. */
export function ramc(date: Date | AstroTime, longitude: number): number {
  return norm360(gastDegrees(date) + longitude)
}
