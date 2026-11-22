import type { AspectType } from '../astro/aspects'
import type { BodyId, Element, Modality, SignId } from '../astro/zodiac'

export interface BodyText {
  keyword: string
  /** What this body describes in a life — one or two sentences, second person. */
  core: string
  /** Short role used in Big Three and lists. */
  role: string
}

export const BODY_TEXT: Record<BodyId, BodyText> = {
  sun: {
    keyword: 'Purpose',
    role: 'Your core self',
    core: 'Your Sun is the steady centre of you: what gives you energy, what you’re here to grow into, and the light you shine when you feel most yourself.',
  },
  moon: {
    keyword: 'Feeling',
    role: 'Your emotional needs',
    core: 'Your Moon is your emotional weather: what soothes you, what you reach for when you’re tired, and what you need in order to feel at home in yourself.',
  },
  mercury: {
    keyword: 'Mind',
    role: 'How you think and speak',
    core: 'Mercury is the way your mind moves: how you learn, how you talk, what you notice first and how you piece the world together.',
  },
  venus: {
    keyword: 'Love',
    role: 'What you love and value',
    core: 'Venus shows what you find beautiful and how you love: the kind of closeness you crave, your taste, and the things you’d gladly spend on.',
  },
  mars: {
    keyword: 'Drive',
    role: 'How you act and assert',
    core: 'Mars is your engine: how you go after what you want, how you handle conflict, and what gets your blood up.',
  },
  jupiter: {
    keyword: 'Growth',
    role: 'Where you expand',
    core: 'Jupiter marks where life tends to open doors for you: where you’re generous, optimistic and willing to take a leap of faith.',
  },
  saturn: {
    keyword: 'Mastery',
    role: 'Where you build',
    core: 'Saturn is where you’re asked to slow down and do the real work. It can feel like pressure early on, and it often becomes your hardest-won strength.',
  },
  uranus: {
    keyword: 'Change',
    role: 'Where you break the mould',
    core: 'Uranus shows where you need freedom and won’t settle for the usual script: your restless, inventive, slightly electric streak.',
  },
  neptune: {
    keyword: 'Dreams',
    role: 'Where you dissolve',
    core: 'Neptune is your sense of the ineffable: imagination, compassion, longing and the places where the edges of things go soft.',
  },
  pluto: {
    keyword: 'Power',
    role: 'Where you transform',
    core: 'Pluto points to your depths: what you can’t do halfway, where you meet intensity, and where you’re capable of total reinvention.',
  },
  node: {
    keyword: 'Direction',
    role: 'Your growing edge',
    core: 'The North Node isn’t a planet but a point where the Moon’s path crosses the Sun’s. It’s often read as a direction of growth: unfamiliar, a little uncomfortable and deeply rewarding.',
  },
  chiron: {
    keyword: 'Healing',
    role: 'Your tender spot',
    core: 'Chiron is a small, comet-like body. It marks a sensitive place you’ve had to learn about the hard way, and where you can end up being a gifted guide for others.',
  },
}

export interface SignText {
  /** Adjective used to build keywords, e.g. "Dreamy" */
  adjective: string
  /** "In Pisces, ..." – how any planet behaves in this sign. */
  style: string
  /** Big Three: one line on the Sun/Moon/Rising in this sign. */
  sun: string
  moon: string
  rising: string
  /** Shown when a sign segment is selected. */
  about: string
}

export const SIGN_TEXT: Record<SignId, SignText> = {
  aries: {
    adjective: 'Bold',
    style: 'Aries gives it a quick, direct, first-one-through-the-door quality. It works best when it’s allowed to start things and act on instinct.',
    sun: 'A natural initiator who comes alive when there’s something to begin.',
    moon: 'You feel things fast and need room to act on them.',
    rising: 'You come across as direct, energetic and ready to go.',
    about: 'Aries is the spark at the start of the zodiac: courageous, impatient, honest and alive to the moment.',
  },
  taurus: {
    adjective: 'Steady',
    style: 'Taurus slows it down and grounds it in the senses. It works best with time, comfort, and something real to hold on to.',
    sun: 'Patient and grounded, you build things that last.',
    moon: 'Comfort, routine and good food go a long way for you.',
    rising: 'You come across as calm, unhurried and quietly sure of yourself.',
    about: 'Taurus is earth in bloom: sensual, loyal, unhurried and stubborn in the best and worst ways.',
  },
  gemini: {
    adjective: 'Curious',
    style: 'Gemini makes it nimble, talkative and endlessly curious. It works best with variety, conversation and something new to figure out.',
    sun: 'Curious and quick, you collect ideas and people.',
    moon: 'Talking it through is how you process what you feel.',
    rising: 'You come across as bright, chatty and hard to pin down.',
    about: 'Gemini is the messenger: witty, adaptable, restless and fascinated by how everything connects.',
  },
  cancer: {
    adjective: 'Tender',
    style: 'Cancer wraps it in feeling and memory. It works best when it can protect, nurture and come home to people it trusts.',
    sun: 'Deeply caring, you make spaces where people feel held.',
    moon: 'You need a true home base, a place and people to retreat to.',
    rising: 'You come across as warm, a little guarded at first, and instinctively kind.',
    about: 'Cancer is the shell and the tide: protective, intuitive, sentimental and fiercely loyal to its own.',
  },
  leo: {
    adjective: 'Radiant',
    style: 'Leo gives it warmth, colour and a flair for the dramatic. It works best when it can create, express and be seen with its whole heart.',
    sun: 'Big-hearted and expressive, you’re meant to be seen.',
    moon: 'You feel safest when you feel appreciated and adored.',
    rising: 'You come across as warm, confident and naturally magnetic.',
    about: 'Leo is the midsummer sun: generous, playful, proud and made for wholehearted self-expression.',
  },
  virgo: {
    adjective: 'Precise',
    style: 'Virgo makes it careful, observant and quietly devoted. It works best when it can improve something, be useful and get the details right.',
    sun: 'Thoughtful and capable, you make things better by paying attention.',
    moon: 'Order and small, useful routines calm your nerves.',
    rising: 'You come across as composed, observant and quietly competent.',
    about: 'Virgo is the harvest: discerning, helpful, modest and quietly brilliant at craft.',
  },
  libra: {
    adjective: 'Gracious',
    style: 'Libra gives it grace, fairness and an eye for balance. It works best in partnership, where it can weigh both sides and make things beautiful.',
    sun: 'A natural diplomat with an eye for beauty and balance.',
    moon: 'Harmony around you is harmony within you.',
    rising: 'You come across as charming, easy to be with and finely tuned to others.',
    about: 'Libra is the scales: gracious, fair-minded, sociable and devoted to beauty and balance.',
  },
  scorpio: {
    adjective: 'Intense',
    style: 'Scorpio takes it deep. It works best when it can go all the way in, trust slowly and transform what it touches.',
    sun: 'Intense and perceptive, you see beneath the surface.',
    moon: 'You feel everything deeply and trust slowly.',
    rising: 'You come across as magnetic, private and quietly powerful.',
    about: 'Scorpio is still water running deep: passionate, perceptive, private and unafraid of the dark.',
  },
  sagittarius: {
    adjective: 'Adventurous',
    style: 'Sagittarius gives it range, humour and a hunger for meaning. It works best with open horizons and a bigger question to chase.',
    sun: 'A seeker and storyteller, always aiming at the horizon.',
    moon: 'Freedom and a sense of adventure keep you emotionally well.',
    rising: 'You come across as open, funny and up for anything.',
    about: 'Sagittarius is the archer: optimistic, philosophical, blunt and forever heading somewhere new.',
  },
  capricorn: {
    adjective: 'Ambitious',
    style: 'Capricorn makes it disciplined, strategic and built for the long climb. It works best with a clear goal and room to earn its place.',
    sun: 'Determined and wise beyond your years, you play the long game.',
    moon: 'You feel steadier when life has structure and purpose.',
    rising: 'You come across as capable, composed and quietly serious.',
    about: 'Capricorn is the mountain goat: patient, responsible, dryly funny and steadily climbing.',
  },
  aquarius: {
    adjective: 'Visionary',
    style: 'Aquarius makes it independent, inventive and future-minded. It works best when it can think freely and serve something bigger than itself.',
    sun: 'An original thinker who cares about the bigger picture.',
    moon: 'You need space to be yourself, even with the people you love.',
    rising: 'You come across as friendly, a little unusual and unmistakably yourself.',
    about: 'Aquarius is the water-bearer: independent, humane, eccentric and ahead of its time.',
  },
  pisces: {
    adjective: 'Dreamy',
    style: 'Pisces makes it intuitive, compassionate and fluid. It works best when it trusts feeling over logic and has room to imagine.',
    sun: 'Imaginative and empathic, you feel the world in full colour.',
    moon: 'You absorb the moods around you and need time to drift and recover.',
    rising: 'You come across as gentle, receptive and a little otherworldly.',
    about: 'Pisces is the ocean at the end of the zodiac: imaginative, compassionate, porous and quietly wise.',
  },
}

export const HOUSE_TEXT: { area: string; about: string }[] = [
  { area: 'self & first impressions', about: 'The 1st house is you: your body, your instincts and the way you meet the world.' },
  { area: 'money & self-worth', about: 'The 2nd house covers what you own and value, including how you value yourself.' },
  { area: 'communication & neighbourhood', about: 'The 3rd house is everyday thinking and talking: siblings, neighbours, learning and short trips.' },
  { area: 'home & roots', about: 'The 4th house is your foundation: home, family, ancestry and your private inner life.' },
  { area: 'creativity & joy', about: 'The 5th house is play: romance, creativity, children and whatever makes your heart glow.' },
  { area: 'work & wellbeing', about: 'The 6th house holds daily life: routines, work, service and the care of your body.' },
  { area: 'partnership', about: 'The 7th house is the people you pair with: partners, collaborators and open rivals.' },
  { area: 'intimacy & shared resources', about: 'The 8th house is depth: intimacy, trust, shared money, endings and rebirths.' },
  { area: 'meaning & exploration', about: 'The 9th house is the long journey: travel, study, belief and the search for meaning.' },
  { area: 'career & reputation', about: 'The 10th house is your public life: career, ambition, reputation and legacy.' },
  { area: 'friendship & community', about: 'The 11th house is your people: friends, communities, causes and hopes for the future.' },
  { area: 'rest & the unseen', about: 'The 12th house is the quiet back room: solitude, dreams, the unconscious and what you keep hidden.' },
]

export const ASPECT_TEXT: Record<AspectType, { verb: string; about: string; keyword: string }> = {
  conjunction: {
    verb: 'merges with',
    keyword: 'Fusion',
    about: 'A conjunction fuses two energies into one. They act together, for better or worse, and are hard to tell apart.',
  },
  sextile: {
    verb: 'supports',
    keyword: 'Opportunity',
    about: 'A sextile is a friendly opening between two energies. They cooperate easily once you make the first move.',
  },
  square: {
    verb: 'challenges',
    keyword: 'Friction',
    about: 'A square creates friction between two energies that want different things. It’s uncomfortable and motivating, and a source of real drive.',
  },
  trine: {
    verb: 'flows with',
    keyword: 'Harmony',
    about: 'A trine is an easy, natural flow between two energies: a gift that comes so naturally you might take it for granted.',
  },
  opposition: {
    verb: 'pulls against',
    keyword: 'Polarity',
    about: 'An opposition stretches two energies across the chart. The work is balance: learning to hold both ends at once, often through other people.',
  },
}

export const ELEMENT_TEXT: Record<Element, { label: string; about: string }> = {
  fire: { label: 'Fire', about: 'Spirit, enthusiasm, courage' },
  earth: { label: 'Earth', about: 'Practicality, patience, the senses' },
  air: { label: 'Air', about: 'Ideas, connection, perspective' },
  water: { label: 'Water', about: 'Feeling, intuition, empathy' },
}

export const MODALITY_TEXT: Record<Modality, { label: string; about: string }> = {
  cardinal: { label: 'Cardinal', about: 'Starting things' },
  fixed: { label: 'Fixed', about: 'Sustaining things' },
  mutable: { label: 'Mutable', about: 'Adapting things' },
}

export const ANGLE_TEXT = {
  asc: {
    name: 'Ascendant',
    short: 'Rising',
    about: 'The Ascendant, or Rising sign, is the degree of the zodiac that was rising on the eastern horizon when you were born. It shapes your first impressions, your instincts and the doorway you walk through into the world.',
  },
  mc: {
    name: 'Midheaven',
    short: 'MC',
    about: 'The Midheaven is the highest point of the zodiac at your birth. It describes your public direction: vocation, reputation and what you hope to be known for.',
  },
}
