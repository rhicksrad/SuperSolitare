import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../src/state/store'

describe('Shop purchases', () => {
  beforeEach(() => {
    useStore.setState((s) => ({
      ...s,
      run: {
        seed: 'purchase-seed',
        ante: 1,
        coins: 50,
        jokers: [],
        modifiers: [],
        stats: {},
        history: [],
        rng: { seed: 'purchase-seed', value: 0 },
        godCards: [],
        scoreRanks: { foundation_move: 1, reveal_face_down: 1, empty_column: 1 },
      } as any,
      currentRound: {
        config: { targetScore: 500, timeLimitSec: 120, redeals: 2, dealSize: 3 },
        piles: [],
        score: 0,
        streak: 0,
        streakMultiplier: 1,
        redealsLeft: 2,
        timeRemainingSec: 120,
        moveHistory: [],
        undoStack: [],
      } as any,
      shopOffers: [],
      shopOpen: true,
      lastMessage: null,
    }))
  })

  it('buys a joker: deducts coins, adds to jokers, removes offer', () => {
    useStore.setState((s) => ({
      ...s,
      shopOffers: [
        { id: 'j1', kind: 'joker', jokerId: 'early-bird', name: 'Early Bird', rarity: 'common', price: 5 },
      ] as any,
    }))
    const stBefore = useStore.getState()
    stBefore.buyOffer('j1')
    const st = useStore.getState()
    expect(st.run!.coins).toBe(45)
    expect(st.run!.jokers.some((j) => (j as any).id === 'early-bird')).toBe(true)
    expect(st.shopOffers.some((o) => o.id === 'j1')).toBe(false)
  })

  it('buys a boost: applies effect, deducts coins, removes offer', () => {
    useStore.setState((s) => ({
      ...s,
      shopOffers: [
        { id: 'b1', kind: 'boost', boostId: 'redeal', name: '+1 Redeal', description: '', price: 6 },
      ] as any,
    }))
    const before = useStore.getState().currentRound!.redealsLeft
    useStore.getState().buyOffer('b1')
    const st = useStore.getState()
    expect(st.run!.coins).toBe(44)
    expect(st.currentRound!.redealsLeft).toBe(before + 1)
    expect(st.shopOffers.some((o) => o.id === 'b1')).toBe(false)
  })

  it('buys a god: adds to inventory, deducts coins, removes offer', () => {
    useStore.setState((s) => ({
      ...s,
      shopOffers: [
        { id: 'g1', kind: 'god', godId: 'zephyr', name: 'Zephyr', description: 'Reveal tops', price: 7 },
      ] as any,
    }))
    useStore.getState().buyOffer('g1')
    const st = useStore.getState() as any
    expect(st.run.coins).toBe(43)
    expect((st.run.godCards || []).some((g: any) => g.id === 'zephyr')).toBe(true)
    expect(st.shopOffers.some((o: any) => o.id === 'g1')).toBe(false)
  })

  it('buys a pack and a special: deducts coins, removes offers', () => {
    useStore.setState((s) => ({
      ...s,
      shopOffers: [
        { id: 'p1', kind: 'pack', packType: 'cards', name: 'Card Pack', description: '', size: 3, price: 6 },
        { id: 's1', kind: 'special', specialId: 'special-1', name: 'Special #1', description: '', price: 15, locked: true },
      ] as any,
    }))
    useStore.getState().buyOffer('p1')
    useStore.getState().buyOffer('s1')
    const st = useStore.getState()
    expect(st.run!.coins).toBe(29) // 50 - 6 - 15
    expect(st.shopOffers.length).toBe(0)
  })

  it('prevents purchase when insufficient coins', () => {
    useStore.setState((s) => ({
      ...s,
      run: { ...(s.run as any), coins: 2 },
      shopOffers: [
        { id: 'exp', kind: 'boost', boostId: 'redeal', name: '+1 Redeal', description: '', price: 6 },
      ] as any,
    }))
    const beforeCoins = useStore.getState().run!.coins
    const beforeOffers = useStore.getState().shopOffers.length
    useStore.getState().buyOffer('exp')
    const st = useStore.getState()
    expect(st.run!.coins).toBe(beforeCoins)
    expect(st.shopOffers.length).toBe(beforeOffers)
  })

  it('blocks joker purchase when tray is full and sets message', () => {
    useStore.setState((s) => ({
      ...s,
      run: { ...(s.run as any), jokers: Array.from({ length: 5 }).map((_, i) => ({ id: `j${i}`, name: `J${i}`, rarity: 'common' })) },
      shopOffers: [
        { id: 'jfull', kind: 'joker', jokerId: 'early-bird', name: 'Early Bird', rarity: 'common', price: 5 },
      ] as any,
    }))
    useStore.getState().buyOffer('jfull')
    const st = useStore.getState()
    expect(st.lastMessage?.type).toBe('error')
    expect(st.shopOffers.some((o) => o.id === 'jfull')).toBe(true)
  })
})


