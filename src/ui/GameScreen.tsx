import { useEffect, useRef, useState } from 'react'
import { bossRegistry } from '../engine/bosses'
import { foundationLevelBase } from '../engine/scoring'
import { useGame } from '../state/store'
import { BossEmblem } from './ArtCards'
import { Board } from './Board'
import { GodTray, JokerTray, MoneyBadge } from './Trays'

/** Roll a displayed number toward its target over ~350ms */
function useCountUp(value: number): number {
  const [shown, setShown] = useState(value)
  const target = useRef(value)
  const raf = useRef<number>(0)
  useEffect(() => {
    target.current = value
    const start = performance.now()
    const from = shown
    if (from === value) return
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 350)
      const eased = 1 - Math.pow(1 - k, 3)
      setShown(Math.round(from + (target.current - from) * eased))
      if (k < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return shown
}

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
  const shownScore = useCountUp(round.score)

  return (
    <div className="flex flex-col gap-3 w-56 shrink-0">
      <div className="panel p-3">
        <div className="flex items-center gap-2">
          {boss && <BossEmblem id={boss.id} size={40} />}
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Ante {run.ante} · {blindName}
          </div>
        </div>
        {boss && <div className="mt-1 text-xs text-rose-300">{boss.description}</div>}
        <div className="mt-2 text-xs text-slate-400">Target</div>
        <div className="text-2xl font-bold big-number text-slate-100">{round.target.toLocaleString()}</div>
        <div className="mt-2 text-xs text-slate-400">Round score</div>
        <div
          className={`text-4xl font-extrabold big-number ${won ? 'text-[var(--gold)]' : 'text-slate-50'}`}
          data-testid="round-score"
          data-score={round.score}
        >
          {shownScore.toLocaleString()}
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
          className="btn btn-dark mt-1 px-3 py-1.5 text-sm"
          onClick={discardWaste}
          disabled={round.discardsLeft <= 0 || round.waste.length === 0}
        >
          Discard waste top ({round.discardsLeft})
        </button>
      </div>

      <button
        className={`btn px-4 py-3 text-base ${won ? 'btn-gold cashout-glow' : 'btn-dark'}`}
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
        <div key={p.uid} className="pop-float font-bold text-2xl">
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
  const pops = useGame((s) => s.pops)
  const reduceMotion = useGame((s) => s.settings.reduceMotion)
  const bigPop = reduceMotion
    ? undefined
    : pops.find((p) => p.kind === 'clear' || (p.kind === 'foundation' && ((p.mult ?? 0) >= 12 || p.total >= 400)))

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
        <div key={bigPop?.uid} className={`flex-1 relative ${bigPop ? 'shake' : ''}`}>
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
