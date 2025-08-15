import type { RoundConfig, RunState, RoundState, BossModifier, RoundOutcome, BlindType } from './types'
import { computeRunBonus } from './scoring'
import { initialKlondikeDeal } from './deck'
import { applyBossRoundStart, bossRegistry } from './bosses'

export const ROUNDS = [1, 2, 3, 4, 5, 6, 7, 8]

export function roundConfig(ante: number, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): RoundConfig {
  // Discrete tuning per round for better curve feel (1→8)
  const targets = [0, 500, 650, 800, 1000, 1200, 1450, 1700, 2000]
  const times =   [0, 120, 120, 130, 140, 140, 150, 150, 160]
  // Make the game last longer by a factor
  const GAME_DURATION_FACTOR = 3
  let targetScore = targets[Math.min(Math.max(ante, 1), 8)]
  // Difficulty scaling
  const diffScale = difficulty === 'easy' ? 0.85 : difficulty === 'hard' ? 1.35 : 1
  targetScore = Math.round(targetScore * diffScale)
  const timeLimitSec = times[Math.min(Math.max(ante, 1), 8)] * GAME_DURATION_FACTOR
  const redeals = 2
  const dealSize = 3
  return { targetScore, timeLimitSec, redeals, dealSize }
}

export function createInitialRun(seed: string): RunState {
  return {
    seed,
    ante: 1,
    coins: 0,
    jokers: [],
    modifiers: [],
    stats: {},
    history: [],
    rng: { seed, value: 0 },
    godCards: [],
    scoreRanks: { foundation_move: 1, reveal_face_down: 1, empty_column: 1 },
  }
}

export function createRound(seed: string, ante: number, blind: BlindType, activeBosses: BossModifier[] = [], difficulty: 'easy' | 'medium' | 'hard' = 'medium'): RoundState {
  let config = roundConfig(ante, difficulty)
  if (blind === 'big') {
    config = { ...config, targetScore: Math.round(config.targetScore * 1.25) }
  }
  const bossesForDifficulty = blind === 'boss' ? scaleBossesForDifficulty(activeBosses, difficulty) : []
  if (blind === 'boss' && bossesForDifficulty.length) {
    config = applyBossRoundStart(bossesForDifficulty, config)
  }
  const { state } = initialKlondikeDeal(seed, config)
  // Adjust timer per blind (slightly tighter for big/boss)
  if (blind === 'big') state.timeRemainingSec = Math.max(30, Math.round(state.timeRemainingSec * 0.95))
  if (blind === 'boss') state.timeRemainingSec = Math.max(30, Math.round(state.timeRemainingSec * 0.9))
  return state
}

export function evaluateRound(state: RoundState, blind: BlindType): RoundOutcome {
  const success = state.score >= state.config.targetScore
  const baseCoins = success ? Math.round(state.score / 100) : Math.round(state.score / 200)
  const bonus = success ? computeRunBonus(state) : 0
  const perfectClear = state.piles.filter((p) => p.type === 'foundation').reduce((n, p) => n + p.cards.length, 0) === 52
  const coinsFromBonus = Math.round(bonus / 50) // convert bonus points to coins modestly
  const perfectCoins = perfectClear ? 5 : 0
  // Ensure minimum coin floor so players can buy at least one pack per board
  const minByBlind: Record<BlindType, number> = { small: 8, big: 10, boss: 12 }
  const preliminary = baseCoins + coinsFromBonus + perfectCoins
  const coinsEarned = success ? Math.max(preliminary, minByBlind[blind]) : preliminary
  const summary = {
    blind,
    success,
    score: state.score,
    target: state.config.targetScore,
    coinsEarned,
    runBonus: bonus,
    coinsBreakdown: { base: baseCoins, bonus: coinsFromBonus + perfectCoins },
    perfectClear,
  }
  // Apply jokers onRoundEnd for additional scoring adjustments if defined
  // Note: currently run.jokers reside in UI state; onRoundEnd can be applied in store when composing outcome.
  return summary
}

// TODO(game/PHASE5): timers, 3-board flow per ante (small/big/boss), boss selection and application, rewards and progression

export function getBossesForRound(_seed: string, _ante: number): BossModifier[] {
  // Deterministic selection variety based on ante parity
  const bag = [
    'night-mode',
    'red-alert',
    'stoic-stock',
    'thin-waste',
    'glacial-start',
    'frozen-royals',
    'suit-tax-spades',
    'half-deck',
    'mirror-moves',
  ]
  const idx = Math.abs((_ante * 2654435761) >>> 0) % bag.length
  const id = bag[idx]
  return [bossRegistry[id]].filter(Boolean) as BossModifier[]
}

// Apply difficulty scaling to boss effects
export function scaleBossesForDifficulty(mods: BossModifier[], difficulty: 'easy' | 'medium' | 'hard'): BossModifier[] {
  if (difficulty === 'medium') return mods
  const scaled: BossModifier[] = []
  for (const m of mods) {
    if (m.id === 'red-alert') {
      const factor = difficulty === 'easy' ? 0.9 : 0.7
      scaled.push({
        ...m,
        hooks: {
          ...m.hooks,
          onScore: (delta, state, move, extras, breakdown) => {
            if (extras?.movedCard && (extras.movedCard.suit === 'hearts' || extras.movedCard.suit === 'diamonds')) {
              return delta * factor
            }
            return m.hooks?.onScore?.(delta, state, move, extras!, breakdown!) ?? delta
          },
        },
      })
      continue
    }
    if (m.id === 'stoic-stock') {
      const penalty = difficulty === 'easy' ? -15 : -40
      scaled.push({
        ...m,
        hooks: {
          ...m.hooks,
          onScore: (delta, state, move, extras, breakdown) => {
            if (move.kind === 'deal_stock') return delta + penalty
            return m.hooks?.onScore?.(delta, state, move, extras!, breakdown!) ?? delta
          },
        },
      })
      continue
    }
    if (m.id === 'night-mode') {
      const tsMult = difficulty === 'easy' ? 1.05 : 1.2
      const scoreMult = difficulty === 'easy' ? 1.05 : 1.15
      scaled.push({
        ...m,
        hooks: {
          ...m.hooks,
          onRoundStart: (config) => ({ ...config, targetScore: Math.round(config.targetScore * tsMult) }),
          onScore: (delta) => Math.round(delta * scoreMult),
        },
      })
      continue
    }
    // Default: pass-through for mods without scaling rules
    scaled.push(m)
  }
  return scaled
}


