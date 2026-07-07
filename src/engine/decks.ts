// Starting decks — pick one at run start; each bends the run a different way.

import type { DeckDef, StakeDef } from './types'

const defs: DeckDef[] = [
  {
    id: 'classic',
    name: 'Classic Deck',
    description: 'The standard 52. No tricks, no favors.',
  },
  {
    id: 'gilded',
    name: 'Gilded Deck',
    description: 'Start with $10 and an interest cap of $8.',
    startMoney: 10,
    interestCapBonus: 3,
  },
  {
    id: 'merchant',
    name: 'Merchant Deck',
    description: 'Shop prices are $1 lower and you start with a random voucher.',
    shopDiscount: 1,
    startVoucher: true,
  },
  {
    id: 'arcane',
    name: 'Arcane Deck',
    description: 'Start with 4 random cards already enhanced.',
    startEnhancedCards: 4,
  },
  {
    id: 'serpent',
    name: 'Serpent Deck',
    description: 'Your streak survives recycles — but targets are 10% higher.',
    serpentStreak: true,
    targetMult: 1.1,
  },
]

export const deckRegistry: Record<string, DeckDef> = Object.fromEntries(defs.map((d) => [d.id, d]))

export const allDeckIds = defs.map((d) => d.id)

export const STAKES: StakeDef[] = [
  { level: 0, name: 'White Stake', description: 'The base game.', targetMult: 1, rewardPenalty: 0 },
  { level: 1, name: 'Red Stake', description: 'Targets are 15% higher.', targetMult: 1.15, rewardPenalty: 0 },
  { level: 2, name: 'Gold Stake', description: 'Targets are 30% higher and blinds pay $1 less.', targetMult: 1.3, rewardPenalty: 1 },
]

// ---------------------------------------------------------------------------
// Unlock progression, sticker-style: `stakeWins` maps deck id -> highest stake
// level beaten with that deck. Any win with a deck unlocks the next deck;
// stakes unlock per deck — beat a deck at stake N to play it at N+1.

export function unlockedDeckIds(stakeWins: Record<string, number>): string[] {
  const out: string[] = []
  for (let i = 0; i < defs.length; i++) {
    if (i > 0 && stakeWins[defs[i - 1].id] === undefined) break
    out.push(defs[i].id)
  }
  return out
}

export function unlockedStakesFor(deckId: string, stakeWins: Record<string, number>): StakeDef[] {
  const high = stakeWins[deckId] ?? -1
  return STAKES.slice(0, Math.min(STAKES.length, high + 2))
}

/** The sticker shown on a deck: its highest beaten stake, or null if unbeaten */
export function deckSticker(deckId: string, stakeWins: Record<string, number>): StakeDef | null {
  const high = stakeWins[deckId]
  return high === undefined ? null : (STAKES[Math.min(high, STAKES.length - 1)] ?? null)
}
