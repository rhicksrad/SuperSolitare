// The shop between rounds: 2 jokers, 1 god card, 2 packs. Deterministic from
// the run RNG. Rerolls reroll jokers + god; packs are fixed per visit.

import { buildDeck, rollEnhancement } from './cards'
import type { Card, EnhancementId } from './cards'
import { allGodIds, godRegistry } from './gods'
import { jokerRegistry, jokersByRarity } from './jokers'
import { Rng } from './rng'
import type { JokerDef, Rarity, RunState } from './types'

export interface JokerOffer {
  kind: 'joker'
  slot: number
  jokerId: string
  price: number
  sold?: boolean
}

export interface GodOffer {
  kind: 'god'
  slot: number
  godId: string
  price: number
  sold?: boolean
}

export type PackType = 'card' | 'god' | 'joker'

export interface PackOffer {
  kind: 'pack'
  slot: number
  packType: PackType
  price: number
  sold?: boolean
}

export type ShopOffer = JokerOffer | GodOffer | PackOffer

export const PACK_META: Record<PackType, { name: string; description: string; price: number }> = {
  card: { name: 'Card Pack', description: 'Enhance 1 of 3 cards from your deck', price: 4 },
  god: { name: 'Pantheon Pack', description: 'Choose 1 of 3 god cards', price: 4 },
  joker: { name: 'Joker Pack', description: 'Choose 1 of 3 jokers', price: 6 },
}

export const REROLL_BASE = 4

export function rerollCost(rerolls: number): number {
  return REROLL_BASE + rerolls
}

function rollRarity(rng: Rng): Rarity {
  const r = rng.next()
  if (r < 0.6) return 'common'
  if (r < 0.88) return 'uncommon'
  if (r < 0.98) return 'rare'
  return 'legendary'
}

function rollJoker(rng: Rng, exclude: Set<string>): JokerDef | null {
  for (let attempt = 0; attempt < 20; attempt++) {
    const pool = jokersByRarity(rollRarity(rng)).filter((d) => !exclude.has(d.id))
    if (pool.length > 0) return rng.pick(pool)
  }
  const rest = Object.values(jokerRegistry).filter((d) => !exclude.has(d.id))
  return rest.length ? rng.pick(rest) : null
}

/** Jokers the player already owns are excluded from offers */
export function generateShop(run: RunState, rerolls: number): { run: RunState; offers: ShopOffer[] } {
  const rng = new Rng(`${run.seed}::shop-${run.ante}-${run.blindIndex}-${rerolls}`)
  const owned = new Set(run.jokers.map((j) => j.id))
  const offers: ShopOffer[] = []

  for (let s = 0; s < 2; s++) {
    const def = rollJoker(rng, owned)
    if (def) {
      owned.add(def.id)
      offers.push({ kind: 'joker', slot: s, jokerId: def.id, price: def.cost })
    }
  }

  const godId = rng.pick(allGodIds)
  offers.push({ kind: 'god', slot: 2, godId, price: godRegistry[godId].cost })

  // Packs: stable across rerolls (seeded without reroll count)
  const packRng = new Rng(`${run.seed}::packs-${run.ante}-${run.blindIndex}`)
  const packTypes: PackType[] = ['card', 'god', 'joker']
  const first = packRng.pick(packTypes)
  const second = packRng.pick(packTypes.filter((t) => t !== first))
  offers.push({ kind: 'pack', slot: 3, packType: first, price: PACK_META[first].price })
  offers.push({ kind: 'pack', slot: 4, packType: second, price: PACK_META[second].price })

  return { run, offers }
}

// ---------------------------------------------------------------------------
// Pack contents (rolled when opened, from the run RNG so it's deterministic)

export interface CardPackChoice {
  card: Card
  enhancement: EnhancementId
}

export function openCardPack(run: RunState): { run: RunState; choices: CardPackChoice[] } {
  const rng = new Rng(run.rng)
  const deck = buildDeck()
  const pool = rng.shuffle(deck)
  const choices: CardPackChoice[] = []
  for (const card of pool) {
    if (choices.length >= 3) break
    choices.push({ card, enhancement: rollEnhancement(rng) })
  }
  return { run: { ...run, rng: rng.state }, choices }
}

export function openGodPack(run: RunState): { run: RunState; choices: string[] } {
  const rng = new Rng(run.rng)
  const choices = rng.shuffle(allGodIds).slice(0, 3)
  return { run: { ...run, rng: rng.state }, choices }
}

export function openJokerPack(run: RunState): { run: RunState; choices: string[] } {
  const rng = new Rng(run.rng)
  const owned = new Set(run.jokers.map((j) => j.id))
  const choices: string[] = []
  const exclude = new Set(owned)
  for (let i = 0; i < 3; i++) {
    const def = rollJoker(rng, exclude)
    if (!def) break
    exclude.add(def.id)
    choices.push(def.id)
  }
  return { run: { ...run, rng: rng.state }, choices }
}
