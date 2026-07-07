import { deckRegistry, deckSticker, unlockedDeckIds, unlockedStakesFor } from '../engine/decks'
import { useGame } from '../state/store'
import { DeckBack } from './ArtCards'

const DRIFT_CARDS = [
  { glyph: '♠', left: '6%', size: 90, dur: 34, delay: 0 },
  { glyph: '♥', left: '16%', size: 60, dur: 41, delay: -12, red: true },
  { glyph: '♦', left: '82%', size: 76, dur: 37, delay: -20, red: true },
  { glyph: '♣', left: '91%', size: 56, dur: 45, delay: -5 },
  { glyph: '♠', left: '74%', size: 48, dur: 50, delay: -30 },
  { glyph: '♥', left: '28%', size: 44, dur: 47, delay: -38, red: true },
]

export function MenuScreen() {
  const continueGame = useGame((s) => s.continueGame)
  const hasSave = useGame((s) => s.hasSave)
  const goTo = useGame((s) => s.goTo)
  const stats = useGame((s) => s.stats)
  const loadout = useGame((s) => s.loadout)
  const setLoadout = useGame((s) => s.setLoadout)
  const quickStart = useGame((s) => s.quickStart)

  const decks = unlockedDeckIds(stats.stakeWins)
  const stakes = unlockedStakesFor(loadout.deckId, stats.stakeWins)
  const showLoadout = decks.length > 1 || stakes.length > 1

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

      <div className="max-w-md w-full flex flex-col gap-6 text-center relative z-10">
        <div>
          <h1 className="game-logo inline-block text-5xl sm:text-7xl font-bold tracking-tight text-slate-50">
            Super<span style={{ color: 'var(--gold)' }}>Solitaire</span>
          </h1>
          <p className="mt-3 text-slate-400">
            Chain foundation plays for <span style={{ color: 'var(--chips)' }}>chips</span>
            {' × '}
            <span style={{ color: 'var(--mult)' }}>mult</span>. Beat escalating blinds. Survive 8 antes.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {hasSave && (
            <button className="btn btn-green py-3 text-lg" onClick={continueGame}>
              Continue Run
            </button>
          )}
          <button className="btn btn-gold py-3 text-lg" onClick={() => quickStart()} data-testid="new-run">
            New Run
          </button>
        </div>

        {showLoadout && (
          <div className="panel p-3 text-left flex flex-col gap-2">
            {decks.length > 1 && (
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-[11px] uppercase tracking-wide text-slate-400 w-10 shrink-0 mt-4">Deck</span>
                {decks.map((id) => {
                  const sticker = deckSticker(id, stats.stakeWins)
                  return (
                    <button
                      key={id}
                      onClick={() => setLoadout({ deckId: id })}
                      className={`has-tip rounded-md p-1.5 flex flex-col items-center gap-1 text-[11px] font-bold border-2 transition-colors ${
                        loadout.deckId === id
                          ? 'border-[var(--gold)] text-[var(--gold)] bg-[var(--gold)]/10'
                          : 'border-slate-600/50 text-slate-400 hover:text-slate-200'
                      }`}
                      data-testid={`deck-${id}`}
                    >
                      <span className="relative">
                        <DeckBack id={id} width={40} />
                        {sticker && (
                          <span
                            className={`stake-sticker stake-sticker-${sticker.level} absolute -top-1 -right-1`}
                            aria-label={`Beaten at ${sticker.name}`}
                          />
                        )}
                      </span>
                      {deckRegistry[id].name.replace(' Deck', '')}
                      <span className="tip">
                        {deckRegistry[id].description}
                        {sticker && <span className="block mt-1 text-slate-400">Best win: {sticker.name}</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            {stakes.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] uppercase tracking-wide text-slate-400 w-10 shrink-0">Stake</span>
                {stakes.map((s) => (
                  <button
                    key={s.level}
                    onClick={() => setLoadout({ stake: s.level })}
                    className={`has-tip rounded-full px-2.5 py-1 text-xs font-bold border-2 transition-colors ${
                      loadout.stake === s.level
                        ? s.level === 2
                          ? 'border-[var(--gold)] text-[var(--gold)] bg-[var(--gold)]/10'
                          : s.level === 1
                            ? 'border-rose-400 text-rose-300 bg-rose-400/10'
                            : 'border-slate-300 text-slate-200 bg-slate-100/10'
                        : 'border-slate-600/50 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s.name.replace(' Stake', '')}
                    <span className="tip">{s.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          className="text-sm text-slate-500 hover:text-slate-300 underline underline-offset-4 mx-auto"
          onClick={() => goTo('settings')}
        >
          Settings, daily run & collection
        </button>
      </div>
    </div>
  )
}
