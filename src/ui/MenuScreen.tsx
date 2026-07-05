import { useState } from 'react'
import { todaysDailySeed } from '../engine/save'
import { useGame } from '../state/store'

export function MenuScreen() {
  const newGame = useGame((s) => s.newGame)
  const continueGame = useGame((s) => s.continueGame)
  const hasSave = useGame((s) => s.hasSave)
  const stats = useGame((s) => s.stats)
  const [seed, setSeed] = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full flex flex-col gap-6 text-center">
        <div>
          <h1 className="text-5xl font-black tracking-tight">
            Super<span style={{ color: 'var(--gold)' }}>Solitaire</span>
          </h1>
          <p className="mt-2 text-slate-400">
            A roguelike deck-builder built on Klondike. Chain foundation plays for chips × mult, beat escalating
            blinds, and build a joker engine across 8 antes.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {hasSave && (
            <button
              className="rounded-xl bg-emerald-500 text-slate-900 font-bold py-3 text-lg hover:brightness-110"
              onClick={continueGame}
            >
              Continue Run
            </button>
          )}
          <button
            className="rounded-xl bg-[var(--gold)] text-slate-900 font-bold py-3 text-lg hover:brightness-110"
            onClick={() => newGame(seed || undefined)}
            data-testid="new-run"
          >
            New Run
          </button>
          <button
            className="rounded-xl bg-slate-700/70 font-bold py-3 hover:bg-slate-600/70 has-tip"
            onClick={() => newGame(undefined, 'daily')}
          >
            Daily Run
            <span className="tip">Everyone gets the same seed today: {todaysDailySeed()}</span>
          </button>
          <input
            className="rounded-lg bg-slate-800/80 border border-slate-600/50 px-3 py-2 text-sm text-center placeholder:text-slate-500"
            placeholder="Custom seed (optional)"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            aria-label="Custom seed"
          />
        </div>

        <div className="panel p-4 grid grid-cols-2 gap-2 text-sm">
          <div className="text-slate-400 text-left">Runs started</div>
          <div className="text-right font-semibold big-number">{stats.runsStarted}</div>
          <div className="text-slate-400 text-left">Runs won</div>
          <div className="text-right font-semibold big-number">{stats.runsWon}</div>
          <div className="text-slate-400 text-left">Best ante</div>
          <div className="text-right font-semibold big-number">{stats.bestAnte || '—'}</div>
          <div className="text-slate-400 text-left">Best single play</div>
          <div className="text-right font-semibold big-number">{stats.bestPlay ? stats.bestPlay.toLocaleString() : '—'}</div>
        </div>

        <details className="text-left text-sm text-slate-400 panel p-4">
          <summary className="cursor-pointer font-semibold text-slate-300">How to play</summary>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Each blind is a fresh Klondike deal. Reach the target score, then cash out.</li>
            <li>Playing a card to a foundation scores chips × mult. Consecutive foundation plays build your streak, raising mult — dealing from the stock resets it.</li>
            <li>No timer. Your limits are recycles (stock refills) and discards (burn the top waste card to dig).</li>
            <li>Win money, buy jokers and god cards in the shop, enhance your deck, and survive all 8 antes.</li>
            <li>Fail a single blind and the run is over.</li>
          </ul>
        </details>
      </div>
    </div>
  )
}
