// Turns each ending into short "beats" (one screen each) without changing a word.
// Splits on sentence boundaries, keeps M.A.S.H. variables intact, and packs
// small pieces together so each screen holds roughly one or two short paragraphs.
// Hand-tuned moments (pictures, cards, layouts, themes) live in EFFECTS below.
import type { Block, Ending, Inline } from './types';

export type Para = { style: 'body' | 'big'; c: Inline[] };

/** Extra UI drawn with a beat. All of these show the player's answers, never new story text. */
export type Decor =
  | 'bank' | 'mashSheet' | 'receipt' | 'departures' | 'match' | 'clock'
  | 'caseFile' | 'suspect' | 'reels' | 'menu'
  | { stamp: string; color?: 'red' | 'teal' };

/**
 * How a beat's own sentences are laid out:
 * bubbles (quote + who said it), headlines, chat (question / Bowie answer),
 * strikes (crossed-out list), strikeCards (numbered disasters), polaroid (photo + caption),
 * listing (quoted ad as a search result), shout (big speech bubble), slip (typed note), glow (advice card).
 */
export type Layout = 'bubbles' | 'headlines' | 'chat' | 'strikes' | 'strikeCards' | 'polaroid' | 'listing' | 'shout' | 'slip' | 'glow';

export type Theme = 'dark' | 'red' | 'night';

export type Overlay = {
  /** Text inside the beat this applies to. */
  at: string;
  /** Start a new screen at that sentence. */
  breakBefore?: boolean;
  /** Add a screen holding only the decor, right before this beat. */
  insertBefore?: boolean;
  /** Picture for this beat; null removes the ending's default picture. */
  image?: string | null;
  imageStyle?: 'card' | 'plain' | 'dim' | 'side' | 'small';
  before?: Decor[];
  after?: Decor[];
  layout?: Layout;
  /** For strikeCards: the sentence that starts each card, and a picture for each. */
  cards?: { start: string; image: string }[];
  /** For polaroid: the caption sentence start. */
  caption?: string;
  theme?: Theme;
};

export type Beat = { paras: Para[]; image?: string; dark?: boolean; overlay?: Overlay; decorOnly?: boolean };

type Effects = {
  /** Sentences (or parts of them) shown as big type on their own line. */
  big?: string[];
  /** Start a new screen at sentences containing these. */
  breakBefore?: string[];
  /** Keep everything from the sentence containing [0] up to (not including) the one containing [1] on one screen. */
  groups?: [string, string?][];
  /** Screens go dark from the beat containing darkFrom until the one containing darkUntil. */
  darkFrom?: string;
  darkUntil?: string;
  /** Don't turn the opening line into a separate title screen. */
  noTitle?: boolean;
  overlays?: Overlay[];
};

// Hand-tuned moments per ending (by ending id). Everything else is automatic.
const EFFECTS: Record<string, Effects> = {
  // Traditional M.A.S.H.
  '0': {
    big: ['Yay?'],
    overlays: [
      { at: 'The wheel of fortune says you will', image: 'fortune.png' },
      { at: 'drive a', insertBefore: true, before: ['mashSheet'] },
    ],
  },
  // Spooky
  '1': {
    big: ['Suddenly, the lights turn off.', 'who had come home to surprise you', 'And you had broken their nose.'],
    breakBefore: ['Speaking of money', 'who had come home to surprise you'],
    darkFrom: 'Suddenly, the lights turn off',
    darkUntil: 'As you approach',
    overlays: [{ at: 'banking app', before: ['bank'] }],
  },
  // Futuristic
  '2': {
    groups: [['Cancer is cured', 'You live in'], ['Need your pantry', 'Your floor looks']],
    breakBefore: ['You have a robotic'],
    overlays: [
      { at: 'Cancer is cured', layout: 'headlines', image: 'vz_flyingcar.webp', imageStyle: 'small' },
      { at: 'You have a robotic', image: 'vz_robotdog.webp', imageStyle: 'side' },
      { at: 'Need your pantry', layout: 'chat' },
    ],
  },
  // Hallmark
  '3': {
    groups: [['So you handed over', 'In an incredible turn']],
    overlays: [
      { at: 'three weeks before Christmas', image: 'vz_cabin.webp', imageStyle: 'card', after: [{ stamp: 'MEGA-REUNION-CHRISTMAS', color: 'teal' }] },
      { at: 'So you handed over', before: ['match'] },
    ],
  },
  // Plain Vanilla
  '4': {
    noTitle: true,
    groups: [['How do you like your ice cream', 'As you'], ['Currently, you live', "You're frustrated"], ['Yeah, this will be your life']],
    overlays: [
      { at: 'How do you like your ice cream', layout: 'bubbles', image: 'vz_icecream.webp', imageStyle: 'card' },
      { at: 'Currently, you live', after: ['receipt'] },
      { at: 'Yeah, this will be your life', layout: 'strikes', image: 'vanilla.png', imageStyle: 'side' },
    ],
  },
  // Worst
  '5': {
    groups: [['For your fortune', 'So you turn to driving'], ['So you turn to driving', 'You bank account']],
    overlays: [
      { at: 'pissed the game creator off', image: null, theme: 'red', before: [{ stamp: 'UH OH' }] },
      {
        at: 'For your fortune', layout: 'strikeCards',
        cards: [
          { start: 'For your fortune', image: 'vz_tornado.webp' },
          { start: 'The love of your life', image: 'vz_monk.webp' },
          { start: 'Alone and homeless', image: 'professions.png' },
        ],
      },
      { at: 'So you turn to driving', layout: 'polaroid', image: 'bus_driver.png', caption: "That's not you" },
    ],
  },
  // Out Of This World
  '6': {
    groups: [['On the 5th page', 'You give the owner']],
    overlays: [
      { at: 'layover flight', image: null, before: ['departures'] },
      { at: 'On the 5th page', layout: 'listing', image: 'vz_alien.webp' },
    ],
  },
  // Fairy Tale Twist
  '7': {
    breakBefore: ['Time melts away', 'You race down the palace steps'],
    overlays: [
      { at: 'Come back this instant', layout: 'shout' },
      { at: 'Time melts away', before: ['clock'] },
      { at: 'You race down the palace steps', image: 'vz_slipper.webp', imageStyle: 'side' },
    ],
  },
  // Crime Scene Mystery
  '8': {
    breakBefore: ['To this day'],
    overlays: [
      { at: 'The crime scene was still fresh', image: 'vz_crimetape.webp', imageStyle: 'plain', after: ['caseFile'] },
      { at: 'To this day', theme: 'dark', before: ['suspect', { stamp: 'UNSOLVED' }] },
    ],
  },
  // Children's Fairy Tale
  '9': {
    overlays: [
      { at: 'dark but calm night', image: 'vz_forest.webp', imageStyle: 'dim' },
      { at: 'The days grew wearier', after: ['menu'] },
    ],
  },
  // Plot Generator
  '10': {
    breakBefore: ['This is the following prompt'],
    overlays: [
      { at: 'The author sure has run out of ideas', image: null, after: ['reels'] },
      { at: 'This is the following prompt', layout: 'slip', image: 'apple_pie.png', imageStyle: 'small' },
    ],
  },
  // Magical
  default: {
    big: ['Hard.'],
    breakBefore: ['You continue to walk, when suddenly'],
    groups: [['You are but a young human', 'And with that']],
    overlays: [
      { at: 'You continue to walk, when suddenly', image: 'vz_phoenix.webp', imageStyle: 'plain' },
      { at: 'You are but a young human', layout: 'glow', image: 'wisdom_bird.png', imageStyle: 'small', theme: 'night' },
    ],
  },
};

const TARGET = 55; // words before a chunk may close
const MAX_BEAT = 95; // words a beat may hold when packing
const SHORT = 28; // a chunk this small gets company

export const plain = (c: Inline[]): string =>
  c.map((n) => (typeof n === 'string' ? n : 'v' in n ? '' : plain(n.c))).join('');
const words = (c: Inline[]): number =>
  c.reduce((n, x) => n + (typeof x === 'string' ? x.split(/\s+/).filter(Boolean).length : 'v' in x ? 1 : words(x.c)), 0);

/** Split inline nodes into sentences. */
export function sentences(c: Inline[]): Inline[][] {
  const out: Inline[][] = [];
  let cur: Inline[] = [];
  for (const node of c) {
    if (typeof node !== 'string') { cur.push(node); continue; }
    const parts = node.split(/(?<=[.!?]["”’')]*)\s+(?=\S)/);
    parts.forEach((p, i) => {
      const last = i === parts.length - 1;
      const text = last ? p : p + ' ';
      if (text) cur.push(text);
      if (!last) { out.push(cur); cur = []; }
    });
  }
  if (cur.length) out.push(cur);
  return out.filter((s) => plain(s).trim() || s.some((n) => typeof n !== 'string'));
}

/** Styling spans (title/subheading text) dissolve into their words; bold and links stay. */
function flatten(c: Inline[]): Inline[] {
  return c.flatMap((n) => (typeof n !== 'string' && 's' in n && !n.href && n.s !== 'bold' ? flatten(n.c) : [n]));
}

/** Line breaks in the original text mark separate paragraphs. */
function splitParas(c: Inline[]): Inline[][] {
  const out: Inline[][] = [];
  let cur: Inline[] = [];
  for (const n of c) {
    if (typeof n !== 'string') { cur.push(n); continue; }
    const parts = n.split(/\n+/);
    parts.forEach((p, i) => {
      if (p) cur.push(p);
      if (i < parts.length - 1) { out.push(cur); cur = []; }
    });
  }
  out.push(cur);
  return out.filter((p) => plain(p).replace(/\t/g, '').trim() || p.some((n) => typeof n !== 'string'));
}

const has = (c: Inline[], list?: string[]) => !!list?.some((needle) => plain(c).includes(needle));

export function tidyEnds(c: Inline[]): Inline[] {
  const out = c.map((n) => (typeof n === 'string' ? n.replace(/\t/g, '') : n));
  if (typeof out[0] === 'string') out[0] = (out[0] as string).replace(/^\s+/, '');
  const l = out.length - 1;
  if (typeof out[l] === 'string') out[l] = (out[l] as string).replace(/\s+$/, '');
  return out.filter((n) => n !== '');
}

type Chunk = { para: Para; forceBreak: boolean; group: number };
type SplitState = { group: number; nextGroup: number };

function chunksOf(c: Inline[], fx: Effects, st: SplitState): Chunk[] {
  const chunks: Chunk[] = [];
  let cur: Inline[] = [];
  let pendingBreak = false;
  const flush = (style: Para['style'] = 'body') => {
    if (!cur.length) return;
    chunks.push({ para: { style, c: tidyEnds(cur) }, forceBreak: pendingBreak, group: st.group });
    pendingBreak = false; cur = [];
  };
  for (const s of sentences(c)) {
    const text = plain(s);
    const endsGroup = st.group && fx.groups?.[st.group - 1]?.[1] && text.includes(fx.groups[st.group - 1][1]!);
    if (endsGroup) { flush(); st.group = 0; pendingBreak = true; }
    const startsGroup = fx.groups?.findIndex((g) => text.includes(g[0]));
    if (startsGroup !== undefined && startsGroup >= 0 && st.group !== startsGroup + 1) {
      flush(); st.group = startsGroup + 1; pendingBreak = true;
    }
    if (has(s, fx.breakBefore)) { flush(); pendingBreak = true; }
    if (has(s, fx.big)) { flush(); cur = s; flush('big'); continue; }
    cur = [...cur, ...s];
    if (!st.group && words(cur) >= TARGET) flush();
  }
  flush();
  return chunks;
}

const beatText = (b: Beat) => b.paras.map((p) => plain(p.c)).join(' ');

export function beatsFor(id: string, ending: Ending): Beat[] {
  const fx0 = EFFECTS[id] ?? {};
  const overlays = fx0.overlays ?? [];
  const fx: Effects = { ...fx0, breakBefore: [...(fx0.breakBefore ?? []), ...overlays.filter((o) => o.breakBefore).map((o) => o.at)] };
  const [, ...rest] = ending.blocks; // first block is the "You Got:" headline
  const image = rest.find((b): b is Extract<Block, { t: 'img' }> => b.t === 'img')?.src;
  const paras = rest
    .filter((b): b is Extract<Block, { t: 'p' }> => b.t === 'p')
    .flatMap((b) => splitParas(flatten(b.c)));

  const beats: Beat[] = [];
  // Opening line: short ones become the big title screen with the picture.
  let start = 0;
  if (!fx.noTitle && paras.length && words(paras[0]) < 25) {
    beats.push({ paras: [{ style: 'big', c: tidyEnds(paras[0]) }], image });
    start = 1;
  }
  const st: SplitState = { group: 0, nextGroup: 0 };
  let cur: Para[] = [];
  let curGroup = 0;
  const close = () => { if (cur.length) beats.push({ paras: cur }); cur = []; curGroup = 0; };
  for (const p of paras.slice(start)) {
    for (const ch of chunksOf(p, fx, st)) {
      const curWords = cur.reduce((n, x) => n + words(x.c), 0);
      const chWords = words(ch.para.c);
      const fits = curWords + chWords <= MAX_BEAT;
      if (!cur.length) { cur.push(ch.para); curGroup = ch.group; }
      else if (ch.group && ch.group === curGroup && !ch.forceBreak) cur.push(ch.para);
      else if (ch.forceBreak || ch.group !== curGroup) { close(); cur.push(ch.para); curGroup = ch.group; }
      else if (fits && (ch.para.style === 'big' || curWords < SHORT || chWords < SHORT)) cur.push(ch.para);
      else { close(); cur.push(ch.para); curGroup = ch.group; }
    }
  }
  close();
  if (!beats.length) beats.push({ paras: [], image });
  if (image && !beats.some((b) => b.image)) beats[0].image = image;

  if (fx.darkFrom) {
    const from = beats.findIndex((b) => beatText(b).includes(fx.darkFrom!));
    const until = fx.darkUntil ? beats.findIndex((b) => beatText(b).includes(fx.darkUntil!)) : beats.length;
    if (from >= 0) for (let i = from; i < (until < 0 ? beats.length : until); i++) beats[i].dark = true;
  }

  for (const o of overlays) {
    const i = beats.findIndex((b) => !b.decorOnly && beatText(b).includes(o.at));
    if (i < 0) continue;
    if (o.insertBefore) {
      beats.splice(i, 0, { paras: [], decorOnly: true, overlay: { ...o } });
      continue;
    }
    beats[i].overlay = o;
    if (o.image === null) beats[i].image = undefined;
    else if (o.image) beats[i].image = o.image;
  }
  return beats;
}

/** For checks: every word of the ending, in order. */
export const allText = (beats: Beat[]) => beats.map((b) => b.paras.map((p) => plain(p.c)).join(' ')).join(' ');
export const beatWords = (b: Beat) => b.paras.reduce((n, p) => n + words(p.c), 0);
