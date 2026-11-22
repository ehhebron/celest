import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

interface Props {
  /** Accessible name for the trigger, e.g. "About this time". */
  label: string
  children: ReactNode
}

/**
 * A small ⓘ toggletip: opens on hover, keyboard focus or tap; closes on
 * Escape, blur or a tap elsewhere. The bubble is positioned against the
 * nearest positioned ancestor (e.g. a card) so it never runs off-screen.
 */
export function InfoTip({ label, children }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span
      className="infotip"
      ref={ref}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        className="infotip-btn"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        // Keyboard focus opens it; a tap also focuses, so leave that to onClick.
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0ZM12 11v5.5M12 7.6v.01" />
        </svg>
      </button>
      <span id={id} role="tooltip" className={`infotip-bubble${open ? ' is-open' : ''}`}>
        {children}
      </span>
    </span>
  )
}
