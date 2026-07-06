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
  {
    id: 'the-hex',
    name: 'The Hex',
    description: 'Curses 5 of your cards for this round: 0 chips, −2 mult',
    cursesCards: 5,
  },
  {
    id: 'the-fog',
    name: 'The Fog',
    description: 'Only the top waste card is visible',
    modifyRules: (rules) => ({ ...rules, wasteVisible: 1 }),
  },
  {
    id: 'the-anchor',
    name: 'The Anchor',
    description: 'Kings cannot move between tableau columns',
    blocksMove: (move, round) => {
      if (move.kind !== 'tableau_to_tableau') return null
      const col = round.tableau[Number(move.from[1])]
      return col[move.index]?.rank === 13 ? 'The Anchor holds your kings in place' : null
    },
  },
  {
    id: 'the-famine',
    name: 'The Famine',
    description: 'Winning pays no blind reward — only bonuses and interest',
    mutesBlindReward: true,
  },
  {
    id: 'the-tithe-boss',
    name: 'The Usurer',
    description: 'Each stock deal and recycle costs $1',
    moneyPerDeal: 1,
  },

  // --- Ante 8 finishers -----------------------------------------------------
  {
    id: 'the-house',
    name: 'The House',
    description: 'Target score is doubled. The House always wins — prove it wrong.',
    targetMult: 2,
    finisher: true,
  },
  {
    id: 'the-reaper',
    name: 'The Reaper',
    description: 'Each stock deal and recycle costs $2, and no discards',
    moneyPerDeal: 2,
    modifyRules: (rules) => ({ ...rules, discards: 0 }),
    finisher: true,
  },
  {
    id: 'the-eclipse',
    name: 'The Eclipse',
    description: 'Card enhancements and joker editions do not trigger',
    mutesEnhancements: true,
    finisher: true,
  },
]

export const bossRegistry: Record<string, BossDef> = Object.fromEntries(defs.map((d) => [d.id, d]))

export const allBossIds = defs.filter((d) => !d.finisher).map((d) => d.id)

export const finisherBossIds = defs.filter((d) => d.finisher).map((d) => d.id)
