import type { Dignity, GrahaId } from '../astro/vedic/vedic'
import type { YogaId } from '../astro/vedic/yogas'

/*
 * Interpretive text for Jyotish (Vedic) mode. Significations follow the
 * Parashari tradition (Brihat Parashara Hora Shastra and common practice);
 * the wording is Celest's own: second person, warm, "tends to" rather than
 * certainties.
 */

export const GRAHA_TEXT: Record<GrahaId, { role: string; keyword: string; core: string }> = {
  sun: {
    role: 'The soul',
    keyword: 'Soul',
    core: 'Surya is the atma, your soul: vitality, confidence and your sense of dharma, as well as your father and your relationship with authority. Where the Sun sits shows where you seek to shine and where you meet power.',
  },
  moon: {
    role: 'The mind',
    keyword: 'Mind',
    core: 'Chandra is the manas, your mind: emotions, perceptions and peace of mind, as well as your mother and the way you are nourished. In Jyotish the Moon matters as much as the Lagna; its condition shows how settled you feel inside.',
  },
  mars: {
    role: 'Courage and will',
    keyword: 'Courage',
    core: 'Mangala is energy, courage and the will to act. It signifies siblings, land and property, technical skill and physical strength. Well placed it gives drive and protection; under strain it brings conflict, haste or accidents.',
  },
  mercury: {
    role: 'Intelligence and speech',
    keyword: 'Intellect',
    core: 'Budha is intelligence, speech, learning, commerce and wit. It signifies friends, your mother’s family and the power of discrimination. It readily takes on the colour of the planets it travels with.',
  },
  jupiter: {
    role: 'Wisdom and grace',
    keyword: 'Wisdom',
    core: 'Guru is the great benefic: wisdom, teachers, faith, dharma and good fortune. It signifies children and wealth, and traditionally a woman’s husband. Its placement shows where grace and expansion enter your life.',
  },
  venus: {
    role: 'Love and refinement',
    keyword: 'Delight',
    core: 'Shukra is love, beauty, pleasure, art and refinement. It signifies the spouse (traditionally a man’s wife), comforts, vehicles and creative talent. Its placement shows where you find delight and how you are in partnership.',
  },
  saturn: {
    role: 'Time and karma',
    keyword: 'Discipline',
    core: 'Shani is time, discipline, endurance and karma. It signifies service, hard work, old age, longevity and detachment. Saturn delays but rarely denies: what it gives is earned, and it lasts.',
  },
  rahu: {
    role: 'Desire and ambition',
    keyword: 'Hunger',
    core: 'Rahu, the north node, is desire and obsession: the hunger for experience, the foreign, the unconventional and the new. It magnifies the house it occupies, bringing ambition, appetite and restlessness there.',
  },
  ketu: {
    role: 'Detachment and insight',
    keyword: 'Release',
    core: 'Ketu, the south node, is detachment and liberation: mastery carried over from the past, intuition, spirituality and loss. It brings a sense of “been there, done that” to its house, along with insight that is hard to put into words.',
  },
}

export interface BhavaText {
  name: string
  /** Short phrase used inside sentences: "your 5th house of …". */
  area: string
  about: string
}

export const BHAVA_TEXT: BhavaText[] = [
  { name: 'Tanu bhava', area: 'self and body', about: 'The house of the self: your body, health, temperament and the overall direction of your life. Everything in the chart is read through it.' },
  { name: 'Dhana bhava', area: 'wealth and family', about: 'Wealth and resources, your family of origin, speech, food and early upbringing. It shows what you accumulate and how you speak.' },
  { name: 'Sahaja bhava', area: 'courage and effort', about: 'Courage, initiative and self-effort; siblings, communication, short journeys and skills of the hands. It grows stronger as you put in the work.' },
  { name: 'Sukha bhava', area: 'home and happiness', about: 'Inner happiness, your mother, home, land, vehicles and formal education. It shows what gives you a sense of peace and belonging.' },
  { name: 'Putra bhava', area: 'children and creativity', about: 'Children, creativity, intelligence and romance; also purva punya, the merit you bring from past lives, and devotion. It is one of the most fortunate houses.' },
  { name: 'Ripu bhava', area: 'obstacles and service', about: 'Enemies, illness, debts and competition, but also service, daily work and the ability to overcome. Facing its challenges makes you stronger.' },
  { name: 'Kalatra bhava', area: 'marriage and partnership', about: 'Marriage and the spouse, business partnerships and your dealings with the public. It mirrors the 1st: who you meet as an equal.' },
  { name: 'Ayur bhava', area: 'transformation and the hidden', about: 'Longevity, sudden events and deep transformation; inheritance, joint resources, secrets and the occult. It is the house of what lies beneath the surface.' },
  { name: 'Dharma bhava', area: 'fortune and dharma', about: 'Fortune and grace, your father, teachers and gurus, higher learning, faith and long journeys. It is the most auspicious house in the chart.' },
  { name: 'Karma bhava', area: 'career and action', about: 'Career, action and status: your work in the world and the reputation it earns. It is the most visible point of the chart.' },
  { name: 'Labha bhava', area: 'gains and friendships', about: 'Gains and income, elder siblings, friends and networks, and the fulfilment of your desires. Almost any planet does well here.' },
  { name: 'Vyaya bhava', area: 'release and liberation', about: 'Expense and loss, sleep, foreign lands, retreat and solitude; and moksha, spiritual liberation. It is where you let go.' },
]

export const HOUSE_GROUP_TEXT = {
  kendra: 'It is a kendra, one of the four pillars of the chart: planets here are strong and their results are visible.',
  trikona: 'It is a trikona, a house of fortune and dharma: the most auspicious kind of house.',
  lagna: 'As the Lagna it is both a kendra and a trikona: the root of the whole chart.',
  dusthana: 'It is a dusthana, a challenging house: it brings difficulty but also resilience, depth and, in time, liberation.',
  upachaya: 'It is an upachaya, a house of growth: what it promises improves with time and effort.',
  wealth: 'It is one of the wealth houses, tied to what you earn and keep.',
} as const

/** How a graha fares in a kind of house, by its benefic or malefic nature. */
export const PLACEMENT_TEXT = {
  beneficStrong: (n: string) => `${n} is a natural benefic in one of the chart’s strongest houses, so its gifts flow freely into this part of your life.`,
  beneficHidden: (n: string) => `${n} is a gentle planet in a difficult house. Its blessings here may come through struggle, service or inner work, and can be quieter than you’d expect.`,
  beneficOther: (n: string, area: string) => `${n} is a benefic in a house of resources, quietly supporting your ${area}.`,
  maleficGrowth: (n: string) => `Malefics thrive in the houses of growth: here ${n} gives grit, competitiveness and the stamina to keep improving over time.`,
  maleficStrong: (n: string) => `${n} is a malefic in a prominent house. It brings intensity and pressure here, which can be productive but needs conscious handling.`,
  maleficHidden: (n: string) => `${n} is a malefic in a hidden house. It can stir up difficulty here, but it also gives depth, resilience and the ability to face what others avoid.`,
  maleficWealth: (n: string) => `${n} is a malefic in the house of family and speech. It can make your words sharp, and asks you to manage resources and family ties with care.`,
}

export const DIGNITY_LABEL: Record<Dignity, string> = {
  exalted: 'Exalted',
  moolatrikona: 'Moolatrikona',
  own: 'Own sign',
  friend: 'Friendly sign',
  neutral: 'Neutral sign',
  enemy: 'Enemy sign',
  debilitated: 'Debilitated',
}

export const DIGNITY_TEXT: Record<Dignity, ((n: string) => string) | null> = {
  exalted: (n) => `${n} is exalted (uccha), at the height of its power. Its significations are strong, generous and reliable in your life.`,
  moolatrikona: (n) => `${n} is in its moolatrikona, its “office”: it works with purpose and authority, almost as strong as exaltation.`,
  own: (n) => `${n} is in its own sign (swakshetra). Comfortable and self-reliant, it delivers its results steadily.`,
  friend: (n) => `${n} is in a friend’s sign, where it is welcomed and works well.`,
  neutral: null,
  enemy: (n) => `${n} is in an enemy’s sign. It has to work harder here, and its results can come with some friction.`,
  debilitated: (n) =>
    `${n} is debilitated (neecha), at its weakest. Its significations may need conscious effort to develop. Debilitation is often softened by other factors (neecha bhanga), and many remarkable charts have a debilitated planet.`,
}

export const COMBUST_TEXT = (n: string) =>
  `${n} is combust (asta), close enough to the Sun to be lost in its light. Its significations are absorbed into the Sun’s agenda and can be harder to express on their own terms.`

export const RETRO_TEXT = (n: string) =>
  `${n} is retrograde (vakri). Its energy turns inward and revisits old ground; retrograde planets are considered strong in Jyotish, but they act in unusual, personal ways.`

export interface NakshatraText {
  deity: string
  symbol: string
  meaning: string
}

export const NAKSHATRA_TEXT: NakshatraText[] = [
  { deity: 'the Ashwini Kumaras, divine physicians', symbol: 'a horse’s head', meaning: 'swift, healing and pioneering: quick to start things and quick to help' },
  { deity: 'Yama, lord of dharma and death', symbol: 'the yoni', meaning: 'bearing and restraint: intense, creative, and able to carry great responsibility' },
  { deity: 'Agni, the sacred fire', symbol: 'a flame or razor', meaning: 'sharp, purifying and protective: it cuts through to the truth' },
  { deity: 'Brahma, the creator', symbol: 'a chariot', meaning: 'fertile, beautiful and magnetic: it loves comfort, growth and making things' },
  { deity: 'Soma, the nectar of the Moon', symbol: 'a deer’s head', meaning: 'curious, gentle and searching: always looking for what lies over the next hill' },
  { deity: 'Rudra, the storm', symbol: 'a teardrop', meaning: 'storm and renewal: intense feelings that clear the air and make room for growth' },
  { deity: 'Aditi, mother of the gods', symbol: 'a quiver of arrows', meaning: 'the return of the light: resilient, generous and optimistic, able to begin again' },
  { deity: 'Brihaspati, teacher of the gods', symbol: 'a cow’s udder', meaning: 'nourishing, devoted and protective; considered the most auspicious of the nakshatras' },
  { deity: 'the Nagas, serpent deities', symbol: 'a coiled serpent', meaning: 'perceptive, hypnotic and guarded: deep insight and strong instincts' },
  { deity: 'the Pitris, the ancestors', symbol: 'a throne', meaning: 'royal and proud, rooted in lineage, tradition and the honour of the family' },
  { deity: 'Bhaga, god of delight', symbol: 'the front legs of a bed', meaning: 'pleasure, rest, romance and creative enjoyment' },
  { deity: 'Aryaman, god of contracts and friendship', symbol: 'the back legs of a bed', meaning: 'loyal and generous: it keeps its word and builds lasting bonds' },
  { deity: 'Savitar, the creative sun', symbol: 'a hand', meaning: 'skilful, resourceful and humorous, clever with the hands and the mind' },
  { deity: 'Tvashtar, the celestial architect', symbol: 'a bright jewel', meaning: 'artistic and brilliant, drawn to beauty, design and making things shine' },
  { deity: 'Vayu, the wind', symbol: 'a young shoot blowing in the wind', meaning: 'independent, adaptable and diplomatic: it needs room to move' },
  { deity: 'Indra and Agni, power and fire', symbol: 'a triumphal arch', meaning: 'goal-driven and determined, single-minded in pursuit of what it wants' },
  { deity: 'Mitra, god of friendship', symbol: 'a lotus', meaning: 'devotion and cooperation: it succeeds through friendship, often far from home' },
  { deity: 'Indra, king of the gods', symbol: 'an earring or umbrella', meaning: 'the eldest: protective and capable, carrying responsibility and power' },
  { deity: 'Nirriti, goddess of dissolution', symbol: 'roots tied together', meaning: 'getting to the root of things: investigation, upheaval and the search for truth' },
  { deity: 'Apas, the waters', symbol: 'a fan', meaning: 'invincible and persuasive: a confidence that is hard to dent' },
  { deity: 'the Vishvadevas, universal gods', symbol: 'an elephant’s tusk', meaning: 'the final victory: principled, enduring and quietly powerful' },
  { deity: 'Vishnu, the preserver', symbol: 'an ear', meaning: 'listening, learning and connecting: wisdom gained by hearing' },
  { deity: 'the eight Vasus, gods of abundance', symbol: 'a drum', meaning: 'rhythm, wealth, music and generosity' },
  { deity: 'Varuna, lord of the cosmic waters', symbol: 'an empty circle', meaning: 'the “hundred healers”: secretive, scientific and healing, a mystic who works alone' },
  { deity: 'Aja Ekapada, the one-footed goat', symbol: 'a sword', meaning: 'fiery idealism and intensity: transformation through passion' },
  { deity: 'Ahir Budhnya, serpent of the deep', symbol: 'twins', meaning: 'depth, wisdom, patience and self-control' },
  { deity: 'Pushan, the nourisher and guide', symbol: 'a fish', meaning: 'gentle guidance, compassion, safe journeys and completion' },
]

export const DASHA_TEXT: Record<GrahaId, string> = {
  ketu: 'A Ketu period turns you inward: detachment, spiritual searching, endings and sudden changes that clear away what is no longer needed.',
  venus: 'A Venus period, the longest of all, brings relationships, pleasure, comfort, creativity and material growth to the fore.',
  sun: 'A Sun period highlights identity and authority: career recognition, leadership, and your relationship with your father and people in power.',
  moon: 'A Moon period centres on emotions, home, your mother and the public. Your inner life and wellbeing take priority.',
  mars: 'A Mars period brings energy, ambition, property matters, competition and courage, and asks you to manage conflict and haste.',
  rahu: 'A Rahu period is intense and ambitious: worldly desire, foreign connections, unconventional paths and sudden rises, along with restlessness.',
  jupiter: 'A Jupiter period is expansive: learning, teachers, children, faith, wealth and good counsel tend to come forward.',
  saturn: 'A Saturn period is a time of discipline and responsibility: hard work, structure and patience that build something lasting, though it can feel heavy.',
  mercury: 'A Mercury period favours learning, communication, business, writing and networks. The mind is busy and versatile.',
}

export const YOGA_TEXT: Record<YogaId, { name: string; text: string }> = {
  gajakesari: {
    name: 'Gajakesari yoga',
    text: 'Jupiter in a kendra from the Moon: the “elephant and lion”. It is said to give wisdom, a good reputation, lasting prosperity and the respect of others.',
  },
  'budha-aditya': {
    name: 'Budha-Aditya yoga',
    text: 'The Sun and Mercury together. It sharpens intelligence and communication and is linked with learning and skill in speech. It is common, since Mercury never strays far from the Sun, and strongest when Mercury is not combust.',
  },
  'chandra-mangala': {
    name: 'Chandra-Mangala yoga',
    text: 'The Moon and Mars together. It gives drive and enterprise, especially around earning, along with strong emotions that need a healthy outlet.',
  },
  ruchaka: { name: 'Ruchaka yoga', text: 'One of the five Mahapurusha yogas: a strong Mars in a kendra. It gives courage, leadership, physical vitality and a commanding presence.' },
  bhadra: { name: 'Bhadra yoga', text: 'One of the five Mahapurusha yogas: a strong Mercury in a kendra. It gives a sharp intellect, eloquence, business sense and a youthful manner.' },
  hamsa: { name: 'Hamsa yoga', text: 'One of the five Mahapurusha yogas: a strong Jupiter in a kendra. It gives wisdom, integrity, good fortune and the respect of learned people.' },
  malavya: { name: 'Malavya yoga', text: 'One of the five Mahapurusha yogas: a strong Venus in a kendra. It gives charm, artistic taste, comfort, a happy marriage and enjoyment of life.' },
  sasha: { name: 'Sasha yoga', text: 'One of the five Mahapurusha yogas: a strong Saturn in a kendra. It gives authority built through discipline, organisational power and influence over many people.' },
  yogakaraka: {
    name: 'Yogakaraka',
    text: 'This planet rules both a kendra and a trikona from your Lagna, which makes it the single most beneficial planet in your chart. Its placement, and its dasha, deserve special attention.',
  },
  raja: {
    name: 'Raja yoga',
    text: 'The lords of a kendra and a trikona join together. Raja yogas combine effort with fortune, and are associated with a rise in status and success, especially during the dashas of the planets involved.',
  },
  'viparita-raja': {
    name: 'Viparita Raja yoga',
    text: 'A lord of a difficult house sits in another difficult house, so the difficulties cancel out. Setbacks tend to turn in your favour: you may rise through adversity, or through the stumbles of opponents.',
  },
  parivartana: {
    name: 'Parivartana yoga',
    text: 'Two planets exchange signs, each sitting in the other’s. They act as if each were at home, strongly linking the parts of your life they rule.',
  },
  sunapha: { name: 'Sunapha yoga', text: 'Planets in the 2nd from the Moon. It gives self-made wealth, intelligence and a good reputation.' },
  anapha: { name: 'Anapha yoga', text: 'Planets in the 12th from the Moon. It gives good health, a pleasant personality and a calm, self-contained nature.' },
  durudhara: { name: 'Durudhara yoga', text: 'Planets on both sides of the Moon. It gives wealth, generosity, comfort and a supportive circle around you.' },
  kemadruma: {
    name: 'Kemadruma yoga',
    text: 'No planets on either side of the Moon. It is linked with times of feeling unsupported or alone, and with a self-reliance learned the hard way.',
  },
}

export const KEMADRUMA_CANCELLED =
  'Here it is cancelled (Kemadruma bhanga) because a planet sits in a kendra from the Moon, which traditionally removes its effects.'
