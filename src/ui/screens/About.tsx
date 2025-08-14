import { useStore } from '../../state/store'

export default function About() {
  const goTo = useStore((s) => s.goTo)
  return (
    <div className="min-h-full p-6 flex items-center justify-center">
      <div className="w-full max-w-3xl">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 shadow-xl p-6">
          <div className="text-center mb-4">
            <div className="text-2xl font-semibold">About SuperSolitaire</div>
            <div className="text-xs text-slate-400 mt-1">Run-based solitaire with shops, jokers, god cards, and boss modifiers</div>
          </div>

          <div className="flex flex-col gap-6 text-sm text-slate-200">
            <section>
              <h3 className="text-slate-100 font-semibold mb-2">Game Overview</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>Seeded runs with deterministic RNG</li>
                <li>Rounds 1–8, each round has 3 boards: Small, Big, Boss</li>
                <li>Skip options: skip to Big (+3 coins), skip to Boss (+8 coins)</li>
                <li>Boss boards apply modifiers that change rules/scoring</li>
              </ul>
            </section>

            <section>
              <h3 className="text-slate-100 font-semibold mb-2">Solitaire Rules</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>Tableau: 7 columns; build down by alternating color</li>
                <li>Foundations: 4; build up by suit (A→K)</li>
                <li>Kings move to empty tableau columns</li>
                <li>Stock → Waste: deal 3; redeals limited per round</li>
                <li>Drag or double-click to move; keyboard: D deal, Z undo, H hint, ESC cancel</li>
              </ul>
            </section>

            <section>
              <h3 className="text-slate-100 font-semibold mb-2">Scoring</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>Move to foundation: +50 (multiplied by foundation streak and diminishing returns)</li>
                <li>Reveal a face-down card: +30</li>
                <li>Empty a tableau column: +200</li>
                <li>Foundation streak: +x1.2 per consecutive foundation move</li>
                <li>Diminishing returns after many foundation moves; shown in HUD</li>
                <li>End-of-board bonus based on foundations built and time remaining</li>
              </ul>
            </section>

            <section>
              <h3 className="text-slate-100 font-semibold mb-2">Jokers & God Cards</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>Jokers: passive effects; up to 5 slots; rarity-weighted</li>
                <li>God cards: single-use; power-ups (e.g., reveal tops, +30s, double next)</li>
                <li>Score ranks: rank up categories (foundation/reveal/empty) to increase value</li>
              </ul>
            </section>

            <section>
              <h3 className="text-slate-100 font-semibold mb-2">Shops</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>Buy packs (cards/jokers/gods), individual jokers, god cards, or boosts</li>
                <li>Rerolls are deterministic by seed; locks preserve chosen items</li>
                <li>Special offer: one per round, cannot be rerolled, slightly expensive</li>
              </ul>
            </section>

            <section>
              <h3 className="text-slate-100 font-semibold mb-2">Boss Modifiers</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>Examples: Red Alert (−20% red), Thin Waste (waste top only), Night Mode (+10% target/+10% points)</li>
                <li>Glacial Start (no foundation first 10s), Frozen Royals (no K/Q first 5 moves)</li>
                <li>Suit Tax – Spades (foundation spades score 0), Half-Deck (stock halved), Mirror Moves</li>
              </ul>
            </section>

            <section>
              <h3 className="text-slate-100 font-semibold mb-2">Controls & Accessibility</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>Keyboard: D deal, Z undo, H hint, ESC cancel</li>
                <li>Theme: dark/light/high-contrast; Accent color picker</li>
                <li>Color-blind mode; reduced motion; focus outlines</li>
              </ul>
            </section>
          </div>

          <div className="mt-6 text-center">
            <button className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2" onClick={() => goTo('start')}>Back</button>
          </div>
        </div>
      </div>
    </div>
  )
}


