// Card model. The run owns one canonical 52-card deck; every round re-deals
// the same cards, so per-card enhancements persist for the whole run.

import type { Rng } from './rng'

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'

export const SUITS: readonly Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

export const SUIT_GLYPH: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

export function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds'
}

export interface Card {
  /** Stable across the whole run, e.g. "H-12" — enhancements key off this */
  id: string
  suit: Suit
  rank: number // 1 (ace) .. 13 (king)
  faceUp: boolean
}

export const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export function isFace(rank: number): boolean {
  return rank >= 11
}

/** Chip value of a card when played to a foundation (Balatro-style values) */
export function cardChips(rank: number): number {
  if (rank === 1) return 11
  if (rank >= 11) return 10
  return rank
}

export function buildDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ id: `${suit[0].toUpperCase()}-${rank}`, suit, rank, faceUp: false })
    }
  }
  return deck
}

export function shuffledDeck(rng: Rng): Card[] {
  return rng.shuffle(buildDeck())
}

// ---------------------------------------------------------------------------
// Enhancements — permanent upgrades attached to specific deck cards.

export type EnhancementId = 'gilded' | 'ruby' | 'sapphire' | 'lucky'

export interface EnhancementDef {
  id: EnhancementId
  name: string
  description: string
  weight: number // relative frequency in card packs
}

export const ENHANCEMENTS: Record<EnhancementId, EnhancementDef> = {
  gilded: {
    id: 'gilded',
    name: 'Gilded',
    description: '+30 chips when played to a foundation',
    weight: 4,
  },
  ruby: {
    id: 'ruby',
    name: 'Ruby',
    description: '+2 mult when played to a foundation',
    weight: 3,
  },
  sapphire: {
    id: 'sapphire',
    name: 'Sapphire',
    description: '×1.5 mult when played to a foundation',
    weight: 1,
  },
  lucky: {
    id: 'lucky',
    name: 'Lucky',
    description: '1 in 3 chance of +$3 when played to a foundation',
    weight: 2,
  },
}

/** cardId -> enhancement; lives on the RunState */
export type EnhancementMap = Record<string, EnhancementId>

export function rollEnhancement(rng: Rng): EnhancementId {
  const defs = Object.values(ENHANCEMENTS)
  const total = defs.reduce((n, d) => n + d.weight, 0)
  let roll = rng.next() * total
  for (const d of defs) {
    roll -= d.weight
    if (roll <= 0) return d.id
  }
  return defs[defs.length - 1].id
}
