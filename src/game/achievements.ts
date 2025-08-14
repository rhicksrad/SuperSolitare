export interface AchievementDef {
  id: string
  name: string
  description: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_clear', name: 'First Clear', description: 'Win any board.' },
  { id: 'reach_ante_2', name: 'Round Two', description: 'Reach Round 2.' },
  { id: 'reach_ante_4', name: 'Midgame', description: 'Reach Round 4.' },
  { id: 'clear_boss', name: 'Boss Breaker', description: 'Win a boss board.' },
  { id: 'early_finish', name: 'Early Bird', description: 'Win with >30s remaining.' },
  { id: 'two_columns', name: 'Column Marshal', description: 'Empty 2 tableau columns in a single board.' },
]


