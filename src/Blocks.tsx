import type { Block, Inline } from './types';

// Images ship as resized WebP (the original PNG/JPGs were up to several MB each).
export const img = (src: string) => `${import.meta.env.BASE_URL}images/${src.replace(/\.(png|jpe?g)$/i, '.webp')}`;

const preloaded = new Set<string>();
/** Warm the browser cache so images are ready before their screen opens. */
export function preload(srcs: string[]) {
  for (const s of srcs) {
    const url = img(s);
    if (preloaded.has(url)) continue;
    preloaded.add(url);
    const i = new Image();
    i.decoding = 'async';
    i.src = url;
  }
}

/** Every image a list of blocks shows. */
export function imagesIn(list: Block[]): string[] {
  return list.flatMap((b) => (b.t === 'img' ? [b.src] : b.t === 'row' ? imagesIn(b.c) : b.t === 'choice' && b.img ? [b.img] : []));
}

export type Vars = Record<string, unknown> & { __mark?: boolean };
type Choice = Extract<Block, { t: 'choice' }>;

function evalVar(expr: string, vars: Vars): string {
  try {
    const keys = Object.keys(vars).filter((k) => k !== '__mark');
    const fn = new Function(...keys, `return (${expr});`);
    const out = fn(...keys.map((k) => vars[k]));
    return out == null ? '' : String(out);
  } catch {
    return '';
  }
}

/** Tidy layout whitespace only (old tab indents, trailing newlines). Words are untouched. */
function tidy(nodes: Inline[]): Inline[] {
  const out = nodes.map((n) => (typeof n === 'string' ? n.replace(/\t/g, '') : n));
  const trimAt = (i: number, side: 'start' | 'end') => {
    const n = out[i];
    if (typeof n === 'string') out[i] = side === 'start' ? n.replace(/^\s+/, '') : n.replace(/\s+$/, '');
  };
  while (out.length && typeof out[0] === 'string' && !(out[0] as string).trim()) out.shift();
  while (out.length && typeof out[out.length - 1] === 'string' && !(out[out.length - 1] as string).trim()) out.pop();
  if (out.length) { trimAt(0, 'start'); trimAt(out.length - 1, 'end'); }
  return out;
}

function InlineView({ node, vars }: { node: Inline; vars: Vars }) {
  if (typeof node === 'string') return <>{node}</>;
  if ('v' in node) {
    const val = evalVar(node.v, vars);
    return vars.__mark && val.trim() ? <mark className="fill">{val}</mark> : <>{val}</>;
  }
  const kids = tidy(node.c).map((c, i) => <InlineView key={i} node={c} vars={vars} />);
  if (node.href) return <a href={node.href} target="_blank" rel="noreferrer">{kids}</a>;
  return <span className={`s-${node.s.replace(/[^a-zA-Z0-9]/g, '')}`}>{kids}</span>;
}

const styleClass = (s?: string) => (s ? s.split(',').map((x) => `s-${x}`).join(' ') : '');

type Props = {
  blocks: Block[];
  vars: Vars;
  onChoice: (b: Choice) => void;
  renderSketch?: () => React.ReactNode;
};

const LETTERS = 'ABCDEFGH';

const countChoices = (list: Block[]): number =>
  list.reduce((n, b) => n + (b.t === 'row' ? countChoices(b.c) : b.t === 'choice' && !b.img ? 1 : 0), 0);

export function Blocks({ blocks, vars, onChoice, renderSketch }: Props) {
  let letter = 0;
  const lettered = countChoices(blocks) > 1;
  const render = (list: Block[]): React.ReactNode[] =>
    list.map((b, i) => {
      switch (b.t) {
        case 'p': {
          const content = tidy(b.c);
          if (!content.length || content.every((c) => typeof c === 'string' && !c.trim())) return null;
          // Long "question" paragraphs read better as body text than as a wall of bold teal.
          const plain = content.filter((c): c is string => typeof c === 'string').join('');
          const long = b.s === 'questionStyling' && plain.length > 160 ? ' long' : '';
          return (
            <p key={i} className={`para ${styleClass(b.s)}${long}`}>
              {content.map((c, j) => <InlineView key={j} node={c} vars={vars} />)}
            </p>
          );
        }
        case 'img':
          return (
            <figure key={i} className="art-card">
              <img src={img(b.src)} alt="" decoding="async" />
            </figure>
          );
        case 'row':
          return <div key={i} className="row">{render(b.c)}</div>;
        case 'sketch':
          return <div key={i} className="sketch-card">{renderSketch?.()}</div>;
        case 'choice': {
          if (b.img)
            return (
              <button key={i} className="image-choice" onClick={() => onChoice(b)} aria-label={`Choose door ${b.to === 'Party' ? 1 : 2}`}>
                <img src={img(b.img)} alt="" />
              </button>
            );
          const isStory = (b.color ?? '#1698bc') === '#1698bc';
          const badge = isStory && lettered ? LETTERS[letter++] : null;
          return (
            <button key={i} className={`choice ${isStory ? 'story' : 'alt'}`} onClick={() => onChoice(b)}>
              {badge && <span className="badge">{badge}</span>}
              <span>{b.label}</span>
            </button>
          );
        }
      }
    });
  return <>{render(blocks)}</>;
}
