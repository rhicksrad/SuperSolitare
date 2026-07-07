# CLAUDE.md — SuperSolitaire

Balatro-style roguelike built on Klondike solitaire. React 19 + TypeScript + Vite + Tailwind v4 + Zustand. Full rewrite as of July 2026 (the pre-rewrite game is in git history before that date).

## Commands

```bash
npm run dev      # dev server on :5173
npm test         # vitest: engine unit tests + balance simulation
npm run e2e      # playwright smoke tests; uses system Chrome (channel: 'chrome')
npm run build    # tsc -b && vite build
npm run lint
```

All four must stay green. Playwright's own browser download tends to stall on this machine — the config intentionally uses system Chrome.

## Design invariants

- **`src/engine/` is pure and UI-free.** No React, no DOM, no Date.now/Math.random — all randomness flows through the serializable seeded `Rng` so runs are reproducible from a seed (daily runs depend on this).
- `klondike.ts` applies moves and emits **events**; `scoring.ts` consumes events and owns the chips × mult pipeline plus the streak rule (streak breaks on stock deals/recycles, not tableau moves).
- Jokers/bosses/god cards are **registries keyed by id**; run state stores ids + per-joker scaling `state` only, so saves stay plain JSON (`save.ts`, versioned).
- The run owns one canonical 52-card deck with stable card ids (`H-12`), which is what makes per-card enhancements persist across rounds.
- `src/state/store.ts` is the only orchestration layer; UI components stay thin.

## Core game rules (the pitch)

No timer. Resources per round: recycles (stock refills) and discards (burn top waste card). Foundation plays score chips × mult with streak-driven mult. 8 antes × small/big/boss blinds; fail one blind = run over. Shop between blinds sells jokers (with foil/holo/negative editions), god cards (Greek gods = planet/tarot analog), packs that enhance specific deck cards, and one voucher per ante (permanent upgrades). Skip tags are visible before skipping (`skipTagFor`). New Run deals immediately with the menu-selected loadout (deck + stake, persisted in localStorage as `ss-loadout-v1`; `quickStart` clamps stale selections). Progression is sticker-style: `LifetimeStats.stakeWins` maps deck id → highest stake beaten; any win with a deck unlocks the next deck, and stakes unlock **per deck** (`unlockedDeckIds`/`unlockedStakesFor`/`deckSticker` in `decks.ts`); locked options are hidden, and the menu's loadout picker only appears once something is unlocked. The collection is discovery-gated: jokers/gods/bosses/vouchers render as "?" until seen in a run (`LifetimeStats.discovered`, recorded by the store's `discover*` helpers on shop generation, pack opens, and blind-select). Ante 8 boss is always a finisher; endless mode continues past ante 8 (`ensureBossForAnte` rolls bosses lazily). The Hex boss curses card ids for the round via `round.curses`.

SFX are fully synthesized in `src/ui/audio.ts` (WebAudio; engine/store call `sfx.*`). Music is 25 public-domain MP3s in `public/music/` (see `CREDITS.md` there) looped through WebAudio with a crossfade — one track per round (`a{ante}-{small|big|boss}`, endless cycles antes 6–8) plus a menu/shop lounge. The scene is derived from `screen`+`run.ante`+`run.blindIndex` by a store subscriber at the bottom of `store.ts`; buffers load lazily and the subscriber preloads the current ante's three tracks between rounds. The collection's Sound Test plays any track via the `setJukebox` override (cleared by the subscriber on leaving the collection); tracks unlock by `stats.bestAnte`. Card movement uses a FLIP hook keyed on `data-card-id` in `Board.tsx`; settings (sfx/music/reduceMotion) persist in localStorage separately from saves.

All visuals are code-generated: pixel sprites for every joker/god/boss/voucher live as character grids in `src/ui/art.ts` (rendered by `PixelSprite` in `sprites.tsx`, shared colors in `palette.ts`); `tests/ui.art.test.ts` fails if a registry id lacks art or a grid is malformed — new jokers/gods/bosses/vouchers/pack-types need a sprite. The only binary assets are the music MP3s and two bundled fonts: Pixelify Sans for letters and Silkscreen for numerals — Pixelify's digits are ambiguous (3/8, 5/S), so `main.tsx` injects a `unicode-range` @font-face ('Pixel Digits') that swaps in Silkscreen for U+0030-0039 and `$` everywhere; card rank indices are hand-drawn `RankGlyph` sprites, not font glyphs. Chunky pixel buttons are `.btn` + `.btn-{gold,dark,green,red,purple}`; collectible frames are the `.pcard` variants in `index.css` (jokers = paper "J" playing cards, gods = gilded tarot, vouchers = punched tickets).

SEO raster assets (`og.png`, `icon-512.png`, `apple-touch-icon.png`) are also code-generated: `scripts/generate-og.mjs` (dependency-free Node with its own PNG encoder + 5×7 pixel font) writes them into `public/` via the npm `prebuild` hook; they're gitignored rather than committed. Static SEO files (`robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `404.html`, `favicon.svg`) live in `public/`; the meta/OG/JSON-LD markup is in `index.html` and hardcodes the canonical URL `https://rhicksrad.github.io/SuperSolitare/`.

## Balance

`tests/balance.sim.test.ts` plays real rounds with a greedy bot. It's a *lower bound* on human play (it squanders streaks). If you touch scoring constants, joker numbers, or `ANTE_BASE_TARGETS` in `run.ts`, run it and keep its assertions honest rather than weakening them.

## Gotchas

- ESLint treats any `use*`-named function as a React hook — engine/store functions must avoid that prefix (hence `applyGodCard`, `activateGod`).
- Dev builds expose the store as `window.__game` (see `main.tsx`); the e2e specs rely on it.
- Deploys to GitHub Pages on push to main; vite `base` is `/SuperSolitare/` in production builds.
