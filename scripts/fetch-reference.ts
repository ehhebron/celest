/**
 * Regenerates src/astro/__tests__/referenceData.json from JPL Horizons:
 *  - apparent geocentric ecliptic-of-date longitude for each body (quantity 31)
 *  - local apparent sidereal time at each birth place (quantity 7)
 *  - the Moon's osculating ascending node (J2000 ecliptic) for the true node
 *
 *   node scripts/fetch-reference.ts
 */
import { writeFileSync } from 'node:fs'
import { MakeTime } from 'astronomy-engine'
import { REFERENCE_CHARTS } from '../src/astro/__tests__/referenceCharts.ts'

const API = 'https://ssd.jpl.nasa.gov/api/horizons.api'
const BODIES: Record<string, string> = {
  sun: '10',
  moon: '301',
  mercury: '199',
  venus: '299',
  mars: '499',
  jupiter: '599',
  saturn: '699',
  uranus: '799',
  neptune: '899',
  pluto: '999',
  chiron: '2060;',
}

const jdOf = (iso: string) => Date.parse(iso) / 86400000 + 2440587.5
const tlist = REFERENCE_CHARTS.map((c) => jdOf(c.expectedUtc).toFixed(9)).join(' ')

async function horizons(params: Record<string, string>): Promise<string[][]> {
  const q = new URLSearchParams({ format: 'text', OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'", CSV_FORMAT: "'YES'" })
  for (const [k, v] of Object.entries(params)) q.set(k, `'${v}'`)
  const text = await (await fetch(`${API}?${q}`)).text()
  const body = text.split('$$SOE')[1]?.split('$$EOE')[0]
  if (!body) throw new Error('Unexpected Horizons response:\n' + text.slice(0, 3000))
  await new Promise((r) => setTimeout(r, 400)) // be polite
  return body
    .trim()
    .split('\n')
    .map((l) => l.split(',').map((s) => s.trim()))
}

const result: Record<string, Record<string, number>> = {}
for (const c of REFERENCE_CHARTS) result[c.id] = {}

for (const [id, command] of Object.entries(BODIES)) {
  const rows = await horizons({
    COMMAND: command,
    EPHEM_TYPE: 'OBSERVER',
    CENTER: '500@399',
    TLIST: tlist,
    TLIST_TYPE: 'JD',
    TIME_TYPE: 'UT',
    QUANTITIES: '31',
    ANG_FORMAT: 'DEG',
    EXTRA_PREC: 'YES',
  })
  rows.forEach((r, i) => {
    // Columns: date, solar-presence, lunar-presence, ObsEcLon, ObsEcLat
    const nums = r.filter((s) => /^-?\d+\.\d+$/.test(s)).map(Number)
    result[REFERENCE_CHARTS[i].id][id] = nums[0]
  })
  console.log('fetched', id)
}

// Moon osculating elements relative to Earth, J2000 ecliptic.
{
  const rows = await horizons({
    COMMAND: '301',
    EPHEM_TYPE: 'ELEMENTS',
    CENTER: '500@399',
    REF_PLANE: 'ECLIPTIC',
    REF_SYSTEM: 'ICRF',
    TLIST: REFERENCE_CHARTS.map((c) => (MakeTime(new Date(c.expectedUtc)).tt + 2451545).toFixed(9)).join(' '),
    TLIST_TYPE: 'JD',
    TIME_TYPE: 'TDB',
  })
  // CSV: JDTDB, Cal, EC, QR, IN, OM, W, Tp, N, MA, TA, A, AD, PR
  rows.forEach((r, i) => {
    result[REFERENCE_CHARTS[i].id].nodeJ2000 = Number(r[5])
    result[REFERENCE_CHARTS[i].id].inclination = Number(r[4])
    result[REFERENCE_CHARTS[i].id].jdTdb = Number(r[0])
  })
  console.log('fetched node')
}

for (const c of REFERENCE_CHARTS) {
  const rows = await horizons({
    COMMAND: '10',
    EPHEM_TYPE: 'OBSERVER',
    CENTER: 'coord@399',
    COORD_TYPE: 'GEODETIC',
    SITE_COORD: `${c.lon},${c.lat},0`,
    TLIST: jdOf(c.expectedUtc).toFixed(9),
    TLIST_TYPE: 'JD',
    TIME_TYPE: 'UT',
    QUANTITIES: '7',
    ANG_FORMAT: 'DEG',
    EXTRA_PREC: 'YES',
  })
  const field = rows[0].find((s) => /^\d{1,2} \d{2} \d{2}/.test(s) || /^\d+\.\d+$/.test(s))!
  let hours: number
  if (field.includes(' ')) {
    const [h, m, s] = field.split(/\s+/).map(Number)
    hours = h + m / 60 + s / 3600
  } else hours = Number(field)
  result[c.id].lastDeg = hours * 15
  console.log('fetched LAST', c.id)
}

writeFileSync(
  new URL('../src/astro/__tests__/referenceData.json', import.meta.url),
  JSON.stringify({ source: 'JPL Horizons (DE441)', generated: new Date().toISOString(), charts: result }, null, 2),
)
console.log('done')
