import { toAstroTime } from '../ephemeris'
import type { AstroTime } from 'astronomy-engine'

/*
 * Lahiri (Chitrapaksha) ayanamsa: the offset between the tropical zodiac and
 * the sidereal zodiac used in Jyotish, defined so that the star Spica (Chitra)
 * sits at 0° Libra. Reference epoch and value as adopted by the Indian
 * Calendar Reform Committee (and used by the Swiss Ephemeris):
 * 23°15′00.658″ − 0.004658035° at JD 2435553.5 (21 March 1956), carried
 * forward with IAU general precession in longitude.
 */

const T0 = (2435553.5 - 2451545.0) / 36525
const AYAN_T0 = 23.250182778 - 0.004658035
const D = Math.PI / 180

/** General precession in longitude since J2000, arcseconds (IAU 2006, to T²). */
const precession = (T: number) => 5028.796195 * T + 1.1054348 * T * T

/** Julian centuries (TT) since J2000. */
const centuries = (time: AstroTime) => time.tt / 36525

/** Nutation in longitude, degrees (four largest terms; good to about half an arcsecond). */
export function nutationLongitude(date: Date | AstroTime): number {
  const T = centuries(toAstroTime(date))
  const omega = (125.04452 - 1934.136261 * T) * D
  const L = (280.4665 + 36000.7698 * T) * D
  const Lm = (218.3165 + 481267.8813 * T) * D
  const arcsec = -17.2 * Math.sin(omega) - 1.32 * Math.sin(2 * L) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * omega)
  return arcsec / 3600
}

/** Mean Lahiri ayanamsa, degrees. */
export function lahiriMean(date: Date | AstroTime): number {
  const T = centuries(toAstroTime(date))
  return AYAN_T0 + (precession(T) - precession(T0)) / 3600
}

/**
 * True Lahiri ayanamsa, degrees: subtract this from an apparent (true-equinox)
 * tropical longitude to get the sidereal longitude.
 */
export function lahiri(date: Date | AstroTime): number {
  return lahiriMean(date) + nutationLongitude(date)
}

/** Mean lunar node (Rahu), tropical longitude of date in degrees (Meeus 47.7). */
export function meanNode(date: Date | AstroTime): number {
  const T = centuries(toAstroTime(date))
  const omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T * T * T * T) / 60616000
  // Apparent: add nutation so it is on the same footing as the planets.
  return (((omega + nutationLongitude(date)) % 360) + 360) % 360
}
