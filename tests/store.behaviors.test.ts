import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../src/state/store'
import { jokerRegistry } from '../src/game/jokers'
import { roundConfig } from '../src/game/run'

describe('Store behaviors: Tactician and stock/waste gating', () => {
  beforeEach(() => {
    // Reset relevant parts of the store between tests
    useStore.setState((s) => ({
      ...s,
      run: null,
      currentRound: null,
      selected: null,
      lastMessage: null,
      currentBosses: [],
    }))
  })

  it('Tactician forgives one illegal move per round', () => {
    const tact = jokerRegistry['tactician']!
    const run = {
      seed: 'tactician-seed',
      ante: 1,
      coins: 0,
      jokers: [tact],
      modifiers: [],
      stats: {},
      history: [],
      rng: { seed: 'tactician-seed', value: 0 },
      godCards: [],
      scoreRanks: { foundation_move: 1, reveal_face_down: 1, empty_column: 1 },
    } as any
    const cfg = roundConfig(1)
    const round = {
      config: cfg,
      piles: [
        { id: 't0', type: 'tableau', cards: [{ id: 'c1', suit: 'hearts', rank: 5, faceUp: true }] },
        { id: 'f0', type: 'foundation', cards: [] },
        { id: 'stock', type: 'stock', cards: [] },
        { id: 'waste', type: 'waste', cards: [] },
      ],
      score: 0,
      streak: 0,
      streakMultiplier: 1,
      redealsLeft: cfg.redeals,
      timeRemainingSec: cfg.timeLimitSec,
      moveHistory: [],
      undoStack: [],
    } as any

    useStore.setState((s) => ({ ...s, run, currentRound: round, selected: { fromPileId: 't0', count: 1 } }))
    useStore.getState().tryMoveToPile('f0')

    const st = useStore.getState() as any
    expect(st.currentRound.tacticianForgiveUsed).toBe(true)
    expect(st.selected).toBe(null)
    expect(st.lastMessage?.type).toBe('info')
    // Move should not have been applied; tableau still has the card
    const t0 = st.currentRound.piles.find((p: any) => p.id === 't0')
    const f0 = st.currentRound.piles.find((p: any) => p.id === 'f0')
    expect(t0.cards.length).toBe(1)
    expect(f0.cards.length).toBe(0)
  })

  it('Allows dealing stock repeatedly regardless of waste contents', () => {
    const cfg = roundConfig(1)
    const round = {
      config: cfg,
      piles: [
        { id: 'stock', type: 'stock', cards: Array.from({ length: 10 }).map((_, i) => ({ id: `s${i}`, suit: 'clubs', rank: 10, faceUp: false })) },
        { id: 'waste', type: 'waste', cards: [{ id: 'w0', suit: 'spades', rank: 7, faceUp: true }] },
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
      // Simulate that a group was just dealt and not fully consumed yet
      wasteGroupRemaining: 2,
    } as any
    const run = {
      seed: 'gating-seed',
      ante: 1,
      coins: 0,
      jokers: [],
      modifiers: [],
      stats: {},
      history: [],
      rng: { seed: 'gating-seed', value: 0 },
      godCards: [],
      scoreRanks: { foundation_move: 1, reveal_face_down: 1, empty_column: 1 },
    } as any

    useStore.setState((s) => ({ ...s, run, currentRound: round }))
    const before = (useStore.getState().currentRound as any).piles.find((p: any) => p.id === 'stock').cards.length
    useStore.getState().dealStock()
    const after = (useStore.getState().currentRound as any).piles.find((p: any) => p.id === 'stock').cards.length
    expect(after).toBeLessThan(before)
    expect((useStore.getState().currentRound as any).wasteGroupRemaining).toBeGreaterThan(0)

    // Dealing again should continue to reduce stock
    useStore.getState().dealStock()
    const afterSecond = (useStore.getState().currentRound as any).piles.find((p: any) => p.id === 'stock').cards.length
    expect(afterSecond).toBeLessThan(after)
  })
})


