import { EclipseKind } from 'astronomy-engine'
import type { AspectType } from '../astro/aspects'
import type { ForecastEvent, Ingress, Lunation, Station, TransitWindow } from '../astro/forecast'
import { BODY_BY_ID, SIGNS, type BodyId } from '../astro/zodiac'
import { ordinal, pointName } from './describe'
import { HOUSE_TEXT } from './texts'

/** What a transiting planet brings. */
const TRANSIT_THEME: Partial<Record<BodyId, { noun: string; tone: string }>> = {
  sun: { noun: 'attention and vitality', tone: 'spotlights' },
  mars: { noun: 'drive, heat and urgency', tone: 'energises' },
  jupiter: { noun: 'growth, luck and a wider horizon', tone: 'expands' },
  saturn: { noun: 'pressure, structure and commitment', tone: 'tests' },
  uranus: { noun: 'sudden change and a need for freedom', tone: 'shakes up' },
  neptune: { noun: 'dreams, sensitivity and dissolving edges', tone: 'softens' },
  pluto: { noun: 'deep, slow transformation', tone: 'transforms' },
  chiron: { noun: 'old tender spots surfacing to heal', tone: 'touches' },
  node: { noun: 'a pull toward your direction of growth', tone: 'points toward' },
}

/** What part of the person a natal point stands for. */
const NATAL_AREA: Record<string, string> = {
  sun: 'your sense of self and direction',
  moon: 'your emotional life and what you need to feel safe',
  mercury: 'how you think, learn and talk',
  venus: 'love, pleasure and what you value',
  mars: 'your drive and how you go after things',
  jupiter: 'your faith and appetite for growth',
  saturn: 'your commitments and long-term structures',
  uranus: 'your need for freedom and change',
  neptune: 'your ideals and imagination',
  pluto: 'your depths and your relationship to power',
  asc: 'your body, your presence and how you meet the world',
  mc: 'your career, reputation and public direction',
}

const ASPECT_PHRASE: Record<AspectType, { verb: string; feel: string }> = {
  conjunction: { verb: 'lands on', feel: 'Expect this to be front and centre.' },
  opposition: { verb: 'faces', feel: 'Often it shows up through other people, and the work is finding balance.' },
  square: { verb: 'squares', feel: 'It can feel like friction, and friction is what gets things moving.' },
  trine: { verb: 'flows to', feel: 'This is a supportive stretch: easy to waste, generous if you use it.' },
  sextile: { verb: 'opens a door to', feel: 'Opportunities come if you reach for them.' },
}

const SYMBOL: Record<AspectType, string> = { conjunction: '☌', sextile: '⚹', square: '□', trine: '△', opposition: '☍' }

const FMT_MD = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const FMT_MDY = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const fmt = (d: Date, ref: Date) => (d.getFullYear() === ref.getFullYear() ? FMT_MD : FMT_MDY).format(d)

function listDates(dates: Date[], ref: Date): string {
  // If the list crosses into another year, give every date its year.
  const mixed = dates.some((d) => d.getFullYear() !== ref.getFullYear())
  const s = dates.map((d) => (mixed ? FMT_MDY : FMT_MD).format(d))
  return s.length < 3 ? s.join(' and ') : `${s.slice(0, -1).join(', ')} and ${s[s.length - 1]}`
}

function houseArea(n: number | null): string | null {
  return n ? `your ${ordinal(n)} house of ${HOUSE_TEXT[n - 1].area}` : null
}

export interface EventText {
  title: string
  /** Short label shown above the title. */
  eyebrow: string
  body: string[]
  /** Aspect symbol, for transits. */
  symbol?: string
  nature?: 'harmonious' | 'challenging' | 'neutral'
}

export function transitText(w: TransitWindow, now: Date): EventText {
  const theme = TRANSIT_THEME[w.transit]!
  const phrase = ASPECT_PHRASE[w.type]
  const name = BODY_BY_ID[w.transit].name
  const body: string[] = [
    `${name} (${theme.noun}) ${phrase.verb} ${NATAL_AREA[w.natal] ?? `your ${pointName(w.natal)}`}. ${phrase.feel}`,
  ]
  if (w.exacts.length >= 2) {
    body.push(
      `It comes exact ${w.exacts.length === 2 ? 'twice' : `${w.exacts.length} times`}, on ${listDates(w.exacts, now)}, as ${name} retrogrades back over the point. The first pass raises the theme, the middle pass reviews it and the last one settles it.`,
    )
  } else if (w.exacts.length === 1) {
    body.push(`It peaks on ${fmt(w.exacts[0], now)}.`)
  } else {
    body.push(`${name} comes within ${w.closest.toFixed(1)}° but turns before it’s exact, so this is a brush rather than a full contact.`)
  }
  const area = houseArea(w.transitHouse)
  if (area) body.push(`${name} is moving through ${area}, which is where the push is coming from.`)
  body.push(`In effect ${fmt(w.start, now)} – ${fmt(w.end, now)}.`)
  return {
    eyebrow: w.transit === 'node' ? 'Direction' : ['pluto', 'neptune', 'uranus', 'saturn'].includes(w.transit) ? 'Major transit' : 'Transit',
    title: `${name} ${w.type} your ${pointName(w.natal)}`,
    body,
    symbol: SYMBOL[w.type],
    nature: w.type === 'conjunction' ? 'neutral' : w.type === 'trine' || w.type === 'sextile' ? 'harmonious' : 'challenging',
  }
}

export function lunationText(l: Lunation): EventText {
  const sign = SIGNS.find((s) => s.id === l.sign)!.name
  const area = houseArea(l.house)
  const body: string[] = []
  if (l.phase === 'new') {
    body.push(`New Moons are natural starting points: plant an intention, begin quietly.${area ? ` This one falls in ${area}, so that’s where a fresh start is most available.` : ` It’s in ${sign}.`}`)
  } else {
    body.push(`Full Moons bring culmination and clarity: things come to light, feelings peak, something completes.${area ? ` This one lights up ${area}.` : ` It’s in ${sign}.`}`)
  }
  if (l.eclipse) {
    const kind = l.eclipse.kind === EclipseKind.Total ? 'total' : l.eclipse.kind === EclipseKind.Annular ? 'annular' : l.eclipse.kind === EclipseKind.Partial ? 'partial' : 'penumbral'
    body.push(
      `It’s also a ${kind} ${l.eclipse.type} eclipse. Eclipses are traditionally read as turning points: what ${l.phase === 'new' ? 'begins' : 'ends'} now tends to keep unfolding for about six months.`,
    )
  }
  if (l.contacts.length) {
    const c = l.contacts[0]
    body.push(`It lands within ${c.orb.toFixed(1)}° of your natal ${pointName(c.natal)}, which makes it personal: ${NATAL_AREA[c.natal] ?? 'that part of you'} is in focus.`)
  }
  return {
    eyebrow: l.eclipse ? `${l.eclipse.type === 'solar' ? 'Solar' : 'Lunar'} eclipse` : l.phase === 'new' ? 'New Moon' : 'Full Moon',
    title: `${l.phase === 'new' ? 'New' : 'Full'} Moon in ${sign}${l.house ? ` · ${ordinal(l.house)} house` : ''}`,
    body,
  }
}

export function stationText(s: Station): EventText {
  const name = BODY_BY_ID[s.body].name
  const area = houseArea(s.house)
  const body: string[] = []
  if (s.direction === 'retrograde') {
    body.push(
      `${name} appears to stop and turn backward. Retrograde stretches favour review over launch: revisit, repair, reconsider.${area ? ` For you that plays out in ${area}.` : ''}`,
    )
  } else {
    body.push(`${name} turns direct and momentum returns. What was stuck or under review can move forward again.${area ? ` Watch ${area}.` : ''}`)
  }
  if (s.near) {
    body.push(`It stations within ${s.near.orb.toFixed(1)}° of your natal ${pointName(s.near.natal)}, and stations are when a planet’s influence is strongest, so this one is personal.`)
  }
  return {
    eyebrow: 'Station',
    title: `${name} stations ${s.direction}${s.house ? ` in your ${ordinal(s.house)} house` : ` in ${SIGNS.find((x) => x.id === s.sign)!.name}`}`,
    body,
  }
}

const STAY: Partial<Record<BodyId, string>> = {
  sun: 'about a month',
  mars: 'roughly six weeks (longer if it retrogrades)',
  jupiter: 'around a year',
  saturn: 'two to three years',
  uranus: 'several years',
  neptune: 'many years',
  pluto: 'many years',
}

export function ingressText(i: Ingress): EventText {
  const name = BODY_BY_ID[i.body].name
  const theme = TRANSIT_THEME[i.body]!
  const sign = SIGNS.find((s) => s.id === i.sign)!.name
  const where = i.house ? `your ${ordinal(i.house)} house` : sign
  const body: string[] = []
  if (i.retrograde) {
    body.push(`Moving retrograde, ${name} slips back into ${where} for a return visit: unfinished business from its last stay there.`)
  } else if (i.house) {
    body.push(`For ${STAY[i.body] ?? 'a while'}, ${theme.noun} ${i.body === 'sun' ? 'shines on' : 'flows into'} ${HOUSE_TEXT[i.house - 1].area}.`)
  } else {
    body.push(`For ${STAY[i.body] ?? 'a while'}, ${name} colours everyone’s ${theme.noun} with ${sign}. Add a birth time to see which area of your life it lands in.`)
  }
  return {
    eyebrow: i.house ? 'House ingress' : 'Sign ingress',
    title: `${name} ${i.retrograde ? 're-enters' : 'enters'} ${where}`,
    body,
  }
}

export function eventText(e: ForecastEvent, now: Date): EventText {
  switch (e.kind) {
    case 'transit':
      return transitText(e, now)
    case 'lunation':
      return lunationText(e)
    case 'station':
      return stationText(e)
    case 'ingress':
      return ingressText(e)
  }
}

export function eventGlyph(e: ForecastEvent): BodyId {
  switch (e.kind) {
    case 'transit':
      return e.transit
    case 'lunation':
      return 'moon'
    case 'station':
    case 'ingress':
      return e.body
  }
}
