import { describe, it, expect } from 'vitest'
import { LcgRng } from '../src/game/rng'

describe('LcgRng determinism', () => {
  it('produces identical sequences for the same seed', () => {
    const rngA = new LcgRng('test-seed-123')
    const rngB = new LcgRng('test-seed-123')

    const seqA = Array.from({ length: 8 }, () => rngA.int(0, 1000))
    const seqB = Array.from({ length: 8 }, () => rngB.int(0, 1000))

    expect(seqA).toEqual(seqB)
  })

  it('clone and serialize preserve sequence', () => {
    const rng = new LcgRng('alpha')
    // advance a few steps
    rng.int(0, 10)
    rng.int(0, 10)

    const cloned = rng.clone()
    const serialized = rng.serialize()
    const restored = LcgRng.fromSerialized(serialized)

    const nextA = Array.from({ length: 5 }, () => rng.int(0, 1000))
    const nextB = Array.from({ length: 5 }, () => cloned.int(0, 1000))
    const nextC = Array.from({ length: 5 }, () => restored.int(0, 1000))

    expect(nextA).toEqual(nextB)
    expect(nextA).toEqual(nextC)
  })
})


