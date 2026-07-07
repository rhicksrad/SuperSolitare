import { jokerRegistry, sellValue } from '../engine/jokers'
import { godRegistry } from '../engine/gods'
import { voucherRegistry } from '../engine/vouchers'
import { useGame } from '../state/store'
import { voucherArt } from './art'
import { GodCard, JokerCard } from './ArtCards'
import { PixelSprite } from './sprites'

export function JokerTray() {
  const run = useGame((s) => s.run)
  const round = useGame((s) => s.round)
  const sellOwnedJoker = useGame((s) => s.sellOwnedJoker)
  const moveJoker = useGame((s) => s.moveJoker)
  if (!run) return null
  const silencedIdx = round?.bossId === 'the-silence' ? 0 : -1

  return (
    <div className="flex gap-2 items-start" data-testid="joker-tray">
      {run.jokers.map((j, i) => {
        const def = jokerRegistry[j.id]
        if (!def) return null
        return (
          <div key={j.id} className="pcard-bob" style={{ animationDelay: `${i * -0.7}s` }}>
            <JokerCard
              joker={j}
              silenced={i === silencedIdx}
              tip={<div className="mt-1 text-slate-400">Sell for ${sellValue(j.id)}</div>}
              footer={
                <div className="flex gap-1 justify-between items-center px-1 pb-0.5 mt-auto">
                  <button
                    className="text-[11px] text-slate-500 hover:text-slate-900 px-1"
                    onClick={() => moveJoker(j.id, -1)}
                    aria-label={`Move ${def.name} left`}
                  >
                    ◂
                  </button>
                  <button className="text-[11px] font-bold text-rose-700 hover:text-rose-500" onClick={() => sellOwnedJoker(j.id)}>
                    sell ${sellValue(j.id)}
                  </button>
                  <button
                    className="text-[11px] text-slate-500 hover:text-slate-900 px-1"
                    onClick={() => moveJoker(j.id, 1)}
                    aria-label={`Move ${def.name} right`}
                  >
                    ▸
                  </button>
                </div>
              }
            />
          </div>
        )
      })}
      {Array.from({ length: run.jokerSlots - run.jokers.length }, (_, i) => (
        <div
          key={`empty-${i}`}
          className="w-[100px] h-[138px] rounded-lg border-2 border-dashed border-slate-600/50 bg-black/20 flex items-center justify-center text-slate-600 text-[11px]"
        >
          joker slot
        </div>
      ))}
    </div>
  )
}

export function GodTray() {
  const run = useGame((s) => s.run)
  const activateGod = useGame((s) => s.activateGod)
  if (!run) return null
  return (
    <div className="flex gap-2" data-testid="god-tray">
      {run.consumables.map((id, i) => {
        const def = godRegistry[id]
        if (!def) return null
        return (
          <GodCard
            key={`${id}-${i}`}
            id={id}
            onClick={() => activateGod(id)}
            tip={<div className="mt-1 text-emerald-300">Click to use</div>}
          />
        )
      })}
      {Array.from({ length: run.consumableSlots - run.consumables.length }, (_, i) => (
        <div
          key={`slot-${i}`}
          className="w-[96px] h-[140px] rounded-lg border-2 border-dashed border-amber-700/40 bg-black/20 flex items-center justify-center text-amber-800/80 text-[11px]"
        >
          god slot
        </div>
      ))}
    </div>
  )
}

export function VoucherStrip() {
  const run = useGame((s) => s.run)
  if (!run || run.vouchers.length === 0) return null
  return (
    <div className="flex gap-2 flex-wrap" data-testid="voucher-strip">
      {run.vouchers.map((id) => {
        const def = voucherRegistry[id]
        if (!def) return null
        return (
          <div key={id} className="has-tip voucher-chip" tabIndex={0}>
            <PixelSprite sprite={voucherArt(id)} size={20} />
            {def.name}
            <span className="tip">{def.description}</span>
          </div>
        )
      })}
    </div>
  )
}

export function MoneyBadge() {
  const run = useGame((s) => s.run)
  if (!run) return null
  return (
    <div className="panel px-3 py-2 text-center">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">Money</div>
      <div className="text-xl font-bold big-number" style={{ color: 'var(--gold)' }} data-testid="money">
        ${run.money}
      </div>
    </div>
  )
}

export function LevelsBadge() {
  const run = useGame((s) => s.run)
  if (!run) return null
  return (
    <div className="panel px-3 py-2 has-tip" tabIndex={0}>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">Levels</div>
      <div className="text-sm font-bold big-number">
        F{run.levels.foundation} · R{run.levels.reveal} · C{run.levels.empty_column}
      </div>
      <div className="tip">
        <div>Foundation plays: level {run.levels.foundation}</div>
        <div>Reveals: level {run.levels.reveal}</div>
        <div>Empty columns: level {run.levels.empty_column}</div>
        <div className="mt-1 text-slate-400">Level up with Ares, Hermes, and Hestia god cards.</div>
      </div>
    </div>
  )
}
