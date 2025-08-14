### SuperSolitaire — Chronological Completion Plan

This is the ordered roadmap for taking SuperSolitaire from MVP to a polished, production-quality, run-based solitaire. Work from top to bottom.

1) Bootstrap, Tooling, and Core Scaffolds
- [x] Vite + React + TS + Tailwind + ESLint/Prettier setup
- [x] Unit/E2E test harness (Vitest + Playwright)
- [x] Design tokens: `src/styles/tokens.css` (spacing, radii, fonts, focus rings, card colors)
- [x] App shell, routing stubs, and Start screen

2) Pure Game Core (Deterministic, Tested)
- [x] RNG LCG with cloning/serialization; tests
- [x] Cards/helpers, deck build/shuffle, initial Klondike deal; tests
- [x] Core reducers: legality + applyMove, undo/redo stack; tests
- [x] Scoring baseline (foundation/reveal/empty-column) with streaks; tests

3) State + UI Integration (Playable MVP)
- [x] Zustand store wiring, selectors, and actions
- [x] Board + Card components; click-to-select, click target
- [x] Keyboard: D deal, Z undo, H hint, ESC cancel
- [x] HUD + Timer with live score/target/redeals/time
- [x] Error reasons surfaced in HUD
- [x] Basic animations: hover-lift, card pop-in, foundation pulse, waste fan

4) Score/Run Flow UX
- [x] End-of-round Run Summary with actions (Shop / Next)
- [x] Run Summary does not block inputs after "Next"
- [x] Run bonus (time + foundation progress) and unit tests
- [x] Coins breakdown in summary (base + bonus [+ perfect])
- [x] Diminishing returns tuning; HUD indicator in place
  - [x] Initial tuning: threshold 16, decay 0.92

5) Run Orchestration (Rounds/Blinds)
- [x] Start Small/Big/Boss rounds; active boss list plumbed to reducer
- [x] Persist `blindIndex` across resume (infer from history)
- [x] Auto-advance after summary via Start Next Board
- [x] Target/time scaling tuning across A1–A8 (discrete curve)
  - [x] Increased round timers by 3× for longer sessions

5.1) Input polish
- [x] Drag from waste and tableau stacks; drop on legal piles
- [x] Visible waste fan (3 cards)
- [x] Double-click auto-send top tableau card to foundation
 - [x] Double-click auto-send top waste card to foundation
 - [x] Stock/waste gating prevents extra deals until current waste group is consumed

6) Boss Modifiers
 - [x] Boss middleware hooks (beforeMove / onScore / onRoundStart)
 - [x] Implemented: Red Alert, Stoic Stock, Thin Waste, Night Mode, Glacial Start, Frozen Royals, Suit Tax – Spades, Half-Deck, Mirror Moves
 - [x] Tests added: Night Mode, Stoic Stock, Half-Deck, Mirror Moves
 - [x] HUD banner + per-boss icon slot (icons directory pending)

Next up:
- Joker equip/unequip tray with reorder + tooltips; serialization v2 by id/variant.
- Economy tuning + variant rarity distribution tests.

7) Jokers System
 - [x] Registry + hooks plumbing (onRoundStart/onMove/onRoundEnd)
  - [x] Implement effects: Royal Decree, Perfect Draw, Overtime, Tactician, Column Marshal
 - [x] Effects implemented: Early Bird, Archivist, Snap (charge/double next), Waste Not, Tempo, Ace Pilot
 - [x] Baseline effects present: Monochrome, Streak Freak, Deep Cut, Cascade (tests)
 - [ ] Equip/unequip UI: 5-slot tray, drag to reorder, click to unequip, tooltip with rarity + description + SVG
   - [x] Unequip and reorder controls in JokerTray (arrows, remove)
 - [x] Serialization: save ids only; rehydrate via registry on load (v2 payload)
   - [x] Save v2: jokers serialized by id + variant; load migrates v1 → v2

8) Shop & Economy
- [x] Deterministic, rarity-weighted reroll with locks; pricing bands; rank-up gods (Ares/Hermes/Hestia)
- [x] Buy jokers (max 5) and one-shot boosts (+1 redeal, +10% time, −10% target)
- [x] Selling: 50% refund with visible UI affordance
 - [x] One free reroll; subsequent rerolls cost 3 coins
 - [x] One special offer per round (locked, cannot be rerolled)
 - [x] Foil/Holo joker variants (deterministic naming/pricing; boosted effects)
- [ ] Economy tuning + tests for coin math (buy/sell) and rarity distribution

9) Save/Load & Daily Runs
- [x] Versioned save payload and migrations scaffold (`save.ts`)
- [x] Continue Run (resume) flow
- [x] Daily seed mode + local best + one-run-per-day gate

10) Visuals, Themes, and Assets
 - [x] Theme switch (dark/light/high-contrast) + runtime accent picker
 - [ ] Card art variants (minimal/outlined/double-suit)
 - [x] Joker SVG drop-points: `public/assets/jokers/`; `README.md` with sizing guidance
 - [x] Icons directory: `public/assets/icons/`
   - [x] Added placeholders: night-mode, red-alert, stoic-stock, thin-waste
   - [x] Added placeholders: glacial-start, frozen-royals, half-deck, mirror-moves, suit-tax-spades
 - [ ] Optional card pip artwork: `public/assets/cards/`
  - [x] Top bar cohesive panel styling
  - [x] Boss Banner + Shop Modal cohesive visual refactor

ARIA & Input
- [x] Board region/labels for tableau/foundations; keyboard activation for tableau cells
- [x] Stock/Waste/foundation roles/labels improved
- [x] Snap audio/visual feedback on drag
- [ ] Further ARIA for drag announcements (polite)

11) UI/UX Polish and Accessibility
- [x] Responsive layout (phone → desktop) — initial pass: grid breakpoints, padding adjustments
- [ ] Drag/drop with snapping polish; keyboard shortcuts verified
- [ ] Subtle sounds (WebAudio); mute toggle
  - [x] Lightweight SFX for deal/foundation; obeys Settings → Sounds
  - [x] Joker Tray: drag-to-reorder + keyboard reordering; tooltips
  - [x] Boss chips in top bar; Start-of-round modal
  - [x] Accessibility: live region for HUD messages; keyboard tooltip support
  - [x] Color-blind suit indicators toggleable in Settings
 - [x] Skip link to board for keyboard users
  
Top bar
- [x] Cohesive panel visuals
- [x] Ranks capsule with values and + buttons
- [x] God capsule showing current god cards (click to use); scrollable on smaller widths
- [x] HUD message affordance improvement (dismiss button)
- [ ] Accessibility: semantic roles/labels, focus outlines, screen reader announcements (more), responsive tweaks
 - [x] Back to Menu control in top bar
 - [x] Rank patrons (god names/titles) surfaced next to ranks in top bar
 - [x] Board accessibility: ARIA labels and keyboard activation for stock/waste

12) Achievements
- [x] Local-only achievements model + basic unlocks
- [x] Badges render from `public/assets/achievements/`
- [ ] Additional unlocks: boss perfect; more milestones

13) Testing & Telemetry
- [ ] ≥80% unit coverage across `src/game/`
- [ ] E2E coverage: smoke run, boss variety, shop, save/load
- [ ] Optional analytics interface (no network by default)

14) Packaging & Docs
- [ ] `npm run build` produces static site (Netlify/GitHub Pages ready)
- [ ] README: controls, modes, seeds, architecture, contribution guide

15) Stretch Goals
- [ ] Custom rules mode (deal-1/3, unlimited redeals, strict scoring)
- [ ] Challenge cards (run mutators)
- [ ] Cosmetic theme packs (dark, neon, paper)

Non-goals (for now)
- [ ] WebGL (stick to CSS transforms for perf/clarity)
- [ ] Networked leaderboards (local-only daily bests remain)
