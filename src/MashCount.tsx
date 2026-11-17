// The paper-game count-off: count through every answer, cross out every Nth,
// circle the last one standing in each category. Then the story starts.
import { useEffect, useMemo, useRef, useState } from 'react';
import { img } from './Blocks';
import { mashSteps } from './mashSteps';

const LABELS = ['Home', 'Love', 'City', 'Kids', 'Job', 'Ride', 'Bank', 'Pet'];
const ICONS = [null, 'love_interest.png', 'cities.png', 'kids.png', 'professions.png', 'transportation.png', 'money.png', 'pets.png'];
// Every cross-out gets the same beat, whatever the magic number: the counts in
// between share COUNT_MS, then the cross-out holds for HIT_MS.
const COUNT_MS = 450;
const HIT_MS = 1000;

type Props = { groups: Record<string, Record<string, string>>; magic: number; onDone: () => void };

export function MashCount({ groups, magic, onDone }: Props) {
  const { options, steps } = useMemo(() => mashSteps(groups, magic), [groups, magic]);
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [k, setK] = useState(reduced ? steps.length : 0); // steps shown so far
  const finished = k >= steps.length;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (finished) return;
    const s = steps[k];
    const missesBefore = Math.max(1, magic - 1);
    const delay = s.hit ? HIT_MS : Math.max(70, Math.round(COUNT_MS / missesBefore));
    const t = setTimeout(() => setK((x) => x + 1), delay);
    return () => clearTimeout(t);
  }, [k, finished, steps, magic]);

  // Enter, space or → skips the count, then continues to the story.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!['Enter', ' ', 'ArrowRight'].includes(e.key) || (e.target as HTMLElement).tagName === 'BUTTON') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (k < steps.length) setK(steps.length); else doneRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [k, steps.length]);

  const out = options.map((o) => o.map(() => false));
  for (let j = 0; j < k; j++) if (steps[j].hit) out[steps[j].c][steps[j].i] = true;
  const cur = !finished ? steps[k] : null;
  // The pen starts crossing out the moment the count lands on it.
  if (cur?.hit) out[cur.c][cur.i] = true;
  const shownCount = cur ? cur.count : steps.length ? steps[steps.length - 1].count : 0;
  const winner = (c: number) => out[c].filter((x) => !x).length === 1;

  return (
    <div className="count-wrap">
      <section className="card sheet count-sheet" aria-label="Your M.A.S.H. sheet">
        <div className="sheet-head">
          <span>YOUR M.A.S.H. SHEET</span>
          <span className={`count-badge-live ${finished ? 'done' : ''}`}>{finished ? `MAGIC # ${magic}` : `COUNT ${shownCount || 1}`}</span>
        </div>
        {options.map((opts, c) => (
          <div key={c} className="sheet-row">
            {ICONS[c] ? <img src={img(ICONS[c]!)} alt="" /> : <span className="sheet-m">M</span>}
            <span className="sheet-label">{LABELS[c]}</span>
            <div className="sheet-options">
              {opts.map((o, i) => {
                const isOut = out[c][i];
                const isWin = !isOut && winner(c);
                const isCur = cur && cur.c === c && cur.i === i;
                return (
                  <span key={i} className={`count-opt ${isOut ? 'out' : ''} ${isWin ? 'win' : ''} ${isCur ? (cur.hit ? 'cur hit' : 'cur') : ''}`}>
                    {c === 6 ? `$${o}` : o}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </section>
      <p className="sr-only" aria-live="polite">{finished ? 'Your fortune is ready.' : ''}</p>
      <div className="beat-controls">
        {finished ? (
          <button className="btn btn-start" onClick={onDone}>TELL MY STORY</button>
        ) : (
          <button className="btn btn-cream" onClick={() => setK(steps.length)}>SKIP</button>
        )}
      </div>
    </div>
  );
}
