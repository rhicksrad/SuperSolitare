import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../src/state/store'
import { roundConfig } from '../src/game/run'

describe('Stock dealing behavior', () => {
  beforeEach(() => {
    useStore.setState((s) => ({
      ...s,
      run: {
        seed: 'stock-behavior',
        ante: 1,
        coins: 0,
        jokers: [],
        modifiers: [],
        stats: {},
        history: [],
        rng: { seed: 'stock-behavior', value: 0 },
        godCards: [],
        scoreRanks: { foundation_move: 1, reveal_face_down: 1, empty_column: 1 },
      } as any,
      currentRound: null,
      selected: null,
      lastMessage: null,
    }))
  })

  it('one deal action moves exactly dealSize cards from stock to waste', () => {
    const cfg = roundConfig(1)
    const round = {
      config: cfg,
      piles: [
        { id: 'stock', type: 'stock', cards: Array.from({ length: 10 }).map((_, i) => ({ id: `s${i}`, suit: 'clubs', rank: 10, faceUp: false })) },
        { id: 'waste', type: 'waste', cards: [] },
        { id: 't0', type: 'tableau', cards: [] },
        { id: 'f0', type: 'foundation', cards: [] },
      ],
      score: 0,
      streak: 0,
      streakMultiplier: 1,
      redealsLeft: cfg.redeals,
      timeRemainingSec: cfg.timeLimitSec,
      moveHistory: [],
      undoStack: [],
    } as any
    useStore.setState((s) => ({ ...s, currentRound: round }))

    const beforeStock = (useStore.getState().currentRound as any).piles.find((p: any) => p.id === 'stock').cards.length
    const beforeWaste = (useStore.getState().currentRound as any).piles.find((p: any) => p.id === 'waste').cards.length
    expect(beforeWaste).toBe(0)
    useStore.getState().dealStock()
    const afterStock = (useStore.getState().currentRound as any).piles.find((p: any) => p.id === 'stock').cards.length
    const afterWaste = (useStore.getState().currentRound as any).piles.find((p: any) => p.id === 'waste').cards.length
    // Exactly dealSize (3) moved
    expect(beforeStock - afterStock).toBe(cfg.dealSize)
    expect(afterWaste - beforeWaste).toBe(cfg.dealSize)
    // No auto-deal beyond one group
    expect((useStore.getState().currentRound as any).wasteGroupRemaining).toBe(cfg.dealSize)
  })
})


