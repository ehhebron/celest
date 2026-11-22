/// <reference lib="webworker" />
import type { Chart } from './chart'
import { transitAspects } from './transits'

export interface TransitRequest {
  id: number
  chart: Chart
  date: number
}

// Exact-date searches take ~20 ms (more on phones); keep them off the main thread.
self.onmessage = (e: MessageEvent<TransitRequest>) => {
  const { id, chart, date } = e.data
  const list = transitAspects(chart, new Date(date))
  ;(self as unknown as Worker).postMessage({ id, date, list })
}
