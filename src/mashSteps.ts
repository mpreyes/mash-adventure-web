import { CATEGORY_ORDER } from './mash';

export type CountStep = { c: number; i: number; count: number; hit: boolean };

/** Replays calculateMash() one count at a time, tracking answers by position so repeats stay separate. */
export function mashSteps(groups: Record<string, Record<string, string>>, magicNumber: number) {
  const options = CATEGORY_ORDER.map((k) => Object.values(groups[k] ?? {}).map(String));
  const alive = options.map((o) => o.map(() => true));
  const left = (c: number) => alive[c].filter(Boolean).length;
  const steps: CountStep[] = [];
  let count = 1;
  let guard = 0;
  while (alive.some((_, c) => left(c) > 1) && ++guard < 1000) {
    for (let c = 0; c < options.length; c++) {
      for (let i = 0; i < options[c].length; i++) {
        if (!alive[c][i] || left(c) === 1) continue;
        const hit = count % magicNumber === 0;
        steps.push({ c, i, count, hit });
        if (hit) alive[c][i] = false;
        count++;
      }
    }
  }
  const winners = alive.map((a) => a.findIndex(Boolean));
  return { options, steps, winners };
}
