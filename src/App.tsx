import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { story, screenFor } from './story';
import { Blocks, InlineView, img, preload, imagesIn } from './Blocks';
import { SketchPad } from './SketchPad';
import { Spread, useIsDesktop } from './Spread';
import { beatsFor } from './beats';
import { BeatView, CONSUMES_IMAGE } from './BeatView';
import { ArtistCard, Credits } from './ArtistCard';
import { calculateMash, MASH_GROUP } from './mash';
import type { Block, GameState } from './types';
import { ruleFor, inputPropsFor, sanitize } from './validation';
import { ENDING_IDS, endingIdFor, endingTitle, useUnlocked } from './endings';

const SAVE_KEY = 'mash-adventure-save-v1';
// Original ending colors, each swapped for the closest madebit palette color.
const RESULT_BG = ['#9DBE3D', '#187489', '#93C78E', '#F77FA1', '#F2B84B', '#796AD8', '#187489', '#F2B84B', '#C8332D', '#93C78E', '#796AD8', '#796AD8'];

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
  const { unlocked, unlock } = useUnlocked();

  // Reset scroll before the new screen paints, so it never shows up mid-page and then jumps.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [state.route, state.history.length]);

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state.route]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (route: string, patch: Partial<GameState> = {}) =>
    setState((s) => ({ ...s, ...patch, route, history: route === 'Home' ? [] : [...s.history, s.route] }));
  const back = () => setState((s) => ({ ...s, route: s.history[s.history.length - 1] ?? 'Home', history: s.history.slice(0, -1) }));
  // Answers are kept between runs so players can replay for a different ending without retyping.
  const home = () => setState((s) => ({ ...fresh(), profile: s.profile, groups: s.groups }));
  const startOver = () => setState(fresh());
  const replay = () => setState((s) => ({ ...fresh(), profile: s.profile, groups: s.groups, route: 'MashQuizNumber' }));

  const onChoice = (b: Extract<Block, { t: 'choice' }>) => {
    if (b.href) return void window.open(b.href, '_blank');
    if (!b.to) return;
    if (b.to === 'Home') return home();
    const number = b.story === undefined ? state.number : { ...state.number, story_num: b.story };
    go(b.to, { number });
  };

  const id = screenFor(state.route);

  // Preload the images of every screen one tap away, so they're ready when the player arrives.
  useEffect(() => {
    const blocksOf = (sid: string) => story.scenes[sid]?.blocks ?? story.inputs[sid]?.blocks ?? [];
    const here = id === 'Home' ? [{ t: 'choice' as const, to: 'Profile' }, { t: 'choice' as const, to: 'Mash' }, { t: 'choice' as const, to: 'About' }] : blocksOf(id);
    const next = new Set<string>();
    const collect = (list: typeof here) => list.forEach((b) => { if (b.t === 'row') collect(b.c); if (b.t === 'choice' && b.to) next.add(screenFor(b.to)); });
    collect(here);
    if (story.inputs[id]) next.add(screenFor(story.inputs[id].next));
    const srcs = [...next].flatMap((n) => imagesIn(blocksOf(n)));
    if (next.has('Results')) srcs.push(...Object.values(story.endings).flatMap((e) => imagesIn(e.blocks)));
    preload(srcs);
  }, [id]);
  // Desktop: press A, B, C... to pick a lettered choice.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      const btn = document.querySelector<HTMLButtonElement>(`main [data-key="${e.key.toUpperCase()}"]`);
      if (btn) { e.preventDefault(); btn.click(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const vars = { profile: state.profile, numbers: state.number };
  const isResult = id === 'Results';
  const isEndings = id === 'Endings';

  let body: React.ReactNode;
  if (id === 'Home') body = <Home hasAnswers={!!state.profile.name} unlockedCount={unlocked.length} onStart={() => go('Profile')} onReplay={replay} onClear={startOver} onHowTo={() => go('Mash')} onAbout={() => go('About')} onEndings={() => go('Endings')} />;
  else if (isEndings) body = <EndingsView unlocked={unlocked} onPlay={state.profile.name ? replay : () => go('Profile')} />;
  else if (story.inputs[id]) body = <InputView key={id} id={id} state={state} go={go} />;
  else if (id === 'MashQuizNumber') body = <MagicNumber state={state} go={go} />;
  else if (isResult) body = <Results state={state} unlocked={unlocked} unlock={unlock} onReplay={replay} onStartOver={startOver} onEndings={() => go('Endings')} />;
  else if (story.scenes[id]) body = <Spread blocks={story.scenes[id].blocks} vars={vars} onChoice={onChoice} />;
  else body = <p className="para">Lost in the woods. <button className="choice" onClick={home}>Home</button></p>;

  return (
    <div className="app">
      {id !== 'Home' && (
        <header className="topbar">
          {!isResult && state.history.length > 0 ? (
            <button className="icon-btn" onClick={back} aria-label="Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          ) : <span className="icon-btn ghost" />}
          <span className="title">{isResult ? 'RESULTS' : isEndings ? 'ENDINGS' : <>M.A.S.H.<span className="desktop-only"> ADVENTURE</span></>}</span>
          <div className="topbar-right">
            {!isEndings && (
              <button className="header-endings desktop-only" onClick={() => go('Endings')}>
                ENDINGS <span className="count-badge">{unlocked.length}/{ENDING_IDS.length}</span>
              </button>
            )}
            <button className="icon-btn" onClick={home} aria-label="Home">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>
            </button>
          </div>
        </header>
      )}
      <main key={state.route + state.history.length} className={`screen ${isResult ? 'result' : ''}`}>
        {body}
      </main>
    </div>
  );
}

const SLIDES = ['mansion.png', 'apartment.png', 'shack.png', 'house.png'];

type HomeProps = { hasAnswers: boolean; unlockedCount: number; onStart: () => void; onReplay: () => void; onClear: () => void; onHowTo: () => void; onAbout: () => void; onEndings: () => void };

function Home({ hasAnswers, unlockedCount, onStart, onReplay, onClear, onHowTo, onAbout, onEndings }: HomeProps) {
  const [i, setI] = useState(0);
  useEffect(() => preload(SLIDES), []);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 2500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="home">
      <img className="logo" src={img('MASH.png')} alt="M.A.S.H. Adventure" />
      <div className="home-main">
        <div className="card slides-card">
          <div className="slides">
            {SLIDES.map((s, j) => <img key={s} src={img(s)} alt="" className={j === i ? 'on' : ''} />)}
          </div>
          <div className="chips" aria-hidden="true">
            {'MASH'.split('').map((l, j) => <span key={l} className={j === i ? 'chip on' : 'chip'}>{l}</span>)}
          </div>
          <span className="slides-caption">Mansion? Apartment? Shack? House?</span>
        </div>
        <div className="home-actions">
          {hasAnswers ? (
            <>
              <button className="btn btn-start" onClick={onReplay}>PLAY AGAIN</button>
              <div className="btn-pair">
                <button className="btn btn-gold" onClick={onStart}>EDIT ANSWERS</button>
                <button className="btn btn-cream" onClick={onClear}>START OVER</button>
              </div>
            </>
          ) : (
            <button className="btn btn-start" onClick={onStart}>START</button>
          )}
          <div className="btn-pair">
            <button className="btn btn-purple" onClick={onHowTo}>HOW TO PLAY</button>
            <button className="btn btn-mint" onClick={onAbout}>ABOUT</button>
          </div>
          <button className="btn btn-cream btn-endings" onClick={onEndings}>
            ENDINGS <span className="count-badge">{unlockedCount}/{ENDING_IDS.length}</span>
          </button>
          <div className="home-foot">
            <ArtistCard />
            <Credits />
          </div>
        </div>
      </div>
    </div>
  );
}

type Go = (route: string, patch?: Partial<GameState>) => void;

function InputView({ id, state, go }: { id: string; state: GameState; go: Go }) {
  const screen = story.inputs[id];
  const existing = screen.group === 'profile' ? (state.profile as unknown as Record<string, string>) : state.groups[screen.group];
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(screen.fields.map((f) => [f.key, existing?.[f.key] ?? ''])));
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    const found = Object.fromEntries(screen.fields.map((f) => [f.key, ruleFor(f.key).check(values[f.key])]));
    setErrors(found);
    const firstBad = screen.fields.find((f) => found[f.key]);
    if (firstBad) return void document.getElementById(`f-${firstBad.key}`)?.focus();
    const clean = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]));
    if (screen.group === 'profile') go(screen.next, { profile: clean as GameState['profile'] });
    else go(screen.next, { groups: { ...state.groups, [screen.group]: clean } });
  };

  return (
    <form onSubmit={next} className="input-screen" noValidate>
      <Spread blocks={screen.blocks} vars={{}} onChoice={() => {}} after={<>
      {screen.fields.map((f) => {
        const rule = ruleFor(f.key);
        const err = errors[f.key];
        return (
          <div key={f.key} className="field">
            <input
              id={`f-${f.key}`}
              aria-label={f.placeholder}
              aria-invalid={!!err}
              aria-describedby={err ? `e-${f.key}` : undefined}
              placeholder={f.placeholder}
              value={values[f.key]}
              {...inputPropsFor(rule)}
              onChange={(e) => {
                const v = sanitize(rule, e.target.value);
                setValues((x) => ({ ...x, [f.key]: v }));
                if (err) setErrors((x) => ({ ...x, [f.key]: null }));
              }}
            />
            {err && <p className="error" id={`e-${f.key}`}>{err}</p>}
          </div>
        );
      })}
      <button className="btn btn-start" type="submit">NEXT</button>
      </>} />
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
    <Spread
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

const FORTUNE_LABELS = ['Home', 'Love', 'City', 'Kids', 'Job', 'Ride', 'Bank', 'Pet'];

type ResultsProps = { state: GameState; unlocked: string[]; unlock: (id: string) => boolean; onReplay: () => void; onStartOver: () => void; onEndings: () => void };

function Progress({ filled, total, small = false }: { filled: number; total: number; small?: boolean }) {
  return (
    <div className={`progress ${small ? 'small' : ''}`} role="img" aria-label={`${filled} of ${total} endings unlocked`}>
      {Array.from({ length: total }, (_, i) => <span key={i} className={i < filled ? 'on' : ''} />)}
    </div>
  );
}

function Results({ state, unlocked, unlock, onReplay, onStartOver, onEndings }: ResultsProps) {
  const desktop = useIsDesktop();
  const endingId = endingIdFor(state.number.story_num);
  const [isNew, setIsNew] = useState(false);
  useEffect(() => { if (unlock(endingId)) setIsNew(true); }, [endingId]); // eslint-disable-line react-hooks/exhaustive-deps
  const res = useMemo(() => calculateMash(state.groups, state.number.quiz_num), [state.groups, state.number.quiz_num]);
  const ending = story.endings[endingId];
  const beats = useMemo(() => beatsFor(endingId, ending), [endingId, ending]);
  const [step, setStep] = useState(0);
  const total = beats.length + 1; // + the fortune screen
  const isFinal = step === beats.length;
  const beat = beats[step];
  const next = () => setStep((s) => Math.min(total - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        if ((e.target as HTMLElement).tagName === 'BUTTON' && e.key !== 'ArrowRight') return;
        e.preventDefault(); next();
      }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [step]);

  const bg = RESULT_BG[ending.bg ?? 0] ?? RESULT_BG[0];
  const title = endingTitle(endingId);
  const vars = { res, profile: state.profile, numbers: state.number, __mark: true };
  const theme = isFinal ? '' : beat?.dark ? 'lights-out' : beat?.overlay?.theme === 'dark' ? 'lights-out' : beat?.overlay?.theme ? `theme-${beat.overlay.theme}` : '';
  const ctx = { vars, res, state };
  // Desktop: the left page always shows a picture (this beat's, or the ending's own).
  const ownImage = beat?.image && !(beat.overlay?.layout && CONSUMES_IMAGE.has(beat.overlay.layout)) ? beat.image : undefined;
  const usable = (b: typeof beat) => (b?.image && !(b.overlay?.layout && CONSUMES_IMAGE.has(b.overlay.layout)) ? b.image : undefined);
  const leftImage = ownImage ?? beats.slice(0, step + 1).reverse().map(usable).find(Boolean) ?? beats.map(usable).find(Boolean) ?? 'fortune.png';

  const fortune = (
    <section className="card fortune" aria-label="Your fortune">
      <span className="fortune-head">YOUR FORTUNE · MAGIC NUMBER {state.number.quiz_num}</span>
      <dl>
        {FORTUNE_LABELS.map((l, i) => (
          <div key={l}><dt>{l}</dt><dd>{res[i]}</dd></div>
        ))}
      </dl>
    </section>
  );

  const controls = (
    <div className="beat-controls">
      <button className="icon-btn big" onClick={prev} disabled={step === 0} aria-label="Previous part">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <button className="btn btn-start" onClick={next}>{step === beats.length - 1 ? 'SEE MY FORTUNE' : 'NEXT'}</button>
    </div>
  );

  return (
    <div className={`ending ${theme}`}>
      <header className="band" style={{ background: bg, color: isLight(bg) ? '#111111' : '#F8F6EF' }}>
        <div className="band-top">
          <span className="band-eyebrow">YOU GOT:</span>
          <span className="band-eyebrow">{step + 1} / {total}</span>
        </div>
        <h1 className="band-title">{title}</h1>
        <div className="band-progress" aria-hidden="true">
          <span style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
      </header>

      {isFinal ? (
        <div className="ending-body final" key="final">
          {isNew && (
            <div className="unlock-strip boxed">
              <span className="new-tag">NEW!</span>
              <div className="unlock-text">
                <span>Ending unlocked · {unlocked.length} of {ENDING_IDS.length}</span>
                <Progress filled={unlocked.length} total={ENDING_IDS.length} small />
              </div>
            </div>
          )}
          {fortune}
          <button className="btn btn-teal" onClick={onReplay}>PLAY AGAIN</button>
          <p className="replay-note">Same answers, new magic number, maybe a new ending.</p>
          <button className="btn btn-cream" onClick={onEndings}>SEE ALL ENDINGS</button>
          <button className="btn btn-cream" onClick={onStartOver}>START OVER</button>
          <button className="link-btn" onClick={() => setStep(0)}>Read it again</button>
          <ArtistCard ending />
          <Credits />
        </div>
      ) : desktop ? (
        <div className="ending-body">
          <div className="spread beat-spread">
            <div className="page page-left">
              {leftImage && <figure className="art-card"><img src={img(leftImage)} alt="" /></figure>}
            </div>
            <div className="page page-right">
              <BeatView key={step} beat={beat} ctx={ctx} showImage={false} />
              {controls}
              <p className="kbd-hint">Tip: use the arrow keys to turn the page</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="ending-body beat-body">
          <BeatView key={step} beat={beat} ctx={ctx} showImage />
          {controls}
        </div>
      )}
    </div>
  );
}

function EndingsView({ unlocked, onPlay }: { unlocked: string[]; onPlay: () => void }) {
  const total = ENDING_IDS.length;
  return (
    <div className="endings">
      <section className="card endings-summary">
        <div className="endings-count">
          <span className="big">{unlocked.length}<span className="of"> / {total}</span></span>
          <span className="label">endings unlocked</span>
        </div>
        <Progress filled={unlocked.length} total={total} />
        <p>Same answers, different choices.</p>
      </section>
      <ul className="endings-grid">
        {ENDING_IDS.map((id, i) => {
          const open = unlocked.includes(id);
          const bg = RESULT_BG[story.endings[id].bg ?? 0];
          const num = String(i + 1).padStart(2, '0');
          return open ? (
            <li key={id} className="ending-card">
              <span className="num" style={{ background: bg, color: isLight(bg) ? '#111111' : '#F8F6EF' }}>{num}</span>
              <span className="name">{endingTitle(id).replace(/^The /, '')}</span>
              <span className="state">Unlocked</span>
            </li>
          ) : (
            <li key={id} className="ending-card locked" aria-label={`Ending ${num}, locked`}>
              <span className="num">{num}</span>
              <span className="lock">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><rect x="5" y="11" width="14" height="10" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                <span>???</span>
              </span>
            </li>
          );
        })}
      </ul>
      <button className="btn btn-start" onClick={onPlay}>PLAY AGAIN</button>
    </div>
  );
}
