import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { Chart } from '../../astro/chart'
import type { Angles } from '../../astro/houses'
import { compassPoint, horizonModel, sectStatus, type HorizonBody, type HorizonModel, type Vec3 } from '../../astro/horizon'
import { BODY_BY_ID, SIGNS, type BodyId } from '../../astro/zodiac'
import { placementLabel, pointName } from '../../interpret/describe'
import { formatAltitude, PHASE_LABEL, skyOverview } from '../../interpret/sky'
import { Glyph } from '../Glyph'
import { BODY_GLYPHS, SIGN_GLYPHS } from '../glyphs'
import { prefersReducedMotion } from '../hooks'
import { interactive, litFor, type Selection } from '../selection'
import { circle, clipPolygon, clipPolyline, dot, mixBasis, relax, scale, sideBasis, wheelBasis, type Basis } from './space'
import '../wheel/wheel.css'
import './side.css'

interface Props {
  chart: Chart
  focus: Selection | null
  selected: Selection | null
  onHover: (s: Selection | null) => void
  onSelect: (s: Selection | null) => void
}

const SIZE = 1000
const C = SIZE / 2
/** Pixels per unit of the celestial sphere. */
const S = 380
const R_IN = 1
const R_OUT = 1.13
const R_PLANET = 0.84
const R_ANGLE = 1.24
const DEFAULT_CAM = { az: 0, el: 16 }

function horizonPhrase(b: HorizonBody): string {
  const a = Math.abs(b.alt)
  const deg = a < 1 ? a.toFixed(1) : Math.round(a)
  return `${deg}° ${b.above ? 'above' : 'below'} the horizon, ${PHASE_LABEL[b.phase].toLowerCase()}`
}

export function SideView(props: Props) {
  const model = useMemo(() => horizonModel(props.chart), [props.chart])
  if (!model || !props.chart.angles) {
    return (
      <div className="side-empty card" role="note">
        <p className="eyebrow">Side view needs a birth time</p>
        <p className="muted">
          Where the planets sat relative to your horizon depends on the exact minute of birth, as the sky turns a full circle each day.
          Add a birth time to see which planets were up, how high they were and whether you were born by day or by night.
        </p>
      </div>
    )
  }
  return (
    <>
      <SideScene {...props} model={model} />
      <SidePanel chart={props.chart} model={model} onSelect={props.onSelect} />
    </>
  )
}

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)
const smooth = (k: number) => {
  const x = Math.max(0, Math.min(1, k))
  return x * x * (3 - 2 * x)
}

function SideScene({ chart, model, focus, selected, onHover, onSelect }: Props & { model: HorizonModel }) {
  const asc = chart.angles!.asc
  const [flat, setFlat] = useState(false)
  const [t, setT] = useState(0)
  const [cam, setCam] = useState(DEFAULT_CAM)
  const tRef = useRef(0)
  const firstRun = useRef(true)

  // Tip the wheel over onto the horizon (or lay it back down).
  useEffect(() => {
    const target = flat ? 0 : 1
    const from = tRef.current
    const delay = firstRun.current ? 450 : 0
    firstRun.current = false
    const reduced = prefersReducedMotion()
    const start = performance.now()
    let raf = requestAnimationFrame(function step(now) {
      const k = reduced ? 1 : Math.max(0, Math.min(1, (now - start - delay) / 1400))
      const v = from + (target - from) * easeInOut(k)
      tRef.current = v
      setT(v)
      if (k < 1) raf = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(raf)
  }, [flat])

  const geo = useMemo(() => buildGeometry(model, chart.angles!), [model, chart.angles])
  const basis: Basis = useMemo(
    () => mixBasis(wheelBasis(model.eclToHor, asc), sideBasis(geo.dsc, cam.az, cam.el), t),
    [model, asc, geo, cam, t],
  )
  const P = (p: Vec3) => ({ x: C + S * dot(p, basis.r), y: C - S * dot(p, basis.u) })
  const path = (pts: Vec3[], close = false) =>
    pts.length < 2
      ? ''
      : pts
          .map((p, i) => {
            const q = P(p)
            return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`
          })
          .join('') + (close ? 'Z' : '')

  const g = smooth((t - 0.25) / 0.6) // horizon furniture fades in as the wheel stands up
  const standing = t > 0.98
  const camAbove = basis.v[2] >= 0
  const lit = litFor(focus, chart)
  const isSel = (s: Selection) => JSON.stringify(s) === JSON.stringify(selected)

  // Planet glyphs: exact points, nudged apart on screen where they crowd.
  const planets = model.bodies.map((b) => {
    const p = scale(b.hor, R_PLANET)
    return { b, p, foot: [p[0], p[1], 0] as Vec3, at: P(p) }
  })
  const shown = relax(
    planets.map((x) => x.at),
    36,
  )

  // Altitude labels for the focused planet and the planets it aspects, dropping any that would collide.
  const altLabels = new Set<string>()
  if (g > 0.5 && lit) {
    const focusId = focus?.kind === 'body' ? focus.id : null
    const order = planets
      .map((x, i) => ({ id: x.b.id, i }))
      .filter((x) => lit.points.has(x.id))
      .sort((a, b) => (a.id === focusId ? -1 : b.id === focusId ? 1 : 0))
    const boxes: { x: number; y: number }[] = []
    for (const { id, i } of order) {
      const d = shown[i]
      // A label spans ~56px right of the glyph; glyphs themselves are ~40px wide.
      const hits = boxes.some((b) => Math.abs(b.x - d.x) < 64 && Math.abs(b.y - d.y) < 22) ||
        shown.some((o, j) => j !== i && o.x > d.x + 8 && o.x < d.x + 84 && Math.abs(o.y - d.y) < 22)
      if (hits && id !== focusId) continue
      boxes.push(d)
      altLabels.add(id)
    }
  }

  // Drag to orbit (once standing). Capture only after a real move, so taps still select planets.
  const drag = useRef<{ id: number; x: number; y: number; moving: boolean } | null>(null)
  const swallowClick = useRef(false)
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!standing || (e.pointerType === 'mouse' && e.button !== 0)) return
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moving: false }
  }
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moving) {
      if (Math.hypot(dx, dy) < 5) return
      d.moving = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    d.x = e.clientX
    d.y = e.clientY
    const k = 360 / Math.max(320, e.currentTarget.clientWidth)
    setCam((c) => ({ az: c.az - dx * k * 0.6, el: Math.max(-12, Math.min(88, c.el + dy * k * 0.45)) }))
  }
  const endDrag = (e: PointerEvent<SVGSVGElement>) => {
    if (drag.current?.moving) swallowClick.current = true
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (!standing) return
    const step: Record<string, [number, number]> = {
      ArrowLeft: [10, 0],
      ArrowRight: [-10, 0],
      ArrowUp: [0, 8],
      ArrowDown: [0, -8],
    }
    const s = step[e.key]
    if (!s) return
    e.preventDefault()
    setCam((c) => ({ az: c.az + s[0], el: Math.max(-12, Math.min(88, c.el + s[1])) }))
  }

  const layer = (side: 1 | -1) => {
    const on = (p: Vec3) => (side === 1 ? p[2] >= -1e-6 : p[2] < -1e-6)
    return (
      <g className={`layer ${side === 1 ? 'is-above' : 'is-below'}`}>
        {side === 1 && (
          <g className="dome" style={{ opacity: g }} aria-hidden="true">
            <path d={path(geo.meridian)} />
            <path d={path(geo.primeVertical)} />
            {(() => {
              const z = P([0, 0, 1.04])
              return (
                <text className="dome-label" x={z.x} y={z.y - 6}>
                  Zenith
                </text>
              )
            })()}
          </g>
        )}
        <g className="zodiac">
          {SIGNS.map((s, i) => {
            const poly = side === 1 ? geo.sectors[i].above : geo.sectors[i].below
            const isLit = !!lit?.signs.has(s.id)
            const sel: Selection = { kind: 'sign', id: s.id }
            const mid = geo.signMids[i]
            const q = P(mid)
            return (
              <g key={s.id} className={`sign el-${s.element} dimmable${isLit ? ' is-lit' : ''}`}>
                {poly.length > 2 && (
                  <path
                    className={`sign-sector${isSel(sel) ? ' is-selected' : ''}`}
                    d={path(poly, true)}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(sel)
                    }}
                  />
                )}
                {on(mid) && (
                  <g {...interactive(sel, onSelect, onHover)} aria-label={s.name}>
                    <circle className="hit" cx={q.x} cy={q.y} r={18} />
                    <path className="sign-glyph" d={SIGN_GLYPHS[s.id]} transform={`translate(${q.x - 11} ${q.y - 11}) scale(0.92)`} />
                  </g>
                )}
              </g>
            )
          })}
          {geo.rings.map((ring, i) =>
            clipPolyline(ring, side).map((run, j) => <path key={`${i}-${j}`} className={`ring${i === 1 ? '' : ' soft'}`} d={path(run)} />),
          )}
          {geo.dividers.map((line, i) =>
            clipPolyline(line, side).map((run, j) => <path key={`${i}-${j}`} className="divider" d={path(run)} />),
          )}
        </g>
        <g className="axes">
          {geo.axes.map((line, i) => clipPolyline(line, side).map((run, j) => <path key={`${i}-${j}`} className="axis" d={path(run)} />))}
        </g>
        {(['asc', 'dsc', 'mc', 'ic'] as const).map((id) => {
          const pos = geo.angles[id]
          if (!on(pos)) return null
          const q = P(pos)
          const focusable = id === 'asc' || id === 'mc'
          const sel: Selection | null = focusable ? { kind: 'angle', id } : null
          const isLit = !!lit?.points.has(id === 'dsc' ? 'asc' : id === 'ic' ? 'mc' : id)
          return (
            <g key={id} className={`angle dimmable${isLit ? ' is-lit' : ''}`}>
              <g
                className={`angle-label${sel && isSel(sel) ? ' is-selected' : ''}`}
                transform={`translate(${q.x} ${q.y})`}
                {...(sel ? { ...interactive(sel, onSelect, onHover), 'aria-label': pointName(id) } : { 'aria-hidden': true })}
              >
                <circle className="hit" r={20} />
                <text dy="0.36em">{id.toUpperCase().replace('ASC', 'AC').replace('DSC', 'DC')}</text>
              </g>
            </g>
          )
        })}
        {planets.map(({ b, p, foot, at }, i) => {
          if (!on(p)) return null
          const placement = chart.bodies.find((x) => x.id === b.id)!
          const sel: Selection = { kind: 'body', id: b.id }
          const isLit = !!lit?.points.has(b.id)
          const d = shown[i]
          const moved = Math.hypot(d.x - at.x, d.y - at.y) > 3
          const f = P(foot)
          const showAlt = altLabels.has(b.id)
          return (
            <g key={b.id} className={`planet dimmable${isLit ? ' is-lit' : ''}`}>
              {g > 0.01 && (
                <g style={{ opacity: g }}>
                  <line className="stem" x1={at.x} y1={at.y} x2={f.x} y2={f.y} />
                  <circle className="foot" cx={f.x} cy={f.y} r={2.2} />
                </g>
              )}
              <circle className="true-dot" cx={at.x} cy={at.y} r={2.6} />
              {moved && <line className="leader" x1={at.x} y1={at.y} x2={d.x} y2={d.y} />}
              <g
                className={`planet-glyph${isSel(sel) ? ' is-selected' : ''}`}
                transform={`translate(${d.x} ${d.y})`}
                aria-label={`${placementLabel(placement)}, ${horizonPhrase(b)}`}
                {...interactive(sel, onSelect, onHover)}
              >
                <circle className="hit" r={20} />
                <circle className="halo" r={19} />
                <path className="glyph-path" d={BODY_GLYPHS[b.id]} transform="translate(-13.2 -13.2) scale(1.1)" />
              </g>
              {showAlt && (
                <text className="alt-label" x={d.x + 24} y={d.y} dy="0.35em" aria-hidden="true">
                  {formatAltitude(b.alt)}
                </text>
              )}
            </g>
          )
        })}
      </g>
    )
  }

  const sun = model.bodies.find((b) => b.id === 'sun')!
  const sunAt = P(scale(sun.hor, R_PLANET))
  const ground = (
    <g className="ground" style={{ opacity: g }} aria-hidden="true">
      <path className="ground-disc" d={path(geo.horizon, true)} />
      {geo.compass.map(([label, pos]) => {
        const q = P(pos)
        return (
          <text key={label} className="compass" x={q.x} y={q.y} dy="0.35em">
            {label}
          </text>
        )
      })}
      {(() => {
        const o = P([0, 0, 0])
        const head = P([0, 0, 0.07])
        return (
          <g className="observer">
            <line x1={o.x} y1={o.y} x2={head.x} y2={head.y} />
            <circle cx={head.x} cy={head.y} r={4.5} />
            <circle className="observer-base" cx={o.x} cy={o.y} r={2.5} />
          </g>
        )
      })()}
    </g>
  )

  const label = `Side view of the birth sky. ${model.sect === 'day' ? 'Day' : 'Night'} chart: the Sun is ${horizonPhrase(sun)}. ${
    model.bodies.filter((b) => b.above).length
  } of ${model.bodies.length} planets and points are above the horizon. Tab to each planet for its altitude.`

  return (
    <div className="side-wrap">
      <div className="side-controls">
        <div className="segmented" role="group" aria-label="Orientation">
          <button type="button" aria-pressed={flat} onClick={() => setFlat(true)}>
            Flat
          </button>
          <button type="button" aria-pressed={!flat} onClick={() => setFlat(false)}>
            Side
          </button>
        </div>
        <span className="side-hint" id="side-hint">
          {standing ? 'Drag or use the arrow keys to turn the sky' : flat ? 'The wheel, laid flat on the ecliptic' : 'Tipping onto your horizon…'}
        </span>
        <button
          type="button"
          className="btn side-reset"
          onClick={() => setCam(DEFAULT_CAM)}
          disabled={cam.az === DEFAULT_CAM.az && cam.el === DEFAULT_CAM.el}
        >
          Reset view
        </button>
      </div>
      <div
        className={`wheel-wrap side-stage is-${model.sect}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="3D sky. Use the arrow keys to turn it."
        aria-describedby="side-hint"
      >
        <svg
          className={`wheel sky3d${lit ? ' is-focusing' : ''}${standing ? ' is-standing' : ''}`}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="group"
          aria-label={label}
          onClick={() => onSelect(null)}
          onClickCapture={(e) => {
            if (swallowClick.current) {
              swallowClick.current = false
              e.stopPropagation()
            }
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <defs>
            <radialGradient id="side-sun-glow">
              <stop offset="0%" style={{ stopColor: 'var(--gold-bright)', stopOpacity: 0.35 }} />
              <stop offset="100%" style={{ stopColor: 'var(--gold-bright)', stopOpacity: 0 }} />
            </radialGradient>
          </defs>
          {sun.above && <circle className="sun-glow" cx={sunAt.x} cy={sunAt.y} r={120} style={{ opacity: g }} />}
          {camAbove ? (
            <>
              {layer(-1)}
              {ground}
              {layer(1)}
            </>
          ) : (
            <>
              {layer(1)}
              {ground}
              {layer(-1)}
            </>
          )}
        </svg>
      </div>
    </div>
  )
}

interface Geometry {
  dsc: Vec3
  sectors: { above: Vec3[]; below: Vec3[] }[]
  signMids: Vec3[]
  rings: Vec3[][]
  dividers: Vec3[][]
  axes: Vec3[][]
  angles: Record<'asc' | 'dsc' | 'mc' | 'ic', Vec3>
  horizon: Vec3[]
  meridian: Vec3[]
  primeVertical: Vec3[]
  compass: [string, Vec3][]
}

function buildGeometry(model: HorizonModel, angles: Angles): Geometry {
  const { asc, mc } = angles
  const E = (lon: number, r: number) => scale(model.eclToHor(lon), r)
  const arc = (from: number, to: number, r: number) => {
    const pts: Vec3[] = []
    for (let l = from; l <= to + 1e-9; l += 3) pts.push(E(l, r))
    return pts
  }
  const sectors = SIGNS.map((_, i) => {
    const poly = [...arc(i * 30, i * 30 + 30, R_OUT), ...arc(i * 30, i * 30 + 30, R_IN).reverse()]
    return { above: clipPolygon(poly, 1), below: clipPolygon(poly, -1) }
  })
  return {
    dsc: model.eclToHor(asc + 180),
    sectors,
    signMids: SIGNS.map((_, i) => E(i * 30 + 15, (R_IN + R_OUT) / 2)),
    rings: [arc(0, 360, R_IN), arc(0, 360, R_OUT)],
    dividers: SIGNS.map((_, i) => [E(i * 30, R_IN), E(i * 30, R_OUT)]),
    // AC–DC is the horizon line; MC–IC runs through the meridian. Both come from the chart's angles.
    axes: [
      [E(asc, R_IN), E(asc + 180, R_IN)],
      [E(mc, R_IN), [0, 0, 0], E(mc + 180, R_IN)],
    ],
    angles: { asc: E(asc, R_ANGLE), dsc: E(asc + 180, R_ANGLE), mc: E(mc, R_ANGLE), ic: E(mc + 180, R_ANGLE) },
    horizon: circle([1, 0, 0], [0, 1, 0], 1, 0, 356, 4),
    meridian: circle([1, 0, 0], [0, 0, 1], 1, 0, 180),
    primeVertical: circle([0, -1, 0], [0, 0, 1], 1, 0, 180),
    compass: [
      ['N', [1.13, 0, 0]],
      ['S', [-1.13, 0, 0]],
      ['E', [0, -1.13, 0]],
      ['W', [0, 1.13, 0]],
    ],
  }
}

function SidePanel({ chart, model, onSelect }: { chart: Chart; model: HorizonModel; onSelect: (s: Selection) => void }) {
  const o = useMemo(() => skyOverview(chart, model), [chart, model])
  const sorted = [...model.bodies].sort((a, b) => b.alt - a.alt)
  const above = sorted.filter((b) => b.above)
  const below = sorted.filter((b) => !b.above)
  const pick = (id: string) => onSelect(id === 'asc' || id === 'mc' ? { kind: 'angle', id } : { kind: 'body', id: id as BodyId })

  const row = (b: HorizonBody) => {
    const st = sectStatus(b, model.sect)
    return (
      <tr key={b.id} className={b.above ? '' : 'is-below'}>
        <th scope="row">
          <button type="button" className="row-btn" onClick={() => pick(b.id)}>
            <Glyph body={b.id} size={16} /> {BODY_BY_ID[b.id].name}
          </button>
        </th>
        <td className="num">{formatAltitude(b.alt)}</td>
        <td>{compassPoint(b.az)}</td>
        <td>{PHASE_LABEL[b.phase]}</td>
        <td>{st ? (st.inSect ? 'In sect' : 'Out of sect') : '—'}</td>
      </tr>
    )
  }

  const pct = (x: number) => `${Math.round(x * 100)}%`

  return (
    <div className="side-panel">
      <h2 className="side-panel-title">Your sky</h2>
      <p className="muted side-panel-intro">
        The wheel tells you which sign and house each planet is in. The sky adds another layer: which planets were rising, overhead, setting or
        beneath you, and so which parts of your life they speak through. Tap any planet for its full reading.
      </p>

      <div className="sky-cards">
        {o.summary.length > 0 && (
          <section className="sky-card summary-card" aria-labelledby="summary-title">
            <p className="eyebrow">What your sky says about you</p>
            <h3 id="summary-title">{model.sect === 'day' ? 'Born under the Sun' : 'Born under the Moon'}</h3>
            {o.summary.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
        )}
        <section className={`sky-card sect-card is-${model.sect}`} aria-labelledby="sect-title">
          <p className="eyebrow">Sect</p>
          <h3 id="sect-title">{o.sect.title}</h3>
          <p>{o.sect.summary}</p>
          <p className="muted">{o.sect.meaning}</p>
          {o.team.length > 0 && (
            <ul className="team-list">
              {o.team.map((t) => (
                <li key={t.role}>
                  <button type="button" className="row-btn" onClick={() => pick(t.id)}>
                    <Glyph body={t.id} size={16} />
                    <span>
                      <span className="team-role">{t.role}</span>
                      <span className="team-name">
                        {BODY_BY_ID[t.id].name} <span className="muted">· {t.where}</span>
                      </span>
                    </span>
                  </button>
                  <span className="team-note muted">{t.note}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="muted small">{o.sect.visibility}</p>
        </section>

        <section className="sky-card" aria-labelledby="hemi-title">
          <p className="eyebrow">Emphasis</p>
          <h3 id="hemi-title">Above &amp; below, east &amp; west</h3>
          <div className="hemi-bars" aria-hidden="true">
            <div className="hemi-bar">
              <span>Above</span>
              <span className="bar">
                <span style={{ width: pct(o.hemispheres.above) }} />
              </span>
              <span className="num">{pct(o.hemispheres.above)}</span>
            </div>
            <div className="hemi-bar">
              <span>East</span>
              <span className="bar">
                <span style={{ width: pct(o.hemispheres.east) }} />
              </span>
              <span className="num">{pct(o.hemispheres.east)}</span>
            </div>
          </div>
          <p>{o.hemispheres.vertical}</p>
          <p>{o.hemispheres.horizontal}</p>
          <p className="muted small">Weighted: Sun and Moon count double, Uranus, Neptune and Pluto half, the Node and Chiron not at all.</p>
        </section>

        {o.standouts.length > 0 && (
          <section className="sky-card" aria-labelledby="standout-title">
            <p className="eyebrow">Standouts</p>
            <h3 id="standout-title">Planets the sky singles out</h3>
            <ul className="standout-list">
              {o.standouts.map((s, i) => (
                <li key={`${s.id}-${i}`}>
                  <button type="button" className="row-btn" onClick={() => pick(s.id)}>
                    <Glyph body={s.id} size={18} />
                    <span>
                      <span className="team-name">{BODY_BY_ID[s.id].name}</span>
                      <span className="team-role">{s.label}</span>
                    </span>
                  </button>
                  <span className="muted small">{s.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {o.flatVsSky.length > 0 && (
          <section className="sky-card" aria-labelledby="flat-title">
            <p className="eyebrow">Flat chart vs. real sky</p>
            <h3 id="flat-title">What the wheel hides</h3>
            <ul className="flat-list">
              {o.flatVsSky.map((f) => (
                <li key={`${f.a}-${f.b}`}>
                  <button type="button" className="row-btn" onClick={() => onSelect({ kind: 'aspect', a: f.a, b: f.b })}>
                    {f.text}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="chart-table side-table">
        <table>
          <caption>
            In the sky <span className="muted">· {above.length} of {model.bodies.length} above the horizon</span>
          </caption>
          <thead>
            <tr>
              <th scope="col">Body</th>
              <th scope="col">Altitude</th>
              <th scope="col">Direction</th>
              <th scope="col">Daily arc</th>
              <th scope="col">Sect</th>
            </tr>
          </thead>
          <tbody>
            {above.map(row)}
            <tr className="horizon-row" aria-hidden="true">
              <td colSpan={5}>
                <span>Horizon</span>
              </td>
            </tr>
            {below.map(row)}
          </tbody>
        </table>
        <p className="side-note muted">
          Altitudes are measured from Earth’s centre without atmospheric refraction, so they line up exactly with the chart’s Ascendant and
          Midheaven. From the ground the Moon could look up to a degree lower. Sect, halb, combustion and the other traditional ideas here come from
          Hellenistic and medieval astrology.
        </p>
      </div>
    </div>
  )
}
