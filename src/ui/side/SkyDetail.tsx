import type { SkyReading } from '../../interpret/sky'

/** The "In the sky" block appended to a reading while the side view is open: meaning first, astronomy after. */
export function SkyDetail({ reading }: { reading: SkyReading }) {
  return (
    <section className="sky-detail" aria-label="In the sky">
      <h3 className="eyebrow sub">In your sky</h3>
      <p className="sky-headline">{reading.headline}</p>
      <div className="detail-body">
        {reading.meaning.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="sky-picture">
        <h4 className="eyebrow">The sky picture</h4>
        <dl className="sky-facts">
          {reading.facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
        {reading.sky.map((p, i) => (
          <p key={i} className="muted small">
            {p}
          </p>
        ))}
      </div>
    </section>
  )
}
