// Turns each ending into short "beats" (one screen each) without changing a word.
// Splits on sentence boundaries, keeps M.A.S.H. variables intact, and packs
// small pieces together so each screen holds roughly one or two short paragraphs.
import type { Block, Ending, Inline } from './types';

export type Para = { style: 'body' | 'big'; c: Inline[] };
export type Beat = { paras: Para[]; image?: string; dark?: boolean; bank?: boolean };

type Effects = {
  /** Sentences (or parts of them) shown as big type on their own line. */
  big?: string[];
  /** Start a new screen at sentences containing these. */
  breakBefore?: string[];
  /** Screens go dark from the beat containing darkFrom until the one containing darkUntil. */
  darkFrom?: string;
  darkUntil?: string;
  /** Show the bank-balance card on the beat containing this. */
  bankAt?: string;
};

// Hand-tuned moments per ending (by ending id). Everything else is automatic.
const EFFECTS: Record<string, Effects> = {
  '1': {
    big: ['Suddenly, the lights turn off.', 'who had come home to surprise you', 'And you had broken their nose.'],
    breakBefore: ['Speaking of money', 'who had come home to surprise you'],
    darkFrom: 'Suddenly, the lights turn off',
    darkUntil: 'As you approach',
    bankAt: 'banking app',
  },
};

const TARGET = 55; // words before a chunk may close
const MAX_BEAT = 95; // words a beat may hold when packing
const SHORT = 28; // a chunk this small gets company

const plain = (c: Inline[]): string =>
  c.map((n) => (typeof n === 'string' ? n : 'v' in n ? '' : plain(n.c))).join('');
const words = (c: Inline[]): number =>
  c.reduce((n, x) => n + (typeof x === 'string' ? x.split(/\s+/).filter(Boolean).length : 'v' in x ? 1 : words(x.c)), 0);

/** Split one paragraph's inline nodes into sentences. */
function sentences(c: Inline[]): Inline[][] {
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

function tidyEnds(c: Inline[]): Inline[] {
  const out = c.map((n) => (typeof n === 'string' ? n.replace(/\t/g, '') : n));
  if (typeof out[0] === 'string') out[0] = (out[0] as string).replace(/^\s+/, '');
  const l = out.length - 1;
  if (typeof out[l] === 'string') out[l] = (out[l] as string).replace(/\s+$/, '');
  return out.filter((n) => n !== '');
}

type Chunk = { para: Para; startsParagraph: boolean; forceBreak: boolean };

function chunksOf(c: Inline[], fx: Effects): Chunk[] {
  const chunks: Chunk[] = [];
  let cur: Inline[] = [];
  let first = true;
  let pendingBreak = false;
  const flush = (style: Para['style'] = 'body') => {
    if (!cur.length) return;
    chunks.push({ para: { style, c: tidyEnds(cur) }, startsParagraph: first, forceBreak: pendingBreak });
    first = false; pendingBreak = false; cur = [];
  };
  for (const s of sentences(c)) {
    const isBig = has(s, fx.big);
    if (has(s, fx.breakBefore)) { flush(); pendingBreak = true; }
    if (isBig) { flush(); cur = s; flush('big'); continue; }
    cur = [...cur, ...s];
    if (words(cur) >= TARGET) flush();
  }
  flush();
  return chunks;
}

export function beatsFor(id: string, ending: Ending): Beat[] {
  const fx = EFFECTS[id] ?? {};
  const [, ...rest] = ending.blocks; // first block is the "You Got:" headline
  const image = rest.find((b): b is Extract<Block, { t: 'img' }> => b.t === 'img')?.src;
  const paras = rest
    .filter((b): b is Extract<Block, { t: 'p' }> => b.t === 'p')
    .flatMap((b) => splitParas(flatten(b.c)));

  const beats: Beat[] = [];
  // Opening line: short ones become the big title screen with the picture.
  let start = 0;
  if (paras.length && words(paras[0]) < 25) {
    beats.push({ paras: [{ style: 'big', c: tidyEnds(paras[0]) }], image });
    start = 1;
  }
  let cur: Para[] = [];
  const close = () => { if (cur.length) beats.push({ paras: cur }); cur = []; };
  for (const p of paras.slice(start)) {
    for (const ch of chunksOf(p, fx)) {
      const curWords = cur.reduce((n, x) => n + words(x.c), 0);
      const chWords = words(ch.para.c);
      const fits = curWords + chWords <= MAX_BEAT;
      if (!cur.length) cur.push(ch.para);
      else if (ch.forceBreak) { close(); cur.push(ch.para); }
      else if (fits && (ch.para.style === 'big' || curWords < SHORT || chWords < SHORT)) cur.push(ch.para);
      else { close(); cur.push(ch.para); }
    }
  }
  close();
  if (!beats.length) beats.push({ paras: [], image });
  if (image && !beats[0].image) beats[0].image = image;

  // Effects that depend on where text landed.
  const beatText = (b: Beat) => b.paras.map((p) => plain(p.c)).join(' ');
  if (fx.darkFrom) {
    const from = beats.findIndex((b) => beatText(b).includes(fx.darkFrom!));
    const until = fx.darkUntil ? beats.findIndex((b) => beatText(b).includes(fx.darkUntil!)) : beats.length;
    if (from >= 0) for (let i = from; i < (until < 0 ? beats.length : until); i++) beats[i].dark = true;
  }
  if (fx.bankAt) {
    const i = beats.findIndex((b) => beatText(b).includes(fx.bankAt!));
    if (i >= 0) beats[i].bank = true;
  }
  return beats;
}

/** For checks: every word of the ending, in order. */
export const allText = (beats: Beat[]) => beats.map((b) => b.paras.map((p) => plain(p.c)).join(' ')).join(' ');
export const beatWords = (b: Beat) => b.paras.reduce((n, p) => n + words(p.c), 0);
