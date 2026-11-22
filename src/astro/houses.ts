import { norm360 } from './zodiac'

const D = Math.PI / 180

export type HouseSystem = 'whole-sign' | 'placidus'

export interface Angles {
  asc: number
  mc: number
  /** Descendant / IC for convenience. */
  dsc: number
  ic: number
}

/** Ascendant and Midheaven from RAMC, true obliquity and geographic latitude. */
export function computeAngles(ramcDeg: number, obliquity: number, latitude: number): Angles {
  const r = ramcDeg * D
  const e = obliquity * D
  const phi = latitude * D
  const mc = norm360(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(e)) / D)
  const asc = norm360(
    Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(e) + Math.tan(phi) * Math.sin(e))) / D,
  )
  return { asc, mc, dsc: norm360(asc + 180), ic: norm360(mc + 180) }
}

export function wholeSignCusps(asc: number): number[] {
  const start = Math.floor(norm360(asc) / 30) * 30
  return Array.from({ length: 12 }, (_, i) => norm360(start + i * 30))
}

/** Ecliptic longitude of the point on the ecliptic with right ascension `ra`. */
function raToEcliptic(raDeg: number, e: number): number {
  const ra = raDeg * D
  return norm360(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(e)) / D)
}

export class PlacidusUnavailableError extends Error {}

/**
 * Placidus cusps by semi-arc trisection. Returns 12 cusps starting with the
 * Ascendant. Throws PlacidusUnavailableError inside the polar circles, where
 * some ecliptic degrees never rise or set and the system is undefined.
 */
export function placidusCusps(ramcDeg: number, obliquity: number, latitude: number): number[] {
  const e = obliquity * D
  const phi = latitude * D
  if (Math.abs(latitude) >= 90 - obliquity) {
    throw new PlacidusUnavailableError('Placidus is undefined at this latitude')
  }
  const { asc, mc } = computeAngles(ramcDeg, obliquity, latitude)

  // f = fraction of semi-arc; above = measured from MC (diurnal) or IC (nocturnal).
  /** Target right ascension for an ecliptic longitude, given its own semi-arc. */
  const targetRa = (lon: number, fraction: number, diurnal: boolean): number => {
    const decl = Math.asin(Math.sin(e) * Math.sin(lon * D))
    const x = Math.tan(phi) * Math.tan(decl)
    if (Math.abs(x) >= 1) throw new PlacidusUnavailableError('Placidus did not converge')
    const ad = Math.asin(x) / D // ascensional difference
    return diurnal ? ramcDeg + fraction * (90 + ad) : ramcDeg + 180 - fraction * (90 - ad)
  }
  const raOf = (lon: number) =>
    Math.atan2(Math.sin(lon * D) * Math.cos(e), Math.cos(lon * D)) / D
  const wrap = (d: number) => ((d % 360) + 540) % 360 - 180

  const cusp = (fraction: number, diurnal: boolean): number => {
    // A few fixed-point steps to get close, then Newton's method to converge.
    let lon = raToEcliptic(diurnal ? ramcDeg + fraction * 90 : ramcDeg + 180 - fraction * 90, e)
    for (let iter = 0; iter < 8; iter++) lon = raToEcliptic(targetRa(lon, fraction, diurnal), e)
    for (let iter = 0; iter < 50; iter++) {
      const f = wrap(raOf(lon) - targetRa(lon, fraction, diurnal))
      if (Math.abs(f) < 1e-10) break
      const h = 1e-5
      const df = (wrap(raOf(lon + h) - targetRa(lon + h, fraction, diurnal)) - f) / h
      if (!Number.isFinite(df) || Math.abs(df) < 1e-12) break
      lon = norm360(lon - f / df)
    }
    return lon
  }

  const c11 = cusp(1 / 3, true)
  const c12 = cusp(2 / 3, true)
  const c2 = cusp(2 / 3, false)
  const c3 = cusp(1 / 3, false)
  const cusps = [asc, c2, c3, norm360(mc + 180), 0, 0, 0, 0, 0, mc, c11, c12]
  cusps[4] = norm360(c11 + 180)
  cusps[5] = norm360(c12 + 180)
  cusps[6] = norm360(asc + 180)
  cusps[7] = norm360(c2 + 180)
  cusps[8] = norm360(c3 + 180)
  return cusps
}

/** 1-based house number of a longitude given 12 cusps. */
export function houseOf(lon: number, cusps: number[]): number {
  const l = norm360(lon)
  for (let i = 0; i < 12; i++) {
    const start = cusps[i]
    const end = cusps[(i + 1) % 12]
    const span = norm360(end - start)
    if (norm360(l - start) < span) return i + 1
  }
  return 1
}
