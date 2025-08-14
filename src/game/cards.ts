import type { Suit, Card } from './types'

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
export const RANKS: number[] = Array.from({ length: 13 }, (_, i) => i + 1) // 1..13

export function buildCardId(suit: Suit, rank: number, index: number): string {
  return `${suit}-${rank}-${index}`
}

export function createCard(suit: Suit, rank: number, faceUp = false, index = 0): Card {
  return { id: buildCardId(suit, rank, index), suit, rank, faceUp }
}

export function buildStandardDeck(): Card[] {
  const cards: Card[] = []
  let idx = 0
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push(createCard(suit, rank, false, idx++))
    }
  }
  return cards
}

export function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds'
}

export function isBlack(suit: Suit): boolean {
  return suit === 'spades' || suit === 'clubs'
}

export function canStackTableau(upper: Card, lower: Card): boolean {
  // upper goes onto lower in tableau: must be rank one less, and opposite color
  if (!upper.faceUp || !lower.faceUp) return false
  const colorOpposite = (isRed(upper.suit) && isBlack(lower.suit)) || (isBlack(upper.suit) && isRed(lower.suit))
  return colorOpposite && upper.rank === lower.rank - 1
}

export function canPlaceOnFoundation(card: Card, foundationTop: Card | undefined): boolean {
  if (!card.faceUp) return false
  if (!foundationTop) return card.rank === 1 // Ace starts foundation
  return card.suit === foundationTop.suit && card.rank === foundationTop.rank + 1
}

// TODO(game/PHASE1): rank labels, accessibility symbols


