import type { Balance as BalanceData } from '../astro/chart'
import type { Element, Modality } from '../astro/zodiac'
import { ELEMENT_TEXT, MODALITY_TEXT } from '../interpret/texts'

const ELEMENTS: Element[] = ['fire', 'air', 'water', 'earth']
const MODALITIES: Modality[] = ['cardinal', 'fixed', 'mutable']

function shares<K extends string>(rec: Record<K, number>): Record<K, number> {
  const total = Object.values<number>(rec).reduce((a, b) => a + b, 0) || 1
  return Object.fromEntries(Object.entries<number>(rec).map(([k, v]) => [k, v / total])) as Record<K, number>
}

/** Four petals (one per element) sized by share, plus three modality bars. */
export function Balance({ balance }: { balance: BalanceData }) {
  const el = shares(balance.elements)
  const mo = shares(balance.modalities)
  const topEl = ELEMENTS.reduce((a, b) => (el[b] > el[a] ? b : a))
  const topMo = MODALITIES.reduce((a, b) => (mo[b] > mo[a] ? b : a))
  const lowEl = ELEMENTS.reduce((a, b) => (el[b] < el[a] ? b : a))

  // Petal angles: fire top, air right, water bottom, earth left.
  const angles: Record<Element, number> = { fire: -90, air: 0, water: 90, earth: 180 }
  const max = Math.max(...ELEMENTS.map((e) => el[e]))

  return (
    <section className="balance" aria-labelledby="balance-h">
      <h2 id="balance-h" className="eyebrow">Balance</h2>
      <div className="balance-body">
        <svg viewBox="-60 -60 120 120" className="rose" role="img" aria-label={`Elements: ${ELEMENTS.map((e) => `${ELEMENT_TEXT[e].label} ${Math.round(el[e] * 100)}%`).join(', ')}`}>
          <circle r="52" className="rose-ring" />
          <circle r="26" className="rose-ring faint" />
          <line x1="-56" y1="0" x2="56" y2="0" className="rose-ring faint" />
          <line x1="0" y1="-56" x2="0" y2="56" className="rose-ring faint" />
          {ELEMENTS.map((e) => {
            const len = 10 + 40 * Math.sqrt(el[e] / (max || 1))
            const w = 6 + 12 * (el[e] / (max || 1))
            return (
              <g key={e} transform={`rotate(${angles[e]})`} className={`petal el-${e}`}>
                <path d={`M0 0 C ${len * 0.35} ${-w}, ${len * 0.85} ${-w * 0.6}, ${len} 0 C ${len * 0.85} ${w * 0.6}, ${len * 0.35} ${w}, 0 0 Z`} />
              </g>
            )
          })}
          <circle r="2.2" className="rose-center" />
        </svg>
        <ul className="el-list">
          {ELEMENTS.map((e) => (
            <li key={e} className={`el-${e}${e === topEl ? ' is-top' : ''}`}>
              <span className="dot" aria-hidden="true" />
              <span className="el-name">{ELEMENT_TEXT[e].label}</span>
              <span className="el-pct">{Math.round(el[e] * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="modalities" role="img" aria-label={`Modalities: ${MODALITIES.map((m) => `${MODALITY_TEXT[m].label} ${Math.round(mo[m] * 100)}%`).join(', ')}`}>
        {MODALITIES.map((m) => (
          <div key={m} className={`mod${m === topMo ? ' is-top' : ''}`}>
            <span className="mod-name">{MODALITY_TEXT[m].label}</span>
            <span className="mod-bar">
              <span style={{ transform: `scaleX(${mo[m]})` }} />
            </span>
            <span className="mod-pct">{Math.round(mo[m] * 100)}%</span>
          </div>
        ))}
      </div>
      <p className="balance-note">
        Mostly <strong>{ELEMENT_TEXT[topEl].label.toLowerCase()}</strong> ({ELEMENT_TEXT[topEl].about.toLowerCase()}) and{' '}
        <strong>{MODALITY_TEXT[topMo].label.toLowerCase()}</strong> ({MODALITY_TEXT[topMo].about.toLowerCase()}).{' '}
        {el[lowEl] < 0.12 && <>Light on {ELEMENT_TEXT[lowEl].label.toLowerCase()}: {ELEMENT_TEXT[lowEl].about.toLowerCase()} may take more conscious effort.</>}
      </p>
    </section>
  )
}
