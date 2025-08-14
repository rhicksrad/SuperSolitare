import type { Move, RoundState, Joker, JokerHookContext, MoveExtras, ScoreRanks } from './types'
import { variantMultiplier } from './jokers'

export const BASE_POINTS = {
  moveToFoundation: 50,
  revealFaceDown: 30,
  emptyColumn: 200,
}

export interface DiminishingConfig {
  foundationThreshold: number // start diminishing after this many foundation moves
  foundationDecay: number // multiplicative decay per extra move (e.g., 0.9)
}

export const DEFAULT_DIMINISHING: DiminishingConfig = {
  foundationThreshold: 16,
  foundationDecay: 0.92,
}

export function foundationStreakMultiplier(step: number): number {
  // Base 1.2^step; step is count of consecutive foundation moves already completed
  return Math.pow(1.2, Math.max(0, step))
}

function countFoundationMoves(history: Move[]): number {
  return history.reduce((n, m) => (m.kind === 'tableau_to_foundation' || m.kind === 'waste_to_foundation' ? n + 1 : n), 0)
}

export function diminishingFactorForFoundationMove(
  prevFoundationMoves: number,
  config: DiminishingConfig = DEFAULT_DIMINISHING,
): number {
  if (prevFoundationMoves < config.foundationThreshold) return 1
  const excess = prevFoundationMoves - config.foundationThreshold + 1
  return Math.pow(config.foundationDecay, excess)
}

// Helper for HUD: returns 0..1 factor and a boolean if diminishing is active
export function getDiminishingStatus(round: RoundState, config: DiminishingConfig = DEFAULT_DIMINISHING) {
  const prevFoundationMoves = round.moveHistory.reduce((n, m) => (m.kind === 'tableau_to_foundation' || m.kind === 'waste_to_foundation' ? n + 1 : n), 0)
  const factor = diminishingFactorForFoundationMove(prevFoundationMoves, config)
  const active = prevFoundationMoves >= config.foundationThreshold
  const progress = Math.min(1, prevFoundationMoves / config.foundationThreshold)
  return { factor, active, prevFoundationMoves, threshold: config.foundationThreshold, progress }
}

export interface MoveScoreBreakdown {
  foundation: number
  reveal: number
  emptyColumn: number
}

export interface MoveScoreResult {
  delta: number
  breakdown: MoveScoreBreakdown
  nextStreak: number
  nextMultiplier: number
}

export function computeMoveScore(
  prev: RoundState,
  next: RoundState,
  move: Move,
  options?: { jokers?: Joker[]; ctx?: JokerHookContext; diminishing?: DiminishingConfig },
): MoveScoreResult {
  const jokers = options?.jokers ?? []
  const ctx = options?.ctx ?? { ante: 1, seed: 'dev' }
  const dimCfg = options?.diminishing ?? DEFAULT_DIMINISHING

  const fromId = move.fromPileId
  const toId = move.toPileId
  const prevFrom = fromId ? prev.piles.find((p) => p.id === fromId) : undefined
  const nextFrom = fromId ? next.piles.find((p) => p.id === fromId) : undefined
  const to = toId ? next.piles.find((p) => p.id === toId) : undefined

  const isFoundationMove = move.kind === 'tableau_to_foundation' || move.kind === 'waste_to_foundation'

  // Foundation component
  const foundationPrevCount = countFoundationMoves(prev.moveHistory)
  const diminish = isFoundationMove ? diminishingFactorForFoundationMove(foundationPrevCount, dimCfg) : 1
  // Score ranks (rank 1 baseline), applied multiplicatively per category
  const ranks: ScoreRanks = (next as any).scoreRanks || (prev as any).scoreRanks || { foundation_move: 1, reveal_face_down: 1, empty_column: 1 }
  const foundationBase = isFoundationMove ? BASE_POINTS.moveToFoundation * prev.streakMultiplier * diminish * (ranks.foundation_move || 1) : 0

  // Reveal component: flipping newly exposed top card in tableau
  let reveal = 0
  if (prevFrom && nextFrom && prevFrom.type === 'tableau') {
    const prevTop = prevFrom.cards[prevFrom.cards.length - 1]
    const nextTop = nextFrom.cards[nextFrom.cards.length - 1]
    if (nextTop && (!prevTop || (prevTop && !prevTop.faceUp)) && nextTop.faceUp) {
      reveal += BASE_POINTS.revealFaceDown * (ranks.reveal_face_down || 1)
    }
  }

  // Empty column bonus
  let emptyColumn = 0
  if (prevFrom && nextFrom && prevFrom.type === 'tableau' && nextFrom.cards.length === 0 && prevFrom.cards.length > 0) {
    emptyColumn += BASE_POINTS.emptyColumn * (ranks.empty_column || 1)
  }

  let delta = Math.round(foundationBase + reveal + emptyColumn)

  // Apply jokers onMove in order
  const extras: MoveExtras = {
    foundationMove: isFoundationMove,
    movedCard: to?.cards[to.cards.length - 1],
    revealCount: reveal > 0 ? 1 : 0,
    movedRunCount: move.kind === 'tableau_to_tableau' ? (move.count ?? 1) : 1,
    streakStep: isFoundationMove ? prev.streak + 1 : 0,
  }

  for (const j of jokers) {
    const modified = j.applyHooks?.onMove?.(move, delta, ctx, extras)
    if (typeof modified === 'number' && Number.isFinite(modified)) {
      delta = Math.round(modified * variantMultiplier(j.variant))
    }
  }

  // Next streak/multiplier
  let nextStreak = prev.streak
  let nextMultiplier = prev.streakMultiplier
  if (isFoundationMove) {
    nextStreak = prev.streak + 1
    nextMultiplier = prev.streakMultiplier * 1.2
  } else if (move.kind === 'deal_stock' || !isFoundationMove) {
    // reset on any non-foundation move (including deal)
    nextStreak = 0
    nextMultiplier = 1
  }

  return { delta, breakdown: { foundation: Math.round(foundationBase), reveal, emptyColumn }, nextStreak, nextMultiplier }
}

// Run-end bonus based on % of deck to foundations and time left
export function computeRunBonus(round: import('./types').RoundState): number {
  const totalFoundations = round.piles.filter((p) => p.type === 'foundation').reduce((n, p) => n + p.cards.length, 0)
  const foundationPct = Math.min(1, totalFoundations / 52)
  const timePct = Math.min(1, round.timeRemainingSec / round.config.timeLimitSec)
  // Weight evenly; scale to a modest bonus band
  const score = (foundationPct * 0.6 + timePct * 0.4) * 300
  return Math.round(score)
}


