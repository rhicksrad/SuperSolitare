// The shop between rounds: jokers (2, or 3 with Showcase), 1 god card, 2 packs,
// and one voucher per ante. Deterministic from the seed. Rerolls reroll jokers
// + god; packs and the voucher are stable per visit.

import { buildDeck, rollEnhancement } from './cards'
import type { Card, EnhancementId } from './cards'
import { deckRegistry } from './decks'
import { allGodIds, godRegistry } from './gods'
import { jokerRegistry, jokersByRarity } from './jokers'
import { Rng } from './rng'
import type { Edition, JokerDef, Rarity, RunState } from './types'
import { EDITION_META } from './types'
import { allVoucherIds, hasVoucher, voucherRegistry } from './vouchers'

export interface JokerOffer {
  kind: 'joker'
  slot: number
  jokerId: string
  edition?: Edition
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

export interface VoucherOffer {
  kind: 'voucher'
  slot: number
  voucherId: string
  price: number
  sold?: boolean
}

export type ShopOffer = JokerOffer | GodOffer | PackOffer | VoucherOffer

export const PACK_META: Record<PackType, { name: string; description: string; price: number }> = {
  card: { name: 'Card Pack', description: 'Enhance 1 of 3 cards from your deck', price: 4 },
  god: { name: 'Pantheon Pack', description: 'Choose 1 of 3 god cards', price: 4 },
  joker: { name: 'Joker Pack', description: 'Choose 1 of 3 jokers', price: 6 },
}

export const REROLL_BASE = 4

export function rerollCost(run: RunState, rerolls: number): number {
  const discount = hasVoucher(run.vouchers, 'grease-fingers') ? 2 : 0
  return Math.max(1, REROLL_BASE + rerolls - discount)
}

export function shopPrice(run: RunState, base: number): number {
  const discount = deckRegistry[run.deckId]?.shopDiscount ?? 0
  return Math.max(1, base - discount)
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

function rollEdition(rng: Rng, boosted: boolean): Edition | undefined {
  const mult = boosted ? 2 : 1
  const r = rng.next()
  if (r < 0.02 * mult) return 'negative'
  if (r < 0.06 * mult) return 'holo'
  if (r < 0.14 * mult) return 'foil'
  return undefined
}

/** Jokers the player already owns are excluded from offers */
export function generateShop(run: RunState, rerolls: number): { run: RunState; offers: ShopOffer[] } {
  const rng = new Rng(`${run.seed}::shop-${run.ante}-${run.blindIndex}-${rerolls}`)
  const owned = new Set(run.jokers.map((j) => j.id))
  const offers: ShopOffer[] = []
  const editionBoost = hasVoucher(run.vouchers, 'seal-of-approval')

  const jokerCount = hasVoucher(run.vouchers, 'showcase') ? 3 : 2
  for (let s = 0; s < jokerCount; s++) {
    const def = rollJoker(rng, owned)
    if (def) {
      owned.add(def.id)
      const edition = rollEdition(rng, editionBoost)
      const price = shopPrice(run, def.cost + (edition ? EDITION_META[edition].priceBump : 0))
      offers.push({ kind: 'joker', slot: s, jokerId: def.id, edition, price })
    }
  }

  const godId = rng.pick(allGodIds)
  offers.push({ kind: 'god', slot: 3, godId, price: shopPrice(run, godRegistry[godId].cost) })

  // Packs: stable across rerolls (seeded without reroll count)
  const packRng = new Rng(`${run.seed}::packs-${run.ante}-${run.blindIndex}`)
  const packTypes: PackType[] = ['card', 'god', 'joker']
  const first = packRng.pick(packTypes)
  const second = packRng.pick(packTypes.filter((t) => t !== first))
  offers.push({ kind: 'pack', slot: 4, packType: first, price: shopPrice(run, PACK_META[first].price) })
  offers.push({ kind: 'pack', slot: 5, packType: second, price: shopPrice(run, PACK_META[second].price) })

  // One voucher per ante, gone once bought
  const voucherRng = new Rng(`${run.seed}::voucher-${run.ante}`)
  const available = allVoucherIds.filter((id) => !hasVoucher(run.vouchers, id))
  if (available.length > 0) {
    const voucherId = voucherRng.pick(available)
    offers.push({ kind: 'voucher', slot: 6, voucherId, price: shopPrice(run, voucherRegistry[voucherId].cost) })
  }

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
  const size = hasVoucher(run.vouchers, 'lucky-charm') ? 4 : 3
  const pool = rng.shuffle(buildDeck())
  const choices: CardPackChoice[] = []
  for (const card of pool) {
    if (choices.length >= size) break
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
