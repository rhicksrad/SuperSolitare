import { useGame } from '../state/store'

export function GameOverScreen() {
  const run = useGame((s) => s.run)
  const result = useGame((s) => s.roundResult)
  const abandonRun = useGame((s) => s.abandonRun)
  const newGame = useGame((s) => s.newGame)
  if (!run) return null
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center flex flex-col gap-5">
        <h1 className="text-5xl font-black text-rose-400">Run Over</h1>
        {result && (
          <p className="text-slate-300">
            The blind demanded <span className="font-bold big-number">{result.target.toLocaleString()}</span> — you
            scored <span className="font-bold big-number">{result.score.toLocaleString()}</span>.
          </p>
        )}
        <div className="panel p-4 grid grid-cols-2 gap-2 text-sm">
          <div className="text-slate-400 text-left">Ante reached</div>
          <div className="text-right font-semibold big-number">{run.ante}</div>
          <div className="text-slate-400 text-left">Blinds beaten</div>
          <div className="text-right font-semibold big-number">{run.roundsWon}</div>
          <div className="text-slate-400 text-left">Best single play</div>
          <div className="text-right font-semibold big-number">{run.bestPlay.toLocaleString()}</div>
          <div className="text-slate-400 text-left">Seed</div>
          <div className="text-right font-mono text-xs self-center break-all">{run.seed}</div>
        </div>
        <div className="flex gap-3 justify-center">
          <button className="rounded-xl bg-[var(--gold)] text-slate-900 font-bold px-6 py-3 hover:brightness-110" onClick={() => newGame()}>
            New Run
          </button>
          <button className="rounded-xl bg-slate-700/70 font-bold px-6 py-3 hover:bg-slate-600/70" onClick={abandonRun}>
            Menu
          </button>
        </div>
      </div>
    </div>
  )
}

export function VictoryScreen() {
  const run = useGame((s) => s.run)
  const abandonRun = useGame((s) => s.abandonRun)
  const newGame = useGame((s) => s.newGame)
  if (!run) return null
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center flex flex-col gap-5">
        <h1 className="text-5xl font-black" style={{ color: 'var(--gold)' }}>
          Victory!
        </h1>
        <p className="text-slate-300">All 8 antes conquered. The deck bows to you.</p>
        <div className="panel p-4 grid grid-cols-2 gap-2 text-sm">
          <div className="text-slate-400 text-left">Blinds beaten</div>
          <div className="text-right font-semibold big-number">{run.roundsWon}</div>
          <div className="text-slate-400 text-left">Best single play</div>
          <div className="text-right font-semibold big-number">{run.bestPlay.toLocaleString()}</div>
          <div className="text-slate-400 text-left">Money at the end</div>
          <div className="text-right font-semibold big-number">${run.money}</div>
          <div className="text-slate-400 text-left">Seed</div>
          <div className="text-right font-mono text-xs self-center break-all">{run.seed}</div>
        </div>
        <div className="flex gap-3 justify-center">
          <button className="rounded-xl bg-[var(--gold)] text-slate-900 font-bold px-6 py-3 hover:brightness-110" onClick={() => newGame()}>
            Run It Back
          </button>
          <button className="rounded-xl bg-slate-700/70 font-bold px-6 py-3 hover:bg-slate-600/70" onClick={abandonRun}>
            Menu
          </button>
        </div>
      </div>
    </div>
  )
}
