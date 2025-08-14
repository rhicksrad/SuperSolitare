import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../src/state/store'

describe('Shop behaviors: reroll cost and lock persistence', () => {
  beforeEach(() => {
    useStore.setState((s) => ({
      ...s,
      run: {
        seed: 'shop-seed',
        ante: 1,
        coins: 20,
        jokers: [],
        modifiers: [],
        stats: {},
        history: [],
        rng: { seed: 'shop-seed', value: 0 },
        godCards: [],
        scoreRanks: { foundation_move: 1, reveal_face_down: 1, empty_column: 1 },
      } as any,
      shopOffers: [],
      shopRolls: 0,
      shopOpen: true,
    }))
  })

  it('first reroll is free; subsequent rerolls cost 3 coins; locks persist', () => {
    // initialize shop
    ;(useStore.getState() as any).initShop?.()
    let st = useStore.getState()
    const initialCoins = st.run!.coins
    expect(st.shopOffers.length).toBeGreaterThan(0)
    // lock first offer
    const firstId = st.shopOffers[0].id
    st.toggleLockOffer(firstId)
    // first reroll: free
    st.rerollShop()
    st = useStore.getState()
    expect(st.run!.coins).toBe(initialCoins)
    // locked offer should remain present
    expect(st.shopOffers.some((o) => o.id === firstId)).toBe(true)
    // second reroll: costs 3
    st.rerollShop()
    st = useStore.getState()
    expect(st.run!.coins).toBe(initialCoins - 3)
  })
})


