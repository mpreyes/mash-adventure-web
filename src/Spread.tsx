import { useEffect, useState } from 'react';
import { Blocks, countChoices, type Vars } from './Blocks';
import type { Block } from './types';

const QUERY = '(min-width: 960px)';

export function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setDesktop(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
}

type Props = {
  blocks: Block[];
  vars: Vars;
  onChoice: (b: Extract<Block, { t: 'choice' }>) => void;
  renderSketch?: () => React.ReactNode;
  /** Extra content under the right page (forms, buttons). */
  after?: React.ReactNode;
  /** Extra content under the pictures on the left page. */
  leftAfter?: React.ReactNode;
};

/**
 * Phone: the scene in its original order. Desktop: an open storybook,
 * pictures on the left page, words and choices on the right.
 */
export function Spread({ blocks, vars, onChoice, renderSketch, after, leftAfter }: Props) {
  const desktop = useIsDesktop();
  const lettered = countChoices(blocks) > 1;
  const hint = lettered && desktop ? <p className="kbd-hint">Tip: press {['A', 'B', 'C', 'D'].slice(0, countChoices(blocks)).join(' or ')} on your keyboard</p> : null;
  if (!desktop) {
    return (
      <>
        <Blocks blocks={blocks} vars={vars} onChoice={onChoice} renderSketch={renderSketch} />
        {leftAfter}
        {after}
      </>
    );
  }
  const pictures = blocks.filter((b) => b.t === 'img');
  const words = blocks.filter((b) => b.t !== 'img');
  if (!pictures.length && !leftAfter) {
    return (
      <div className="reading">
        <Blocks blocks={words} vars={vars} onChoice={onChoice} renderSketch={renderSketch} />
        {after}
        {hint}
      </div>
    );
  }
  return (
    <div className="spread">
      <div className="page page-left">
        <Blocks blocks={pictures} vars={vars} onChoice={onChoice} />
        {leftAfter}
      </div>
      <div className="page page-right">
        <Blocks blocks={words} vars={vars} onChoice={onChoice} renderSketch={renderSketch} />
        {after}
        {hint}
      </div>
    </div>
  );
}
