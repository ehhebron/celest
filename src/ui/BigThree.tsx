import type { Chart } from '../astro/chart'
import type { SignId } from '../astro/zodiac'
import { bigThree } from '../interpret/describe'
import { Glyph } from './Glyph'
import type { Selection } from './selection'

interface Props {
  chart: Chart
  onSelect: (s: Selection) => void
}

export function BigThree({ chart, onSelect }: Props) {
  const b = bigThree(chart)
  const items = [
    { key: 'sun', label: 'Sun', sign: b.sun.sign, signId: b.sun.signId, line: b.sun.line, sel: { kind: 'body', id: 'sun' } as Selection, glyph: <Glyph body="sun" size={22} /> },
    {
      key: 'moon',
      label: b.moon.approximate ? 'Moon (approx.)' : 'Moon',
      sign: b.moon.sign,
      signId: b.moon.signId,
      line: b.moon.line,
      sel: { kind: 'body', id: 'moon' } as Selection,
      glyph: <Glyph body="moon" size={22} />,
    },
    b.rising
      ? { key: 'rising', label: 'Rising', sign: b.rising.sign, signId: b.rising.signId, line: b.rising.line, sel: { kind: 'angle', id: 'asc' } as Selection, glyph: <span className="asc-mark">AC</span> }
      : null,
  ]
  return (
    <section className="big-three" aria-label="Big Three">
      {items.map((it, i) =>
        it ? (
          <button key={it.key} type="button" className="b3-item" onClick={() => onSelect(it.sel)} style={{ animationDelay: `${300 + i * 120}ms` }}>
            <span className="b3-glyph">{it.glyph}</span>
            <span className="b3-text">
              <span className="eyebrow">{it.label}</span>
              <span className="b3-sign">
                <Glyph sign={it.signId as SignId} size={16} className="b3-sign-glyph" />
                {it.sign}
              </span>
              <span className="b3-line">{it.line}</span>
            </span>
          </button>
        ) : (
          <div key="rising" className="b3-item is-unknown">
            <span className="b3-glyph">
              <span className="asc-mark">AC</span>
            </span>
            <span className="b3-text">
              <span className="eyebrow">Rising</span>
              <span className="b3-sign">Unknown</span>
              <span className="b3-line">Add a birth time to reveal your Rising sign and houses.</span>
            </span>
          </div>
        ),
      )}
    </section>
  )
}
