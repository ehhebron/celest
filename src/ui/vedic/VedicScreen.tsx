import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Chart } from '../../astro/chart'
import { currentPeriods, vimshottari } from '../../astro/vedic/dasha'
import { computeVedic, GRAHA_NAME, RASHIS } from '../../astro/vedic/vedic'
import { findYogas } from '../../astro/vedic/yogas'
import { ordinal } from '../../interpret/describe'
import { formatSidereal, gname } from '../../interpret/vedic'
import { DIGNITY_LABEL, NAKSHATRA_TEXT } from '../../interpret/vedicTexts'
import { BottomSheet } from '../BottomSheet'
import { useMediaQuery } from '../hooks'
import { NorthIndianChart } from './NorthIndianChart'
import { sameVedic, type VedicSelection } from './selection'
import { GrahaGlyph, VedicDetail } from './VedicDetail'
import './vedic.css'

interface Props {
  chart: Chart
  now: Date
  /** The Western / Vedic system picker, shared with the Western screen. */
  systemSelect: ReactNode
  notices: string[]
}

export function VedicScreen({ chart, now, systemSelect, notices }: Props) {
  const vedic = useMemo(() => computeVedic(chart), [chart])
  const dashas = useMemo(() => vimshottari(vedic), [vedic])
  const yogas = useMemo(() => findYogas(vedic), [vedic])
  const current = useMemo(() => currentPeriods(dashas, now), [dashas, now])
  const [view, setView] = useState<'chart' | 'planets' | 'dashas'>('chart')
  const [selected, setSelected] = useState<VedicSelection | null>(null)
  const [hovered, setHovered] = useState<VedicSelection | null>(null)
  const isMobile = useMediaQuery('(max-width: 760px)')
  const select = useCallback(
    (s: VedicSelection | null) => setSelected((prev) => (sameVedic(prev, s) && !isMobile ? null : s)),
    [isMobile],
  )

  const moon = vedic.grahas.find((g) => g.id === 'moon')!
  const sun = vedic.grahas.find((g) => g.id === 'sun')!
  const detail = <VedicDetail vedic={vedic} dashas={dashas} yogas={yogas} current={current} selection={selected} onSelect={select} />

  const strip = [
    vedic.lagna
      ? { key: 'lagna', label: 'Lagna', sign: RASHIS[vedic.lagna.sign].name, line: `${RASHIS[vedic.lagna.sign].western} rising · ${vedic.lagna.nakshatra.name}`, sel: { kind: 'lagna' } as VedicSelection, glyph: <span className="asc-mark">As</span> }
      : null,
    {
      key: 'moon',
      label: moon.approximate ? 'Moon (approx.)' : 'Moon · Rashi',
      sign: RASHIS[moon.sign].name,
      line: `${moon.nakshatra.name} nakshatra: ${NAKSHATRA_TEXT[moon.nakshatra.index].meaning.split(':')[0]}`,
      sel: { kind: 'graha', id: 'moon' } as VedicSelection,
      glyph: <GrahaGlyph id="moon" size={22} />,
    },
    { key: 'sun', label: 'Sun', sign: RASHIS[sun.sign].name, line: `${RASHIS[sun.sign].western} (sidereal) · ${sun.nakshatra.name}`, sel: { kind: 'graha', id: 'sun' } as VedicSelection, glyph: <GrahaGlyph id="sun" size={22} /> },
  ]

  return (
    <>
      <section className="big-three" aria-label="Lagna, Moon and Sun">
        {strip.map((it, i) =>
          it ? (
            <button key={it.key} type="button" className="b3-item" onClick={() => select(it.sel)} style={{ animationDelay: `${300 + i * 120}ms` }}>
              <span className="b3-glyph">{it.glyph}</span>
              <span className="b3-text">
                <span className="eyebrow">{it.label}</span>
                <span className="b3-sign">{it.sign}</span>
                <span className="b3-line">{it.line}</span>
              </span>
            </button>
          ) : (
            <div key="lagna" className="b3-item is-unknown">
              <span className="b3-glyph">
                <span className="asc-mark">As</span>
              </span>
              <span className="b3-text">
                <span className="eyebrow">Lagna</span>
                <span className="b3-sign">Unknown</span>
                <span className="b3-line">Add a birth time to reveal your Lagna. Houses are counted from the Moon for now.</span>
              </span>
            </div>
          ),
        )}
      </section>

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
            <div className="segmented" role="tablist" aria-label="Vedic view">
              <button type="button" role="tab" aria-selected={view === 'chart'} onClick={() => setView('chart')}>
                Chart
              </button>
              <button type="button" role="tab" aria-selected={view === 'planets'} onClick={() => setView('planets')}>
                Planets
              </button>
              <button type="button" role="tab" aria-selected={view === 'dashas'} onClick={() => setView('dashas')}>
                Dashas
              </button>
            </div>
            {systemSelect}
          </div>

          {view === 'chart' ? (
            <div className="north-wrap">
              <NorthIndianChart vedic={vedic} selected={selected} focus={hovered ?? selected} onSelect={select} onHover={setHovered} />
              <p className="north-key muted">
                {vedic.fromMoon ? 'Houses counted from the Moon (Chandra Lagna). ' : 'Top centre is your Lagna (1st house); houses run counter-clockwise. '}
                Numbers are signs (1 = Mesha/Aries). ʀ retrograde · ↑ exalted · ↓ debilitated · ᶜ combust. Tap a planet to see the houses it aspects.
              </p>
            </div>
          ) : view === 'planets' ? (
            <PlanetsTable vedic={vedic} onSelect={select} />
          ) : (
            <DashaTimeline dashas={dashas} current={current} now={now} approximate={!chart.timeKnown} onSelect={select} />
          )}
        </div>

        <aside className="side-col">{!isMobile && <div className="card detail-card">{detail}</div>}</aside>
      </div>

      {isMobile && (
        <BottomSheet open={!!selected} onClose={() => setSelected(null)} label="Details">
          {detail}
        </BottomSheet>
      )}
      {isMobile && !selected && <div className="card detail-card vedic-mobile-overview">{detail}</div>}
    </>
  )
}

function PlanetsTable({ vedic, onSelect }: { vedic: ReturnType<typeof computeVedic>; onSelect: (s: VedicSelection) => void }) {
  return (
    <div className="chart-table">
      <table>
        <caption>Grahas</caption>
        <thead>
          <tr>
            <th scope="col">Graha</th>
            <th scope="col">Position</th>
            <th scope="col">Nakshatra</th>
            <th scope="col">House</th>
            <th scope="col">Dignity</th>
          </tr>
        </thead>
        <tbody>
          {vedic.lagna && (
            <tr>
              <th scope="row">
                <button type="button" className="row-btn" onClick={() => onSelect({ kind: 'lagna' })}>
                  <span className="mini-angle">As</span> Lagna
                </button>
              </th>
              <td className="num">{formatSidereal(vedic.lagna.lon)}</td>
              <td>
                {vedic.lagna.nakshatra.name} {vedic.lagna.nakshatra.pada}
              </td>
              <td>1st</td>
              <td>—</td>
            </tr>
          )}
          {vedic.grahas.map((g) => (
            <tr key={g.id}>
              <th scope="row">
                <button type="button" className="row-btn" onClick={() => onSelect({ kind: 'graha', id: g.id })}>
                  <GrahaGlyph id={g.id} size={16} /> {GRAHA_NAME[g.id].name}
                  <span className="muted small"> {GRAHA_NAME[g.id].sanskrit}</span>
                </button>
              </th>
              <td className="num">
                {formatSidereal(g.lon, g.approximate)}
                {g.retrograde && g.id !== 'rahu' && g.id !== 'ketu' ? ' ʀ' : ''}
              </td>
              <td>
                {g.nakshatra.name} {g.nakshatra.pada}
              </td>
              <td>
                <button type="button" className="row-btn" onClick={() => onSelect({ kind: 'house', n: g.house })}>
                  {ordinal(g.house)}
                </button>
              </td>
              <td className={`dig-${g.dignity}`}>
                {g.dignity === 'neutral' ? '—' : DIGNITY_LABEL[g.dignity]}
                {g.combust ? ' · combust' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DashaTimeline({
  dashas,
  current,
  now,
  approximate,
  onSelect,
}: {
  dashas: ReturnType<typeof vimshottari>
  current: ReturnType<typeof currentPeriods>
  now: Date
  approximate: boolean
  onSelect: (s: VedicSelection) => void
}) {
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
  const start = dashas[0].start.getTime()
  const span = dashas[8].end.getTime() - start
  return (
    <div className="dasha-view">
      <h2 className="dasha-title">Vimshottari dasha</h2>
      <p className="muted dasha-intro">
        Your life unfolds through a 120-year cycle of planetary periods. Each mahadasha brings its planet’s themes, and the houses it rules and
        occupies in your chart, to the foreground. The cycle starts from the lord of your Moon’s nakshatra.
        {approximate ? ' With the birth time unknown, these dates could be off by months or more.' : ''}
      </p>
      <div className="dasha-bar" aria-hidden="true">
        {dashas.map((d) => (
          <span
            key={d.lord}
            className={`seg seg-${d.lord}${current?.maha === d ? ' is-now' : ''}`}
            style={{ width: `${((d.end.getTime() - d.start.getTime()) / span) * 100}%` }}
          >
            {GRAHA_NAME[d.lord].abbr}
          </span>
        ))}
        <span className="now-mark" style={{ left: `${Math.min(100, Math.max(0, ((now.getTime() - start) / span) * 100))}%` }} />
      </div>
      <ol className="dasha-list">
        {dashas.map((d, i) => {
          const isNow = current?.maha === d
          const progress = isNow ? (now.getTime() - d.start.getTime()) / (d.end.getTime() - d.start.getTime()) : 0
          return (
            <li key={d.lord} className={isNow ? 'is-now' : d.end < now ? 'is-past' : ''}>
              <button type="button" onClick={() => onSelect({ kind: 'dasha', index: i })}>
                <span className="dl-glyph">
                  <GrahaGlyph id={d.lord} size={20} />
                </span>
                <span className="dl-text">
                  <span className="dl-name">
                    {gname(d.lord)} mahadasha{isNow && <span className="now-chip">Now</span>}
                  </span>
                  <span className="dl-dates">
                    {fmt(d.start)} – {fmt(d.end)}
                    {isNow && current ? ` · ${gname(current.antar.lord)} sub-period until ${fmt(current.antar.end)}` : ''}
                  </span>
                  {isNow && (
                    <span className="dl-progress">
                      <span style={{ width: `${progress * 100}%` }} />
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
