import { describe, expect, it } from 'vitest'
import { computeChart } from '../chart'
import { bodyLongitude } from '../ephemeris'
import { transitAspects, transitPositions } from '../transits'
import { angleDiff, norm360 } from '../zodiac'
import { spreadLongitudes } from '../../ui/wheel/geometry'
import { chartToHash, hashToChart } from '../../state/url'

const place = { name: 'London', lat: 51.5072, lon: -0.1276, timeZone: 'Europe/London' }

describe('transits', () => {
  it('finds the exact date of a transit to within an hour', () => {
    // Build a chart, then pick a future date where transiting Saturn sits exactly
    // square the natal Sun, and check we recover that date from a nearby query.
    const chart = computeChart({ date: '1990-01-15', time: '12:00', place })
    const natalSun = chart.bodies.find((b) => b.id === 'sun')!.lon
    // Scan forward for Saturn reaching natalSun + 90 (first hit after 1997).
    let t = Date.UTC(1997, 0, 1)
    const target = norm360(natalSun + 90)
    let prev = angleDiff(bodyLongitude('saturn', new Date(t)), target)
    let truth: number | null = null
    for (let i = 0; i < 3000 && truth === null; i++) {
      const next = t + 86400000
      const cur = angleDiff(bodyLongitude('saturn', new Date(next)), target)
      if (Math.sign(cur) !== Math.sign(prev) && Math.abs(cur - prev) < 10) {
        // Refine to ~1 minute by bisection.
        let lo = t
        let hi = next
        while (hi - lo > 60000) {
          const mid = (lo + hi) / 2
          const fm = angleDiff(bodyLongitude('saturn', new Date(mid)), target)
          if (Math.sign(fm) === Math.sign(prev)) lo = mid
          else hi = mid
        }
        truth = (lo + hi) / 2
      }
      prev = cur
      t = next
    }
    expect(truth).not.toBeNull()
    const query = new Date(truth! + 5 * 86400000)
    const hits = transitAspects(chart, query)
    const hit = hits.find((h) => h.transit === 'saturn' && h.natal === 'sun' && h.type === 'square')
    expect(hit).toBeDefined()
    expect(Math.abs(hit!.exact!.getTime() - truth!)).toBeLessThan(3600000)
  })

  it('excludes the Moon from slow-transit lists by default', () => {
    const chart = computeChart({ date: '1990-01-15', time: '12:00', place })
    expect(transitAspects(chart, new Date(Date.UTC(2026, 0, 1))).some((h) => h.transit === 'moon')).toBe(false)
  })

  it('computes a full set of transit positions quickly enough for 60fps scrubbing', () => {
    const start = performance.now()
    for (let i = 0; i < 120; i++) transitPositions(new Date(Date.UTC(2026, 0, 1) + i * 3600000))
    const perFrame = (performance.now() - start) / 120
    expect(perFrame).toBeLessThan(4) // ms; a frame budget is 16.7 ms
  })
})

describe('glyph collision fanning', () => {
  it('keeps neighbours at least minSep apart and clusters centred', () => {
    const items = [
      { id: 'a', lon: 100 },
      { id: 'b', lon: 101 },
      { id: 'c', lon: 102 },
      { id: 'd', lon: 250 },
    ]
    const out = spreadLongitudes(items, 6)
    expect(out.b).toBeCloseTo(101)
    expect(out.c - out.b).toBeCloseTo(6)
    expect(out.b - out.a).toBeCloseTo(6)
    expect(out.d).toBeCloseTo(250)
  })

  it('handles clusters across 0° Aries', () => {
    const out = spreadLongitudes(
      [
        { id: 'a', lon: 358 },
        { id: 'b', lon: 359 },
        { id: 'c', lon: 1 },
      ],
      5,
    )
    const order = ['a', 'b', 'c'].map((k) => out[k])
    expect(angleDiff(order[1], order[0])).toBeCloseTo(5)
    expect(angleDiff(order[2], order[1])).toBeCloseTo(5)
  })

  it('never overlaps a dense chart', () => {
    const items = Array.from({ length: 16 }, (_, i) => ({ id: String(i), lon: 10 + i * 2.5 }))
    const out = spreadLongitudes(items, 6.6)
    const sorted = Object.values(out).sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThan(6.59)
  })
})

describe('shareable URLs', () => {
  it('round-trips a chart through the hash', () => {
    const route = {
      input: { name: 'Ada', date: '1990-05-20', time: '14:30', place: { ...place, region: 'England, United Kingdom' } },
      houseSystem: 'placidus' as const,
    }
    const back = hashToChart(chartToHash(route))!
    expect(back.input.name).toBe('Ada')
    expect(back.input.time).toBe('14:30')
    expect(back.input.place.timeZone).toBe('Europe/London')
    expect(back.houseSystem).toBe('placidus')
  })

  it('keeps unknown time and rejects broken links', () => {
    const route = { input: { date: '1990-05-20', time: null, place }, houseSystem: 'whole-sign' as const }
    expect(hashToChart(chartToHash(route))!.input.time).toBeNull()
    expect(hashToChart('#/chart?date=1990-05-20&lat=abc&lon=0&tz=UTC')).toBeNull()
    expect(hashToChart('#/chart?date=1990-05-20&lat=10&lon=0&tz=Not/AZone')).toBeNull()
  })
})
