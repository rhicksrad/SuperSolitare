# SuperSolitaire

A roguelike deck-builder built on Klondike solitaire — Balatro's run structure married to the classic 52-card game.

**Play:** https://rhicksrad.github.io/SuperSolitare/

## The loop

- A run is **8 antes**, each with a **Small Blind, Big Blind, and Boss Blind** — escalating score targets on fresh Klondike deals. Fail any blind and the run is over.
- **No timer.** Your limits are **recycles** (refilling the stock from the waste, base 2) and **discards** (burning the top waste card to dig, base 3).
- Playing a card to a foundation scores **chips × mult**. Chips come from the card and your foundation level; mult grows with your **streak** — consecutive foundation plays without dealing from the stock. Plan your cascades, then chain them.
- Reveals and emptied columns score flat points. Clearing the whole board pays a big bonus.
- Reach the target, then choose: **cash out** and bank the win, or keep playing toward a board clear.
- Winnings buy **jokers** (47 of them — flat bonuses, conditional ×mults, economy, rule-benders, and scalers, some rolled with **Foil/Holo/Negative editions**), **god cards** (13 one-shot consumables: permanent level-ups from Ares/Hermes/Hestia, tricks from Zeus, Artemis's waste-burn, Hecate's curse cleansing…), **card enhancements** (Gilded/Ruby/Sapphire/Lucky, permanently attached to specific deck cards), and **vouchers** (10 permanent run upgrades, one offered per ante).
- **15 boss blinds** bend the rules — no discards, 5-card deals, muted reveals, silenced jokers, The Hex cursing your cards — and ante 8 always ends on one of **3 finisher bosses**.
- Skipping a small/big blind grants the **tag** shown on its card. Choose one of **5 starting decks** and one of **3 stakes**; win ante 8 and keep going in **Endless mode**.
- All sound is synthesized live in WebAudio (no assets), cards physically fly between piles, and there's a full **collection compendium** on the menu.

Runs are fully seeded and deterministic — share a seed to race a friend, or play the **Daily Run**.

## Controls

| Input | Action |
|---|---|
| Click | Select a card / stack, then click a destination |
| Drag & drop | Same thing, but with more flair |
| Double-click | Send card to its foundation |
| `D` / `Space` | Deal from stock (or recycle when empty) |
| `X` | Discard the top waste card |
| `Esc` | Cancel selection |

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # engine unit tests + balance simulation (vitest)
npm run e2e        # browser smoke tests (Playwright, uses system Chrome)
npm run build      # type-check + production build
npm run lint
```

### Architecture

- `src/engine/` — pure, UI-free game logic. Deterministic seeded RNG (`rng.ts`), Klondike rules emitting move events (`klondike.ts`), the chips×mult pipeline (`scoring.ts`), registries for jokers/bosses/god cards, run orchestration and economy (`run.ts`, `shop.ts`), versioned saves (`save.ts`).
- `src/state/store.ts` — a Zustand store that orchestrates the engine and holds UI state.
- `src/ui/` — React components: menu, blind select, game board, shop, end screens.
- `tests/` — engine unit tests plus a greedy-bot balance simulation that plays real rounds to keep blind targets honest.

Deployed to GitHub Pages automatically on pushes to `main`.
