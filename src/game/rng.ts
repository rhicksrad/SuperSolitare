// Tiny deterministic LCG with seed support. No deps.
// Numerical constants from Numerical Recipes (good enough for gameplay RNG).

export interface RNGSerialized {
  seed: string
  state: number
}

export class LcgRng {
  private state: number
  readonly seed: string

  // m = 2^31, a = 1103515245, c = 12345 (fits in 32-bit signed)
  private static readonly MOD = 0x80000000 // 2^31
  private static readonly MUL = 1103515245
  private static readonly INC = 12345

  constructor(seed: string) {
    this.seed = seed
    this.state = LcgRng.hashSeed(seed)
  }

  static fromSerialized(s: RNGSerialized): LcgRng {
    const rng = new LcgRng(s.seed)
    rng.state = s.state >>> 0
    return rng
  }

  serialize(): RNGSerialized {
    return { seed: this.seed, state: this.state >>> 0 }
  }

  clone(): LcgRng {
    const c = new LcgRng(this.seed)
    c.state = this.state >>> 0
    return c
  }

  // Simple string hash to 31-bit state
  private static hashSeed(seed: string): number {
    let h = 2166136261 >>> 0 // FNV-1a basis
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i)
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
    }
    return h % LcgRng.MOD
  }

  // Advance state and return 0..1
  next(): number {
    this.state = (LcgRng.MUL * this.state + LcgRng.INC) % LcgRng.MOD
    return this.state / LcgRng.MOD
  }

  // Uniform float in [0, 1)
  float(): number {
    return this.next()
  }

  // Integer in [min, max] inclusive
  int(min: number, max: number): number {
    if (max < min) throw new Error('rng.int: max < min')
    const r = this.next()
    return Math.floor(r * (max - min + 1)) + min
  }
}


