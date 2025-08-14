import type { Joker, JokerRarity, JokerHookContext, RoundConfig } from './types'

export const RARITIES: JokerRarity[] = ['common', 'uncommon', 'rare', 'legendary']

export const jokerRegistry: Record<string, Joker> = {}

export function registerJoker(joker: Joker) {
  jokerRegistry[joker.id] = joker
}

export function applyRoundStartJokerHooks(jokers: Joker[], ctx: JokerHookContext, config: RoundConfig): RoundConfig {
  let next = { ...config }
  for (const j of jokers) {
    const delta = j.applyHooks?.onRoundStart?.(ctx, next)
    if (delta) next = { ...next, ...delta }
  }
  return next
}

// Variant helpers
export function variantMultiplier(variant?: 'foil' | 'holo'): number {
  if (variant === 'foil') return 1.25
  if (variant === 'holo') return 1.5
  return 1
}

// Built-ins (10 sample jokers baseline)
registerJoker({
  id: 'early-bird',
  name: 'Early Bird',
  rarity: 'common',
  description: '+15% score if round finished with >30s left.',
  applyHooks: {
    onRoundEnd: (summary) => {
      if (summary.timeRemainingSec > 30) return Math.round(summary.score * 0.15)
    },
  },
})

registerJoker({
  id: 'streak-freak',
  name: 'Streak Freak',
  rarity: 'uncommon',
  description: 'Foundation-streak multiplier +0.1 per streak step.',
  applyHooks: {
    onMove: (_move, delta, _ctx, extras) => {
      if (extras?.foundationMove && typeof extras.streakStep === 'number') {
        const mult = 1 + 0.1 * Math.max(0, extras.streakStep)
        return delta * mult
      }
    },
  },
})

registerJoker({
  id: 'deep-cut',
  name: 'Deep Cut',
  rarity: 'uncommon',
  description: '+1 redeal.',
  applyHooks: {
    onRoundStart: (_ctx, current) => ({ redeals: current.redeals + 1 }),
  },
})

registerJoker({
  id: 'monochrome',
  name: 'Monochrome',
  rarity: 'rare',
  description: 'Black cards moved to foundations give +20% points this round.',
  applyHooks: {
    onMove: (_move, delta, _ctx, extras) => {
      if (extras?.foundationMove && extras.movedCard && (extras.movedCard.suit === 'spades' || extras.movedCard.suit === 'clubs')) {
        return delta * 1.2
      }
    },
  },
})

registerJoker({
  id: 'royal-decree',
  name: 'Royal Decree',
  rarity: 'rare',
  description: 'Kings can move onto Queens of same color once per round.',
  applyHooks: {
    // Implemented via legality override in solitaire (consumes charge once)
  },
})

registerJoker({
  id: 'perfect-draw',
  name: 'Perfect Draw',
  rarity: 'legendary',
  description: 'First deal each round reveals an extra card in each tableau pile.',
  applyHooks: {
    onRoundStart: () => ({})
  },
})

registerJoker({
  id: 'archivist',
  name: 'Archivist',
  rarity: 'common',
  description: '+5% score per hidden card you reveal this round.',
  applyHooks: {
    onRoundEnd: (summary) => {
      const reveals = summary.reveals || 0
      if (reveals <= 0) return 0
      const mult = 1 + Math.min(0.05 * reveals, 2) // cap at +200% to avoid extremes
      return Math.round(summary.score * (mult - 1))
    },
  },
})

registerJoker({
  id: 'snap',
  name: 'Snap',
  rarity: 'uncommon',
  description: 'When you empty a column, next foundation move scores double (once).',
  // Placeholder: no-op until state tracking is added
})

registerJoker({
  id: 'waste-not',
  name: 'Waste Not',
  rarity: 'common',
  description: '+10 points per card remaining in stock at round end.',
  applyHooks: {
    onRoundEnd: (summary) => {
      return (summary.stockLeft || 0) * 10
    },
  },
})

registerJoker({
  id: 'cascade',
  name: 'Cascade',
  rarity: 'rare',
  description: 'Moving a run of ≥4 cards to a new tableau grants +80.',
  applyHooks: {
    onMove: (_move, delta, _ctx, extras) => {
      if (_move.kind === 'tableau_to_tableau' && (extras?.movedRunCount ?? 0) >= 4) {
        return delta + 80
      }
    },
  },
})

// Additional effects (tempo, ace pilot) — simple hooks for now
registerJoker({
  id: 'tempo',
  name: 'Tempo',
  rarity: 'uncommon',
  description: 'Every 15s without dealing stock grants +50.',
  applyHooks: {
    onRoundEnd: (summary) => {
      // If you avoided dealing this round and still had time ticking, award small bonus per 15s remaining
      if (summary.dealtThisRound) return 0
      return Math.floor((summary.timeRemainingSec || 0) / 15) * 50
    },
  },
})

registerJoker({
  id: 'ace-pilot',
  name: 'Ace Pilot',
  rarity: 'uncommon',
  description: 'Aces to foundation grant +120 (instead of +50).',
  applyHooks: {
    onMove: (_move, delta, _ctx, extras) => {
      if (extras?.foundationMove && extras.movedCard?.rank === 1) {
        // Replace foundation component from 50 base to 120; approximate by adding +70 over computed delta
        return delta + 70
      }
    },
  },
})

// Column Marshal: after emptying 2 columns in a round, redeal count +1.
registerJoker({
  id: 'column-marshal',
  name: 'Column Marshal',
  rarity: 'rare',
  description: 'After emptying 2 columns in a round, redeal count +1.',
  applyHooks: {
    onMove: (_move, delta) => {
      void delta
      // When columnsEmptied reaches 2 (tracked in solitaire), grant +1 redeal once
      // Implemented in solitaire when detecting columnsEmptied increments
    },
    onRoundStart: (_ctx, current) => ({ ...current }),
  },
})

// Overtime: Time limit increases by 30s; final score ×1.15 if you use all time.
registerJoker({
  id: 'overtime',
  name: 'Overtime',
  rarity: 'legendary',
  description: 'Time limit increases by 30s; final score ×1.15 if you use all time.',
  applyHooks: {
    onRoundStart: (_ctx, current) => ({ timeLimitSec: current.timeLimitSec + 30 }),
    onRoundEnd: (summary) => {
      if (summary.timeRemainingSec <= 0) {
        return Math.round(summary.score * 0.15)
      }
    },
  },
})

// Tactician: One illegal move per round is forgiven (no penalty)
registerJoker({
  id: 'tactician',
  name: 'Tactician',
  rarity: 'rare',
  description: 'One illegal move per round is forgiven (no penalty).',
})

// TODO(game/PHASE3): Implement onMove/onRoundStart/onRoundEnd effects for these jokers


