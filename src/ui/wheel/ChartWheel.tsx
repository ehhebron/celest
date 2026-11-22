import { memo, useMemo } from 'react'
import { ASPECT_BY_TYPE } from '../../astro/aspects'
import type { Chart } from '../../astro/chart'
import type { TransitAspect, TransitPosition } from '../../astro/transits'
import { angleDiff, formatDegree, SIGNS, signOf, degreeInSign, BODY_BY_ID } from '../../astro/zodiac'
import { aspectTitle, ordinal, placementLabel, pointName } from '../../interpret/describe'
import { BODY_GLYPHS, SIGN_GLYPHS } from '../glyphs'
import { aspectKey, interactive, litFor, type LitSet, type Selection } from '../selection'
import {
  annularSector,
  arcPath,
  C,
  NATAL_ONLY_SCALE,
  polar,
  R,
  screenAngle,
  SIZE,
  spreadLongitudes,
} from './geometry'
import './wheel.css'

interface Props {
  chart: Chart
  transits?: TransitPosition[] | null
  contacts?: TransitAspect[]
  focus: Selection | null
  selected: Selection | null
  onHover: (s: Selection | null) => void
  onSelect: (s: Selection | null) => void
  animateIn?: boolean
  /** Accessible name for the whole figure. */
  label: string
}

const ANGLE_LABEL: Record<string, string> = { asc: 'AC', dsc: 'DC', mc: 'MC', ic: 'IC' }

export function ChartWheel({
  chart,
  transits,
  contacts = [],
  focus,
  selected,
  onHover,
  onSelect,
  animateIn,
  label,
}: Props) {
  const lit = litFor(focus, chart, contacts)
  // A stable string, so the memoized natal layer only re-renders when contacts really change.
  const contactKey = contacts
    .map((c) => `${c.transit}>${c.natal}`)
    .sort()
    .join('|')

  return (
    <svg
      className={`wheel${lit ? ' is-focusing' : ''}${animateIn ? ' reveal' : ''}${transits ? ' has-transits' : ''}`}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="group"
      aria-label={label}
      onClick={() => onSelect(null)}
    >
      <defs>
        <radialGradient id="wheel-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: 'var(--wheel-core)', stopOpacity: 'var(--wheel-core-opacity)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--wheel-core)', stopOpacity: 0 }} />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <NatalLayer
        chart={chart}
        focus={focus}
        selected={selected}
        onHover={onHover}
        onSelect={onSelect}
        showTransits={!!transits}
        contactKey={contactKey}
      />
      <TransitLayer
        chart={chart}
        transits={transits ?? null}
        contacts={contacts}
        lit={lit}
        selected={selected}
        onHover={onHover}
        onSelect={onSelect}
      />
    </svg>
  )
}

const cls = (base: string, isLit: boolean) => `${base} dimmable${isLit ? ' is-lit' : ''}`
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as React.CSSProperties

function pointLongitudes(chart: Chart): Record<string, number> {
  const m: Record<string, number> = {}
  for (const b of chart.bodies) m[b.id] = b.lon
  if (chart.angles) {
    m.asc = chart.angles.asc
    m.mc = chart.angles.mc
  }
  return m
}

interface TransitLayerProps {
  chart: Chart
  transits: TransitPosition[] | null
  contacts: TransitAspect[]
  lit: LitSet | null
  selected: Selection | null
  onHover: Props['onHover']
  onSelect: Props['onSelect']
}

/** The only layer that redraws while scrubbing through time. */
function TransitLayer({ chart, transits, contacts, lit, selected, onHover, onSelect }: TransitLayerProps) {
  const asc = chart.angles?.asc ?? 0
  const ang = (lon: number) => screenAngle(lon, asc)
  const showTransits = !!transits
  const pointLon = useMemo(() => pointLongitudes(chart), [chart])
  const transitDisplay = useMemo(
    () => (transits ? spreadLongitudes(transits.map((t) => ({ id: t.id, lon: t.lon })), 6.2) : {}),
    [transits],
  )
  const isSel = (s: Selection) => JSON.stringify(s) === JSON.stringify(selected)

  return (
    <>
      <g className={`transit-ring${showTransits ? ' is-on' : ''}`} aria-hidden={!showTransits}>
        <circle className="ring faint" cx={C} cy={C} r={R.transitOuter} />
        <circle className="ring faint" cx={C} cy={C} r={R.transitInner} />
        {transits?.map((t) => {
          const a = ang(t.lon)
          const da = ang(transitDisplay[t.id] ?? t.lon)
          const p = polar(R.transitGlyph, da)
          const t1 = polar(R.outer, a)
          const t2 = polar(R.transitInner + 4, a)
          const contact = contacts.find((c) => c.transit === t.id)
          const isLit = !!lit?.transits.has(t.id)
          const sel: Selection = { kind: 'transit', id: t.id }
          return (
            <g key={t.id} className={cls('transit', isLit)}>
              <line className="transit-tick" x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} />
              <g
                className={`transit-glyph${contact ? ' has-contact' : ''}${isSel(sel) ? ' is-selected' : ''}`}
                transform={`translate(${p.x} ${p.y})`}
                aria-label={`Transiting ${BODY_BY_ID[t.id].name} at ${formatDegree(t.lon)} ${signOf(t.lon).name}${contact ? `, ${ASPECT_BY_TYPE[contact.type].name.toLowerCase()} your ${pointName(contact.natal)}` : ''}`}
                {...interactive(sel, onSelect, onHover)}
              >
                <circle className="hit" r={20} />
                {contact && <circle className="contact-halo" r={17} />}
                <path className="glyph-path" d={BODY_GLYPHS[t.id]} transform="translate(-13.2 -13.2) scale(1.1)" />
              </g>
            </g>
          )
        })}
      </g>
      {/* Transit contact chords */}
      {showTransits && (
        <g className="contacts">
          {contacts.map((c) => {
            const t = transits!.find((x) => x.id === c.transit)
            const nl = pointLon[c.natal]
            if (!t || nl === undefined) return null
            const p1 = polar(R.aspect, ang(t.lon))
            const p2 = polar(R.aspect, ang(nl))
            const isLit = !!lit?.contacts.has(`${c.transit}-${c.natal}`)
            return (
              <g key={`${c.transit}-${c.natal}-${c.type}`} className={cls(`contact nature-${ASPECT_BY_TYPE[c.type].nature}`, isLit)}>
                {/* A soft glow underneath marks it as an active transit; the line on top keeps the aspect's texture. */}
                <line className="contact-glow" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />
                <line className="contact-line" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />
              </g>
            )
          })}
        </g>
      )}
    </>
  )
}

interface NatalLayerProps {
  chart: Chart
  focus: Selection | null
  selected: Selection | null
  onHover: Props['onHover']
  onSelect: Props['onSelect']
  showTransits: boolean
  contactKey: string
}

/** Everything natal. Memoized: it doesn't re-render as transit positions change. */
const NatalLayer = memo(function NatalLayer({
  chart,
  focus,
  selected,
  onHover,
  onSelect,
  showTransits,
  contactKey,
}: NatalLayerProps) {
  const asc = chart.angles?.asc ?? 0
  const ang = (lon: number) => screenAngle(lon, asc)
  const contactPairs = useMemo(
    () =>
      contactKey
        ? contactKey.split('|').map((pair) => {
            const [transit, natal] = pair.split('>')
            return { transit, natal }
          })
        : [],
    [contactKey],
  )
  const lit = litFor(focus, chart, contactPairs)
  const pointLon = useMemo(() => pointLongitudes(chart), [chart])

  // Planet ring layout: bodies plus the four angles, fanned apart.
  const display = useMemo(() => {
    const items: { id: string; lon: number }[] = chart.bodies.map((b) => ({ id: b.id, lon: b.lon }))
    if (chart.angles) {
      items.push(
        { id: 'asc', lon: chart.angles.asc },
        { id: 'dsc', lon: chart.angles.dsc },
        { id: 'mc', lon: chart.angles.mc },
        { id: 'ic', lon: chart.angles.ic },
      )
    }
    return spreadLongitudes(items, 6.6)
  }, [chart])

  const ticks = useMemo(() => {
    let d = ''
    for (let deg = 0; deg < 360; deg++) {
      const r2 = deg % 10 === 0 ? R.tickLong : deg % 5 === 0 ? R.tickMid : R.tickShort
      const a = screenAngle(deg, asc)
      const p1 = polar(R.zodiacInner, a)
      const p2 = polar(r2, a)
      d += `M${p1.x.toFixed(2)} ${p1.y.toFixed(2)}L${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    }
    return d
  }, [asc])

  const isSel = (s: Selection) => JSON.stringify(s) === JSON.stringify(selected)

  return (
    <g className="natal" style={{ transform: showTransits ? 'scale(1)' : `scale(${NATAL_ONLY_SCALE})` }}>
      <circle cx={C} cy={C} r={R.aspect} fill="url(#wheel-core)" />

      {/* Zodiac band */}
      <g className="zodiac">
        {SIGNS.map((s, i) => {
          const a1 = ang(i * 30)
          const a2 = ang(i * 30 + 30)
          const mid = polar((R.outer + R.zodiacInner) / 2, ang(i * 30 + 15))
          const isLit = !!lit?.signs.has(s.id)
          const sel: Selection = { kind: 'sign', id: s.id }
          const occupants = chart.bodies.filter((b) => b.sign.id === s.id).length
          return (
            <g
              key={s.id}
              className={cls(`sign el-${s.element}`, isLit)}
              aria-label={`${s.name}: ${occupants} ${occupants === 1 ? 'planet' : 'planets'}`}
              {...interactive(sel, onSelect, onHover)}
            >
              <path className={`sign-sector${isSel(sel) ? ' is-selected' : ''}`} d={annularSector(R.zodiacInner, R.outer, a1, a2)} />
              <g className="sign-glyph-wrap" style={delay(700 + i * 55)}>
                <path
                  className="sign-glyph"
                  d={SIGN_GLYPHS[s.id]}
                  transform={`translate(${mid.x - 13} ${mid.y - 13}) scale(1.0833)`}
                />
              </g>
            </g>
          )
        })}
        <circle className="ring draw" pathLength={1} style={delay(0)} cx={C} cy={C} r={R.outer} />
        <circle className="ring hair draw" pathLength={1} style={delay(120)} cx={C} cy={C} r={R.outer - 5} />
        <circle className="ring draw" pathLength={1} style={delay(240)} cx={C} cy={C} r={R.zodiacInner} />
        {SIGNS.map((_, i) => {
          const a = ang(i * 30)
          const p1 = polar(R.zodiacInner, a)
          const p2 = polar(R.outer, a)
          return (
            <line
              key={i}
              className="divider draw"
              pathLength={1}
              style={delay(420 + i * 40)}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
            />
          )
        })}
        <path className="ticks fade" style={delay(900)} d={ticks} />
      </g>

      {/* Houses */}
      {chart.cusps && (
        <g className="houses">
          {chart.cusps.map((cusp, i) => {
            const a = ang(cusp)
            const p1 = polar(R.aspect, a)
            const p2 = polar(R.zodiacInner, a)
            return (
              <line
                key={i}
                className="cusp draw"
                pathLength={1}
                style={delay(1300 + i * 45)}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
              />
            )
          })}
          {chart.cusps.map((cusp, i) => {
            const next = chart.cusps![(i + 1) % 12]
            const span = (next - cusp + 360) % 360
            const p = polar(R.house, ang(cusp + span / 2))
            const n = i + 1
            const isLit = !!lit?.houses.has(n)
            const sel: Selection = { kind: 'house', n }
            return (
              <g
                key={`h${n}`}
                className={cls('house', isLit)}
                transform={`translate(${p.x} ${p.y})`}
                aria-label={`${ordinal(n)} house`}
                {...interactive(sel, onSelect, onHover)}
              >
                <circle className={`house-hit${isSel(sel) ? ' is-selected' : ''}`} r={14} />
                <text className="house-num fade" style={delay(1700 + i * 30)} dy="0.35em">
                  {n}
                </text>
              </g>
            )
          })}
        </g>
      )}

      {/* Angle axes */}
      {chart.angles && (
        <g className="axes">
          {(['asc', 'mc'] as const).map((id, k) => {
            const lon = chart.angles![id]
            // Axes run across the houses but stop at the zodiac band to keep glyphs clean.
            const pA = polar(R.zodiacInner, ang(lon))
            const pB = polar(R.zodiacInner, ang(lon + 180))
            return (
              <line
                key={id}
                className="axis draw"
                pathLength={1}
                style={delay(1250 + k * 150)}
                x1={pA.x}
                y1={pA.y}
                x2={pB.x}
                y2={pB.y}
              />
            )
          })}
        </g>
      )}

      <circle className="ring draw" pathLength={1} style={delay(1100)} cx={C} cy={C} r={R.aspect} />

      {/* Aspect lines */}
      <g className="aspects">
        {chart.aspects.map((a, i) => {
          const la = pointLon[a.a]
          const lb = pointLon[a.b]
          if (la === undefined || lb === undefined) return null
          const def = ASPECT_BY_TYPE[a.type]
          const key = aspectKey(a)
          const isLit = !!lit?.aspects.has(key)
          const sel: Selection = { kind: 'aspect', a: a.a, b: a.b }
          const width = 0.8 + 2.6 * a.exactness
          const opacity = 0.35 + 0.6 * a.exactness
          const style = { ...delay(2300 + i * 35), '--w': width, '--o': opacity } as React.CSSProperties
          let shape
          if (a.type === 'conjunction') {
            // Conjunctions have no chord: draw a short arc spanning both points.
            const d = angleDiff(lb, la)
            const s = d >= 0 ? ang(la) : ang(lb)
            shape = (
              <path className="aspect-line" style={style} d={arcPath(R.aspect - 9, s - 1.2, s + Math.abs(d) + 1.2)} />
            )
          } else {
            const p1 = polar(R.aspect, ang(la))
            const p2 = polar(R.aspect, ang(lb))
            shape = (
              <line className="aspect-line" style={style} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />
            )
          }
          const hitShape =
            a.type === 'conjunction' ? null : (() => {
              const p1 = polar(R.aspect, ang(la))
              const p2 = polar(R.aspect, ang(lb))
              return <line className="aspect-hit" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />
            })()
          return (
            <g
              key={key}
              className={cls(`aspect nature-${def.nature} type-${a.type}${isSel(sel) ? ' is-selected' : ''}`, isLit)}
              aria-label={`${aspectTitle(a)}, ${a.orb.toFixed(1)} degree orb`}
              {...interactive(sel, onSelect, onHover)}
            >
              {hitShape}
              {shape}
            </g>
          )
        })}
      </g>

      {/* Planets and angle labels */}
      <g className="planets">
        {chart.bodies.map((b, i) => {
          const trueA = ang(b.lon)
          const dispA = ang(display[b.id] ?? b.lon)
          const p = polar(R.planet, dispA)
          const lp = polar(R.label, dispA)
          const tick1 = polar(R.zodiacInner, trueA)
          const tick2 = polar(R.tickLong - 4, trueA)
          const lead = polar(R.planet + 26, dispA)
          const displaced = Math.abs(((dispA - trueA + 540) % 360) - 180) > 0.8
          const isLit = !!lit?.points.has(b.id)
          const sel: Selection = { kind: 'body', id: b.id }
          const deg = Math.floor(degreeInSign(b.lon))
          const min = Math.floor((degreeInSign(b.lon) - deg) * 60)
          const contactHit = showTransits && contactPairs.some((c) => c.natal === b.id)
          return (
            <g key={b.id} className={cls('planet', isLit)}>
              <line className="planet-tick" x1={tick1.x} y1={tick1.y} x2={tick2.x} y2={tick2.y} />
              {displaced && <line className="leader" x1={tick2.x} y1={tick2.y} x2={lead.x} y2={lead.y} />}
              <g
                className="planet-arrive"
                style={{ ...delay(1700 + i * 70), '--from': `${-35 - i * 3}deg` } as React.CSSProperties}
              >
                <g
                  className={`planet-glyph${isSel(sel) ? ' is-selected' : ''}${contactHit ? ' has-contact' : ''}`}
                  transform={`translate(${p.x} ${p.y})`}
                  aria-label={placementLabel(b)}
                  {...interactive(sel, onSelect, onHover)}
                >
                  <circle className="hit" r={22} />
                  <circle className="halo" r={21} />
                  <path className="glyph-path" d={BODY_GLYPHS[b.id]} transform="translate(-15.6 -15.6) scale(1.3)" />
                </g>
                <text className="deg-label" x={lp.x} y={lp.y} dy="0.35em" aria-hidden="true">
                  {b.approximate ? `~${deg}°` : `${deg}°`}
                  {!b.approximate && <tspan className="min">{String(min).padStart(2, '0')}′</tspan>}
                  {b.retrograde && <tspan className="rx"> ℞</tspan>}
                </text>
              </g>
            </g>
          )
        })}
        {chart.angles &&
          (['asc', 'dsc', 'mc', 'ic'] as const).map((id, i) => {
            const lon = chart.angles![id]
            const p = polar(R.planet, ang(display[id] ?? lon))
            const lp = polar(R.label, ang(display[id] ?? lon))
            const focusable = id === 'asc' || id === 'mc'
            const sel: Selection | null = focusable ? { kind: 'angle', id } : null
            const isLit = !!lit?.points.has(id === 'dsc' ? 'asc' : id === 'ic' ? 'mc' : id)
            return (
              <g key={id} className={cls('angle', isLit)}>
                <g className="planet-arrive" style={{ ...delay(1500 + i * 60), '--from': '0deg' } as React.CSSProperties}>
                  <g
                    className={`angle-label${sel && isSel(sel) ? ' is-selected' : ''}`}
                    transform={`translate(${p.x} ${p.y})`}
                    {...(sel
                      ? {
                          ...interactive(sel, onSelect, onHover),
                          'aria-label': `${pointName(id)} at ${formatDegree(lon)} ${signOf(lon).name}`,
                        }
                      : { 'aria-hidden': true })}
                  >
                    <circle className="hit" r={20} />
                    <text dy="0.36em">{ANGLE_LABEL[id]}</text>
                  </g>
                  <text className="deg-label" x={lp.x} y={lp.y} dy="0.35em" aria-hidden="true">
                    {Math.floor(degreeInSign(lon))}°
                  </text>
                </g>
              </g>
            )
          })}
      </g>

      <circle className="center-dot fade" style={delay(2600)} cx={C} cy={C} r={3} />
    </g>
  )
})
