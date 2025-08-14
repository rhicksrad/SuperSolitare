// Core shared types (pure, UI-agnostic)

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'

export interface Card {
  id: string
  suit: Suit
  rank: number // 1..13
  faceUp: boolean
}

export type PileType = 'tableau' | 'foundation' | 'stock' | 'waste'

export interface Pile {
  id: string
  type: PileType
  cards: Card[]
}

export interface Move {
  kind:
    | 'tableau_to_tableau'
    | 'tableau_to_foundation'
    | 'waste_to_tableau'
    | 'waste_to_foundation'
    | 'deal_stock'
    | 'undo'
  fromPileId?: string
  toPileId?: string
  count?: number
}

export interface JokerHookContext {
  // Deterministic run context (no UI refs)
  ante: number
  seed: string
}

export type JokerRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface MoveExtras {
  foundationMove: boolean
  movedCard?: Card
  revealCount: number
  movedRunCount: number
  streakStep?: number
}

// Scoring categories
export type ScoreCategory = 'foundation_move' | 'reveal_face_down' | 'empty_column'

export type ScoreRanks = Record<ScoreCategory, number>

// One-shot usable cards (Tarot-like), called God Cards
export interface GodCard {
  id: string
  name: string
  description: string
  effect: 'time_plus' | 'redeal_plus' | 'double_next' | 'reveal_tops' | 'rank_up_foundation' | 'rank_up_reveal' | 'rank_up_empty'
}

export interface Joker {
  id: string
  name: string
  rarity: JokerRarity
  description: string
  variant?: 'foil' | 'holo'
  applyHooks?: {
    onRoundStart?: (ctx: JokerHookContext, current: RoundConfig) => Partial<RoundConfig> | void
    onMove?: (move: Move, deltaScore: number, ctx: JokerHookContext, extras?: MoveExtras) => number | void
    onRoundEnd?: (summary: RoundSummary, ctx: JokerHookContext) => number | void
  }
}

export interface BossModifier {
  id: string
  name: string
  description: string
  hooks?: {
    onRoundStart?: (config: RoundConfig) => RoundConfig
    onBeforeMove?: (move: Move, state: RoundState) => { allowed: boolean; reason?: string } | void
    onScore?: (
      scoreDelta: number,
      state: RoundState,
      move: Move,
      extras: MoveExtras,
      breakdown: MoveScoreBreakdown,
    ) => number | void
    onAfterMove?: (prev: RoundState, next: RoundState, move: Move) => RoundState | void
  }
}

export interface RoundConfig {
  targetScore: number
  timeLimitSec: number
  redeals: number
  dealSize: number
}

export interface RoundStats {
  moves: number
  foundationMoves: number
  tableauReveals: number
  columnsEmptied: number
}

export interface RoundSummary {
  score: number
  timeRemainingSec: number
  foundationCount: number
  // Optional convenience fields for end-of-round hooks
  stockLeft?: number
  reveals?: number
  dealtThisRound?: boolean
}

export interface RNGState {
  seed: string
  value: number
}

export interface RunState {
  seed: string
  ante: number
  coins: number
  jokers: Joker[]
  modifiers: BossModifier[]
  stats: Record<string, number>
  history: Array<{ ante: number; score: number }>
  rng: RNGState
  mode?: 'standard' | 'daily'
  difficulty?: 'easy' | 'medium' | 'hard'
  godCards: GodCard[]
  scoreRanks: ScoreRanks
  scoreRankPatrons?: {
    foundation_move?: { godId: string; name: string; title: string }
    reveal_face_down?: { godId: string; name: string; title: string }
    empty_column?: { godId: string; name: string; title: string }
  }
}

export type BlindType = 'small' | 'big' | 'boss'

export interface RoundOutcome {
  blind: BlindType
  success: boolean
  score: number
  target: number
  coinsEarned: number
  runBonus?: number
  coinsBreakdown?: { base: number; bonus: number }
  perfectClear?: boolean
}

export interface RoundState {
  config: RoundConfig
  piles: Pile[]
  score: number
  streak: number
  streakMultiplier: number
  redealsLeft: number
  timeRemainingSec: number
  moveHistory: Move[]
  undoStack: Array<{
    piles: Pile[]
    score: number
    streak: number
    streakMultiplier: number
    redealsLeft: number
    timeRemainingSec: number
  }>
  stats?: RoundStats
}

export interface MoveScoreBreakdown {
  foundation: number
  reveal: number
  emptyColumn: number
}

// TODO(game/PHASE1): Flesh out exact card/pile behaviors and legality helpers


