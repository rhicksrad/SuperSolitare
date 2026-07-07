import type { RunState } from '../engine/types'
import { useGame } from '../state/store'

const BLIND_COLOR = { small: '#4f9cf9', big: '#ffbe3d', boss: '#ff5252' } as const

/** Pixel bar chart of every round played: score vs the blind's target. */
function RunRecap({ run }: { run: RunState }) {
  const history = run.history ?? []
  if (history.length === 0) return null
  const BAR = 10
  const GAP = 4
  const H = 72 // chart height; a bar exactly at target reaches H / CAP
  const CAP = 2.5 // scores past 2.5× target render as full bars
  const width = history.length * (BAR + GAP) + GAP
  const targetY = H - H / CAP
  return (
    <div className="panel p-4 text-left">
      <div className="text-sm font-bold text-slate-200 mb-2">Run recap</div>
      <div className="overflow-x-auto">
        <svg width={width} height={H + 14} shapeRendering="crispEdges" className="block mx-auto" aria-hidden>
          <line x1={0} x2={width} y1={targetY} y2={targetY} stroke="#9aa7c4" strokeWidth={1} strokeDasharray="3 3" opacity={0.55} />
          {history.map((h, i) => {
            const ratio = Math.min(h.score / Math.max(1, h.target), CAP)
            const barH = Math.max(2, Math.round((ratio / CAP) * H))
            const x = GAP + i * (BAR + GAP)
            const won = h.score >= h.target
            return (
              <g key={i}>
                <rect x={x} y={H - barH} width={BAR} height={barH} fill={BLIND_COLOR[h.blind]} opacity={won ? 1 : 0.4}>
                  <title>{`Ante ${h.ante} ${h.blind}: ${h.score.toLocaleString()} / ${h.target.toLocaleString()}`}</title>
                </rect>
                {!won && <rect x={x} y={H - barH} width={BAR} height={barH} fill="none" stroke="#ff6a77" strokeWidth={1} />}
                {h.blind === 'small' && (
                  <text x={x + BAR / 2} y={H + 11} fontSize={9} fill="#5a6484" textAnchor="middle">
                    {h.ante}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="text-[10px] text-slate-500 mt-1">
        score vs target (dashed) by round · <span style={{ color: BLIND_COLOR.small }}>small</span> ·{' '}
        <span style={{ color: BLIND_COLOR.big }}>big</span> · <span style={{ color: BLIND_COLOR.boss }}>boss</span>
      </div>
    </div>
  )
}

export function GameOverScreen() {
  const run = useGame((s) => s.run)
  const result = useGame((s) => s.roundResult)
  const abandonRun = useGame((s) => s.abandonRun)
  const quickStart = useGame((s) => s.quickStart)
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
        <RunRecap run={run} />
        <div className="flex gap-3 justify-center">
          <button className="btn btn-gold px-6 py-3" onClick={() => quickStart()}>
            New Run
          </button>
          <button className="btn btn-dark px-6 py-3" onClick={abandonRun}>
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
  const quickStart = useGame((s) => s.quickStart)
  const enterEndless = useGame((s) => s.enterEndless)
  const victoryUnlocks = useGame((s) => s.victoryUnlocks)
  if (!run) return null
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center flex flex-col gap-5">
        <h1 className="text-5xl font-black" style={{ color: 'var(--gold)' }}>
          Victory!
        </h1>
        <p className="text-slate-300">All 8 antes conquered. The deck bows to you.</p>
        {victoryUnlocks.map((line, i) => (
          <div
            key={line}
            className="panel unlock-pop px-4 py-2 font-bold text-emerald-300 border-emerald-400/40"
            style={{ animationDelay: `${0.4 + i * 0.35}s` }}
          >
            ★ {line}
          </div>
        ))}
        {victoryUnlocks.length > 0 && (
          <p
            className="text-xs text-slate-400 -mt-3 unlock-pop"
            style={{ animationDelay: `${0.4 + victoryUnlocks.length * 0.35}s` }}
          >
            Enable it from the main menu before your next run.
          </p>
        )}
        <button className="btn btn-gold px-6 py-3 cashout-glow" onClick={enterEndless}>
          Continue in Endless Mode ∞
        </button>
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
        <RunRecap run={run} />
        <div className="flex gap-3 justify-center">
          <button className="btn btn-gold px-6 py-3" onClick={() => quickStart()}>
            Run It Back
          </button>
          <button className="btn btn-dark px-6 py-3" onClick={abandonRun}>
            Menu
          </button>
        </div>
      </div>
    </div>
  )
}
