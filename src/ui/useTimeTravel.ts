import { useCallback, useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from './hooks'

export const MIN_DATE = Date.UTC(1800, 0, 2)
export const MAX_DATE = Date.UTC(2149, 11, 30)
const clamp = (ms: number) => Math.min(MAX_DATE, Math.max(MIN_DATE, ms))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * The displayed transit date, with smooth tweening for jumps (so planets
 * glide along their real paths) and immediate updates for drags.
 */
export function useTimeTravel(initial: Date) {
  const [date, setDate] = useState(initial)
  const [moving, setMoving] = useState(false)
  const current = useRef(initial.getTime())
  const raf = useRef(0)

  const stop = () => cancelAnimationFrame(raf.current)

  const setNow = useCallback((ms: number) => {
    stop()
    current.current = clamp(ms)
    setDate(new Date(current.current))
  }, [])

  const animateTo = useCallback((target: number) => {
    stop()
    const to = clamp(target)
    const from = current.current
    if (prefersReducedMotion() || from === to) {
      current.current = to
      setDate(new Date(to))
      return
    }
    // Longer jumps get a little more time, capped so it stays snappy.
    const days = Math.abs(to - from) / 86400000
    const duration = Math.min(1400, 450 + Math.log10(1 + days) * 260)
    const t0 = performance.now()
    setMoving(true)
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration)
      current.current = from + (to - from) * ease(t)
      setDate(new Date(current.current))
      if (t < 1) raf.current = requestAnimationFrame(step)
      else setMoving(false)
    }
    raf.current = requestAnimationFrame(step)
  }, [])

  /** Momentum after a drag: velocity in ms-of-date per ms-of-wallclock. */
  const fling = useCallback((velocity: number) => {
    stop()
    if (prefersReducedMotion() || Math.abs(velocity) < 1) return
    let v = velocity
    let last = performance.now()
    setMoving(true)
    const step = (now: number) => {
      const dt = now - last
      last = now
      current.current = clamp(current.current + v * dt)
      setDate(new Date(current.current))
      v *= Math.pow(0.992, dt) // friction
      if (Math.abs(v) * 16 > 60000 && current.current > MIN_DATE && current.current < MAX_DATE) {
        raf.current = requestAnimationFrame(step)
      } else setMoving(false)
    }
    raf.current = requestAnimationFrame(step)
  }, [])

  useEffect(() => stop, [])

  return { date, moving, setNow, animateTo, fling, current }
}
