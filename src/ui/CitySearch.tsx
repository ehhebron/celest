import { useEffect, useId, useRef, useState } from 'react'
import type { Place } from '../astro/chart'
import { searchPlaces, type PlaceResult } from '../geo/geocode'

type Status = 'idle' | 'loading' | 'results' | 'empty' | 'error'

interface Props {
  value: Place | null
  onChange: (p: Place | null) => void
  onManual: () => void
  invalid?: boolean
}

export function CitySearch({ value, onChange, onManual, invalid }: Props) {
  const id = useId()
  const [query, setQuery] = useState(value ? value.name : '')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [rawStatus, setStatus] = useState<Status>('idle')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [retry, setRetry] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const q = query.trim()
  const status: Status = q.length < 2 || (value && q === value.name) ? 'idle' : rawStatus

  useEffect(() => {
    if (q.length < 2 || (value && q === value.name)) {
      abortRef.current?.abort()
      return
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const r = await searchPlaces(q, ctrl.signal)
        setResults(r)
        setActive(0)
        setStatus(r.length ? 'results' : 'empty')
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setStatus('error')
      }
    }, 280)
    return () => clearTimeout(timer)
  }, [q, value, retry])

  const choose = (p: PlaceResult) => {
    onChange(p)
    setQuery(p.name)
    setOpen(false)
  }

  const listId = `${id}-list`
  const showPopover = open && status !== 'idle'

  return (
    <div className="city-search">
      <div className={`field-shell${invalid ? ' is-invalid' : ''}`}>
        <svg viewBox="0 0 24 24" className="glyph field-icon" aria-hidden="true">
          <path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 1 1 13 0c0 4.9-6.5 11-6.5 11ZM14.4 10a2.4 2.4 0 1 1-4.8 0a2.4 2.4 0 1 1 4.8 0Z" />
        </svg>
        <input
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-expanded={showPopover}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={status === 'results' && showPopover ? `${id}-opt-${active}` : undefined}
          aria-invalid={invalid || undefined}
          aria-label="Birth place"
          placeholder="Search for a city"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setStatus('loading')
            setOpen(true)
            if (value) onChange(null)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (status !== 'results') return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setOpen(true)
              setActive((a) => Math.min(results.length - 1, a + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(0, a - 1))
            } else if (e.key === 'Enter' && open) {
              e.preventDefault()
              if (results[active]) choose(results[active])
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        {status === 'loading' && <span className="spinner" aria-hidden="true" />}
        {value && <span className="field-check" aria-hidden="true">✓</span>}
      </div>
      {value && (
        <p className="field-hint">
          {value.region ? `${value.region} · ` : ''}
          {Math.abs(value.lat).toFixed(2)}°{value.lat >= 0 ? 'N' : 'S'}, {Math.abs(value.lon).toFixed(2)}°
          {value.lon >= 0 ? 'E' : 'W'} · {value.timeZone.replace(/_/g, ' ')}
        </p>
      )}

      <div className={`popover${showPopover ? ' is-open' : ''}`} aria-live="polite">
        {status === 'loading' && (
          <div className="popover-state">
            <span className="shimmer" />
            <span className="shimmer short" />
            <span className="visually-hidden">Searching…</span>
          </div>
        )}
        {status === 'results' && (
          <ul id={listId} role="listbox" aria-label="Matching places">
            {results.map((r, i) => (
              <li
                key={r.id}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'is-active' : ''}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                onMouseEnter={() => setActive(i)}
              >
                <span className="opt-name">{r.name}</span>
                <span className="opt-region">{r.region}</span>
              </li>
            ))}
          </ul>
        )}
        {status === 'empty' && (
          <div className="popover-state empty" role="status">
            <p className="state-title">No place called “{query.trim()}”</p>
            <p className="state-body">Check the spelling, try a nearby larger city, or enter coordinates yourself.</p>
            <button type="button" className="btn btn-ghost" onMouseDown={(e) => e.preventDefault()} onClick={onManual}>
              Enter coordinates manually
            </button>
          </div>
        )}
        {status === 'error' && (
          <div className="popover-state error" role="alert">
            <p className="state-title">The place search is out of reach</p>
            <p className="state-body">You may be offline. Try again, or enter coordinates yourself.</p>
            <div className="state-actions">
              <button type="button" className="btn" onMouseDown={(e) => e.preventDefault()} onClick={() => {
                  setStatus('loading')
                  setRetry((n) => n + 1)
                }}>
                Try again
              </button>
              <button type="button" className="btn btn-ghost" onMouseDown={(e) => e.preventDefault()} onClick={onManual}>
                Enter manually
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
