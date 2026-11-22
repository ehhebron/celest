import { DateTime, IANAZone } from 'luxon'

export type TimeNote =
  | null
  /** Before the zone adopted standard time; local mean time from longitude was used. */
  | 'lmt'
  /** Wall-clock time skipped by a DST change; shifted forward. */
  | 'gap'
  /** Wall-clock time occurred twice (DST ended); the first occurrence was used. */
  | 'ambiguous'

export interface LocalTimeInput {
  /** YYYY-MM-DD */
  date: string
  /** HH:mm, or null when unknown (noon is used). */
  time: string | null
  timeZone: string
  /** East-positive degrees; used for local mean time before standard time. */
  longitude: number
}

export interface ResolvedTime {
  utc: Date
  /** Offset from UTC in minutes (may be fractional for LMT). */
  offsetMinutes: number
  note: TimeNote
}

export class TimeResolutionError extends Error {}

function parseParts(date: string, time: string | null) {
  const dm = /^(-?\d{1,4})-(\d{2})-(\d{2})$/.exec(date)
  const tm = /^(\d{1,2}):(\d{2})$/.exec(time ?? '12:00')
  if (!dm || !tm) throw new TimeResolutionError(`Invalid date/time: ${date} ${time}`)
  return {
    year: Number(dm[1]),
    month: Number(dm[2]),
    day: Number(dm[3]),
    hour: Number(tm[1]),
    minute: Number(tm[2]),
  }
}

/** UTC offset in minutes of the zone at a UTC instant. */
function offsetAt(zone: IANAZone, utcMs: number): number {
  return zone.offset(utcMs)
}

/** Offsets in force within a day either side of an instant. */
function nearbyOffsets(zone: IANAZone, ms: number): number[] {
  const out: number[] = []
  for (let h = -36; h <= 36; h += 3) out.push(offsetAt(zone, ms + h * 3600000))
  return out
}

export function isValidTimeZone(tz: string): boolean {
  return IANAZone.isValidZone(tz)
}

/**
 * Convert a civil birth date/time at a place to UTC, honoring historical
 * time zone and daylight saving rules from the IANA database.
 */
export function resolveBirthTime(input: LocalTimeInput): ResolvedTime {
  const p = parseParts(input.date, input.time)
  if (!IANAZone.isValidZone(input.timeZone)) {
    throw new TimeResolutionError(`Unknown time zone: ${input.timeZone}`)
  }
  const zone = IANAZone.create(input.timeZone)
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
  if (p.year < 100) {
    // Date.UTC maps years 0-99 to 1900s.
    throw new TimeResolutionError('Years before 100 AD are not supported')
  }

  // Local mean time: the zone's offset on this date equals its earliest (LMT)
  // offset, which in tzdb is always the pre-standardization entry.
  const lmtOffset = offsetAt(zone, Date.UTC(1700, 0, 1))
  const candidateOffset = offsetAt(zone, wallAsUtc - lmtOffset * 60000)
  if (candidateOffset === lmtOffset && !Number.isInteger(lmtOffset / 15)) {
    const offsetMinutes = input.longitude * 4
    return {
      utc: new Date(wallAsUtc - offsetMinutes * 60000),
      offsetMinutes,
      note: 'lmt',
    }
  }

  const dt = DateTime.fromObject(p, { zone })
  if (!dt.isValid) throw new TimeResolutionError(dt.invalidExplanation ?? 'Invalid date')

  let note: TimeNote = null
  if (dt.hour !== p.hour || dt.minute !== p.minute || dt.day !== p.day) {
    note = 'gap'
  } else {
    // Ambiguous if the same wall time is reachable with a different offset.
    const offsets = new Set(nearbyOffsets(zone, wallAsUtc))
    let hits = 0
    for (const off of offsets) {
      const utcMs = wallAsUtc - off * 60000
      if (offsetAt(zone, utcMs) === off) hits++
    }
    if (hits > 1) note = 'ambiguous'
  }

  // Luxon resolves ambiguous times to the earlier offset choice; make it explicit:
  // pick the first (earliest UTC) instant that shows this wall time.
  let utcMs = dt.toMillis()
  if (note === 'ambiguous') {
    const candidates = [...new Set(nearbyOffsets(zone, wallAsUtc))]
      .map((off) => wallAsUtc - off * 60000)
      .filter((ms) => DateTime.fromMillis(ms, { zone }).hour === p.hour)
      .sort((a, b) => a - b)
    utcMs = candidates[0] ?? utcMs
  }
  return {
    utc: new Date(utcMs),
    offsetMinutes: offsetAt(zone, utcMs),
    note,
  }
}

/** Format a UTC offset like "UTC+05:30" or "UTC−00:40 (LMT)". */
export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+'
  const abs = Math.abs(Math.round(minutes))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `UTC${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
