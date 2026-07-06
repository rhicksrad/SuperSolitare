// Shared run-level types. Pure data (serializable) except the def registries,
// which are looked up by id at runtime.

import type { Card, EnhancementMap } from './cards'
import type { BlindKind, Move, RoundRules, RoundState } from './klondike'
import type { RngState } from './rng'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

/** Joker editions — rolled in the shop, self-contained bonuses */
export type Edition = 'foil' | 'holo' | 'negative'

export const EDITION_META: Record<Edition, { name: string; description: string; priceBump: number }> = {
  foil: { name: 'Foil', description: '+30 chips on every foundation play', priceBump: 3 },
  holo: { name: 'Holographic', description: '+4 mult on every foundation play', priceBump: 5 },
  negative: { name: 'Negative', description: 'Does not use a joker slot', priceBump: 8 },
}

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
  edition?: Edition
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
    onDiscard?: (ctx: PlayContext) => HookResult | void
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
  /** money cost per stock deal / recycle */
  moneyPerDeal?: number
  /** curses N random deck cards for the round (0 chips, −2 mult) */
  cursesCards?: number
  /** card enhancements and joker editions do not trigger */
  mutesEnhancements?: boolean
  /** winning pays no base blind reward, only bonuses */
  mutesBlindReward?: boolean
  /** only appears as the ante-8 finisher */
  finisher?: boolean
}

// ---------------------------------------------------------------------------
// Vouchers — permanent run upgrades sold one-per-ante in the shop

export interface VoucherDef {
  id: string
  name: string
  description: string
  cost: number
}

// ---------------------------------------------------------------------------
// Decks — starting loadouts chosen at run start

export interface DeckDef {
  id: string
  name: string
  description: string
  startMoney?: number
  interestCapBonus?: number
  shopDiscount?: number
  startVoucher?: boolean
  startEnhancedCards?: number
  /** streak survives recycles (not stock deals) */
  serpentStreak?: boolean
  targetMult?: number
}

// ---------------------------------------------------------------------------
// Stakes — difficulty tiers

export interface StakeDef {
  level: number
  name: string
  description: string
  targetMult: number
  rewardPenalty: number
}

// ---------------------------------------------------------------------------
// Skip tags — the visible reward for skipping a small/big blind

export type TagKind = 'money' | 'god' | 'joker' | 'enhance' | 'surplus'

export interface SkipTag {
  kind: TagKind
  name: string
  description: string
}

// ---------------------------------------------------------------------------
// Run

export interface RunState {
  seed: string
  ante: number // 1..8 (9+ = endless)
  blindIndex: number // 0 small, 1 big, 2 boss
  money: number
  jokers: JokerInstance[]
  jokerSlots: number
  consumables: string[] // god card ids
  consumableSlots: number
  enhancements: EnhancementMap
  levels: Levels
  /** boss id per ante, rolled at run start (extended lazily in endless) */
  bosses: string[]
  vouchers: string[]
  deckId: string
  stake: number // 0 white, 1 red, 2 gold
  endless: boolean
  rng: RngState
  history: Array<{ ante: number; blind: BlindKind; score: number; target: number }>
  skips: number
  roundsWon: number
  bestPlay: number
  mode: 'standard' | 'daily'
  /** set by the Surplus skip tag; consumed by the next startRound */
  pendingSurplus?: boolean
}

export const BLINDS: readonly BlindKind[] = ['small', 'big', 'boss']
