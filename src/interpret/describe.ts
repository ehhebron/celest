import { ASPECT_BY_TYPE, type Aspect } from '../astro/aspects'
import type { Chart, Placement } from '../astro/chart'
import { BODY_BY_ID, formatPosition, signOf, type BodyId } from '../astro/zodiac'
import { ANGLE_TEXT, ASPECT_TEXT, BODY_TEXT, HOUSE_TEXT, SIGN_TEXT } from './texts'

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function pointName(id: string): string {
  if (id === 'asc') return 'Ascendant'
  if (id === 'mc') return 'Midheaven'
  return BODY_BY_ID[id as BodyId]?.name ?? id
}

export function placementTitle(p: Placement): string {
  const house = p.house ? `, ${ordinal(p.house)} House` : ''
  return `${BODY_BY_ID[p.id].name} in ${p.sign.name}${house}`
}

export function placementKeyword(p: Placement): string {
  return `${SIGN_TEXT[p.sign.id].adjective} ${BODY_TEXT[p.id].keyword.toLowerCase()}`
}

export function placementText(p: Placement): string[] {
  const out = [BODY_TEXT[p.id].core, SIGN_TEXT[p.sign.id].style]
  if (p.house) {
    out.push(`Placed in the ${ordinal(p.house)} house, it plays out most around ${HOUSE_TEXT[p.house - 1].area}.`)
  }
  if (p.retrograde) {
    out.push('It was retrograde when you were born, which is often read as turning this energy inward: reflective, revisiting and finding its own way.')
  }
  if (p.approximate) {
    out.push('Because your birth time is unknown, the Moon’s exact degree is approximate. It moves about 13° a day and may even sit in a neighbouring sign.')
  }
  return out
}

/** Accessible label for a placement. */
export function placementLabel(p: Placement): string {
  const pos = formatPosition(p.lon, { approx: p.approximate })
  return `${placementTitle(p)}, ${pos}${p.retrograde ? ', retrograde' : ''}`
}

export function aspectTitle(a: Aspect): string {
  return `${pointName(a.a)} ${ASPECT_BY_TYPE[a.type].name.toLowerCase()} ${pointName(a.b)}`
}

export function aspectText(a: Aspect): string {
  const t = ASPECT_TEXT[a.type]
  return `Your ${pointName(a.a)} ${t.verb} your ${pointName(a.b)}. ${t.about}`
}

export function aspectOrbLabel(a: Aspect): string {
  const deg = Math.floor(a.orb)
  const min = Math.round((a.orb - deg) * 60)
  return `${deg}°${String(min).padStart(2, '0')}′ orb · ${a.applying ? 'applying' : 'separating'}`
}

export interface BigThree {
  sun: { sign: string; signId: string; line: string }
  moon: { sign: string; signId: string; line: string; approximate: boolean }
  rising: { sign: string; signId: string; line: string } | null
}

export function bigThree(chart: Chart): BigThree {
  const sun = chart.bodies.find((b) => b.id === 'sun')!
  const moon = chart.bodies.find((b) => b.id === 'moon')!
  const asc = chart.angles ? signOf(chart.angles.asc) : null
  return {
    sun: { sign: sun.sign.name, signId: sun.sign.id, line: SIGN_TEXT[sun.sign.id].sun },
    moon: {
      sign: moon.sign.name,
      signId: moon.sign.id,
      line: SIGN_TEXT[moon.sign.id].moon,
      approximate: moon.approximate,
    },
    rising: asc ? { sign: asc.name, signId: asc.id, line: SIGN_TEXT[asc.id].rising } : null,
  }
}

export function angleText(id: 'asc' | 'mc', lon: number): { title: string; body: string[] } {
  const s = signOf(lon)
  const t = ANGLE_TEXT[id]
  const extra =
    id === 'asc' ? SIGN_TEXT[s.id].rising : `${SIGN_TEXT[s.id].adjective} ambitions: ${SIGN_TEXT[s.id].about}`
  return { title: `${t.name} in ${s.name}`, body: [t.about, extra] }
}
