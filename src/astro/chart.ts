import { findAspects, DEFAULT_ORBS, type Aspect, type AspectPoint, type OrbConfig } from './aspects'
import { bodyPosition, isBodyAvailable, ramc, trueObliquity } from './ephemeris'
import {
  computeAngles,
  houseOf,
  placidusCusps,
  PlacidusUnavailableError,
  wholeSignCusps,
  type Angles,
  type HouseSystem,
} from './houses'
import { resolveBirthTime, type TimeNote } from './time'
import {
  BODIES,
  BODY_BY_ID,
  signOf,
  type BodyId,
  type Element,
  type Modality,
  type SignInfo,
} from './zodiac'

export interface Place {
  name: string
  /** e.g. "Baden-Württemberg, Germany" */
  region?: string
  lat: number
  lon: number
  timeZone: string
}

export interface BirthInput {
  name?: string
  date: string
  time: string | null
  place: Place
}

export interface ChartOptions {
  houseSystem?: HouseSystem
  orbs?: OrbConfig
}

export interface Placement {
  id: BodyId
  lon: number
  lat: number
  speed: number
  retrograde: boolean
  sign: SignInfo
  house: number | null
  /** Position uncertain because birth time is unknown (Moon moves ~13°/day). */
  approximate: boolean
}

export interface Balance {
  elements: Record<Element, number>
  modalities: Record<Modality, number>
}

export interface Chart {
  input: BirthInput
  utc: Date
  offsetMinutes: number
  timeNote: TimeNote
  timeKnown: boolean
  bodies: Placement[]
  angles: Angles | null
  cusps: number[] | null
  houseSystem: HouseSystem
  /** Set when the requested house system couldn't be used (e.g. polar latitudes). */
  houseFallback: string | null
  aspects: Aspect[]
  balance: Balance
}

export function computeBalance(bodies: Placement[], asc: number | null): Balance {
  const elements: Record<Element, number> = { fire: 0, earth: 0, air: 0, water: 0 }
  const modalities: Record<Modality, number> = { cardinal: 0, fixed: 0, mutable: 0 }
  for (const b of bodies) {
    const w = BODY_BY_ID[b.id].balanceWeight
    elements[b.sign.element] += w
    modalities[b.sign.modality] += w
  }
  if (asc !== null) {
    const s = signOf(asc)
    elements[s.element] += 2
    modalities[s.modality] += 2
  }
  return { elements, modalities }
}

export function computePlacements(utc: Date, ids: BodyId[] = BODIES.map((b) => b.id)) {
  return ids
    .filter((id) => isBodyAvailable(id, utc))
    .map((id) => {
      const p = bodyPosition(id, utc)
      return { id, ...p }
    })
}

export function computeChart(input: BirthInput, options: ChartOptions = {}): Chart {
  const houseSystem = options.houseSystem ?? 'whole-sign'
  const timeKnown = input.time !== null
  const resolved = resolveBirthTime({
    date: input.date,
    time: input.time,
    timeZone: input.place.timeZone,
    longitude: input.place.lon,
  })
  const utc = resolved.utc

  let angles: Angles | null = null
  let cusps: number[] | null = null
  let houseFallback: string | null = null
  if (timeKnown) {
    const eps = trueObliquity(utc)
    const r = ramc(utc, input.place.lon)
    angles = computeAngles(r, eps, input.place.lat)
    if (houseSystem === 'placidus') {
      try {
        cusps = placidusCusps(r, eps, input.place.lat)
      } catch (err) {
        if (!(err instanceof PlacidusUnavailableError)) throw err
        houseFallback = 'Placidus houses are undefined this close to the poles, so Whole Sign houses are shown.'
        cusps = wholeSignCusps(angles.asc)
      }
    } else {
      cusps = wholeSignCusps(angles.asc)
    }
  }

  const bodies: Placement[] = computePlacements(utc).map((p) => ({
    id: p.id,
    lon: p.lon,
    lat: p.lat,
    speed: p.speed,
    retrograde: p.speed < 0 && p.id !== 'node',
    sign: signOf(p.lon),
    house: cusps ? houseOf(p.lon, cusps) : null,
    approximate: !timeKnown && p.id === 'moon',
  }))

  const points: AspectPoint[] = bodies.map((b) => ({
    id: b.id,
    lon: b.lon,
    speed: b.speed,
    luminary: b.id === 'sun' || b.id === 'moon',
    minor: b.id === 'node' || b.id === 'chiron',
  }))
  if (angles) {
    points.push({ id: 'asc', lon: angles.asc, speed: 0, minor: true })
    points.push({ id: 'mc', lon: angles.mc, speed: 0, minor: true })
  }
  const aspects = findAspects(points, options.orbs ?? DEFAULT_ORBS).filter(
    // The node is always opposite its own south node; skip node–angle noise.
    (a) => !(a.a === 'node' && (a.b === 'asc' || a.b === 'mc')),
  )

  return {
    input,
    utc,
    offsetMinutes: resolved.offsetMinutes,
    timeNote: resolved.note,
    timeKnown,
    bodies,
    angles,
    cusps,
    houseSystem: houseFallback ? 'whole-sign' : houseSystem,
    houseFallback,
    aspects,
    balance: computeBalance(bodies, angles?.asc ?? null),
  }
}
