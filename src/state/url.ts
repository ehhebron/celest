import type { BirthInput } from '../astro/chart'
import type { HouseSystem } from '../astro/houses'
import { isValidTimeZone } from '../astro/time'

export type ChartSystem = 'western' | 'vedic'

export interface ChartRoute {
  input: BirthInput
  houseSystem: HouseSystem
  /** Western (tropical) or Vedic (sidereal, Lahiri). Missing means Western, for older links and saved charts. */
  system?: ChartSystem
}

/** Encode a chart as a readable hash: #/chart?name=…&date=…&time=…&lat=…&lon=…&tz=…&place=… */
export function chartToHash({ input, houseSystem, system }: ChartRoute): string {
  const q = new URLSearchParams()
  if (input.name) q.set('name', input.name)
  q.set('date', input.date)
  q.set('time', input.time ?? 'unknown')
  q.set('place', input.place.name)
  if (input.place.region) q.set('region', input.place.region)
  q.set('lat', input.place.lat.toFixed(4))
  q.set('lon', input.place.lon.toFixed(4))
  q.set('tz', input.place.timeZone)
  if (houseSystem !== 'whole-sign') q.set('hs', houseSystem)
  if (system === 'vedic') q.set('sys', 'vedic')
  return `#/chart?${q.toString()}`
}

export function hashToChart(hash: string): ChartRoute | null {
  const m = /^#\/chart\?(.*)$/.exec(hash)
  if (!m) return null
  const q = new URLSearchParams(m[1])
  const date = q.get('date') ?? ''
  const time = q.get('time')
  const lat = Number(q.get('lat'))
  const lon = Number(q.get('lon'))
  const tz = q.get('tz') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  if (!isValidTimeZone(tz)) return null
  const validTime = time && /^\d{2}:\d{2}$/.test(time) ? time : null
  return {
    input: {
      name: q.get('name') ?? undefined,
      date,
      time: validTime,
      place: {
        name: q.get('place') ?? 'Unknown place',
        region: q.get('region') ?? undefined,
        lat,
        lon,
        timeZone: tz,
      },
    },
    houseSystem: q.get('hs') === 'placidus' ? 'placidus' : 'whole-sign',
    system: q.get('sys') === 'vedic' ? 'vedic' : 'western',
  }
}

export function shareUrl(route: ChartRoute): string {
  return `${location.origin}${location.pathname}${chartToHash(route)}`
}
