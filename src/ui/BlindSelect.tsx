import { bossRegistry } from '../engine/bosses'
import { blindTarget, BLIND_REWARD, FINAL_ANTE, skipTagFor } from '../engine/run'
import { useGame } from '../state/store'
import { GodTray, JokerTray, LevelsBadge, MoneyBadge, VoucherStrip } from './Trays'

const BLIND_LABEL = ['Small Blind', 'Big Blind', 'Boss Blind']

export function BlindSelect() {
  const run = useGame((s) => s.run)
  const playBlind = useGame((s) => s.playBlind)
  const skipCurrentBlind = useGame((s) => s.skipCurrentBlind)
  const backToMenu = useGame((s) => s.backToMenu)
  const skipReward = useGame((s) => s.skipReward)
  if (!run) return null

  const boss = bossRegistry[run.bosses[run.ante - 1]]

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <JokerTray />
        <div className="flex items-center gap-3 flex-wrap">
          <GodTray />
          <LevelsBadge />
          <MoneyBadge />
        </div>
      </div>
      <VoucherStrip />

      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {run.ante > FINAL_ANTE ? (
            <>
              Endless · Ante {run.ante}
              <span className="ml-2 text-base align-middle" style={{ color: 'var(--gold)' }}>
                ∞
              </span>
            </>
          ) : (
            <>Ante {run.ante} of {FINAL_ANTE}</>
          )}
        </h1>
        <p className="text-slate-400 mt-1">Beat all three blinds to advance</p>
        {skipReward && <p className="mt-2 text-emerald-300 text-sm">Skipped! {skipReward}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {([0, 1, 2] as const).map((idx) => {
          const blind = (['small', 'big', 'boss'] as const)[idx]
          const target = blindTarget(run, run.ante, blind)
          const isCurrent = run.blindIndex === idx
          const isPast = run.blindIndex > idx
          return (
            <div
              key={blind}
              className={`panel p-4 flex flex-col gap-2 ${isCurrent ? 'ring-2 ring-[var(--gold)]' : ''} ${isPast ? 'opacity-50' : ''}`}
            >
              <div className="text-sm uppercase tracking-wide text-slate-400">{BLIND_LABEL[idx]}</div>
              {blind === 'boss' && (
                <div>
                  <div className="text-lg font-bold text-rose-300">{boss.name}</div>
                  <div className="text-xs text-slate-300">{boss.description}</div>
                </div>
              )}
              <div className="text-2xl font-extrabold big-number">{target.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Reward ${BLIND_REWARD[blind]} + bonuses</div>
              <div className="mt-auto flex gap-2 pt-2">
                {isCurrent && (
                  <button
                    className="flex-1 rounded-lg bg-[var(--gold)] text-slate-900 font-bold py-2 hover:brightness-110"
                    onClick={playBlind}
                    data-testid={`play-${blind}`}
                  >
                    Play
                  </button>
                )}
                {isCurrent && blind !== 'boss' && (
                  <button
                    className="rounded-lg bg-slate-700/70 px-3 py-2 text-sm font-semibold hover:bg-slate-600/70 has-tip"
                    onClick={skipCurrentBlind}
                  >
                    Skip · {skipTagFor(run, idx).name}
                    <span className="tip">
                      <span className="font-bold">{skipTagFor(run, idx).name}</span>
                      <br />
                      {skipTagFor(run, idx).description} (no reward money)
                    </span>
                  </button>
                )}
                {isPast && <div className="flex-1 text-center text-emerald-300 font-bold py-2">✓ Beaten</div>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center">
        <button className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-4" onClick={backToMenu}>
          Save & exit to menu
        </button>
      </div>
    </div>
  )
}
