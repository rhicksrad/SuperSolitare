import { LcgRng } from './rng'
import { jokerRegistry } from './jokers'

export type ShopOffer =
  | { id: string; kind: 'joker'; jokerId: string; name: string; rarity: string; price: number; locked?: boolean }
  | { id: string; kind: 'boost'; boostId: 'redeal' | 'time10' | 'target10off'; name: string; description: string; price: number; locked?: boolean }
  | { id: string; kind: 'god'; godId: string; name: string; description: string; price: number; locked?: boolean }
  | { id: string; kind: 'pack'; packType: 'cards' | 'jokers' | 'gods'; name: string; description: string; size: number; price: number; locked?: boolean }
  | { id: string; kind: 'special'; specialId: string; name: string; description: string; price: number; locked?: boolean }

export const rarityWeights: Record<string, number> = { common: 60, uncommon: 28, rare: 10, legendary: 2 }
export const priceBands: Record<string, [number, number]> = { common: [3, 6], uncommon: [6, 9], rare: [10, 14], legendary: [18, 22] }

export function priceFor(rarity: string, rng: LcgRng): number {
  const [min, max] = priceBands[rarity] || [5, 9]
  return rng.int(min, max)
}

function pickJoker(excludeIds: Set<string>, rng: LcgRng) {
  const pool = Object.values(jokerRegistry).filter((j) => !excludeIds.has(j.id))
  const total = pool.reduce((sum, j) => sum + (rarityWeights[j.rarity] || 1), 0)
  let roll = rng.float() * total
  for (const j of pool) {
    roll -= (rarityWeights[j.rarity] || 1)
    if (roll <= 0) return j
  }
  return pool[pool.length - 1]
}

export function generateShopOffers(seed: string, round: number, rollIndex: number, locked: ShopOffer[] = []): { offers: ShopOffer[] } {
  const rng = new LcgRng(`${seed}-shop-${round}-${rollIndex}`)
  const chosen = new Set<string>(locked.filter((l) => (l as any).kind === 'joker').map((l: any) => (l as any).jokerId))
  const needed = Math.max(0, 3 - locked.length)
  const boosts: ShopOffer[] = [
    { boostId: 'redeal', name: '+1 Redeal', description: 'Gain +1 redeal this round', price: 6, id: 'b-redeal', kind: 'boost' },
    { boostId: 'time10', name: '+10% Time', description: 'Add +10% to round timer', price: 6, id: 'b-time', kind: 'boost' },
    { boostId: 'target10off', name: 'Target -10%', description: 'Reduce target by 10% this round', price: 8, id: 'b-target', kind: 'boost' },
  ]
  const gods: Array<{ id: string; name: string; description: string; price: number }> = [
    { id: 'zephyr', name: 'Zephyr', description: 'Reveal top card of each tableau', price: 7 },
    { id: 'chronos', name: 'Chronos', description: '+30s this round', price: 8 },
    { id: 'athena', name: 'Athena', description: 'Double next scoring move', price: 9 },
    { id: 'ares', name: 'Ares', description: 'Patron of Pillars: rank up Foundation scoring', price: 9 },
    { id: 'hermes', name: 'Hermes', description: 'Keeper of Secrets: rank up Reveal scoring', price: 9 },
    { id: 'hestia', name: 'Hestia', description: 'Warden of the Void: rank up Empty Column scoring', price: 9 },
  ]
  // Curated specials with concrete effects applied on purchase (handled in store)
  const specials: Array<{ id: string; name: string; description: string; price: number }> = [
    { id: 'special-free-reroll', name: 'Free Reroll', description: 'Reroll the shop once without the reroll fee.', price: 4 },
    { id: 'special-redeal-plus', name: '+1 Redeal Now', description: 'Gain +1 redeal immediately this round.', price: 7 },
    { id: 'special-time-30', name: '+30s Timer', description: 'Add +30 seconds to this round.', price: 8 },
    { id: 'special-target-15', name: 'Target -15%', description: 'Reduce this round\'s target by 15%.', price: 10 },
    { id: 'special-god-zephyr', name: 'God: Zephyr', description: 'Gain Zephyr god card (reveal tops).', price: 9 },
    { id: 'special-rankup-random', name: 'Rank Up', description: 'Randomly rank up one scoring category (+0.1x).', price: 7 },
  ]

  function packOffer(kind: 'cards' | 'jokers' | 'gods'): ShopOffer {
    const sizes = [3, 5]
    const size = sizes[rng.int(0, sizes.length - 1)]
    const name = kind === 'cards' ? 'Card Pack' : kind === 'jokers' ? 'Joker Pack' : 'God Pack'
    const description = kind === 'cards' ? 'A pack of playing cards to enrich the tableau' : kind === 'jokers' ? 'A bundle with a chance at higher rarities' : 'A set of god cards to rank up scoring'
    const base = kind === 'cards' ? 6 : kind === 'jokers' ? 10 : 9
    return { id: `pack-${kind}-${rollIndex}-${size}`, kind: 'pack', packType: kind, name, description, size, price: base + (size - 3) * 2 }
  }
  const fresh: ShopOffer[] = Array.from({ length: needed }).map((_, i) => {
    const roll = rng.float()
    if (roll < 0.2) {
      const b = boosts[rng.int(0, boosts.length - 1)]
      return { ...b, id: `o${rollIndex}-${i}` }
    } else if (roll < 0.35) {
      const g = gods[rng.int(0, gods.length - 1)]
      return { id: `o${rollIndex}-${i}`, kind: 'god', godId: g.id, name: g.name, description: g.description, price: g.price }
    } else if (roll < 0.6) {
      // Packs
      const kinds: Array<'cards' | 'jokers' | 'gods'> = ['cards', 'jokers', 'gods']
      const k = kinds[rng.int(0, kinds.length - 1)]
      return packOffer(k)
    }
    const j = pickJoker(chosen, rng)
    chosen.add(j.id)
    return { id: `o${rollIndex}-${i}`, kind: 'joker', jokerId: j.id, name: j.name, rarity: j.rarity, price: priceFor(j.rarity, rng) }
  })

  // Add a special (expensive, un-rerollable) — one per round; persistent across rerolls via locked array
  const specialSeed = new LcgRng(`${seed}-special-${round}`)
  const special = specials[specialSeed.int(0, specials.length - 1)]
  const specialOffer: ShopOffer = { id: `special-${round}`, kind: 'special', specialId: special.id, name: special.name, description: special.description, price: special.price, locked: true }
  // Ensure only one special in the set
  const withoutExistingSpecial = locked.filter((l) => l.kind !== 'special')
  const offers = [specialOffer, ...withoutExistingSpecial, ...fresh]
  return { offers }
}

import type { Joker } from './types'

export interface ShopItem {
  id: string
  kind: 'joker' | 'boost' | 'reroll' | 'lock'
  price: number
  payload?: Joker | { boost: string }
}

export function generateShop(seed: string): ShopItem[] {
  void seed
  // Phase 6 will implement deterministic offers by seed
  return []
}


