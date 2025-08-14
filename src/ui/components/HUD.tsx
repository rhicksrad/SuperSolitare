import { useStore } from '../../state/store'
import { getDiminishingStatus } from '../../game/scoring'

export default function HUD({ variant = 'full' }: { variant?: 'full' | 'compact' } = {}) {
  const run = useStore((s) => s.run)
  const rnd = useStore((s) => s.currentRound)
  const msg = useStore((s) => s.lastMessage)
  const clearMsg = useStore((s) => s.clearMessage)
  if (!run) return null
  const streakFx = (rnd as any)?.streakFx as { ts: number } | undefined
  const showSeed = variant === 'full'
  const showScoreTarget = variant === 'full'
  return (
    <div className={`flex items-center gap-4 text-sm text-slate-300 mx-auto px-3 py-1 rounded-lg ${variant === 'compact' ? 'bg-slate-900/40' : 'bg-slate-900/60'} border border-slate-700 whitespace-nowrap overflow-hidden`}
      style={{ maxWidth: variant === 'compact' ? '800px' : undefined }}
    >
      {/* Live region for screen readers to announce messages */}
      <div className="sr-only" role="status" aria-live="polite">{msg?.text || ''}</div>
      {showSeed && <div>Seed: <span className="text-slate-200">{run.seed}</span></div>}
      <div>Round: <span className="font-semibold">{run.ante}</span></div>
      <div>Coins: <span className="font-semibold">{run.coins}</span></div>
      {rnd && (
        <>
          {showScoreTarget && (
            <>
              <div>Target: <span className="font-semibold">{rnd.config.targetScore}</span></div>
              <div>Score: <span className="font-semibold">{rnd.score}</span></div>
            </>
          )}
          <div className={streakFx ? 'animate-pulse' : ''}>Streak: <span className="font-semibold">{rnd.streak}</span> x{rnd.streakMultiplier.toFixed(2)}</div>
          <div>Redeals: <span className="font-semibold">{rnd.redealsLeft}</span></div>
          {(() => {
            const dim = getDiminishingStatus(rnd)
            const label = dim.active ? `${Math.round(dim.factor * 100)}%` : '—'
            return (
              <div title={`Diminishing returns ${dim.active ? 'active' : 'inactive'} • factor ${dim.factor.toFixed(2)} • ${dim.prevFoundationMoves}/${dim.threshold}`}>
                Diminishing: <span className={`font-semibold ${dim.active ? 'text-amber-300' : 'text-slate-400'}`}>{label}</span>
              </div>
            )
          })()}
        </>
      )}
      {msg && variant === 'full' && (
        <div className="ml-auto flex items-center gap-2">
          <span className={`${msg.type === 'error' ? 'text-rose-300' : 'text-slate-300'}`}>{msg.text}</span>
          <button onClick={clearMsg} className={`rounded px-2 py-1 ${msg.type === 'error' ? 'bg-rose-900/60 text-rose-200' : 'bg-slate-700/60 text-slate-200'}`}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}


