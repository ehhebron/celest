import {
  EclipseKind,
  MakeTime,
  NextGlobalSolarEclipse,
  NextLunarEclipse,
  SearchGlobalSolarEclipse,
  SearchLunarEclipse,
  SearchMoonPhase,
  SearchSunLongitude,
} from 'astronomy-engine'
import { ASPECTS, type AspectType } from './aspects'
import type { Chart } from './chart'
import { bodyLongitude, isBodyAvailable } from './ephemeris'
import { houseOf } from './houses'
import { natalPoints, TRANSIT_ORB, type NatalPoint } from './transits'
import { angleDiff, norm360, signOf, type BodyId, type SignId } from './zodiac'

const DAY = 86400000

// ——— Configuration ———

/** Bodies whose transits make the forecast (fast planets would flood it). */
export const FORECAST_BODIES: BodyId[] = ['mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'node']

/** Sample step (days): small enough that no in-orb pass slips between samples. */
const STEP: Partial<Record<BodyId, number>> = {
  sun: 0.5, mercury: 0.5, venus: 0.5, mars: 1, jupiter: 2, saturn: 2,
  uranus: 4, neptune: 5, pluto: 5, chiron: 3, node: 2,
}

/** Passes closer together than this belong to one retrograde cycle. */
const GROUP_GAP_DAYS: Partial<Record<BodyId, number>> = {
  mars: 120, jupiter: 330, saturn: 330, uranus: 330, neptune: 330, pluto: 330, chiron: 330, node: 200,
}

/** How far outside the requested range to scan, so whole cycles are found. */
const PAD_DAYS: Partial<Record<BodyId, number>> = {
  mars: 200, jupiter: 500, saturn: 600, uranus: 800, neptune: 900, pluto: 900, chiron: 800, node: 400,
}

const TRANSIT_WEIGHT: Partial<Record<BodyId, number>> = {
  pluto: 10, neptune: 9, uranus: 9, saturn: 8, jupiter: 6, chiron: 5, node: 5, mars: 4,
}
const NATAL_WEIGHT: Record<string, number> = {
  sun: 10, moon: 10, asc: 9, mc: 8, mercury: 6, venus: 6, mars: 6,
  saturn: 5, jupiter: 4, uranus: 3, neptune: 3, pluto: 3,
}
const ASPECT_WEIGHT: Record<AspectType, number> = {
  conjunction: 1, opposition: 0.9, square: 0.9, trine: 0.7, sextile: 0.5,
}

// ——— Types ———

export interface TransitWindow {
  kind: 'transit'
  transit: BodyId
  natal: string
  type: AspectType
  /** First and last moment within orb, across all passes of this cycle. */
  start: Date
  end: Date
  /** Exact hits (1, or 2–3 when retrograde loops back over the point). */
  exacts: Date[]
  /** Closest approach in degrees (0 if exact). */
  closest: number
  /** House the transiting planet occupies at the first exact hit (or start). */
  transitHouse: number | null
  score: number
}

export interface Lunation {
  kind: 'lunation'
  date: Date
  phase: 'new' | 'full'
  lon: number
  sign: SignId
  house: number | null
  eclipse: null | { type: 'solar' | 'lunar'; kind: EclipseKind }
  /** Natal points within 3° of the lunation. */
  contacts: { natal: string; orb: number }[]
  score: number
}

export interface Station {
  kind: 'station'
  date: Date
  body: BodyId
  direction: 'retrograde' | 'direct'
  lon: number
  sign: SignId
  house: number | null
  /** A natal point within 2° of the station, if any. */
  near: { natal: string; orb: number } | null
  score: number
}

export interface Ingress {
  kind: 'ingress'
  date: Date
  body: BodyId
  /** House entered (when houses are known), otherwise sign entered. */
  house: number | null
  sign: SignId
  /** Re-entering a previous house/sign during a retrograde. */
  retrograde: boolean
  score: number
}

export type ForecastEvent = TransitWindow | Lunation | Station | Ingress

export interface ProgressedMoon {
  lon: number
  sign: SignId
  house: number | null
  next: { date: Date; sign: SignId } | null
}

export interface Forecast {
  from: Date
  to: Date
  events: ForecastEvent[]
  progressedMoon: ProgressedMoon
  solarReturn: Date | null
}

// ——— Helpers ———

/** Sample a body's longitude on a regular grid. */
function sampleBody(id: BodyId, fromMs: number, toMs: number, stepDays: number) {
  const ts: number[] = []
  const lons: number[] = []
  for (let t = fromMs; t <= toMs; t += stepDays * DAY) {
    ts.push(t)
    lons.push(bodyLongitude(id, new Date(t)))
  }
  return { ts, lons }
}

/** Bisection for a sign change of f between a and b (ms). */
function bisect(f: (ms: number) => number, a: number, b: number, fa = f(a)): number {
  let lo = a
  let hi = b
  let flo = fa
  for (let i = 0; i < 50 && hi - lo > 30000; i++) {
    const mid = (lo + hi) / 2
    const fm = f(mid)
    if (Math.sign(fm) === Math.sign(flo)) {
      lo = mid
      flo = fm
    } else hi = mid
  }
  return (lo + hi) / 2
}

function houseAt(chart: Chart, lon: number): number | null {
  return chart.cusps ? houseOf(lon, chart.cusps) : null
}

// ——— Transit windows ———

/**
 * Every transit-to-natal aspect cycle that overlaps [from, to], with start/end of
 * orb, all exact hits (including retrograde re-passes), and a significance score.
 */
export function transitWindows(
  chart: Chart,
  from: Date,
  to: Date,
  points: NatalPoint[] = natalPoints(chart),
  bodies: BodyId[] = FORECAST_BODIES,
): TransitWindow[] {
  const out: TransitWindow[] = []
  for (const id of bodies) {
    const pad = (PAD_DAYS[id] ?? 300) * DAY
    const fromMs = from.getTime() - pad
    const toMs = to.getTime() + pad
    if (!isBodyAvailable(id, new Date(fromMs)) || !isBodyAvailable(id, new Date(toMs))) continue
    const step = STEP[id] ?? 2
    const { ts, lons } = sampleBody(id, fromMs, toMs, step)
    const lonAt = (ms: number) => bodyLongitude(id, new Date(ms))

    for (const p of points) {
      for (const def of ASPECTS) {
        for (const side of [1, -1] as const) {
          if ((def.angle === 0 || def.angle === 180) && side === -1) continue
          const target = norm360(p.lon + side * def.angle)
          const orb = TRANSIT_ORB[def.type]
          const dev = (ms: number) => angleDiff(lonAt(ms), target)

          // Find in-orb intervals and exact hits on the sampled grid, then refine.
          const intervals: { start: number; end: number; exacts: number[]; closest: number }[] = []
          let cur: (typeof intervals)[number] | null = null
          let prevF = angleDiff(lons[0], target)
          if (Math.abs(prevF) <= orb) cur = { start: ts[0], end: ts[0], exacts: [], closest: Math.abs(prevF) }
          for (let i = 1; i < ts.length; i++) {
            const f = angleDiff(lons[i], target)
            const inOrb = Math.abs(f) <= orb
            const wasIn = Math.abs(prevF) <= orb
            if (inOrb && !wasIn) {
              const edge = bisect((ms) => Math.abs(dev(ms)) - orb, ts[i - 1], ts[i])
              cur = { start: edge, end: edge, exacts: [], closest: Math.abs(f) }
            }
            if (cur && Math.sign(f) !== Math.sign(prevF) && Math.abs(f - prevF) < 90) {
              cur.exacts.push(bisect(dev, ts[i - 1], ts[i], prevF))
              cur.closest = 0
            }
            if (cur) cur.closest = Math.min(cur.closest, Math.abs(f))
            if (!inOrb && wasIn && cur) {
              cur.end = bisect((ms) => Math.abs(dev(ms)) - orb, ts[i - 1], ts[i])
              intervals.push(cur)
              cur = null
            }
            prevF = f
          }
          if (cur) {
            cur.end = ts[ts.length - 1]
            intervals.push(cur)
          }
          if (!intervals.length) continue

          // Group passes that belong to the same retrograde cycle.
          const gap = (GROUP_GAP_DAYS[id] ?? 200) * DAY
          const groups: (typeof intervals)[] = []
          for (const iv of intervals) {
            const g = groups[groups.length - 1]
            if (g && iv.start - g[g.length - 1].end < gap) g.push(iv)
            else groups.push([iv])
          }

          for (const g of groups) {
            const start = g[0].start
            const end = g[g.length - 1].end
            if (end < from.getTime() || start > to.getTime()) continue
            const exacts = g.flatMap((iv) => iv.exacts)
            const closest = Math.min(...g.map((iv) => iv.closest))
            const anchor = exacts[0] ?? start
            out.push({
              kind: 'transit',
              transit: id,
              natal: p.id,
              type: def.type,
              start: new Date(start),
              end: new Date(end),
              exacts: exacts.map((ms) => new Date(ms)),
              closest,
              transitHouse: houseAt(chart, lonAt(anchor)),
              score:
                (TRANSIT_WEIGHT[id] ?? 3) *
                (NATAL_WEIGHT[p.id] ?? 3) *
                ASPECT_WEIGHT[def.type] *
                (exacts.length ? 1 : 0.6) / 10,
            })
          }
        }
      }
    }
  }
  return out
}

// ——— Lunations & eclipses ———

export function lunations(chart: Chart, from: Date, to: Date, points: NatalPoint[] = natalPoints(chart)): Lunation[] {
  const eclipses: { ms: number; type: 'solar' | 'lunar'; kind: EclipseKind }[] = []
  for (let e = SearchGlobalSolarEclipse(MakeTime(new Date(from.getTime() - 2 * DAY))); e.peak.date <= to; e = NextGlobalSolarEclipse(e.peak)) {
    eclipses.push({ ms: e.peak.date.getTime(), type: 'solar', kind: e.kind })
  }
  for (let e = SearchLunarEclipse(MakeTime(new Date(from.getTime() - 2 * DAY))); e.peak.date <= to; e = NextLunarEclipse(e.peak)) {
    eclipses.push({ ms: e.peak.date.getTime(), type: 'lunar', kind: e.kind })
  }

  const out: Lunation[] = []
  for (const [phase, angle] of [['new', 0], ['full', 180]] as const) {
    let t = MakeTime(from)
    for (;;) {
      const hit = SearchMoonPhase(angle, t, 40)
      if (!hit || hit.date > to) break
      const date = hit.date
      const lon = bodyLongitude('moon', date)
      const ecl = eclipses.find(
        (e) => Math.abs(e.ms - date.getTime()) < DAY && e.type === (phase === 'new' ? 'solar' : 'lunar'),
      )
      const contacts = points
        .map((p) => ({ natal: p.id, orb: Math.abs(angleDiff(lon, p.lon)) }))
        .filter((c) => c.orb <= 3)
        .sort((a, b) => a.orb - b.orb)
      const contactWeight = contacts.reduce((s, c) => s + (NATAL_WEIGHT[c.natal] ?? 3) / 2, 0)
      out.push({
        kind: 'lunation',
        date,
        phase,
        lon,
        sign: signOf(lon).id,
        house: houseAt(chart, lon),
        eclipse: ecl ? { type: ecl.type, kind: ecl.kind } : null,
        contacts,
        score: (ecl ? 9 : 2.5) + contactWeight,
      })
      t = hit.AddDays(1)
    }
  }
  return out
}

// ——— Retrograde stations ———

const STATION_BODIES: BodyId[] = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron']

export function stations(chart: Chart, from: Date, to: Date, points: NatalPoint[] = natalPoints(chart)): Station[] {
  const out: Station[] = []
  for (const id of STATION_BODIES) {
    if (!isBodyAvailable(id, from) || !isBodyAvailable(id, to)) continue
    const speed = (ms: number) =>
      angleDiff(bodyLongitude(id, new Date(ms + DAY / 4)), bodyLongitude(id, new Date(ms - DAY / 4)))
    let prev = speed(from.getTime())
    for (let t = from.getTime() + DAY; t <= to.getTime(); t += DAY) {
      const s = speed(t)
      if (Math.sign(s) !== Math.sign(prev)) {
        const ms = bisect(speed, t - DAY, t, prev)
        const date = new Date(ms)
        const lon = bodyLongitude(id, date)
        const near = points
          .map((p) => ({ natal: p.id, orb: Math.abs(angleDiff(lon, p.lon)) }))
          .filter((c) => c.orb <= 2)
          .sort((a, b) => a.orb - b.orb)[0] ?? null
        out.push({
          kind: 'station',
          date,
          body: id,
          direction: s < 0 ? 'retrograde' : 'direct',
          lon,
          sign: signOf(lon).id,
          house: houseAt(chart, lon),
          near,
          score: (id === 'mercury' ? 3 : (TRANSIT_WEIGHT[id] ?? 3) / 3) + (near ? (NATAL_WEIGHT[near.natal] ?? 3) * 0.6 : 0),
        })
      }
      prev = s
    }
  }
  return out
}

// ——— House (or sign) ingresses ———

const INGRESS_BODIES: BodyId[] = ['sun', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
const INGRESS_WEIGHT: Partial<Record<BodyId, number>> = { sun: 2, mars: 3, jupiter: 5, saturn: 6, uranus: 7, neptune: 7, pluto: 7 }

export function ingresses(chart: Chart, from: Date, to: Date): Ingress[] {
  const out: Ingress[] = []
  const slot = (lon: number) => (chart.cusps ? houseOf(lon, chart.cusps) : Math.floor(norm360(lon) / 30))
  for (const id of INGRESS_BODIES) {
    const step = Math.min(1, STEP[id] ?? 1)
    const { ts, lons } = sampleBody(id, from.getTime(), to.getTime(), step)
    for (let i = 1; i < ts.length; i++) {
      const a = slot(lons[i - 1])
      const b = slot(lons[i])
      if (a === b) continue
      // Refine to the crossing.
      let lo = ts[i - 1]
      let hi = ts[i]
      while (hi - lo > 60000) {
        const mid = (lo + hi) / 2
        if (slot(bodyLongitude(id, new Date(mid))) === a) lo = mid
        else hi = mid
      }
      const forward = angleDiff(lons[i], lons[i - 1]) > 0
      out.push({
        kind: 'ingress',
        date: new Date(hi),
        body: id,
        house: chart.cusps ? b : null,
        sign: signOf(lons[i]).id,
        retrograde: !forward,
        score: (INGRESS_WEIGHT[id] ?? 2) * (forward ? 1 : 0.6),
      })
    }
  }
  return out
}

// ——— Slow personal cycles ———

const TROPICAL_YEAR_DAYS = 365.2422

/** Secondary progressions: one day after birth for each year of life. */
export function progressedDate(birth: Date, at: Date): Date {
  const years = (at.getTime() - birth.getTime()) / (TROPICAL_YEAR_DAYS * DAY)
  return new Date(birth.getTime() + years * DAY)
}

export function progressedMoon(chart: Chart, at: Date): ProgressedMoon {
  const lonAt = (ms: number) => bodyLongitude('moon', progressedDate(chart.utc, new Date(ms)))
  const lon = lonAt(at.getTime())
  const sign = signOf(lon)
  // The progressed Moon moves ~1°/month; find when it next changes sign (≤ 3 years).
  const nextBoundary = (Math.floor(norm360(lon) / 30) + 1) * 30
  const f = (ms: number) => angleDiff(lonAt(ms), nextBoundary)
  let next: ProgressedMoon['next'] = null
  const prevT = at.getTime()
  let prevF = f(prevT)
  for (let t = prevT + 15 * DAY; t <= prevT + 3 * 365 * DAY; t += 15 * DAY) {
    const ft = f(t)
    if (Math.sign(ft) !== Math.sign(prevF) && Math.abs(ft - prevF) < 90) {
      const ms = bisect(f, t - 15 * DAY, t, prevF)
      next = { date: new Date(ms), sign: signOf(nextBoundary + 0.01).id }
      break
    }
    prevF = ft
  }
  return { lon, sign: sign.id, house: houseAt(chart, lon), next }
}

/** The next moment the Sun returns to its natal longitude (the solar return). */
export function nextSolarReturn(chart: Chart, after: Date): Date | null {
  const sun = chart.bodies.find((b) => b.id === 'sun')!
  return SearchSunLongitude(sun.lon, MakeTime(after), 367)?.date ?? null
}

// ——— Everything together ———

export function buildForecast(chart: Chart, from: Date, to: Date): Forecast {
  const points = natalPoints(chart)
  const events: ForecastEvent[] = [
    ...transitWindows(chart, from, to, points),
    ...lunations(chart, from, to, points),
    ...stations(chart, from, to, points),
    ...ingresses(chart, from, to),
  ]
  // Chronological; same-day items (e.g. several cycles already under way) by significance.
  events.sort((a, b) => eventDate(a, from, to).getTime() - eventDate(b, from, to).getTime() || b.score - a.score)
  return {
    from,
    to,
    events,
    progressedMoon: progressedMoon(chart, from),
    solarReturn: nextSolarReturn(chart, from),
  }
}

/**
 * The date an event is listed under, always inside [from, to]. Transits use their
 * first exact hit in the range; otherwise the day they come into orb; otherwise
 * (already under way) the start of the range.
 */
export function eventDate(e: ForecastEvent, from: Date, to: Date): Date {
  if (e.kind !== 'transit') return e.date
  const exact = e.exacts.find((d) => d >= from && d <= to)
  if (exact) return exact
  return e.start > from ? e.start : from
}
