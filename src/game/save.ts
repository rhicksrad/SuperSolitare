import type { RunState, Joker } from './types'
import { jokerRegistry } from './jokers'

const STORAGE_KEY = 'supersolitaire.save.v2'

interface SavePayloadV2 { v: 2; run: Omit<RunState, 'jokers'> & { jokers: Array<{ id: string; variant?: 'foil' | 'holo' }> } }

export function saveRun(state: RunState) {
  // v2: save jokers by id + variant only
  const slim = {
    ...state,
    jokers: state.jokers.map((j: any) => ({ id: j.id, variant: j.variant })),
  }
  const payload: SavePayloadV2 = { v: 2, run: slim as any }
  const json = JSON.stringify(payload)
  try {
    localStorage.setItem(STORAGE_KEY, json)
  } catch {
    // ignore in Phase 0
  }
}

export function loadRun(): RunState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('supersolitaire.save.v1')
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data && typeof data.v === 'number') {
      if (data.v === 2 && data.run) {
        const run = data.run as SavePayloadV2['run']
        const jokers = (run.jokers || []).map((j) => ({ ...jokerRegistry[j.id], variant: j.variant })) as Joker[]
        return { ...(run as any), jokers }
      }
      if (data.v === 1 && data.run) {
        const run = data.run as RunState
        // Rehydrate jokers: if saved as full objects, keep; if ids-only in future, map ids to registry
        if (Array.isArray((run as any).jokers)) {
          const jj = (run as any).jokers
          if (jj.length && typeof jj[0] === 'string') {
            // ids-only payload
            run.jokers = (jj as string[]).map((id) => ({ ...jokerRegistry[id] })).filter(Boolean) as Joker[]
          } else if (jj.length && typeof jj[0] === 'object' && !(jj[0] as any).applyHooks) {
            // shallow objects without functions: replace from registry by id
            run.jokers = jj.map((j: any) => ({ ...jokerRegistry[j.id] })).filter(Boolean) as Joker[]
          }
        }
        return run
      }
      // future: migrate known versions
      return data.run ?? null
    }
    // legacy unversioned payload (if any)
    return data as RunState
  } catch {
    return null
  }
}

// Daily leaderboard (local-only)
const DAILY_KEY = 'supersolitaire.daily.v1'
const DAILY_PLAYED_KEY = 'supersolitaire.daily.played.v1'

export function getDailyBest(seed: string): number | null {
  try {
    const raw = localStorage.getItem(DAILY_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, number>
    return typeof map[seed] === 'number' ? map[seed] : null
  } catch {
    return null
  }
}

export function setDailyBest(seed: string, score: number) {
  try {
    const raw = localStorage.getItem(DAILY_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {}
    const prev = map[seed]
    if (typeof prev !== 'number' || score > prev) {
      map[seed] = score
      localStorage.setItem(DAILY_KEY, JSON.stringify(map))
    }
  } catch {
    // ignore
  }
}

export function hasDailyPlayed(seed: string): boolean {
  try {
    const raw = localStorage.getItem(DAILY_PLAYED_KEY)
    if (!raw) return false
    const map = JSON.parse(raw) as Record<string, boolean>
    return !!map[seed]
  } catch {
    return false
  }
}

export function setDailyPlayed(seed: string) {
  try {
    const raw = localStorage.getItem(DAILY_PLAYED_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
    map[seed] = true
    localStorage.setItem(DAILY_PLAYED_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

// TODO(game/PHASE8): versioning and migrations; add schemaVersion and migrate


