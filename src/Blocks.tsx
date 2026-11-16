import type { Block, Inline } from './types';

export const img = (src: string) => `${import.meta.env.BASE_URL}images/${src}`;

export type Vars = Record<string, unknown>;

function evalVar(expr: string, vars: Vars): string {
  try {
    const fn = new Function(...Object.keys(vars), `return (${expr});`);
    const out = fn(...Object.values(vars));
    return out == null ? '' : String(out);
  } catch {
    return '';
  }
}

function InlineView({ node, vars }: { node: Inline; vars: Vars }) {
  if (typeof node === 'string') return <>{node}</>;
  if ('v' in node) return <>{evalVar(node.v, vars)}</>;
  const kids = node.c.map((c, i) => <InlineView key={i} node={c} vars={vars} />);
  if (node.href) return <a href={node.href} target="_blank" rel="noreferrer">{kids}</a>;
  return <span className={`s-${node.s.replace(/[^a-zA-Z0-9]/g, '')}`}>{kids}</span>;
}

const styleClass = (s?: string) => (s ? s.split(',').map((x) => `s-${x}`).join(' ') : '');

type Props = {
  blocks: Block[];
  vars: Vars;
  onChoice: (b: Extract<Block, { t: 'choice' }>) => void;
  renderSketch?: () => React.ReactNode;
};

export function Blocks({ blocks, vars, onChoice, renderSketch }: Props) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p':
            return (
              <p key={i} className={`para ${styleClass(b.s)} ${b.a ? `anim-${b.a}` : ''}`}>
                {b.c.map((c, j) => <InlineView key={j} node={c} vars={vars} />)}
              </p>
            );
          case 'img':
            return (
              <img key={i} className={`art ${b.a ? `anim-${b.a}` : ''}`} src={img(b.src)} alt="" style={{ maxHeight: b.h ?? 300 }} loading="lazy" />
            );
          case 'row':
            return (
              <div key={i} className="row">
                <Blocks blocks={b.c} vars={vars} onChoice={onChoice} renderSketch={renderSketch} />
              </div>
            );
          case 'sketch':
            return <div key={i}>{renderSketch?.()}</div>;
          case 'choice':
            if (b.img)
              return (
                <button key={i} className="image-choice" onClick={() => onChoice(b)} aria-label={b.to}>
                  <img src={img(b.img)} alt="" />
                </button>
              );
            return (
              <button key={i} className="choice" style={{ background: b.color ?? '#1698bc' }} onClick={() => onChoice(b)}>
                {b.label}
              </button>
            );
        }
      })}
    </>
  );
}
