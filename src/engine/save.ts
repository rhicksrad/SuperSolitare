// Versioned localStorage persistence. Everything in RunState/RoundState is
// plain data, so a save is a straight JSON snapshot.

import type { RoundState } from './klondike'
import type { RunState } from './types'

const KEY = 'supersolitaire-v3' // key kept stable; payload carries its own version
const STATS_KEY = 'supersolitaire-stats-v1'

export interface SavePayload {
  version: 3 | 4
  run: RunState
  round: RoundState | null
  screen: 'blind-select' | 'playing' | 'shop'
  savedAt: number
}

export function saveGame(payload: Omit<SavePayload, 'version' | 'savedAt'>): void {
  try {
    const full: SavePayload = { version: 4, savedAt: Date.now(), ...payload }
    localStorage.setItem(KEY, JSON.stringify(full))
  } catch {
    // storage full/unavailable — play on without persistence
  }
}

/** Fill fields introduced after a save was written */
function migrate(payload: SavePayload): SavePayload {
  const run = payload.run
  run.vouchers ??= []
  run.deckId ??= 'classic'
  run.stake ??= 0
  run.endless ??= false
  if (payload.round) {
    payload.round.curses ??= []
    payload.round.wasteFan ??= Math.min(payload.round.rules.dealSize, payload.round.waste.length)
  }
  return { ...payload, version: 4 }
}

export function loadGame(): SavePayload | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavePayload
    if ((parsed.version !== 3 && parsed.version !== 4) || !parsed.run) return null
    return migrate(parsed)
  } catch {
    return null
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Lifetime stats / bests

export interface Discovered {
  jokers: string[]
  gods: string[]
  bosses: string[]
  vouchers: string[]
}

export interface LifetimeStats {
  runsStarted: number
  runsWon: number
  bestAnte: number
  bestPlay: number
  dailyBests: Record<string, number> // seed -> best ante reached
  /** highest stake level beaten per deck id — Balatro-style stickers; a deck
   * appearing here at all unlocks the next deck in order */
  stakeWins: Record<string, number>
  /** everything the player has ever laid eyes on; the collection shows "?"
   * for the rest */
  discovered: Discovered
}

const DEFAULT_STATS: LifetimeStats = {
  runsStarted: 0,
  runsWon: 0,
  bestAnte: 0,
  bestPlay: 0,
  dailyBests: {},
  stakeWins: {},
  discovered: { jokers: [], gods: [], bosses: [], vouchers: [] },
}

export function loadStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return structuredClone(DEFAULT_STATS)
    const parsed = JSON.parse(raw) as Partial<LifetimeStats> & { decksBeaten?: string[]; stakesBeaten?: number[] }
    const stats: LifetimeStats = {
      ...structuredClone(DEFAULT_STATS),
      ...parsed,
      discovered: { ...structuredClone(DEFAULT_STATS.discovered), ...parsed.discovered },
      stakeWins: { ...parsed.stakeWins },
    }
    // migrate the short-lived global decksBeaten/stakesBeaten format
    if (parsed.decksBeaten && Object.keys(stats.stakeWins).length === 0) {
      const highStake = Math.max(0, ...(parsed.stakesBeaten ?? [0]))
      for (const deck of parsed.decksBeaten) stats.stakeWins[deck] = highStake
    }
    return stats
  } catch {
    return structuredClone(DEFAULT_STATS)
  }
}

export function saveStats(stats: LifetimeStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    /* ignore */
  }
}

export function todaysDailySeed(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `daily-${y}-${m}-${day}`
}
