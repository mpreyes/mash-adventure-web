# M.A.S.H. Adventure (web)

The classic pen-and-paper M.A.S.H. fortune game, combined with choose-your-own-adventure stories and fanfiction-style endings. Originally a React Native app made for funsies in summer 2018 ([original repo](https://github.com/mpreyes/Mash-Adventure)), now ported to the web.

By Madelyn. Support my artist project, [madebit](https://madebit.studio). Images from [Vecteezy.com](https://www.vecteezy.com).

## Develop

```bash
npm install
npm run dev
```

## Build

- `npm run build` builds for GitHub Pages (served at `/mash-adventure-web/`). Pushing to `main` deploys automatically.
- `npm run build:itch` builds with relative paths into `dist-itch/`. Zip that folder's contents and upload it to itch.io as an HTML game.

## How it's put together

- `src/story.json` holds every scene, input screen and ending, converted word for word from the original app's screens by `scripts/convert-rn-screens.mjs`.
- `src/mash.ts` is the original M.A.S.H. elimination logic.
- `src/App.tsx` renders scenes from the data, plus the input screens, the magic-number drawing pad and the results.
- `src/config.ts` holds the madebit links shown on the title screen and endings.

## Story wiring changes from the original

- The old man's "Take his last dying gift" now leads to **The Spooky Ending** (was Plot Generator).
- The wizard's "Accept gift" now leads to **The Magical Ending** (was Plot Generator).

Both endings existed in the original app but nothing led to them. If you rerun `scripts/convert-rn-screens.mjs`, reapply these two in `src/story.json`.
