import { Body, Equator, Horizon, MakeTime, Observer } from 'astronomy-engine'
import { describe, expect, it } from 'vitest'
import { computeChart } from '../chart'
import { diurnalPhase, horizonModel, moonPhase, nearestEvent, sectStatus, solarCondition, visibility } from '../horizon'

const NYC = { name: 'New York', lat: 40.7128, lon: -74.006, timeZone: 'America/New_York' }
const SYD = { name: 'Sydney', lat: -33.87, lon: 151.21, timeZone: 'Australia/Sydney' }

const alt = (v: [number, number, number]) => (Math.asin(v[2]) * 180) / Math.PI

describe('horizon model', () => {
  for (const [label, place, date, time] of [
    ['New York evening', NYC, '1990-05-20', '21:15'],
    ['Sydney morning', SYD, '2001-11-03', '07:40'],
  ] as const) {
    const chart = computeChart({ date, time, place })
    const m = horizonModel(chart)!

    it(`${label}: the Ascendant and Descendant lie on the horizon, east and west`, () => {
      const asc = m.eclToHor(chart.angles!.asc)
      const dsc = m.eclToHor(chart.angles!.dsc)
      expect(Math.abs(alt(asc))).toBeLessThan(1e-6)
      expect(Math.abs(alt(dsc))).toBeLessThan(1e-6)
      expect(asc[1]).toBeLessThan(0) // east = negative west component
      expect(dsc[1]).toBeGreaterThan(0)
    })

    it(`${label}: the Midheaven is on the upper meridian`, () => {
      const mc = m.eclToHor(chart.angles!.mc)
      expect(Math.abs(mc[1])).toBeLessThan(1e-6)
    })

    it(`${label}: altitudes match astronomy-engine within a degree`, () => {
      const time = MakeTime(chart.utc)
      const obs = new Observer(place.lat, place.lon, 0)
      for (const [id, body] of [['sun', Body.Sun], ['jupiter', Body.Jupiter], ['saturn', Body.Saturn]] as const) {
        const eq = Equator(body, time, obs, true, false)
        const ref = Horizon(time, obs, eq.ra, eq.dec)
        const got = m.bodies.find((b) => b.id === id)!
        expect(Math.abs(got.alt - ref.altitude)).toBeLessThan(1)
        const dAz = Math.abs(((got.az - ref.azimuth + 540) % 360) - 180)
        expect(dAz * Math.cos((ref.altitude * Math.PI) / 180)).toBeLessThan(1)
      }
    })

    it(`${label}: sect follows the Sun's altitude and the houses`, () => {
      const sun = chart.bodies.find((b) => b.id === 'sun')!
      const aboveByHouse = sun.house! >= 7
      expect(m.sect === 'day').toBe(aboveByHouse)
    })
  }

  it('is unavailable without a birth time', () => {
    expect(horizonModel(computeChart({ date: '1990-05-20', time: null, place: NYC }))).toBeNull()
  })
})

describe('diurnal phase', () => {
  it('walks the full daily arc', () => {
    const sa = 100
    expect(diurnalPhase(-95, sa)).toBe('rising')
    expect(diurnalPhase(-50, sa)).toBe('climbing')
    expect(diurnalPhase(-5, sa)).toBe('culminating')
    expect(diurnalPhase(20, sa)).toBe('culminating')
    expect(diurnalPhase(50, sa)).toBe('descending')
    expect(diurnalPhase(95, sa)).toBe('setting')
    expect(diurnalPhase(110, sa)).toBe('just-set')
    expect(diurnalPhase(140, sa)).toBe('sinking')
    expect(diurnalPhase(178, sa)).toBe('lowest')
    expect(diurnalPhase(-170, sa)).toBe('lowest')
    expect(diurnalPhase(-140, sa)).toBe('returning')
    expect(diurnalPhase(-105, sa)).toBe('pre-rising')
  })

  it('handles bodies that never set', () => {
    expect(diurnalPhase(179, 180)).toBe('circumpolar')
    expect(diurnalPhase(-10, 0)).toBe('never-rises')
  })
})

describe('sky condition', () => {
  const chart = computeChart({ date: '1990-05-20', time: '21:15', place: NYC })
  const m = horizonModel(chart)!
  const body = (id: string) => m.bodies.find((b) => b.id === id)!

  it('assigns sect roles for a night chart', () => {
    expect(m.sect).toBe('night')
    expect(sectStatus(body('moon'), m.sect)!.role).toBe('sect-light')
    expect(sectStatus(body('venus'), m.sect)!.role).toBe('benefic-of-sect')
    expect(sectStatus(body('saturn'), m.sect)!.role).toBe('malefic-contrary')
    expect(sectStatus(body('jupiter'), m.sect)!.inSect).toBe(false)
    expect(sectStatus(body('uranus'), m.sect)).toBeNull()
  })

  it('puts Mercury on the team its solar phase implies', () => {
    const merc = body('mercury')
    expect(sectStatus(merc, 'day')!.team).toBe(merc.solarPhase === 'oriental' ? 'diurnal' : 'nocturnal')
  })

  it('applies halb: diurnal above by day, nocturnal above by night', () => {
    const fake = (id: 'jupiter' | 'venus', above: boolean) => ({ ...body(id), above })
    expect(sectStatus(fake('jupiter', true), 'day')!.halb).toBe(true)
    expect(sectStatus(fake('jupiter', true), 'night')!.halb).toBe(false)
    expect(sectStatus(fake('venus', true), 'night')!.halb).toBe(true)
    expect(sectStatus(fake('venus', false), 'day')!.halb).toBe(true)
  })

  it('classifies closeness to the Sun', () => {
    const at = (elongation: number) => solarCondition({ ...body('mars'), elongation })!.condition
    expect(at(0.2)).toBe('cazimi')
    expect(at(359)).toBe('combust')
    expect(at(12)).toBe('under-beams')
    expect(at(40)).toBe('free')
    expect(solarCondition(body('sun'))).toBeNull()
  })

  it('names Moon phases by elongation', () => {
    expect(moonPhase(3)).toBe('new')
    expect(moonPhase(45)).toBe('waxing-crescent')
    expect(moonPhase(180)).toBe('full')
    expect(moonPhase(300)).toBe('balsamic')
  })

  it('finds the nearest daily turning point', () => {
    const b = { ...body('mars'), hourAngle: -95, semiArc: 100 }
    const e = nearestEvent(b)
    expect(e.kind).toBe('rise')
    expect(e.hours).toBeCloseTo(-5 / 15 * 0.99727, 5) // rose 20 minutes earlier
    expect(nearestEvent({ ...b, hourAngle: 10 }).kind).toBe('culminate')
    expect(nearestEvent({ ...b, hourAngle: 10 }).hours).toBeLessThan(0)
    expect(nearestEvent({ ...b, semiArc: 180, hourAngle: 170 }).kind).toBe('lower')
  })

  it('judges naked-eye visibility', () => {
    expect(visibility(body('node'), m.sunAltitude)).toBe('point')
    expect(visibility(body('pluto'), m.sunAltitude)).toBe('faint')
    expect(visibility({ ...body('jupiter'), alt: 20, elongation: 50 }, -20)).toBe('visible')
    expect(visibility({ ...body('jupiter'), alt: 20, elongation: 50 }, 10)).toBe('daylight')
    expect(visibility({ ...body('moon'), alt: 20, elongation: 50 }, 10)).toBe('visible')
    expect(visibility({ ...body('jupiter'), alt: -5, elongation: 50 }, -20)).toBe('below')
  })
})
