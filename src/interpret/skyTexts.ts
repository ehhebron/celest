import type { AspectType } from '../astro/aspects'
import type { SectRole, SkyEventKind } from '../astro/horizon'
import type { BodyId } from '../astro/zodiac'

/*
 * Interpretive text for the side view. A planet's place in the daily turning
 * of the sky points to an area of life, an idea as old as the Hellenistic
 * angles and echoed in modern research on planets near the horizon and
 * meridian:
 *
 *   rise      eastern horizon     self, body, personality, how you begin
 *   culminate top of the sky      career, reputation, public role
 *   set       western horizon     partners, close relationships, others
 *   lower     bottom of the sky   home, family, roots, private inner life
 *
 * Written in the same voice as texts.ts: second person, warm, "tends to"
 * rather than certainties.
 */

export type Zone = SkyEventKind

export const ZONE_AREA: Record<Zone, string> = {
  rise: 'your personality, your body and the way you start things',
  culminate: 'your career, reputation and public role',
  set: 'your partnerships and close one-to-one relationships',
  lower: 'your home, family and private inner life',
}

/** Where a body in this part of the sky was, loosely: each zone spans a quarter of the daily turn. */
export const ZONE_WHERE: Record<Zone, string> = {
  rise: 'on the rising side of the sky',
  culminate: 'toward the top of the sky',
  set: 'on the setting side of the sky',
  lower: 'toward the bottom of the sky',
}

/** For bodies right on an angle. */
export const ZONE_AT: Record<Zone, string> = {
  rise: 'right on the eastern horizon',
  culminate: 'right at the top of the sky',
  set: 'right on the western horizon',
  lower: 'right at the bottom of the sky, beneath your feet',
}

export const ZONE_TITLE: Record<Zone, string> = {
  rise: 'Rising',
  culminate: 'Culminating',
  set: 'Setting',
  lower: 'At the roots',
}

/** "What it is in you": used to talk about planets inside sentences. */
export const BODY_THEME: Record<BodyId, string> = {
  sun: 'sense of purpose',
  moon: 'emotional needs',
  mercury: 'mind and voice',
  venus: 'way of loving',
  mars: 'drive and courage',
  jupiter: 'luck and generosity',
  saturn: 'discipline and sense of responsibility',
  uranus: 'need for freedom',
  neptune: 'imagination and sensitivity',
  pluto: 'intensity',
  node: 'direction of growth',
  chiron: 'old wounds and gift for healing',
}

/** What each planet means for the person in each part of the sky. */
export const BODY_ZONE_TEXT: Record<BodyId, Record<Zone, string>> = {
  sun: {
    rise: 'You lead with who you are. Your sense of purpose is out front and hard to hide: people pick up on your energy and intentions quickly, and you feel most alive when you’re acting on your own initiative.',
    culminate: 'Your purpose is tied to what you do in the world. You want your life to visibly amount to something, and recognition, responsibility or a public role can be where you feel most yourself.',
    set: 'You come into your own through other people. Partnerships, collaborations and close relationships are where your purpose lights up, and you may first recognise your own strengths when someone reflects them back to you.',
    lower: 'Your purpose is rooted in private life. Home, family, ancestry and an inner sense of meaning matter more to you than outward recognition, and your strength tends to build quietly before anyone else sees it.',
  },
  moon: {
    rise: 'Your feelings sit close to the surface and show on your face. You respond on instinct and people sense your moods; caring for others, and needing care yourself, is part of your visible personality.',
    culminate: 'Your emotional life is bound up with your public life. You may be drawn to work that nurtures, serves or connects with people, and you need your role in the world to feel meaningful, not just successful.',
    set: 'You find emotional security through close relationships. You tune in to partners’ needs, sometimes more than your own, and you feel safest when you have someone to share daily life with.',
    lower: 'Your emotional roots go deep. Home, family and a private sanctuary are essential to your wellbeing, and you process feelings inwardly, often needing time alone to know what you really feel.',
  },
  mercury: {
    rise: 'Your mind is part of your first impression. You think on your feet, talk readily and are often seen as quick, curious or witty; ideas tend to come out before you’ve finished thinking them.',
    culminate: 'Your mind and voice are tied to your work and reputation. Communicating, writing, teaching, trading or analysing can be central to your career, and you may become known for what you say or know.',
    set: 'You think best in conversation. Ideas sharpen when you bounce them off other people, and you’re drawn to partners who are clever, talkative or who challenge how you see things.',
    lower: 'Your mind works in private. You tend to think things through quietly before you speak, and your curiosity often turns toward memory, family history, psychology or the world inside you.',
  },
  venus: {
    rise: 'Charm is part of how you meet the world. People tend to find you warm, pleasing or attractive, and you naturally smooth things over; beauty and style matter to how you present yourself.',
    culminate: 'Your values and talents can shape your public life. Art, design, diplomacy or anything involving people and beauty can become a calling, and you’re often well liked in your field.',
    set: 'Love is one of the great themes of your life. Relationships are central to your happiness, you’re a natural partner and peacemaker, and many of your opportunities come through the people you’re close to.',
    lower: 'Your way of loving is private and deep. You value home, comfort and a few close bonds over a wide social circle, and you find beauty in your surroundings, your family and your memories.',
  },
  mars: {
    rise: 'Your drive is out front. You come across as direct, energetic and ready to act, and you go after what you want rather than waiting. Learning to pace that fire is part of your path.',
    culminate: 'Your ambition is visible. You’re driven to achieve, compete or fight for something in public, and your career may involve leadership, risk, physical effort or standing up for others.',
    set: 'Your fire tends to show up in relationships. You may attract strong, assertive partners or rivals, and conflict with others is often how you discover your own strength and boundaries.',
    lower: 'Your drive works beneath the surface. You may carry strong feelings about home and family, and your energy goes into private projects, inner resolve and protecting the people closest to you.',
  },
  jupiter: {
    rise: 'Optimism is part of your nature. People tend to see you as generous, open or larger than life, and you often find that confidence and a willingness to say yes open doors for you.',
    culminate: 'Opportunity tends to find you through your work and public life. This is a classic placement for growth in career and reputation: mentors, recognition and a sense of mission can come more readily to you.',
    set: 'Your luck comes through other people. Partners, clients, teachers and allies can be generous to you, and some of your best growth happens through relationships and agreements.',
    lower: 'Your good fortune is rooted at home. Family, property, heritage or a rich inner life can be sources of abundance, and your faith grows from private experience more than public success.',
  },
  saturn: {
    rise: 'You may come across as serious, reserved or older than your years. Early life can ask a lot of you, and your self-confidence tends to be earned slowly, becoming solid and dependable over time.',
    culminate: 'Your career is where you do the hard work. You may meet pressure, delays or high standards in public life, and you can build a lasting reputation through persistence; success often comes later, and it lasts.',
    set: 'Relationships are where you learn commitment. You may be drawn to older or more serious partners, or feel that relationships carry real weight; the bonds you do build are made to last.',
    lower: 'Your foundations are where the work is. Home or family may have felt demanding or restrictive, and building your own sense of security is a lifelong project that becomes one of your real strengths.',
  },
  uranus: {
    rise: 'You come across as original, unpredictable or a little unconventional. You need the freedom to be yourself, and you resist being boxed in by other people’s expectations.',
    culminate: 'Your path in the world is unconventional. Sudden changes of direction, innovation, or work outside the usual structures can define your career.',
    set: 'You need freedom within relationships. You may attract unusual or independent partners, and relationships can arrive, or change, suddenly.',
    lower: 'Home life may have been unsettled or out of the ordinary, and you need room to reinvent your private life on your own terms.',
  },
  neptune: {
    rise: 'You come across as gentle, elusive or hard to pin down, and you absorb the moods around you. Imagination comes naturally; boundaries take practice.',
    culminate: 'You may be drawn to creative, spiritual or caring work, or find your public path hard to define. Your ideals inspire others when you give them a concrete form.',
    set: 'You can idealise the people you love. Your relationships can be deeply compassionate, even spiritual, and you learn to see partners clearly as well as lovingly.',
    lower: 'Your inner life is rich and dreamlike. Home is a refuge for your imagination, though family patterns may have been confusing or hard to see clearly.',
  },
  pluto: {
    rise: 'You have an intense presence, even when you say little. People feel your depth, and reinventing yourself is a recurring theme in your life.',
    culminate: 'You’re drawn to power, influence or transformative work, and your career can go through dramatic endings and rebirths.',
    set: 'Relationships are intense and transformative for you. Close bonds change you deeply, and trust and control are part of what you learn through them.',
    lower: 'Deep family undercurrents shape you. Your private life is where your most powerful transformations take place.',
  },
  node: {
    rise: 'Your direction of growth is about becoming more fully yourself: taking initiative and stepping forward on your own terms.',
    culminate: 'Your direction of growth points toward your public life and vocation: stepping into a role that is bigger than you.',
    set: 'Your direction of growth points toward partnership: learning through others, cooperation and commitment.',
    lower: 'Your direction of growth points inward, toward home, roots and building emotional foundations.',
  },
  chiron: {
    rise: 'Your sensitivities are visible, and your own healing becomes something you can offer to others.',
    culminate: 'Old wounds around recognition or achievement can turn into a calling to help, teach or heal.',
    set: 'Relationships are where old wounds surface, and also where you learn to heal and help others heal.',
    lower: 'Your deepest wound is private, often tied to family or belonging, and tending it gives you great empathy.',
  },
}

/** Nuance for which side of the angle the planet was on: [still approaching, just past]. */
export const ZONE_TIMING: Record<Zone, [before: string, after: string]> = {
  rise: [
    'It was just below the horizon, about to rise: this side of you tends to come forward more as you grow older.',
    'It had just risen, so this has been part of you from the start.',
  ],
  culminate: [
    'It was still climbing toward its peak, which suggests this grows in importance over the course of your life.',
    'It had just passed its peak, which suggests something that matures early and then deepens.',
  ],
  set: [
    'It was still above the horizon as it set, so this shows openly in how you relate.',
    'It had just dipped below the western horizon, so this works more privately within your relationships.',
  ],
  lower: [
    'It was moving toward the very bottom of the sky, so this is still settling into your foundations.',
    'It had passed the lowest point and was turning back toward the east: something that starts private and slowly comes into view.',
  ],
}

export function strengthText(hours: number): string {
  const h = Math.abs(hours)
  if (h < 1) return 'This is one of the most emphasised placements in your chart.'
  if (h < 2) return 'This is a clear emphasis in your chart.'
  return 'It was some way from the angle, so this is a softer, background note.'
}

/** Sect: what the planet’s role in a day or night chart means for the person. */
export const SECT_TEXT: Record<'sun' | 'moon' | 'jupiter' | 'venus' | 'saturn' | 'mars', Partial<Record<SectRole, string>>> = {
  sun: {
    'sect-light':
      'Born by day, your Sun leads your chart. Your conscious goals and sense of purpose steer your life more than your moods do, and you thrive when you have a clear direction and room to shine.',
    'luminary-contrary':
      'Born at night, your Sun is not your chart’s leader. Your sense of purpose is real, but it’s your inner life and instincts that do the steering; you tend to find your direction gradually, by feel rather than by plan.',
  },
  moon: {
    'sect-light':
      'Born at night, your Moon leads your chart. Your feelings, intuition and body wisdom are your best guide, and your wellbeing depends on honouring your emotional needs rather than overriding them.',
    'luminary-contrary':
      'Born by day, your Moon plays a supporting role. Your emotional needs can take a back seat to your goals, so part of your work is noticing them before they have to shout for attention.',
  },
  jupiter: {
    'benefic-of-sect':
      'Jupiter is your most reliable source of good fortune. Opportunities in its areas tend to arrive cleanly and generously, and trusting your optimism usually pays off.',
    'benefic-contrary':
      'Jupiter still brings you opportunity, but its gifts can come mixed: too much of a good thing, or growth that asks you to stay grounded. Your more dependable ally is Venus.',
  },
  venus: {
    'benefic-of-sect':
      'Venus is your most reliable source of good fortune. Love, friendship, pleasure and beauty tend to support you, and relationships are often where life goes right for you.',
    'benefic-contrary':
      'Venus still brings pleasure and connection, but its gifts can come with complications: attractions that aren’t simple, or comforts that cost something. Your more dependable ally is Jupiter.',
  },
  saturn: {
    'malefic-of-sect':
      'Saturn is a constructive force for you. Discipline, patience and responsibility tend to pay off, and the structures you build through effort become lasting achievements.',
    'malefic-contrary':
      'Saturn is your chart’s biggest test. Limits, delays, self-doubt or heavy responsibility can show up in its areas, especially early in life. Working steadily with them, rather than against them, is where your greatest maturity comes from.',
  },
  mars: {
    'malefic-of-sect':
      'Mars is a constructive force for you. Your courage and drive are usable and well directed, and healthy competition or honest conflict tends to make you stronger.',
    'malefic-contrary':
      'Mars is your chart’s biggest test. Anger, impatience, conflict or burnout can flare up in its areas. Learning to turn that heat into decisive action, rather than friction, is one of your major life lessons.',
  },
}

export const MERCURY_SECT_TEXT = {
  diurnal: [
    'Your Mercury is a morning planet, on the day team. That gives your thinking a forward, outward quality: you like to act on ideas and see them work in the world.',
    'It matches your day chart, so your mind works with the grain of your life.',
    'Your chart is a night chart, though, so your outward-facing mind can feel slightly out of step with your more inward nature.',
  ],
  nocturnal: [
    'Your Mercury is an evening planet, on the night team. That gives your thinking a reflective, receptive quality: you take ideas in, mull them over and come back with something considered.',
    'It matches your night chart, so your mind works with the grain of your life.',
    'Your chart is a day chart, though, so your reflective mind can feel slightly out of step with your more outward life.',
  ],
} as const

export const HALB_TEXT = 'It also sits on its favoured side of the horizon, which tradition says lets these strengths come through especially clearly.'

/** Planet-specific readings of closeness to the Sun. */
export const COMBUST_TEXT: Partial<Record<BodyId, string>> = {
  mercury: 'Your Mercury was close to the Sun, so your thinking and your identity are tightly linked. You may take your ideas very personally, and find it hard to separate what you think from who you are.',
  venus: 'Your Venus was close to the Sun, so love and identity are tightly woven. What you value and who you love can feel like a direct expression of yourself, which makes relationships deeply personal.',
  mars: 'Your Mars was close to the Sun, so your drive and your identity run hot together. You may feel compelled to act on your will, and learning when not to push is part of your growth.',
  jupiter: 'Your Jupiter was close to the Sun, so your optimism is bound up with your sense of self. Your growth comes through confidence, though it can be hard to see where generosity ends and pride begins.',
  saturn: 'Your Saturn was close to the Sun, so responsibility and identity are intertwined. You may feel you have to earn your place, and you become, over time, someone others rely on.',
}

export const CAZIMI_TEXT =
  'It was cazimi, “in the heart of the Sun”: one of the rarest and most favoured conditions in traditional astrology. Its gifts are fused with your core purpose and tend to be unusually available to you.'

export const ORIENTAL_TEXT: Partial<Record<BodyId, [oriental: string, occidental: string]>> = {
  mercury: [
    'As a morning star, your Mercury is quick and eager: you jump into ideas and speak up early.',
    'As an evening star, your Mercury is thoughtful: you weigh things up and often have the last, best word.',
  ],
  venus: [
    'As a morning star, your Venus is bold in love: you go toward what you want and fall quickly.',
    'As an evening star, your Venus loves slowly and loyally: affection deepens with time and familiarity.',
  ],
  mars: [
    'Rising ahead of the Sun, your Mars is quick to act and quick to start, best at beginnings.',
    'Rising after the Sun, your Mars is slower to anger and more strategic, best when it has time to prepare.',
  ],
  jupiter: [
    'Rising ahead of the Sun, your Jupiter brings opportunity early: luck tends to show up when you move first.',
    'Rising after the Sun, your Jupiter’s gifts tend to come later in life, after patience and experience.',
  ],
  saturn: [
    'Rising ahead of the Sun, your Saturn’s lessons tend to come early, which often means a strong foundation later.',
    'Rising after the Sun, your Saturn’s lessons tend to arrive later in life, when you’re ready to carry them.',
  ],
}

/** Aspect meaning by nature and where the two planets were relative to the horizon. */
export type AspectNature = 'blend' | 'flow' | 'tension'
export const ASPECT_NATURE: Record<AspectType, AspectNature> = {
  conjunction: 'blend',
  sextile: 'flow',
  trine: 'flow',
  square: 'tension',
  opposition: 'tension',
}

type T = (a: string, b: string) => string
export const ASPECT_HORIZON_TEXT: Record<'up' | 'down' | 'split', Record<AspectNature, T>> = {
  up: {
    blend: (a, b) => `Your ${a} and ${b} are fused and on display: people experience them as one thing in you, and they show up together in your outward life.`,
    flow: (a, b) => `Your ${a} and ${b} work together in plain view. This is an ease other people notice in you, and it shows up in your outward life: what you do, how you relate, how you present yourself.`,
    tension: (a, b) => `The tension between your ${a} and ${b} plays out in the open. Others may see the push and pull before you do, often in visible situations like work or public life. Handled well, it becomes a visible source of drive.`,
  },
  down: {
    blend: (a, b) => `Your ${a} and ${b} are fused in your private world: a combination you know well from the inside, even if others rarely see it.`,
    flow: (a, b) => `Your ${a} and ${b} support each other privately. It’s a quiet inner resource that may not be obvious to others, but one you can always lean on.`,
    tension: (a, b) => `The friction between your ${a} and ${b} is mostly internal. You may wrestle with it privately, in your thoughts, at home or in your closest relationships, long before it shows. Working it through is a big part of your inner growth.`,
  },
  split: {
    blend: (up, down) => `Although they sit together on the wheel, the horizon divides them: your ${up} on show, your ${down} kept hidden. Two sides of one theme, one public and one private.`,
    flow: (up, down) => `What people see of your ${up} is quietly backed by your ${down}, working out of sight. The hidden side is a resource: when you draw on it, the visible side flows more easily.`,
    tension: (up, down) => `Others see your ${up}, but not your ${down}: that side of you works out of sight, and the two can pull against each other. You may feel a gap between how you come across and what’s going on inside. Bringing the hidden side into the light is how this tension turns into strength.`,
  },
}

/** What it means when the two ends of an aspect sit in these parts of the sky. */
export function zonePairText(a: Zone, b: Zone): string {
  const key = [a, b].sort().join('-')
  const t: Record<string, string> = {
    'rise-rise': 'Both were near the eastern horizon, so this aspect is woven into your personality and how you come across.',
    'culminate-culminate': 'Both were high in the sky, so this aspect is bound up with your career, ambitions and reputation.',
    'set-set': 'Both were near the western horizon, so this aspect plays out mostly through partners and close relationships.',
    'lower-lower': 'Both were deep below you, so this aspect lives in your home, family and private life.',
    'rise-set': 'It stretches across your horizon from east to west, the axis of self and other. It tends to show up as a balancing act between your own needs and those of the people you’re close to.',
    'culminate-lower': 'It runs along your meridian, from the top of the sky to the bottom: the axis of public life and private roots. Career and home, ambition and belonging are in conversation here.',
    'culminate-rise': 'It links the eastern horizon to the top of the sky: who you are feeds directly into what you achieve.',
    'lower-rise': 'It links the eastern horizon to the depths below: your personality is closely shaped by your roots and family.',
    'culminate-set': 'It links your public life and your relationships: partners and collaborators influence your path, and your work shapes who you’re close to.',
    'lower-set': 'It links your relationships and your home life: who you partner with and the family you build are closely tied.',
  }
  return t[key]
}
