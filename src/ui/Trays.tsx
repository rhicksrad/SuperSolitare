import { describeJoker, jokerRegistry, sellValue } from '../engine/jokers'
import { godRegistry } from '../engine/gods'
import { useGame } from '../state/store'

export function JokerTray() {
  const run = useGame((s) => s.run)
  const round = useGame((s) => s.round)
  const sellOwnedJoker = useGame((s) => s.sellOwnedJoker)
  const moveJoker = useGame((s) => s.moveJoker)
  if (!run) return null
  const silencedIdx = round?.bossId && jokerSilenced(round.bossId) ? 0 : -1

  return (
    <div className="flex gap-2 items-start" data-testid="joker-tray">
      {run.jokers.map((j, i) => {
        const def = jokerRegistry[j.id]
        if (!def) return null
        return (
          <div
            key={j.id}
            className={`joker-card rarity-${def.rarity} has-tip w-28 p-2 ${i === silencedIdx ? 'opacity-40 grayscale' : ''}`}
            tabIndex={0}
          >
            <div className="text-xs font-bold leading-tight">{def.name}</div>
            <div className="text-[10px] text-slate-400 capitalize">{def.rarity}</div>
            <div className="tip">
              <div className="font-bold mb-1">{def.name}</div>
              {describeJoker(j)}
              {i === silencedIdx && <div className="mt-1 text-rose-300">Silenced this round!</div>}
              <div className="mt-1 text-slate-400">Sell for ${sellValue(j.id)}</div>
            </div>
            <div className="mt-1 flex gap-1 justify-between">
              <button className="text-[10px] text-slate-400 hover:text-slate-200 px-1" onClick={() => moveJoker(j.id, -1)} aria-label={`Move ${def.name} left`}>
                ◂
              </button>
              <button className="text-[10px] text-rose-300 hover:text-rose-200" onClick={() => sellOwnedJoker(j.id)}>
                sell ${sellValue(j.id)}
              </button>
              <button className="text-[10px] text-slate-400 hover:text-slate-200 px-1" onClick={() => moveJoker(j.id, 1)} aria-label={`Move ${def.name} right`}>
                ▸
              </button>
            </div>
          </div>
        )
      })}
      {Array.from({ length: run.jokerSlots - run.jokers.length }, (_, i) => (
        <div key={`empty-${i}`} className="w-28 h-[74px] rounded-[10px] border-2 border-dashed border-slate-600/50 flex items-center justify-center text-slate-600 text-[10px]">
          joker slot
        </div>
      ))}
    </div>
  )
}

function jokerSilenced(bossId: string): boolean {
  return bossId === 'the-silence'
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
          <button key={`${id}-${i}`} className="joker-card has-tip w-24 p-2 text-left" onClick={() => activateGod(id)}>
            <div className="text-xs font-bold leading-tight text-amber-200">{def.name}</div>
            <div className="text-[10px] text-slate-400">{def.title}</div>
            <div className="tip">
              <div className="font-bold mb-1">
                {def.name}, {def.title}
              </div>
              {def.description}
              <div className="mt-1 text-emerald-300">Click to use</div>
            </div>
          </button>
        )
      })}
      {Array.from({ length: run.consumableSlots - run.consumables.length }, (_, i) => (
        <div key={`slot-${i}`} className="w-24 h-[58px] rounded-[10px] border-2 border-dashed border-slate-600/50 flex items-center justify-center text-slate-600 text-[10px]">
          god slot
        </div>
      ))}
    </div>
  )
}

export function MoneyBadge() {
  const run = useGame((s) => s.run)
  if (!run) return null
  return (
    <div className="panel px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">Money</div>
      <div className="text-xl font-extrabold big-number" style={{ color: 'var(--gold)' }} data-testid="money">
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
      <div className="text-[10px] uppercase tracking-wide text-slate-400">Levels</div>
      <div className="text-sm font-semibold big-number">
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
