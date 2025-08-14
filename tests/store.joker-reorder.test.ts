import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../src/state/store'
import { jokerRegistry } from '../src/game/jokers'

describe('Store: reorderJoker', () => {
  beforeEach(() => {
    useStore.setState((s) => ({
      ...s,
      run: null,
      currentRound: null,
    }))
  })

  it('reorders joker by id to a given index', () => {
    const a = { ...jokerRegistry['early-bird'] }
    const b = { ...jokerRegistry['monochrome'] }
    const c = { ...jokerRegistry['deep-cut'] }
    const run = {
      seed: 'reorder-seed',
      ante: 1,
      coins: 0,
      jokers: [a, b, c],
      modifiers: [],
      stats: {},
      history: [],
      rng: { seed: 'reorder-seed', value: 0 },
      godCards: [],
      scoreRanks: { foundation_move: 1, reveal_face_down: 1, empty_column: 1 },
    } as any
    useStore.setState((s) => ({ ...s, run }))

    useStore.getState().reorderJoker?.(b.id, 0)
    const arr1 = useStore.getState().run?.jokers || []
    expect(arr1[0].id).toBe(b.id)
    expect(arr1.map((j) => j.id)).toEqual([b.id, a.id, c.id])

    // Move last to middle
    useStore.getState().reorderJoker?.(c.id, 1)
    const arr2 = useStore.getState().run?.jokers || []
    expect(arr2.map((j) => j.id)).toEqual([b.id, c.id, a.id])
  })
})


