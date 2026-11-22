import { useEffect, useState } from 'react'
import type { Chart } from '../../astro/chart'
import { buildForecast, type Forecast } from '../../astro/forecast'

type State = { status: 'loading' } | { status: 'ready'; forecast: Forecast } | { status: 'error' }

/** Computes a forecast in a Web Worker (falls back to the main thread). */
export function useForecast(chart: Chart, from: Date, to: Date): State {
  const fromMs = from.getTime()
  const toMs = to.getTime()
  const key = `${fromMs}-${toMs}`
  const [result, setResult] = useState<{ key: string; state: State } | null>(null)

  useEffect(() => {
    let cancelled = false
    const done = (state: State) => !cancelled && setResult({ key, state })
    let worker: Worker | null = null
    try {
      worker = new Worker(new URL('../../astro/forecast.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      worker = null
    }
    if (worker) {
      worker.onmessage = (e: MessageEvent<{ forecast?: Forecast; error?: string }>) => {
        done(e.data.forecast ? { status: 'ready', forecast: e.data.forecast } : { status: 'error' })
      }
      worker.onerror = () => done({ status: 'error' })
      worker.postMessage({ id: 1, chart, from: fromMs, to: toMs })
    } else {
      const id = setTimeout(() => {
        try {
          done({ status: 'ready', forecast: buildForecast(chart, new Date(fromMs), new Date(toMs)) })
        } catch {
          done({ status: 'error' })
        }
      }, 0)
      return () => {
        cancelled = true
        clearTimeout(id)
      }
    }
    return () => {
      cancelled = true
      worker?.terminate()
    }
  }, [chart, fromMs, toMs, key])

  return result && result.key === key ? result.state : { status: 'loading' }
}
