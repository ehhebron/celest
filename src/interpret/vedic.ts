import type { Mahadasha, Period } from '../astro/vedic/dasha'
import {
  BENEFICS,
  DUSTHANAS,
  GRAHA_NAME,
  houseLord,
  KENDRAS,
  RASHIS,
  signOfHouse,
  TRIKONAS,
  UPACHAYAS,
  type Graha,
  type GrahaId,
  type VedicChart,
} from '../astro/vedic/vedic'
import type { Yoga } from '../astro/vedic/yogas'
import type { SignId } from '../astro/zodiac'
import { ordinal } from './describe'
import { SIGN_TEXT } from './texts'
import {
  BHAVA_TEXT,
  COMBUST_TEXT,
  DASHA_TEXT,
  DIGNITY_LABEL,
  DIGNITY_TEXT,
  GRAHA_TEXT,
  HOUSE_GROUP_TEXT,
  KEMADRUMA_CANCELLED,
  NAKSHATRA_TEXT,
  PLACEMENT_TEXT,
  RETRO_TEXT,
  YOGA_TEXT,
} from './vedicTexts'

/*
 * Readings for Vedic mode, assembled from the chart model and vedicTexts.
 */

export interface VedicReading {
  eyebrow: string
  title: string
  subtitle: string
  chips: string[]
  keyword?: string
  paragraphs: string[]
}

export const gname = (id: GrahaId) => GRAHA_NAME[id].name
export const rashiLabel = (sign: number) => `${RASHIS[sign].name} (${RASHIS[sign].western})`
const westernId = (sign: number) => RASHIS[sign].western.toLowerCase() as SignId
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

export function formatSidereal(lon: number, approx = false): string {
  const sign = Math.floor(lon / 30) % 12
  const inSign = lon - sign * 30
  let d = Math.floor(inSign)
  let m = Math.round((inSign - d) * 60)
  if (m === 60) {
    d += 1
    m = 0
  }
  if (d === 30) {
    d = 29
    m = 59
  }
  return approx ? `~${d}° ${RASHIS[sign].name}` : `${d}°${String(m).padStart(2, '0')}′ ${RASHIS[sign].name}`
}

export function houseGroupText(h: number): string {
  if (h === 1) return HOUSE_GROUP_TEXT.lagna
  if (h === 6) return `${HOUSE_GROUP_TEXT.dusthana} It is also an upachaya, so it improves with effort.`
  if (KENDRAS.includes(h)) return HOUSE_GROUP_TEXT.kendra + (h === 10 ? ' It is also an upachaya, growing stronger with time.' : '')
  if (TRIKONAS.includes(h)) return HOUSE_GROUP_TEXT.trikona
  if (DUSTHANAS.includes(h)) return HOUSE_GROUP_TEXT.dusthana
  if (UPACHAYAS.includes(h)) return HOUSE_GROUP_TEXT.upachaya
  return HOUSE_GROUP_TEXT.wealth
}

function placementText(g: Graha): string {
  const n = gname(g.id)
  const h = g.house
  if (BENEFICS.has(g.id)) {
    if (KENDRAS.includes(h) || TRIKONAS.includes(h)) return PLACEMENT_TEXT.beneficStrong(n)
    if (DUSTHANAS.includes(h)) return PLACEMENT_TEXT.beneficHidden(n)
    return PLACEMENT_TEXT.beneficOther(n, BHAVA_TEXT[h - 1].area)
  }
  if (UPACHAYAS.includes(h)) return PLACEMENT_TEXT.maleficGrowth(n)
  if (h === 8 || h === 12) return PLACEMENT_TEXT.maleficHidden(n)
  if (h === 2) return PLACEMENT_TEXT.maleficWealth(n)
  return PLACEMENT_TEXT.maleficStrong(n)
}

function lordshipText(g: Graha): string | null {
  if (!g.rules.length) return null
  const houses = g.rules.map((h) => `${ordinal(h)}`)
  const areas = g.rules.map((h) => BHAVA_TEXT[h - 1].area)
  const here = g.rules.includes(g.house)
  return here && g.rules.length === 1
    ? `As lord of your ${houses[0]} house, it sits in its own house: the matters of ${areas[0]} are well protected and in your own hands.`
    : `As lord of your ${list(houses)} house${g.rules.length > 1 ? 's' : ''} (${list(areas)}), it carries those matters into your ${ordinal(g.house)} house of ${BHAVA_TEXT[g.house - 1].area}${
        here ? ', one of which it already rules' : ''
      }. The two parts of your life are linked.`
}

function nakshatraText(g: Graha | { id: 'lagna'; nakshatra: Graha['nakshatra'] }): string {
  const n = g.nakshatra
  const t = NAKSHATRA_TEXT[n.index]
  const intro =
    g.id === 'moon'
      ? `Your Moon is in ${n.name} nakshatra (pada ${n.pada}). This is your janma nakshatra, your birth star, one of the most personal factors in Jyotish.`
      : g.id === 'lagna'
        ? `Your Lagna falls in ${n.name} nakshatra (pada ${n.pada}).`
        : `It sits in ${n.name} nakshatra (pada ${n.pada}).`
  return `${intro} ${n.name} is ruled by ${gname(n.lord)} and presided over by ${t.deity}; its symbol is ${t.symbol}. Its nature is ${t.meaning}.`
}

export function grahaReading(v: VedicChart, id: GrahaId, yogas: Yoga[]): VedicReading {
  const g = v.grahas.find((x) => x.id === id)!
  const n = gname(id)
  const chips: string[] = []
  if (g.dignity !== 'neutral') chips.push(DIGNITY_LABEL[g.dignity])
  if (g.retrograde && id !== 'rahu' && id !== 'ketu') chips.push('Retrograde')
  if (g.combust) chips.push('Combust')
  const st = SIGN_TEXT[westernId(g.sign)]
  const paragraphs = [
    GRAHA_TEXT[id].core,
    `In sidereal ${rashiLabel(g.sign)}: ${st.style}`,
    `It sits in your ${ordinal(g.house)} house, ${BHAVA_TEXT[g.house - 1].name}, the house of ${BHAVA_TEXT[g.house - 1].area}. ${houseGroupText(g.house)} ${placementText(g)}`,
  ]
  const dig = DIGNITY_TEXT[g.dignity]
  if (dig) paragraphs.push(dig(n))
  if (g.combust) paragraphs.push(COMBUST_TEXT(n))
  if (g.retrograde && id !== 'rahu' && id !== 'ketu') paragraphs.push(RETRO_TEXT(n))
  const lord = lordshipText(g)
  if (lord) paragraphs.push(lord)
  paragraphs.push(nakshatraText(g))
  const mine = yogas.filter((y) => y.grahas.includes(id))
  if (mine.length) paragraphs.push(`It takes part in ${list(mine.map((y) => YOGA_TEXT[y.id].name))}.`)
  if (g.approximate) paragraphs.push('Because the birth time is unknown, the Moon’s degree, and possibly its nakshatra, are approximate.')
  return {
    eyebrow: `${GRAHA_NAME[id].sanskrit} · ${GRAHA_TEXT[id].role}`,
    title: `${n} in ${RASHIS[g.sign].name}, ${ordinal(g.house)} house`,
    subtitle: `${formatSidereal(g.lon, g.approximate)} · ${g.nakshatra.name} ${g.nakshatra.pada}`,
    chips,
    keyword: GRAHA_TEXT[id].keyword,
    paragraphs,
  }
}

export function bhavaReading(v: VedicChart, house: number): VedicReading {
  const sign = signOfHouse(house, v.firstHouseSign)
  const lord = houseLord(v, house)
  const lg = v.grahas.find((g) => g.id === lord)!
  const b = BHAVA_TEXT[house - 1]
  const paragraphs = [
    b.about,
    houseGroupText(house),
    `${rashiLabel(sign)} falls on this house, so ${gname(lord)} is its lord. ${
      lg.house === house
        ? `${gname(lord)} sits right here in its own house, which strengthens and protects everything this house stands for.`
        : `${gname(lord)} sits in your ${ordinal(lg.house)} house of ${BHAVA_TEXT[lg.house - 1].area}, so the matters of this house play out through that part of your life.`
    }`,
  ]
  if (DIGNITY_TEXT[lg.dignity] && lg.dignity !== 'friend') paragraphs.push(`Its lord is ${DIGNITY_LABEL[lg.dignity].toLowerCase()}, which colours how this house delivers.`)
  return {
    eyebrow: v.fromMoon ? 'House from the Moon' : 'Bhava',
    title: `${ordinal(house)} house · ${b.name}`,
    subtitle: rashiLabel(sign),
    chips: [],
    keyword: b.area.charAt(0).toUpperCase() + b.area.slice(1),
    paragraphs,
  }
}

export function lagnaReading(v: VedicChart): VedicReading | null {
  if (!v.lagna) return null
  const lord = RASHIS[v.lagna.sign].lord as GrahaId
  const lg = v.grahas.find((g) => g.id === lord)!
  const st = SIGN_TEXT[westernId(v.lagna.sign)]
  const inFirst = v.grahas.filter((g) => g.house === 1)
  const paragraphs = [
    `Your Lagna, the rising sign, is ${rashiLabel(v.lagna.sign)}. In Jyotish the Lagna is the most important point in the chart: your body, temperament and the lens through which your whole life is read. Every house is counted from it.`,
    st.about,
    `Your Lagna lord is ${gname(lord)}, sitting in your ${ordinal(lg.house)} house of ${BHAVA_TEXT[lg.house - 1].area}${
      lg.dignity !== 'neutral' ? `, ${DIGNITY_LABEL[lg.dignity].toLowerCase()}` : ''
    }. Where the Lagna lord goes, your life’s attention tends to follow: much of your energy and sense of direction flows toward ${BHAVA_TEXT[lg.house - 1].area}.`,
  ]
  if (inFirst.length) paragraphs.push(`${list(inFirst.map((g) => gname(g.id)))} ${inFirst.length === 1 ? 'sits' : 'sit'} in your 1st house, strongly colouring your personality and appearance.`)
  paragraphs.push(nakshatraText({ id: 'lagna', nakshatra: v.lagna.nakshatra }))
  return {
    eyebrow: 'Lagna · Rising sign',
    title: `${RASHIS[v.lagna.sign].name} Lagna`,
    subtitle: formatSidereal(v.lagna.lon),
    chips: [],
    keyword: 'Self',
    paragraphs,
  }
}

function lordInChart(v: VedicChart, id: GrahaId): string {
  const g = v.grahas.find((x) => x.id === id)!
  const rules = g.rules.length ? ` and rules your ${list(g.rules.map((h) => ordinal(h)))} (${list(g.rules.map((h) => BHAVA_TEXT[h - 1].area))})` : ''
  const tone =
    g.dignity === 'exalted' || g.dignity === 'own' || g.dignity === 'moolatrikona'
      ? ` It is ${DIGNITY_LABEL[g.dignity].toLowerCase()}, so its period tends to deliver well.`
      : g.dignity === 'debilitated' || g.dignity === 'enemy'
        ? ` It is ${g.dignity === 'enemy' ? 'in an enemy’s sign' : 'debilitated'}, so its period may ask for more patience and effort.`
        : ''
  return `In your chart ${gname(id)} sits in your ${ordinal(g.house)} house (${BHAVA_TEXT[g.house - 1].area})${rules}, so this period especially activates those parts of your life.${tone}`
}

export function dashaReading(v: VedicChart, maha: Mahadasha, antar?: Period): VedicReading {
  const years = (d: Date) => d.getUTCFullYear()
  const paragraphs = [DASHA_TEXT[maha.lord], lordInChart(v, maha.lord)]
  if (antar && antar.lord !== maha.lord) {
    const a = v.grahas.find((x) => x.id === antar.lord)!
    paragraphs.push(
      `Within it, the ${gname(antar.lord)} sub-period (antardasha) adds its own colour: ${GRAHA_TEXT[antar.lord].keyword.toLowerCase()}, and the affairs of your ${ordinal(a.house)} house of ${BHAVA_TEXT[a.house - 1].area}.`,
    )
  }
  return {
    eyebrow: 'Mahadasha',
    title: `${gname(maha.lord)} period`,
    subtitle: `${years(maha.start)} – ${years(maha.end)}`,
    chips: [],
    keyword: GRAHA_TEXT[maha.lord].keyword,
    paragraphs,
  }
}

export function yogaReading(y: Yoga): VedicReading {
  const t = YOGA_TEXT[y.id]
  const paragraphs = [t.text]
  if (y.id === 'yogakaraka') paragraphs.unshift(`${gname(y.grahas[0])} is your yogakaraka: it ${y.detail}.`)
  else if (y.detail) paragraphs.push(`In your chart: ${list(y.grahas.map(gname))}, the ${y.detail}.`)
  else if (y.grahas.length) paragraphs.push(`In your chart it is formed by ${list(y.grahas.map(gname))}.`)
  if (y.cancelled) paragraphs.push(KEMADRUMA_CANCELLED)
  return {
    eyebrow: 'Yoga',
    title: y.cancelled ? `${t.name} (cancelled)` : t.name,
    subtitle: list(y.grahas.map(gname)),
    chips: [],
    paragraphs,
  }
}

/** A short narrative of the whole Vedic chart. */
export function vedicSummary(v: VedicChart, yogas: Yoga[], current: { maha: Mahadasha; antar: Period } | null): string[] {
  const out: string[] = []
  const moon = v.grahas.find((g) => g.id === 'moon')!
  if (v.lagna) {
    const lord = RASHIS[v.lagna.sign].lord as GrahaId
    const lg = v.grahas.find((g) => g.id === lord)!
    out.push(
      `With ${RASHIS[v.lagna.sign].name} rising, your chart is ruled by ${gname(lord)}, which sits in your ${ordinal(lg.house)} house: your life’s attention tends to flow toward ${BHAVA_TEXT[lg.house - 1].area}.`,
    )
  }
  out.push(
    `Your Moon is in ${RASHIS[moon.sign].name}, in ${moon.nakshatra.name} nakshatra: ${NAKSHATRA_TEXT[moon.nakshatra.index].meaning}.`,
  )
  const strong = v.grahas.filter((g) => g.dignity === 'exalted' || g.dignity === 'moolatrikona' || g.dignity === 'own')
  if (strong.length) out.push(`Your strongest planets by dignity are ${list(strong.map((g) => `${gname(g.id)} (${DIGNITY_LABEL[g.dignity].toLowerCase()})`))}.`)
  const weak = v.grahas.filter((g) => g.dignity === 'debilitated')
  if (weak.length) out.push(`${list(weak.map((g) => gname(g.id)))} ${weak.length === 1 ? 'is' : 'are'} debilitated, an area that asks for conscious growth.`)
  const karaka = yogas.find((y) => y.id === 'yogakaraka')
  if (karaka) out.push(`${gname(karaka.grahas[0])} is your yogakaraka, the most beneficial planet for your Lagna.`)
  if (current) out.push(`You are now in your ${gname(current.maha.lord)} mahadasha (${current.maha.start.getUTCFullYear()}–${current.maha.end.getUTCFullYear()}), in the ${gname(current.antar.lord)} sub-period.`)
  return out
}
