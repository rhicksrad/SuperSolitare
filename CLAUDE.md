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

No timer. Resources per round: recycles (stock refills) and discards (burn top waste card). Foundation plays score chips × mult with streak-driven mult. 8 antes × small/big/boss blinds; fail one blind = run over. Shop between blinds sells jokers (with foil/holo/negative editions), god cards (Greek gods = planet/tarot analog), packs that enhance specific deck cards, and one voucher per ante (permanent upgrades). Skip tags are visible before skipping (`skipTagFor`). 5 starting decks + 3 stakes chosen at run start; ante 8 boss is always a finisher; endless mode continues past ante 8 (`ensureBossForAnte` rolls bosses lazily). The Hex boss curses card ids for the round via `round.curses`.

Audio is fully synthesized in `src/ui/audio.ts` (WebAudio, zero assets; engine/store call `sfx.*`). Card movement uses a FLIP hook keyed on `data-card-id` in `Board.tsx`; settings (sfx/music/reduceMotion) persist in localStorage separately from saves.

## Balance

`tests/balance.sim.test.ts` plays real rounds with a greedy bot. It's a *lower bound* on human play (it squanders streaks). If you touch scoring constants, joker numbers, or `ANTE_BASE_TARGETS` in `run.ts`, run it and keep its assertions honest rather than weakening them.

## Gotchas

- ESLint treats any `use*`-named function as a React hook — engine/store functions must avoid that prefix (hence `applyGodCard`, `activateGod`).
- Dev builds expose the store as `window.__game` (see `main.tsx`); the e2e specs rely on it.
- Deploys to GitHub Pages on push to main; vite `base` is `/SuperSolitare/` in production builds.
