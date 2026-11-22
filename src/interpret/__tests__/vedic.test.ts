import { describe, expect, it } from 'vitest'
import { REFERENCE_CHARTS } from '../../astro/__tests__/referenceCharts'
import { computeChart } from '../../astro/chart'
import { currentPeriods, vimshottari } from '../../astro/vedic/dasha'
import { computeVedic, GRAHAS } from '../../astro/vedic/vedic'
import { findYogas } from '../../astro/vedic/yogas'
import { chartToHash, hashToChart } from '../../state/url'
import { bhavaReading, dashaReading, grahaReading, lagnaReading, vedicSummary, yogaReading } from '../vedic'

const clean = (texts: string[]) => {
  for (const t of texts) {
    expect(t).not.toMatch(/undefined|NaN|Infinity|null|\[object/)
    expect(t.trim().length).toBeGreaterThan(0)
    expect(t).not.toMatch(/\s{2,}|\s[.,:]/)
  }
}

const cases = [
  ...REFERENCE_CHARTS.map((r) => ({ label: r.label, date: r.date, time: r.time as string | null, place: { name: r.id, lat: r.lat, lon: r.lon, timeZone: r.timeZone } })),
  { label: 'Tromsø', date: '1995-06-21', time: '12:00', place: { name: 'Tromsø', lat: 69.65, lon: 18.96, timeZone: 'Europe/Oslo' } },
  { label: 'Unknown time', date: '1990-05-20', time: null, place: { name: 'NYC', lat: 40.7128, lon: -74.006, timeZone: 'America/New_York' } },
]

describe('Vedic readings', () => {
  for (const c of cases) {
    it(`${c.label}: every reading is complete`, () => {
      const v = computeVedic(computeChart({ date: c.date, time: c.time, place: c.place }))
      const yogas = findYogas(v)
      const dashas = vimshottari(v)
      for (const id of GRAHAS) {
        const r = grahaReading(v, id, yogas)
        clean([r.title, r.subtitle, r.eyebrow, ...r.paragraphs])
      }
      for (let h = 1; h <= 12; h++) {
        const r = bhavaReading(v, h)
        clean([r.title, r.subtitle, ...r.paragraphs])
      }
      const l = lagnaReading(v)
      if (c.time) clean([l!.title, ...l!.paragraphs])
      else expect(l).toBeNull()
      for (const d of dashas) clean(dashaReading(v, d, d.antardashas[3]).paragraphs)
      for (const y of yogas) clean(yogaReading(y).paragraphs)
      clean(vedicSummary(v, yogas, currentPeriods(dashas, new Date(Date.UTC(2026, 10, 22)))))
    })
  }

  it('describes the Moon’s nakshatra as the janma nakshatra', () => {
    const v = computeVedic(computeChart({ date: '1990-05-20', time: '21:15', place: cases[cases.length - 1].place }))
    expect(grahaReading(v, 'moon', []).paragraphs.join(' ')).toMatch(/janma nakshatra/)
  })
})

describe('Vedic links', () => {
  const route = {
    input: { name: 'Test', date: '1990-05-20', time: '21:15', place: { name: 'NYC', lat: 40.7128, lon: -74.006, timeZone: 'America/New_York' } },
    houseSystem: 'placidus' as const,
    system: 'vedic' as const,
  }

  it('round-trips the Vedic system through the URL', () => {
    const back = hashToChart(chartToHash(route))!
    expect(back.system).toBe('vedic')
    expect(back.houseSystem).toBe('placidus') // kept for switching back to Western
  })

  it('treats older links as Western', () => {
    const back = hashToChart(chartToHash({ ...route, system: undefined as never }))!
    expect(back.system).toBe('western')
  })
})
