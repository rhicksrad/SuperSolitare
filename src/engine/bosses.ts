// Boss blinds — one per ante, rolled at run start, revealed on the blind
// select screen so players can plan their shop purchases around them.

import { isFace, isRed } from './cards'
import type { BossDef } from './types'

const defs: BossDef[] = [
  {
    id: 'the-wall',
    name: 'The Wall',
    description: 'Target score is 1.5× larger',
    targetMult: 1.5,
  },
  {
    id: 'the-drought',
    name: 'The Drought',
    description: 'No discards this round',
    modifyRules: (rules) => ({ ...rules, discards: 0 }),
  },
  {
    id: 'the-loop',
    name: 'The Loop',
    description: 'No recycles — one pass through the stock',
    modifyRules: (rules) => ({ ...rules, recycles: 0 }),
  },
  {
    id: 'the-crimson',
    name: 'The Crimson',
    description: 'Red cards give 0 chips when played to a foundation',
    modifyPlayScore: (score, ctx) => (isRed(ctx.card.suit) ? { ...score, chips: Math.min(score.chips, 15) } : score),
  },
  {
    id: 'the-court',
    name: 'The Court',
    description: 'Face cards give 0 chips when played to a foundation',
    modifyPlayScore: (score, ctx) => (isFace(ctx.card.rank) ? { ...score, chips: Math.min(score.chips, 15) } : score),
  },
  {
    id: 'the-weight',
    name: 'The Weight',
    description: 'Streak bonus is capped at +2 mult',
    streakCap: 2,
  },
  {
    id: 'the-flood',
    name: 'The Flood',
    description: 'The stock deals 5 cards at a time',
    modifyRules: (rules) => ({ ...rules, dealSize: 5 }),
  },
  {
    id: 'the-toll',
    name: 'The Toll',
    description: 'Each stock deal costs 15 points',
    dealPenalty: 15,
  },
  {
    id: 'the-silence',
    name: 'The Silence',
    description: 'Your leftmost joker is disabled this round',
    silencesFirstJoker: true,
  },
  {
    id: 'the-veil',
    name: 'The Veil',
    description: 'Reveals and emptied columns score nothing',
    mutesCategory: ['reveal', 'empty_column'],
  },
]

export const bossRegistry: Record<string, BossDef> = Object.fromEntries(defs.map((d) => [d.id, d]))

export const allBossIds = defs.map((d) => d.id)
