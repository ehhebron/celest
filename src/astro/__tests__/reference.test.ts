import { describe, expect, it } from 'vitest'
import { MakeTime, Rotation_EQJ_ECT, RotateVector, Vector } from 'astronomy-engine'
import { computeChart } from '../chart'
import { ramc, trueObliquity } from '../ephemeris'
import { computeAngles, placidusCusps } from '../houses'
import { resolveBirthTime } from '../time'
import { angleDiff, norm360, type BodyId } from '../zodiac'
import { REFERENCE_CHARTS } from './referenceCharts'
import referenceData from './referenceData.json'

const D = Math.PI / 180
const truth = referenceData.charts as Record<string, Record<string, number>>
const TOL = 0.1 // degrees

const BODY_IDS: BodyId[] = [
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter',
  'saturn', 'uranus', 'neptune', 'pluto', 'chiron',
]

function chartFor(c: (typeof REFERENCE_CHARTS)[number], houseSystem: 'whole-sign' | 'placidus' = 'whole-sign') {
  return computeChart(
    { date: c.date, time: c.time, place: { name: c.label, lat: c.lat, lon: c.lon, timeZone: c.timeZone } },
    { houseSystem },
  )
}

/** Horizons gives the Moon's osculating node in the J2000 ecliptic; move it to the true ecliptic of date. */
function nodeOfDate(nodeJ2000: number, inclination: number, utc: Date): number {
  const om = nodeJ2000 * D
  const i = inclination * D
  // Orbit normal in J2000 ecliptic coordinates.
  const h = [Math.sin(i) * Math.sin(om), -Math.sin(i) * Math.cos(om), Math.cos(i)]
  const e0 = 23.4392911 * D
  const eqj = new Vector(
    h[0],
    h[1] * Math.cos(e0) - h[2] * Math.sin(e0),
    h[1] * Math.sin(e0) + h[2] * Math.cos(e0),
    MakeTime(utc),
  )
  const ect = RotateVector(Rotation_EQJ_ECT(MakeTime(utc)), eqj)
  return norm360(Math.atan2(ect.x, -ect.y) / D)
}

describe.each(REFERENCE_CHARTS)('$label', (c) => {
  const t = truth[c.id]

  it(`resolves local time to UTC (${c.why})`, () => {
    const r = resolveBirthTime({ date: c.date, time: c.time, timeZone: c.timeZone, longitude: c.lon })
    expect(Math.abs(r.utc.getTime() - Date.parse(c.expectedUtc))).toBeLessThan(1000)
    expect(r.note).toBe(c.expectedNote)
  })

  it.each(BODY_IDS)('%s within 0.1° of JPL Horizons', (id) => {
    const chart = chartFor(c)
    const body = chart.bodies.find((b) => b.id === id)!
    expect(body, id).toBeDefined()
    expect(Math.abs(angleDiff(body.lon, t[id]))).toBeLessThan(TOL)
  })

  it('true node within 0.1° of the Moon’s osculating node (Horizons)', () => {
    const chart = chartFor(c)
    const node = chart.bodies.find((b) => b.id === 'node')!
    const expected = nodeOfDate(t.nodeJ2000, t.inclination, chart.utc)
    expect(Math.abs(angleDiff(node.lon, expected))).toBeLessThan(TOL)
  })

  it('local sidereal time matches Horizons within 0.005°', () => {
    const chart = chartFor(c)
    expect(Math.abs(angleDiff(ramc(chart.utc, c.lon), t.lastDeg))).toBeLessThan(0.005)
  })

  it('Ascendant is on the eastern horizon and MC on the meridian (using Horizons sidereal time)', () => {
    const chart = chartFor(c)
    const eps = trueObliquity(chart.utc) * D
    const phi = c.lat * D
    const toEq = (lon: number) => {
      const l = lon * D
      return {
        ra: norm360(Math.atan2(Math.sin(l) * Math.cos(eps), Math.cos(l)) / D),
        dec: Math.asin(Math.sin(eps) * Math.sin(l)),
      }
    }
    const asc = toEq(chart.angles!.asc)
    const H = (t.lastDeg - asc.ra) * D
    const alt = Math.asin(Math.sin(phi) * Math.sin(asc.dec) + Math.cos(phi) * Math.cos(asc.dec) * Math.cos(H))
    expect(Math.abs(alt / D)).toBeLessThan(TOL)
    expect(Math.sin(H)).toBeLessThan(0) // rising (east), not setting

    const mc = toEq(chart.angles!.mc)
    expect(Math.abs(angleDiff(mc.ra, t.lastDeg))).toBeLessThan(TOL)
    // MC is the upper culmination: the ecliptic point above the horizon side of the meridian.
    const mcAlt = Math.sin(phi) * Math.sin(mc.dec) + Math.cos(phi) * Math.cos(mc.dec)
    expect(mcAlt).toBeGreaterThan(0)
  })

  it('Placidus cusps satisfy semi-arc trisection', () => {
    const chart = chartFor(c, 'placidus')
    const r = t.lastDeg
    const eps = trueObliquity(chart.utc)
    const cusps = placidusCusps(r, eps, c.lat)
    const angles = computeAngles(r, eps, c.lat)
    expect(Math.abs(angleDiff(cusps[0], angles.asc))).toBeLessThan(1e-9)
    expect(Math.abs(angleDiff(cusps[9], angles.mc))).toBeLessThan(1e-9)
    const e = eps * D
    const check = (lon: number, fraction: number, diurnal: boolean) => {
      const l = lon * D
      const ra = norm360(Math.atan2(Math.sin(l) * Math.cos(e), Math.cos(l)) / D)
      const dec = Math.asin(Math.sin(e) * Math.sin(l))
      const ad = Math.asin(Math.tan(c.lat * D) * Math.tan(dec)) / D
      const target = diurnal ? r + fraction * (90 + ad) : r + 180 - fraction * (90 - ad)
      expect(Math.abs(angleDiff(ra, target))).toBeLessThan(1e-6)
    }
    check(cusps[10], 1 / 3, true)
    check(cusps[11], 2 / 3, true)
    check(cusps[1], 2 / 3, false)
    check(cusps[2], 1 / 3, false)
    // Cusps proceed counter-clockwise through the zodiac.
    for (let i = 0; i < 12; i++) {
      expect(norm360(cusps[(i + 1) % 12] - cusps[i])).toBeLessThan(180)
    }
  })
})

describe('obliquity', () => {
  it('matches the IAU 2006 mean obliquity within nutation (≤ 0.003°)', () => {
    for (const iso of ['1900-01-01T00:00:00Z', '1961-07-01T00:00:00Z', '2030-01-01T00:00:00Z']) {
      const T = (MakeTime(new Date(iso)).tt) / 36525
      const mean = (84381.406 - 46.836769 * T - 0.0001831 * T * T) / 3600
      expect(Math.abs(trueObliquity(new Date(iso)) - mean)).toBeLessThan(0.003)
    }
  })
})
