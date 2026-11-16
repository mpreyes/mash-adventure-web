// Field rules for the input screens. Number fields open the number pad on phones.
export type Rule = {
  kind: 'text' | 'whole' | 'money';
  check: (v: string) => string | null; // error message, or null when valid
};

const required = (v: string) => (v.trim() === '' ? 'Fill this one in' : null);

const text: Rule = {
  kind: 'text',
  check: (v) => required(v) ?? (v.trim().length > 40 ? 'Keep it under 40 characters' : null),
};

const whole = (min: number, max: number, what: string): Rule => ({
  kind: 'whole',
  check: (v) => {
    const e = required(v);
    if (e) return e;
    if (!/^\d+$/.test(v.trim())) return `Use a whole number for ${what}`;
    const n = Number(v);
    return n < min || n > max ? `Pick a number from ${min} to ${max}` : null;
  },
});

const money: Rule = {
  kind: 'money',
  check: (v) => {
    const e = required(v);
    if (e) return e;
    return /^\d{1,3}(,?\d{3})*(\.\d{1,2})?$/.test(v.trim()) ? null : 'Use a dollar amount, like 2500 or 2,500.50';
  },
};

const RULES: Record<string, Rule> = {
  age: whole(1, 120, 'your age'),
  n1: whole(0, 30, 'kids'),
  n2: whole(0, 30, 'kids'),
  n3: whole(0, 30, 'kids'),
  m1: money,
  m2: money,
  m3: money,
};

export const ruleFor = (key: string): Rule => RULES[key] ?? text;

/** Props that bring up the right keyboard and stop stray characters. */
export function inputPropsFor(rule: Rule) {
  if (rule.kind === 'whole') return { inputMode: 'numeric' as const, pattern: '[0-9]*', maxLength: 3, autoComplete: 'off' };
  if (rule.kind === 'money') return { inputMode: 'decimal' as const, maxLength: 16, autoComplete: 'off' };
  return { inputMode: 'text' as const, maxLength: 40, autoComplete: 'off', autoCapitalize: 'sentences' };
}

/** Keep only characters a field accepts as the player types. */
export function sanitize(rule: Rule, v: string) {
  if (rule.kind === 'whole') return v.replace(/\D/g, '');
  if (rule.kind === 'money') return v.replace(/[^\d.,]/g, '');
  return v;
}
