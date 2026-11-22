import { useMemo, useState } from 'react'
import type { Chart } from '../../astro/chart'
import { eventDate, type ForecastEvent, type TransitWindow } from '../../astro/forecast'
import { SIGNS } from '../../astro/zodiac'
import { ordinal } from '../../interpret/describe'
import { eventGlyph, eventText } from '../../interpret/forecastText'
import { HOUSE_TEXT, SIGN_TEXT } from '../../interpret/texts'
import { deviceTimeZone, formatClock, formatInZone } from '../format'
import { Glyph } from '../Glyph'
import { InfoTip } from '../InfoTip'
import { useForecast } from './useForecast'
import './forecast.css'

interface Props {
  chart: Chart
  now: Date
  onShowOnChart: (date: Date) => void
}

type Range = 30 | 90 | 365
const DAY = 86400000
/** Events at or above this score are "major" (e.g. Saturn square Sun ≈ 7, Mars sextile Venus ≈ 1.2). */
const MAJOR = 4.5

const FMT_MONTH = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const FMT_DAY = new Intl.DateTimeFormat(undefined, { day: 'numeric' })
const FMT_WD = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const FMT_SHORT = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const FMT_LONG = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

export function ForecastView({ chart, now, onShowOnChart }: Props) {
  const [range, setRange] = useState<Range>(90)
  const [majorOnly, setMajorOnly] = useState(false)
  // Start at local midnight today so the window doesn't shift on every render.
  const from = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()), [now])
  const to = useMemo(() => new Date(from.getTime() + range * DAY), [from, range])
  const state = useForecast(chart, from, to)

  return (
    <section className="forecast" aria-labelledby="fc-h">
      <header className="fc-head">
        <div>
          <p className="eyebrow">Forecast</p>
          <h2 id="fc-h">The {range === 365 ? 'year' : `${range} days`} ahead</h2>
          <p className="muted small fc-intro">
            Built from your chart: the slow planets touching your natal points, and the New and Full Moons, eclipses and retrogrades
            {chart.cusps ? ' as they land in your houses' : ''}.
          </p>
        </div>
        <div className="segmented" role="group" aria-label="Forecast range">
          {([30, 90, 365] as Range[]).map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>
              {r === 365 ? '1 year' : `${r} days`}
            </button>
          ))}
        </div>
      </header>

      {!chart.timeKnown && (
        <p className="notice-inline">Without a birth time there are no houses, so forecasts are by sign and less personal. Add a birth time for the full picture.</p>
      )}

      {state.status === 'loading' && <ForecastSkeleton />}
      {state.status === 'error' && (
        <div className="fc-state" role="alert">
          <p>The forecast couldn’t be calculated for this chart.</p>
        </div>
      )}
      {state.status === 'ready' && (
        <ForecastBody
          events={state.forecast.events}
          from={from}
          to={to}
          now={now}
          majorOnly={majorOnly}
          setMajorOnly={setMajorOnly}
          progressedMoon={state.forecast.progressedMoon}
          solarReturn={state.forecast.solarReturn}
          birthZone={chart.input.place.timeZone}
          birthPlace={chart.input.place.name}
          birthTime={chart.input.time}
          onShowOnChart={onShowOnChart}
        />
      )}

      <p className="fc-footnote">
        Planetary timings are calculated precisely. What they mean is interpretation: a lens for reflection, not a prediction of events.
      </p>
    </section>
  )
}

function ForecastBody({
  events,
  from,
  to,
  now,
  majorOnly,
  setMajorOnly,
  progressedMoon,
  solarReturn,
  birthZone,
  birthPlace,
  birthTime,
  onShowOnChart,
}: {
  events: ForecastEvent[]
  from: Date
  to: Date
  now: Date
  majorOnly: boolean
  setMajorOnly: (v: boolean) => void
  progressedMoon: import('../../astro/forecast').ProgressedMoon
  solarReturn: Date | null
  birthZone: string
  birthPlace: string
  birthTime: string | null
  onShowOnChart: (d: Date) => void
}) {
  // Long, significant transit cycles get their own cards with a timeline bar.
  const longCycles = events
    .filter((e): e is TransitWindow => e.kind === 'transit' && e.score >= MAJOR && e.end.getTime() - e.start.getTime() > 45 * DAY)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const feed = events.filter((e) => !majorOnly || e.score >= MAJOR)
  const groups: { label: string; items: ForecastEvent[] }[] = []
  for (const e of feed) {
    const label = FMT_MONTH.format(eventDate(e, from, to))
    const g = groups[groups.length - 1]
    if (g && g.label === label) g.items.push(e)
    else groups.push({ label, items: [e] })
  }

  const pmSign = SIGNS.find((s) => s.id === progressedMoon.sign)!
  return (
    <>
      <div className="fc-cycles">
        <article className="fc-card">
          <p className="eyebrow">Progressed Moon</p>
          <h3>
            <Glyph sign={pmSign.id} size={18} /> {pmSign.name}
            {progressedMoon.house ? <span className="muted"> · {ordinal(progressedMoon.house)} house</span> : null}
          </h3>
          <p className="small">
            Your inner emotional season. It moves about a degree a month, so it colours a couple of years at a time: right now{' '}
            {SIGN_TEXT[pmSign.id].adjective.toLowerCase()}
            {progressedMoon.house ? `, focused on ${HOUSE_TEXT[progressedMoon.house - 1].area}` : ''}.
          </p>
          {progressedMoon.next && (
            <p className="small muted">
              Moves into {SIGNS.find((s) => s.id === progressedMoon.next!.sign)!.name} around {FMT_LONG.format(progressedMoon.next.date)}.
            </p>
          )}
        </article>
        {solarReturn && <SolarReturnCard at={solarReturn} birthZone={birthZone} birthPlace={birthPlace} birthTime={birthTime} />}
        {longCycles.map((w) => {
          const t = eventText(w, now)
          return (
            <article className="fc-card fc-cycle" key={`${w.transit}-${w.natal}-${w.type}-${w.start.getTime()}`}>
              <p className="eyebrow">{t.eyebrow}</p>
              <h3>
                <Glyph body={w.transit} size={18} className="transit-tone" />
                <span className={`asp-sym nature-${t.nature}`} aria-hidden="true">{t.symbol}</span> {t.title}
              </h3>
              <WindowBar w={w} now={now} />
              <p className="small">{t.body[0]}</p>
              {w.exacts[0] && (
                <button type="button" className="link-btn" onClick={() => onShowOnChart(w.exacts.find((d) => d >= from) ?? w.exacts[0])}>
                  See it on your chart
                </button>
              )}
            </article>
          )
        })}
      </div>

      <div className="fc-filter">
        <h3 className="eyebrow">Timeline</h3>
        <div className="segmented" role="group" aria-label="Filter">
          <button type="button" aria-pressed={!majorOnly} onClick={() => setMajorOnly(false)}>
            Everything
          </button>
          <button type="button" aria-pressed={majorOnly} onClick={() => setMajorOnly(true)}>
            Major only
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="muted small">Nothing major in this window. Try a longer range.</p>
      ) : (
        groups.map((g) => (
          <section key={g.label} className="fc-month" aria-label={g.label}>
            <h4 className="fc-month-label">{g.label}</h4>
            <ol className="fc-feed">
              {g.items.map((e) => (
                <FeedItem key={eventKey(e)} e={e} from={from} to={to} now={now} onShowOnChart={onShowOnChart} />
              ))}
            </ol>
          </section>
        ))
      )}
    </>
  )
}

function eventKey(e: ForecastEvent): string {
  switch (e.kind) {
    case 'transit':
      return `t-${e.transit}-${e.natal}-${e.type}-${e.start.getTime()}`
    case 'lunation':
      return `l-${e.date.getTime()}`
    case 'station':
      return `s-${e.body}-${e.date.getTime()}`
    case 'ingress':
      return `i-${e.body}-${e.date.getTime()}`
  }
}

function FeedItem({ e, from, to, now, onShowOnChart }: { e: ForecastEvent; from: Date; to: Date; now: Date; onShowOnChart: (d: Date) => void }) {
  const [open, setOpen] = useState(false)
  const t = eventText(e, now)
  const date = eventDate(e, from, to)
  const ongoing = e.kind === 'transit' && e.start < from && !e.exacts.some((d) => d >= from && d <= to)
  // A cycle that only starts building in this window (its peak comes later).
  const building = e.kind === 'transit' && e.start >= from && !e.exacts.some((d) => d <= to)
  const major = e.score >= MAJOR
  const showDate = e.kind === 'transit' ? (e.exacts.find((d) => d >= from) ?? date) : e.date
  return (
    <li className={`fc-item${major ? ' is-major' : ''}`}>
      <time className="fc-date" dateTime={date.toISOString()}>
        {ongoing ? (
          <span className="fc-now">Now</span>
        ) : (
          <>
            <span className="fc-day">{FMT_DAY.format(date)}</span>
            <span className="fc-wd">{FMT_WD.format(date)}</span>
          </>
        )}
      </time>
      <span className={`fc-glyph${e.kind === 'transit' ? ' transit-tone' : ''}`} aria-hidden="true">
        <Glyph body={eventGlyph(e)} size={20} />
      </span>
      <div className="fc-text">
        <p className="eyebrow">
          {t.eyebrow}
          {major && <span className="fc-major">Major</span>}
          {ongoing && <span className="fc-ongoing">ongoing</span>}
          {building && <span className="fc-ongoing">building</span>}
        </p>
        <h5>
          {t.symbol && <span className={`asp-sym nature-${t.nature}`} aria-hidden="true">{t.symbol} </span>}
          {t.title}
        </h5>
        <p className="fc-body">{t.body[0]}</p>
        {open && t.body.slice(1).map((p, i) => <p key={i} className="fc-body">{p}</p>)}
        <div className="fc-actions">
          {t.body.length > 1 && (
            <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? 'Less' : 'More'}
            </button>
          )}
          <button type="button" className="link-btn" onClick={() => onShowOnChart(showDate)}>
            See it on your chart
          </button>
        </div>
      </div>
    </li>
  )
}

/**
 * Shown in the birth place's time zone (labelled), plus the viewer's own local
 * time when they're somewhere else — "your time" alone is ambiguous.
 */
function SolarReturnCard({
  at,
  birthZone,
  birthPlace,
  birthTime,
}: {
  at: Date
  birthZone: string
  birthPlace: string
  birthTime: string | null
}) {
  const sr = formatInZone(at, birthZone)
  const here = formatInZone(at, deviceTimeZone())
  const differs = here.date !== sr.date || here.time !== sr.time
  return (
    <article className="fc-card">
      <p className="eyebrow">Your {sr.year} solar return</p>
      <h3>
        <Glyph body="sun" size={18} /> {sr.monthDay} · {sr.time}
        <InfoTip label="About this time">
          <span className="infotip-line">
            {sr.zone} ({birthPlace} time)
            {differs ? `. Where you are now, that’s ${here.time}${here.date !== sr.date ? ` on ${here.monthDay}` : ''}.` : '.'}
          </span>
          <span className="infotip-line">
            {birthTime ? `This isn’t your birth time (${formatClock(birthTime)}). ` : ''}
            The solar return shifts about six hours later on the clock each year, because a year is about 365¼ days.
          </span>
        </InfoTip>
      </h3>
      <p className="small">
        When the Sun returns to its exact birth degree: your personal new year, and a good moment to set intentions.
      </p>
    </article>
  )
}

/** A transit cycle as a bar: orb window, exact hits as dots, and today. */
function WindowBar({ w, now }: { w: TransitWindow; now: Date }) {
  const s = w.start.getTime()
  const e = w.end.getTime()
  const pos = (d: Date) => `${(((d.getTime() - s) / (e - s)) * 100).toFixed(2)}%`
  const showNow = now.getTime() >= s && now.getTime() <= e
  return (
    <div className="wbar" role="img" aria-label={`From ${FMT_SHORT.format(w.start)} to ${FMT_SHORT.format(w.end)}, exact ${w.exacts.map((d) => FMT_SHORT.format(d)).join(', ') || 'never (near miss)'}`}>
      <div className="wbar-track">
        {w.exacts.map((d) => (
          <span key={d.getTime()} className="wbar-exact" style={{ left: pos(d) }} />
        ))}
        {showNow && <span className="wbar-now" style={{ left: pos(now) }} />}
      </div>
      <div className="wbar-labels">
        <span>{FMT_SHORT.format(w.start)}</span>
        <span>{FMT_SHORT.format(w.end)}</span>
      </div>
    </div>
  )
}

function ForecastSkeleton() {
  return (
    <div className="fc-skeleton" role="status" aria-label="Calculating your forecast">
      <div className="fc-cycles">
        {[0, 1, 2].map((i) => (
          <div key={i} className="fc-card">
            <span className="shimmer short" />
            <span className="shimmer" />
            <span className="shimmer" />
          </div>
        ))}
      </div>
      <p className="loading-text small center">Reading the months ahead…</p>
    </div>
  )
}
