import { useEffect, useMemo, useState } from 'react';
import { story, screenFor } from './story';
import { Blocks, img } from './Blocks';
import { SketchPad } from './SketchPad';
import { ArtistCard, Credits } from './ArtistCard';
import { calculateMash, MASH_GROUP } from './mash';
import type { Block, GameState } from './types';

const SAVE_KEY = 'mash-adventure-save-v1';
const RESULT_BG = ['#c7ea95', '#122f4a', '#448017', '#dd77ab', '#dac09e', '#6e67c5', '#2e4522', '#f4da6b', '#d34e4f', '#5da372', '#694a82', '#694a82'];

// The original used white text on every ending; light backgrounds get dark text so they're readable.
const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170;
};

const fresh = (): GameState => ({
  route: 'Home',
  history: [],
  profile: { name: '', age: '', color: '' },
  groups: {},
  number: { quiz_num: 0, story_num: 0 },
});

function load(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return fresh();
}

export default function App() {
  const [state, setState] = useState<GameState>(load);

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
    window.scrollTo(0, 0);
  }, [state.route]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (route: string, patch: Partial<GameState> = {}) =>
    setState((s) => ({ ...s, ...patch, route, history: route === 'Home' ? [] : [...s.history, s.route] }));
  const back = () => setState((s) => ({ ...s, route: s.history[s.history.length - 1] ?? 'Home', history: s.history.slice(0, -1) }));
  const home = () => setState(fresh());

  const onChoice = (b: Extract<Block, { t: 'choice' }>) => {
    if (b.href) return void window.open(b.href, '_blank');
    if (!b.to) return;
    if (b.to === 'Home') return home();
    const number = b.story === undefined ? state.number : { ...state.number, story_num: b.story };
    go(b.to, { number });
  };

  const id = screenFor(state.route);
  const vars = { profile: state.profile, numbers: state.number };
  const isResult = id === 'Results';

  let body: React.ReactNode;
  if (id === 'Home') body = <Home onStart={() => go('Profile')} onHowTo={() => go('Mash')} onAbout={() => go('About')} />;
  else if (story.inputs[id]) body = <InputView key={id} id={id} state={state} go={go} />;
  else if (id === 'MashQuizNumber') body = <MagicNumber state={state} go={go} />;
  else if (isResult) body = <Results state={state} onHome={home} />;
  else if (story.scenes[id]) body = <Blocks blocks={story.scenes[id].blocks} vars={vars} onChoice={onChoice} />;
  else body = <p className="para">Lost in the woods. <button className="choice" onClick={home}>Home</button></p>;

  return (
    <div className="app">
      {id !== 'Home' && (
        <header className="topbar">
          {!isResult && state.history.length > 0 ? <button className="back" onClick={back} aria-label="Back">←</button> : <span className="back" />}
          <span className="title">{isResult ? 'Results' : 'M.A.S.H.'}</span>
          <button className="back" onClick={home} aria-label="Home">⌂</button>
        </header>
      )}
      <main
        className={`screen ${isResult ? 'result' : ''}`}
        style={isResult ? { background: RESULT_BG[state.number.story_num] ?? RESULT_BG[0], color: isLight(RESULT_BG[state.number.story_num] ?? RESULT_BG[0]) ? '#1c1c1c' : '#fff' } : undefined}
      >
        {body}
      </main>
    </div>
  );
}

const SLIDES = ['mansion.png', 'apartment.png', 'shack.png', 'house.png'];

function Home({ onStart, onHowTo, onAbout }: { onStart: () => void; onHowTo: () => void; onAbout: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 2500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="home">
      <img className="logo" src={img('MASH.png')} alt="M.A.S.H. Adventure" />
      <div className="slides">
        {SLIDES.map((s, j) => <img key={s} src={img(s)} alt="" className={j === i ? 'on' : ''} />)}
      </div>
      <div className="home-buttons">
        <button className="choice" style={{ background: '#d86a92' }} onClick={onStart}>START</button>
        <button className="choice" style={{ background: '#796ad8' }} onClick={onHowTo}>How To Play Traditional MASH</button>
        <button className="choice" style={{ background: '#33c18d' }} onClick={onAbout}>About MASH Adventure</button>
      </div>
      <ArtistCard />
      <Credits />
    </div>
  );
}

type Go = (route: string, patch?: Partial<GameState>) => void;

function InputView({ id, state, go }: { id: string; state: GameState; go: Go }) {
  const screen = story.inputs[id];
  const existing = screen.group === 'profile' ? (state.profile as unknown as Record<string, string>) : state.groups[screen.group];
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(screen.fields.map((f) => [f.key, existing?.[f.key] ?? ''])));
  const [error, setError] = useState('');

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    if (screen.fields.some((f) => values[f.key].trim() === '')) return setError('Please fill in all values');
    if (screen.group === 'profile') go(screen.next, { profile: values as GameState['profile'] });
    else go(screen.next, { groups: { ...state.groups, [screen.group]: values } });
  };

  return (
    <form onSubmit={next} className="input-screen">
      <Blocks blocks={screen.blocks} vars={{}} onChoice={() => {}} />
      {screen.fields.map((f) => (
        <input
          key={f.key}
          placeholder={f.placeholder}
          value={values[f.key]}
          onChange={(e) => { setError(''); setValues((v) => ({ ...v, [f.key]: e.target.value })); }}
        />
      ))}
      {error && <p className="error">{error}</p>}
      <button className="choice anim-zoomIn" style={{ background: '#d34e4e' }} type="submit">Next</button>
    </form>
  );
}

function MagicNumber({ state, go }: { state: GameState; go: Go }) {
  const quizNum = useMemo(() => Math.floor(Math.random() * (10 - 1 + 1) + 1), []);
  const [showQ, setShowQ] = useState(false);
  const [showNum, setShowNum] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setShowQ(true), 1000);
    const b = setTimeout(() => setShowNum(true), 3000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  const vars = {
    show_question: showQ ? 'Did you draw something cool yet?' : ' ',
    show_random_num: showNum ? `Okay here's your magic number: ${quizNum}` : ' ',
  };
  const blocks = story.scenes.MashQuizNumber.blocks;
  return (
    <Blocks
      blocks={blocks}
      vars={vars}
      renderSketch={() => <SketchPad />}
      onChoice={(b) => {
        if (!showNum) return;
        go(b.to!, { number: { quiz_num: quizNum, story_num: b.story ?? 0 }, groups: { ...state.groups, mash: MASH_GROUP } });
      }}
    />
  );
}

function Results({ state, onHome }: { state: GameState; onHome: () => void }) {
  const res = useMemo(() => calculateMash(state.groups, state.number.quiz_num), [state.groups, state.number.quiz_num]);
  const ending = story.endings[String(state.number.story_num)] ?? story.endings.default;
  return (
    <div className="ending">
      <Blocks blocks={ending.blocks} vars={{ res, profile: state.profile, numbers: state.number }} onChoice={onHome} />
      <ArtistCard onDark />
      <Credits />
    </div>
  );
}
