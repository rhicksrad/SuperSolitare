// Pure Klondike rules: dealing, legality, and move application.
// No scoring here — applyMove returns *events* that the scoring layer consumes.

import type { Card } from './cards'
import { isRed } from './cards'
import type { Rng } from './rng'

export type TableauId = 't0' | 't1' | 't2' | 't3' | 't4' | 't5' | 't6'
export type FoundationId = 'f0' | 'f1' | 'f2' | 'f3'
export type PileId = TableauId | FoundationId | 'stock' | 'waste'

export interface RoundRules {
  dealSize: number // cards flipped per stock deal (classic 3)
  recycles: number // waste -> stock refills allowed
  discards: number // top-of-waste burns allowed
  /** Boss/joker flag: tableau stacking ignores color */
  anyColorStacking?: boolean
  /** how many waste cards are shown face-up (boss: the-fog shows 1) */
  wasteVisible?: number
}

export type BlindKind = 'small' | 'big' | 'boss'

export interface RoundState {
  rules: RoundRules
  blind: BlindKind
  bossId: string | null
  target: number
  score: number
  /** consecutive foundation plays; broken by stock deals & recycles */
  streak: number
  recyclesLeft: number
  discardsLeft: number
  tableau: Card[][] // 7 columns
  foundations: Card[][] // 4 piles, built A -> K by suit
  stock: Card[]
  waste: Card[]
  burned: Card[] // discarded-from-waste cards, out of play this round
  stats: {
    foundationPlays: number
    reveals: number
    emptiedColumns: number
    stockDeals: number
  }
  /** one-shot ×2-mult charges from consumables/jokers */
  boostCharges: number
  /** card ids cursed for this round (0 chips, −2 mult) — see boss: the-hex */
  curses: string[]
  finished: boolean
}

export type Move =
  | { kind: 'deal_stock' }
  | { kind: 'recycle' }
  | { kind: 'discard_waste' }
  | { kind: 'tableau_to_tableau'; from: TableauId; index: number; to: TableauId }
  | { kind: 'tableau_to_foundation'; from: TableauId; to: FoundationId }
  | { kind: 'waste_to_tableau'; to: TableauId }
  | { kind: 'waste_to_foundation'; to: FoundationId }

export type MoveEvent =
  | { type: 'foundation_play'; card: Card; fromWaste: boolean }
  | { type: 'reveal'; card: Card }
  | { type: 'empty_column'; column: number }
  | { type: 'stock_deal' }
  | { type: 'recycle' }
  | { type: 'discard'; card: Card }
  | { type: 'board_clear' }

export function tableauIndex(id: TableauId): number {
  return Number(id[1])
}

export function foundationIndex(id: FoundationId): number {
  return Number(id[1])
}

// ---------------------------------------------------------------------------

export function dealRound(
  rng: Rng,
  deck: Card[],
  opts: { rules: RoundRules; blind: BlindKind; bossId: string | null; target: number },
): RoundState {
  const cards = rng.shuffle(deck).map((c) => ({ ...c, faceUp: false }))
  const tableau: Card[][] = Array.from({ length: 7 }, () => [])
  let i = 0
  for (let col = 0; col < 7; col++) {
    for (let n = 0; n <= col; n++) tableau[col].push(cards[i++])
    tableau[col][tableau[col].length - 1].faceUp = true
  }
  const stock = cards.slice(i)
  return {
    rules: opts.rules,
    blind: opts.blind,
    bossId: opts.bossId,
    target: opts.target,
    score: 0,
    streak: 0,
    recyclesLeft: opts.rules.recycles,
    discardsLeft: opts.rules.discards,
    tableau,
    foundations: [[], [], [], []],
    stock,
    waste: [],
    burned: [],
    stats: { foundationPlays: 0, reveals: 0, emptiedColumns: 0, stockDeals: 0 },
    boostCharges: 0,
    curses: [],
    finished: false,
  }
}

// ---------------------------------------------------------------------------
// Legality

function canStackOnTableau(moving: Card, target: Card | undefined, rules: RoundRules): boolean {
  if (!target) return moving.rank === 13 // only kings on empty columns
  if (!target.faceUp) return false
  if (target.rank !== moving.rank + 1) return false
  if (rules.anyColorStacking) return true
  return isRed(target.suit) !== isRed(moving.suit)
}

function canPlayToFoundation(card: Card, pile: Card[]): boolean {
  const top = pile[pile.length - 1]
  if (!top) return card.rank === 1
  return top.suit === card.suit && card.rank === top.rank + 1
}

/** The moving stack starting at `index` must already be a valid descending run of face-up cards */
function isMovableRun(cards: Card[], index: number, rules: RoundRules): boolean {
  if (index < 0 || index >= cards.length) return false
  if (!cards[index].faceUp) return false
  for (let i = index; i < cards.length - 1; i++) {
    const upper = cards[i]
    const lower = cards[i + 1]
    if (lower.rank !== upper.rank - 1) return false
    if (!rules.anyColorStacking && isRed(lower.suit) === isRed(upper.suit)) return false
  }
  return true
}

export type Legality = { ok: true } | { ok: false; reason: string }

export function isLegalMove(state: RoundState, move: Move): Legality {
  if (state.finished) return { ok: false, reason: 'Round is over' }
  switch (move.kind) {
    case 'deal_stock': {
      if (state.stock.length === 0) return { ok: false, reason: 'Stock is empty' }
      return { ok: true }
    }
    case 'recycle': {
      if (state.stock.length > 0) return { ok: false, reason: 'Stock is not empty' }
      if (state.waste.length === 0) return { ok: false, reason: 'Nothing to recycle' }
      if (state.recyclesLeft <= 0) return { ok: false, reason: 'No recycles left' }
      return { ok: true }
    }
    case 'discard_waste': {
      if (state.waste.length === 0) return { ok: false, reason: 'Waste is empty' }
      if (state.discardsLeft <= 0) return { ok: false, reason: 'No discards left' }
      return { ok: true }
    }
    case 'tableau_to_tableau': {
      const from = state.tableau[tableauIndex(move.from)]
      const to = state.tableau[tableauIndex(move.to)]
      if (move.from === move.to) return { ok: false, reason: 'Same column' }
      if (!isMovableRun(from, move.index, state.rules)) return { ok: false, reason: 'Not a movable stack' }
      if (!canStackOnTableau(from[move.index], to[to.length - 1], state.rules))
        return { ok: false, reason: to.length === 0 ? 'Only kings on empty columns' : 'Must descend, alternating colors' }
      return { ok: true }
    }
    case 'tableau_to_foundation': {
      const from = state.tableau[tableauIndex(move.from)]
      const card = from[from.length - 1]
      if (!card || !card.faceUp) return { ok: false, reason: 'No card to play' }
      if (!canPlayToFoundation(card, state.foundations[foundationIndex(move.to)]))
        return { ok: false, reason: 'Foundations build A→K by suit' }
      return { ok: true }
    }
    case 'waste_to_tableau': {
      const card = state.waste[state.waste.length - 1]
      if (!card) return { ok: false, reason: 'Waste is empty' }
      const to = state.tableau[tableauIndex(move.to)]
      if (!canStackOnTableau(card, to[to.length - 1], state.rules))
        return { ok: false, reason: to.length === 0 ? 'Only kings on empty columns' : 'Must descend, alternating colors' }
      return { ok: true }
    }
    case 'waste_to_foundation': {
      const card = state.waste[state.waste.length - 1]
      if (!card) return { ok: false, reason: 'Waste is empty' }
      if (!canPlayToFoundation(card, state.foundations[foundationIndex(move.to)]))
        return { ok: false, reason: 'Foundations build A→K by suit' }
      return { ok: true }
    }
  }
}

// ---------------------------------------------------------------------------
// Application (pure — returns a new state plus events)

export interface ApplyResult {
  state: RoundState
  events: MoveEvent[]
}

function cloneState(s: RoundState): RoundState {
  return {
    ...s,
    rules: { ...s.rules },
    tableau: s.tableau.map((col) => col.map((c) => ({ ...c }))),
    foundations: s.foundations.map((p) => p.map((c) => ({ ...c }))),
    stock: s.stock.map((c) => ({ ...c })),
    waste: s.waste.map((c) => ({ ...c })),
    burned: s.burned.map((c) => ({ ...c })),
    stats: { ...s.stats },
    curses: [...s.curses],
  }
}

/** Flip the newly exposed top of a tableau column; returns reveal event if flipped */
function flipTop(state: RoundState, col: number, events: MoveEvent[]) {
  const pile = state.tableau[col]
  const top = pile[pile.length - 1]
  if (top && !top.faceUp) {
    top.faceUp = true
    state.stats.reveals++
    events.push({ type: 'reveal', card: { ...top } })
  }
}

function checkEmptied(state: RoundState, col: number, hadCards: boolean, events: MoveEvent[]) {
  if (hadCards && state.tableau[col].length === 0) {
    state.stats.emptiedColumns++
    events.push({ type: 'empty_column', column: col })
  }
}

function checkBoardClear(state: RoundState, events: MoveEvent[]) {
  const total = state.foundations.reduce((n, p) => n + p.length, 0)
  if (total + state.burned.length === 52) {
    events.push({ type: 'board_clear' })
    state.finished = true
  }
}

export function applyMove(prev: RoundState, move: Move): ApplyResult {
  const legal = isLegalMove(prev, move)
  if (!legal.ok) throw new Error(`Illegal move: ${legal.reason}`)
  const state = cloneState(prev)
  const events: MoveEvent[] = []

  switch (move.kind) {
    case 'deal_stock': {
      const n = Math.min(state.rules.dealSize, state.stock.length)
      for (let i = 0; i < n; i++) {
        const card = state.stock.pop()!
        card.faceUp = true
        state.waste.push(card)
      }
      state.stats.stockDeals++
      state.streak = 0
      events.push({ type: 'stock_deal' })
      break
    }
    case 'recycle': {
      state.stock = state.waste
        .slice()
        .reverse()
        .map((c) => ({ ...c, faceUp: false }))
      state.waste = []
      state.recyclesLeft--
      state.streak = 0
      events.push({ type: 'recycle' })
      break
    }
    case 'discard_waste': {
      const card = state.waste.pop()!
      state.burned.push(card)
      state.discardsLeft--
      events.push({ type: 'discard', card: { ...card } })
      checkBoardClear(state, events)
      break
    }
    case 'tableau_to_tableau': {
      const fromCol = tableauIndex(move.from)
      const toCol = tableauIndex(move.to)
      const from = state.tableau[fromCol]
      const moving = from.splice(move.index)
      state.tableau[toCol].push(...moving)
      flipTop(state, fromCol, events)
      checkEmptied(state, fromCol, true, events)
      break
    }
    case 'tableau_to_foundation': {
      const fromCol = tableauIndex(move.from)
      const card = state.tableau[fromCol].pop()!
      state.foundations[foundationIndex(move.to)].push(card)
      state.stats.foundationPlays++
      events.push({ type: 'foundation_play', card: { ...card }, fromWaste: false })
      flipTop(state, fromCol, events)
      checkEmptied(state, fromCol, true, events)
      checkBoardClear(state, events)
      break
    }
    case 'waste_to_tableau': {
      const card = state.waste.pop()!
      state.tableau[tableauIndex(move.to)].push(card)
      break
    }
    case 'waste_to_foundation': {
      const card = state.waste.pop()!
      state.foundations[foundationIndex(move.to)].push(card)
      state.stats.foundationPlays++
      events.push({ type: 'foundation_play', card: { ...card }, fromWaste: true })
      checkBoardClear(state, events)
      break
    }
  }

  return { state, events }
}

// ---------------------------------------------------------------------------
// Helpers for hints / auto-play / stuck detection

/** Find the foundation a card could be played onto right now, if any */
export function foundationFor(state: RoundState, card: Card): FoundationId | null {
  for (let f = 0; f < 4; f++) {
    if (canPlayToFoundation(card, state.foundations[f])) return `f${f}` as FoundationId
  }
  return null
}

/** Any legal move that changes the board (used to warn the player they're stuck) */
export function hasAnyUsefulMove(state: RoundState): boolean {
  if (state.stock.length > 0) return true
  if (state.waste.length > 0 && (state.recyclesLeft > 0 || state.discardsLeft > 0)) return true
  const wasteTop = state.waste[state.waste.length - 1]
  if (wasteTop) {
    if (foundationFor(state, wasteTop)) return true
    for (let t = 0; t < 7; t++) {
      if (canStackOnTableau(wasteTop, state.tableau[t][state.tableau[t].length - 1], state.rules)) return true
    }
  }
  for (let t = 0; t < 7; t++) {
    const col = state.tableau[t]
    const top = col[col.length - 1]
    if (top?.faceUp && foundationFor(state, top)) return true
    for (let i = 0; i < col.length; i++) {
      if (!col[i].faceUp) continue
      if (!isMovableRun(col, i, state.rules)) continue
      for (let u = 0; u < 7; u++) {
        if (u === t) continue
        // Moving a full face-up run to another pile is only useful if it flips
        // a card, empties a column meaningfully, or repositions a partial run.
        if (canStackOnTableau(col[i], state.tableau[u][state.tableau[u].length - 1], state.rules)) {
          const flipsCard = i > 0 && !col[i - 1].faceUp
          const partial = i > 0 && col[i - 1].faceUp
          const emptiesForReuse = i === 0 && col[i].rank !== 13
          if (flipsCard || partial || emptiesForReuse) return true
        }
      }
    }
  }
  return false
}
