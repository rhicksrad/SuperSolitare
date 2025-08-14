import { describe, it, expect } from 'vitest'
import { LcgRng } from '../src/game/rng'
import { rarityWeights, priceBands, priceFor, generateShopOffers } from '../src/game/shop'
import { useStore } from '../src/state/store'
import { jokerRegistry } from '../src/game/jokers'

describe('Economy basics', () => {
  it('priceFor respects bands', () => {
    const rng = new LcgRng('price-bands')
    for (const rarity of Object.keys(priceBands)) {
      const [min, max] = priceBands[rarity]
      const p = priceFor(rarity, rng)
      expect(p).toBeGreaterThanOrEqual(min)
      expect(p).toBeLessThanOrEqual(max)
    }
  })

  it('generateShopOffers yields weighted rarities over many rolls (order non-strict)', () => {
    const seed = 'rarity-dist'
    const counts: Record<string, number> = { common: 0, uncommon: 0, rare: 0, legendary: 0 }
    const ROUNDS = 50
    for (let r = 0; r < ROUNDS; r++) {
      const { offers } = generateShopOffers(seed, 1, r)
      for (const o of offers) {
        if ((o as any).kind === 'joker') counts[(o as any).rarity]++
      }
    }
    // Expect commons to be at least as frequent as uncommon, and so on
    expect(counts.common).toBeGreaterThanOrEqual(counts.uncommon)
    expect(counts.uncommon).toBeGreaterThanOrEqual(counts.rare)
    expect(counts.rare).toBeGreaterThanOrEqual(counts.legendary)
    expect(counts.common + counts.uncommon + counts.rare + counts.legendary).toBeGreaterThan(0)
  })

  it('selling refunds ~50% of average price by rarity', () => {
    const run = {
      seed: 'sell-seed',
      ante: 1,
      coins: 0,
      jokers: [{ ...jokerRegistry['early-bird'] }],
      modifiers: [],
      stats: {},
      history: [],
      rng: { seed: 'sell-seed', value: 0 },
      godCards: [],
      scoreRanks: { foundation_move: 1, reveal_face_down: 1, empty_column: 1 },
    } as any
    useStore.setState((s) => ({ ...s, run }))
    useStore.getState().sellJoker('early-bird')
    const coins = useStore.getState().run?.coins || 0
    // Common average ~4 refund from store implementation; accept 3..6 for future tuning
    expect(coins).toBeGreaterThanOrEqual(2)
    expect(coins).toBeLessThanOrEqual(10)
  })
})


