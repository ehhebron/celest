import { useState, type FormEvent } from 'react'
import type { Place } from '../astro/chart'
import type { HouseSystem } from '../astro/houses'
import { isValidTimeZone } from '../astro/time'
import { SIGNS } from '../astro/zodiac'
import type { SavedChart } from '../state/storage'
import type { ChartRoute } from '../state/url'
import { CitySearch } from './CitySearch'
import { formatDate } from './format'
import { ThemeToggle } from './ThemeToggle'
import { SIGN_GLYPHS } from './glyphs'
import './onboarding.css'

interface Props {
  saved: SavedChart[]
  onSubmit: (route: ChartRoute) => void
  onOpen: (route: ChartRoute) => void
  onDelete: (id: string) => void
}

const ZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return ['UTC']
  }
})()

export function Onboarding({ saved, onSubmit, onOpen, onDelete }: Props) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [place, setPlace] = useState<Place | null>(null)
  const [manual, setManual] = useState(false)
  const [manualPlace, setManualPlace] = useState({ name: '', lat: '', lon: '', tz: guessZone() })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const houseSystem: HouseSystem = 'whole-sign'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const year = Number(date.slice(0, 4))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errs.date = 'Enter your birth date.'
    else if (year < 1800 || year > 2100) errs.date = 'Celest supports birth dates from 1800 to 2100.'
    if (!timeUnknown && !/^\d{2}:\d{2}$/.test(time)) errs.time = 'Enter a time, or tick “I don’t know my time”.'

    let finalPlace: Place | null = place
    if (manual) {
      const lat = Number(manualPlace.lat)
      const lon = Number(manualPlace.lon)
      if (!manualPlace.lat || !Number.isFinite(lat) || Math.abs(lat) > 90) errs.lat = 'Latitude must be between −90 and 90.'
      if (!manualPlace.lon || !Number.isFinite(lon) || Math.abs(lon) > 180) errs.lon = 'Longitude must be between −180 and 180.'
      if (!isValidTimeZone(manualPlace.tz)) errs.tz = 'Choose a time zone.'
      finalPlace = errs.lat || errs.lon || errs.tz
        ? null
        : { name: manualPlace.name.trim() || `${lat.toFixed(2)}, ${lon.toFixed(2)}`, lat, lon, timeZone: manualPlace.tz }
    } else if (!place) {
      errs.place = 'Choose your birth place from the list.'
    }
    setErrors(errs)
    if (Object.keys(errs).length || !finalPlace) return
    onSubmit({
      input: { name: name.trim() || undefined, date, time: timeUnknown ? null : time, place: finalPlace },
      houseSystem,
    })
  }

  return (
    <main className="onboarding">
      <div className="ob-corner">
        <ThemeToggle />
      </div>
      <div className="ob-orbit" aria-hidden="true">
        <svg viewBox="0 0 600 600">
          <circle cx="300" cy="300" r="290" />
          <circle cx="300" cy="300" r="250" />
          {SIGNS.map((s, i) => {
            const a = (i * 30 + 15) * (Math.PI / 180)
            const x = 300 + 270 * Math.cos(a)
            const y = 300 - 270 * Math.sin(a)
            const a0 = i * 30 * (Math.PI / 180)
            return (
              <g key={s.id}>
                <line
                  x1={300 + 250 * Math.cos(a0)}
                  y1={300 - 250 * Math.sin(a0)}
                  x2={300 + 290 * Math.cos(a0)}
                  y2={300 - 290 * Math.sin(a0)}
                />
                <path d={SIGN_GLYPHS[s.id]} transform={`translate(${x - 10} ${y - 10}) scale(0.833)`} />
              </g>
            )
          })}
        </svg>
      </div>

      <header className="ob-head">
        <p className="eyebrow">A natal chart, beautifully made</p>
        <h1 className="wordmark">Celest</h1>
        <p className="ob-tagline">The sky at the moment you arrived — drawn precisely, explained warmly.</p>
      </header>

      <form className="ob-form card" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="ob-name">
            Name <span className="optional">optional</span>
          </label>
          <div className="field-shell">
            <input id="ob-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Who is this chart for?" autoComplete="given-name" maxLength={40} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="ob-date">Birth date</label>
            <div className={`field-shell${errors.date ? ' is-invalid' : ''}`}>
              <input
                id="ob-date"
                type="date"
                value={date}
                min="1800-01-01"
                max="2100-12-31"
                onChange={(e) => setDate(e.target.value)}
                aria-invalid={!!errors.date || undefined}
                aria-describedby={errors.date ? 'err-date' : undefined}
                required
              />
            </div>
            {errors.date && <p className="field-error" id="err-date">{errors.date}</p>}
          </div>
          <div className="field">
            <label htmlFor="ob-time">Birth time</label>
            <div className={`field-shell${errors.time ? ' is-invalid' : ''}${timeUnknown ? ' is-disabled' : ''}`}>
              <input
                id="ob-time"
                type="time"
                value={timeUnknown ? '' : time}
                disabled={timeUnknown}
                onChange={(e) => setTime(e.target.value)}
                aria-invalid={!!errors.time || undefined}
                aria-describedby={errors.time ? 'err-time' : 'hint-time'}
              />
            </div>
            {errors.time ? (
              <p className="field-error" id="err-time">{errors.time}</p>
            ) : null}
          </div>
        </div>

        <label className="check">
          <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
          <span className="check-box" aria-hidden="true" />
          <span>
            I don’t know my birth time
            <span className="check-hint" id="hint-time">
              We’ll use noon. Your Rising sign and houses will be hidden, and the Moon’s degree will be approximate.
            </span>
          </span>
        </label>

        <div className="field">
          <div className="label-row">
            <label htmlFor={manual ? 'ob-mname' : undefined} id="lbl-place">Birth place</label>
            <button type="button" className="link-btn" onClick={() => setManual((m) => !m)}>
              {manual ? 'Search for a city instead' : 'Enter coordinates'}
            </button>
          </div>
          {!manual ? (
            <>
              <CitySearch value={place} onChange={setPlace} onManual={() => setManual(true)} invalid={!!errors.place} />
              {errors.place && <p className="field-error">{errors.place}</p>}
            </>
          ) : (
            <div className="manual">
              <div className="field-shell">
                <input id="ob-mname" type="text" placeholder="Place name (optional)" value={manualPlace.name} onChange={(e) => setManualPlace({ ...manualPlace, name: e.target.value })} />
              </div>
              <div className="field-row">
                <div className="field">
                  <div className={`field-shell${errors.lat ? ' is-invalid' : ''}`}>
                    <input aria-label="Latitude (north positive)" inputMode="decimal" placeholder="Latitude, e.g. 48.40" value={manualPlace.lat} onChange={(e) => setManualPlace({ ...manualPlace, lat: e.target.value })} />
                  </div>
                  {errors.lat && <p className="field-error">{errors.lat}</p>}
                </div>
                <div className="field">
                  <div className={`field-shell${errors.lon ? ' is-invalid' : ''}`}>
                    <input aria-label="Longitude (east positive)" inputMode="decimal" placeholder="Longitude, e.g. −74.00" value={manualPlace.lon} onChange={(e) => setManualPlace({ ...manualPlace, lon: e.target.value })} />
                  </div>
                  {errors.lon && <p className="field-error">{errors.lon}</p>}
                </div>
              </div>
              <div className={`field-shell${errors.tz ? ' is-invalid' : ''}`}>
                <select aria-label="Time zone" value={manualPlace.tz} onChange={(e) => setManualPlace({ ...manualPlace, tz: e.target.value })}>
                  {ZONES.map((z) => (
                    <option key={z} value={z}>
                      {z.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <p className="field-hint">North and east are positive. Historical daylight saving is applied automatically for the zone.</p>
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary ob-submit">
          Reveal my chart
        </button>
        <p className="privacy-note">Your birth details stay on this device. Only the city name you type is sent, to look up its coordinates.</p>
      </form>

      {saved.length > 0 && (
        <section className="ob-saved" aria-labelledby="saved-h">
          <h2 id="saved-h" className="eyebrow">Your charts</h2>
          <ul>
            {saved.map((c) => (
              <li key={c.id}>
                <button type="button" className="saved-open" onClick={() => onOpen(c)}>
                  <span className="saved-name">{c.input.name || 'Untitled chart'}</span>
                  <span className="saved-meta">
                    {formatDate(c.input.date)} · {c.input.time ?? 'time unknown'} · {c.input.place.name}
                  </span>
                </button>
                <button type="button" className="btn btn-ghost btn-icon" aria-label={`Delete ${c.input.name || 'chart'}`} onClick={() => onDelete(c.id)}>
                  <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function guessZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}
