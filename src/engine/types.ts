// Shared run-level types. Pure data (serializable) except the def registries,
// which are looked up by id at runtime.

import type { Card, EnhancementMap } from './cards'
import type { BlindKind, Move, RoundRules, RoundState } from './klondike'
import type { RngState } from './rng'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

// ---------------------------------------------------------------------------
// Scoring levels ("god-blessed" play categories — the planet-card analog)

export type PlayCategory = 'foundation' | 'reveal' | 'empty_column'

export type Levels = Record<PlayCategory, number>

// ---------------------------------------------------------------------------
// Jokers

/** Serializable joker as held in a run; `state` holds scaling counters */
export interface JokerInstance {
  id: string
  state: Record<string, number>
}

/** Accumulator passed through the foundation-play scoring pipeline */
export interface PlayScore {
  chips: number
  mult: number
}

export interface PlayContext {
  card: Card
  fromWaste: boolean
  /** streak position of this play (0 = first after a deal/recycle) */
  streak: number
  round: RoundState
  run: RunState
  /** the joker's own mutable state (persisted) */
  state: Record<string, number>
  /** deterministic RNG for chance effects */
  rng: () => number
}

export interface HookResult {
  chips?: number
  mult?: number
  xmult?: number
  money?: number
}

export interface JokerDef {
  id: string
  name: string
  rarity: Rarity
  cost: number
  /** description; use {x} placeholders resolved by describeJoker for scaling jokers */
  description: string
  hooks?: {
    onFoundationPlay?: (ctx: PlayContext) => HookResult | void
    onReveal?: (ctx: PlayContext) => HookResult | void
    onEmptyColumn?: (ctx: PlayContext) => HookResult | void
    onRoundEnd?: (round: RoundState, run: RunState, state: Record<string, number>) => HookResult | void
  }
  /** applied when a round starts */
  roundMods?: Partial<Pick<RoundRules, 'dealSize' | 'recycles' | 'discards' | 'anyColorStacking'>> & {
    extraRecycles?: number
    extraDiscards?: number
  }
  /** passive flags checked by the engine */
  passives?: {
    anyColorStacking?: boolean
    enhancementsTwice?: boolean
    streakNeverBreaks?: boolean
  }
}

// ---------------------------------------------------------------------------
// God cards (consumables)

export type GodKind = 'level' | 'instant'

export interface GodDef {
  id: string
  name: string
  title: string
  description: string
  kind: GodKind
  cost: number
}

// ---------------------------------------------------------------------------
// Boss blinds

export interface BossDef {
  id: string
  name: string
  description: string
  /** multiply the blind target (shown up front) */
  targetMult?: number
  /** clamp/patch round rules at deal time */
  modifyRules?: (rules: RoundRules) => RoundRules
  /** block specific moves */
  blocksMove?: (move: Move, round: RoundState) => string | null
  /** adjust a foundation play score (after jokers) */
  modifyPlayScore?: (score: PlayScore, ctx: { card: Card; run: RunState }) => PlayScore
  /** zero out reveal/empty-column points */
  mutesCategory?: PlayCategory[]
  /** cap on streak-derived mult bonus */
  streakCap?: number
  /** disables the leftmost joker for the round */
  silencesFirstJoker?: boolean
  /** score penalty per stock deal */
  dealPenalty?: number
}

// ---------------------------------------------------------------------------
// Run

export interface RunState {
  seed: string
  ante: number // 1..8, 9 = victory
  blindIndex: number // 0 small, 1 big, 2 boss
  money: number
  jokers: JokerInstance[]
  jokerSlots: number
  consumables: string[] // god card ids
  consumableSlots: number
  enhancements: EnhancementMap
  levels: Levels
  /** boss id per ante, rolled at run start so players can plan */
  bosses: string[]
  rng: RngState
  history: Array<{ ante: number; blind: BlindKind; score: number; target: number }>
  skips: number
  roundsWon: number
  bestPlay: number
  mode: 'standard' | 'daily'
}

export const BLINDS: readonly BlindKind[] = ['small', 'big', 'boss']
