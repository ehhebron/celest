import { useEffect, useRef, useState } from 'react'
import { ASPECT_BY_TYPE } from '../astro/aspects'
import type { TransitAspect } from '../astro/transits'
import { BODY_BY_ID } from '../astro/zodiac'
import { pointName } from '../interpret/describe'
import { formatExact, UNIT_MS, type Scale } from './format'
import { Glyph } from './Glyph'
import type { Selection } from './selection'
import { MAX_DATE, MIN_DATE } from './useTimeTravel'

const SPACING: Record<Scale, number> = { day: 16, week: 16, month: 18, year: 22 }
const LABEL_EVERY: Record<Scale, number> = { day: 7, week: 4, month: 6, year: 5 }

interface Props {
  date: Date
  now: Date
  scale: Scale
  onScale: (s: Scale) => void
  onStep: (units: number) => void
  onToday: () => void
  onScrub: (ms: number) => void
  onFling: (velocity: number) => void
  contacts: TransitAspect[]
  computing: boolean
  onSelect: (s: Selection) => void
  onClose: () => void
}

function relative(date: Date, now: Date): string {
  const days = Math.round((date.getTime() - now.getTime()) / 86400000)
  if (days === 0) return 'Today'
  const abs = Math.abs(days)
  const fmt = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (abs < 14) return fmt.format(days, 'day')
  if (abs < 60) return fmt.format(Math.round(days / 7), 'week')
  if (abs < 730) return fmt.format(Math.round(days / 30.44), 'month')
  return fmt.format(Math.round(days / 365.25), 'year')
}

// Formatters are expensive to construct; build them once, not per tick per frame.
const FMT_DAY = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const FMT_MONTH = new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' })
const FMT_HEAD = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
const FMT_LONG = new Intl.DateTimeFormat(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })

function tickLabel(ms: number, scale: Scale): string {
  const d = new Date(ms)
  if (scale === 'day' || scale === 'week') return FMT_DAY.format(d)
  if (scale === 'month') return FMT_MONTH.format(d)
  return String(d.getFullYear())
}

const SYMBOL: Record<string, string> = { conjunction: '☌', sextile: '⚹', square: '□', trine: '△', opposition: '☍' }

export function Timeline(props: Props) {
  const { date, now, scale, onScale, onStep, onToday, onScrub, onFling, contacts, computing, onSelect, onClose } = props
  const tapeRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const drag = useRef<{ x: number; ms: number; samples: { t: number; ms: number }[] } | null>(null)

  useEffect(() => {
    const el = tapeRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const unit = UNIT_MS[scale]
  const spacing = SPACING[scale]
  const offset = date.getTime() / unit
  const half = width / 2
  const kStart = Math.floor(offset - half / spacing) - 1
  const kEnd = Math.ceil(offset + half / spacing) + 1
  const ticks = []
  for (let k = kStart; k <= kEnd; k++) {
    const x = half + (k - offset) * spacing
    const major = k % LABEL_EVERY[scale] === 0
    ticks.push({ k, x, major })
  }
  const nowX = half + (now.getTime() / unit - offset) * spacing

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, ms: date.getTime(), samples: [{ t: performance.now(), ms: date.getTime() }] }
    onScrub(date.getTime())
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const ms = d.ms - ((e.clientX - d.x) / spacing) * unit
    d.samples.push({ t: performance.now(), ms })
    if (d.samples.length > 6) d.samples.shift()
    onScrub(ms)
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d || d.samples.length < 2) return
    const a = d.samples[0]
    const b = d.samples[d.samples.length - 1]
    const dt = b.t - a.t
    if (dt > 0 && performance.now() - b.t < 80) onFling((b.ms - a.ms) / dt)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }
    if (e.key in map) {
      e.preventDefault()
      onStep(map[e.key])
    } else if (e.key === 'Home') {
      e.preventDefault()
      onToday()
    }
  }

  const label = FMT_LONG.format(date)
  const isToday = Math.abs(date.getTime() - now.getTime()) < 3600000

  return (
    <section className="timeline" aria-label="Time travel">
      <div className="tl-head">
        <div className="tl-date">
          <p className="eyebrow">Transits for</p>
          <p className="tl-date-main" aria-live="polite" aria-atomic="true">
            {FMT_HEAD.format(date)}
          </p>
          <p className="tl-rel">{relative(date, now)}</p>
        </div>
        <div className="tl-controls">
          <div className="segmented" role="group" aria-label="Step size">
            {(['day', 'week', 'month', 'year'] as Scale[]).map((s) => (
              <button key={s} type="button" aria-pressed={scale === s} onClick={() => onScale(s)}>
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="tl-steps">
            <button type="button" className="btn btn-icon" onClick={() => onStep(-1)} aria-label={`Back one ${scale}`}>
              <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <button type="button" className={`btn${isToday ? ' is-active' : ''}`} onClick={onToday}>
              Today
            </button>
            <button type="button" className="btn btn-icon" onClick={() => onStep(1)} aria-label={`Forward one ${scale}`}>
              <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </button>
            <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close time travel">
              <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div
        ref={tapeRef}
        className="tape"
        role="slider"
        tabIndex={0}
        aria-label="Transit date. Drag, or use the arrow keys."
        aria-valuemin={MIN_DATE}
        aria-valuemax={MAX_DATE}
        aria-valuenow={Math.round(date.getTime())}
        aria-valuetext={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <svg width="100%" height="56" aria-hidden="true">
          {ticks.map((t) => (
            <g key={t.k}>
              <line x1={t.x} x2={t.x} y1={t.major ? 10 : 18} y2={34} className={t.major ? 'tk major' : 'tk'} />
              {t.major && (
                <text x={t.x} y={50} className="tk-label">
                  {tickLabel(t.k * unit, scale)}
                </text>
              )}
            </g>
          ))}
          {nowX > -10 && nowX < width + 10 && <circle cx={nowX} cy={6} r={2.5} className="tk-now" />}
        </svg>
        <span className="tape-needle" aria-hidden="true" />
      </div>

      <div className="tl-contacts" aria-live="polite">
        {computing && contacts.length === 0 ? (
          <p className="muted small">Reading the sky…</p>
        ) : contacts.length === 0 ? (
          <p className="muted small">No close transits to your natal planets on this date. Try scrubbing ahead.</p>
        ) : (
          <ul>
            {contacts.slice(0, 8).map((c) => (
              <li key={`${c.transit}-${c.natal}-${c.type}`}>
                <button type="button" onClick={() => onSelect({ kind: 'transit', id: c.transit })}>
                  <Glyph body={c.transit} size={16} className="transit-tone" />
                  <span className={`asp-sym nature-${ASPECT_BY_TYPE[c.type].nature}`} aria-hidden="true">{SYMBOL[c.type]}</span>
                  <span className="tc-text">
                    {BODY_BY_ID[c.transit].name} {ASPECT_BY_TYPE[c.type].name.toLowerCase()} your {pointName(c.natal)}
                  </span>
                  <span className="tc-exact">
                    {c.exact ? `exact ${formatExact(c.exact, date)}` : `${c.orb.toFixed(1)}°`}
                    {c.exact && <span className="muted"> · {c.applying ? 'applying' : 'separating'}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

