import { useEffect, useState } from 'react';
import { story } from './story';

// Unlocked endings live in the player's browser, separate from their answers,
// so "Start over" never wipes the collection.
const KEY = 'mash-adventure-endings-v1';

/** Display order: endings 0-10, then the Magical Ending last. */
export const ENDING_IDS = [...Object.keys(story.endings).filter((k) => k !== 'default').sort((a, b) => +a - +b), 'default'];

export const endingIdFor = (storyNum: number) => (story.endings[String(storyNum)] ? String(storyNum) : 'default');

export function endingTitle(id: string) {
  const head = story.endings[id]?.blocks[0];
  const text = head && head.t === 'p' ? head.c.filter((c): c is string => typeof c === 'string').join('').trim() : '';
  return text.replace(/^You Got:\s*/, '');
}

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => ENDING_IDS.includes(x)) : [];
  } catch {
    return [];
  }
}

export function useUnlocked() {
  const [unlocked, setUnlocked] = useState<string[]>(read);
  const unlock = (id: string): boolean => {
    const current = read();
    if (current.includes(id)) return false;
    const next = [...current, id];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    setUnlocked(next);
    return true;
  };
  useEffect(() => setUnlocked(read()), []);
  return { unlocked, unlock };
}
