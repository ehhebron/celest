import type { Chart } from '../chart'
import { bodyPosition } from '../ephemeris'
import { norm360 } from '../zodiac'
import { lahiri, meanNode } from './ayanamsa'

/*
 * A Jyotish (Vedic) reading of the same birth moment: sidereal zodiac
 * (Lahiri), the nine grahas, whole sign houses from the sidereal Lagna,
 * nakshatras, dignities, combustion, lordships and graha drishti.
 */

export type GrahaId = 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn' | 'rahu' | 'ketu'

export const GRAHAS: GrahaId[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu']

export const GRAHA_NAME: Record<GrahaId, { name: string; sanskrit: string; abbr: string }> = {
  sun: { name: 'Sun', sanskrit: 'Surya', abbr: 'Su' },
  moon: { name: 'Moon', sanskrit: 'Chandra', abbr: 'Mo' },
  mars: { name: 'Mars', sanskrit: 'Mangala', abbr: 'Ma' },
  mercury: { name: 'Mercury', sanskrit: 'Budha', abbr: 'Me' },
  jupiter: { name: 'Jupiter', sanskrit: 'Guru', abbr: 'Ju' },
  venus: { name: 'Venus', sanskrit: 'Shukra', abbr: 'Ve' },
  saturn: { name: 'Saturn', sanskrit: 'Shani', abbr: 'Sa' },
  rahu: { name: 'Rahu', sanskrit: 'Rahu', abbr: 'Ra' },
  ketu: { name: 'Ketu', sanskrit: 'Ketu', abbr: 'Ke' },
}

/** Rashis in order from Aries; index 0–11. */
export const RASHIS = [
  { name: 'Mesha', western: 'Aries', lord: 'mars' },
  { name: 'Vrishabha', western: 'Taurus', lord: 'venus' },
  { name: 'Mithuna', western: 'Gemini', lord: 'mercury' },
  { name: 'Karka', western: 'Cancer', lord: 'moon' },
  { name: 'Simha', western: 'Leo', lord: 'sun' },
  { name: 'Kanya', western: 'Virgo', lord: 'mercury' },
  { name: 'Tula', western: 'Libra', lord: 'venus' },
  { name: 'Vrishchika', western: 'Scorpio', lord: 'mars' },
  { name: 'Dhanu', western: 'Sagittarius', lord: 'jupiter' },
  { name: 'Makara', western: 'Capricorn', lord: 'saturn' },
  { name: 'Kumbha', western: 'Aquarius', lord: 'saturn' },
  { name: 'Meena', western: 'Pisces', lord: 'jupiter' },
] as const satisfies readonly { name: string; western: string; lord: GrahaId }[]

/** Nakshatras: 27 lunar mansions of 13°20′, each with a Vimshottari lord. */
export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const

/** Vimshottari order, starting from Ashwini's lord. */
export const DASHA_ORDER: GrahaId[] = ['ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury']
export const DASHA_YEARS: Record<GrahaId, number> = { ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7, rahu: 18, jupiter: 16, saturn: 19, mercury: 17 }

export const NAK_SPAN = 360 / 27

export interface NakshatraInfo {
  index: number
  name: string
  pada: number
  lord: GrahaId
  /** Fraction of the nakshatra already traversed, 0–1. */
  traversed: number
}

export function nakshatraOf(siderealLon: number): NakshatraInfo {
  const l = norm360(siderealLon)
  const index = Math.floor(l / NAK_SPAN) % 27
  const within = l - index * NAK_SPAN
  return {
    index,
    name: NAKSHATRAS[index],
    pada: Math.min(4, Math.floor(within / (NAK_SPAN / 4)) + 1),
    lord: DASHA_ORDER[index % 9],
    traversed: within / NAK_SPAN,
  }
}

export type Dignity = 'exalted' | 'moolatrikona' | 'own' | 'friend' | 'neutral' | 'enemy' | 'debilitated'

const EXALTATION: Partial<Record<GrahaId, { sign: number; deg: number }>> = {
  sun: { sign: 0, deg: 10 },
  moon: { sign: 1, deg: 3 },
  mars: { sign: 9, deg: 28 },
  mercury: { sign: 5, deg: 15 },
  jupiter: { sign: 3, deg: 5 },
  venus: { sign: 11, deg: 27 },
  saturn: { sign: 6, deg: 20 },
  // The nodes' dignities vary by school; Taurus/Scorpio is the most widely used.
  rahu: { sign: 1, deg: 20 },
  ketu: { sign: 7, deg: 20 },
}
const MOOLATRIKONA: Partial<Record<GrahaId, { sign: number; from: number; to: number }>> = {
  sun: { sign: 4, from: 0, to: 20 },
  moon: { sign: 1, from: 3, to: 30 },
  mars: { sign: 0, from: 0, to: 12 },
  mercury: { sign: 5, from: 15, to: 20 },
  jupiter: { sign: 8, from: 0, to: 10 },
  venus: { sign: 6, from: 0, to: 15 },
  saturn: { sign: 10, from: 0, to: 20 },
}
/** Parashara's natural friendships: [friends, enemies]; everything else is neutral. */
const FRIENDSHIP: Partial<Record<GrahaId, [GrahaId[], GrahaId[]]>> = {
  sun: [['moon', 'mars', 'jupiter'], ['venus', 'saturn']],
  moon: [['sun', 'mercury'], []],
  mars: [['sun', 'moon', 'jupiter'], ['mercury']],
  mercury: [['sun', 'venus'], ['moon']],
  jupiter: [['sun', 'moon', 'mars'], ['mercury', 'venus']],
  venus: [['mercury', 'saturn'], ['sun', 'moon']],
  saturn: [['mercury', 'venus'], ['sun', 'moon', 'mars']],
}

export function dignityOf(id: GrahaId, sign: number, degInSign: number): Dignity {
  const ex = EXALTATION[id]
  const mt = MOOLATRIKONA[id]
  if (ex && sign === ex.sign) {
    // In signs that hold both exaltation and moolatrikona, the degrees decide.
    const sharedWithMt = mt && mt.sign === sign
    if (!sharedWithMt || degInSign < mt.from) return 'exalted'
  }
  if (ex && sign === (ex.sign + 6) % 12) return 'debilitated'
  if (mt && sign === mt.sign && degInSign >= mt.from && degInSign < mt.to) return 'moolatrikona'
  const lord = RASHIS[sign].lord as GrahaId
  if (lord === id) return 'own'
  const f = FRIENDSHIP[id]
  if (!f) return 'neutral'
  if (f[0].includes(lord)) return 'friend'
  if (f[1].includes(lord)) return 'enemy'
  return 'neutral'
}

/** Vedic combustion distances from the Sun, degrees: [direct, retrograde]. */
const COMBUST: Partial<Record<GrahaId, [number, number]>> = {
  moon: [12, 12],
  mars: [17, 17],
  mercury: [14, 12],
  jupiter: [11, 11],
  venus: [10, 8],
  saturn: [15, 15],
}

/** Graha drishti: houses counted from the graha (inclusive) that it aspects. */
export const DRISHTI: Record<GrahaId, number[]> = {
  sun: [7],
  moon: [7],
  mars: [4, 7, 8],
  mercury: [7],
  jupiter: [5, 7, 9],
  venus: [7],
  saturn: [3, 7, 10],
  rahu: [7],
  ketu: [7],
}

export const KENDRAS = [1, 4, 7, 10]
export const TRIKONAS = [1, 5, 9]
export const DUSTHANAS = [6, 8, 12]
export const UPACHAYAS = [3, 6, 10, 11]
export const BENEFICS: ReadonlySet<GrahaId> = new Set(['jupiter', 'venus', 'moon', 'mercury'])

export interface Graha {
  id: GrahaId
  lon: number
  sign: number
  degInSign: number
  nakshatra: NakshatraInfo
  /** Whole sign house from the Lagna (or from the Moon when the birth time is unknown). */
  house: number
  retrograde: boolean
  dignity: Dignity
  combust: boolean
  /** Houses this graha rules. */
  rules: number[]
  /** Houses it casts drishti on. */
  aspectsHouses: number[]
  approximate: boolean
}

export interface VedicChart {
  ayanamsa: number
  /** Sidereal Lagna, or null when the birth time is unknown. */
  lagna: { lon: number; sign: number; degInSign: number; nakshatra: NakshatraInfo } | null
  /** The sign houses are counted from: the Lagna, or the Moon's sign (Chandra Lagna) as a fallback. */
  firstHouseSign: number
  fromMoon: boolean
  grahas: Graha[]
  timeKnown: boolean
  utc: Date
}

export const houseFrom = (sign: number, firstSign: number) => ((sign - firstSign + 12) % 12) + 1
export const signOfHouse = (house: number, firstSign: number) => (firstSign + house - 1) % 12

export function computeVedic(chart: Chart): VedicChart {
  const ayanamsa = lahiri(chart.utc)
  const sid = (tropical: number) => norm360(tropical - ayanamsa)

  const raw: { id: GrahaId; lon: number; speed: number }[] = []
  for (const id of ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'] as const) {
    const p = chart.bodies.find((b) => b.id === id) ?? bodyPosition(id, chart.utc)
    raw.push({ id, lon: sid(p.lon), speed: p.speed })
  }
  // Rahu is the mean node, as in classical Jyotish; Ketu sits exactly opposite.
  const rahu = sid(meanNode(chart.utc))
  raw.push({ id: 'rahu', lon: rahu, speed: -0.053 }, { id: 'ketu', lon: norm360(rahu + 180), speed: -0.053 })

  const lagna = chart.angles
    ? (() => {
        const lon = sid(chart.angles.asc)
        return { lon, sign: Math.floor(lon / 30), degInSign: lon % 30, nakshatra: nakshatraOf(lon) }
      })()
    : null
  const moonSign = Math.floor(raw.find((r) => r.id === 'moon')!.lon / 30)
  const firstHouseSign = lagna ? lagna.sign : moonSign
  const sunLon = raw[0].lon

  const grahas: Graha[] = raw.map(({ id, lon, speed }) => {
    const sign = Math.floor(lon / 30) % 12
    const degInSign = lon - sign * 30
    const house = houseFrom(sign, firstHouseSign)
    const retrograde = id === 'rahu' || id === 'ketu' ? true : speed < 0
    const orb = COMBUST[id]
    const fromSun = Math.abs(((lon - sunLon + 540) % 360) - 180)
    return {
      id,
      lon,
      sign,
      degInSign,
      nakshatra: nakshatraOf(lon),
      house,
      retrograde,
      dignity: dignityOf(id, sign, degInSign),
      combust: !!orb && fromSun <= orb[retrograde ? 1 : 0],
      rules: RASHIS.map((r, i) => (r.lord === id ? houseFrom(i, firstHouseSign) : 0)).filter(Boolean),
      aspectsHouses: DRISHTI[id].map((n) => ((house + n - 2) % 12) + 1),
      approximate: !chart.timeKnown && id === 'moon',
    }
  })

  return { ayanamsa, lagna, firstHouseSign, fromMoon: !lagna, grahas, timeKnown: chart.timeKnown, utc: chart.utc }
}

/** Lord of a house (by whole sign). */
export function houseLord(v: VedicChart, house: number): GrahaId {
  return RASHIS[signOfHouse(house, v.firstHouseSign)].lord as GrahaId
}

/** Grahas whose drishti falls on a house. */
export function aspectsOnHouse(v: VedicChart, house: number): GrahaId[] {
  return v.grahas.filter((g) => g.aspectsHouses.includes(house)).map((g) => g.id)
}
