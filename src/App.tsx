import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { HouseSystem } from './astro/houses'
import { deleteChart, loadCharts, saveChart, type SavedChart } from './state/storage'
import { chartToHash, hashToChart, type ChartRoute } from './state/url'
import { Onboarding } from './ui/Onboarding'

// The ephemeris (astronomy-engine + Chiron table) only loads once a chart is shown.
const ChartView = lazy(() => import('./ui/ChartView').then((m) => ({ default: m.ChartView })))

function readRoute(): { route: ChartRoute | null; invalid: boolean } {
  const hash = location.hash
  if (!hash || hash === '#' || hash === '#/') return { route: null, invalid: false }
  const route = hashToChart(hash)
  return { route, invalid: !route }
}

export default function App() {
  const [{ route, invalid }, setState] = useState(readRoute)
  const [saved, setSaved] = useState<SavedChart[]>(loadCharts)
  const [animateIn, setAnimateIn] = useState(true)

  useEffect(() => {
    const onHash = () => {
      setState(readRoute())
      setAnimateIn(true)
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    document.title = route ? `${route.input.name ? `${route.input.name} · ` : ''}Celest` : 'Celest'
  }, [route])

  const open = useCallback((r: ChartRoute) => {
    setSaved(saveChart(r))
    location.hash = chartToHash(r)
  }, [])

  const home = useCallback(() => {
    history.pushState(null, '', location.pathname + location.search)
    setState({ route: null, invalid: false })
    setSaved(loadCharts())
  }, [])

  /** The house-system dropdown also switches between Western and Vedic astrology. */
  const setSystem = useCallback(
    (choice: HouseSystem | 'vedic') => {
      if (!route) return
      const next: ChartRoute = choice === 'vedic' ? { ...route, system: 'vedic' } : { ...route, system: 'western', houseSystem: choice }
      history.replaceState(null, '', chartToHash(next))
      setAnimateIn(false)
      setState({ route: next, invalid: false })
      setSaved(saveChart(next))
    },
    [route],
  )

  if (invalid) {
    return (
      <main className="state-screen" role="alert">
        <p className="eyebrow">Broken link</p>
        <h1>This chart link is incomplete</h1>
        <p className="muted">Part of the birth data seems to be missing from the address. Ask for the link again, or make a new chart.</p>
        <button type="button" className="btn btn-primary" onClick={home}>
          Make a chart
        </button>
      </main>
    )
  }

  if (!route) {
    return <Onboarding saved={saved} onSubmit={open} onOpen={open} onDelete={(id) => setSaved(deleteChart(id))} />
  }

  return (
    <Suspense
      fallback={
        <main className="state-screen loading-screen" role="status">
          <span className="loading-orbit" aria-hidden="true" />
          <p className="loading-text">Reading the sky…</p>
        </main>
      }
    >
      <ChartView
        key={chartToHash(route).replace(/&(hs|sys)=\w+/g, '')}
        route={route}
        animateIn={animateIn}
        onHome={home}
        onSystem={setSystem}
      />
    </Suspense>
  )
}
