import { describe, it, expect, beforeEach } from 'vitest'
import { saveRun, loadRun } from '../src/game/save'
import { jokerRegistry } from '../src/game/jokers'

// Minimal localStorage stub for node environment
class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null }
  setItem(key: string, value: string) { this.store.set(key, String(value)) }
  removeItem(key: string) { this.store.delete(key) }
  clear() { this.store.clear() }
}

describe('Save/Load v2', () => {
  const STORAGE_KEY = 'supersolitaire.save.v2'
  beforeEach(() => {
    // @ts-expect-error attach stub
    global.localStorage = new MemoryStorage() as any
    ;(global.localStorage as any).clear()
  })

  it('saves jokers by id+variant and rehydrates from registry', () => {
    const run = {
      seed: 'save-seed',
      ante: 1,
      coins: 0,
      jokers: [
        { ...jokerRegistry['early-bird'] },
        { ...jokerRegistry['monochrome'], variant: 'foil' },
      ],
      modifiers: [],
      stats: {},
      history: [],
      rng: { seed: 'save-seed', value: 0 },
      godCards: [],
      scoreRanks: { foundation_move: 1, reveal_face_down: 1, empty_column: 1 },
    } as any

    saveRun(run)
    const raw = (global.localStorage as any).getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw)
    expect(parsed.v).toBe(2)
    expect(Array.isArray(parsed.run.jokers)).toBe(true)
    // ensure payload slimmed to ids
    expect(parsed.run.jokers[0].id).toBe('early-bird')
    expect(parsed.run.jokers[0].name).toBeUndefined()
    expect(parsed.run.jokers[1].variant).toBe('foil')

    const loaded = loadRun()!
    expect(loaded.jokers.length).toBe(2)
    // Rehydrated objects should include hooks from registry
    expect(typeof loaded.jokers[0].applyHooks?.onRoundEnd).toBe('function')
    expect(loaded.jokers[1].variant).toBe('foil')
  })
})


