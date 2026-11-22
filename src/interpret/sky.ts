import type { Aspect } from '../astro/aspects'
import type { Chart } from '../astro/chart'
import {
  altitudeOf,
  moonPhase,
  nearestEvent,
  sectStatus,
  skySeparation,
  solarCondition,
  visibility,
  type DiurnalPhase,
  type HorizonBody,
  type HorizonModel,
  type MoonPhase,
  type SectRole,
  type SkyEvent,
  type Vec3,
} from '../astro/horizon'
import { angleDiff, BODY_BY_ID, norm360, type BodyId } from '../astro/zodiac'
import { pointName } from './describe'
import {
  ASPECT_HORIZON_TEXT,
  ASPECT_NATURE,
  BODY_THEME,
  BODY_ZONE_TEXT,
  CAZIMI_TEXT,
  COMBUST_TEXT,
  HALB_TEXT,
  MERCURY_SECT_TEXT,
  ORIENTAL_TEXT,
  SECT_TEXT,
  strengthText,
  ZONE_AREA,
  ZONE_TIMING,
  ZONE_TITLE,
  ZONE_AT,
  ZONE_WHERE,
  zonePairText,
  type Zone,
} from './skyTexts'

/*
 * Readings for the side view: what a planet's place in the real sky means for
 * the person, on top of its sign and house. Interpretation comes first; the
 * astronomy behind it ("the sky picture") follows as supporting detail.
 * Everything is derived from the horizon model, so it agrees with the wheel.
 */

export interface SkyFact {
  label: string
  value: string
}

export interface SkyReading {
  /** The heart of it in one line, e.g. "Your luck comes through other people." */
  headline: string
  /** What this means for the person. */
  meaning: string[]
  facts: SkyFact[]
  /** Where it actually was: position, timing, visibility. */
  sky: string[]
}

const DIRECTIONS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']
export const direction = (az: number) => DIRECTIONS[Math.round(norm360(az) / 45) % 8]

export const PHASE_LABEL: Record<DiurnalPhase, string> = {
  rising: 'Rising',
  climbing: 'Climbing',
  culminating: 'Culminating',
  descending: 'Descending',
  setting: 'Setting',
  'just-set': 'Just set',
  sinking: 'Sinking',
  lowest: 'Lowest point',
  returning: 'Turning east',
  'pre-rising': 'About to rise',
  circumpolar: 'Never sets',
  'never-rises': 'Never rises',
}

export const SECT_ROLE_LABEL: Record<SectRole, string> = {
  'sect-light': 'Sect light',
  'luminary-contrary': 'Luminary out of sect',
  'benefic-of-sect': 'Benefic of sect',
  'benefic-contrary': 'Benefic out of sect',
  'malefic-of-sect': 'Malefic of sect',
  'malefic-contrary': 'Malefic contrary to sect',
  mercury: 'Mercury',
}

/** "The Sun", "The North Node", "Venus". */
export function theName(id: BodyId): string {
  const n = BODY_BY_ID[id].name
  return id === 'sun' || id === 'moon' || id === 'node' ? `The ${n}` : n
}
/** Lower-cases a leading article only: "The Sun" → "the Sun", "Jupiter" stays. */
const lower = (s: string) => s.replace(/^The /, 'the ')
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const firstSentence = (s: string) => s.slice(0, s.search(/[.:](\s|$)/) + 1).replace(/:$/, '.')

/** Display name for any chart point, with an article where English wants one. */
function pname(id: string, start = false): string {
  const n = id === 'asc' ? 'The Ascendant' : id === 'mc' ? 'The Midheaven' : theName(id as BodyId)
  return start ? n : lower(n)
}

/** "sense of purpose" etc. for planets; something sensible for the angles. */
function theme(id: string): string {
  if (id === 'asc') return 'way of meeting the world'
  if (id === 'mc') return 'public direction'
  return BODY_THEME[id as BodyId]
}

export function formatAltitude(alt: number): string {
  const a = Math.abs(alt)
  return `${alt >= 0 ? '+' : '−'}${a < 1 ? a.toFixed(1) : Math.round(a)}°`
}
const deg = (x: number) => {
  const a = Math.abs(x)
  return `${a < 1 ? a.toFixed(1) : Math.round(a)}°`
}

export function formatDuration(hours: number): string {
  const mins = Math.round(Math.abs(hours) * 60)
  if (mins < 60) return `${Math.max(1, mins)} minute${mins === 1 ? '' : 's'}`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const hs = `${h} hour${h === 1 ? '' : 's'}`
  return m < 5 ? hs : `${hs} ${m} minutes`
}

const EVENT_VERB: Record<SkyEvent['kind'], [past: string, future: string]> = {
  rise: ['rose', 'would rise'],
  culminate: ['crossed the top of the sky', 'would reach the top of the sky'],
  set: ['set', 'would set'],
  lower: ['passed its lowest point', 'would reach its lowest point'],
}

/** "It rose about 40 minutes before you were born." Only for turning points within three hours. */
export function eventSentence(e: SkyEvent): string | null {
  if (!Number.isFinite(e.hours) || Math.abs(e.hours) > 3) return null
  const [past, future] = EVENT_VERB[e.kind]
  return e.hours <= 0
    ? `It ${past} about ${formatDuration(e.hours)} before you were born.`
    : `It ${future} about ${formatDuration(e.hours)} after you were born.`
}

/** The part of the sky (and so the area of life) a body belongs to: its nearest daily turning point. */
export function zoneOf(b: HorizonBody): Zone {
  return nearestEvent(b).kind
}

/* ——— Planet readings ——— */

function zoneMeaning(b: HorizonBody): string {
  const e = nearestEvent(b)
  const zone = e.kind
  const parts = [BODY_ZONE_TEXT[b.id][zone]]
  if (b.phase !== 'circumpolar' && b.phase !== 'never-rises') parts.push(ZONE_TIMING[zone][e.hours > 0 ? 0 : 1])
  parts.push(strengthText(e.hours))
  return parts.join(' ')
}

function sectMeaning(b: HorizonBody, model: HorizonModel): string | null {
  const st = sectStatus(b, model.sect)
  if (!st) return null
  let s: string
  if (st.role === 'mercury') {
    const t = MERCURY_SECT_TEXT[st.team]
    s = `${t[0]} ${st.inSect ? t[1] : t[2]}`
  } else {
    s = SECT_TEXT[b.id as keyof typeof SECT_TEXT][st.role]!
  }
  if (b.id !== 'sun' && b.id !== 'moon' && st.inSect && st.halb) s += ` ${HALB_TEXT}`
  return s
}

const MOON_PHASE_TEXT: Record<MoonPhase, string> = {
  new: 'You were born at the New Moon. Instinct and purpose are fused in you, which gives you a strong drive to start things, though your feelings and goals can be hard to tell apart.',
  'waxing-crescent': 'You were born under a waxing crescent Moon. You grow by reaching out, starting fresh and pushing past old patterns toward something new.',
  'first-quarter': 'You were born at the first-quarter Moon. You grow through decisive action, and life tends to ask you to push through resistance and build something.',
  'waxing-gibbous': 'You were born under a waxing gibbous Moon. You grow by refining: improving, adjusting and perfecting what you’ve started, often with high standards.',
  full: 'You were born at the Full Moon. What you feel and what you want are both fully lit, and often pulling in different directions; relationships tend to be where you find the balance.',
  'waning-gibbous': 'You were born under a waning gibbous Moon. You grow by sharing: teaching, passing on what you’ve learned and giving back.',
  'last-quarter': 'You were born at the last-quarter Moon. You grow by letting go of what no longer fits, and you can see through old structures to what really matters.',
  balsamic: 'You were born under a balsamic Moon, at the end of the lunar cycle. You tend to be reflective and intuitive, with a sense of finishing something and preparing what comes next.',
}

function sunMeaning(b: HorizonBody): string | null {
  if (b.id === 'moon') return MOON_PHASE_TEXT[moonPhase(b.elongation)]
  const sc = solarCondition(b)
  if (!sc) return null
  if (sc.condition === 'cazimi') return CAZIMI_TEXT
  if (sc.condition === 'combust' || sc.condition === 'under-beams') return COMBUST_TEXT[b.id] ?? null
  const pair = ORIENTAL_TEXT[b.id]
  return pair ? pair[b.solarPhase === 'oriental' ? 0 : 1] : null
}

function positionText(b: HorizonBody, sunAltitude: number): string[] {
  const n = theName(b.id)
  const where =
    b.phase === 'circumpolar'
      ? `At your latitude ${lower(n)} never set that day.`
      : b.phase === 'never-rises'
        ? `At your latitude ${lower(n)} never rose that day.`
        : `${n} was ${deg(b.alt)} ${b.above ? 'above' : 'below'} the horizon in the ${direction(b.az)}: ${PHASE_LABEL[b.phase].toLowerCase()}.`
  const when = eventSentence(nearestEvent(b))
  let seen = ''
  if (b.above) {
    const v = visibility(b, sunAltitude)
    if (v === 'visible')
      seen =
        b.id === 'moon' && sunAltitude > 0
          ? 'The Moon can be seen by day, so it may well have been visible.'
          : `It was really there to see: anyone looking up when you were born could have spotted ${lower(n)}.`
    else if (v === 'twilight') seen = 'It was twilight, so it may just have been coming out.'
    else if (v === 'daylight') seen = 'It was lost in the Sun’s glare, so nobody could have seen it.'
    else if (v === 'faint') seen = 'It is too faint to notice without a telescope.'
    else if (v === 'point') seen = 'It is a calculated point rather than something you can see.'
  }
  return [[where, when, seen].filter(Boolean).join(' ')]
}

function solarLabel(b: HorizonBody): string | null {
  if (b.id === 'moon') {
    return {
      new: 'New Moon',
      'waxing-crescent': 'Waxing crescent',
      'first-quarter': 'First quarter',
      'waxing-gibbous': 'Waxing gibbous',
      full: 'Full Moon',
      'waning-gibbous': 'Waning gibbous',
      'last-quarter': 'Last quarter',
      balsamic: 'Balsamic',
    }[moonPhase(b.elongation)]
  }
  const sc = solarCondition(b)
  if (!sc) return null
  if (sc.condition === 'cazimi') return 'Cazimi'
  if (sc.condition === 'combust') return 'Combust'
  if (sc.condition === 'under-beams') return 'Under the beams'
  return b.solarPhase === 'oriental' ? 'Morning (oriental)' : 'Evening (occidental)'
}

export function bodySkyReading(model: HorizonModel, id: BodyId): SkyReading | null {
  const b = model.bodies.find((x) => x.id === id)
  if (!b) return null
  const zone = zoneOf(b)
  const headline = firstSentence(BODY_ZONE_TEXT[b.id][zone])
  // The headline is the zone text's first sentence; don't say it twice.
  const meaning = [zoneMeaning(b).slice(headline.length).trim()]
  const sect = sectMeaning(b, model)
  if (sect) meaning.push(sect)
  const sun = sunMeaning(b)
  if (sun) meaning.push(sun)

  const facts: SkyFact[] = [
    { label: 'Part of the sky', value: `${ZONE_TITLE[zone]} · ${zone === 'rise' ? 'self' : zone === 'culminate' ? 'career' : zone === 'set' ? 'relationships' : 'home & roots'}` },
    { label: 'Altitude', value: formatAltitude(b.alt) },
  ]
  const st = sectStatus(b, model.sect)
  if (st)
    facts.push({
      label: 'Sect',
      value: st.role === 'mercury' ? `${st.team === 'diurnal' ? 'Day team' : 'Night team'}${st.inSect ? ' · in sect' : ' · out of sect'}` : SECT_ROLE_LABEL[st.role],
    })
  const sl = solarLabel(b)
  if (sl) facts.push({ label: b.id === 'moon' ? 'Phase' : 'With the Sun', value: sl })

  return {
    headline,
    meaning,
    facts,
    sky: positionText(b, model.sunAltitude),
  }
}

/* ——— Angle readings ——— */

/** Bodies within `hours` of a given turning point. */
function bodiesAt(model: HorizonModel, kind: SkyEvent['kind'], hours = 1.5): HorizonBody[] {
  return model.bodies.filter((b) => {
    const e = nearestEvent(b)
    return e.kind === kind && Math.abs(e.hours) <= hours
  })
}

const list = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`)

export function angleSkyReading(chart: Chart, model: HorizonModel, id: 'asc' | 'mc'): SkyReading | null {
  if (!chart.angles) return null
  const v = model.eclToHor(chart.angles[id])
  const az = norm360((Math.atan2(-v[1], v[0]) * 180) / Math.PI)

  if (id === 'asc') {
    const offEast = angleDiff(az, 90) // + = south of east
    const with_ = bodiesAt(model, 'rise')
    const meaning = with_.length
      ? [
          `${cap(list(with_.map((b) => lower(theName(b.id)))))} ${with_.length === 1 ? 'was' : 'were'} rising with your Ascendant, so ${
            with_.length === 1 ? 'it colours' : 'they colour'
          } your whole manner, your body and the first impression you make.`,
          ...with_.map((b) => BODY_ZONE_TEXT[b.id].rise),
        ]
      : [
          'No planets were rising alongside your Ascendant, so your rising sign speaks for itself: people meet its qualities directly, without a planet colouring them.',
        ]
    return {
      headline: with_.length ? `Rising with ${list(with_.map((b) => lower(theName(b.id))))}` : 'Your rising sign, unaccompanied',
      meaning,
      facts: [{ label: 'Direction', value: direction(az) }],
      sky: [
        `Your Ascendant is the exact point where the zodiac was crossing your eastern horizon. It rose ${
          Math.abs(offEast) < 3 ? 'almost due east' : `${deg(offEast)} ${offEast > 0 ? 'south' : 'north'} of due east`
        }.`,
      ],
    }
  }

  const alt = altitudeOf(v)
  const with_ = bodiesAt(model, 'culminate')
  const meaning: string[] = [
    alt <= 0
      ? 'Your Midheaven was below the horizon at birth, which only happens in the far north or south. Your public path is literally out of sight at the start: it tends to be something you define for yourself rather than something handed to you.'
      : alt > 60
        ? 'Your Midheaven stood high and steep, close to overhead. This is often read as ambitions that are visible and clearly defined: you tend to know what you’re reaching for, and others can see it too.'
        : alt < 30
          ? 'Your Midheaven sat fairly low, so the peak of your chart wasn’t very high. This is often read as a public path found gradually, through experience, rather than one that is obvious from the start.'
          : 'Your Midheaven stood at a moderate height: a public path that is neither handed to you nor hidden, but grows as you put your energy into it.',
  ]
  if (with_.length) {
    meaning.push(
      `${cap(list(with_.map((b) => lower(theName(b.id)))))} ${with_.length === 1 ? 'was' : 'were'} culminating with it, which makes ${
        with_.length === 1 ? 'it' : 'them'
      } prominent in your vocation and reputation.`,
      ...with_.map((b) => BODY_ZONE_TEXT[b.id].culminate),
    )
  }
  return {
    headline: with_.length ? `Crowned by ${list(with_.map((b) => lower(theName(b.id))))}` : alt > 60 ? 'A high, clear peak' : alt < 30 ? 'A low peak, found gradually' : 'A peak that grows with you',
    meaning,
    facts: [{ label: 'Altitude', value: formatAltitude(alt) }],
    sky: [`Your Midheaven is where the zodiac crossed your meridian, the line overhead from north to south. It stood ${deg(alt)} ${alt > 0 ? 'above' : 'below'} the ${direction(az)}ern horizon.`],
  }
}

/* ——— Aspect readings ——— */

function pointHor(model: HorizonModel, chart: Chart, id: string): Vec3 | null {
  if (id === 'asc' || id === 'mc') return chart.angles ? model.eclToHor(chart.angles[id]) : null
  return model.bodies.find((b) => b.id === id)?.hor ?? null
}

function pointZone(model: HorizonModel, id: string): Zone | null {
  if (id === 'asc') return 'rise'
  if (id === 'mc') return 'culminate'
  const b = model.bodies.find((x) => x.id === id)
  return b ? zoneOf(b) : null
}

const pointLon = (chart: Chart, id: string) => (id === 'asc' || id === 'mc' ? chart.angles![id] : chart.bodies.find((b) => b.id === id)!.lon)

export function aspectSkyReading(chart: Chart, model: HorizonModel, a: Aspect): SkyReading | null {
  const ha = pointHor(model, chart, a.a)
  const hb = pointHor(model, chart, a.b)
  if (!ha || !hb) return null
  const eclSep = Math.abs(angleDiff(pointLon(chart, a.a), pointLon(chart, a.b)))
  const skySep = skySeparation(ha, hb)
  const altA = altitudeOf(ha)
  const altB = altitudeOf(hb)
  const nature = ASPECT_NATURE[a.type]
  const meaning: string[] = []

  // The Ascendant is on the horizon itself: read the other end against it.
  const hasAsc = a.a === 'asc' || a.b === 'asc'
  if (hasAsc) {
    const other = a.a === 'asc' ? a.b : a.a
    const altO = a.a === 'asc' ? altB : altA
    meaning.push(
      `There’s ${nature === 'tension' ? 'friction' : nature === 'flow' ? 'an easy flow' : 'a merging'} between your ${theme(other)} and the way you meet the world. ${
        altO >= 0
          ? 'With it in the visible sky, people tend to see this link in you straight away.'
          : 'With it below the horizon, this link works from the inside: it shapes how you come across, even if people can’t quite name it.'
      }`,
    )
  } else if (altA > 0 && altB > 0) meaning.push(ASPECT_HORIZON_TEXT.up[nature](theme(a.a), theme(a.b)))
  else if (altA < 0 && altB < 0) meaning.push(ASPECT_HORIZON_TEXT.down[nature](theme(a.a), theme(a.b)))
  else {
    const [up, down] = altA > 0 ? [a.a, a.b] : [a.b, a.a]
    meaning.push(ASPECT_HORIZON_TEXT.split[nature](theme(up), theme(down)))
  }

  const za = pointZone(model, a.a)
  const zb = pointZone(model, a.b)
  if (za && zb && !(hasAsc && (za === 'rise') && (zb === 'rise'))) meaning.push(zonePairText(za, zb))

  const sky: string[] = [
    Math.abs(skySep - eclSep) >= 1
      ? `Along the zodiac they are ${deg(eclSep)} apart; across the real sky, ${deg(skySep)}.`
      : `They are ${deg(eclSep)} apart along the zodiac, and practically the same across the real sky.`,
  ]
  if (a.type === 'conjunction' && Math.abs(altA - altB) >= 3) {
    const [hi, lo] = altA > altB ? [a.a, a.b] : [a.b, a.a]
    sky.push(
      `On the flat wheel they sit side by side, but ${pname(hi)} was ${deg(Math.abs(altA - altB))} higher in the sky than ${pname(lo)}${
        (altA > 0) !== (altB > 0) ? ', with the horizon running between them' : ''
      }.`,
    )
  }

  const where =
    hasAsc ? 'Through your rising sign' : altA > 0 && altB > 0 ? 'Played out in the open' : altA < 0 && altB < 0 ? 'An inner conversation' : 'Between what shows and what’s hidden'
  return {
    headline: where,
    meaning,
    facts: [
      { label: pointName(a.a), value: formatAltitude(altA) },
      { label: pointName(a.b), value: formatAltitude(altB) },
    ],
    sky,
  }
}

/* ——— Whole-chart overview ——— */

/** Weight in hemisphere counts: luminaries count double, modern planets half, points not at all. */
const HEMI_WEIGHT: Record<BodyId, number> = {
  sun: 2,
  moon: 2,
  mercury: 1,
  venus: 1,
  mars: 1,
  jupiter: 1,
  saturn: 1,
  uranus: 0.5,
  neptune: 0.5,
  pluto: 0.5,
  node: 0,
  chiron: 0,
}

const ZONE_SHORT: Record<Zone, string> = {
  rise: 'through who you are',
  culminate: 'through your work and reputation',
  set: 'through your relationships',
  lower: 'through home and family',
}

export interface Standout {
  id: BodyId
  label: string
  text: string
}

export interface SkyOverview {
  /** A short narrative: what the birth sky says about this person. */
  summary: string[]
  sect: { title: string; summary: string; meaning: string; visibility: string }
  team: { role: string; id: BodyId; where: string; note: string }[]
  hemispheres: { above: number; east: number; vertical: string; horizontal: string }
  standouts: Standout[]
  flatVsSky: { a: string; b: string; text: string }[]
}

export function skyOverview(chart: Chart, model: HorizonModel): SkyOverview {
  const day = model.sect === 'day'
  const sunAlt = model.sunAltitude
  const body = (id: BodyId) => model.bodies.find((b) => b.id === id)
  const byRole = (role: SectRole) => model.bodies.find((x) => sectStatus(x, model.sect)?.role === role)

  /* Narrative summary */
  const summary: string[] = []
  const light = byRole('sect-light')
  if (light) {
    const z = zoneOf(light)
    summary.push(
      day
        ? `You were born by day, so your chart is led by the Sun: your goals and sense of purpose do the steering. With the Sun ${ZONE_WHERE[z]}, that purpose finds its natural outlet in ${ZONE_AREA[z]}.`
        : `You were born at night, so your chart is led by the Moon: your feelings and instincts do the steering. With the Moon ${ZONE_WHERE[z]}, you find emotional security through ${ZONE_AREA[z]}.`,
    )
  }
  const helper = byRole('benefic-of-sect')
  if (helper) {
    const z = zoneOf(helper)
    summary.push(`Your most reliable source of good fortune is ${helper.id === 'jupiter' ? 'Jupiter' : 'Venus'}, ${ZONE_WHERE[z]}: things tend to go right for you through ${ZONE_AREA[z]}.`)
  }
  const test = byRole('malefic-contrary')
  if (test) {
    const z = zoneOf(test)
    summary.push(
      `Your biggest test is ${test.id === 'saturn' ? 'Saturn' : 'Mars'}, ${ZONE_WHERE[z]}. Expect your hardest lessons, and the strength they leave you with, to come through ${ZONE_AREA[z]}.`,
    )
  }
  const loud = model.bodies
    .filter((b) => b.id !== 'node' && b.id !== light?.id)
    .map((b) => ({ b, e: nearestEvent(b) }))
    .filter((x) => Math.abs(x.e.hours) < 1)
    .sort((x, y) => Math.abs(x.e.hours) - Math.abs(y.e.hours))[0]
  if (loud) {
    summary.push(
      `${theName(loud.b.id)} was ${ZONE_AT[loud.e.kind]}, which makes it one of the loudest voices in your chart. ${BODY_ZONE_TEXT[loud.b.id][loud.e.kind]}`,
    )
  }

  /* Sect */
  const nakedEye = model.bodies.filter((b) => visibility(b, sunAlt) === 'visible').map((b) => BODY_BY_ID[b.id].name)
  let vis: string
  if (sunAlt > 0)
    vis = nakedEye.includes('Moon')
      ? 'The Sun was up, so the planets overhead were hidden in daylight, though the Moon may have been visible.'
      : 'The Sun was up, so the planets overhead were hidden in daylight.'
  else if (sunAlt > -6) vis = 'It was twilight: the brightest planets above the horizon would just have been coming out.'
  else vis = nakedEye.length ? `Up and visible to the naked eye: ${list(nakedEye)}.` : 'None of the naked-eye planets were above the horizon.'

  const team: SkyOverview['team'] = []
  const roles: [SectRole, string][] = [
    ['sect-light', 'Leads your chart'],
    ['benefic-of-sect', 'Your most reliable help comes'],
    ['malefic-of-sect', 'Constructive challenges come'],
    ['malefic-contrary', 'Your biggest test comes'],
  ]
  for (const [role, note] of roles) {
    const b = byRole(role)
    if (!b) continue
    const st = sectStatus(b, model.sect)!
    const z = zoneOf(b)
    team.push({
      role: SECT_ROLE_LABEL[role],
      id: b.id,
      where: `${formatAltitude(b.alt)} · ${ZONE_TITLE[z].toLowerCase()}${role !== 'sect-light' && st.inSect && st.halb ? ' · halb' : ''}`,
      note: role === 'sect-light' ? `${note}, ${ZONE_SHORT[z].replace(/^through/, 'expressed through')}` : `${note} ${ZONE_SHORT[z]}`,
    })
  }

  /* Hemispheres */
  let total = 0
  let above = 0
  let east = 0
  for (const b of model.bodies) {
    const w = HEMI_WEIGHT[b.id]
    total += w
    if (b.above) above += w
    if (b.hourAngle < 0) east += w
  }
  const aboveShare = total ? above / total : 0.5
  const eastShare = total ? east / total : 0.5
  const vertical =
    aboveShare >= 0.65
      ? 'Most of your planets were overhead, in the visible sky. You tend to live an outward life: you grow through what you do in the world, and people get a fairly clear sense of who you are.'
      : aboveShare <= 0.35
        ? 'Most of your planets were below the horizon, out of sight. You tend to live an inward life: you grow through private experience, close bonds and inner work, and people may take a while to really know you. Public recognition, if it comes, often comes later.'
        : 'Your planets were split fairly evenly above and below the horizon, so you tend to move between a public self and a private one, needing both.'
  const horizontal =
    eastShare >= 0.65
      ? 'Most were on the eastern, rising side of the sky. You’re self-starting: you tend to shape your own path rather than wait for it, and you’re happiest with your hands on the wheel.'
      : eastShare <= 0.35
        ? 'Most were on the western, setting side of the sky. You’re responsive: your path tends to open up through other people, invitations and circumstances, and you do your best work in partnership.'
        : 'East and west were evenly weighted: you can start things yourself and respond to others in equal measure.'

  /* Standouts */
  const standouts: Standout[] = []
  // Tradition gives the elevation emphasis to the seven visible planets.
  const classical = model.bodies.filter((b) => ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'].includes(b.id))
  const highest = [...classical].sort((x, y) => y.alt - x.alt)[0]
  if (highest && highest.alt > 0) {
    standouts.push({
      id: highest.id,
      label: `Highest in the sky · ${formatAltitude(highest.alt)}`,
      text: `The most elevated planet has extra say in your life, especially in how the world sees you. People tend to notice your ${BODY_THEME[highest.id]} early on.`,
    })
  }
  for (const zone of ['rise', 'culminate', 'set', 'lower'] as const) {
    for (const b of bodiesAt(model, zone, 1)) {
      if (b.id === highest?.id && zone === 'culminate') continue
      const e = nearestEvent(b)
      standouts.push({
        id: b.id,
        label: `${ZONE_TITLE[zone]} · ${formatDuration(e.hours)} ${e.hours <= 0 ? 'before' : 'after'} birth`,
        text: firstSentence(BODY_ZONE_TEXT[b.id][zone]),
      })
    }
  }
  for (const id of ['venus', 'mercury'] as const) {
    const b = body(id)
    const sc = b && solarCondition(b)
    if (b && sc?.condition === 'free')
      standouts.push({ id, label: b.solarPhase === 'oriental' ? 'Morning star' : 'Evening star', text: ORIENTAL_TEXT[id]![b.solarPhase === 'oriental' ? 0 : 1] })
  }
  for (const b of model.bodies) {
    const sc = solarCondition(b)
    if (!sc || b.id === 'moon') continue
    if (sc.condition === 'cazimi') standouts.push({ id: b.id, label: 'Cazimi', text: firstSentence(CAZIMI_TEXT) })
    else if (sc.condition === 'combust' && COMBUST_TEXT[b.id])
      standouts.push({ id: b.id, label: `Combust · ${deg(sc.distance)} from the Sun`, text: firstSentence(COMBUST_TEXT[b.id]!) })
  }

  /* Where the flat wheel misleads: conjunctions at different heights or split by the horizon. */
  const flatVsSky: SkyOverview['flatVsSky'] = []
  for (const a of chart.aspects) {
    if (a.type !== 'conjunction') continue
    const ha = pointHor(model, chart, a.a)
    const hb = pointHor(model, chart, a.b)
    if (!ha || !hb) continue
    const altA = altitudeOf(ha)
    const altB = altitudeOf(hb)
    const split = (altA > 0) !== (altB > 0) && Math.abs(altA) > 0.05 && Math.abs(altB) > 0.05
    const diff = Math.abs(altA - altB)
    if (!split && diff < 3) continue
    const [hi, lo] = altA > altB ? [a.a, a.b] : [a.b, a.a]
    flatVsSky.push({
      a: a.a,
      b: a.b,
      text: split
        ? `${pname(a.a, true)} and ${pname(a.b)} look joined on the wheel, but the horizon ran between them: your ${theme(hi)} on show, your ${theme(lo)} kept private. Two sides of one theme.`
        : `${pname(a.a, true)} and ${pname(a.b)} look side by side on the wheel, but ${pname(hi)} sat ${deg(diff)} higher, putting your ${theme(hi)} a step ahead of your ${theme(lo)}.`,
    })
  }

  return {
    summary,
    sect: {
      title: day ? 'Day chart' : 'Night chart',
      summary: `The Sun was ${deg(sunAlt)} ${sunAlt > 0 ? 'above' : 'below'} the horizon${Math.abs(sunAlt) < 1 ? ', almost exactly on it, so the sect is borderline' : ''}.`,
      meaning: day
        ? 'A day chart is led by the Sun, with Jupiter and Saturn on its team. You tend to steer by purpose and clarity, and to build your life in the open.'
        : 'A night chart is led by the Moon, with Venus and Mars on its team. You tend to steer by instinct and feeling, and much of what matters most to you is built in private.',
      visibility: vis,
    },
    team,
    hemispheres: { above: aboveShare, east: eastShare, vertical, horizontal },
    standouts,
    flatVsSky,
  }
}
