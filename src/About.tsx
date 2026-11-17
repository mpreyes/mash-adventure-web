// About screen, layout A: a note from Madelyn. Words come from story.json (scene "About").
import story from './story.json';
import { img, InlineView } from './Blocks';
import { ArtistCard } from './ArtistCard';
import type { Inline } from './types';

const textOf = (c: Inline[]): string => c.map((n) => (typeof n === 'string' ? n : 'c' in n ? textOf(n.c as Inline[]) : '')).join('');
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

export function About({ onHome }: { onHome: () => void }) {
  const blocks = story.scenes.About.blocks as { t: string; c?: Inline[] }[];
  const paras = blocks.filter((b) => b.t === 'p').map((b) => b.c ?? []);
  // [0] title, [1..3] the note, [4] the Vecteezy thanks (with its link)
  const note = paras.slice(1, 4).map((c) => clean(textOf(c)));
  // Paragraph two covers three thoughts; give each its own paragraph.
  const [first, middle, last] = note;
  const split = middle.split(/\s(?=This game combines|As a side note)/);
  const side = split.find((s) => s.startsWith('As a side note')) ?? '';
  const body = split.filter((s) => s !== side);
  const thanks = paras[4] ?? [];
  return (
    <div className="about">
      <img className="about-logo" src={img('MASH.png')} alt="M.A.S.H. Adventure" />
      <article className="about-note">
        <span className="about-tag">A NOTE FROM MADELYN</span>
        <p><span className="dropcap">{first[0]}</span>{first.slice(1)}</p>
        {body.map((t) => <p key={t}>{t}</p>)}
        {side && <p className="about-side">{side}</p>}
        <p className="about-last">{last}</p>
        <p className="about-sign">Madelyn</p>
      </article>
      <ArtistCard />
      <p className="credits">{thanks.map((n, i) => <InlineView key={i} node={n} vars={{}} />)}</p>
      <button className="btn btn-start" onClick={onHome}>HOME</button>
    </div>
  );
}
