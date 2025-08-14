import { useStore } from '../../state/store'
import Card from './Card'
import { useRef, useState } from 'react'
import { isLegalMove } from '../../game/solitaire'
import { playDeal, playFoundation, playSnap } from '../sfx'

export default function Board() {
  const round = useStore((s) => s.currentRound)
  const difficulty = useStore((s) => s.run?.difficulty || 'medium')
  const piles = round?.piles ?? []
  const tableau = piles.filter((p) => p.type === 'tableau')
  const foundations = piles.filter((p) => p.type === 'foundation')
  const stock = piles.find((p) => p.id === 'stock')
  const waste = piles.find((p) => p.id === 'waste')
  const deal = useStore((s) => s.dealStock)
  const selectFromTableau = useStore((s) => s.selectFromTableau)
  const selectWasteTop = useStore((s) => s.selectWasteTop)
  const tryMoveToPile = useStore((s) => s.tryMoveToPile)
  const selected = useStore((s) => s.selected)
  const selectCustom = useStore((s) => s.selectCustom)
  const roundState = round // alias for closures
  const soundsOn = useStore((s) => s.settings.sounds)
  const helper = (() => {
    if (!round || difficulty !== 'easy') return null
    // simple hint: prefer tableau->foundation if legal, else waste->foundation, else any tableau move
    const foundations = round.piles.filter((p) => p.type === 'foundation')
    const tableau = round.piles.filter((p) => p.type === 'tableau')
    for (const t of tableau) {
      const top = t.cards[t.cards.length - 1]
      if (!top || !top.faceUp) continue
      for (const f of foundations) {
        const m: any = { kind: 'tableau_to_foundation', fromPileId: t.id, toPileId: f.id }
        if (isLegalMove(round, m).ok) return { text: `Move ${top.rank} to foundation`, reason: 'Foundation scores and increases streak' }
      }
    }
    const waste = round.piles.find((p) => p.id === 'waste')
    if (waste && waste.cards.length > 0) {
      const top = waste.cards[waste.cards.length - 1]
      for (const f of foundations) {
        const m: any = { kind: 'waste_to_foundation', fromPileId: 'waste', toPileId: f.id }
        if (isLegalMove(round, m).ok) return { text: `Play waste ${top.rank} to foundation`, reason: 'Foundation scores and clears waste' }
      }
    }
    return null
  })()
  const dragInfo = useRef<{ fromPileId: string; startY: number; count: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fx = (round as any)?.foundationFx as { cardId: string; ts: number } | undefined

  // Compute legal targets for current selection
  const legalTargets = (() => {
    if (!round || !selected) return new Set<string>()
    const res = new Set<string>()
    const from = round.piles.find((p) => p.id === selected.fromPileId)
    if (!from) return res
    for (const p of round.piles) {
      if (p.id === from.id) continue
      let move = null as any
      if (from.type === 'tableau' && p.type === 'tableau') move = { kind: 'tableau_to_tableau', fromPileId: from.id, toPileId: p.id, count: selected.count }
      if (from.type === 'tableau' && p.type === 'foundation' && selected.count === 1) move = { kind: 'tableau_to_foundation', fromPileId: from.id, toPileId: p.id }
      if (from.type === 'waste' && p.type === 'tableau') move = { kind: 'waste_to_tableau', fromPileId: 'waste', toPileId: p.id }
      if (from.type === 'waste' && p.type === 'foundation') move = { kind: 'waste_to_foundation', fromPileId: 'waste', toPileId: p.id }
      if (!move) continue
      if (isLegalMove(round, move as any).ok) res.add(p.id)
    }
    return res
  })()

  return (
    <div className="flex flex-col gap-4" role="region" aria-label="Game board">
      <div className="flex gap-4 items-start">
        {/* Stock/Waste on the left */}
        <div className="flex gap-3 items-start" aria-label="Stock and waste">
          <div
            role="button"
            tabIndex={0}
            aria-label={`Stock. ${stock?.cards.length || 0} cards remaining. Press Enter to deal.`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); deal(); if (soundsOn) playDeal() } }}
            onClick={() => { deal(); if (soundsOn) playDeal() }}
            className="w-16 h-22 rounded-md border border-slate-700/60 bg-slate-800/40 flex items-center justify-center"
          >
            {stock?.cards.length ? <div className="w-12 h-16 rounded border border-blue-700 bg-blue-800" /> : <span className="text-[10px] text-slate-200">Stock</span>}
          </div>
          <div
            role="button"
            tabIndex={0}
            aria-label={`Waste. ${waste?.cards.length || 0} cards visible. Press Enter to select top.`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectWasteTop() } }}
            onClick={selectWasteTop}
            className="w-[240px] h-22 rounded-md border border-slate-700/60 bg-slate-800/40 flex items-center justify-start relative overflow-visible pl-2"
          >
            {waste?.cards.length ? (
              <div className="absolute inset-0">
                {waste.cards.slice(Math.max(0, waste.cards.length - 3)).map((wc, i, arr) => (
                  <div key={wc.id} style={{ left: 8 + i * 14, top: '50%', transform: 'translateY(-50%)', zIndex: 100 + i }} className="absolute transition-transform">
                    <div
                      draggable={i === arr.length - 1}
                      onDragStart={(e) => {
                        if (i !== arr.length - 1) return
                        setIsDragging(true)
                        selectCustom('waste', 1)
                        e.dataTransfer.setData('text/plain', 'drag')
                      }}
                      onDragEnd={() => setIsDragging(false)}
                      onDoubleClick={() => {
                        // Auto-move top waste card to first legal foundation
                        if (i !== arr.length - 1) return
                        const fnds = roundState?.piles.filter((p) => p.type === 'foundation') || []
                        for (const f of fnds) {
                          if (isLegalMove(roundState!, { kind: 'waste_to_foundation', fromPileId: 'waste', toPileId: f.id } as any).ok) {
                            selectCustom('waste', 1)
                            tryMoveToPile(f.id)
                            if (soundsOn) playFoundation()
                            break
                          }
                        }
                      }}
                      aria-label={i === arr.length - 1 ? 'Waste top card (draggable)' : 'Waste card'}
                      role="img"
                    >
                      <Card small card={wc} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-slate-200">Waste</span>
            )}
          </div>
        </div>
        {/* Foundations on the right with extra spacing from tableau */}
        <div className="ml-auto flex gap-2 pr-1" aria-label="Foundations" role="group">
          {foundations.map((pile) => (
            <div
              key={pile.id}
              aria-label={`Foundation pile with ${pile.cards.length} cards.`}
              className={`w-16 h-22 rounded-md border ${selected && legalTargets.has(pile.id) && isDragging ? 'border-sky-400' : 'border-slate-700/60'} bg-slate-800/40 flex items-center justify-center`}
              onDragOver={(e) => { if (isDragging) e.preventDefault() }}
              onDrop={() => { tryMoveToPile(pile.id); setIsDragging(false) }}
            >
              {pile.cards.length > 0 ? <Card card={pile.cards[pile.cards.length - 1]} /> : <span className="text-[10px] text-slate-300">F</span>}
            </div>
          ))}
        </div>
      </div>
      {helper && (
        <div className="text-xs text-slate-300 mt-1 opacity-80">Hint: {helper.text} — {helper.reason}</div>
      )}

      <div className="grid grid-cols-7 gap-2 p-2 md:grid-cols-7 sm:grid-cols-4 grid-cols-2" role="grid" aria-label="Tableau columns">
        {tableau.map((pile) => {
          const FAN = 22
          const H = Math.max(136, (pile.cards.length - 1) * FAN + 136)
          return (
            <div
              key={pile.id}
              onClick={() => tryMoveToPile(pile.id)}
              className={`relative rounded-md border focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${selected && difficulty === 'easy' ? (legalTargets.has(pile.id) ? 'border-sky-400' : (selected.fromPileId === pile.id ? 'border-slate-500' : 'border-slate-700/60')) : 'border-slate-700/60'} bg-slate-800/40 p-0.5`}
              style={{ height: H }}
              onDragOver={(e) => { if (isDragging) e.preventDefault() }}
              onDrop={() => { tryMoveToPile(pile.id); setIsDragging(false) }}
              role="gridcell"
              aria-label={`Tableau ${pile.id.slice(1)} with ${pile.cards.length} cards`}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tryMoveToPile(pile.id) } }}
            >
              {pile.cards.map((c, idx) => (
                <div
                  key={c.id}
                  className="absolute left-0.5"
                  style={{ top: idx * FAN, transition: 'transform 120ms ease' }}
                  draggable={c.faceUp}
                  onDragStart={(e) => {
                    if (!c.faceUp) return
                    setIsDragging(true)
                    const count = pile.cards.length - idx
                    selectCustom(pile.id, count)
                    e.dataTransfer.setData('text/plain', 'drag')
                  }}
                  onDragEnter={() => { if (soundsOn) playSnap() }}
                  onDragEnd={() => setIsDragging(false)}
                  onMouseDown={(e) => {
                    if (!c.faceUp) return
                    dragInfo.current = { fromPileId: pile.id, startY: e.clientY, count: pile.cards.length - idx }
                  }}
                  onMouseUp={(e) => {
                    if (!dragInfo.current) return
                    e.stopPropagation()
                    selectCustom(dragInfo.current.fromPileId, dragInfo.current.count)
                    dragInfo.current = null
                  }}
                  onDoubleClick={() => {
                    if (!c.faceUp) return
                    // Auto-move to first legal foundation if top of its pile
                    const isTop = idx === pile.cards.length - 1
                    if (!isTop) return
                    selectCustom(pile.id, 1)
                    // find first foundation that accepts
                    const fnds = roundState?.piles.filter((p) => p.type === 'foundation') || []
                    for (const f of fnds) {
                      if (isLegalMove(roundState!, { kind: 'tableau_to_foundation', fromPileId: pile.id, toPileId: f.id } as any).ok) {
                        tryMoveToPile(f.id)
                        break
                      }
                    }
                  }}
                  onClick={(e) => { e.stopPropagation(); selectFromTableau(pile.id, idx) }}
                >
                  <Card card={c} isSelected={selected?.fromPileId === pile.id && pile.cards.length - idx === selected.count} />
                  {fx && fx.cardId === c.id && (
                    <div className="pointer-events-none absolute inset-0 animate-pulse" />
                  )}
                </div>
              ))}
              {pile.cards.length === 0 && <span className="text-[10px] text-slate-500">Empty</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}


