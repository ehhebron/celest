import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { computeChart, type Chart } from '../astro/chart'
import { horizonModel } from '../astro/horizon'
import type { HouseSystem } from '../astro/houses'
import { formatOffset, TimeResolutionError } from '../astro/time'
import { activeContacts, natalPoints, transitAspects, transitPositions, type TransitAspect } from '../astro/transits'
import { shareUrl, type ChartRoute } from '../state/url'
import { Balance } from './Balance'
import { BigThree } from './BigThree'
import { BottomSheet } from './BottomSheet'
import { ChartTable } from './ChartTable'
import { DetailPanel } from './DetailPanel'
import { prefersReducedMotion, useMediaQuery } from './hooks'
import { ForecastView } from './forecast/ForecastView'
import { sameSelection, type Selection } from './selection'
import { formatClock, formatDate, UNIT_MS, type Scale } from './format'
import { ThemeToggle } from './ThemeToggle'
import { Timeline } from './Timeline'
import { useTimeTravel } from './useTimeTravel'
import { ChartWheel } from './wheel/ChartWheel'
import { SideView } from './side/SideView'
import { VedicScreen } from './vedic/VedicScreen'
import './chart-view.css'

const ShareDialog = lazy(() => import('./share/ShareDialog'))
const SkyView = lazy(() => import('./sky/SkyView'))

interface Props {
  route: ChartRoute
  animateIn: boolean
  onHome: () => void
  /** House system for Western charts, or 'vedic' to switch to Jyotish. */
  onSystem: (choice: HouseSystem | 'vedic') => void
}

type Built = { chart: Chart; error: null } | { chart: null; error: string }

function build(route: ChartRoute): Built {
  try {
    return { chart: computeChart(route.input, { houseSystem: route.houseSystem }), error: null }
  } catch (err) {
    if (err instanceof TimeResolutionError || err instanceof RangeError) return { chart: null, error: err.message }
    throw err
  }
}

export function ChartView({ route, animateIn, onHome, onSystem }: Props) {
  const built = useMemo(() => build(route), [route])
  if (built.error !== null) {
    return (
      <main className="state-screen" role="alert">
        <p className="eyebrow">Something’s off</p>
        <h1>We couldn’t draw this chart</h1>
        <p className="muted">{built.error}</p>
        <button type="button" className="btn btn-primary" onClick={onHome}>
          Start a new chart
        </button>
      </main>
    )
  }
  return <ChartScreen chart={built.chart} route={route} animateIn={animateIn} onHome={onHome} onSystem={onSystem} />
}

function ChartScreen({ chart, route, animateIn, onHome, onSystem }: Props & { chart: Chart }) {
  const [selected, setSelected] = useState<Selection | null>(null)
  const [hovered, setHovered] = useState<Selection | null>(null)
  const [view, setView] = useState<'wheel' | 'side' | 'table' | 'forecast'>('wheel')
  const [travel, setTravel] = useState(false)
  const [scale, setScale] = useState<Scale>('week')
  const [shareOpen, setShareOpen] = useState(false)
  const [skyOpen, setSkyOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [now] = useState(() => new Date())
  const isMobile = useMediaQuery('(max-width: 760px)')
  const tt = useTimeTravel(now)

  const focus = hovered ?? selected
  // Stable identity matters: the memoized natal wheel layer receives it.
  const select = useCallback(
    (s: Selection | null) => setSelected((prev) => (sameSelection(prev, s) && !isMobile ? null : s)),
    [isMobile],
  )

  // Transits: positions every frame; exact dates once the date settles.
  const positions = useMemo(() => (travel ? transitPositions(tt.date) : null), [travel, tt.date])
  const natal = useMemo(() => natalPoints(chart), [chart])
  const quick: TransitAspect[] = useMemo(
    () =>
      positions
        ? activeContacts(positions.filter((p) => p.id !== 'moon'), natal).map((c) => ({
            transit: c.transit,
            natal: c.natal,
            type: c.type,
            orb: c.orb,
            exact: null,
            applying: false,
          }))
        : [],
    [positions, natal],
  )
  const [full, setFull] = useState<{ key: number; list: TransitAspect[] } | null>(null)
  const dateKey = tt.date.getTime()
  const worker = useTransitWorker(setFull)
  useEffect(() => {
    if (!travel || tt.moving) return
    const id = setTimeout(() => {
      if (worker.current) worker.current.post(chart, dateKey)
      else setFull({ key: dateKey, list: transitAspects(chart, new Date(dateKey)) })
    }, 160)
    return () => clearTimeout(id)
  }, [travel, tt.moving, dateKey, chart, worker])
  const contacts = full && full.key === dateKey ? full.list : quick
  const computing = travel && !(full && full.key === dateKey)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(id)
  }, [toast])

  // From the forecast: jump to the wheel with transits on, gliding to that date.
  const showOnChart = useCallback(
    (date: Date) => {
      setView('wheel')
      setTravel(true)
      tt.animateTo(date.getTime())
      requestAnimationFrame(() =>
        document.querySelector('.wheel-col')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' }),
      )
    },
    [tt],
  )

  const copyLink = async () => {
    const url = shareUrl(route)
    try {
      await navigator.clipboard.writeText(url)
      setToast('Link copied. Anyone with it sees this chart.')
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  const { input } = chart
  const title = input.name ? `${input.name}’s chart` : 'Natal chart'
  const timeLabel = input.time ? formatClock(input.time) : 'Time unknown'
  const notices: string[] = []
  if (!chart.timeKnown) notices.push('Birth time unknown: the chart is set for noon. Rising sign and houses are hidden, and the Moon’s degree is approximate.')
  if (chart.timeNote === 'lmt') notices.push(`This birth predates standard time here, so local mean time was used (${formatOffset(chart.offsetMinutes)}).`)
  if (chart.timeNote === 'gap') notices.push('That clock time was skipped by a daylight-saving change, so it was moved forward an hour.')
  if (chart.timeNote === 'ambiguous') notices.push('That clock time happened twice when daylight saving ended; the first occurrence was used.')
  if (chart.houseFallback) notices.push(chart.houseFallback)

  const sky = useMemo(() => (view === 'side' ? horizonModel(chart) : null), [view, chart])

  const isVedic = route.system === 'vedic'
  const systemSelect = (
    <label className="house-select">
      <span className="visually-hidden">Astrology system and houses</span>
      <select value={isVedic ? 'vedic' : route.houseSystem} onChange={(e) => onSystem(e.target.value as HouseSystem | 'vedic')}>
        {chart.timeKnown ? (
          <>
            <optgroup label="Western (tropical)">
              <option value="whole-sign">Whole Sign houses</option>
              <option value="placidus">Placidus houses</option>
            </optgroup>
            <optgroup label="Vedic (sidereal)">
              <option value="vedic">Vedic · Lahiri</option>
            </optgroup>
          </>
        ) : (
          <>
            <option value={route.houseSystem}>Western (tropical)</option>
            <option value="vedic">Vedic (sidereal)</option>
          </>
        )}
      </select>
    </label>
  )

  const detail = (
    <DetailPanel
      sky={sky}
      chart={chart}
      selection={selected}
      onSelect={select}
      transits={positions}
      contacts={contacts}
      transitDate={tt.date}
    />
  )

  return (
    <div className={`chart-screen${travel && !isVedic ? ' is-traveling' : ''}${isVedic ? ' is-vedic' : ''}`}>
      <header className="topbar">
        <button type="button" className="brand" onClick={onHome} aria-label="Celest home: new chart">
          Celest
        </button>
        <div className="topbar-actions">
          {/* Transits only apply to the wheel; the setting is kept while in other views. */}
          {!isVedic && view === 'wheel' && (
            <button type="button" className={`btn${travel ? ' is-active' : ''}`} aria-pressed={travel} aria-label="Transits" onClick={() => setTravel((t) => !t)}>
              <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
                <path d="M12 3a9 9 0 1 0 9 9M12 7v5l3 2M21 3v5h-5" />
              </svg>
              <span className="label">Transits</span>
            </button>
          )}
          <button type="button" className="btn" aria-label="Birth sky" onClick={() => setSkyOpen(true)}>
            <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
              <path d="M3 18c3-5 6-7.5 9-7.5s6 2.5 9 7.5M7 6.5l.01 0M12 4l.01 0M17.5 7l.01 0M14.5 9l.01 0" />
            </svg>
            <span className="label">Birth sky</span>
          </button>
          {/* The share card draws the Western wheel. */}
          {!isVedic && (
          <button type="button" className="btn" aria-label="Share" onClick={() => setShareOpen(true)}>
            <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
              <path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 12v7.5h14V12" />
            </svg>
            <span className="label">Share</span>
          </button>
          )}
          <button type="button" className="btn btn-icon" onClick={copyLink} aria-label="Copy link to this chart">
            <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
              <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
            </svg>
          </button>
          <ThemeToggle />
        </div>
      </header>

      <section className="chart-intro">
        <h1>{title}</h1>
        <p className="chart-meta">
          {formatDate(input.date)} · {timeLabel} · {input.place.name}
          {input.place.region ? `, ${input.place.region.split(', ').pop()}` : ''}
          {chart.timeKnown && <span className="muted"> · {formatOffset(chart.offsetMinutes)}</span>}
        </p>
      </section>

      {isVedic ? (
        <VedicScreen chart={chart} now={now} systemSelect={systemSelect} notices={notices.filter((n) => n !== chart.houseFallback)} />
      ) : (
        <>
          <BigThree chart={chart} onSelect={select} />

          {notices.length > 0 && (
            <div className="notices" role="note">
              {notices.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </div>
          )}

          <div className="chart-main">
            <div className="wheel-col">
              <div className="view-bar">
                <div className="segmented" role="tablist" aria-label="Chart view">
                  <button type="button" role="tab" aria-selected={view === 'wheel'} onClick={() => setView('wheel')}>
                    Wheel
                  </button>
                  <button type="button" role="tab" aria-selected={view === 'side'} onClick={() => setView('side')}>
                    Side
                  </button>
                  <button type="button" role="tab" aria-selected={view === 'table'} onClick={() => setView('table')}>
                    Table
                  </button>
                  <button type="button" role="tab" aria-selected={view === 'forecast'} onClick={() => setView('forecast')}>
                    Forecast
                  </button>
                </div>
                {systemSelect}
              </div>

              {view === 'wheel' ? (
                <div className="wheel-wrap">
                  <ChartWheel
                    chart={chart}
                    transits={positions}
                    contacts={contacts}
                    focus={focus}
                    selected={selected}
                    onHover={setHovered}
                    onSelect={select}
                    animateIn={animateIn}
                    label={`${title}. ${chart.bodies.length} planets and points${chart.angles ? ', 12 houses' : ''}, ${chart.aspects.length} aspects. Use Tab to explore, or switch to the table view.`}
                  />
                  <Legend transits={travel} />
                </div>
              ) : view === 'side' ? (
                <SideView chart={chart} focus={focus} selected={selected} onHover={setHovered} onSelect={select} />
              ) : view === 'table' ? (
                <ChartTable chart={chart} onSelect={select} />
              ) : (
                <ForecastView chart={chart} now={now} onShowOnChart={showOnChart} />
              )}

              {travel && view === 'wheel' && (
                <Timeline
                  date={tt.date}
                  now={now}
                  scale={scale}
                  onScale={setScale}
                  onStep={(n) => tt.animateTo(tt.current.current + n * UNIT_MS[scale])}
                  onToday={() => tt.animateTo(now.getTime())}
                  onScrub={tt.setNow}
                  onFling={tt.fling}
                  contacts={contacts}
                  computing={computing}
                  onSelect={select}
                  onClose={() => setTravel(false)}
                />
              )}
            </div>

            <aside className="side-col">
              {!isMobile && <div className="card detail-card">{detail}</div>}
              <div className="card">
                <Balance balance={chart.balance} />
              </div>
            </aside>
          </div>

          {isMobile && (
            <BottomSheet open={!!selected} onClose={() => setSelected(null)} label="Details">
              {detail}
            </BottomSheet>
          )}
        </>
      )}

      <div className={`toast${toast ? ' is-on' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>

      <Suspense fallback={<div className="overlay-loading" role="status">Preparing…</div>}>
        {shareOpen && <ShareDialog chart={chart} onClose={() => setShareOpen(false)} />}
        {skyOpen && <SkyView chart={chart} onClose={() => setSkyOpen(false)} />}
      </Suspense>
    </div>
  )
}

/** A lazily created worker for exact-date transit searches; replies for stale requests are dropped. */
function useTransitWorker(onResult: (r: { key: number; list: TransitAspect[] }) => void) {
  const ref = useRef<{ post: (chart: Chart, date: number) => void } | null>(null)
  useEffect(() => {
    if (typeof Worker === 'undefined') return
    let w: Worker
    try {
      w = new Worker(new URL('../astro/transit.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      return
    }
    let latest = 0
    w.onmessage = (e: MessageEvent<{ id: number; date: number; list: TransitAspect[] }>) => {
      if (e.data.id === latest) onResult({ key: e.data.date, list: e.data.list })
    }
    ref.current = {
      post: (chart, date) => {
        latest += 1
        w.postMessage({ id: latest, chart, date })
      },
    }
    return () => {
      ref.current = null
      w.terminate()
    }
  }, [onResult])
  return ref
}

function Swatch({ kind }: { kind: 'harmonious' | 'challenging' | 'neutral' | 'transit' }) {
  return (
    <svg className={`sw sw-${kind}`} viewBox="0 0 28 10" width="28" height="10" aria-hidden="true">
      {kind === 'transit' && <line className="sw-glow" x1="2" y1="5" x2="26" y2="5" />}
      <line x1="2" y1="5" x2="26" y2="5" />
    </svg>
  )
}

function Legend({ transits }: { transits: boolean }) {
  return (
    <ul className="legend" aria-label="Aspect line key">
      <li>
        <Swatch kind="harmonious" /> Harmonious <span className="visually-hidden">(solid line)</span>
      </li>
      <li>
        <Swatch kind="challenging" /> Challenging <span className="visually-hidden">(dashed line)</span>
      </li>
      <li>
        <Swatch kind="neutral" /> Conjunction <span className="visually-hidden">(dotted line)</span>
      </li>
      {transits && (
        <li>
          <Swatch kind="transit" /> Active transit <span className="visually-hidden">(glowing line)</span>
        </li>
      )}
      <li className="muted">Thicker = more exact</li>
    </ul>
  )
}
