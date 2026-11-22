import { ASPECT_BY_TYPE } from '../../astro/aspects'
import type { Chart } from '../../astro/chart'
import { SIGNS, type Element } from '../../astro/zodiac'
import { bigThree } from '../../interpret/describe'
import { ELEMENT_TEXT } from '../../interpret/texts'
import { BODY_GLYPHS, SIGN_GLYPHS } from '../glyphs'

export const CARD_W = 1080
export const CARD_H = 1920

const COLORS = {
  ink: '#eee5cd',
  soft: '#c9c0a8',
  muted: '#8d8a80',
  gold: '#cfae6a',
  goldBright: '#ead39a',
  harmonious: '#88c2cc',
  challenging: '#e2896f',
  conjunction: '#e5c77f',
  fire: '#e2896f',
  earth: '#b9b27a',
  air: '#a9c3e0',
  water: '#79aebd',
}
const SERIF = '"Cormorant Garamond Variable", "Cormorant Garamond", Georgia, serif'
const SANS = '"Inter Variable", Inter, system-ui, sans-serif'

/** Deterministic PRNG seeded from the chart so every card is unique but stable. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function chartSeed(chart: Chart): number {
  let h = 2166136261
  for (const b of chart.bodies) {
    h ^= Math.round(b.lon * 1000)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function drawGlyph(ctx: CanvasRenderingContext2D, d: string, x: number, y: number, size: number, color: string, width = 1.5) {
  ctx.save()
  ctx.translate(x - size / 2, y - size / 2)
  const s = size / 24
  ctx.scale(s, s)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(new Path2D(d))
  ctx.restore()
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  // Letter-spaced, centred text (canvas letterSpacing isn't universal yet).
  const chars = [...text]
  const widths = chars.map((c) => ctx.measureText(c).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)
  let cx = x - total / 2
  ctx.textAlign = 'left'
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y)
    cx += widths[i] + spacing
  })
  ctx.textAlign = 'center'
}

export async function ensureFonts() {
  if (!('fonts' in document)) return
  await Promise.all([
    document.fonts.load(`400 80px ${SERIF}`),
    document.fonts.load(`italic 400 40px ${SERIF}`),
    document.fonts.load(`500 28px ${SANS}`),
  ]).catch(() => undefined)
}

export function renderCard(canvas: HTMLCanvasElement, chart: Chart) {
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')!
  const rand = mulberry32(chartSeed(chart))
  const asc = chart.angles?.asc ?? 0
  const sun = chart.bodies.find((b) => b.id === 'sun')!

  // Background: palette leans toward the dominant element.
  const el = chart.balance.elements
  const top = (Object.keys(el) as Element[]).reduce((a, b) => (el[b] > el[a] ? b : a))
  const tint: Record<Element, string> = { fire: '#2a1424', earth: '#17201a', air: '#141d33', water: '#0c2030' }
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H)
  bg.addColorStop(0, '#050913')
  bg.addColorStop(0.45, tint[top])
  bg.addColorStop(1, '#04070f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Star field
  for (let i = 0; i < 520; i++) {
    const x = rand() * CARD_W
    const y = rand() * CARD_H
    const r = Math.pow(rand(), 3) * 2.2 + 0.3
    ctx.globalAlpha = 0.25 + rand() * 0.6
    ctx.fillStyle = rand() > 0.85 ? COLORS.goldBright : '#dfe6ff'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    if (r > 2) {
      ctx.strokeStyle = ctx.fillStyle
      ctx.lineWidth = 0.8
      ctx.globalAlpha *= 0.6
      ctx.beginPath()
      ctx.moveTo(x - r * 4, y)
      ctx.lineTo(x + r * 4, y)
      ctx.moveTo(x, y - r * 4)
      ctx.lineTo(x, y + r * 4)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1

  // Header
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = COLORS.gold
  ctx.font = `500 22px ${SANS}`
  spaced(ctx, 'CELEST · COSMIC PROFILE', CARD_W / 2, 150, 7)
  ctx.fillStyle = COLORS.ink
  const name = chart.input.name || `${sun.sign.name} Sun`
  let size = 116
  ctx.font = `400 ${size}px ${SERIF}`
  while (ctx.measureText(name).width > CARD_W - 160 && size > 60) {
    size -= 4
    ctx.font = `400 ${size}px ${SERIF}`
  }
  ctx.fillText(name, CARD_W / 2, 275)
  const [y, m, d] = chart.input.date.split('-').map(Number)
  const dateStr = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  ctx.font = `italic 400 38px ${SERIF}`
  ctx.fillStyle = COLORS.soft
  ctx.fillText(`${dateStr} · ${chart.input.place.name}`, CARD_W / 2, 335)

  // ——— Mini chart ———
  const cx = CARD_W / 2
  const cy = 800
  const R = 360
  const ang = (lon: number) => ((180 + lon - asc) * Math.PI) / 180
  const pt = (r: number, lon: number) => ({ x: cx + r * Math.cos(ang(lon)), y: cy - r * Math.sin(ang(lon)) })

  // Halo
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25)
  halo.addColorStop(0, 'rgba(60, 80, 150, 0.35)')
  halo.addColorStop(0.6, 'rgba(30, 40, 90, 0.12)')
  halo.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2)
  ctx.fill()

  // Rays: one per planet, length from its traditional weight — the card's signature.
  for (const b of chart.bodies) {
    const p1 = pt(R * 0.62, b.lon)
    const p2 = pt(R * (1.12 + rand() * 0.18), b.lon)
    const g = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y)
    g.addColorStop(0, 'rgba(234, 211, 154, 0.0)')
    g.addColorStop(0.5, 'rgba(234, 211, 154, 0.25)')
    g.addColorStop(1, 'rgba(234, 211, 154, 0)')
    ctx.strokeStyle = g
    ctx.lineWidth = b.id === 'sun' || b.id === 'moon' ? 2.4 : 1.2
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()
  }

  // Rings
  ctx.strokeStyle = COLORS.gold
  for (const [r, a, w] of [
    [R, 0.8, 1.6],
    [R - 7, 0.35, 0.8],
    [R * 0.8, 0.7, 1.2],
    [R * 0.56, 0.6, 1.1],
  ] as const) {
    ctx.globalAlpha = a
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // Sign dividers and glyphs
  SIGNS.forEach((s, i) => {
    const a = pt(R * 0.8, i * 30)
    const b = pt(R, i * 30)
    ctx.strokeStyle = COLORS.gold
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    ctx.globalAlpha = 0.9
    const g = pt(R * 0.9, i * 30 + 15)
    const col = COLORS[s.element]
    drawGlyph(ctx, SIGN_GLYPHS[s.id], g.x, g.y, 34, col, 1.5)
  })
  ctx.globalAlpha = 1

  // Aspect web
  const lonOf: Record<string, number> = Object.fromEntries(chart.bodies.map((b) => [b.id, b.lon]))
  if (chart.angles) Object.assign(lonOf, { asc: chart.angles.asc, mc: chart.angles.mc })
  ctx.save()
  ctx.shadowBlur = 14
  for (const a of chart.aspects) {
    if (a.type === 'conjunction') continue
    const la = lonOf[a.a]
    const lb = lonOf[a.b]
    if (la === undefined || lb === undefined) continue
    const nature = ASPECT_BY_TYPE[a.type].nature
    const col = nature === 'harmonious' ? COLORS.harmonious : COLORS.challenging
    const p1 = pt(R * 0.56, la)
    const p2 = pt(R * 0.56, lb)
    ctx.strokeStyle = col
    ctx.shadowColor = col
    ctx.globalAlpha = 0.35 + 0.6 * a.exactness
    ctx.lineWidth = 1 + 3 * a.exactness
    // Same textures as the wheel: harmonious solid, challenging dashed.
    ctx.setLineDash(nature === 'harmonious' ? [] : [16, 10])
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.restore()

  // Planets: dot on the inner ring, glyph further out, fanned when clustered.
  const order = [...chart.bodies].sort((a, b) => a.lon - b.lon)
  const disp: Record<string, number> = {}
  {
    const minSep = 9
    const items = order.map((b) => ({ id: b.id, lon: b.lon }))
    // Simple relaxation (the card is static; good enough and deterministic).
    const pos = items.map((i) => i.lon)
    for (let it = 0; it < 80; it++) {
      for (let i = 0; i < pos.length; i++) {
        const j = (i + 1) % pos.length
        let gap = pos[j] - pos[i]
        if (j === 0) gap += 360
        if (gap < minSep) {
          const push = (minSep - gap) / 2
          pos[i] -= push
          pos[j] += push
        }
      }
    }
    items.forEach((it, i) => (disp[it.id] = pos[i]))
  }
  for (const b of order) {
    const dot = pt(R * 0.56, b.lon)
    ctx.fillStyle = COLORS.goldBright
    ctx.shadowColor = COLORS.goldBright
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(dot.x, dot.y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    const g = pt(R * 0.68, disp[b.id])
    drawGlyph(ctx, BODY_GLYPHS[b.id], g.x, g.y, 34, COLORS.ink, 1.5)
  }
  ctx.fillStyle = COLORS.goldBright
  ctx.beginPath()
  ctx.arc(cx, cy, 4, 0, Math.PI * 2)
  ctx.fill()

  // ——— Big Three ———
  const b3 = bigThree(chart)
  const cols = [
    { label: 'SUN', sign: b3.sun.sign, glyph: BODY_GLYPHS.sun, signId: b3.sun.signId },
    { label: b3.moon.approximate ? 'MOON ~' : 'MOON', sign: b3.moon.sign, glyph: BODY_GLYPHS.moon, signId: b3.moon.signId },
    { label: 'RISING', sign: b3.rising?.sign ?? 'Unknown', glyph: null, signId: b3.rising?.signId ?? null },
  ]
  const y0 = 1300
  ctx.strokeStyle = COLORS.gold
  ctx.globalAlpha = 0.35
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(120, y0 - 80)
  ctx.lineTo(CARD_W - 120, y0 - 80)
  ctx.moveTo(120, y0 + 150)
  ctx.lineTo(CARD_W - 120, y0 + 150)
  ctx.stroke()
  ctx.globalAlpha = 1
  cols.forEach((c, i) => {
    const x = 220 + i * 320
    if (c.glyph) drawGlyph(ctx, c.glyph, x, y0 - 22, 40, COLORS.goldBright, 1.4)
    else {
      ctx.fillStyle = COLORS.goldBright
      ctx.font = `600 26px ${SANS}`
      spaced(ctx, 'AC', x, y0 - 12, 3)
    }
    ctx.fillStyle = COLORS.muted
    ctx.font = `500 20px ${SANS}`
    spaced(ctx, c.label, x, y0 + 32, 6)
    ctx.fillStyle = COLORS.ink
    ctx.font = `400 58px ${SERIF}`
    ctx.fillText(c.sign, x, y0 + 100)
    if (i > 0) {
      ctx.strokeStyle = COLORS.gold
      ctx.globalAlpha = 0.25
      ctx.beginPath()
      ctx.moveTo(x - 160, y0 - 50)
      ctx.lineTo(x - 160, y0 + 120)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  })

  // ——— Element balance ———
  const total = Object.values(el).reduce((a, b) => a + b, 0) || 1
  const order4: Element[] = ['fire', 'earth', 'air', 'water']
  const by = 1580
  ctx.fillStyle = COLORS.muted
  ctx.font = `500 20px ${SANS}`
  spaced(ctx, 'ELEMENTAL BALANCE', CARD_W / 2, by - 50, 6)
  const barX = 170
  const barW = CARD_W - 340
  let x = barX
  order4.forEach((e) => {
    const w = (el[e] / total) * barW
    ctx.fillStyle = COLORS[e]
    ctx.globalAlpha = 0.85
    ctx.beginPath()
    ctx.roundRect(x + 2, by - 9, Math.max(0, w - 4), 18, 9)
    ctx.fill()
    ctx.globalAlpha = 1
    if (w > 90) {
      ctx.fillStyle = COLORS.soft
      ctx.font = `400 30px ${SERIF}`
      ctx.fillText(`${ELEMENT_TEXT[e].label} ${Math.round((el[e] / total) * 100)}%`, x + w / 2, by + 56)
    }
    x += w
  })

  // Footer
  ctx.fillStyle = COLORS.gold
  ctx.font = `italic 400 34px ${SERIF}`
  ctx.fillText(`Mostly ${ELEMENT_TEXT[top].label.toLowerCase()}: ${ELEMENT_TEXT[top].about.toLowerCase()}`, CARD_W / 2, 1750)
  ctx.fillStyle = COLORS.muted
  ctx.font = `500 18px ${SANS}`
  spaced(ctx, 'DRAWN FROM THE SKY BY CELEST', CARD_W / 2, 1840, 5)
}

export function cardBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'),
  )
}
