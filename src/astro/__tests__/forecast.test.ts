import { EclipseKind } from 'astronomy-engine'
import { describe, expect, it } from 'vitest'
import { computeChart } from '../chart'
import { bodyLongitude } from '../ephemeris'
import {
  buildForecast,
  eventDate,
  ingresses,
  lunations,
  nextSolarReturn,
  progressedDate,
  progressedMoon,
  stations,
  transitWindows,
} from '../forecast'
import { angleDiff } from '../zodiac'

const HOUR = 3600000
const DAY = 24 * HOUR
const place = { name: 'New York', lat: 40.7128, lon: -74.006, timeZone: 'America/New_York' }
const chart = computeChart({ date: '1990-05-20', time: '14:30', place })
const d = (iso: string) => new Date(iso)

describe('lunations and eclipses', () => {
  const list = lunations(chart, d('2024-03-25T00:00:00Z'), d('2025-03-20T00:00:00Z'))

  it('finds the 8 April 2024 total solar eclipse (New Moon 18:21 UTC)', () => {
    const nm = list.find((l) => l.phase === 'new' && Math.abs(l.date.getTime() - Date.parse('2024-04-08T18:21:00Z')) < HOUR)
    expect(nm).toBeDefined()
    expect(nm!.eclipse).toEqual({ type: 'solar', kind: EclipseKind.Total })
    expect(nm!.sign).toBe('aries')
  })

  it('finds the 14 March 2025 total lunar eclipse (Full Moon 06:55 UTC)', () => {
    const fm = list.find((l) => l.phase === 'full' && Math.abs(l.date.getTime() - Date.parse('2025-03-14T06:55:00Z')) < HOUR)
    expect(fm).toBeDefined()
    expect(fm!.eclipse?.type).toBe('lunar')
    expect(fm!.eclipse?.kind).toBe(EclipseKind.Total)
    expect(fm!.sign).toBe('virgo')
  })

  it('has ~12–13 of each phase in a year and only marks real eclipses', () => {
    expect(list.filter((l) => l.phase === 'new').length).toBeGreaterThanOrEqual(12)
    expect(list.filter((l) => l.phase === 'full').length).toBeGreaterThanOrEqual(12)
    // Apr 2024–Mar 2025: solar Apr 8 & Oct 2; lunar Mar 25 2024 (just before), Sep 18, Mar 14.
    expect(list.filter((l) => l.eclipse?.type === 'solar').length).toBe(2)
  })
})

describe('retrograde stations', () => {
  it('finds Mercury’s April 2024 retrograde (stations Apr 1 ~22:14 UTC, Apr 25 ~12:54 UTC)', () => {
    const list = stations(chart, d('2024-03-20T00:00:00Z'), d('2024-05-05T00:00:00Z')).filter((s) => s.body === 'mercury')
    expect(list.map((s) => s.direction)).toEqual(['retrograde', 'direct'])
    expect(Math.abs(list[0].date.getTime() - Date.parse('2024-04-01T22:14:00Z'))).toBeLessThan(3 * HOUR)
    expect(Math.abs(list[1].date.getTime() - Date.parse('2024-04-25T12:54:00Z'))).toBeLessThan(3 * HOUR)
  })
})

describe('transit windows', () => {
  it('groups a retrograde triple pass into one window with three exact hits', () => {
    // Saturn stations retrograde ~Jun 29 2024 at ~19°25′ Pisces and direct ~Nov 15 2024 at ~12°45′ Pisces.
    // A natal point at 16° Pisces is crossed forward, backward, then forward again.
    const natal = [{ id: 'sun', lon: 346 }]
    const ws = transitWindows(chart, d('2024-01-01T00:00:00Z'), d('2025-06-01T00:00:00Z'), natal, ['saturn'])
    const conj = ws.filter((w) => w.type === 'conjunction')
    expect(conj).toHaveLength(1)
    expect(conj[0].exacts).toHaveLength(3)
    for (const e of conj[0].exacts) expect(Math.abs(angleDiff(bodyLongitude('saturn', e), 346))).toBeLessThan(0.001)
    // Starts before the first hit, ends after the last.
    expect(conj[0].start < conj[0].exacts[0]).toBe(true)
    expect(conj[0].end > conj[0].exacts[2]).toBe(true)
    // At the start and end Saturn is at the edge of the 2° orb.
    expect(Math.abs(angleDiff(bodyLongitude('saturn', conj[0].start), 346))).toBeCloseTo(2, 2)
    expect(Math.abs(angleDiff(bodyLongitude('saturn', conj[0].end), 346))).toBeCloseTo(2, 2)
  })

  it('only returns windows that overlap the requested range', () => {
    const from = d('2026-01-01T00:00:00Z')
    const to = d('2026-04-01T00:00:00Z')
    for (const w of transitWindows(chart, from, to)) {
      expect(w.end >= from && w.start <= to).toBe(true)
    }
  })

  it('ranks Pluto on the Sun above Mars sextile Neptune', () => {
    const natal = [
      { id: 'sun', lon: 303 },
      { id: 'neptune', lon: 100 },
    ]
    const ws = transitWindows(chart, d('2024-01-01T00:00:00Z'), d('2026-12-31T00:00:00Z'), natal, ['pluto', 'mars'])
    const pluto = ws.find((w) => w.transit === 'pluto' && w.natal === 'sun')!
    const mars = ws.find((w) => w.transit === 'mars' && w.natal === 'neptune' && w.type === 'sextile')!
    expect(pluto.score).toBeGreaterThan(mars.score)
  })
})

describe('ingresses', () => {
  it('reports house ingresses with retrograde re-entries flagged', () => {
    const list = ingresses(chart, d('2026-01-01T00:00:00Z'), d('2027-01-01T00:00:00Z'))
    const sun = list.filter((i) => i.body === 'sun')
    expect(sun.length).toBeGreaterThanOrEqual(11) // the Sun crosses every house once a year
    expect(sun.every((i) => !i.retrograde && i.house !== null)).toBe(true)
  })

  it('falls back to sign ingresses without a birth time', () => {
    const noTime = computeChart({ date: '1990-05-20', time: null, place })
    const list = ingresses(noTime, d('2026-01-01T00:00:00Z'), d('2026-03-01T00:00:00Z'))
    expect(list.every((i) => i.house === null)).toBe(true)
    expect(list.find((i) => i.body === 'sun' && i.sign === 'pisces')).toBeDefined()
  })
})

describe('slow cycles', () => {
  it('solar return puts the Sun back on its natal degree', () => {
    const sr = nextSolarReturn(chart, d('2026-01-01T00:00:00Z'))!
    const natalSun = chart.bodies.find((b) => b.id === 'sun')!.lon
    expect(Math.abs(angleDiff(bodyLongitude('sun', sr), natalSun))).toBeLessThan(0.001)
    expect(sr.getUTCFullYear()).toBe(2026)
    expect(sr.getUTCMonth()).toBe(4) // May
  })

  it('progresses one day per year of life', () => {
    const p = progressedDate(chart.utc, new Date(chart.utc.getTime() + 30 * 365.2422 * DAY))
    expect((p.getTime() - chart.utc.getTime()) / DAY).toBeCloseTo(30, 5)
  })

  it('finds the progressed Moon’s next sign change', () => {
    const pm = progressedMoon(chart, d('2026-01-01T00:00:00Z'))
    expect(pm.next).not.toBeNull()
    const lonThen = bodyLongitude('moon', progressedDate(chart.utc, pm.next!.date))
    expect(Math.abs(angleDiff(lonThen, Math.round(lonThen / 30) * 30))).toBeLessThan(0.01)
  })
})

describe('buildForecast', () => {
  it('lists every event under a date inside the requested range', () => {
    const from = d('2026-11-21T00:00:00Z')
    const to = d('2027-02-19T00:00:00Z')
    const f = buildForecast(chart, from, to)
    for (const e of f.events) {
      const at = eventDate(e, from, to)
      expect(at >= from && at <= to).toBe(true)
    }
  })

  it('builds a 90-day forecast quickly enough to run in the background', () => {
    const start = performance.now()
    const f = buildForecast(chart, d('2026-11-21T00:00:00Z'), d('2027-02-19T00:00:00Z'))
    const ms = performance.now() - start
    expect(f.events.length).toBeGreaterThan(5)
    expect(f.events.filter((e) => e.kind === 'lunation').length).toBeGreaterThanOrEqual(5)
    expect(ms).toBeLessThan(1500)
  })
})
