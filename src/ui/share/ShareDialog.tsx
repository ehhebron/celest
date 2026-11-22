import { useEffect, useRef, useState } from 'react'
import type { Chart } from '../../astro/chart'
import { cardBlob, ensureFonts, renderCard } from './renderCard'
import './share.css'

interface Props {
  chart: Chart
  onClose: () => void
}

type Status = 'rendering' | 'ready' | 'error'

export default function ShareDialog({ chart, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [status, setStatus] = useState<Status>('rendering')
  const [url, setUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // No close() in cleanup: it fires `close` → onClose, which would unmount us under StrictMode.
    const d = dialogRef.current
    if (d && !d.open) d.showModal()
  }, [])

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    ;(async () => {
      try {
        await ensureFonts()
        const canvas = document.createElement('canvas')
        renderCard(canvas, chart)
        const b = await cardBlob(canvas)
        if (cancelled) return
        objectUrl = URL.createObjectURL(b)
        setBlob(b)
        setUrl(objectUrl)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [chart])

  const fileName = `celest-${(chart.input.name || 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
  const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })

  const share = async () => {
    if (!file) return
    try {
      await navigator.share({ files: [file], title: 'My cosmic profile', text: 'Drawn by Celest' })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setMessage('Sharing didn’t work here. Try downloading instead.')
    }
  }

  return (
    <dialog ref={dialogRef} className="modal share-modal" aria-labelledby="share-h" onClose={onClose} onClick={(e) => e.target === dialogRef.current && onClose()}>
      <div className="modal-inner">
        <header className="modal-head">
          <div>
            <p className="eyebrow">Share</p>
            <h2 id="share-h">Your cosmic profile</h2>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="card-preview" aria-busy={status === 'rendering'}>
          {status === 'rendering' && (
            <div className="card-loading" role="status">
              <span className="orbit-loader" aria-hidden="true" />
              Composing your card…
            </div>
          )}
          {status === 'error' && (
            <div className="card-loading" role="alert">
              We couldn’t draw the card on this device.
            </div>
          )}
          {url && <img src={url} alt={`Story-sized card for ${chart.input.name || 'this chart'} showing the Big Three, a mini chart and the element balance`} />}
        </div>
        <p className="muted small center">Every card is drawn from its own chart: the rays, the aspect web and the colours are unique to this sky.</p>
        <div className="modal-actions">
          {canShare && (
            <button type="button" className="btn btn-primary" onClick={share} disabled={status !== 'ready'}>
              Share…
            </button>
          )}
          <a
            className={`btn${canShare ? '' : ' btn-primary'}`}
            href={url ?? undefined}
            download={fileName}
            aria-disabled={status !== 'ready'}
            onClick={(e) => status !== 'ready' && e.preventDefault()}
          >
            Download image
          </a>
        </div>
        {message && <p className="small center" role="status">{message}</p>}
      </div>
    </dialog>
  )
}
