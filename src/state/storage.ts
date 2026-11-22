import type { ChartRoute } from './url'

const KEY = 'celest:charts:v1'

export interface SavedChart extends ChartRoute {
  id: string
  savedAt: number
}

export function chartId(route: ChartRoute): string {
  const { input } = route
  return [input.name ?? '', input.date, input.time ?? '', input.place.lat.toFixed(3), input.place.lon.toFixed(3)].join('|')
}

export function loadCharts(): SavedChart[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function write(list: SavedChart[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30)))
  } catch {
    // Storage full or unavailable (private mode): charts still work via URL.
  }
}

export function saveChart(route: ChartRoute): SavedChart[] {
  const id = chartId(route)
  const list = loadCharts().filter((c) => c.id !== id)
  const next = [{ ...route, id, savedAt: Date.now() }, ...list]
  write(next)
  return next
}

export function deleteChart(id: string): SavedChart[] {
  const next = loadCharts().filter((c) => c.id !== id)
  write(next)
  return next
}
