import { describe, expect, it } from 'vitest'
import { REFERENCE_CHARTS } from '../../astro/__tests__/referenceCharts'
import { computeChart } from '../../astro/chart'
import { horizonModel } from '../../astro/horizon'
import { angleSkyReading, aspectSkyReading, bodySkyReading, eventSentence, formatDuration, skyOverview } from '../sky'

const clean = (texts: string[]) => {
  for (const t of texts) {
    expect(t).not.toMatch(/undefined|NaN|Infinity|null/)
    expect(t.trim().length).toBeGreaterThan(0)
    expect(t).not.toMatch(/\s{2,}|\s[.,:]/)
    expect(t).not.toMatch(/(needs|generosity|courage|voice|loving|responsibility|healing) (works|shows|stays|leads|follows|pushes|flows|merges)\b/)
    expect(t).not.toMatch(/right (on the rising|toward|on the setting)/)
  }
}

const charts = [
  ...REFERENCE_CHARTS.map((r) => ({ label: r.label, date: r.date, time: r.time, place: { name: r.id, lat: r.lat, lon: r.lon, timeZone: r.timeZone } })),
  // Far north: circumpolar planets and a low Midheaven.
  { label: 'Tromsø', date: '1995-06-21', time: '12:00', place: { name: 'Tromsø', lat: 69.65, lon: 18.96, timeZone: 'Europe/Oslo' } },
]

describe('side-view readings', () => {
  for (const c of charts) {
    it(`${c.label}: every reading is complete and well-formed`, () => {
      const chart = computeChart({ date: c.date, time: c.time, place: c.place }, { houseSystem: 'whole-sign' })
      const m = horizonModel(chart)!
      for (const b of chart.bodies) {
        const r = bodySkyReading(m, b.id)!
        clean([r.headline, ...r.meaning, ...r.sky, ...r.facts.map((f) => f.value)])
        expect(r.meaning.length).toBeGreaterThanOrEqual(1)
      }
      for (const id of ['asc', 'mc'] as const) {
        const r = angleSkyReading(chart, m, id)!
        clean([r.headline, ...r.meaning, ...r.sky])
      }
      for (const a of chart.aspects) {
        const r = aspectSkyReading(chart, m, a)!
        clean([r.headline, ...r.meaning, ...r.sky])
      }
      const o = skyOverview(chart, m)
      clean(o.summary)
      clean([o.sect.summary, o.sect.meaning, o.sect.visibility, o.hemispheres.vertical, o.hemispheres.horizontal])
      clean(o.standouts.flatMap((s) => [s.label, s.text]))
      clean(o.flatVsSky.map((f) => f.text))
      expect(o.team.length).toBe(4)
    })
  }
})

describe('sky reading details', () => {
  const NYC = { name: 'New York', lat: 40.7128, lon: -74.006, timeZone: 'America/New_York' }
  const chart = computeChart({ date: '1990-05-20', time: '21:15', place: NYC })
  const m = horizonModel(chart)!

  it('names the sect team for a night chart', () => {
    const o = skyOverview(chart, m)
    expect(o.sect.title).toBe('Night chart')
    expect(o.team.map((t) => t.id)).toEqual(['moon', 'venus', 'mars', 'saturn'])
  })

  it('explains the sect role in a planet reading', () => {
    expect(bodySkyReading(m, 'saturn')!.meaning.join(' ')).toMatch(/biggest test/)
    expect(bodySkyReading(m, 'venus')!.meaning.join(' ')).toMatch(/most reliable source of good fortune/)
    expect(bodySkyReading(m, 'uranus')!.meaning.join(' ')).not.toMatch(/sect|good fortune|biggest test/)
  })

  it('reads a planet by the part of the sky it was in', () => {
    // Jupiter was setting in the west in this chart.
    const r = bodySkyReading(m, 'jupiter')!
    expect(r.headline).toBe('Your luck comes through other people.')
    expect(r.facts[0].value).toMatch(/Setting/)
    expect(r.meaning[0]).not.toMatch(/^Your luck comes through other people/)
  })

  it('writes a personal summary of the whole sky', () => {
    const o = skyOverview(chart, m)
    expect(o.summary[0]).toMatch(/born at night/)
    expect(o.summary.join(' ')).toMatch(/most reliable source of good fortune is Venus/)
    expect(o.summary.join(' ')).toMatch(/biggest test is Saturn/)
  })

  it('formats timing sentences', () => {
    expect(formatDuration(0.67)).toBe('40 minutes')
    expect(formatDuration(1.25)).toBe('1 hour 15 minutes')
    expect(formatDuration(2.02)).toBe('2 hours')
    expect(eventSentence({ kind: 'rise', hours: -0.5 })).toBe('It rose about 30 minutes before you were born.')
    expect(eventSentence({ kind: 'set', hours: 1 })).toBe('It would set about 1 hour after you were born.')
    expect(eventSentence({ kind: 'set', hours: 5 })).toBeNull()
  })
})
