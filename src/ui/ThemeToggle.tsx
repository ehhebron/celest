import { useEffect, useId, useRef, useState } from 'react'
import { setThemePref, useThemePref, type ThemePref } from '../state/theme'

const OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: 'system', label: 'Match system', icon: 'M4 5h16v11H4zM9 20h6M12 16v4' },
  { value: 'light', label: 'Light', icon: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0a4 4 0 1 1 8 0Z' },
  { value: 'dark', label: 'Dark', icon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z' },
]

/** Icon button that opens a small menu: Match system / Light / Dark. */
export function ThemeToggle() {
  const pref = useThemePref()
  const [open, setOpen] = useState(false)
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const current = OPTIONS.find((o) => o.value === pref)!

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    rootRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const onMenuKey = (e: React.KeyboardEvent) => {
    const items = [...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
    }
  }

  return (
    <div className="theme-toggle" ref={rootRef}>
      <button
        type="button"
        className="btn btn-icon"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={`Appearance: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
          <path d={current.icon} />
        </svg>
      </button>
      {open && (
        <div className="theme-menu" role="menu" id={`${id}-menu`} aria-label="Appearance" onKeyDown={onMenuKey}>
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={pref === o.value}
              onClick={() => {
                setThemePref(o.value)
                setOpen(false)
              }}
            >
              <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
                <path d={o.icon} />
              </svg>
              {o.label}
              {pref === o.value && <span className="theme-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
