import { ASPECT_BY_TYPE } from '../astro/aspects'
import type { Chart } from '../astro/chart'
import { BODY_BY_ID, formatDegree, signOf } from '../astro/zodiac'
import { aspectOrbLabel, ordinal, pointName } from '../interpret/describe'
import { Glyph } from './Glyph'
import type { Selection } from './selection'

interface Props {
  chart: Chart
  onSelect: (s: Selection) => void
}

/** The same chart data as the wheel, as tables. */
export function ChartTable({ chart, onSelect }: Props) {
  return (
    <div className="chart-table">
      <table>
        <caption>Planets and points</caption>
        <thead>
          <tr>
            <th scope="col">Body</th>
            <th scope="col">Sign</th>
            <th scope="col">Degree</th>
            {chart.cusps && <th scope="col">House</th>}
            <th scope="col">Motion</th>
          </tr>
        </thead>
        <tbody>
          {chart.bodies.map((b) => (
            <tr key={b.id}>
              <th scope="row">
                <button type="button" className="row-btn" onClick={() => onSelect({ kind: 'body', id: b.id })}>
                  <Glyph body={b.id} size={16} /> {BODY_BY_ID[b.id].name}
                </button>
              </th>
              <td>
                <Glyph sign={b.sign.id} size={14} /> {b.sign.name}
              </td>
              <td className="num">{formatDegree(b.lon, { approx: b.approximate })}</td>
              {chart.cusps && <td>{b.house ? ordinal(b.house) : '—'}</td>}
              <td>{b.id === 'node' ? '—' : b.retrograde ? 'Retrograde' : 'Direct'}</td>
            </tr>
          ))}
          {chart.angles &&
            (['asc', 'mc'] as const).map((id) => (
              <tr key={id}>
                <th scope="row">
                  <button type="button" className="row-btn" onClick={() => onSelect({ kind: 'angle', id })}>
                    <span className="mini-angle">{id === 'asc' ? 'AC' : 'MC'}</span> {pointName(id)}
                  </button>
                </th>
                <td>
                  <Glyph sign={signOf(chart.angles![id]).id} size={14} /> {signOf(chart.angles![id]).name}
                </td>
                <td className="num">{formatDegree(chart.angles![id])}</td>
                {chart.cusps && <td>{id === 'asc' ? '1st' : chart.houseSystem === 'placidus' ? '10th' : '—'}</td>}
                <td>—</td>
              </tr>
            ))}
        </tbody>
      </table>

      {chart.cusps && (
        <table>
          <caption>
            Houses ({chart.houseSystem === 'placidus' ? 'Placidus' : 'Whole Sign'})
          </caption>
          <thead>
            <tr>
              <th scope="col">House</th>
              <th scope="col">Cusp</th>
              <th scope="col">Planets</th>
            </tr>
          </thead>
          <tbody>
            {chart.cusps.map((c, i) => (
              <tr key={i}>
                <th scope="row">
                  <button type="button" className="row-btn" onClick={() => onSelect({ kind: 'house', n: i + 1 })}>
                    {ordinal(i + 1)}
                  </button>
                </th>
                <td className="num">
                  {formatDegree(c)} {signOf(c).name}
                </td>
                <td>
                  {chart.bodies
                    .filter((b) => b.house === i + 1)
                    .map((b) => BODY_BY_ID[b.id].name)
                    .join(', ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <table>
        <caption>Aspects</caption>
        <thead>
          <tr>
            <th scope="col">Aspect</th>
            <th scope="col">Type</th>
            <th scope="col">Orb</th>
          </tr>
        </thead>
        <tbody>
          {chart.aspects.map((a) => (
            <tr key={`${a.a}-${a.b}`}>
              <th scope="row">
                <button type="button" className="row-btn" onClick={() => onSelect({ kind: 'aspect', a: a.a, b: a.b })}>
                  {pointName(a.a)} {ASPECT_BY_TYPE[a.type].name.toLowerCase()} {pointName(a.b)}
                </button>
              </th>
              <td className={`nature-${ASPECT_BY_TYPE[a.type].nature}`}>
                {ASPECT_BY_TYPE[a.type].nature === 'neutral' ? 'Blending' : ASPECT_BY_TYPE[a.type].nature === 'harmonious' ? 'Harmonious' : 'Challenging'}
              </td>
              <td className="num">{aspectOrbLabel(a)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
