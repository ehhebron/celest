import { MakeTime, Rotation_EQJ_ECT, RotateVector, Vector } from 'astronomy-engine'
import { describe, expect, it } from 'vitest'
import { computeChart } from '../chart'
import { lahiri, lahiriMean, meanNode } from '../vedic/ayanamsa'
import { currentPeriods, vimshottari } from '../vedic/dasha'
import { computeVedic, dignityOf, houseFrom, nakshatraOf, NAK_SPAN } from '../vedic/vedic'
import { findYogas } from '../vedic/yogas'

const D = Math.PI / 180

/** Spica's sidereal longitude on a date: J2000 catalogue position, precessed to the true ecliptic of date. */
function spicaSidereal(date: Date) {
  const ra = (13 + 25 / 60 + 11.579 / 3600) * 15 * D
  const dec = -(11 + 9 / 60 + 40.75 / 3600) * D
  const time = MakeTime(date)
  const v = RotateVector(Rotation_EQJ_ECT(time), new Vector(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec), time))
  const tropical = (Math.atan2(v.y, v.x) / D + 360) % 360
  return tropical - lahiri(date)
}

describe('Lahiri ayanamsa', () => {
  it('matches the standard value at J2000 (23°51′25″)', () => {
    expect(lahiriMean(new Date(Date.UTC(2000, 0, 1, 12)))).toBeCloseTo(23.857, 2)
  })

  it('grows by about 50.3″ a year', () => {
    const a = lahiriMean(new Date(Date.UTC(2000, 0, 1)))
    const b = lahiriMean(new Date(Date.UTC(2100, 0, 1)))
    expect((b - a) * 36).toBeCloseTo(50.3, 0) // arcsec/yr
  })

  for (const year of [1880, 1950, 2000, 2050]) {
    it(`keeps Spica at 0° Libra in ${year}`, () => {
      expect(Math.abs(spicaSidereal(new Date(Date.UTC(year, 5, 1))) - 180)).toBeLessThan(0.03)
    })
  }

  it('gives the mean node within its known range of motion', () => {
    // Mean node at J2000 is 125.04°, moving back ~19.34° per year.
    expect(meanNode(new Date(Date.UTC(2000, 0, 1, 12)))).toBeCloseTo(125.04, 1)
  })
})

describe('nakshatras and dignities', () => {
  it('divides the zodiac into 27 nakshatras with four padas', () => {
    expect(nakshatraOf(0).name).toBe('Ashwini')
    expect(nakshatraOf(0).lord).toBe('ketu')
    expect(nakshatraOf(NAK_SPAN * 3 + 1).name).toBe('Rohini')
    expect(nakshatraOf(NAK_SPAN * 3 + 1).lord).toBe('moon')
    expect(nakshatraOf(359.9).name).toBe('Revati')
    expect(nakshatraOf(359.9).pada).toBe(4)
    expect(nakshatraOf(NAK_SPAN / 4 + 0.01).pada).toBe(2)
  })

  it('applies exaltation, moolatrikona, own sign and friendship', () => {
    expect(dignityOf('sun', 0, 10)).toBe('exalted')
    expect(dignityOf('sun', 6, 10)).toBe('debilitated')
    expect(dignityOf('sun', 4, 5)).toBe('moolatrikona')
    expect(dignityOf('sun', 4, 25)).toBe('own')
    expect(dignityOf('moon', 1, 2)).toBe('exalted')
    expect(dignityOf('moon', 1, 10)).toBe('moolatrikona')
    expect(dignityOf('mercury', 5, 10)).toBe('exalted')
    expect(dignityOf('mercury', 5, 17)).toBe('moolatrikona')
    expect(dignityOf('mercury', 5, 25)).toBe('own')
    expect(dignityOf('jupiter', 0, 5)).toBe('friend') // Mars's sign
    expect(dignityOf('jupiter', 1, 5)).toBe('enemy') // Venus's sign
    expect(dignityOf('saturn', 8, 5)).toBe('neutral') // Jupiter's sign
  })

  it('counts whole sign houses', () => {
    expect(houseFrom(3, 3)).toBe(1)
    expect(houseFrom(2, 3)).toBe(12)
    expect(houseFrom(9, 3)).toBe(7)
  })
})

describe('Vedic chart', () => {
  const NYC = { name: 'New York', lat: 40.7128, lon: -74.006, timeZone: 'America/New_York' }
  const chart = computeChart({ date: '1990-05-20', time: '21:15', place: NYC })
  const v = computeVedic(chart)
  const g = (id: string) => v.grahas.find((x) => x.id === id)!

  it('shifts every position back by the ayanamsa', () => {
    const tropicalSun = chart.bodies.find((b) => b.id === 'sun')!.lon
    expect(((tropicalSun - g('sun').lon + 360) % 360)).toBeCloseTo(v.ayanamsa, 6)
    expect(v.ayanamsa).toBeCloseTo(23.72, 1)
  })

  it('puts the Lagna in the 1st house and Ketu opposite Rahu', () => {
    expect(houseFrom(v.lagna!.sign, v.firstHouseSign)).toBe(1)
    expect(Math.abs(((g('ketu').lon - g('rahu').lon + 360) % 360) - 180)).toBeLessThan(1e-9)
    expect(houseFrom(g('ketu').sign, g('rahu').sign)).toBe(7)
  })

  it('assigns every house a lord and gives Saturn 3rd, 7th and 10th aspects', () => {
    const rules = v.grahas.flatMap((x) => x.rules).sort((a, b) => a - b)
    expect(rules).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    const s = g('saturn')
    expect(s.aspectsHouses).toEqual([3, 7, 10].map((n) => ((s.house + n - 2) % 12) + 1))
  })

  it('falls back to the Moon sign when the birth time is unknown', () => {
    const u = computeVedic(computeChart({ date: '1990-05-20', time: null, place: NYC }))
    expect(u.lagna).toBeNull()
    expect(u.fromMoon).toBe(true)
    expect(u.grahas.find((x) => x.id === 'moon')!.house).toBe(1)
  })

  it('runs a 120-year Vimshottari cycle from the Moon’s nakshatra', () => {
    const d = vimshottari(v)
    expect(d[0].lord).toBe(g('moon').nakshatra.lord)
    expect(d[0].start.getTime()).toBeLessThanOrEqual(chart.utc.getTime())
    expect(d[0].end.getTime()).toBeGreaterThan(chart.utc.getTime())
    const years = (d[8].end.getTime() - d[0].start.getTime()) / (365.25 * 86400000)
    expect(years).toBeCloseTo(120, 6)
    for (const m of d) {
      expect(m.antardashas[0].lord).toBe(m.lord)
      expect(m.antardashas[8].end.getTime()).toBeCloseTo(m.end.getTime(), -1)
    }
    const now = currentPeriods(d, new Date(Date.UTC(2026, 10, 22)))!
    expect(now.maha.start.getTime()).toBeLessThan(Date.UTC(2026, 10, 22))
  })

  it('finds yogas with valid members', () => {
    const ys = findYogas(v)
    expect(ys.length).toBeGreaterThan(0)
    for (const y of ys) for (const id of y.grahas) expect(v.grahas.some((x) => x.id === id)).toBe(true)
    // Exactly one of the Moon-based yogas always applies.
    expect(ys.filter((y) => ['sunapha', 'anapha', 'durudhara', 'kemadruma'].includes(y.id))).toHaveLength(1)
  })
})
