import type { Vec3 } from '../../astro/horizon'

/** Orthonormal camera basis: screen right, screen up, and toward the viewer. */
export interface Basis {
  r: Vec3
  u: Vec3
  v: Vec3
}

const D = Math.PI / 180
export const Z: Vec3 = [0, 0, 1]

export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
export const normalize = (a: Vec3): Vec3 => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1))
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => add(scale(a, 1 - t), scale(b, t))

/**
 * The traditional wheel, seen as a camera: the ecliptic face-on, Descendant to
 * the right and the nonagesimal (Ascendant + 270°) straight up, so longitudes
 * run counter-clockwise from the Ascendant at 9 o'clock.
 */
export function wheelBasis(eclToHor: (lon: number) => Vec3, asc: number): Basis {
  const r = normalize(eclToHor(asc + 180))
  const u0 = eclToHor(asc + 270)
  const u = normalize(add(u0, scale(r, -dot(u0, r))))
  return { r, u, v: cross(r, u) }
}

/**
 * Standing beside the observer: zenith up, Descendant to the right (so the
 * Ascendant stays on the left, as on the wheel), turned by `az` around the
 * zenith and raised `el` degrees above the horizon plane.
 */
export function sideBasis(dsc: Vec3, az: number, el: number): Basis {
  const r0 = normalize([dsc[0], dsc[1], 0])
  const c = Math.cos(az * D)
  const s = Math.sin(az * D)
  const r: Vec3 = [r0[0] * c - r0[1] * s, r0[0] * s + r0[1] * c, 0]
  const h = cross(r, Z)
  const ce = Math.cos(el * D)
  const se = Math.sin(el * D)
  return { r, u: add(scale(Z, ce), scale(h, -se)), v: add(scale(h, ce), scale(Z, se)) }
}

/** Blend two cameras (normalized lerp, then re-orthogonalized). */
export function mixBasis(a: Basis, b: Basis, t: number): Basis {
  const r = normalize(lerp(a.r, b.r, t))
  const u1 = lerp(a.u, b.u, t)
  const u = normalize(add(u1, scale(r, -dot(u1, r))))
  return { r, u, v: cross(r, u) }
}

/** Keep the part of a closed polygon on one side of the horizon plane (z ≥ 0 for side = 1). */
export function clipPolygon(pts: Vec3[], side: 1 | -1): Vec3[] {
  const out: Vec3[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const da = a[2] * side
    const db = b[2] * side
    if (da >= 0) out.push(a)
    if (da >= 0 !== db >= 0) out.push(lerp(a, b, da / (da - db)))
  }
  return out
}

/** Split an open polyline into the runs that lie on one side of the horizon plane. */
export function clipPolyline(pts: Vec3[], side: 1 | -1): Vec3[][] {
  const runs: Vec3[][] = []
  let run: Vec3[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const da = a[2] * side
    if (da >= 0) run.push(a)
    const b = pts[i + 1]
    if (!b) break
    const db = b[2] * side
    if (da >= 0 !== db >= 0) {
      const x = lerp(a, b, da / (da - db))
      if (da >= 0) {
        run.push(x)
        runs.push(run)
        run = []
      } else run = [x]
    }
  }
  if (run.length > 1) runs.push(run)
  return runs
}

/** Points of a circle of radius `radius` in the plane spanned by unit vectors a and b. */
export function circle(a: Vec3, b: Vec3, radius: number, from = 0, to = 360, step = 4): Vec3[] {
  const pts: Vec3[] = []
  for (let deg = from; deg <= to + 1e-9; deg += step) {
    const c = Math.cos(deg * D) * radius
    const s = Math.sin(deg * D) * radius
    pts.push([a[0] * c + b[0] * s, a[1] * c + b[1] * s, a[2] * c + b[2] * s])
  }
  return pts
}

/**
 * Push overlapping screen points apart (at least `minDist` px), returning
 * display positions. Small and deterministic: fine to run every frame.
 */
export function relax(points: { x: number; y: number }[], minDist: number, iterations = 24) {
  const pos = points.map((p) => ({ ...p }))
  for (let k = 0; k < iterations; k++) {
    let moved = false
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        let dx = pos[j].x - pos[i].x
        let dy = pos[j].y - pos[i].y
        let d = Math.hypot(dx, dy)
        if (d >= minDist) continue
        if (d < 1e-6) {
          dx = 1
          dy = 0
          d = 1
        }
        const push = (minDist - d) / 2
        pos[i].x -= (dx / d) * push
        pos[i].y -= (dy / d) * push
        pos[j].x += (dx / d) * push
        pos[j].y += (dy / d) * push
        moved = true
      }
    }
    if (!moved) break
  }
  return pos
}
