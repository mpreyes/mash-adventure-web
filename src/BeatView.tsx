// Renders one beat of an ending: its words (always all of them, in order),
// plus any hand-tuned picture, card or layout from EFFECTS in beats.ts.
import { InlineView, img } from './Blocks';
import { CATEGORY_ORDER } from './mash';
import { sentences, plain, tidyEnds, type Beat, type Decor, type Para } from './beats';
import type { GameState, Inline } from './types';

type Ctx = { vars: Record<string, unknown>; res: string[]; state: GameState; showImage?: boolean };

const Text = ({ c, vars }: { c: Inline[]; vars: Ctx['vars'] }) => (
  <>{tidyEnds(c).map((n, j) => <InlineView key={j} node={n} vars={vars} />)}</>
);

const P = ({ c, vars, big = false, className = '' }: { c: Inline[]; vars: Ctx['vars']; big?: boolean; className?: string }) => (
  <p className={`para ${big ? 'beat-text-big' : 'beat-text-body'} ${className}`}><Text c={c} vars={vars} /></p>
);

/** All sentences of a beat, in order. */
const allSentences = (paras: Para[]) => paras.flatMap((p) => sentences(p.c).map((s) => ({ s, big: p.style === 'big' })));

const otherOptions = (state: GameState, key: string, winner: string) =>
  Object.values(state.groups[key] ?? {}).filter((v) => v !== winner);

const ICONS: Record<string, string | null> = {
  mash: null, love_interest: 'love_interest.png', cities: 'cities.png', no_kids: 'kids.png',
  professions: 'professions.png', vehicles: 'transportation.png', money_in_bank: 'money.png', type_pet: 'pets.png',
};
const LABELS: Record<string, string> = {
  mash: 'Home', love_interest: 'Love', cities: 'City', no_kids: 'Kids', professions: 'Job', vehicles: 'Ride', money_in_bank: 'Bank', type_pet: 'Pet',
};

function DecorView({ d, ctx }: { d: Decor; ctx: Ctx }) {
  const { res, state } = ctx;
  if (typeof d === 'object') return <span className={`stamp stamp-${d.color ?? 'red'}`}>{d.stamp}</span>;
  switch (d) {
    case 'bank':
      return (
        <div className="bank-card" aria-label="Your bank balance">
          <span className="bank-label">CHECKING · PAYDAY</span>
          <span className="bank-amount">${res[6]}</span>
          <span className="bank-note">No deposit this week</span>
        </div>
      );
    case 'mashSheet':
      return (
        <section className="card sheet" aria-label="Your M.A.S.H. sheet">
          <div className="sheet-head"><span>YOUR M.A.S.H. SHEET</span><span>MAGIC # {state.number.quiz_num}</span></div>
          {CATEGORY_ORDER.map((key, i) => (
            <div key={key} className="sheet-row">
              {ICONS[key] ? <img src={img(ICONS[key]!)} alt="" /> : <span className="sheet-m">M</span>}
              <span className="sheet-label">{LABELS[key]}</span>
              <div className="sheet-options">
                {otherOptions(state, key, res[i]).map((o, j) => <s key={j}>{o}</s>)}
                <span className="sheet-win">{key === 'money_in_bank' ? `$${res[i]}` : res[i]}</span>
              </div>
            </div>
          ))}
        </section>
      );
    case 'receipt': {
      const row = (k: string, v: string) => <div className="receipt-row" key={k}><span>{k}</span><span className="dots" /><b>{v}</b></div>;
      return (
        <section className="receipt" aria-label="Your life, itemized">
          <span className="receipt-head">ORDER: 1 LIFE</span>
          {row('Home', res[0])}{row('City', res[2])}{row('Job', res[4])}{row('Ride', res[5])}{row('Pet', res[7])}{row('Bank', `$${res[6]}`)}
          <div className="receipt-total"><span>TOPPINGS</span><span>NONE</span></div>
        </section>
      );
    }
    case 'departures': {
      const others = otherOptions(state, 'cities', res[2]);
      const rows: [string, string, string][] = [['6:10PM', others[0] ?? '', 'BOARDED'], ['7:45PM', res[2], 'DELAYED'], ['8:20PM', others[1] ?? '', 'DELAYED']];
      return (
        <section className="departures" aria-label="Departures board">
          <span className="dep-head">DEPARTURES</span>
          {rows.filter((r) => r[1]).map((r) => (
            <div key={r[0]} className={`dep-row ${r[2] === 'DELAYED' ? 'late' : ''}`}><span>{r[0]}</span><span>{r[1].toUpperCase()}</span><span>{r[2]}</span></div>
          ))}
        </section>
      );
    }
    case 'match':
      return (
        <section className="card profile-card" aria-label="Your match">
          <span className="profile-kicker">RENT-A-BOYFRIEND</span>
          <img src={img('love_interest.png')} alt="" />
          <span className="profile-name">{res[1]}</span>
          <span className="profile-badge">IT'S A MATCH</span>
        </section>
      );
    case 'clock':
      return <div className="clock" aria-label="11:59">11:59</div>;
    case 'caseFile': {
      const f = (k: string, v: string) => <div className="case-row" key={k}><span>{k}</span><b>{v}</b></div>;
      return (
        <section className="card case-file" aria-label="Case file">
          <span className="case-head">CASE FILE</span>
          {f('VICTIM', state.profile.name)}{f('AGE', `about ${state.profile.age}`)}{f('KIDS', res[3])}{f('HOME', res[0])}{f('SPOUSE', 'nowhere to be found')}
        </section>
      );
    }
    case 'suspect':
      return (
        <section className="card profile-card suspect" aria-label="Main suspect">
          <span className="profile-kicker">MAIN SUSPECT</span>
          <img src={img('love_interest.png')} alt="" />
          <span className="profile-name">{res[1]}</span>
          <span className="suspect-note">Took ${res[6]}</span>
        </section>
      );
    case 'reels':
      return (
        <section className="card reels" aria-label="Plot generator">
          <span className="reels-head">PLOT GENERATOR 3000</span>
          <div className="reels-row"><span>WHO?</span><span>WHERE?</span><span>TWIST?</span></div>
        </section>
      );
    case 'menu':
      return (
        <section className="card menu" aria-label="Tonight's dinner">
          <span className="menu-head">TONIGHT'S DINNER</span>
          <div className="menu-row"><span>half a loaf of bread</span><span>1</span></div>
          <div className="menu-row"><span>the most watery cabbage soup imaginable</span><span>1</span></div>
        </section>
      );
  }
}

const decors = (list: Decor[] | undefined, ctx: Ctx) => list?.map((d, i) => <DecorView key={i} d={d} ctx={ctx} />);

/** Layouts that put the beat's picture inside themselves. */
export const CONSUMES_IMAGE = new Set(['polaroid', 'listing', 'strikeCards']);

function Body({ beat, ctx }: { beat: Beat; ctx: Ctx }) {
  const { vars } = ctx;
  const o = beat.overlay;
  const all = allSentences(beat.paras);
  const isQuote = (s: Inline[]) => /^["“]/.test(plain(s).trim());
  switch (o?.layout) {
    case 'bubbles': {
      const groups: { quote: Inline[]; who: Inline[] }[] = [];
      for (const { s } of all) {
        if (isQuote(s) || !groups.length) groups.push({ quote: s, who: [] });
        else groups[groups.length - 1].who.push(...s);
      }
      return (
        <div className="bubbles">
          {groups.map((g, i) => (
            <div key={i} className={`bubble-wrap ${i % 2 ? 'mine' : ''}`}>
              <div className="bubble"><Text c={g.quote} vars={vars} /></div>
              {g.who.length > 0 && <span className="bubble-who"><Text c={g.who} vars={vars} /></span>}
            </div>
          ))}
        </div>
      );
    }
    case 'headlines':
      return (
        <section className="card headlines" aria-label="Headlines">
          <span className="headlines-head">TODAY'S HEADLINES</span>
          {all.map(({ s }, i) => <div key={i} className="headline"><span>2049</span><span><Text c={s} vars={vars} /></span></div>)}
        </section>
      );
    case 'chat': {
      const turns: { q: Inline[]; a: Inline[] }[] = [];
      for (const { s } of all) {
        if (plain(s).trim().endsWith('?')) turns.push({ q: s, a: [] });
        else if (turns.length) turns[turns.length - 1].a.push(...s);
        else turns.push({ q: [], a: [...s] });
      }
      return (
        <div className="chat">
          {turns.map((t, i) => (
            <div key={i} className="chat-turn">
              {t.q.length > 0 && <div className="chat-you"><Text c={t.q} vars={vars} /></div>}
              {t.a.length > 0 && <div className="chat-bot"><span>BOWIE</span><Text c={t.a} vars={vars} /></div>}
            </div>
          ))}
        </div>
      );
    }
    case 'strikes': {
      const [first, ...mid] = all;
      const last = mid.pop();
      return (
        <div className="strikes">
          {first && <P c={first.s} vars={vars} big />}
          <section className="card strike-list">
            {mid.map(({ s }, i) => <div key={i} className="strike-row"><span>X</span><s><Text c={s} vars={vars} /></s></div>)}
          </section>
          {last && (
            <div className="side-row">
              {beat.image && ctx.showImage && <img src={img(beat.image)} alt="" />}
              <P c={last.s} vars={vars} big />
            </div>
          )}
        </div>
      );
    }
    case 'strikeCards': {
      const cards: { image?: string; c: Inline[] }[] = [];
      const lead: Inline[] = [];
      for (const { s } of all) {
        const card = o.cards?.find((cd) => plain(s).includes(cd.start));
        if (card) cards.push({ image: card.image, c: [...s] });
        else if (cards.length) cards[cards.length - 1].c.push(...s);
        else lead.push(...s);
      }
      return (
        <div className="strike-cards">
          {lead.length > 0 && <P c={lead} vars={vars} />}
          {cards.map((cd, i) => (
            <div key={i} className="strike-card">
              {cd.image && <img src={img(cd.image)} alt="" />}
              <p className="para"><Text c={cd.c} vars={vars} /></p>
              <span className="strike-num">X{i + 1}</span>
            </div>
          ))}
        </div>
      );
    }
    case 'polaroid': {
      const isCaption = (p: Para) => !!o.caption && plain(p.c).includes(o.caption);
      return (
        <>
          {beat.paras.filter((p) => !isCaption(p)).map((p, i) => <P key={i} c={p.c} vars={vars} big={p.style === 'big'} />)}
          <figure className="polaroid">
            {beat.image && <img src={img(beat.image)} alt="" />}
            <figcaption>{beat.paras.filter(isCaption).map((p, i) => <Text key={i} c={p.c} vars={vars} />)}</figcaption>
          </figure>
        </>
      );
    }
    case 'listing': {
      const start = all.findIndex(({ s }) => isQuote(s));
      let end = start;
      while (end >= 0 && end < all.length - 1 && !/["”]$/.test(plain(all[end].s).trim())) end++;
      const before = start < 0 ? all : all.slice(0, start);
      const ad = start < 0 ? [] : all.slice(start, end + 1);
      const after = start < 0 ? [] : all.slice(end + 1);
      return (
        <>
          {before.length > 0 && <P c={before.flatMap((x) => x.s)} vars={vars} />}
          {ad.length > 0 && (
            <section className="card listing">
              {beat.image && <img src={img(beat.image)} alt="" />}
              <p className="listing-text"><Text c={ad.flatMap((x) => x.s)} vars={vars} /></p>
            </section>
          )}
          {after.length > 0 && <P c={after.flatMap((x) => x.s)} vars={vars} />}
        </>
      );
    }
    case 'shout':
      return <div className="shout">{beat.paras.map((p, i) => <P key={i} c={p.c} vars={vars} big />)}</div>;
    case 'slip': {
      const strip = (c: Inline[]) => c.map((n) => (typeof n === 'string' ? n.replace(/`/g, '') : n));
      // Sentences up to "verbatim:" stay as normal text; the generator's prompt goes on the slip.
      const idx = all.findIndex(({ s }) => plain(s).includes('verbatim'));
      const pre = idx < 0 ? all : all.slice(0, idx);
      const lead = idx < 0 ? [] : [all[idx]];
      const prompt = idx < 0 ? [] : all.slice(idx + 1);
      return (
        <>
          {pre.length > 0 && <P c={pre.flatMap((x) => x.s)} vars={vars} />}
          {lead.map(({ s }, i) => <P key={i} c={s} vars={vars} />)}
          <div className="slip"><Text c={strip(prompt.flatMap((x) => x.s))} vars={vars} /></div>
        </>
      );
    }
    case 'glow': {
      const strong = ['Choose happiness', "Because it's just that", 'A choice'];
      // The wizard's speech is one long quote, so split it at every sentence end here.
      const parts: Inline[][] = [[]];
      for (const n of beat.paras.flatMap((p, i) => (i ? [' ', ...p.c] : p.c))) {
        if (typeof n !== 'string') { parts[parts.length - 1].push(n); continue; }
        n.split(/(?<=[.!?]["”]?\s+)(?=\S)/).forEach((piece) => {
          parts[parts.length - 1].push(piece);
          if (/[.!?]["”]?\s*$/.test(piece)) parts.push([]);
        });
      }
      return (
        <section className="glow">
          {parts.filter((c) => plain(c).trim()).map((s, i) => {
            const t = plain(s);
            return <P key={i} c={s} vars={vars} big={strong.some((x) => t.includes(x))} className="glow-line" />;
          })}
        </section>
      );
    }
    default:
      return <>{beat.paras.map((p, i) => <P key={i} c={p.c} vars={vars} big={p.style === 'big'} />)}</>;
  }
}

export function BeatView({ beat, ctx: ctx0, showImage }: { beat: Beat; ctx: Ctx; showImage: boolean }) {
  const ctx = { ...ctx0, showImage };
  const o = beat.overlay;
  const style = o?.imageStyle ?? 'card';
  const consumed = !!o?.layout && CONSUMES_IMAGE.has(o.layout);
  const sideInLayout = o?.layout === 'strikes';
  const picture = beat.image && showImage && !consumed && !sideInLayout && style !== 'side'
    ? <figure className={`beat-image ${style}`}><img src={img(beat.image)} alt="" /></figure>
    : null;
  const sidePic = beat.image && showImage && style === 'side' && !sideInLayout && !consumed ? beat.image : null;
  return (
    <div className="beat">
      {decors(o?.before, ctx)}
      {picture}
      {sidePic ? (
        <div className="side-row">
          <img src={img(sidePic)} alt="" />
          <div><Body beat={beat} ctx={ctx} /></div>
        </div>
      ) : (
        <Body beat={beat} ctx={ctx} />
      )}
      {decors(o?.after, ctx)}
    </div>
  );
}
