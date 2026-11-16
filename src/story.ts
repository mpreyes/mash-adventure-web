import data from './story.json';
import type { Story } from './types';

// Every scene was converted from the original React Native screens, text kept word for word.
export const story = data as unknown as Story;

/** Route name (as used by the old navigator) -> screen id */
export const screenFor = (route: string) => story.routes[route] ?? route;
