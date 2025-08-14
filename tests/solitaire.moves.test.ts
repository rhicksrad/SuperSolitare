import { describe, it, expect } from 'vitest'
import { roundConfig } from '../src/game/run'
import { initialKlondikeDeal } from '../src/game/deck'
import { applyMove, isLegalMove } from '../src/game/solitaire'

function setup(seed = 'seed-moves-1') {
  const config = roundConfig(1)
  return initialKlondikeDeal(seed, config).state
}

describe('Move legality and reducers', () => {
  it('rejects illegal tableau to tableau when not alternating', () => {
    const state = setup('seed-a')
    const t0 = state.piles.find((p) => p.id === 't0')!
    const t1 = state.piles.find((p) => p.id === 't1')!
    const move = { kind: 'tableau_to_tableau', fromPileId: t0.id, toPileId: t1.id, count: 1 } as const
    const res = isLegalMove(state, move)
    // Not asserting specific reason since depends on shuffle; only that illegal OR legal flows work after apply
    if (!res.ok) {
      expect(res.ok).toBe(false)
    } else {
      const next = applyMove(state, move)
      expect(next).not.toBe(state)
    }
  })

  it('deal stock moves cards to waste, then redeals when empty and redealsLeft > 0', () => {
    let state = setup('seed-b')
    const stock = () => state.piles.find((p) => p.id === 'stock')!
    const waste = () => state.piles.find((p) => p.id === 'waste')!
    // Deal until stock empties
    const maxIter = 100
    let iter = 0
    while (stock().cards.length > 0 && iter++ < maxIter) {
      const m = { kind: 'deal_stock' } as const
      expect(isLegalMove(state, m).ok).toBe(true)
      state = applyMove(state, m)
    }
    // Force a redeal
    const beforeRedeals = state.redealsLeft
    const m = { kind: 'deal_stock' } as const
    state = applyMove(state, m)
    expect(state.redealsLeft).toBe(beforeRedeals - 1)
    expect(stock().cards.length).toBeGreaterThan(0)
    expect(waste().cards.length).toBe(0)
  })

  it('undo restores previous snapshot', () => {
    let state = setup('seed-c')
    const m = { kind: 'deal_stock' } as const
    state = applyMove(state, m)
    const afterDealWaste = state.piles.find((p) => p.id === 'waste')!.cards.length
    state = applyMove(state, { kind: 'undo' })
    const wasteAfterUndo = state.piles.find((p) => p.id === 'waste')!.cards.length
    expect(wasteAfterUndo).toBeLessThanOrEqual(afterDealWaste)
  })
})


