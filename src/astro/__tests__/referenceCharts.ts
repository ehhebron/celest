/**
 * Reference charts. `expectedUtc` is derived by hand from the historical
 * clock rules in force at the place and date (not from our code), so these
 * cases test time zone resolution as well as positions.
 *
 * Planet/node/sidereal-time ground truth for each moment lives in
 * referenceData.json, generated from JPL Horizons by
 * scripts/fetch-reference.ts.
 */
export interface ReferenceChart {
  id: string
  label: string
  date: string
  time: string
  timeZone: string
  lat: number
  lon: number
  expectedUtc: string
  expectedNote: null | 'lmt' | 'gap' | 'ambiguous'
  why: string
}

export const REFERENCE_CHARTS: ReferenceChart[] = [
  {
    id: 'einstein',
    label: 'Albert Einstein — Ulm, 1879',
    date: '1879-03-14',
    time: '11:30',
    timeZone: 'Europe/Berlin',
    lat: 48.4,
    lon: 10.0,
    // Local mean time at 10°E = UTC+0:40.
    expectedUtc: '1879-03-14T10:50:00Z',
    expectedNote: 'lmt',
    why: 'Pre-standard-time birth: local mean time from longitude',
  },
  {
    id: 'kahlo',
    label: 'Frida Kahlo — Coyoacán, 1907',
    date: '1907-07-06',
    time: '08:30',
    timeZone: 'America/Mexico_City',
    lat: 19.3333,
    lon: -99.1667,
    // Mexico kept local mean time until 1922. 99°10′W = UTC−6:36:40.
    expectedUtc: '1907-07-06T15:06:40Z',
    expectedNote: 'lmt',
    why: 'Western-hemisphere LMT with seconds-level offset',
  },
  {
    id: 'monroe',
    label: 'Marilyn Monroe — Los Angeles, 1926',
    date: '1926-06-01',
    time: '09:30',
    timeZone: 'America/Los_Angeles',
    lat: 34.05,
    lon: -118.25,
    // California observed no DST in 1926: PST (UTC−8).
    expectedUtc: '1926-06-01T17:30:00Z',
    expectedNote: null,
    why: 'Summer date with no DST in force',
  },
  {
    id: 'diana',
    label: 'Diana Spencer — Sandringham, 1961',
    date: '1961-07-01',
    time: '19:45',
    timeZone: 'Europe/London',
    lat: 52.8333,
    lon: 0.5,
    // British Summer Time (UTC+1).
    expectedUtc: '1961-07-01T18:45:00Z',
    expectedNote: null,
    why: 'Standard summer DST',
  },
  {
    id: 'obama',
    label: 'Barack Obama — Honolulu, 1961',
    date: '1961-08-04',
    time: '19:24',
    timeZone: 'Pacific/Honolulu',
    lat: 21.3,
    lon: -157.8667,
    // HST (UTC−10); crosses the UTC date line into Aug 5.
    expectedUtc: '1961-08-05T05:24:00Z',
    expectedNote: null,
    why: 'Local evening becomes next UTC day',
  },
  {
    id: 'london-1970',
    label: 'London, January 1970',
    date: '1970-01-15',
    time: '08:00',
    timeZone: 'Europe/London',
    lat: 51.5072,
    lon: -0.1276,
    // British Standard Time experiment 1968–71: UTC+1 all winter.
    expectedUtc: '1970-01-15T07:00:00Z',
    expectedNote: null,
    why: 'Historical anomaly: year-round DST in the UK',
  },
  {
    id: 'sydney-1990',
    label: 'Sydney, January 1990',
    date: '1990-01-15',
    time: '12:00',
    timeZone: 'Australia/Sydney',
    lat: -33.8688,
    lon: 151.2093,
    // Southern-hemisphere summer: AEDT (UTC+11).
    expectedUtc: '1990-01-15T01:00:00Z',
    expectedNote: null,
    why: 'Southern hemisphere DST; high southern latitude houses',
  },
  {
    id: 'reykjavik-2000',
    label: 'Reykjavík, millennium night',
    date: '2000-01-01',
    time: '00:00',
    timeZone: 'Atlantic/Reykjavik',
    lat: 64.1466,
    lon: -21.9426,
    expectedUtc: '2000-01-01T00:00:00Z',
    expectedNote: null,
    why: 'High latitude (Placidus still defined)',
  },
]
