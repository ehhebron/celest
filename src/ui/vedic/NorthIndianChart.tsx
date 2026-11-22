import type { KeyboardEvent } from 'react'
import { GRAHA_NAME, signOfHouse, type GrahaId, type VedicChart } from '../../astro/vedic/vedic'
import { ordinal } from '../../interpret/describe'
import { BHAVA_TEXT, DIGNITY_LABEL } from '../../interpret/vedicTexts'
import type { VedicSelection } from './selection'

interface Props {
  vedic: VedicChart
  selected: VedicSelection | null
  focus: VedicSelection | null
  onSelect: (s: VedicSelection | null) => void
  onHover: (s: VedicSelection | null) => void
}

const S = 600
const P = (x: number, y: number) => ({ x: x * S, y: y * S })
const TL = P(0, 0), TR = P(1, 0), BR = P(1, 1), BL = P(0, 1)
const T = P(0.5, 0), R = P(1, 0.5), B = P(0.5, 1), L = P(0, 0.5), C = P(0.5, 0.5)
const Q1 = P(0.25, 0.25), Q2 = P(0.75, 0.25), Q3 = P(0.75, 0.75), Q4 = P(0.25, 0.75)

/** The 12 houses of the North Indian chart, counter-clockwise from the top diamond. */
const HOUSES = [
  [T, Q2, C, Q1],
  [TL, T, Q1],
  [TL, Q1, L],
  [L, Q1, C, Q4],
  [L, Q4, BL],
  [BL, Q4, B],
  [B, Q4, C, Q3],
  [B, Q3, BR],
  [BR, Q3, R],
  [R, Q3, C, Q2],
  [R, Q2, TR],
  [TR, Q2, T],
]

const centroid = (pts: { x: number; y: number }[]) => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
})
const toPath = (pts: { x: number; y: number }[]) => `M${pts.map((p) => `${p.x} ${p.y}`).join('L')}Z`

/** Where a house's sign number goes: toward the vertex nearest the chart's centre. */
function numberAt(pts: { x: number; y: number }[]) {
  const c = centroid(pts)
  const inner = [...pts].sort((a, b) => Math.hypot(a.x - C.x, a.y - C.y) - Math.hypot(b.x - C.x, b.y - C.y))[0]
  const k = pts.length === 4 ? 0.62 : 0.68
  return { x: c.x + (inner.x - c.x) * k, y: c.y + (inner.y - c.y) * k }
}

/** The narrow left and right triangles (houses 3, 5, 9, 11) have little width near the chart's edge. */
const isSideTriangle = (pts: { x: number; y: number }[]) => pts.length === 3 && pts.filter((p) => p.x === 0 || p.x === S).length >= 2

/** Where a house's planets go: its centroid, nudged away from the sign number. */
function labelsAt(pts: { x: number; y: number }[]) {
  const c = centroid(pts)
  const n = numberAt(pts)
  // Side triangles: lean toward the interior, where they are widest. Elsewhere: step away from the sign number.
  if (isSideTriangle(pts)) return { x: c.x + (n.x - c.x) * 0.2, y: c.y }
  return { x: c.x - (n.x - c.x) * 0.25, y: c.y - (n.y - c.y) * 0.25 }
}

function keyActivate(fn: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }
}

export function NorthIndianChart({ vedic, selected, focus, onSelect, onHover }: Props) {
  const same = (a: VedicSelection | null, b: VedicSelection) => JSON.stringify(a) === JSON.stringify(b)
  const focusGraha = focus?.kind === 'graha' ? vedic.grahas.find((g) => g.id === focus.id) : null
  const aspected = new Set(focusGraha?.aspectsHouses ?? [])
  const focusHouse = focus?.kind === 'house' ? focus.n : focusGraha?.house ?? (focus?.kind === 'lagna' ? 1 : null)

  return (
    <svg
      className={`north-chart${focus ? ' is-focusing' : ''}`}
      viewBox={`-4 -4 ${S + 8} ${S + 8}`}
      role="group"
      aria-label={`North Indian chart. ${vedic.fromMoon ? 'Houses counted from the Moon, as the birth time is unknown.' : ''} Tab through the houses and planets.`}
      onClick={() => onSelect(null)}
    >
      {HOUSES.map((pts, i) => {
        const house = i + 1
        const sign = signOfHouse(house, vedic.firstHouseSign)
        const sel: VedicSelection = { kind: 'house', n: house }
        const here = vedic.grahas.filter((g) => g.house === house).sort((a, b) => a.degInSign - b.degInSign)
        const num = numberAt(pts)
        const at = labelsAt(pts)
        const rows: { key: string; text: string; id?: GrahaId; title?: string; cls: string }[] = []
        if (house === 1 && vedic.lagna) rows.push({ key: 'as', text: `As ${Math.floor(vedic.lagna.degInSign)}°`, cls: 'lagna-mark' })
        for (const g of here) {
          const flags = `${g.retrograde && g.id !== 'rahu' && g.id !== 'ketu' ? 'ʀ' : ''}${g.dignity === 'exalted' ? '↑' : g.dignity === 'debilitated' ? '↓' : ''}${g.combust ? 'ᶜ' : ''}`
          rows.push({
            key: g.id,
            id: g.id,
            text: `${GRAHA_NAME[g.id].abbr} ${g.approximate ? '~' : ''}${Math.floor(g.degInSign)}°${flags ? ` ${flags}` : ''}`,
            title: `${GRAHA_NAME[g.id].name}${g.dignity !== 'neutral' ? `, ${DIGNITY_LABEL[g.dignity].toLowerCase()}` : ''}${g.retrograde && g.id !== 'rahu' && g.id !== 'ketu' ? ', retrograde' : ''}${g.combust ? ', combust' : ''}`,
            cls: `graha-label${g.dignity === 'exalted' ? ' is-exalted' : g.dignity === 'debilitated' ? ' is-debilitated' : ''}`,
          })
        }
        const crowded = rows.length > (pts.length === 4 ? 4 : isSideTriangle(pts) ? 2 : 3)
        const lh = crowded ? 19 : 23
        const y0 = at.y - ((rows.length - 1) * lh) / 2
        return (
          <g
            key={house}
            className={`nh-house${focusHouse === house ? ' is-lit' : ''}${aspected.has(house) ? ' is-aspected' : ''}${same(selected, sel) ? ' is-selected' : ''}`}
          >
            <path
              className="nh-cell"
              d={toPath(pts)}
              tabIndex={0}
              role="button"
              aria-label={`${ordinal(house)} house, ${BHAVA_TEXT[house - 1].area}: sign ${sign + 1}${here.length ? `, with ${here.map((g) => GRAHA_NAME[g.id].name).join(', ')}` : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(sel)
              }}
              onKeyDown={keyActivate(() => onSelect(sel))}
              onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(sel)}
              onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
              onFocus={() => onHover(sel)}
              onBlur={() => onHover(null)}
            />
            <text className="nh-sign" x={num.x} y={num.y} dy="0.35em" aria-hidden="true">
              {sign + 1}
            </text>
            {rows.map((r, k) => {
              const y = y0 + k * lh
              if (!r.id) {
                return (
                  <text key={r.key} className={r.cls} x={at.x} y={y} dy="0.35em" aria-hidden="true">
                    {r.text}
                  </text>
                )
              }
              const gsel: VedicSelection = { kind: 'graha', id: r.id }
              return (
                <text
                  key={r.key}
                  className={`${r.cls}${crowded ? ' is-small' : ''}${same(selected, gsel) ? ' is-selected' : ''}${focusGraha?.id === r.id ? ' is-focus' : ''}`}
                  x={at.x}
                  y={y}
                  dy="0.35em"
                  tabIndex={0}
                  role="button"
                  aria-label={r.title}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(gsel)
                  }}
                  onKeyDown={keyActivate(() => onSelect(gsel))}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(gsel)}
                  onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
                  onFocus={() => onHover(gsel)}
                  onBlur={() => onHover(null)}
                >
                  <title>{r.title}</title>
                  {r.text}
                </text>
              )
            })}
          </g>
        )
      })}
      <path className="nh-lines" d={`M0 0H${S}V${S}H0Z M0 0L${S} ${S} M${S} 0L0 ${S} M${T.x} ${T.y}L${R.x} ${R.y}L${B.x} ${B.y}L${L.x} ${L.y}Z`} />
    </svg>
  )
}
