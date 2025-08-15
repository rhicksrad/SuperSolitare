import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../src/state/store'
import { generateShopOffers } from '../src/game/shop'

describe('Shop specials', () => {
  beforeEach(() => {
    useStore.setState((s) => ({
      ...s,
      run: {
        seed: 'specials-seed',
        ante: 1,
        coins: 999,
        jokers: [],
        modifiers: [],
        stats: {},
        history: [],
        rng: { seed: 'specials-seed', value: 0 },
        godCards: [],
        scoreRanks: { foundation_move: 1, reveal_face_down: 1, empty_column: 1 },
      } as any,
      currentRound: {
        config: { targetScore: 500, timeLimitSec: 120, redeals: 2, dealSize: 3 },
        piles: [], score: 0, streak: 0, streakMultiplier: 1, redealsLeft: 2, timeRemainingSec: 120, moveHistory: [], undoStack: [],
      } as any,
      shopOffers: [], shopRolls: 2, shopOpen: true,
    }))
  })

  it('applies Free Reroll special by resetting reroll fee', () => {
    useStore.setState((s) => ({ ...s, shopOffers: [{ id: 's', kind: 'special', specialId: 'special-free-reroll', name: 'Free Reroll', description: '', price: 4, locked: true } as any] }))
    useStore.getState().buyOffer('s')
    const st = useStore.getState()
    expect(st.shopRolls).toBe(0)
  })

  it('applies +1 redeal, +30s, -15% target, adds Zephyr god, and random rank up', () => {
    const specials = [
      { id: 'sp1', kind: 'special', specialId: 'special-redeal-plus', name: '+1 Redeal Now', description: '', price: 7 },
      { id: 'sp2', kind: 'special', specialId: 'special-time-30', name: '+30s Timer', description: '', price: 8 },
      { id: 'sp3', kind: 'special', specialId: 'special-target-15', name: 'Target -15%', description: '', price: 10 },
      { id: 'sp4', kind: 'special', specialId: 'special-god-zephyr', name: 'God: Zephyr', description: '', price: 9 },
      { id: 'sp5', kind: 'special', specialId: 'special-rankup-random', name: 'Rank Up', description: '', price: 7 },
    ] as any
    useStore.setState((s) => ({ ...s, shopOffers: specials }))
    const before = useStore.getState().currentRound!
    // Redeal
    useStore.getState().buyOffer('sp1')
    expect(useStore.getState().currentRound!.redealsLeft).toBe(before.redealsLeft + 1)
    // Time +30
    const t1 = useStore.getState().currentRound!.timeRemainingSec
    useStore.getState().buyOffer('sp2')
    expect(useStore.getState().currentRound!.timeRemainingSec).toBe(t1 + 30)
    // Target -15%
    const targetBefore = useStore.getState().currentRound!.config.targetScore
    useStore.getState().buyOffer('sp3')
    expect(useStore.getState().currentRound!.config.targetScore).toBeLessThan(targetBefore)
    // Zephyr
    useStore.getState().buyOffer('sp4')
    expect((useStore.getState().run as any).godCards.some((g: any) => g.id === 'zephyr')).toBe(true)
    // Rank up
    const ranksBefore = { ...(useStore.getState().run as any).scoreRanks }
    useStore.getState().buyOffer('sp5')
    const ranksAfter = (useStore.getState().run as any).scoreRanks
    const changed = ['foundation_move','reveal_face_down','empty_column'].some((k) => (ranksAfter as any)[k] > (ranksBefore as any)[k])
    expect(changed).toBe(true)
  })
})


