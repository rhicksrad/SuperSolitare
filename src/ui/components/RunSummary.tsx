import { useStore } from '../../state/store'

export default function RunSummary() {
  const run = useStore((s) => s.run)
  const outcome = useStore((s) => s.lastOutcome)
  const isGameOver = useStore((s) => s.isGameOver)
  const startNextBoard = useStore((s) => s.startNextBoard)
  const openShop = useStore((s) => s.openShop)
  const initShop = useStore((s) => (s as any).initShop)
  // const rerollShop = useStore((s) => s.rerollShop)
  const dismiss = useStore((s) => s.dismissSummary)
  if (!run || !outcome) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4" aria-modal="true" role="dialog" data-testid="summary-modal">
      <div className="w-full max-w-md rounded-lg bg-slate-900 border border-slate-700 p-4">
        <h2 className="text-xl font-semibold mb-2">Run Summary</h2>
        <div className="text-sm text-slate-300">Round: {run.ante}</div>
        <div className="text-sm text-slate-300">Score: {outcome.score} / Target: {outcome.target}</div>
        {typeof outcome.runBonus === 'number' && (
          <div className="text-sm text-slate-300">Run bonus: {outcome.runBonus}</div>
        )}
        <div className="text-sm text-slate-300">
          Coins earned: {outcome.coinsEarned}
          {outcome.coinsBreakdown && (
            <span className="text-slate-400"> (base {outcome.coinsBreakdown.base} + bonus {outcome.coinsBreakdown.bonus})</span>
          )}
        </div>
        {outcome.perfectClear && (
          <div className="text-xs text-emerald-300">Perfect clear bonus applied</div>
        )}
        {isGameOver ? (
          <div className="mt-3 text-rose-400">Run Over</div>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-emerald-400">Round Complete</div>
            <div className="flex gap-2">
              <button className="rounded bg-slate-700 px-3 py-2 text-sm" onClick={() => { initShop(); openShop() }}>Shop</button>
              <button className="rounded bg-indigo-700 px-3 py-2 text-sm" onClick={startNextBoard}>Start Next Board</button>
              <button className="rounded bg-slate-700 px-3 py-2 text-sm" onClick={dismiss}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


