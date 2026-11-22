import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Chart } from '../../astro/chart'
import { formatOffset } from '../../astro/time'
import { formatClock, formatDate } from '../format'
import { BODY_GLYPHS } from '../glyphs'
import { prefersReducedMotion } from '../hooks'
import { altAz, buildSky, compass, moonPhaseName, starColor, type Hor, type SkyData, type SkyModel } from './skyModel'
import './sky.css'

interface Props {
  chart: Chart
  onClose: () => void
}

const D = Math.PI / 180

let cache: Promise<SkyData> | null = null
function loadSky(): Promise<SkyData> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/sky.json`).then((r) => {
    if (!r.ok) throw new Error('sky data')
    return r.json()
  })
  cache.catch(() => (cache = null))
  return cache
}

interface View {
  az: number
  alt: number
  fov: number
}

export default function SkyView({ chart, onClose }: Props) {
  const [data, setData] = useState<SkyData | null>(null)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [lines, setLines] = useState(false)
  const [names, setNames] = useState(true)
  const [daylight, setDaylight] = useState(true)
  const [closing, setClosing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View>({ az: chart.input.place.lat >= 0 ? 180 : 0, alt: 35, fov: 100 })
  const raf = useRef(0)

  useEffect(() => {
    let alive = true
    loadSky()
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [retry])

  const model: SkyModel | null = useMemo(
    () => (data ? buildSky(data, chart.utc, chart.input.place.lat, chart.input.place.lon) : null),
    [data, chart],
  )

  // Start looking toward the Moon if it's up, otherwise toward the brightest visible planet.
  useEffect(() => {
    if (!model) return
    const targets = [model.moon.hor, ...model.bodies.filter((b) => b.mag < 1).map((b) => b.hor)]
    const up = targets.find((h) => h[2] > 0.1)
    if (up) {
      const { az, alt } = altAz(up)
      viewRef.current = { ...viewRef.current, az, alt: Math.min(55, Math.max(20, alt)) }
    }
  }, [model])

  const close = useCallback(() => {
    if (prefersReducedMotion()) onClose()
    else setClosing(true)
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    rootRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !model) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawSky(ctx, w, h, model, viewRef.current, { lines, names, daylight, chart })
  }, [model, lines, names, daylight, chart])

  const schedule = useCallback(() => {
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(draw)
  }, [draw])

  useEffect(() => {
    schedule()
    const ro = new ResizeObserver(schedule)
    if (canvasRef.current) ro.observe(canvasRef.current)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf.current)
    }
  }, [schedule])

  // Drag to look around, wheel / pinch to zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<number | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const v = viewRef.current
    const canvas = canvasRef.current!
    if (pointers.current.size === 2) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch.current) v.fov = clampFov(v.fov * (pinch.current / dist))
      pinch.current = dist
    } else {
      const degPerPx = v.fov / canvas.clientWidth
      v.az = (v.az - (e.clientX - prev.x) * degPerPx + 360) % 360
      v.alt = Math.max(-5, Math.min(85, v.alt + (e.clientY - prev.y) * degPerPx))
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    schedule()
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }
  const onWheel = (e: React.WheelEvent) => {
    viewRef.current.fov = clampFov(viewRef.current.fov * (1 + e.deltaY * 0.0012))
    schedule()
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    const v = viewRef.current
    const step = 5
    const map: Record<string, () => void> = {
      ArrowLeft: () => (v.az = (v.az - step + 360) % 360),
      ArrowRight: () => (v.az = (v.az + step) % 360),
      ArrowUp: () => (v.alt = Math.min(85, v.alt + step)),
      ArrowDown: () => (v.alt = Math.max(-5, v.alt - step)),
      '+': () => (v.fov = clampFov(v.fov * 0.9)),
      '=': () => (v.fov = clampFov(v.fov * 0.9)),
      '-': () => (v.fov = clampFov(v.fov * 1.1)),
    }
    if (map[e.key]) {
      e.preventDefault()
      map[e.key]()
      schedule()
    }
  }

  const summary = model ? describeSky(model, chart) : 'Loading the sky.'
  const when = `${formatDate(chart.input.date)}${chart.input.time ? `, ${formatClock(chart.input.time)}` : ''}`

  return (
    <div
      ref={rootRef}
      className={`sky theme-dark${closing ? ' is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sky-h"
      tabIndex={-1}
      onAnimationEnd={(e) => {
        if (closing && e.target === rootRef.current) onClose()
      }}
    >
      <canvas
        ref={canvasRef}
        className="sky-canvas"
        role="img"
        aria-label={summary}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      />
      <header className="sky-head">
        <div>
          <p className="eyebrow">Birth sky</p>
          <h2 id="sky-h">
            Above {chart.input.place.name}
          </h2>
          <p className="sky-when">
            {when}
            {chart.timeKnown ? ` · ${formatOffset(chart.offsetMinutes)}` : ' · birth time unknown, shown at noon'}
          </p>
        </div>
        <button type="button" className="btn btn-icon sky-close" onClick={close} aria-label="Back to chart">
          <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      {!model && !error && (
        <div className="sky-state" role="status">
          <span className="orbit-loader" aria-hidden="true" />
          Charting the stars…
        </div>
      )}
      {error && (
        <div className="sky-state" role="alert">
          <p>The star catalogue didn’t load.</p>
          <button type="button" className="btn" onClick={() => { setError(false); setRetry((n) => n + 1) }}>
            Try again
          </button>
        </div>
      )}

      {model && (
        <footer className="sky-foot">
          {model.sunAltitude > -6 && (
            <p className="sky-note">
              {daylight
                ? `${model.sunAltitude > 0 ? 'The Sun was up' : 'It was twilight'}, so daylight hid these stars. They were still there.`
                : 'Daylight removed: the stars exactly as they stood behind the bright sky.'}
            </p>
          )}
          <div className="sky-controls">
            {model.sunAltitude > -6 && (
              <button type="button" className={`btn${!daylight ? ' is-active' : ''}`} aria-pressed={!daylight} onClick={() => setDaylight((v) => !v)}>
                Show stars
              </button>
            )}
            <button type="button" className={`btn${lines ? ' is-active' : ''}`} aria-pressed={lines} onClick={() => setLines((v) => !v)}>
              Constellation lines
            </button>
            <button type="button" className={`btn${names ? ' is-active' : ''}`} aria-pressed={names} onClick={() => setNames((v) => !v)}>
              Labels
            </button>
          </div>
          <p className="sky-hint">Drag to look around · scroll or pinch to zoom · arrow keys work too</p>
          <p className="sky-credit">{data?.attribution}</p>
        </footer>
      )}
    </div>
  )
}

function clampFov(f: number) {
  return Math.max(35, Math.min(150, f))
}

function describeSky(model: SkyModel, chart: Chart): string {
  const moon = altAz(model.moon.hor)
  const sunLon = chart.bodies.find((b) => b.id === 'sun')!.lon
  const moonLon = chart.bodies.find((b) => b.id === 'moon')!.lon
  const waxing = (moonLon - sunLon + 360) % 360 < 180
  const parts = [`The sky above ${chart.input.place.name} at the birth moment.`]
  const phase = moonPhaseName(model.moon.fraction, waxing)
  parts.push(
    moon.alt > 0
      ? `A ${phase}, ${Math.round(model.moon.fraction * 100)}% lit, ${Math.round(moon.alt)}° up in the ${compass(moon.az)}.`
      : `The Moon (${phase}) was below the horizon.`,
  )
  const up = model.bodies.filter((b) => b.hor[2] > 0).map((b) => `${b.name} in the ${compass(altAz(b.hor).az)}`)
  if (up.length) parts.push(`Above the horizon: ${up.join(', ')}.`)
  parts.push(model.sunAltitude > 0 ? 'The Sun was up.' : 'It was night.')
  return parts.join(' ')
}

// ——— Rendering ———

function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  m: SkyModel,
  view: View,
  opts: { lines: boolean; names: boolean; daylight: boolean; chart: Chart },
) {
  const az = view.az * D
  const alt = view.alt * D
  const f: Hor = [Math.cos(alt) * Math.cos(az), -Math.cos(alt) * Math.sin(az), Math.sin(alt)]
  const r: Hor = [-Math.sin(az), -Math.cos(az), 0]
  const u: Hor = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
  const scale = w / 2 / (2 * Math.tan((view.fov * D) / 4))
  const cx = w / 2
  const cy = h / 2
  const dot = (a: Hor, b: Hor) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const project = (v: Hor): { x: number; y: number; z: number } | null => {
    const z = dot(v, f)
    if (z < -0.2) return null
    const k = 2 / (1 + z)
    return { x: cx + scale * k * dot(v, r), y: cy - scale * k * dot(v, u), z }
  }
  const onScreen = (p: { x: number; y: number }, pad = 40) => p.x > -pad && p.x < w + pad && p.y > -pad && p.y < h + pad

  // Sky colour from the Sun's altitude.
  const sunAlt = m.sunAltitude
  const t = opts.daylight ? Math.max(0, Math.min(1, (sunAlt + 18) / 24)) : 0 // 0 = night, 1 = day
  const mix = (a: number[], b: number[]) => `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, mix([4, 7, 18], [38, 70, 120]))
  g.addColorStop(1, mix([12, 20, 44], [92, 128, 170]))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const starAlpha = 1 - t * 0.6

  // Constellation lines
  if (opts.lines) {
    ctx.strokeStyle = 'rgba(207, 174, 106, 0.38)'
    ctx.lineWidth = 0.9
    ctx.beginPath()
    for (const c of m.lines) {
      for (const seg of c.segs) {
        let prev: { x: number; y: number } | null = null
        for (const v of seg) {
          const p = project(v)
          if (p && prev && Math.hypot(p.x - prev.x, p.y - prev.y) < w) {
            ctx.moveTo(prev.x, prev.y)
            ctx.lineTo(p.x, p.y)
          }
          prev = p
        }
      }
    }
    ctx.stroke()
  }

  // Stars
  const zoomBoost = Math.sqrt(100 / view.fov)
  for (const s of m.stars) {
    const p = project(s.hor)
    if (!p || !onScreen(p, 4)) continue
    const radius = Math.max(0.6, (6 - s.mag) * 0.62) * zoomBoost
    const a = Math.min(1, 0.5 + (5.4 - s.mag) * 0.22) * starAlpha
    ctx.globalAlpha = a
    ctx.fillStyle = starColor(s.bv)
    ctx.beginPath()
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
    ctx.fill()
    if (s.mag < 1) {
      ctx.globalAlpha = a * 0.25
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius * 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
    if (opts.names && s.name && s.mag < 1.7) {
      ctx.globalAlpha = 0.7 * starAlpha
      ctx.fillStyle = '#c9c0a8'
      ctx.font = '11px "Inter Variable", Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(s.name, p.x + radius + 5, p.y + 4)
    }
  }
  ctx.globalAlpha = 1

  // Planets
  for (const b of m.bodies) {
    const p = project(b.hor)
    if (!p || !onScreen(p)) continue
    const radius = Math.max(1.6, (3 - b.mag) * 0.9) * zoomBoost
    ctx.fillStyle = '#fff4d6'
    ctx.shadowColor = '#ead39a'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    if (opts.names) {
      drawGlyph(ctx, BODY_GLYPHS[b.id], p.x + radius + 12, p.y - 10, 16, '#ead39a')
      ctx.fillStyle = '#ead39a'
      ctx.font = '500 12px "Inter Variable", Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(b.name, p.x + radius + 22, p.y - 6)
    }
  }

  // Sun
  const sp = project(m.sun)
  if (sp && onScreen(sp, 80)) {
    const sg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 60)
    sg.addColorStop(0, 'rgba(255, 244, 214, 0.95)')
    sg.addColorStop(0.2, 'rgba(255, 220, 150, 0.5)')
    sg.addColorStop(1, 'rgba(255, 200, 120, 0)')
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.arc(sp.x, sp.y, 60, 0, Math.PI * 2)
    ctx.fill()
    if (opts.names) label(ctx, 'Sun', sp.x + 16, sp.y + 30)
  }

  // Moon with its real phase, lit limb turned toward the Sun.
  const mp = project(m.moon.hor)
  if (mp && onScreen(mp)) {
    const rm = 13 * zoomBoost
    const mv = m.moon.hor
    const sv = m.sun
    const k = dot(sv, mv)
    const d: Hor = [sv[0] - k * mv[0], sv[1] - k * mv[1], sv[2] - k * mv[2]]
    const theta = Math.atan2(-dot(d, u), dot(d, r))
    const frac = m.moon.fraction
    ctx.save()
    ctx.translate(mp.x, mp.y)
    ctx.shadowColor = 'rgba(240, 235, 215, 0.6)'
    ctx.shadowBlur = 18 * frac
    ctx.fillStyle = '#1b2236'
    ctx.beginPath()
    ctx.arc(0, 0, rm, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.rotate(theta)
    ctx.fillStyle = '#f1ead2'
    ctx.beginPath()
    ctx.arc(0, 0, rm, -Math.PI / 2, Math.PI / 2, false)
    const rx = rm * Math.abs(1 - 2 * frac)
    ctx.ellipse(0, 0, rx, rm, 0, Math.PI / 2, -Math.PI / 2, frac < 0.5)
    ctx.fill()
    ctx.restore()
    if (opts.names) label(ctx, `Moon · ${Math.round(frac * 100)}%`, mp.x + rm + 8, mp.y + 4)
  }

  // Ground: the horizon is a circle under stereographic projection.
  const hp = [view.az - 90, view.az, view.az + 90].map((a) => project([Math.cos(a * D), -Math.sin(a * D), 0]))
  if (hp.every(Boolean)) {
    const [p1, p2, p3] = hp as { x: number; y: number }[]
    const circle = circleThrough(p1, p2, p3)
    ctx.save()
    ctx.beginPath()
    if (circle) {
      // The screen centre is the view direction; it's sky if we look above the horizon.
      const centreInside = Math.hypot(cx - circle.x, cy - circle.y) < circle.r
      const groundInside = f[2] >= 0 ? !centreInside : centreInside
      if (groundInside) ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2)
      else {
        ctx.rect(-10, -10, w + 20, h + 20)
        ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2, true)
      }
    } else {
      // Horizon projects to a straight line.
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p3.x, p3.y)
      ctx.lineTo(w + 10, h + 10)
      ctx.lineTo(-10, h + 10)
    }
    const gg = ctx.createLinearGradient(0, p2.y, 0, h)
    gg.addColorStop(0, 'rgba(10, 14, 22, 0.94)')
    gg.addColorStop(1, 'rgba(4, 6, 10, 0.98)')
    ctx.fillStyle = gg
    ctx.fill('evenodd')
    ctx.restore()
    // Horizon line
    ctx.strokeStyle = 'rgba(207, 174, 106, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    let first = true
    for (let a = 0; a <= 360; a += 2) {
      const p = project([Math.cos(a * D), -Math.sin(a * D), 0])
      if (!p) {
        first = true
        continue
      }
      if (first) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
      first = false
    }
    ctx.stroke()
  }

  // Cardinal points
  ctx.font = '600 13px "Inter Variable", Inter, sans-serif'
  ctx.textAlign = 'center'
  for (const [name, a] of [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]] as const) {
    const p = project([Math.cos(a * D), -Math.sin(a * D), 0])
    if (!p || !onScreen(p, 0)) continue
    ctx.fillStyle = name.length === 1 ? '#ead39a' : 'rgba(201, 192, 168, 0.6)'
    ctx.fillText(name, p.x, p.y + 22)
  }
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.fillStyle = '#eee5cd'
  ctx.font = '500 12px "Inter Variable", Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(text, x, y)
}

function drawGlyph(ctx: CanvasRenderingContext2D, d: string, x: number, y: number, size: number, color: string) {
  ctx.save()
  ctx.translate(x - size / 2, y - size / 2)
  ctx.scale(size / 24, size / 24)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.6
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(new Path2D(d))
  ctx.restore()
}

function circleThrough(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (Math.abs(d) < 1e-6) return null
  const a2 = a.x * a.x + a.y * a.y
  const b2 = b.x * b.x + b.y * b.y
  const c2 = c.x * c.x + c.y * c.y
  const x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d
  const y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d
  const r = Math.hypot(a.x - x, a.y - y)
  if (r > 1e6) return null
  return { x, y, r }
}
