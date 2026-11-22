import {
  Body,
  Equator,
  Illumination,
  MakeTime,
  Observer,
  Rotation_EQJ_HOR,
  RotateVector,
  Vector,
} from 'astronomy-engine'
import type { BodyId } from '../../astro/zodiac'

export interface SkyData {
  attribution: string
  stars: [number, number, number, number][]
  names: Record<string, string>
  lines: { id: string; l: [number, number][][] }[]
}

/** Unit vector in the horizontal frame: x = north, y = west, z = zenith. */
export type Hor = [number, number, number]

export interface SkyBody {
  id: BodyId
  name: string
  hor: Hor
  mag: number
}

export interface SkyModel {
  stars: { hor: Hor; mag: number; bv: number; name?: string }[]
  lines: { id: string; segs: Hor[][] }[]
  bodies: SkyBody[]
  sun: Hor
  moon: { hor: Hor; fraction: number; phaseAngle: number }
  sunAltitude: number
}

const D = Math.PI / 180

const SKY_BODIES: [BodyId, Body, string][] = [
  ['mercury', Body.Mercury, 'Mercury'],
  ['venus', Body.Venus, 'Venus'],
  ['mars', Body.Mars, 'Mars'],
  ['jupiter', Body.Jupiter, 'Jupiter'],
  ['saturn', Body.Saturn, 'Saturn'],
  ['uranus', Body.Uranus, 'Uranus'],
  ['neptune', Body.Neptune, 'Neptune'],
]

export function buildSky(data: SkyData, utc: Date, lat: number, lon: number): SkyModel {
  const time = MakeTime(utc)
  const observer = new Observer(lat, lon, 0)
  const rot = Rotation_EQJ_HOR(time, observer)

  const toHor = (raDeg: number, decDeg: number): Hor => {
    const ra = raDeg * D
    const dec = decDeg * D
    const v = RotateVector(rot, new Vector(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec), time))
    return [v.x, v.y, v.z]
  }
  const bodyHor = (body: Body): Hor => {
    const eq = Equator(body, time, observer, false, true) // J2000, topocentric
    return toHor(eq.ra * 15, eq.dec)
  }

  const stars = data.stars.map(([ra, dec, mag, bv], i) => ({
    hor: toHor(ra, dec),
    mag,
    bv,
    name: data.names[i],
  }))
  const lines = data.lines.map((c) => ({ id: c.id, segs: c.l.map((seg) => seg.map(([ra, dec]) => toHor(ra, dec))) }))
  const bodies: SkyBody[] = SKY_BODIES.map(([id, body, name]) => ({
    id,
    name,
    hor: bodyHor(body),
    mag: Illumination(body, time).mag,
  }))
  const sun = bodyHor(Body.Sun)
  const moonIllum = Illumination(Body.Moon, time)
  return {
    stars,
    lines,
    bodies,
    sun,
    moon: { hor: bodyHor(Body.Moon), fraction: moonIllum.phase_fraction, phaseAngle: moonIllum.phase_angle },
    sunAltitude: Math.asin(sun[2]) / D,
  }
}

export function altAz(h: Hor): { alt: number; az: number } {
  return {
    alt: Math.asin(Math.max(-1, Math.min(1, h[2]))) / D,
    az: (Math.atan2(-h[1], h[0]) / D + 360) % 360,
  }
}

export function compass(az: number): string {
  const dirs = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']
  return dirs[Math.round(az / 45) % 8]
}

export function moonPhaseName(fraction: number, waxing: boolean): string {
  if (fraction < 0.03) return 'new Moon'
  if (fraction > 0.97) return 'full Moon'
  if (Math.abs(fraction - 0.5) < 0.06) return waxing ? 'first-quarter Moon' : 'last-quarter Moon'
  if (fraction < 0.5) return waxing ? 'waxing crescent' : 'waning crescent'
  return waxing ? 'waxing gibbous' : 'waning gibbous'
}

/** B−V colour index to an approximate star colour. */
export function starColor(bv: number): string {
  if (bv < 0) return '#c9d8ff'
  if (bv < 0.3) return '#e6ecff'
  if (bv < 0.6) return '#fbf6ea'
  if (bv < 1.0) return '#ffe9c4'
  if (bv < 1.4) return '#ffd29b'
  return '#ffbf85'
}
