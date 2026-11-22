import type { Mahadasha } from '../../astro/vedic/dasha'
import { aspectsOnHouse, GRAHA_NAME, houseLord, RASHIS, type GrahaId, type VedicChart } from '../../astro/vedic/vedic'
import type { Yoga } from '../../astro/vedic/yogas'
import { ordinal } from '../../interpret/describe'
import {
  bhavaReading,
  dashaReading,
  gname,
  grahaReading,
  lagnaReading,
  vedicSummary,
  yogaReading,
  type VedicReading,
} from '../../interpret/vedic'
import { BHAVA_TEXT, YOGA_TEXT } from '../../interpret/vedicTexts'
import { Glyph } from '../Glyph'
import type { VedicSelection } from './selection'

/** Planet glyph for a graha; Ketu is the node glyph turned upside down. */
export function GrahaGlyph({ id, size = 18 }: { id: GrahaId; size?: number }) {
  if (id === 'rahu') return <Glyph body="node" size={size} />
  if (id === 'ketu')
    return (
      <span className="ketu-glyph" style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
        <Glyph body="node" size={size} />
      </span>
    )
  return <Glyph body={id} size={size} />
}

interface Props {
  vedic: VedicChart
  dashas: Mahadasha[]
  yogas: Yoga[]
  current: { maha: Mahadasha; antar: Mahadasha['antardashas'][number] } | null
  selection: VedicSelection | null
  onSelect: (s: VedicSelection | null) => void
}

function Reading({ r, glyph }: { r: VedicReading; glyph: React.ReactNode }) {
  return (
    <>
      <header className="detail-head">
        <span className="detail-glyph">{glyph}</span>
        <div>
          <p className="eyebrow">{r.eyebrow}</p>
          <h2>{r.title}</h2>
          <p className="detail-pos">
            {r.subtitle}
            {r.chips.map((c) => (
              <span key={c} className={`rx-chip vedic-chip chip-${c.toLowerCase().replace(/\s+/g, '-')}`}>
                {c}
              </span>
            ))}
          </p>
        </div>
      </header>
      {r.keyword && <p className="keyword">{r.keyword}</p>}
      <div className="detail-body">
        {r.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </>
  )
}

function GrahaList({ ids, onSelect, empty }: { ids: GrahaId[]; onSelect: Props['onSelect']; empty: string }) {
  if (!ids.length) return <p className="muted small">{empty}</p>
  return (
    <ul className="point-list">
      {ids.map((id) => (
        <li key={id}>
          <button type="button" onClick={() => onSelect({ kind: 'graha', id })}>
            <GrahaGlyph id={id} size={16} /> {GRAHA_NAME[id].name}
          </button>
        </li>
      ))}
    </ul>
  )
}

export function VedicDetail({ vedic, dashas, yogas, current, selection, onSelect }: Props) {
  if (!selection) {
    return (
      <article className="detail overview">
        <p className="eyebrow">Jyotish · Lahiri ayanamsa {vedic.ayanamsa.toFixed(2)}°</p>
        <h2>Your Vedic chart</h2>
        <div className="detail-body">
          {vedicSummary(vedic, yogas, current).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <p className="muted small">
          Vedic astrology uses the sidereal zodiac, which sits about {Math.round(vedic.ayanamsa)}° behind the tropical zodiac of Western astrology, so
          your signs here may differ from your Western chart.
          {vedic.fromMoon ? ' Without a birth time, the houses are counted from the Moon’s sign (Chandra Lagna).' : ''}
        </p>
        {yogas.length > 0 && (
          <>
            <h3 className="eyebrow sub">Yogas in your chart</h3>
            <ul className="aspect-list">
              {yogas.map((y, i) => (
                <li key={`${y.id}-${i}`}>
                  <button type="button" onClick={() => onSelect({ kind: 'yoga', index: i })}>
                    <span className="asp-sym" aria-hidden="true">
                      ✦
                    </span>
                    <span className="asp-name">
                      {YOGA_TEXT[y.id].name}
                      {y.cancelled ? ' (cancelled)' : ''}
                    </span>
                    <span className="asp-orb">{y.grahas.map((g) => GRAHA_NAME[g].abbr).join(' ')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </article>
    )
  }

  switch (selection.kind) {
    case 'graha': {
      const g = vedic.grahas.find((x) => x.id === selection.id)!
      const aspectedGrahas = vedic.grahas.filter((x) => x.id !== g.id && g.aspectsHouses.includes(x.house)).map((x) => x.id)
      const aspectedBy = aspectsOnHouse(vedic, g.house).filter((id) => id !== g.id)
      return (
        <article className="detail" key={g.id}>
          <Reading r={grahaReading(vedic, g.id, yogas)} glyph={<GrahaGlyph id={g.id} size={34} />} />
          <h3 className="eyebrow sub">Drishti (aspects)</h3>
          <p className="muted small">
            {gname(g.id)} casts its glance on your {g.aspectsHouses.map((h) => `${ordinal(h)} (${BHAVA_TEXT[h - 1].area})`).join(', ')}.
          </p>
          <GrahaList ids={aspectedGrahas} onSelect={onSelect} empty="No planets sit in the houses it aspects." />
          <h3 className="eyebrow sub">Aspected by</h3>
          <GrahaList ids={aspectedBy} onSelect={onSelect} empty="No planets aspect its house." />
        </article>
      )
    }
    case 'house': {
      const n = selection.n
      const occupants = vedic.grahas.filter((g) => g.house === n).map((g) => g.id)
      const lord = houseLord(vedic, n)
      return (
        <article className="detail" key={`h${n}`}>
          <Reading r={bhavaReading(vedic, n)} glyph={<span className="house-glyph">{n}</span>} />
          <h3 className="eyebrow sub">Lord</h3>
          <GrahaList ids={[lord]} onSelect={onSelect} empty="" />
          <h3 className="eyebrow sub">Planets here</h3>
          <GrahaList ids={occupants} onSelect={onSelect} empty="No planets here. The house is read through its lord and the planets that aspect it." />
          <h3 className="eyebrow sub">Aspected by</h3>
          <GrahaList ids={aspectsOnHouse(vedic, n)} onSelect={onSelect} empty="No planets aspect this house." />
        </article>
      )
    }
    case 'lagna': {
      const r = lagnaReading(vedic)
      if (!r) return null
      return (
        <article className="detail" key="lagna">
          <Reading r={r} glyph={<span className="mini-angle big">As</span>} />
          <h3 className="eyebrow sub">Lagna lord</h3>
          <GrahaList ids={[RASHIS[vedic.lagna!.sign].lord as GrahaId]} onSelect={onSelect} empty="" />
        </article>
      )
    }
    case 'dasha': {
      const d = dashas[selection.index]
      const antar = current && current.maha === d ? current.antar : undefined
      return (
        <article className="detail" key={`d${selection.index}`}>
          <Reading r={dashaReading(vedic, d, antar)} glyph={<GrahaGlyph id={d.lord} size={34} />} />
          <h3 className="eyebrow sub">Sub-periods</h3>
          <ul className="aspect-list">
            {d.antardashas.map((a) => (
              <li key={a.lord}>
                <span className={`static${antar?.lord === a.lord ? ' is-now' : ''}`}>
                  <span className="asp-sym" aria-hidden="true">
                    <GrahaGlyph id={a.lord} size={14} />
                  </span>
                  <span className="asp-name">
                    {gname(d.lord)} / {gname(a.lord)}
                  </span>
                  <span className="asp-orb">
                    {a.start.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn" onClick={() => onSelect({ kind: 'graha', id: d.lord })}>
            <GrahaGlyph id={d.lord} size={16} /> {gname(d.lord)} in your chart
          </button>
        </article>
      )
    }
    case 'yoga': {
      const y = yogas[selection.index]
      return (
        <article className="detail" key={`y${selection.index}`}>
          <Reading r={yogaReading(y)} glyph={<span aria-hidden="true">✦</span>} />
          <div className="pair">
            {y.grahas.map((id) => (
              <button key={id} type="button" className="btn" onClick={() => onSelect({ kind: 'graha', id })}>
                <GrahaGlyph id={id} size={16} /> {gname(id)}
              </button>
            ))}
          </div>
        </article>
      )
    }
  }
}

