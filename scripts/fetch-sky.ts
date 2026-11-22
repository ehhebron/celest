/**
 * Builds public/data/sky.json:
 *  - stars brighter than V=5.2 from the Yale Bright Star Catalogue, 5th ed.
 *    (Hoffleit & Warren 1991; SAO/Harvard copy of CDS V/50)
 *  - constellation stick figures from d3-celestial
 *    (© Olaf Frohn, BSD-3-Clause, https://github.com/ofrohn/d3-celestial)
 *
 *   node scripts/fetch-sky.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const MAG_LIMIT = 5.2

// A few well-known proper names, keyed by HR number.
const NAMES: Record<number, string> = {
  2491: 'Sirius', 2326: 'Canopus', 5340: 'Arcturus', 7001: 'Vega', 1708: 'Capella',
  1713: 'Rigel', 2943: 'Procyon', 2061: 'Betelgeuse', 472: 'Achernar', 5267: 'Hadar',
  7557: 'Altair', 1457: 'Aldebaran', 6134: 'Antares', 5056: 'Spica', 2990: 'Pollux',
  8728: 'Fomalhaut', 7924: 'Deneb', 3982: 'Regulus', 424: 'Polaris', 4730: 'Acrux',
  2618: 'Adhara', 1790: 'Bellatrix', 6527: 'Shaula', 1903: 'Alnilam', 4763: 'Gacrux',
  4853: 'Mimosa', 5459: 'Rigil Kentaurus', 2421: 'Alhena', 3685: 'Miaplacidus', 2004: 'Saiph',
}

const catRes = await fetch('http://tdc-www.harvard.edu/catalogs/ybsc5.gz')
if (!catRes.ok) throw new Error(`catalog ${catRes.status}`)
const text = gunzipSync(Buffer.from(await catRes.arrayBuffer())).toString('latin1')

const stars: number[][] = []
const names: Record<string, string> = {}
for (const line of text.split('\n')) {
  if (line.length < 110) continue
  const hr = Number(line.slice(0, 4))
  const rah = line.slice(75, 77).trim()
  if (!rah) continue // novae / non-stellar entries without positions
  const ra = (Number(rah) + Number(line.slice(77, 79)) / 60 + Number(line.slice(79, 83)) / 3600) * 15
  const sign = line[83] === '-' ? -1 : 1
  const dec = sign * (Number(line.slice(84, 86)) + Number(line.slice(86, 88)) / 60 + Number(line.slice(88, 90)) / 3600)
  const vmag = Number(line.slice(102, 107))
  const bvRaw = line.slice(109, 114).trim()
  const bv = bvRaw ? Number(bvRaw) : 0.6
  if (!Number.isFinite(vmag) || vmag > MAG_LIMIT) continue
  if (NAMES[hr]) names[stars.length] = NAMES[hr]
  stars.push([+ra.toFixed(3), +dec.toFixed(3), +vmag.toFixed(2), +bv.toFixed(2)])
}

const linesRes = await fetch('https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json')
if (!linesRes.ok) throw new Error(`lines ${linesRes.status}`)
const geo = (await linesRes.json()) as {
  features: { id: string; geometry: { coordinates: number[][][] } }[]
}
const lines: { id: string; l: number[][][] }[] = geo.features.map((f) => ({
  id: f.id,
  // d3-celestial stores RA as longitude in (-180, 180]; normalise to [0, 360).
  l: f.geometry.coordinates.map((seg) => seg.map(([lon, lat]) => [+((lon + 360) % 360).toFixed(3), +lat.toFixed(3)])),
}))

mkdirSync(new URL('../public/data/', import.meta.url), { recursive: true })
writeFileSync(
  new URL('../public/data/sky.json', import.meta.url),
  JSON.stringify({
    attribution:
      'Stars: Yale Bright Star Catalogue, 5th ed. (Hoffleit & Warren 1991, CDS V/50). Constellation lines: d3-celestial © Olaf Frohn, BSD-3-Clause.',
    stars,
    names,
    lines,
  }),
)
console.log(`${stars.length} stars, ${lines.length} constellations`)
