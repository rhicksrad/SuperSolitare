// Deterministic, serializable RNG (mulberry32 seeded from a string hash).
// All game randomness flows through this so runs are fully reproducible from a seed.

export interface RngState {
  seed: string
  s: number // current 32-bit internal state
}

function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

export class Rng {
  state: RngState

  constructor(seedOrState: string | RngState) {
    if (typeof seedOrState === 'string') {
      this.state = { seed: seedOrState, s: hashSeed(seedOrState) }
    } else {
      this.state = { ...seedOrState }
    }
  }

  /** Uniform float in [0, 1) */
  next(): number {
    let t = (this.state.s += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    this.state.s = this.state.s >>> 0
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Integer in [0, n) */
  int(n: number): number {
    return Math.floor(this.next() * n)
  }

  /** Integer in [min, max] inclusive */
  range(min: number, max: number): number {
    return min + this.int(max - min + 1)
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)]
  }

  /** Fisher-Yates; returns a new array */
  shuffle<T>(arr: readonly T[]): T[] {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1)
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  /** Chance check, e.g. chance(1, 4) = 1-in-4 */
  chance(num: number, denom: number): boolean {
    return this.next() < num / denom
  }

  clone(): Rng {
    return new Rng({ ...this.state })
  }

  /** Derive an independent stream (e.g. per-round) without disturbing this one */
  derive(label: string): Rng {
    return new Rng(`${this.state.seed}::${label}::${this.state.s}`)
  }
}
