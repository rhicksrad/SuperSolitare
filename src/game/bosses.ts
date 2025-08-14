import type { BossModifier, Move, MoveExtras, RoundConfig, RoundState, MoveScoreBreakdown } from './types'

export const bossRegistry: Record<string, BossModifier> = {}

export function registerBoss(mod: BossModifier) {
  bossRegistry[mod.id] = mod
}

export function applyBossRoundStart(mods: BossModifier[], config: RoundConfig): RoundConfig {
  return mods.reduce((acc, m) => (m.hooks?.onRoundStart ? m.hooks.onRoundStart(acc) : acc), { ...config })
}

export function applyBossBeforeMove(mods: BossModifier[], move: Move, state: RoundState): { allowed: boolean; reason?: string } {
  for (const m of mods) {
    const res = m.hooks?.onBeforeMove?.(move, state)
    if (res && res.allowed === false) return res
  }
  return { allowed: true }
}

export function applyBossOnScore(
  mods: BossModifier[],
  scoreDelta: number,
  state: RoundState,
  move: Move,
  extras: MoveExtras,
  breakdown: MoveScoreBreakdown,
): number {
  let delta = scoreDelta
  for (const m of mods) {
    const changed = m.hooks?.onScore?.(delta, state, move, extras, breakdown)
    if (typeof changed === 'number') delta = changed
  }
  return Math.round(delta)
}

export function applyBossAfterMove(mods: BossModifier[], prev: RoundState, next: RoundState, move: Move): RoundState {
  let out = next
  for (const m of mods) {
    const res = m.hooks?.onAfterMove?.(prev, out, move)
    if (res) out = res
  }
  return out
}

// Sample boss modifiers
registerBoss({
  id: 'red-alert',
  name: 'Red Alert',
  description: 'Red cards score −20% this round.',
  hooks: {
    onScore: (delta, _state, _move, extras) => {
      if (extras.movedCard && (extras.movedCard.suit === 'hearts' || extras.movedCard.suit === 'diamonds')) {
        return delta * 0.8
      }
    },
  },
})

registerBoss({
  id: 'stoic-stock',
  name: 'Stoic Stock',
  description: 'Dealing from stock costs −25 points.',
  hooks: {
    onScore: (delta, _state, move) => {
      if (move.kind === 'deal_stock') return delta - 25
    },
  },
})

registerBoss({
  id: 'thin-waste',
  name: 'Thin Waste',
  description: 'Waste pile limited to top 1 visible card.',
  hooks: {
    onBeforeMove: (move, state) => {
      if (move.kind === 'deal_stock') {
        const waste = state.piles.find((p) => p.id === 'waste')!
        if (waste.cards.length > 0) return { allowed: false, reason: 'thin_waste_block' }
      }
    },
  },
})

registerBoss({
  id: 'night-mode',
  name: 'Night Mode',
  description: 'Desaturated visuals; +10% target score and +10% base points.',
  hooks: {
    onRoundStart: (config) => ({ ...config, targetScore: Math.round(config.targetScore * 1.1) }),
    onScore: (delta) => Math.round(delta * 1.1),
  },
})

// Glacial Start: first 10s, no foundation moves
registerBoss({
  id: 'glacial-start',
  name: 'Glacial Start',
  description: 'First 10s: cannot move to foundations.',
  hooks: {
    onBeforeMove: (move, state) => {
      if (move.kind === 'tableau_to_foundation' || move.kind === 'waste_to_foundation') {
        const elapsed = (state as any).config?.timeLimitSec ? (state as any).config.timeLimitSec - state.timeRemainingSec : 0
        if (elapsed < 10) return { allowed: false, reason: 'glacial_gate' }
      }
    },
  },
})

// Suit Tax – Spades: spade foundation scores 0
registerBoss({
  id: 'suit-tax-spades',
  name: 'Suit Tax – Spades',
  description: 'Spades moved to foundation score 0.',
  hooks: {
    onScore: (delta, _state, _move, extras, breakdown) => {
      if (!extras?.foundationMove || !extras.movedCard) return delta
      if (extras.movedCard.suit === 'spades') {
        // remove the foundation component of the score
        const foundationPoints = breakdown.foundation || 0
        return Math.max(0, delta - foundationPoints)
      }
      return delta
    },
  },
})

// Frozen Royals: first 5 moves cannot move K or Q
registerBoss({
  id: 'frozen-royals',
  name: 'Frozen Royals',
  description: 'First 5 moves cannot move Kings or Queens.',
  hooks: {
    onBeforeMove: (move, state) => {
      if (state.moveHistory.length >= 5) return
      // Determine the moving card rank
      function topOfRunRank(): number | null {
        if (!('fromPileId' in move) || !move.fromPileId) return null
        const from = state.piles.find((p) => p.id === move.fromPileId)
        if (!from) return null
        if (move.kind === 'tableau_to_tableau') {
          const count = (move as any).count ?? 1
          const idx = from.cards.length - count
          if (idx < 0 || idx >= from.cards.length) return null
          return from.cards[idx]?.rank ?? null
        }
        if (move.kind === 'tableau_to_foundation') {
          return from.cards[from.cards.length - 1]?.rank ?? null
        }
        if (move.kind === 'waste_to_foundation' || move.kind === 'waste_to_tableau') {
          const waste = state.piles.find((p) => p.id === 'waste')
          return waste?.cards[waste.cards.length - 1]?.rank ?? null
        }
        return null
      }
      const r = topOfRunRank()
      if (r === 13 || r === 12) return { allowed: false, reason: 'frozen_royals' }
    },
  },
})

// Difficulty-aware multipliers may be applied by run/createRound

// Half-Deck: stock halved at round start; target reduced slightly accordingly
registerBoss({
  id: 'half-deck',
  name: 'Half-Deck',
  description: 'Only half the stock is available this round.',
  hooks: {
    onRoundStart: (config) => ({ ...config, targetScore: Math.round(config.targetScore * 0.9) }),
    onAfterMove: (prev, next, _move) => {
      if (prev.moveHistory.length === 0) {
        const stock = next.piles.find((p) => p.id === 'stock')!
        if (stock && stock.cards.length > 0) {
          stock.cards = stock.cards.slice(Math.ceil(stock.cards.length / 2))
        }
      }
    },
  },
})

// Mirror Moves: every 5th move mirrors back unless moved to foundation
registerBoss({
  id: 'mirror-moves',
  name: 'Mirror Moves',
  description: 'Every 5th move mirrors back to the original pile unless to foundation.',
  hooks: {
    onAfterMove: (prev, next, move) => {
      const count = next.moveHistory.length
      if (count % 5 !== 0) return
      if (move.kind === 'tableau_to_foundation' || move.kind === 'waste_to_foundation') return
      // Naive mirror: attempt to undo the last move if possible
      // Directly revert using existing undo stack preserved in next
      // applyMove is not available here to avoid cycles; simulate by popping
      const last = next.undoStack.pop()
      if (last) {
        next.piles = last.piles
        next.score = last.score
        next.streak = last.streak
        next.streakMultiplier = last.streakMultiplier
        next.redealsLeft = last.redealsLeft
        next.timeRemainingSec = last.timeRemainingSec
        next.moveHistory = prev.moveHistory.slice()
      }
    },
  },
})



