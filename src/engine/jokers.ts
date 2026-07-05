// Joker registry. Jokers are the build engine of a run: flat chips, flat mult,
// conditional mults, ×mults, economy, resources, rule-benders, and scalers.

import { isFace, isRed } from './cards'
import type { JokerDef, JokerInstance } from './types'

const defs: JokerDef[] = [
  // --- Common: bread-and-butter chips/mult -------------------------------
  {
    id: 'jolly-roger',
    name: 'Jolly Roger',
    rarity: 'common',
    cost: 4,
    description: '+4 mult on every foundation play',
    hooks: { onFoundationPlay: () => ({ mult: 4 }) },
  },
  {
    id: 'chip-stack',
    name: 'Chip Stack',
    rarity: 'common',
    cost: 4,
    description: '+30 chips on every foundation play',
    hooks: { onFoundationPlay: () => ({ chips: 30 }) },
  },
  {
    id: 'red-rally',
    name: 'Red Rally',
    rarity: 'common',
    cost: 5,
    description: 'Red cards give +5 mult when played to a foundation',
    hooks: { onFoundationPlay: (ctx) => (isRed(ctx.card.suit) ? { mult: 5 } : undefined) },
  },
  {
    id: 'nightshade',
    name: 'Nightshade',
    rarity: 'common',
    cost: 5,
    description: 'Black cards give +5 mult when played to a foundation',
    hooks: { onFoundationPlay: (ctx) => (!isRed(ctx.card.suit) ? { mult: 5 } : undefined) },
  },
  {
    id: 'court-favor',
    name: 'Court Favor',
    rarity: 'common',
    cost: 5,
    description: 'Face cards give +50 chips when played to a foundation',
    hooks: { onFoundationPlay: (ctx) => (isFace(ctx.card.rank) ? { chips: 50 } : undefined) },
  },
  {
    id: 'low-roller',
    name: 'Low Roller',
    rarity: 'common',
    cost: 4,
    description: 'Cards ranked 2–5 give +40 chips when played to a foundation',
    hooks: {
      onFoundationPlay: (ctx) => (ctx.card.rank >= 2 && ctx.card.rank <= 5 ? { chips: 40 } : undefined),
    },
  },
  {
    id: 'digger',
    name: 'Digger',
    rarity: 'common',
    cost: 4,
    description: 'Revealing a face-down card scores +40 points',
    hooks: { onReveal: () => ({ chips: 40 }) },
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    rarity: 'common',
    cost: 5,
    description: 'Emptying a column scores +150 points',
    hooks: { onEmptyColumn: () => ({ chips: 150 }) },
  },
  {
    id: 'golden-joker',
    name: 'Golden Joker',
    rarity: 'common',
    cost: 6,
    description: 'Earn $4 at the end of every round',
    hooks: { onRoundEnd: () => ({ money: 4 }) },
  },
  {
    id: 'prospector',
    name: 'Prospector',
    rarity: 'common',
    cost: 5,
    description: '1 in 4 chance to earn $2 on every foundation play',
    hooks: { onFoundationPlay: (ctx) => (ctx.rng() < 0.25 ? { money: 2 } : undefined) },
  },

  // --- Uncommon: conditions, resources, charges ---------------------------
  {
    id: 'streaker',
    name: 'Streaker',
    rarity: 'uncommon',
    cost: 7,
    description: 'Streak bonus is doubled (+2 mult per streak step instead of +1)',
    hooks: { onFoundationPlay: (ctx) => ({ mult: ctx.streak }) },
  },
  {
    id: 'momentum',
    name: 'Momentum',
    rarity: 'uncommon',
    cost: 7,
    description: '×2 mult on foundation plays while your streak is 5 or higher',
    hooks: { onFoundationPlay: (ctx) => (ctx.streak >= 5 ? { xmult: 2 } : undefined) },
  },
  {
    id: 'third-time',
    name: 'Third Time',
    rarity: 'uncommon',
    cost: 7,
    description: 'Every 3rd foundation play of the round gets ×2 mult',
    hooks: {
      onFoundationPlay: (ctx) =>
        ctx.round.stats.foundationPlays % 3 === 0 ? { xmult: 2 } : undefined,
    },
  },
  {
    id: 'deep-cut',
    name: 'Deep Cut',
    rarity: 'uncommon',
    cost: 6,
    description: 'Foundation plays from the waste give +60 chips',
    hooks: { onFoundationPlay: (ctx) => (ctx.fromWaste ? { chips: 60 } : undefined) },
  },
  {
    id: 'wastrel',
    name: 'Wastrel',
    rarity: 'uncommon',
    cost: 6,
    description: '+2 discards each round; earn $1 per unused discard at round end',
    roundMods: { extraDiscards: 2 },
    hooks: { onRoundEnd: (round) => ({ money: round.discardsLeft }) },
  },
  {
    id: 'excavator',
    name: 'Excavator',
    rarity: 'uncommon',
    cost: 7,
    description: 'Emptying a column also gives ×3 mult on your next foundation play',
    hooks: { onEmptyColumn: (ctx) => void (ctx.round.boostCharges += 1) },
  },
  {
    id: 'closer',
    name: 'The Closer',
    rarity: 'uncommon',
    cost: 8,
    description: '+10 mult on foundation plays after your 20th of the round',
    hooks: {
      onFoundationPlay: (ctx) => (ctx.round.stats.foundationPlays > 20 ? { mult: 10 } : undefined),
    },
  },
  {
    id: 'snowball',
    name: 'Snowball',
    rarity: 'uncommon',
    cost: 8,
    description: 'Gains +1 mult permanently each time you empty a column (currently +{grown} mult)',
    hooks: {
      onEmptyColumn: (ctx) => void (ctx.state.grown = (ctx.state.grown ?? 0) + 1),
      onFoundationPlay: (ctx) => ({ mult: ctx.state.grown ?? 0 }),
    },
  },
  {
    id: 'ace-pilot',
    name: 'Ace Pilot',
    rarity: 'uncommon',
    cost: 7,
    description: 'Aces give ×2 mult; twos give +20 chips',
    hooks: {
      onFoundationPlay: (ctx) =>
        ctx.card.rank === 1 ? { xmult: 2 } : ctx.card.rank === 2 ? { chips: 20 } : undefined,
    },
  },

  // --- Rare: build-defining -----------------------------------------------
  {
    id: 'midas',
    name: 'Midas',
    rarity: 'rare',
    cost: 9,
    description: '×2 mult on every foundation play, but reveals score 0',
    hooks: { onFoundationPlay: () => ({ xmult: 2 }) },
    // reveal muting handled in scoring via id check
  },
  {
    id: 'phantom',
    name: 'Phantom',
    rarity: 'rare',
    cost: 9,
    description: 'Tableau stacking ignores color (any suit on any suit)',
    passives: { anyColorStacking: true },
  },
  {
    id: 'kings-gambit',
    name: "King's Gambit",
    rarity: 'rare',
    cost: 9,
    description: 'Kings give ×3 mult when played to a foundation',
    hooks: { onFoundationPlay: (ctx) => (ctx.card.rank === 13 ? { xmult: 3 } : undefined) },
  },
  {
    id: 'eleventh-hour',
    name: 'Eleventh Hour',
    rarity: 'rare',
    cost: 8,
    description: '+1 recycle and +2 discards every round',
    roundMods: { extraRecycles: 1, extraDiscards: 2 },
  },
  {
    id: 'alchemist',
    name: 'Alchemist',
    rarity: 'rare',
    cost: 10,
    description: 'Card enhancements trigger twice',
    passives: { enhancementsTwice: true },
  },

  // --- Legendary ------------------------------------------------------------
  {
    id: 'ouroboros',
    name: 'Ouroboros',
    rarity: 'legendary',
    cost: 14,
    description: 'Your streak never resets — not even when dealing from the stock',
    passives: { streakNeverBreaks: true },
  },
  {
    id: 'pantheon',
    name: 'Pantheon',
    rarity: 'legendary',
    cost: 14,
    description: '+1 mult on every foundation play per level you have bought across all categories',
    hooks: {
      onFoundationPlay: (ctx) => ({
        mult:
          ctx.run.levels.foundation - 1 + (ctx.run.levels.reveal - 1) + (ctx.run.levels.empty_column - 1),
      }),
    },
  },
]

export const jokerRegistry: Record<string, JokerDef> = Object.fromEntries(defs.map((d) => [d.id, d]))

export const allJokerIds = defs.map((d) => d.id)

export function jokersByRarity(rarity: JokerDef['rarity']): JokerDef[] {
  return defs.filter((d) => d.rarity === rarity)
}

export function newJokerInstance(id: string): JokerInstance {
  return { id, state: {} }
}

/** Resolve {placeholders} in scaling joker descriptions */
export function describeJoker(instance: JokerInstance): string {
  const def = jokerRegistry[instance.id]
  if (!def) return ''
  return def.description.replace(/\{(\w+)\}/g, (_, key) => String(instance.state[key] ?? 0))
}

export function sellValue(id: string): number {
  const def = jokerRegistry[id]
  return def ? Math.max(1, Math.floor(def.cost / 2)) : 1
}
