/// <reference lib="webworker" />
import type { Chart } from './chart'
import { buildForecast } from './forecast'

export interface ForecastRequest {
  id: number
  chart: Chart
  from: number
  to: number
}

// A year's forecast takes a few hundred ms of root-finding; keep it off the main thread.
self.onmessage = (e: MessageEvent<ForecastRequest>) => {
  const { id, chart, from, to } = e.data
  try {
    const forecast = buildForecast(chart, new Date(from), new Date(to))
    ;(self as unknown as Worker).postMessage({ id, forecast })
  } catch (err) {
    ;(self as unknown as Worker).postMessage({ id, error: String(err) })
  }
}
