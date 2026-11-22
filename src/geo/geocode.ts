import type { Place } from '../astro/chart'

export interface PlaceResult extends Place {
  id: string
  population?: number
}

export class GeocodeError extends Error {}

interface OpenMeteoResult {
  id: number
  name: string
  latitude: number
  longitude: number
  timezone?: string
  country?: string
  admin1?: string
  population?: number
}

/**
 * City search via the Open-Meteo geocoding API (GeoNames data, no key, CORS-enabled).
 * Only the typed query is sent; no birth data leaves the device.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`
  let res: Response
  try {
    res = await fetch(url, { signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new GeocodeError('network')
  }
  if (!res.ok) throw new GeocodeError(`http ${res.status}`)
  const data = (await res.json()) as { results?: OpenMeteoResult[] }
  return (data.results ?? [])
    .filter((r) => r.timezone)
    .map((r) => ({
      id: String(r.id),
      name: r.name,
      region: [r.admin1, r.country].filter(Boolean).join(', '),
      lat: r.latitude,
      lon: r.longitude,
      timeZone: r.timezone!,
      population: r.population,
    }))
}
