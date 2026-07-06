import { useLayoutEffect, useRef } from 'react'
import { useGame } from '../state/store'
import type { Selection } from '../state/store'
import type { FoundationId, TableauId } from '../engine/klondike'
import { SUIT_GLYPH, SUITS } from '../engine/cards'
import { CardView } from './CardView'

/**
 * FLIP: after every render, any element with data-card-id that moved since the
 * previous render animates from its old position. Works across piles because
 * ids are stable for the whole run.
 */
function useFlipCards(enabled: boolean) {
  const rects = useRef<Map<string, DOMRect>>(new Map())
  useLayoutEffect(() => {
    const next = new Map<string, DOMRect>()
    document.querySelectorAll<HTMLElement>('[data-card-id]').forEach((el) => {
      const id = el.dataset.cardId!
      const rect = el.getBoundingClientRect()
      next.set(id, rect)
      if (!enabled) return
      const prev = rects.current.get(id)
      if (prev && (Math.abs(prev.left - rect.left) > 2 || Math.abs(prev.top - rect.top) > 2)) {
        el.animate(
          [
            { transform: `translate(${prev.left - rect.left}px, ${prev.top - rect.top}px)`, zIndex: '50' },
            { transform: 'translate(0, 0)', zIndex: '50' },
          ],
          { duration: 190, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
        )
      }
    })
    rects.current = next
  })
}

function sameSel(a: Selection | null, b: Selection): boolean {
  if (!a) return false
  if (a.source === 'waste') return b.source === 'waste'
  return b.source === 'tableau' && a.col === b.col && a.index === b.index
}

function useDropHandlers(target: TableauId | FoundationId) {
  const clickPile = useGame((s) => s.clickPile)
  return {
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      clickPile(target)
    },
  }
}

function StockAndWaste() {
  const round = useGame((s) => s.round)!
  const clickStock = useGame((s) => s.clickStock)
  const select = useGame((s) => s.select)
  const selection = useGame((s) => s.selection)
  const autoToFoundation = useGame((s) => s.autoToFoundation)
  const enhancements = useGame((s) => s.run?.enhancements) ?? {}

  const wasteTop = round.waste.length - 1
  const visible = Math.max(1, round.rules.wasteVisible ?? 3)
  const fan = round.waste.slice(Math.max(0, round.waste.length - visible))

  return (
    <div className="flex gap-3 items-start">
      <button
        className="relative"
        onClick={clickStock}
        aria-label={round.stock.length > 0 ? `Deal from stock, ${round.stock.length} cards left` : 'Recycle waste into stock'}
      >
        {round.stock.length > 0 ? (
          <div className="card card-back card-selectable" />
        ) : (
          <div className="pile-slot flex items-center justify-center text-2xl" style={{ color: round.recyclesLeft > 0 && round.waste.length > 0 ? 'var(--gold)' : 'rgba(255,255,255,0.25)' }}>
            ⟳
          </div>
        )}
        <div className="absolute -bottom-5 inset-x-0 text-center text-xs text-slate-400">{round.stock.length}</div>
      </button>

      <div className="relative" style={{ width: 'calc(var(--card-w) + var(--card-w) * 0.6)', height: 'var(--card-h)' }}>
        {fan.length === 0 && <div className="pile-slot" />}
        {fan.map((card, i) => {
          const isTop = i === fan.length - 1
          const globalIndex = round.waste.length - fan.length + i
          const sel: Selection = { source: 'waste' }
          return (
            <div key={card.id} className="absolute top-0" style={{ left: `calc(${i} * var(--card-w) * 0.3)`, zIndex: i }}>
              <CardView
                card={card}
                enhancement={enhancements[card.id]}
                cursed={round.curses.includes(card.id)}
                selectable={isTop}
                selected={isTop && sameSel(selection, sel)}
                popIn={isTop && globalIndex === wasteTop}
                trackId
                onClick={isTop ? () => select(sameSel(selection, sel) ? null : sel) : undefined}
                onDoubleClick={isTop ? () => autoToFoundation(sel) : undefined}
                onDragStart={isTop ? () => select(sel) : undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Foundations() {
  const round = useGame((s) => s.round)!
  const enhancements = useGame((s) => s.run?.enhancements) ?? {}
  return (
    <div className="flex gap-3">
      {round.foundations.map((pile, f) => {
        const id = `f${f}` as FoundationId
        const top = pile[pile.length - 1]
        return (
          <FoundationPile key={id} id={id} top={top} count={pile.length} enhancement={top ? enhancements[top.id] : undefined} />
        )
      })}
    </div>
  )
}

function FoundationPile({
  id,
  top,
  count,
  enhancement,
}: {
  id: FoundationId
  top?: { id: string; suit: (typeof SUITS)[number]; rank: number; faceUp: boolean }
  count: number
  enhancement?: 'gilded' | 'ruby' | 'sapphire' | 'lucky'
}) {
  const clickPile = useGame((s) => s.clickPile)
  const selection = useGame((s) => s.selection)
  const drop = useDropHandlers(id)
  return (
    <div
      className={selection ? 'drop-ready' : ''}
      onDragOver={drop.onDragOver}
      onDrop={drop.onDrop}
      onClick={() => clickPile(id)}
      role="button"
      aria-label={`Foundation ${Number(id[1]) + 1}, ${count} cards`}
    >
      {top ? (
        <CardView card={{ ...top, faceUp: true }} enhancement={enhancement} popIn trackId />
      ) : (
        <div className="pile-slot flex items-center justify-center text-3xl text-slate-500/60">
          {SUIT_GLYPH[SUITS[Number(id[1])]]}
        </div>
      )}
    </div>
  )
}

function TableauColumn({ col }: { col: number }) {
  const round = useGame((s) => s.round)!
  const selection = useGame((s) => s.selection)
  const select = useGame((s) => s.select)
  const clickPile = useGame((s) => s.clickPile)
  const autoToFoundation = useGame((s) => s.autoToFoundation)
  const enhancements = useGame((s) => s.run?.enhancements) ?? {}
  const id = `t${col}` as TableauId
  const drop = useDropHandlers(id)
  const pile = round.tableau[col]

  // stacked layout: face-down cards use a tighter gap
  const offsets: number[] = []
  let y = 0
  for (const card of pile) {
    offsets.push(y)
    y += card.faceUp ? 1 : 0.45
  }

  return (
    <div
      className="relative"
      style={{
        width: 'var(--card-w)',
        height: `calc(var(--card-h) + ${Math.max(0, y - 1)} * var(--stack-gap))`,
        minHeight: 'var(--card-h)',
      }}
      onDragOver={drop.onDragOver}
      onDrop={drop.onDrop}
    >
      {pile.length === 0 && (
        <div
          className={`pile-slot ${selection ? 'drop-ready' : ''}`}
          onClick={() => clickPile(id)}
          role="button"
          aria-label={`Empty column ${col + 1}`}
        />
      )}
      {pile.map((card, i) => {
        const sel: Selection = { source: 'tableau', col, index: i }
        const isSelected =
          selection?.source === 'tableau' && selection.col === col && i >= selection.index
        return (
          <div key={card.id} className="absolute left-0" style={{ top: `calc(${offsets[i]} * var(--stack-gap))`, zIndex: i }}>
            <CardView
              card={card}
              enhancement={enhancements[card.id]}
              cursed={round.curses.includes(card.id)}
              selectable={card.faceUp}
              selected={isSelected}
              trackId
              onClick={
                card.faceUp
                  ? (e) => {
                      e.stopPropagation()
                      if (selection && !sameSel(selection, sel)) clickPile(id)
                      else select(sameSel(selection, sel) ? null : sel)
                    }
                  : undefined
              }
              onDoubleClick={
                card.faceUp && i === pile.length - 1
                  ? (e) => {
                      e.stopPropagation()
                      autoToFoundation(sel)
                    }
                  : undefined
              }
              onDragStart={card.faceUp ? () => select(sel) : undefined}
            />
          </div>
        )
      })}
    </div>
  )
}

export function Board() {
  const select = useGame((s) => s.select)
  const reduceMotion = useGame((s) => s.settings.reduceMotion)
  useFlipCards(!reduceMotion)
  return (
    <div className="flex flex-col gap-5" onClick={() => select(null)} data-testid="board">
      <div className="flex justify-between items-start" onClick={(e) => e.stopPropagation()}>
        <StockAndWaste />
        <Foundations />
      </div>
      <div className="flex gap-3 justify-between" onClick={(e) => e.stopPropagation()}>
        {Array.from({ length: 7 }, (_, col) => (
          <TableauColumn key={col} col={col} />
        ))}
      </div>
    </div>
  )
}
