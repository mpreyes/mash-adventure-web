// Shareable fortune cards: one 1080x1350 image per result (Instagram's 4:5), drawn on a canvas,
// plus a link that carries the result so friends can see the card and play their own.
import { story } from './story';
import { img } from './Blocks';
import { endingTitle } from './endings';

export const RESULT_BG = ['#9DBE3D', '#187489', '#93C78E', '#F77FA1', '#F2B84B', '#796AD8', '#187489', '#F2B84B', '#C8332D', '#93C78E', '#796AD8', '#796AD8'];
export const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170;
};

export const FORTUNE_LABELS = ['Home', 'Love', 'City', 'Kids', 'Job', 'Ride', 'Bank', 'Pet'];

/** Everything a card needs. Short keys keep share links short. */
export type Shared = { n: string; e: string; m: number; a: string[] };

const PLAY_URL = 'mpreyes.github.io/mash-adventure-web';

// One line per ending, written in the player's voice and filled in with their answers.
type A = { home: string; love: string; city: string; kids: string; job: string; ride: string; bank: string; pet: string };
const LINES: Record<string, (a: A) => string> = {
  '0': (a) => `${a.home} in ${a.city} with ${a.love} and ${a.kids} kids. The paper never lies.`,
  '1': (a) => `Alone in my ${a.home} in ${a.city}. Then something knocked at midnight.`,
  '2': (a) => `It's 2049. Still a ${a.job}, but now my ${a.ride} flies.`,
  '3': (a) => `Mega-Reunion Christmas in ${a.city}, and ${a.love} is coming home.`,
  '4': (a) => `No toppings, no sauces. Just a ${a.home} in ${a.city}.`,
  '5': (a) => `Lost my ${a.home} to a tornado, ${a.love} became a monk, and now I drive a school bus.`,
  '6': (a) => `Stuck at the airport on the way to ${a.city}. Then I met an alien.`,
  '7': () => 'A wicked stepmother, two lazy stepsisters, and a ball I am NOT missing.',
  '8': (a) => `Yellow tape around a ${a.home} in ${a.city}. The victim? Me.`,
  '9': (a) => `A night walk in the woods with my stepmother and ${a.love}. Uh oh.`,
  '10': (a) => `Woke up in a strange ${a.home} holding a book called "Careers: ${a.job}".`,
  default: () => 'Forgot my lunchbox, and then a giant magic bird changed everything.',
};

export function tagline(s: Shared) {
  const [home, love, city, kids, job, ride, bank, pet] = s.a.map((x) => x.trim() || '???');
  return (LINES[s.e] ?? LINES.default)({ home, love, city, kids, job, ride, bank, pet });
}

/** The ending's own art. The Children's Fairy Tale shares Spooky's picture in the game, so its card gets the forest. */
function artFor(e: string) {
  if (e === '9') return 'vz_forest.png';
  const b = story.endings[e]?.blocks.find((x) => x.t === 'img');
  return b && b.t === 'img' ? b.src : 'fortune.png';
}

export const owner = (name: string) => {
  const n = name.trim().toUpperCase();
  return n ? `${n}${n.endsWith('S') ? "'" : "'S"} FORTUNE` : 'MY FORTUNE';
};

// ---------- links ----------
export function shareUrl(s: Shared) {
  const json = JSON.stringify(s);
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${location.origin}${import.meta.env.BASE_URL}?f=${b64}`;
}

export function readShared(): Shared | null {
  const f = new URLSearchParams(location.search).get('f');
  if (!f) return null;
  try {
    const bin = atob(f.replace(/-/g, '+').replace(/_/g, '/'));
    const s = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    if (typeof s?.n !== 'string' || !story.endings[s.e] || !Array.isArray(s.a) || s.a.length !== 8) return null;
    return { n: s.n.slice(0, 40), e: s.e, m: Number(s.m) || 0, a: s.a.map((x: unknown) => String(x ?? '').slice(0, 60)) };
  } catch {
    return null;
  }
}

// ---------- the card image ----------
const U = 4; // the card is laid out in 270x337.5 units, drawn at 4x = 1080x1350
const W = 270, H = 337.5;
const INK = '#111111', CREAM = '#F8F6EF', TEAL = '#187489', GOLD = '#F2B84B', MUTED = '#3D4A57';
const PIXEL = '"Press Start 2P", monospace';
const READ = '"Literata Variable", Literata, Georgia, serif';

const loadImage = (src: string) => new Promise<HTMLImageElement>((ok, fail) => {
  const i = new Image();
  i.onload = () => ok(i);
  i.onerror = fail;
  i.src = src;
});

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= max || !line) line = test;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = fit(ctx, lines[maxLines - 1] + '…', max);
  }
  return lines.map((l) => fit(ctx, l, max));
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

export async function drawCard(s: Shared): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`32px ${PIXEL}`),
    document.fonts.load(`50px ${READ}`),
    document.fonts.load(`italic 50px ${READ}`),
  ]).catch(() => undefined);
  const art = await loadImage(img(artFor(s.e))).catch(() => null);

  const c = document.createElement('canvas');
  c.width = W * U; c.height = H * U;
  const ctx = c.getContext('2d')!;
  ctx.scale(U, U);
  ctx.textBaseline = 'alphabetic';
  const bg = RESULT_BG[story.endings[s.e]?.bg ?? 0] ?? RESULT_BG[0];
  const fg = isLight(bg) ? INK : CREAM;

  // card and frame
  ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);
  // top band
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, 28);
  ctx.fillStyle = INK; ctx.fillRect(0, 28, W, 3);
  ctx.fillStyle = fg; ctx.font = `8px ${PIXEL}`;
  ctx.textAlign = 'left'; ctx.fillText(fit(ctx, owner(s.n), 170), 12, 18.5);
  ctx.textAlign = 'right'; ctx.fillText(`MAGIC #${s.m}`, W - 12, 18.5);

  // measure the words first, so the art can shrink when an ending has a lot to say
  const fy = H - 24;
  const rowH = 20.5, ay0 = fy - 8 - rowH * 4, colW = (W - 24 - 12) / 2;
  ctx.textAlign = 'center';
  ctx.font = `9.5px ${PIXEL}`;
  const title = wrap(ctx, endingTitle(s.e).toUpperCase(), W - 28, 2);
  ctx.font = `italic 12.5px ${READ}`;
  const tag = wrap(ctx, tagline(s), W - 34, 3);
  const block = 10 + title.length * 14 + 6 + tag.length * 16.5;

  // the ending's art
  const ax = 12, ay = 41, aw = W - 24, ah = Math.max(72, Math.min(104, ay0 - ay - block - 18));
  ctx.fillStyle = INK; ctx.fillRect(ax, ay, aw, ah);
  ctx.fillStyle = bg; ctx.fillRect(ax + 3, ay + 3, aw - 6, ah - 6);
  if (art) {
    const r = Math.min((aw - 6) / art.width, (ah - 6) / art.height);
    const w = art.width * r, h = art.height * r;
    ctx.drawImage(art, ax + 3 + (aw - 6 - w) / 2, ay + 3 + (ah - 6 - h) / 2, w, h);
  }

  // footer
  ctx.fillStyle = INK; ctx.fillRect(0, fy, W, 24);
  ctx.font = `6.5px ${PIXEL}`;
  ctx.textAlign = 'left'; ctx.fillStyle = GOLD; ctx.fillText("WHAT'S YOURS?", 12, fy + 14.5);
  ctx.textAlign = 'right'; ctx.fillStyle = CREAM; ctx.font = `8px ${READ}`; ctx.fillText(PLAY_URL, W - 12, fy + 14.5);

  // answers: two columns, four rows, sitting on the footer
  FORTUNE_LABELS.forEach((label, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 12 + col * (colW + 12), y = ay0 + row * rowH;
    ctx.font = `6.5px ${PIXEL}`; ctx.fillStyle = TEAL; ctx.textAlign = 'left';
    ctx.fillText(label.toUpperCase(), x, y + 14);
    const lw = ctx.measureText(label.toUpperCase()).width;
    ctx.font = `11.5px ${READ}`; ctx.fillStyle = INK; ctx.textAlign = 'right';
    ctx.fillText(fit(ctx, s.a[i] || '???', colW - lw - 8), x + colW, y + 14);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2.5]);
    ctx.beginPath(); ctx.moveTo(x, y + rowH - 1); ctx.lineTo(x + colW, y + rowH - 1); ctx.stroke();
    ctx.setLineDash([]);
  });

  // "I GOT", the ending, and the one-liner, centred in the space between art and answers
  ctx.textAlign = 'center';
  let y = ay + ah + (ay0 - (ay + ah) - block) / 2 + 8;
  ctx.font = `7px ${PIXEL}`; ctx.fillStyle = MUTED; ctx.fillText('I GOT', W / 2, y);
  y += 16;
  ctx.font = `9.5px ${PIXEL}`; ctx.fillStyle = INK;
  title.forEach((l) => { ctx.fillText(l, W / 2, y); y += 14; });
  y += 6;
  ctx.font = `italic 12.5px ${READ}`;
  tag.forEach((l) => { ctx.fillText(l, W / 2, y); y += 16.5; });

  // frame last so it sits on top of everything
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeRect(0, 0, W, H);

  return new Promise((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error('no image'))), 'image/png'));
}
