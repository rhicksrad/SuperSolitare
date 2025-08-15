import type { Joker, GodCard } from '../../game/types'
import { useStore } from '../../state/store'
import Tooltip from './Tooltip'

export default function JokerTray({ jokers }: { jokers: Joker[] }) {
  const assetBase = (() => {
    const b = (import.meta as any).env?.BASE_URL || '/'
    return b.endsWith('/') ? b.slice(0, -1) : b
  })()
  const emptySlots = Math.max(0, 5 - jokers.length)
  const sell = useStore((s) => s.sellJoker)
  const gods = useStore((s) => s.run?.godCards || [])
  
  const moveLeft = (id: string) => (useStore.getState() as any).moveJoker(id, 'left')
  const moveRight = (id: string) => (useStore.getState() as any).moveJoker(id, 'right')
  const reorder = (id: string, toIndex: number) => (useStore.getState() as any).reorderJoker?.(id, toIndex)
  const run = useStore((s) => s.run)
  const useGod = (g: GodCard) => {
    const store = useStore.getState() as any
    // Apply simple effects immediately
    if (g.effect === 'reveal_tops') {
      const r = store.currentRound
      if (r) {
        const next = { ...r, piles: r.piles.map((p: any) => p.type === 'tableau' && p.cards.length > 0 ? { ...p, cards: p.cards.map((c: any, i: number, arr: any[]) => i === arr.length - 1 ? { ...c, faceUp: true } : c) } : p) }
        store.currentRound = next as any
        useStore.setState({ currentRound: next })
      }
    }
    if (g.effect === 'rank_up_foundation' || g.effect === 'rank_up_reveal' || g.effect === 'rank_up_empty') {
      const cat = g.effect === 'rank_up_foundation' ? 'foundation_move' : g.effect === 'rank_up_reveal' ? 'reveal_face_down' : 'empty_column'
      const state = useStore.getState() as any
      const currentRun = state.run as any
      if (currentRun) {
        const nextRanks = { ...currentRun.scoreRanks, [cat]: (currentRun.scoreRanks[cat] || 1) + 0.1 }
        const nextPatrons = { ...(currentRun.scoreRankPatrons || {}), [cat]: { godId: g.id, name: g.name, title: patronTitleFor(cat, g.name) } }
        useStore.setState({ run: { ...currentRun, scoreRanks: nextRanks, scoreRankPatrons: nextPatrons } })
      }
    }
    if (g.effect === 'time_plus') {
      const r = store.currentRound
      if (r) useStore.setState({ currentRound: { ...r, timeRemainingSec: r.timeRemainingSec + 30 } })
    }
    if (g.effect === 'double_next') {
      const r = store.currentRound as any
      if (r) { r.snapCharges = (r.snapCharges || 0) + 1; useStore.setState({ currentRound: { ...store.currentRound! } as any }) }
    }
    // Remove used card from inventory
    const run = store.run!
    const idx = run.godCards.findIndex((x: GodCard) => x.id === g.id)
    if (idx >= 0) {
      const next = run.godCards.slice(); next.splice(idx, 1)
      useStore.setState({ run: { ...run, godCards: next } })
    }
  }
  function patronTitleFor(cat: 'foundation_move' | 'reveal_face_down' | 'empty_column', name: string): string {
    if (cat === 'foundation_move') return `${name}, Patron of Pillars`
    if (cat === 'reveal_face_down') return `${name}, Keeper of Secrets`
    return `${name}, Warden of the Void`
  }
  return (
    <div className="flex flex-wrap gap-3 px-3 py-3 rounded-xl bg-slate-900/60 border border-slate-700 shadow-sm justify-center" aria-label="Joker Tray">
      {gods.length > 0 && (
        <div className="flex items-center gap-2 mr-2 text-xs text-slate-300">
          <span className="opacity-80">God Cards:</span>
          {gods.map((g) => (
            <button key={g.id} className="rounded bg-amber-700/70 hover:bg-amber-600 px-2 py-1" onClick={() => useGod(g)} title={g.description}>{g.name}</button>
          ))}
        </div>
      )}
      {run?.scoreRankPatrons && (
        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          {(['foundation_move','reveal_face_down','empty_column'] as const).map((k) => {
            const p = (run.scoreRankPatrons as any)[k]
            if (!p) return null
            const label = k === 'foundation_move' ? 'Foundation' : k === 'reveal_face_down' ? 'Reveal' : 'Empty Column'
            return <div key={k} className="px-2 py-1 rounded bg-slate-800/70 border border-slate-700">{label}: <span className="text-amber-300">{p.name}</span> — <span className="opacity-80">{p.title}</span></div>
          })}
        </div>
      )}
      {jokers.map((j, idx) => (
        <div
          key={j.id}
          className="w-[96px] text-center rounded-md border border-slate-700 bg-slate-800/60 p-1"
          draggable
          role="listitem"
          tabIndex={0}
          aria-label={`${j.name}. ${j.rarity} rarity. ${j.description}`}
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-joker-id', j.id)
            e.dataTransfer.setData('text/plain', j.id)
          }}
          onDragOver={(e) => { e.preventDefault() }}
          onDrop={(e) => {
            e.preventDefault()
            const id = e.dataTransfer.getData('application/x-joker-id') || e.dataTransfer.getData('text/plain')
            if (!id) return
            reorder(id, idx)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') { e.preventDefault(); moveLeft(j.id) }
            if (e.key === 'ArrowRight') { e.preventDefault(); moveRight(j.id) }
            if (e.key === 'Home') { e.preventDefault(); reorder(j.id, 0) }
            if (e.key === 'End') { e.preventDefault(); reorder(j.id, jokers.length - 1) }
          }}
        >
          <Tooltip
            content={(
              <div>
                <div className="font-semibold">{j.name}{(j as any).variant ? ` [${(j as any).variant === 'foil' ? 'Foil' : 'Holo'}]` : ''}</div>
                <div className="opacity-90">Rarity: <span className="text-amber-300">{j.rarity}</span></div>
                <div className="mt-1 opacity-90 leading-snug">{j.description}</div>
              </div>
            )}
          >
            <div className="relative w-[96px] h-[136px] mx-auto">
              <img src={`${assetBase}/assets/jokers/${j.id}.svg`} alt={j.name} className="absolute inset-0 w-full h-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).src = `${assetBase}/assets/jokers/placeholder.svg` }} />
              <div className="absolute inset-0 rounded-md border border-slate-700/60" />
            </div>
          </Tooltip>
          <div className="mt-1 px-1">
            <div className="font-medium text-xs text-slate-200 leading-tight">{j.name}{(j as any).variant ? ` [${(j as any).variant === 'foil' ? 'Foil' : 'Holo'}]` : ''}</div>
            <div className="text-[11px] text-slate-300 leading-snug break-words">
              {j.description}
            </div>
          </div>
          <div className="mt-1 flex items-center justify-center gap-1">
            <button className="rounded bg-slate-700 px-2 py-0.5 text-[10px]" onClick={() => sell(j.id)}>Sell</button>
          </div>
          <div className="mt-1 flex items-center justify-center gap-1">
            <button disabled={idx === 0} className="rounded bg-slate-700 disabled:opacity-40 px-1 py-0.5 text-[10px]" onClick={() => moveLeft(j.id)}>←</button>
            <button disabled={idx === jokers.length - 1} className="rounded bg-slate-700 disabled:opacity-40 px-1 py-0.5 text-[10px]" onClick={() => moveRight(j.id)}>→</button>
          </div>
        </div>
      ))}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <div key={`empty-${i}`} className="w-[96px] text-center rounded-md border border-dashed border-slate-700 text-xs text-slate-600 p-1" role="listitem" aria-label="Empty joker slot">
          Empty
        </div>
      ))}
    </div>
  )
}


