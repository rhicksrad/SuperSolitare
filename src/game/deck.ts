import { buildStandardDeck } from './cards'
import type { Card, Pile, RoundConfig, RoundState } from './types'
import { LcgRng } from './rng'

export function shuffle(deck: Card[], rng: LcgRng): Card[] {
  const arr = deck.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function buildShuffledDeck(seed: string): { deck: Card[]; rng: LcgRng } {
  const rng = new LcgRng(seed)
  const deck = shuffle(buildStandardDeck(), rng)
  return { deck, rng }
}

export function initialKlondikeDeal(seed: string, config: RoundConfig): { state: RoundState; rng: LcgRng } {
  const { deck, rng } = buildShuffledDeck(seed)
  const tableau: Pile[] = Array.from({ length: 7 }, (_, p) => ({ id: `t${p}`, type: 'tableau', cards: [] }))
  const foundations: Pile[] = Array.from({ length: 4 }, (_, f) => ({ id: `f${f}`, type: 'foundation', cards: [] }))
  const stock: Pile = { id: 'stock', type: 'stock', cards: [] }
  const waste: Pile = { id: 'waste', type: 'waste', cards: [] }

  // Deal tableau with increasing hidden cards, top card face-up
  let idx = 0
  for (let col = 0; col < 7; col++) {
    for (let n = 0; n <= col; n++) {
      const isTop = n === col
      const card = { ...deck[idx++], faceUp: isTop }
      tableau[col].cards.push(card)
    }
  }

  // Remaining go to stock face-down
  const rest = deck.slice(idx).map((c) => ({ ...c, faceUp: false }))
  stock.cards = rest

  const piles: Pile[] = [...tableau, ...foundations, stock, waste]

  const state: RoundState = {
    config,
    piles,
    score: 0,
    streak: 0,
    streakMultiplier: 1,
    redealsLeft: config.redeals,
    timeRemainingSec: config.timeLimitSec,
    moveHistory: [],
    undoStack: [],
  }

  return { state, rng }
}


