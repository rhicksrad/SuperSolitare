import { describe, it, expect } from 'vitest'
import { useStore } from '../src/state/store'

describe('Achievements', () => {
  it('sets clear_boss and boss_perfect on boss success', () => {
    // Seed a run at boss (blindIndex 2)
    useStore.setState((s) => ({
      ...s,
      run: {
        seed: 'achv-seed',
        ante: 1,
        coins: 0,
        jokers: [],
        modifiers: [],
        stats: {},
        history: [],
        rng: { seed: 'achv-seed', value: 0 },
        godCards: [],
        scoreRanks: { foundation_move: 1, reveal_face_down: 1, empty_column: 1 },
      } as any,
      blindIndex: 2,
      currentRound: {
        config: { targetScore: 100, timeLimitSec: 120, redeals: 2, dealSize: 3 },
        piles: [ { id: 'f0', type: 'foundation', cards: Array.from({ length: 13 }).map((_, i) => ({ id: `h${i+1}`, suit: 'hearts', rank: i+1, faceUp: true })) }, { id: 'f1', type: 'foundation', cards: Array.from({ length: 13 }).map((_, i) => ({ id: `d${i+1}`, suit: 'diamonds', rank: i+1, faceUp: true })) }, { id: 'f2', type: 'foundation', cards: Array.from({ length: 13 }).map((_, i) => ({ id: `s${i+1}`, suit: 'spades', rank: i+1, faceUp: true })) }, { id: 'f3', type: 'foundation', cards: Array.from({ length: 13 }).map((_, i) => ({ id: `c${i+1}`, suit: 'clubs', rank: i+1, faceUp: true })) } ],
        score: 200,
        streak: 0,
        streakMultiplier: 1,
        redealsLeft: 0,
        timeRemainingSec: 30,
        moveHistory: [],
        undoStack: [],
        stats: { moves: 0, foundationMoves: 0, tableauReveals: 0, columnsEmptied: 2 },
      } as any,
      achievements: {},
    }))

    useStore.getState().completeRound()
    const ach = useStore.getState().achievements
    expect(ach['clear_boss']).toBe(true)
    expect(ach['boss_perfect']).toBe(true)
  })
})


