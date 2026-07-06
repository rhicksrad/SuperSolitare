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

export interface LifetimeStats {
  runsStarted: number
  runsWon: number
  bestAnte: number
  bestPlay: number
  dailyBests: Record<string, number> // seed -> best ante reached
}

const DEFAULT_STATS: LifetimeStats = { runsStarted: 0, runsWon: 0, bestAnte: 0, bestPlay: 0, dailyBests: {} }

export function loadStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return { ...DEFAULT_STATS }
    return { ...DEFAULT_STATS, ...(JSON.parse(raw) as Partial<LifetimeStats>) }
  } catch {
    return { ...DEFAULT_STATS }
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
