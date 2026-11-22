import { DASHA_ORDER, DASHA_YEARS, nakshatraOf, type GrahaId, type VedicChart } from './vedic'

/*
 * Vimshottari dasha: a 120-year cycle of planetary periods. The first period
 * belongs to the lord of the Moon's nakshatra, already partly used up in
 * proportion to how far the Moon had travelled through it at birth.
 */

const YEAR_MS = 365.25 * 86400000

export interface Period {
  lord: GrahaId
  start: Date
  end: Date
}

export interface Mahadasha extends Period {
  antardashas: Period[]
}

export function vimshottari(v: VedicChart): Mahadasha[] {
  const moon = v.grahas.find((g) => g.id === 'moon')!
  const nak = nakshatraOf(moon.lon)
  const first = DASHA_ORDER.indexOf(nak.lord)
  // The cycle began before birth, by the portion of the first period already elapsed.
  let t = v.utc.getTime() - nak.traversed * DASHA_YEARS[nak.lord] * YEAR_MS

  const out: Mahadasha[] = []
  for (let k = 0; k < 9; k++) {
    const lord = DASHA_ORDER[(first + k) % 9]
    const years = DASHA_YEARS[lord]
    const start = t
    const antardashas: Period[] = []
    let a = start
    for (let j = 0; j < 9; j++) {
      const sub = DASHA_ORDER[(DASHA_ORDER.indexOf(lord) + j) % 9]
      const len = ((years * DASHA_YEARS[sub]) / 120) * YEAR_MS
      antardashas.push({ lord: sub, start: new Date(a), end: new Date(a + len) })
      a += len
    }
    t += years * YEAR_MS
    out.push({ lord, start: new Date(start), end: new Date(t), antardashas })
  }
  return out
}

export function currentPeriods(dashas: Mahadasha[], at: Date): { maha: Mahadasha; antar: Period } | null {
  const ms = at.getTime()
  const maha = dashas.find((d) => d.start.getTime() <= ms && ms < d.end.getTime())
  if (!maha) return null
  const antar = maha.antardashas.find((d) => d.start.getTime() <= ms && ms < d.end.getTime())!
  return { maha, antar }
}
