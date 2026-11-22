import type { GrahaId } from '../../astro/vedic/vedic'

export type VedicSelection =
  | { kind: 'graha'; id: GrahaId }
  | { kind: 'house'; n: number }
  | { kind: 'lagna' }
  | { kind: 'dasha'; index: number }
  | { kind: 'yoga'; index: number }

export const sameVedic = (a: VedicSelection | null, b: VedicSelection | null) => JSON.stringify(a) === JSON.stringify(b)
