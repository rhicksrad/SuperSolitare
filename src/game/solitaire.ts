import type { Card, Move, Pile, RoundConfig, RoundState, Joker, BossModifier } from './types'
import { canPlaceOnFoundation, canStackTableau } from './cards'
import { roundConfig } from './run'
import { computeMoveScore } from './scoring'
import { applyBossBeforeMove, applyBossOnScore, applyBossAfterMove } from './bosses'

// Phase 1 will implement complete logic; for Phase 0 we stub interfaces.

export function getPile(state: RoundState, id: string): Pile | undefined {
  return state.piles.find((p) => p.id === id)
}

function clonePiles(piles: Pile[]): Pile[] {
  return piles.map((p) => ({ ...p, cards: p.cards.map((c) => ({ ...c })) }))
}

export function isLegalMove(state: RoundState, move: Move): { ok: true } | { ok: false; reason: string } {
  const from = move.fromPileId ? getPile(state, move.fromPileId) : undefined
  const to = move.toPileId ? getPile(state, move.toPileId) : undefined
  // Quick guard: must reference piles for moves that require them
  if ((move.kind === 'tableau_to_tableau' || move.kind === 'tableau_to_foundation' || move.kind === 'waste_to_tableau' || move.kind === 'waste_to_foundation') && (!from || !to)) {
    return { ok: false, reason: 'missing_pile' }
  }

  switch (move.kind) {
    case 'tableau_to_tableau': {
      if (!from || !to) return { ok: false, reason: 'missing_pile' }
      if (from.type !== 'tableau' || to.type !== 'tableau') return { ok: false, reason: 'wrong_pile_type' }
      if (from.cards.length === 0) return { ok: false, reason: 'empty_from' }
      const count = move.count ?? 1
      if (count <= 0) return { ok: false, reason: 'invalid_count' }
      if (from.cards.length < count) return { ok: false, reason: 'not_enough_cards' }
      const moving = from.cards.slice(from.cards.length - count)
      if (!moving.every((c) => c.faceUp)) return { ok: false, reason: 'face_down_in_run' }
      // Run must be descending alternating colors
      for (let i = 0; i < moving.length - 1; i++) {
        const lower = moving[i] // lower in the run (closer to destination)
        const upper = moving[i + 1] // above card
        // In-run ordering: upper must stack onto lower
        const alt = canStackTableau(upper, { ...lower, faceUp: true })
        if (!alt) return { ok: false, reason: 'run_sequence_invalid' }
      }
      // Destination empty requires a King on bottom of moving run
      const destTop = to.cards[to.cards.length - 1]
      if (!destTop) {
        const bottom = moving[0]
        if (bottom.rank !== 13) return { ok: false, reason: 'need_king_on_empty' }
        return { ok: true }
      }
      let can = canStackTableau(moving[0], destTop)
      // Royal Decree: allow King onto Queen of same color once per round
      if (!can && (state as any).royalDecreeCharge && moving[0].rank === 13 && destTop.rank === 12) {
        const sameColor = ((moving[0].suit === 'hearts' || moving[0].suit === 'diamonds') && (destTop.suit === 'hearts' || destTop.suit === 'diamonds')) || ((moving[0].suit === 'spades' || moving[0].suit === 'clubs') && (destTop.suit === 'spades' || destTop.suit === 'clubs'))
        if (sameColor) can = true
      }
      return can ? { ok: true } : { ok: false, reason: 'cannot_stack' }
    }
    case 'tableau_to_foundation': {
      if (!from || !to) return { ok: false, reason: 'missing_pile' }
      if (from.type !== 'tableau' || to.type !== 'foundation') return { ok: false, reason: 'wrong_pile_type' }
      const top = from.cards[from.cards.length - 1]
      if (!top || !top.faceUp) return { ok: false, reason: 'no_faceup_top' }
      const fTop = to.cards[to.cards.length - 1]
      return canPlaceOnFoundation(top, fTop) ? { ok: true } : { ok: false, reason: 'bad_foundation' }
    }
    case 'waste_to_tableau': {
      if (!from || !to) return { ok: false, reason: 'missing_pile' }
      if (from.type !== 'waste' || to.type !== 'tableau') return { ok: false, reason: 'wrong_pile_type' }
      const top = from.cards[from.cards.length - 1]
      if (!top) return { ok: false, reason: 'empty_waste' }
      const destTop = to.cards[to.cards.length - 1]
      if (!destTop) return top.rank === 13 ? { ok: true } : { ok: false, reason: 'need_king_on_empty' }
      return canStackTableau(top, destTop) ? { ok: true } : { ok: false, reason: 'cannot_stack' }
    }
    case 'waste_to_foundation': {
      if (!from || !to) return { ok: false, reason: 'missing_pile' }
      if (from.type !== 'waste' || to.type !== 'foundation') return { ok: false, reason: 'wrong_pile_type' }
      const top = from.cards[from.cards.length - 1]
      if (!top) return { ok: false, reason: 'empty_waste' }
      const fTop = to.cards[to.cards.length - 1]
      return canPlaceOnFoundation(top, fTop) ? { ok: true } : { ok: false, reason: 'bad_foundation' }
    }
    case 'deal_stock': {
      const stock = getPile(state, 'stock')
      if (!stock) return { ok: false, reason: 'missing_stock' }
      if (stock.cards.length === 0 && state.redealsLeft <= 0) return { ok: false, reason: 'no_redeals' }
      return { ok: true }
    }
    case 'undo':
      return state.undoStack.length > 0 ? { ok: true } : { ok: false, reason: 'no_undo' }
  }
}

export function applyMove(state: RoundState, move: Move, options?: { jokers?: Joker[]; bosses?: BossModifier[] }): RoundState {
  const bosses = options?.bosses ?? []
  // boss pre-check
  const bossCheck = applyBossBeforeMove(bosses, move, state)
  if (!bossCheck.allowed) return state
  const legality = isLegalMove(state, move)
  if (!legality.ok) return state

  const next: RoundState = {
    ...state,
    piles: clonePiles(state.piles),
    moveHistory: state.moveHistory.concat(move),
    undoStack: state.undoStack.concat({
      piles: clonePiles(state.piles),
      score: state.score,
      streak: state.streak,
      streakMultiplier: state.streakMultiplier,
      redealsLeft: state.redealsLeft,
      timeRemainingSec: state.timeRemainingSec,
    }),
  }

  const from = move.fromPileId ? getPile(next, move.fromPileId)! : undefined
  const to = move.toPileId ? getPile(next, move.toPileId)! : undefined

  switch (move.kind) {
    case 'tableau_to_tableau': {
      const count = move.count ?? 1
      const moving = from!.cards.splice(from!.cards.length - count, count)
      // If we used Royal Decree legality to allow this move (K onto Q same color), consume the charge now
      if (to!.cards.length > 0) {
        const destTop = to!.cards[to!.cards.length - 1]
        const srcTop = moving[0]
        const normal = canStackTableau(srcTop, destTop)
        if (!normal && (state as any).royalDecreeCharge && srcTop.rank === 13 && destTop.rank === 12) {
          const sameColor = ((srcTop.suit === 'hearts' || srcTop.suit === 'diamonds') && (destTop.suit === 'hearts' || destTop.suit === 'diamonds')) || ((srcTop.suit === 'spades' || srcTop.suit === 'clubs') && (destTop.suit === 'spades' || destTop.suit === 'clubs'))
          if (sameColor) (next as any).royalDecreeCharge = 0
        }
      }
      to!.cards.push(...moving)
      // Flip next card if now exposed
      const newTop = from!.cards[from!.cards.length - 1]
      if (newTop && !newTop.faceUp) {
        newTop.faceUp = true
        next.stats = { ...(next.stats || { moves: 0, foundationMoves: 0, tableauReveals: 0, columnsEmptied: 0 }), moves: (next.stats?.moves || 0) + 1, tableauReveals: (next.stats?.tableauReveals || 0) + 1 }
      } else {
        next.stats = { ...(next.stats || { moves: 0, foundationMoves: 0, tableauReveals: 0, columnsEmptied: 0 }), moves: (next.stats?.moves || 0) + 1 }
      }
      // Detect column emptied
      if (from!.cards.length === 0) {
        next.stats.columnsEmptied = (next.stats.columnsEmptied || 0) + 1
        ;(next as any).snapCharges = ((next as any).snapCharges || 0) + 1
        // Column Marshal: grant +1 redeal once when reaching 2 columns emptied
        if ((next.stats.columnsEmptied || 0) === 2) {
          const hasColumnMarshal = (options?.jokers || []).some((j) => j.id === 'column-marshal')
          if (hasColumnMarshal) next.redealsLeft = next.redealsLeft + 1
        }
      }
      break
    }
    case 'tableau_to_foundation': {
      const card = from!.cards.pop() as Card
      to!.cards.push(card)
      const newTop = from!.cards[from!.cards.length - 1]
      if (newTop && !newTop.faceUp) {
        newTop.faceUp = true
        next.stats = { ...(next.stats || { moves: 0, foundationMoves: 0, tableauReveals: 0, columnsEmptied: 0 }), moves: (next.stats?.moves || 0) + 1, foundationMoves: (next.stats?.foundationMoves || 0) + 1, tableauReveals: (next.stats?.tableauReveals || 0) + 1 }
      } else {
        next.stats = { ...(next.stats || { moves: 0, foundationMoves: 0, tableauReveals: 0, columnsEmptied: 0 }), moves: (next.stats?.moves || 0) + 1, foundationMoves: (next.stats?.foundationMoves || 0) + 1 }
      }
      if (from!.cards.length === 0) {
        next.stats.columnsEmptied = (next.stats.columnsEmptied || 0) + 1
        ;(next as any).snapCharges = ((next as any).snapCharges || 0) + 1
      }
      ;(next as any).foundationFx = { cardId: card.id, ts: Date.now() }
      break
    }
    case 'waste_to_tableau': {
      const card = from!.cards.pop() as Card
      to!.cards.push(card)
      next.stats = { ...(next.stats || { moves: 0, foundationMoves: 0, tableauReveals: 0, columnsEmptied: 0 }), moves: (next.stats?.moves || 0) + 1 }
      ;(next as any).wasteGroupRemaining = Math.max(0, ((state as any).wasteGroupRemaining || 0) - 1)
      break
    }
    case 'waste_to_foundation': {
      const card = from!.cards.pop() as Card
      to!.cards.push(card)
      next.stats = { ...(next.stats || { moves: 0, foundationMoves: 0, tableauReveals: 0, columnsEmptied: 0 }), moves: (next.stats?.moves || 0) + 1, foundationMoves: (next.stats?.foundationMoves || 0) + 1 }
      ;(next as any).foundationFx = { cardId: card.id, ts: Date.now() }
      ;(next as any).wasteGroupRemaining = Math.max(0, ((state as any).wasteGroupRemaining || 0) - 1)
      break
    }
    case 'deal_stock': {
      const stock = getPile(next, 'stock')!
      const waste = getPile(next, 'waste')!
      if (stock.cards.length === 0) {
        // redeal: recycle waste into stock face-down
        if (next.redealsLeft > 0) {
          const recycled = waste.cards.reverse().map((c) => ({ ...c, faceUp: false }))
          stock.cards = recycled
          waste.cards = []
          next.redealsLeft -= 1
          ;(next as any).wasteGroupRemaining = 0
        }
      } else {
        // deal config.dealSize to waste, turning face-up
        const dealCount = Math.min(next.config.dealSize, stock.cards.length)
        const dealt = stock.cards.splice(stock.cards.length - dealCount, dealCount).map((c) => ({ ...c, faceUp: true }))
        waste.cards.push(...dealt)
        // Perfect Draw: on first deal of the round, flip top card of each tableau
        if ((state as any).perfectDraw && !(state as any).perfectDrawDone) {
          for (const p of next.piles) {
            if (p.type === 'tableau' && p.cards.length > 0) p.cards[p.cards.length - 1].faceUp = true
          }
          ;(next as any).perfectDrawDone = true
        }
        ;(next as any).wasteGroupRemaining = dealCount
      }
      next.stats = { ...(next.stats || { moves: 0, foundationMoves: 0, tableauReveals: 0, columnsEmptied: 0 }), moves: (next.stats?.moves || 0) + 1 }
      ;(next as any)._dealtThisRound = true
      break
    }
    case 'undo': {
      const prev = next.undoStack.pop()!
      next.piles = clonePiles(prev.piles)
      next.score = prev.score
      next.streak = prev.streak
      next.streakMultiplier = prev.streakMultiplier
      next.redealsLeft = prev.redealsLeft
      next.timeRemainingSec = prev.timeRemainingSec
      next.moveHistory = state.moveHistory.slice(0, -1)
      ;(next as any).wasteGroupRemaining = Math.min(3, (getPile(next, 'waste')?.cards.length || 0))
      break
    }
  }
  // scoring after state mutation
  const result = computeMoveScore(state, next, move, { jokers: options?.jokers })
  // Snap joker: double next foundation move after an empty column
  let deltaAfterJokers = result.delta
  const isFoundationMove = move.kind === 'tableau_to_foundation' || move.kind === 'waste_to_foundation'
  const hasSnap = (options?.jokers || []).some((j) => j.id === 'snap')
  if (hasSnap && isFoundationMove && ((state as any).snapCharges || 0) > 0) {
    deltaAfterJokers = Math.round(deltaAfterJokers * 2)
    ;(next as any).snapCharges = Math.max(0, ((state as any).snapCharges || 0) - 1)
  }
  // bosses post-score
  const deltaWithBoss = applyBossOnScore(bosses, deltaAfterJokers, next, move, {
    foundationMove: move.kind === 'tableau_to_foundation' || move.kind === 'waste_to_foundation',
    movedCard: (move.toPileId ? getPile(next, move.toPileId) : undefined)?.cards.slice(-1)[0],
    revealCount: result.breakdown.reveal > 0 ? 1 : 0,
    movedRunCount: move.kind === 'tableau_to_tableau' ? (move.count ?? 1) : 1,
    streakStep: result.nextStreak,
  }, result.breakdown)
  next.score = state.score + deltaWithBoss
  if (result.nextStreak > state.streak) {
    ;(next as any).streakFx = { ts: Date.now() }
  }
  next.streak = result.nextStreak
  next.streakMultiplier = result.nextMultiplier
  // bosses post-move side-effects
  const effected = applyBossAfterMove(bosses, state, next, move)
  return effected
}

import { initialKlondikeDeal } from './deck'

export function createInitialRound(seed: string, ante: number): RoundState {
  const config: RoundConfig = roundConfig(ante)
  return initialKlondikeDeal(seed, config).state
}



