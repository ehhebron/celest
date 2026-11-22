import { ASPECT_BY_TYPE } from '../astro/aspects'
import type { Chart } from '../astro/chart'
import type { HorizonModel } from '../astro/horizon'
import { houseOf } from '../astro/houses'
import type { TransitAspect, TransitPosition } from '../astro/transits'
import { BODY_BY_ID, formatPosition, SIGNS, signOf, type BodyId } from '../astro/zodiac'
import {
  angleText,
  aspectOrbLabel,
  aspectText,
  aspectTitle,
  ordinal,
  placementKeyword,
  placementText,
  placementTitle,
  pointName,
} from '../interpret/describe'
import { ASPECT_TEXT, BODY_TEXT, ELEMENT_TEXT, HOUSE_TEXT, MODALITY_TEXT, SIGN_TEXT } from '../interpret/texts'
import { angleSkyReading, aspectSkyReading, bodySkyReading } from '../interpret/sky'
import { formatExact } from './format'
import { Glyph } from './Glyph'
import type { Selection } from './selection'
import { SkyDetail } from './side/SkyDetail'

interface Props {
  chart: Chart
  selection: Selection | null
  onSelect: (s: Selection | null) => void
  transits?: TransitPosition[] | null
  contacts?: TransitAspect[]
  transitDate?: Date
  /** Set while the side view is open: readings gain an "In the sky" section. */
  sky?: HorizonModel | null
}

const ASPECT_SYMBOL: Record<string, string> = {
  conjunction: '☌',
  sextile: '⚹',
  square: '□',
  trine: '△',
  opposition: '☍',
}

function PointGlyph({ id, size = 18 }: { id: string; size?: number }) {
  if (id === 'asc' || id === 'mc') return <span className="mini-angle">{id === 'asc' ? 'AC' : 'MC'}</span>
  return <Glyph body={id as BodyId} size={size} />
}

export function DetailPanel({ chart, selection, onSelect, transits, contacts = [], transitDate, sky }: Props) {
  if (!selection) return <Overview chart={chart} onSelect={onSelect} sky={!!sky} />

  const aspectList = (id: string) => {
    const list = chart.aspects.filter((a) => a.a === id || a.b === id)
    if (!list.length) return <p className="muted small">No major aspects within orb.</p>
    return (
      <ul className="aspect-list">
        {list.map((a) => {
          const other = a.a === id ? a.b : a.a
          return (
            <li key={`${a.a}-${a.b}`}>
              <button type="button" onClick={() => onSelect({ kind: 'aspect', a: a.a, b: a.b })}>
                <span className={`asp-sym nature-${ASPECT_BY_TYPE[a.type].nature}`} aria-hidden="true">
                  {ASPECT_SYMBOL[a.type]}
                </span>
                <span className="asp-name">
                  {ASPECT_BY_TYPE[a.type].name} <PointGlyph id={other} size={15} /> {pointName(other)}
                </span>
                <span className="asp-orb">{a.orb.toFixed(1)}°</span>
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  switch (selection.kind) {
    case 'body': {
      const p = chart.bodies.find((b) => b.id === selection.id)
      if (!p) return null
      return (
        <article className="detail" key={p.id}>
          <header className="detail-head">
            <span className="detail-glyph">
              <Glyph body={p.id} size={34} strokeWidth={1.3} />
            </span>
            <div>
              <p className="eyebrow">{BODY_TEXT[p.id].role}</p>
              <h2>{placementTitle(p)}</h2>
              <p className="detail-pos">
                {formatPosition(p.lon, { approx: p.approximate })}
                {p.retrograde && <span className="rx-chip">Retrograde</span>}
              </p>
            </div>
          </header>
          <p className="keyword">{placementKeyword(p)}</p>
          <div className="detail-body">
            {placementText(p).map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
          {sky && (() => {
            const r = bodySkyReading(sky, p.id)
            return r && <SkyDetail reading={r} />
          })()}
          <h3 className="eyebrow sub">Aspects</h3>
          {aspectList(p.id)}
        </article>
      )
    }
    case 'angle': {
      const lon = chart.angles?.[selection.id]
      if (lon === undefined) return null
      const t = angleText(selection.id, lon)
      return (
        <article className="detail" key={selection.id}>
          <header className="detail-head">
            <span className="detail-glyph mini-angle big">{selection.id === 'asc' ? 'AC' : 'MC'}</span>
            <div>
              <p className="eyebrow">{selection.id === 'asc' ? 'Rising sign' : 'Public direction'}</p>
              <h2>{t.title}</h2>
              <p className="detail-pos">{formatPosition(lon)}</p>
            </div>
          </header>
          <div className="detail-body">
            {t.body.map((x, i) => (
              <p key={i}>{x}</p>
            ))}
          </div>
          {sky && (() => {
            const r = angleSkyReading(chart, sky, selection.id)
            return r && <SkyDetail reading={r} />
          })()}
          <h3 className="eyebrow sub">Aspects</h3>
          {aspectList(selection.id)}
        </article>
      )
    }
    case 'sign': {
      const s = SIGNS.find((x) => x.id === selection.id)!
      const inSign = chart.bodies.filter((b) => b.sign.id === s.id)
      // House holding the middle of this sign (exact for Whole Sign; indicative for Placidus).
      const house = chart.cusps ? houseOf(SIGNS.indexOf(s) * 30 + 15, chart.cusps) : null
      return (
        <article className="detail" key={s.id}>
          <header className="detail-head">
            <span className="detail-glyph">
              <Glyph sign={s.id} size={34} strokeWidth={1.3} />
            </span>
            <div>
              <p className="eyebrow">
                {ELEMENT_TEXT[s.element].label} · {MODALITY_TEXT[s.modality].label}
              </p>
              <h2>{s.name}</h2>
              {house ? <p className="detail-pos">Your {ordinal(house)} house</p> : null}
            </div>
          </header>
          <p className="keyword">{SIGN_TEXT[s.id].adjective}</p>
          <div className="detail-body">
            <p>{SIGN_TEXT[s.id].about}</p>
          </div>
          <h3 className="eyebrow sub">In your chart</h3>
          {inSign.length ? (
            <ul className="point-list">
              {inSign.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => onSelect({ kind: 'body', id: b.id })}>
                    <Glyph body={b.id} size={16} /> {BODY_BY_ID[b.id].name}
                    <span className="muted">{formatPosition(b.lon, { approx: b.approximate })}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">No planets in {s.name}. Its themes still colour the house it rules in your chart.</p>
          )}
        </article>
      )
    }
    case 'house': {
      const n = selection.n
      const cusp = chart.cusps?.[n - 1]
      const inHouse = chart.bodies.filter((b) => b.house === n)
      return (
        <article className="detail" key={`h${n}`}>
          <header className="detail-head">
            <span className="detail-glyph house-glyph">{n}</span>
            <div>
              <p className="eyebrow">{chart.houseSystem === 'placidus' ? 'Placidus house' : 'Whole Sign house'}</p>
              <h2>{ordinal(n)} House</h2>
              {cusp !== undefined && <p className="detail-pos">Begins at {formatPosition(cusp)}</p>}
            </div>
          </header>
          <p className="keyword">{HOUSE_TEXT[n - 1].area}</p>
          <div className="detail-body">
            <p>{HOUSE_TEXT[n - 1].about}</p>
            {cusp !== undefined && (
              <p>
                With {signOf(cusp).name} on the cusp, you approach this area in a {SIGN_TEXT[signOf(cusp).id].adjective.toLowerCase()} way.
              </p>
            )}
          </div>
          <h3 className="eyebrow sub">Planets here</h3>
          {inHouse.length ? (
            <ul className="point-list">
              {inHouse.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => onSelect({ kind: 'body', id: b.id })}>
                    <Glyph body={b.id} size={16} /> {BODY_BY_ID[b.id].name}
                    <span className="muted">{formatPosition(b.lon, { approx: b.approximate })}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">An empty house isn’t an empty life area. It just means no planet is emphasising it.</p>
          )}
        </article>
      )
    }
    case 'aspect': {
      const a = chart.aspects.find((x) => x.a === selection.a && x.b === selection.b)
      if (!a) return null
      const def = ASPECT_BY_TYPE[a.type]
      return (
        <article className="detail" key={`${a.a}-${a.b}`}>
          <header className="detail-head">
            <span className={`detail-glyph asp-big nature-${def.nature}`} aria-hidden="true">
              {ASPECT_SYMBOL[a.type]}
            </span>
            <div>
              <p className="eyebrow">
                {def.nature === 'neutral' ? 'Blending' : def.nature === 'harmonious' ? 'Harmonious' : 'Challenging'} ·{' '}
                {def.angle}°
              </p>
              <h2>{aspectTitle(a)}</h2>
              <p className="detail-pos">{aspectOrbLabel(a)}</p>
            </div>
          </header>
          <p className="keyword">{ASPECT_TEXT[a.type].keyword}</p>
          <div className="detail-body">
            <p>{aspectText(a)}</p>
            <p className="muted small">
              {a.exactness > 0.75 ? 'This is a tight aspect, so it’s one of the louder voices in your chart.' : a.exactness > 0.4 ? 'A moderately close aspect.' : 'A wide aspect: present, but in the background.'}
            </p>
          </div>
          {sky && (() => {
            const r = aspectSkyReading(chart, sky, a)
            return r && <SkyDetail reading={r} />
          })()}
          <div className="pair">
            {[a.a, a.b].map((id) => (
              <button
                key={id}
                type="button"
                className="btn"
                onClick={() => onSelect(id === 'asc' || id === 'mc' ? { kind: 'angle', id } : { kind: 'body', id: id as BodyId })}
              >
                <PointGlyph id={id} size={16} /> {pointName(id)}
              </button>
            ))}
          </div>
        </article>
      )
    }
    case 'transit': {
      const t = transits?.find((x) => x.id === selection.id)
      if (!t) return null
      const mine = contacts.filter((c) => c.transit === t.id)
      return (
        <article className="detail" key={`t-${t.id}`}>
          <header className="detail-head">
            <span className="detail-glyph transit-tone">
              <Glyph body={t.id} size={34} strokeWidth={1.3} />
            </span>
            <div>
              <p className="eyebrow">Transit · {transitDate?.toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
              <h2>
                {BODY_BY_ID[t.id].name} in {signOf(t.lon).name}
              </h2>
              <p className="detail-pos">{formatPosition(t.lon)}</p>
            </div>
          </header>
          <div className="detail-body">
            <p>{BODY_TEXT[t.id].core.replace(/^Your /, 'Transiting ').replace(/^The North Node/, 'The transiting North Node')}</p>
            <p>{SIGN_TEXT[signOf(t.lon).id].style}</p>
          </div>
          <h3 className="eyebrow sub">Touching your chart</h3>
          {mine.length ? (
            <ul className="aspect-list">
              {mine.map((c) => (
                <li key={`${c.natal}-${c.type}`}>
                  <span className="static">
                    <span className={`asp-sym nature-${ASPECT_BY_TYPE[c.type].nature}`} aria-hidden="true">
                      {ASPECT_SYMBOL[c.type]}
                    </span>
                    <span className="asp-name">
                      {ASPECT_BY_TYPE[c.type].name.toLowerCase()} your {pointName(c.natal)}
                    </span>
                    <span className="asp-orb">{c.exact && transitDate ? `exact ${formatExact(c.exact, transitDate)}` : `${c.orb.toFixed(1)}°`}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">No close contacts to your natal planets on this date.</p>
          )}
        </article>
      )
    }
  }
}

function Overview({ chart, onSelect, sky }: { chart: Chart; onSelect: (s: Selection) => void; sky: boolean }) {
  const tight = chart.aspects.filter((a) => a.type !== 'conjunction' || a.exactness > 0).slice(0, 6)
  return (
    <article className="detail overview">
      <p className="eyebrow">Explore</p>
      <h2>{sky ? 'Tap a planet in the sky' : 'Tap anything on the chart'}</h2>
      <p className="muted">
        {sky
          ? 'Each reading gains an “In the sky” section: how high the planet was, where it was in its daily arc, its sect and how it stood with the Sun.'
          : 'Planets, signs, house numbers and aspect lines all open up with a plain-language reading. With a keyboard, use Tab to move through them.'}
      </p>
      <h3 className="eyebrow sub">Your tightest aspects</h3>
      <ul className="aspect-list">
        {tight.map((a) => (
          <li key={`${a.a}-${a.b}`}>
            <button type="button" onClick={() => onSelect({ kind: 'aspect', a: a.a, b: a.b })}>
              <span className={`asp-sym nature-${ASPECT_BY_TYPE[a.type].nature}`} aria-hidden="true">
                {ASPECT_SYMBOL[a.type]}
              </span>
              <span className="asp-name">{aspectTitle(a)}</span>
              <span className="asp-orb">{a.orb.toFixed(1)}°</span>
            </button>
          </li>
        ))}
      </ul>
    </article>
  )
}
