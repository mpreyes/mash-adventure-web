// Ported from the original Results.js calculateMash(), same logic and quirks.
type Quiz = Record<string, Record<string, string | number>>;

/** Category order the endings rely on: res[0]=home, 1=love, 2=city, 3=kids, 4=job, 5=ride, 6=money, 7=pet */
export const CATEGORY_ORDER = ['mash', 'love_interest', 'cities', 'no_kids', 'professions', 'vehicles', 'money_in_bank', 'type_pet'];

export function calculateMash(groups: Record<string, Record<string, string>>, magicNumber: number): string[] {
  const quiz: Quiz = {};
  for (const key of CATEGORY_ORDER) quiz[key] = { ...(groups[key] ?? {}) };
  const number = +magicNumber;
  let done = false;
  let count = 1;
  let items = 0;
  let guard = 0;
  while (done == false) {
    for (const key in quiz) {
      const obj = quiz[key];
      for (const sub in obj) {
        if (Object.keys(obj).length == 1) {
          items++;
          continue;
        }
        if (count % number == 0) {
          delete obj[sub];
        }
        count++;
      }
    }
    if (items == CATEGORY_ORDER.length) done = true;
    items = 0;
    if (++guard > 10000) break; // safety net, never hit with numbers 1-10
  }
  return CATEGORY_ORDER.map((key) => String(Object.values(quiz[key])[0] ?? ''));
}

export const MASH_GROUP = { M: 'Mansion', A: 'Apartment', S: 'Shack', H: 'House' };
