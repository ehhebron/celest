const FMT_MD = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const FMT_MDY = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

/** "Mar 14" (same year as ref) or "Mar 14, 2027". */
export function formatExact(d: Date, ref: Date): string {
  return (d.getFullYear() === ref.getFullYear() ? FMT_MD : FMT_MDY).format(d)
}

/** "1990-05-20" -> "May 20, 1990" (locale-aware, no time zone drift). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** "14:30" -> "2:30 PM" in the viewer's locale. */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
}

export type Scale = 'day' | 'week' | 'month' | 'year'

export const UNIT_MS: Record<Scale, number> = {
  day: 86400000,
  week: 7 * 86400000,
  month: 30.436875 * 86400000,
  year: 365.2425 * 86400000,
}

/** The viewer's current IANA time zone (falls back to UTC). */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * Date and time of an instant as a clock in `timeZone` would show it,
 * e.g. { date: "July 2, 2027", monthDay: "July 2", year: "2027", time: "4:06 AM", zone: "Philippine Standard Time" }.
 */
export function formatInZone(instant: Date, timeZone: string, locale?: string) {
  const date = new Intl.DateTimeFormat(locale, { timeZone, month: 'long', day: 'numeric', year: 'numeric' }).format(instant)
  const monthDay = new Intl.DateTimeFormat(locale, { timeZone, month: 'long', day: 'numeric' }).format(instant)
  const year = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(instant)
  const time = new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit' }).format(instant)
  const zone =
    new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'long' })
      .formatToParts(instant)
      .find((p) => p.type === 'timeZoneName')?.value ?? timeZone
  return { date, monthDay, year, time, zone }
}
