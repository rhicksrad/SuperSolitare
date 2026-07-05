import { useEffect } from 'react'
import { bossRegistry } from '../engine/bosses'
import { foundationLevelBase } from '../engine/scoring'
import { useGame } from '../state/store'
import { Board } from './Board'
import { GodTray, JokerTray, MoneyBadge } from './Trays'

function Sidebar() {
  const round = useGame((s) => s.round)!
  const run = useGame((s) => s.run)!
  const lastPlay = useGame((s) => s.lastPlay)
  const cashOut = useGame((s) => s.cashOut)
  const discardWaste = useGame((s) => s.discardWaste)
  const stuck = useGame((s) => s.stuck)

  const won = round.score >= round.target
  const boss = round.bossId ? bossRegistry[round.bossId] : null
  const base = foundationLevelBase(run.levels.foundation)
  const blindName = round.blind === 'small' ? 'Small Blind' : round.blind === 'big' ? 'Big Blind' : boss?.name ?? 'Boss Blind'

  return (
    <div className="flex flex-col gap-3 w-56 shrink-0">
      <div className="panel p-3">
        <div className="text-xs uppercase tracking-wide text-slate-400">Ante {run.ante} · {blindName}</div>
        {boss && <div className="mt-1 text-xs text-rose-300">{boss.description}</div>}
        <div className="mt-2 text-xs text-slate-400">Target</div>
        <div className="text-2xl font-bold big-number text-slate-100">{round.target.toLocaleString()}</div>
        <div className="mt-2 text-xs text-slate-400">Round score</div>
        <div
          key={round.score}
          className={`text-4xl font-extrabold big-number score-flash ${won ? 'text-[var(--gold)]' : 'text-slate-50'}`}
          data-testid="round-score"
        >
          {round.score.toLocaleString()}
        </div>
        <div className="mt-2 h-2 rounded bg-slate-700/60 overflow-hidden">
          <div
            className="h-full rounded transition-all duration-300"
            style={{
              width: `${Math.min(100, (round.score / round.target) * 100)}%`,
              background: won ? 'var(--gold)' : 'linear-gradient(90deg, var(--chips), var(--mult))',
            }}
          />
        </div>
      </div>

      <div className="panel p-3">
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Last play</div>
        {lastPlay ? (
          <div key={lastPlay.uid} className="score-flash">
            <span className="font-bold big-number" style={{ color: 'var(--chips)' }}>
              {lastPlay.chips}
            </span>
            <span className="text-slate-400 mx-1">×</span>
            <span className="font-bold big-number" style={{ color: 'var(--mult)' }}>
              {lastPlay.mult}
            </span>
            <span className="text-slate-400 mx-1">=</span>
            <span className="font-bold big-number text-slate-50">{lastPlay.total.toLocaleString()}</span>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Play cards to foundations to score</div>
        )}
        <div className="mt-2 text-xs text-slate-400">
          Streak <span className="text-slate-200 font-semibold">{round.streak}</span>
          <span className="mx-1">·</span>base {base.chips} × {base.mult}
        </div>
      </div>

      <div className="panel p-3 flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Recycles</span>
          <span className="font-semibold big-number">{round.recyclesLeft}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Discards</span>
          <span className="font-semibold big-number">{round.discardsLeft}</span>
        </div>
        <button
          className="mt-1 rounded-lg px-3 py-1.5 text-sm font-semibold bg-slate-700/70 hover:bg-slate-600/70 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={discardWaste}
          disabled={round.discardsLeft <= 0 || round.waste.length === 0}
        >
          Discard waste top ({round.discardsLeft})
        </button>
      </div>

      <button
        className={`rounded-xl px-4 py-3 font-bold text-base transition-colors ${
          won
            ? 'bg-[var(--gold)] text-slate-900 cashout-glow hover:brightness-110'
            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
        }`}
        onClick={cashOut}
        data-testid="cash-out"
      >
        {won ? 'Cash Out ✓' : 'Concede round'}
      </button>
      {won && <div className="text-xs text-center text-slate-400">Keep playing for a board-clear bonus, or bank the win.</div>}
      {stuck && !won && (
        <div className="text-xs text-center text-rose-300">No useful moves left — concede or use a god card.</div>
      )}
    </div>
  )
}

function PopLayer() {
  const pops = useGame((s) => s.pops)
  return (
    <div className="pointer-events-none absolute inset-x-0 top-24 flex flex-col items-center gap-1 z-50">
      {pops.map((p) => (
        <div key={p.uid} className="pop-float font-extrabold text-lg">
          {p.kind === 'foundation' ? (
            <span>
              <span style={{ color: 'var(--chips)' }}>{p.chips}</span>
              <span className="text-slate-300"> × </span>
              <span style={{ color: 'var(--mult)' }}>{p.mult}</span>
              <span className="text-slate-100"> = {p.total.toLocaleString()}</span>
            </span>
          ) : (
            <span className={p.total < 0 ? 'text-rose-400' : p.kind === 'clear' ? 'text-[var(--gold)]' : 'text-emerald-300'}>
              {p.label} {p.total >= 0 ? '+' : ''}
              {p.total.toLocaleString()}
              {p.money ? ` · +$${p.money}` : ''}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function MessageToast() {
  const message = useGame((s) => s.message)
  if (!message) return null
  return (
    <div key={message.uid} className="fixed bottom-6 left-1/2 -translate-x-1/2 panel px-4 py-2 text-sm z-50 pop-float">
      {message.text}
    </div>
  )
}

export function GameScreen() {
  const select = useGame((s) => s.select)
  const clickStock = useGame((s) => s.clickStock)
  const discardWaste = useGame((s) => s.discardWaste)
  const round = useGame((s) => s.round)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'Escape') select(null)
      if (e.key === 'd' || e.key === 'D' || e.key === ' ') {
        e.preventDefault()
        clickStock()
      }
      if (e.key === 'x' || e.key === 'X') discardWaste()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [select, clickStock, discardWaste])

  if (!round) return null

  return (
    <div className="relative min-h-screen max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <JokerTray />
        <div className="flex items-center gap-3">
          <GodTray />
          <MoneyBadge />
        </div>
      </div>
      <div className="flex gap-6 items-start">
        <Sidebar />
        <div className="flex-1 relative">
          <PopLayer />
          <Board />
        </div>
      </div>
      <MessageToast />
      <div className="text-center text-xs text-slate-500 pb-2">
        Click or drag to move · double-click sends to foundation · D/space deals · X discards
      </div>
    </div>
  )
}
