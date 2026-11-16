export type Inline = string | { v: string } | { s: string; c: Inline[]; href?: string };

export type Block =
  | { t: 'p'; s?: string; a?: string; c: Inline[] }
  | { t: 'img'; src: string; h?: number; a?: string }
  | { t: 'choice'; label?: string; img?: string; to?: string; story?: number; color?: string; href?: string }
  | { t: 'row'; c: Block[] }
  | { t: 'sketch' };

export type Scene = { blocks: Block[]; special?: boolean };
export type InputField = { key: string; placeholder: string; numeric: boolean };
export type InputScreen = { blocks: Block[]; fields: InputField[]; next: string; group: string };
export type Ending = { bg: number; blocks: Block[] };

export type Story = {
  scenes: Record<string, Scene>;
  inputs: Record<string, InputScreen>;
  endings: Record<string, Ending>;
  routes: Record<string, string>;
};

export type Profile = { name: string; age: string; color: string };

export type GameState = {
  route: string;
  history: string[];
  profile: Profile;
  groups: Record<string, Record<string, string>>;
  number: { quiz_num: number; story_num: number };
};
