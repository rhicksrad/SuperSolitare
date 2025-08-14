import { describe, it, expect } from 'vitest'
import { computeMoveScore } from '../src/game/scoring'
import { jokerRegistry } from '../src/game/jokers'
import { evaluateRound } from '../src/game/run'

const basePrev = {
  config: { targetScore: 0, timeLimitSec: 0, redeals: 0, dealSize: 3 },
  piles: [
    { id: 'waste', type: 'waste', cards: [{ id: 'x', suit: 'spades', rank: 1, faceUp: true }] },
    { id: 'f0', type: 'foundation', cards: [] },
  ],
  score: 0,
  streak: 2,
  streakMultiplier: 1.2 ** 2,
  redealsLeft: 0,
  timeRemainingSec: 0,
  moveHistory: [{ kind: 'waste_to_foundation' } as any, { kind: 'waste_to_foundation' } as any],
  undoStack: [],
}

const baseNext = {
  ...basePrev,
  piles: [
    { id: 'waste', type: 'waste', cards: [] },
    { id: 'f0', type: 'foundation', cards: [{ id: 'x', suit: 'spades', rank: 1, faceUp: true }] },
  ],
}

describe('Sample joker effects', () => {
  it('Monochrome adds +20% for black foundation cards', () => {
    const move = { kind: 'waste_to_foundation', fromPileId: 'waste', toPileId: 'f0' } as const
    const j = jokerRegistry['monochrome']
    const res = computeMoveScore(basePrev as any, baseNext as any, move, { jokers: [j] as any })
    expect(res.delta).toBe(Math.round(50 * 1.2 ** 2 * 1.2))
  })

  it('Streak Freak scales with streak step (+0.1 per)', () => {
    const move = { kind: 'waste_to_foundation', fromPileId: 'waste', toPileId: 'f0' } as const
    const j = jokerRegistry['streak-freak']
    const res = computeMoveScore(basePrev as any, baseNext as any, move, { jokers: [j] as any })
    // next step = 3 -> +30%
    expect(res.delta).toBe(Math.round(50 * 1.2 ** 2 * 1.3))
  })

  it('Cascade adds +80 when moving run >=4 tableau-to-tableau (no base score)', () => {
    const prev = {
      ...basePrev,
      piles: [
        { id: 't0', type: 'tableau', cards: Array.from({ length: 4 }).map((_, i) => ({ id: String(i), suit: 'hearts', rank: 7 - i, faceUp: true })) },
        { id: 't1', type: 'tableau', cards: [{ id: 'b', suit: 'clubs', rank: 8, faceUp: true }] },
      ],
      moveHistory: [],
      streak: 0,
      streakMultiplier: 1,
    }
    const next = {
      ...prev,
      piles: [
        { id: 't0', type: 'tableau', cards: [] },
        { id: 't1', type: 'tableau', cards: [{ id: 'b', suit: 'clubs', rank: 8, faceUp: true }, ...Array.from({ length: 4 }).map((_, i) => ({ id: String(i), suit: 'hearts', rank: 7 - i, faceUp: true }))] },
      ],
    }
    const move = { kind: 'tableau_to_tableau', fromPileId: 't0', toPileId: 't1', count: 4 } as const
    const j = jokerRegistry['cascade']
    const res = computeMoveScore(prev as any, next as any, move, { jokers: [j] as any })
    // Base scoring for tableau->tableau is 0 foundation; empty column +200; Cascade +80
    expect(res.breakdown.foundation).toBe(0)
    expect(res.breakdown.emptyColumn).toBe(200)
    expect(res.delta).toBe(280)
  })

  it('Early Bird adds +15% if >30s left at round end', () => {
    const prev: any = {
      config: { targetScore: 0, timeLimitSec: 120, redeals: 0, dealSize: 3 },
      piles: [ { id: 'stock', type: 'stock', cards: [] } ],
      score: 200,
      streak: 0,
      streakMultiplier: 1,
      redealsLeft: 0,
      timeRemainingSec: 45,
      moveHistory: [],
      undoStack: [],
    }
    const outcome = evaluateRound(prev, 'small')
    // Simulate onRoundEnd application like store does
    const add = jokerRegistry['early-bird'].applyHooks?.onRoundEnd?.({ score: prev.score, timeRemainingSec: prev.timeRemainingSec, foundationCount: 0, stockLeft: 0 } as any, { ante: 1, seed: 'x' }) || 0
    expect(add).toBe(Math.round(prev.score * 0.15))
    expect(typeof outcome.success).toBe('boolean')
  })

  it('Waste Not adds +10 per card in stock at round end', () => {
    const prev: any = {
      config: { targetScore: 0, timeLimitSec: 120, redeals: 0, dealSize: 3 },
      piles: [ { id: 'stock', type: 'stock', cards: Array.from({ length: 7 }).map((_, i) => ({ id: String(i) })) } ],
      score: 0,
      streak: 0,
      streakMultiplier: 1,
      redealsLeft: 0,
      timeRemainingSec: 0,
      moveHistory: [],
      undoStack: [],
    }
    const add = jokerRegistry['waste-not'].applyHooks?.onRoundEnd?.({ score: prev.score, timeRemainingSec: prev.timeRemainingSec, foundationCount: 0, stockLeft: 7 } as any, { ante: 1, seed: 'x' }) || 0
    expect(add).toBe(70)
  })

  it('Archivist scales score by +5% per reveal (capped)', () => {
    const prev: any = {
      config: { targetScore: 0, timeLimitSec: 120, redeals: 0, dealSize: 3 },
      piles: [ { id: 'stock', type: 'stock', cards: [] } ],
      score: 200,
      streak: 0,
      streakMultiplier: 1,
      redealsLeft: 0,
      timeRemainingSec: 10,
      moveHistory: [],
      undoStack: [],
    }
    const add = jokerRegistry['archivist'].applyHooks?.onRoundEnd?.({ score: 200, timeRemainingSec: 10, foundationCount: 0, stockLeft: 0, reveals: 3 } as any, { ante: 1, seed: 'x' }) || 0
    expect(add).toBe(Math.round(200 * 0.15))
  })

  it('Tempo grants +50 per 15s if no deals', () => {
    const add = jokerRegistry['tempo'].applyHooks?.onRoundEnd?.({ score: 0, timeRemainingSec: 46, foundationCount: 0, stockLeft: 0, dealtThisRound: false } as any, { ante: 1, seed: 'x' }) || 0
    expect(add).toBe(150)
    const add2 = jokerRegistry['tempo'].applyHooks?.onRoundEnd?.({ score: 0, timeRemainingSec: 46, foundationCount: 0, stockLeft: 0, dealtThisRound: true } as any, { ante: 1, seed: 'x' }) || 0
    expect(add2).toBe(0)
  })
})


