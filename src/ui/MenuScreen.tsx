import { useState } from 'react'
import { allDeckIds, deckRegistry, STAKES } from '../engine/decks'
import { todaysDailySeed } from '../engine/save'
import { useGame } from '../state/store'

const DRIFT_CARDS = [
  { glyph: '♠', left: '6%', size: 90, dur: 34, delay: 0 },
  { glyph: '♥', left: '16%', size: 60, dur: 41, delay: -12, red: true },
  { glyph: '♦', left: '82%', size: 76, dur: 37, delay: -20, red: true },
  { glyph: '♣', left: '91%', size: 56, dur: 45, delay: -5 },
  { glyph: '♠', left: '74%', size: 48, dur: 50, delay: -30 },
  { glyph: '♥', left: '28%', size: 44, dur: 47, delay: -38, red: true },
]

export function MenuScreen() {
  const newGame = useGame((s) => s.newGame)
  const continueGame = useGame((s) => s.continueGame)
  const hasSave = useGame((s) => s.hasSave)
  const stats = useGame((s) => s.stats)
  const goTo = useGame((s) => s.goTo)
  const [seed, setSeed] = useState('')
  const [deckId, setDeckId] = useState('classic')
  const [stake, setStake] = useState(0)

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-8">
      {DRIFT_CARDS.map((c, i) => (
        <div
          key={i}
          className="drift card card-face flex items-center justify-center"
          style={{
            left: c.left,
            width: c.size,
            height: c.size * 1.4,
            fontSize: c.size * 0.5,
            color: c.red ? '#c2273a' : '#1d222b',
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
          }}
        >
          {c.glyph}
        </div>
      ))}

      <div className="max-w-2xl w-full flex flex-col gap-5 text-center relative z-10">
        <div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight drop-shadow-lg">
            Super<span style={{ color: 'var(--gold)' }}>Solitaire</span>
          </h1>
          <p className="mt-2 text-slate-400">
            Chain foundation plays for chips × mult. Beat escalating blinds. Build an engine. Survive 8 antes.
          </p>
        </div>

        <div className="panel p-4 text-left">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Deck</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {allDeckIds.map((id) => {
              const def = deckRegistry[id]
              return (
                <button
                  key={id}
                  onClick={() => setDeckId(id)}
                  className={`rounded-lg p-2 text-left border text-xs transition-colors ${
                    deckId === id
                      ? 'border-[var(--gold)] bg-[var(--gold)]/10'
                      : 'border-slate-600/50 bg-slate-800/50 hover:bg-slate-700/50'
                  }`}
                  data-testid={`deck-${id}`}
                >
                  <div className="font-bold">{def.name.replace(' Deck', '')}</div>
                  <div className="text-slate-400 mt-0.5 leading-snug">{def.description}</div>
                </button>
              )
            })}
          </div>
          <div className="text-xs uppercase tracking-wide text-slate-400 mt-3 mb-2">Stake</div>
          <div className="flex gap-2">
            {STAKES.map((s) => (
              <button
                key={s.level}
                onClick={() => setStake(s.level)}
                className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors has-tip ${
                  stake === s.level
                    ? s.level === 2
                      ? 'border-[var(--gold)] text-[var(--gold)] bg-[var(--gold)]/10'
                      : s.level === 1
                        ? 'border-rose-400 text-rose-300 bg-rose-400/10'
                        : 'border-slate-300 text-slate-200 bg-slate-100/10'
                    : 'border-slate-600/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.name}
                <span className="tip">{s.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
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
            onClick={() => newGame(seed || undefined, 'standard', deckId, stake)}
            data-testid="new-run"
          >
            New Run
          </button>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl bg-slate-700/70 font-bold py-2.5 hover:bg-slate-600/70 has-tip"
              onClick={() => newGame(undefined, 'daily', deckId, stake)}
            >
              Daily Run
              <span className="tip">Everyone gets the same seed today: {todaysDailySeed()}</span>
            </button>
            <button className="flex-1 rounded-xl bg-slate-700/70 font-bold py-2.5 hover:bg-slate-600/70" onClick={() => goTo('collection')}>
              Collection
            </button>
            <button className="flex-1 rounded-xl bg-slate-700/70 font-bold py-2.5 hover:bg-slate-600/70" onClick={() => goTo('settings')}>
              Settings
            </button>
          </div>
          <input
            className="rounded-lg bg-slate-800/80 border border-slate-600/50 px-3 py-2 text-sm text-center placeholder:text-slate-500"
            placeholder="Custom seed (optional)"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            aria-label="Custom seed"
          />
        </div>

        <div className="panel p-3 grid grid-cols-4 gap-2 text-sm">
          <div>
            <div className="text-slate-400 text-xs">Runs</div>
            <div className="font-semibold big-number">{stats.runsStarted}</div>
          </div>
          <div>
            <div className="text-slate-400 text-xs">Wins</div>
            <div className="font-semibold big-number">{stats.runsWon}</div>
          </div>
          <div>
            <div className="text-slate-400 text-xs">Best ante</div>
            <div className="font-semibold big-number">{stats.bestAnte || '—'}</div>
          </div>
          <div>
            <div className="text-slate-400 text-xs">Best play</div>
            <div className="font-semibold big-number">{stats.bestPlay ? stats.bestPlay.toLocaleString() : '—'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
