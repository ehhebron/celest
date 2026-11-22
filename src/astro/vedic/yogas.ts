import { houseFrom, houseLord, KENDRAS, RASHIS, TRIKONAS, DUSTHANAS, type GrahaId, type VedicChart } from './vedic'

/*
 * A selection of classical yogas (planetary combinations) that are widely used
 * and can be judged from the rashi chart alone. Each yoga records the grahas
 * that form it so the UI can link to them.
 */

export type YogaId =
  | 'gajakesari'
  | 'budha-aditya'
  | 'chandra-mangala'
  | 'ruchaka'
  | 'bhadra'
  | 'hamsa'
  | 'malavya'
  | 'sasha'
  | 'yogakaraka'
  | 'raja'
  | 'viparita-raja'
  | 'parivartana'
  | 'sunapha'
  | 'anapha'
  | 'durudhara'
  | 'kemadruma'

export interface Yoga {
  id: YogaId
  grahas: GrahaId[]
  /** Extra detail, e.g. which houses a Raja yoga joins. */
  detail?: string
  /** Kemadruma can be cancelled by other factors. */
  cancelled?: boolean
}

const MAHAPURUSHA: [GrahaId, YogaId][] = [
  ['mars', 'ruchaka'],
  ['mercury', 'bhadra'],
  ['jupiter', 'hamsa'],
  ['venus', 'malavya'],
  ['saturn', 'sasha'],
]

/** Planets that count for the Moon-based yogas (not the Sun or the nodes). */
const MOON_YOGA_PLANETS: GrahaId[] = ['mars', 'mercury', 'jupiter', 'venus', 'saturn']

export function findYogas(v: VedicChart): Yoga[] {
  const g = (id: GrahaId) => v.grahas.find((x) => x.id === id)!
  const out: Yoga[] = []
  const moon = g('moon')
  const fromMoon = (id: GrahaId) => houseFrom(g(id).sign, moon.sign)

  if (KENDRAS.includes(fromMoon('jupiter'))) out.push({ id: 'gajakesari', grahas: ['jupiter', 'moon'] })
  if (g('sun').sign === g('mercury').sign) out.push({ id: 'budha-aditya', grahas: ['sun', 'mercury'] })
  if (moon.sign === g('mars').sign) out.push({ id: 'chandra-mangala', grahas: ['moon', 'mars'] })

  // The house-based yogas need a real Lagna.
  if (!v.fromMoon) {
    for (const [id, yoga] of MAHAPURUSHA) {
      const p = g(id)
      if (KENDRAS.includes(p.house) && (p.dignity === 'own' || p.dignity === 'exalted' || p.dignity === 'moolatrikona')) {
        out.push({ id: yoga, grahas: [id] })
      }
    }

    // Yogakaraka: one planet ruling both a kendra (other than the 1st) and a trikona (other than the 1st).
    for (const p of v.grahas) {
      if (p.rules.some((h) => [4, 7, 10].includes(h)) && p.rules.some((h) => [5, 9].includes(h))) {
        out.push({ id: 'yogakaraka', grahas: [p.id], detail: `rules your ${p.rules.join(' and ')}` })
      }
    }

    // Raja yoga: lords of a kendra and a trikona together in one sign.
    const seen = new Set<string>()
    for (const k of KENDRAS) {
      for (const t of TRIKONAS) {
        if (k === t) continue
        const a = houseLord(v, k)
        const b = houseLord(v, t)
        if (a === b) continue
        const key = [a, b].sort().join('-')
        if (seen.has(key)) continue
        if (g(a).sign === g(b).sign) {
          seen.add(key)
          out.push({ id: 'raja', grahas: [a, b], detail: `lords of your ${k} and ${t}` })
        }
      }
    }

    // Viparita raja yoga: a lord of a dusthana placed in another dusthana.
    for (const h of DUSTHANAS) {
      const lord = houseLord(v, h)
      const p = g(lord)
      if (DUSTHANAS.includes(p.house) && p.house !== h && !out.some((y) => y.id === 'viparita-raja' && y.grahas[0] === lord)) {
        out.push({ id: 'viparita-raja', grahas: [lord], detail: `lord of your ${h}, placed in your ${p.house}` })
      }
    }
  }

  // Parivartana: two planets in each other's signs.
  const pairs = new Set<string>()
  for (const a of v.grahas) {
    if (a.id === 'rahu' || a.id === 'ketu') continue
    const lordOfA = RASHIS[a.sign].lord as GrahaId
    if (lordOfA === a.id) continue
    const b = g(lordOfA)
    if ((RASHIS[b.sign].lord as GrahaId) === a.id) {
      const key = [a.id, b.id].sort().join('-')
      if (!pairs.has(key)) {
        pairs.add(key)
        out.push({ id: 'parivartana', grahas: [a.id, b.id] })
      }
    }
  }

  // Moon-based yogas: planets in the 2nd and/or 12th from the Moon.
  const second = MOON_YOGA_PLANETS.filter((id) => fromMoon(id) === 2)
  const twelfth = MOON_YOGA_PLANETS.filter((id) => fromMoon(id) === 12)
  if (second.length && twelfth.length) out.push({ id: 'durudhara', grahas: ['moon', ...second, ...twelfth] })
  else if (second.length) out.push({ id: 'sunapha', grahas: ['moon', ...second] })
  else if (twelfth.length) out.push({ id: 'anapha', grahas: ['moon', ...twelfth] })
  else {
    // Kemadruma is traditionally cancelled when a planet occupies a kendra from the Moon.
    const cancelled = MOON_YOGA_PLANETS.some((id) => KENDRAS.includes(fromMoon(id)))
    out.push({ id: 'kemadruma', grahas: ['moon'], cancelled })
  }

  return out
}
