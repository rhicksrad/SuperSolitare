import { describe, it, expect } from 'vitest'
import { createInitialRound, applyMove, isLegalMove } from '../src/game/solitaire'
import { applyRoundStartJokerHooks, jokerRegistry } from '../src/game/jokers'

function card(id: string, suit: 'hearts' | 'diamonds' | 'spades' | 'clubs', rank: number, faceUp = true) {
  return { id, suit, rank, faceUp }
}

describe('New joker effects', () => {
  it('Perfect Draw flips on first deal (flag consumed)', () => {
    const round = createInitialRound('seed-pd', 1)
    ;(round as any).perfectDraw = true
    ;(round as any).perfectDrawDone = false
    const next = applyMove(round, { kind: 'deal_stock' })
    expect((next as any).perfectDrawDone).toBe(true)
  })

  it('Royal Decree allows K onto Q of same color once and consumes charge', () => {
    const round = createInitialRound('seed-rd', 1)
    const t0 = round.piles.find((p) => p.id === 't0')!
    const t1 = round.piles.find((p) => p.id === 't1')!
    t0.cards = [card('kH', 'hearts', 13, true)] as any
    t1.cards = [card('qD', 'diamonds', 12, true)] as any
    ;(round as any).royalDecreeCharge = 1
    const legal = isLegalMove(round, { kind: 'tableau_to_tableau', fromPileId: 't0', toPileId: 't1', count: 1 })
    expect(legal.ok).toBe(true)
    const next = applyMove(round, { kind: 'tableau_to_tableau', fromPileId: 't0', toPileId: 't1', count: 1 })
    expect((next as any).royalDecreeCharge).toBe(0)
  })

  it('Column Marshal grants +1 redeal after emptying 2 columns', () => {
    const round = createInitialRound('seed-cm', 1)
    ;(round as any).snapCharges = 0
    const t2 = round.piles.find((p) => p.id === 't2')!
    const t3 = round.piles.find((p) => p.id === 't3')!
    const t4 = round.piles.find((p) => p.id === 't4')!
    const t5 = round.piles.find((p) => p.id === 't5')!
    t2.cards = [card('kS', 'spades', 13, true)] as any
    t3.cards = [] as any
    t4.cards = [card('kC', 'clubs', 13, true)] as any
    t5.cards = [] as any
    const startRedeals = round.redealsLeft
    // First empty
    const a = applyMove(round, { kind: 'tableau_to_tableau', fromPileId: 't2', toPileId: 't3', count: 1 }, { jokers: [{ id: 'column-marshal' } as any] })
    expect(a.stats?.columnsEmptied || 0).toBeGreaterThanOrEqual(1)
    // Second empty should grant +1 redeal
    const b = applyMove(a, { kind: 'tableau_to_tableau', fromPileId: 't4', toPileId: 't5', count: 1 }, { jokers: [{ id: 'column-marshal' } as any] })
    expect(b.redealsLeft).toBe(startRedeals + 1)
  })

  it('Overtime modifies round start time and end bonus when time is used up', () => {
    const overtime = jokerRegistry['overtime']!
    const cfg = { targetScore: 500, timeLimitSec: 120, redeals: 2, dealSize: 3 }
    const out = applyRoundStartJokerHooks([overtime], { ante: 1, seed: 'x' }, cfg)
    expect(out.timeLimitSec).toBe(150)
    const add = overtime.applyHooks?.onRoundEnd?.({ score: 1000, timeRemainingSec: 0, foundationCount: 0 } as any, { ante: 1, seed: 'x' }) || 0
    expect(add).toBe(150)
  })
})


