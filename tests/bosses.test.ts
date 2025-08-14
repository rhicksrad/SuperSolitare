import { describe, it, expect } from 'vitest'
import { applyBossBeforeMove, applyBossOnScore, bossRegistry, applyBossAfterMove } from '../src/game/bosses'

describe('Boss modifiers', () => {
  it('Thin Waste blocks dealing when waste has a card', () => {
    const state = {
      config: { targetScore: 0, timeLimitSec: 0, redeals: 0, dealSize: 3 },
      piles: [
        { id: 'stock', type: 'stock', cards: [{ id: 'a', suit: 'hearts', rank: 2, faceUp: false }] },
        { id: 'waste', type: 'waste', cards: [{ id: 'b', suit: 'clubs', rank: 5, faceUp: true }] },
      ],
      score: 0,
      streak: 0,
      streakMultiplier: 1,
      redealsLeft: 0,
      timeRemainingSec: 0,
      moveHistory: [],
      undoStack: [],
    }
    const res = applyBossBeforeMove([bossRegistry['thin-waste']], { kind: 'deal_stock' }, state as any)
    expect(res.allowed).toBe(false)
  })

  it('Red Alert reduces score by 20% for red cards', () => {
    const state = {
      piles: [],
    }
    const extras = {
      foundationMove: true,
      movedCard: { id: 'x', suit: 'hearts', rank: 1, faceUp: true },
      revealCount: 0,
      movedRunCount: 1,
      streakStep: 1,
    }
    const out = applyBossOnScore([bossRegistry['red-alert']], 100, state as any, { kind: 'waste_to_foundation' } as any, extras as any, { foundation: 100, reveal: 0, emptyColumn: 0 })
    expect(out).toBe(80)
  })

  it('Glacial Start blocks early foundation moves', () => {
    const state = {
      config: { timeLimitSec: 120 },
      timeRemainingSec: 115,
      piles: [],
    }
    const res = applyBossBeforeMove([bossRegistry['glacial-start']], { kind: 'waste_to_foundation' } as any, state as any)
    expect(res.allowed).toBe(false)
  })

  it('Stoic Stock charges -25 on deal', () => {
    const delta = applyBossOnScore([bossRegistry['stoic-stock']], 0, { piles: [] } as any, { kind: 'deal_stock' } as any, { foundationMove: false, revealCount: 0, movedRunCount: 1 } as any, { foundation: 0, reveal: 0, emptyColumn: 0 })
    expect(delta).toBe(-25)
  })

  it('Night Mode adjusts scores by +10%', () => {
    const delta = applyBossOnScore([bossRegistry['night-mode']], 100, { piles: [] } as any, { kind: 'tableau_to_tableau' } as any, { foundationMove: false, revealCount: 0, movedRunCount: 1 } as any, { foundation: 0, reveal: 0, emptyColumn: 0 })
    expect(delta).toBe(110)
  })

  it('Half-Deck halves stock on first move via afterMove', () => {
    const prev: any = { moveHistory: [] }
    const next: any = { moveHistory: [], piles: [{ id: 'stock', type: 'stock', cards: Array.from({ length: 20 }).map((_, i) => ({ id: String(i) })) }] }
    const move: any = { kind: 'deal_stock' }
    const res = applyBossAfterMove([bossRegistry['half-deck']], prev, next, move)
    const stock = res.piles.find((p: any) => p.id === 'stock')
    expect(stock.cards.length).toBe(10)
  })

  it('Mirror Moves every 5th move mirrors unless to foundation (smoke)', () => {
    const prev: any = { moveHistory: [{}, {}, {}, {}] }
    const next: any = { moveHistory: [{}, {}, {}, {}, {}], undoStack: [{ piles: [], score: 1, streak: 0, streakMultiplier: 1, redealsLeft: 0, timeRemainingSec: 0 }], piles: [], score: 2, streak: 1, streakMultiplier: 1.2, redealsLeft: 0, timeRemainingSec: 0 }
    const move: any = { kind: 'tableau_to_tableau', fromPileId: 't1', toPileId: 't2', count: 1 }
    const res = applyBossAfterMove([bossRegistry['mirror-moves']], prev, next, move)
    expect(res.score).toBe(1)
  })

  it('Suit Tax – Spades zeros spade foundation component', () => {
    const state = { piles: [] }
    const extras: any = { foundationMove: true, movedCard: { suit: 'spades' } }
    const delta = applyBossOnScore([bossRegistry['suit-tax-spades']], 50, state as any, { kind: 'tableau_to_foundation' } as any, extras, { foundation: 50, reveal: 0, emptyColumn: 0 })
    expect(delta).toBe(0)
  })

  it('Frozen Royals blocks K/Q moves for first 5 moves', () => {
    const state: any = {
      moveHistory: [1,2,3,4],
      piles: [
        { id: 't1', type: 'tableau', cards: [{ rank: 13, suit: 'spades' }] },
        { id: 't2', type: 'tableau', cards: [{ rank: 5, suit: 'hearts' }] },
      ],
    }
    const res = applyBossBeforeMove([bossRegistry['frozen-royals']], { kind: 'tableau_to_tableau', fromPileId: 't1', toPileId: 't2', count: 1 } as any, state)
    expect(res.allowed).toBe(false)
  })
})


