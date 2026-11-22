import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
}

/**
 * Mobile bottom sheet. Drag the handle (or the sheet) down to dismiss;
 * release springs back or closes depending on distance and velocity.
 */
export function BottomSheet({ open, onClose, label, children }: Props) {
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ y: number; t: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const lastFocus = useRef<Element | null>(null)

  useEffect(() => {
    if (open) {
      lastFocus.current = document.activeElement
      requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }))
    } else if (lastFocus.current instanceof HTMLElement || lastFocus.current instanceof SVGElement) {
      lastFocus.current.focus?.({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const onPointerDown = (e: React.PointerEvent) => {
    const scroller = ref.current?.querySelector('.sheet-content')
    // Only start a drag from the handle, or when content is scrolled to top.
    if (!(e.target as HTMLElement).closest('.sheet-handle') && scroller && scroller.scrollTop > 0) return
    start.current = { y: e.clientY, t: performance.now() }
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return
    const dy = e.clientY - start.current.y
    // Rubber-band upward drags.
    setDrag(dy > 0 ? dy : dy / 4)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!start.current) return
    const dy = e.clientY - start.current.y
    const v = dy / Math.max(1, performance.now() - start.current.t)
    start.current = null
    setDragging(false)
    setDrag(0)
    if (dy > 110 || v > 0.6) onClose()
  }

  return (
    <>
      <div className={`sheet-scrim${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        className={`sheet${open ? ' is-open' : ''}${dragging ? ' is-dragging' : ''}`}
        role="dialog"
        aria-modal="false"
        aria-label={label}
        aria-hidden={!open}
        tabIndex={-1}
        style={open ? { transform: `translateY(${drag}px)` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="sheet-handle" aria-hidden="true">
          <span />
        </div>
        <button type="button" className="sheet-close btn btn-ghost btn-icon" onClick={onClose} aria-label="Close details">
          <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="sheet-content">{open && children}</div>
      </div>
    </>
  )
}
