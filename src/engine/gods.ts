// God cards — one-shot consumables. "Level" gods permanently upgrade a play
// category (the planet-card analog); "instant" gods do something now.

import type { GodDef } from './types'

const defs: GodDef[] = [
  {
    id: 'ares',
    name: 'Ares',
    title: 'God of War',
    description: 'Level up Foundation plays (+10 chips, +1 mult base, permanent)',
    kind: 'level',
    cost: 5,
  },
  {
    id: 'hermes',
    name: 'Hermes',
    title: 'The Messenger',
    description: 'Level up Reveals (+15 points per reveal, permanent)',
    kind: 'level',
    cost: 5,
  },
  {
    id: 'hestia',
    name: 'Hestia',
    title: 'Keeper of the Hearth',
    description: 'Level up Empty Columns (+75 points per emptied column, permanent)',
    kind: 'level',
    cost: 5,
  },
  {
    id: 'chronos',
    name: 'Chronos',
    title: 'Father of Time',
    description: '+1 recycle this round',
    kind: 'instant',
    cost: 4,
  },
  {
    id: 'hades',
    name: 'Hades',
    title: 'Lord of the Underworld',
    description: '+2 discards this round',
    kind: 'instant',
    cost: 4,
  },
  {
    id: 'poseidon',
    name: 'Poseidon',
    title: 'The Earthshaker',
    description: 'Your next 3 foundation plays get ×2 mult',
    kind: 'instant',
    cost: 5,
  },
  {
    id: 'zeus',
    name: 'Zeus',
    title: 'King of Olympus',
    description: 'Instantly play every currently playable card to the foundations',
    kind: 'instant',
    cost: 6,
  },
  {
    id: 'apollo',
    name: 'Apollo',
    title: 'The Radiant',
    description: 'Gild a random card in your deck (+30 chips, permanent)',
    kind: 'instant',
    cost: 4,
  },
  {
    id: 'aphrodite',
    name: 'Aphrodite',
    title: 'The Beloved',
    description: 'Set a Ruby into a random card in your deck (+2 mult, permanent)',
    kind: 'instant',
    cost: 4,
  },
  {
    id: 'athena',
    name: 'Athena',
    title: 'The Strategist',
    description: 'Set a Sapphire into a random card in your deck (×1.5 mult, permanent)',
    kind: 'instant',
    cost: 6,
  },
  {
    id: 'dionysus',
    name: 'Dionysus',
    title: 'The Reveler',
    description: 'Gain $3–$8, chosen by fate',
    kind: 'instant',
    cost: 3,
  },
  {
    id: 'artemis',
    name: 'Artemis',
    title: 'The Huntress',
    description: 'Burn the entire waste pile — every card, no discard cost',
    kind: 'instant',
    cost: 5,
  },
  {
    id: 'hecate',
    name: 'Hecate',
    title: 'Mistress of Crossroads',
    description: 'Cleanse all curses this round and gain +1 discard',
    kind: 'instant',
    cost: 4,
  },
]

export const godRegistry: Record<string, GodDef> = Object.fromEntries(defs.map((d) => [d.id, d]))

export const allGodIds = defs.map((d) => d.id)
