import { describe, it, expect } from 'vitest'
import { generateShopOffers } from '../src/game/shop'

describe('Shop generation', () => {
  it('is deterministic per seed/round/rollIndex', () => {
    const a = generateShopOffers('seed-x', 1, 0).offers
    const b = generateShopOffers('seed-x', 1, 0).offers
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
  it('respects locked offers', () => {
    const first = generateShopOffers('seed-y', 1, 0).offers
    const locked = first.slice(0, 1).map((o) => ({ ...o, locked: true })) as any
    const second = generateShopOffers('seed-y', 1, 1, locked).offers
    expect(second[0].id).toBe(locked[0].id)
  })
})


