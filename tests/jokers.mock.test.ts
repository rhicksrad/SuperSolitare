import { describe, it, expect } from 'vitest'
import { computeMoveScore } from '../src/game/scoring'
import type { Joker, JokerHookContext, Move } from '../src/game/types'

function makeMockJoker(mult: number): Joker {
  return {
    id: `mock-${mult}`,
    name: 'Mock Multiplier',
    rarity: 'common',
    description: 'Multiplies move delta',
    applyHooks: {
      onMove: (_move: Move, delta: number, _ctx: JokerHookContext) => delta * mult,
    },
  }
}

describe('Joker onMove stacking', () => {
  it('applies onMove hooks in order (pure compute)', () => {
    const prev = {
      config: { targetScore: 0, timeLimitSec: 0, redeals: 0, dealSize: 3 },
      piles: [
        { id: 'waste', type: 'waste', cards: [{ id: 'x', suit: 'hearts', rank: 1, faceUp: true }] },
        { id: 'f0', type: 'foundation', cards: [] },
      ],
      score: 0,
      streak: 0,
      streakMultiplier: 1,
      redealsLeft: 0,
      timeRemainingSec: 0,
      moveHistory: [],
      undoStack: [],
    }
    const next = {
      ...prev,
      piles: [
        { id: 'waste', type: 'waste', cards: [] },
        { id: 'f0', type: 'foundation', cards: [{ id: 'x', suit: 'hearts', rank: 1, faceUp: true }] },
      ],
    }
    const move: Move = { kind: 'waste_to_foundation', fromPileId: 'waste', toPileId: 'f0' }
    const jokers = [makeMockJoker(2), makeMockJoker(1.5), makeMockJoker(1.1)]
    const result = computeMoveScore(prev as any, next as any, move, { jokers })
    // base 50 * 2 * 1.5 * 1.1 rounded
    expect(result.delta).toBe(Math.round(50 * 2 * 1.5 * 1.1))
    expect(result.nextStreak).toBe(1)
    expect(result.nextMultiplier).toBeCloseTo(1.2, 5)
  })
})


