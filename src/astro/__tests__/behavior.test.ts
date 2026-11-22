import { describe, expect, it } from 'vitest'
import { aspectBetween, DEFAULT_ORBS, findAspects } from '../aspects'
import { computeChart } from '../chart'
import { houseOf, placidusCusps, wholeSignCusps } from '../houses'
import { resolveBirthTime } from '../time'
import { formatDegree } from '../zodiac'

const NYC = { name: 'New York', lat: 40.7128, lon: -74.006, timeZone: 'America/New_York' }

describe('time resolution edge cases', () => {
  it('flags a wall time skipped by spring-forward and moves it forward', () => {
    const r = resolveBirthTime({ date: '2024-03-10', time: '02:30', timeZone: NYC.timeZone, longitude: NYC.lon })
    expect(r.note).toBe('gap')
    expect(r.utc.toISOString()).toBe('2024-03-10T07:30:00.000Z') // 03:30 EDT
  })

  it('flags a repeated wall time at fall-back and uses the first occurrence', () => {
    const r = resolveBirthTime({ date: '2024-11-03', time: '01:30', timeZone: NYC.timeZone, longitude: NYC.lon })
    expect(r.note).toBe('ambiguous')
    expect(r.utc.toISOString()).toBe('2024-11-03T05:30:00.000Z') // 01:30 EDT
  })

  it('uses US war time in 1943', () => {
    const r = resolveBirthTime({ date: '1943-01-15', time: '12:00', timeZone: NYC.timeZone, longitude: NYC.lon })
    expect(r.utc.toISOString()).toBe('1943-01-15T16:00:00.000Z') // EWT, UTC−4 in winter
  })

  it('rejects unknown zones', () => {
    expect(() => resolveBirthTime({ date: '2000-01-01', time: '12:00', timeZone: 'Mars/Olympus', longitude: 0 })).toThrow()
  })
})

describe('unknown birth time', () => {
  const chart = computeChart({ date: '1990-05-20', time: null, place: NYC })

  it('uses local noon', () => {
    expect(chart.utc.toISOString()).toBe('1990-05-20T16:00:00.000Z') // noon EDT
  })

  it('hides houses and angles', () => {
    expect(chart.angles).toBeNull()
    expect(chart.cusps).toBeNull()
    expect(chart.bodies.every((b) => b.house === null)).toBe(true)
    expect(chart.aspects.some((a) => a.a === 'asc' || a.b === 'asc')).toBe(false)
  })

  it('marks the Moon (and only the Moon) as approximate', () => {
    expect(chart.bodies.filter((b) => b.approximate).map((b) => b.id)).toEqual(['moon'])
  })
})

describe('houses', () => {
  it('whole sign houses start at 0° of the rising sign', () => {
    const cusps = wholeSignCusps(137.2)
    expect(cusps[0]).toBe(120)
    expect(cusps[11]).toBe(90)
    expect(houseOf(125, cusps)).toBe(1)
    expect(houseOf(119.9, cusps)).toBe(12)
    expect(houseOf(300, cusps)).toBe(7)
  })

  it('Placidus refuses polar latitudes and the chart falls back to whole sign', () => {
    expect(() => placidusCusps(100, 23.44, 70)).toThrow()
    const chart = computeChart(
      { date: '2000-06-21', time: '12:00', place: { name: 'Tromsø', lat: 69.65, lon: 18.96, timeZone: 'Europe/Oslo' } },
      { houseSystem: 'placidus' },
    )
    expect(chart.houseSystem).toBe('whole-sign')
    expect(chart.houseFallback).toBeTruthy()
  })
})

describe('aspects', () => {
  const p = (id: string, lon: number, speed = 1) => ({ id, lon, speed })

  it('detects each major aspect, across 0° Aries', () => {
    expect(aspectBetween(p('a', 358), p('b', 3))?.type).toBe('conjunction')
    expect(aspectBetween(p('a', 10), p('b', 72))?.type).toBe('sextile')
    expect(aspectBetween(p('a', 10), p('b', 278))?.type).toBe('square')
    expect(aspectBetween(p('a', 350), p('b', 112))?.type).toBe('trine')
    expect(aspectBetween(p('a', 10), p('b', 186))?.type).toBe('opposition')
    expect(aspectBetween(p('a', 10), p('b', 40))).toBeNull()
  })

  it('respects configurable orbs', () => {
    const tight = { ...DEFAULT_ORBS, orbs: { ...DEFAULT_ORBS.orbs, trine: 2 } }
    expect(aspectBetween(p('a', 0), p('b', 124))?.type).toBe('trine')
    expect(aspectBetween(p('a', 0), p('b', 124), tight)).toBeNull()
  })

  it('reports exactness and applying/separating', () => {
    const exact = aspectBetween(p('a', 0, 0), p('b', 90, 0))!
    expect(exact.exactness).toBeCloseTo(1)
    // Fast body at 85° moving toward 90° square to a body at 0°: applying.
    expect(aspectBetween(p('slow', 0, 0), p('fast', 85, 1))!.applying).toBe(true)
    expect(aspectBetween(p('slow', 0, 0), p('fast', 95, 1))!.applying).toBe(false)
  })

  it('sorts by exactness', () => {
    const list = findAspects([p('a', 0), p('b', 121), p('c', 180.5)])
    expect(list[0].type).toBe('opposition')
  })
})

describe('formatting', () => {
  it('formats degrees within sign', () => {
    expect(formatDegree(353.5077)).toBe('23°30′')
    expect(formatDegree(59.9999)).toBe('29°59′')
  })
})
