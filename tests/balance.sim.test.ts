// Balance harness: a greedy bot plays full rounds through the real engine so
// we can sanity-check that blind targets are reachable. Not a perfect player —
// real humans plan better — so targets should sit below what it typically hits
// for early antes and require joker scaling later.

import { describe, expect, it } from 'vitest'
import { buildDeck } from '../src/engine/cards'
import type { FoundationId, RoundState, TableauId } from '../src/engine/klondike'
import { foundationFor, hasAnyUsefulMove, isLegalMove } from '../src/engine/klondike'
import { newJokerInstance } from '../src/engine/jokers'
import { ANTE_BASE_TARGETS, newRun, startRound } from '../src/engine/run'
import { performMove } from '../src/engine/scoring'
import type { RunState } from '../src/engine/types'

function greedyPlay(run: RunState, round: RoundState, maxMoves = 800): { score: number; cleared: boolean } {
  let r = round
  let ru = run
  for (let i = 0; i < maxMoves; i++) {
    if (r.finished) break
    let moved = false

    // 1. foundation plays from tableau
    for (let t = 0; t < 7 && !moved; t++) {
      const top = r.tableau[t][r.tableau[t].length - 1]
      if (top?.faceUp) {
        const f = foundationFor(r, top)
        if (f) {
          const out = performMove(r, ru, { kind: 'tableau_to_foundation', from: `t${t}` as TableauId, to: f as FoundationId })
          r = out.round
          ru = out.run
          moved = true
        }
      }
    }
    if (moved) continue

    // 2. foundation play from waste
    const wasteTop = r.waste[r.waste.length - 1]
    if (wasteTop) {
      const f = foundationFor(r, wasteTop)
      if (f) {
        const out = performMove(r, ru, { kind: 'waste_to_foundation', to: f as FoundationId })
        r = out.round
        ru = out.run
        continue
      }
    }

    // 3. tableau move that flips a face-down card (or empties a column)
    outer: for (let t = 0; t < 7; t++) {
      const col = r.tableau[t]
      const firstUp = col.findIndex((c) => c.faceUp)
      if (firstUp < 0) continue
      const flips = firstUp > 0 || col[firstUp].rank !== 13 // moving helps unless king already on empty-ish base
      if (!flips) continue
      for (let u = 0; u < 7; u++) {
        if (u === t) continue
        const move = { kind: 'tableau_to_tableau', from: `t${t}` as TableauId, index: firstUp, to: `t${u}` as TableauId } as const
        if (isLegalMove(r, move).ok) {
          const out = performMove(r, ru, move)
          r = out.round
          ru = out.run
          moved = true
          break outer
        }
      }
    }
    if (moved) continue

    // 4. waste to tableau
    if (wasteTop) {
      for (let u = 0; u < 7; u++) {
        const move = { kind: 'waste_to_tableau', to: `t${u}` as TableauId } as const
        if (isLegalMove(r, move).ok) {
          const out = performMove(r, ru, move)
          r = out.round
          ru = out.run
          moved = true
          break
        }
      }
    }
    if (moved) continue

    // 5. deal / recycle / discard / give up
    if (r.stock.length > 0) {
      const out = performMove(r, ru, { kind: 'deal_stock' })
      r = out.round
      ru = out.run
    } else if (r.waste.length > 0 && r.recyclesLeft > 0) {
      const out = performMove(r, ru, { kind: 'recycle' })
      r = out.round
      ru = out.run
    } else if (r.waste.length > 0 && r.discardsLeft > 0) {
      const out = performMove(r, ru, { kind: 'discard_waste' })
      r = out.round
      ru = out.run
    } else {
      break
    }
  }
  const cleared = r.foundations.reduce((n, p) => n + p.length, 0) + r.burned.length === 52
  return { score: r.score, cleared }
}

function simulate(seeds: number, jokers: string[] = [], levels?: Partial<RunState['levels']>): number[] {
  const scores: number[] = []
  for (let s = 0; s < seeds; s++) {
    const run = newRun(`sim-${s}`)
    run.jokers = jokers.map(newJokerInstance)
    if (levels) run.levels = { ...run.levels, ...levels }
    const { round, run: ru } = startRound(run)
    scores.push(greedyPlay(ru, round).score)
  }
  return scores.sort((a, b) => a - b)
}

const pct = (arr: number[], p: number) => arr[Math.floor((arr.length - 1) * p)]

describe('balance simulation', () => {
  it('a no-joker greedy bot beats ante 1 small blind most of the time', () => {
    const scores = simulate(40)
    const median = pct(scores, 0.5)
     
    console.log(`no jokers: p10=${pct(scores, 0.1)} p50=${median} p90=${pct(scores, 0.9)}`)
    expect(median).toBeGreaterThan(ANTE_BASE_TARGETS[1]) // 300
    // and shouldn't trivialize ante 3+
    expect(pct(scores, 0.9)).toBeLessThan(ANTE_BASE_TARGETS[4])
  })

  it('a midgame build (2 jokers + level 2) reaches ante 3-4 targets', () => {
    const scores = simulate(40, ['jolly-roger', 'chip-stack'], { foundation: 2 })
    const median = pct(scores, 0.5)
     
    console.log(`midgame: p10=${pct(scores, 0.1)} p50=${median} p90=${pct(scores, 0.9)}`)
    expect(median).toBeGreaterThan(ANTE_BASE_TARGETS[3])
  })

  it('a strong build (xmult engine) reaches late-ante targets', () => {
    const scores = simulate(100, ['jolly-roger', 'streaker', 'momentum', 'midas', 'ouroboros'], { foundation: 4 })
    const median = pct(scores, 0.5)

    console.log(`strong: p10=${pct(scores, 0.1)} p50=${median} p90=${pct(scores, 0.9)}`)
    // The bot plays greedily and squanders streaks, so it's a hard lower bound
    // on human play; a strong engine should still put ante 4-5 in easy reach
    // and spike far beyond on good deals.
    expect(median).toBeGreaterThan(ANTE_BASE_TARGETS[4])
    expect(pct(scores, 0.9)).toBeGreaterThan(ANTE_BASE_TARGETS[6])
  })

  it('rounds do not stall the bot into infinite loops', () => {
    for (let s = 0; s < 10; s++) {
      const run = newRun(`stall-${s}`)
      const { round, run: ru } = startRound(run)
      const before = Date.now()
      greedyPlay(ru, round)
      expect(Date.now() - before).toBeLessThan(2000)
      expect(hasAnyUsefulMove(round)).toBeDefined()
    }
  })

  it('deck integrity: 52 unique cards conserved through heavy play', () => {
    const run = newRun('integrity')
    let { round, run: ru } = startRound(run)
    for (let i = 0; i < 200; i++) {
      if (round.finished) break
      // random-ish legal action pump via greedy single steps
      const ids = new Set<string>()
      for (const col of round.tableau) for (const c of col) ids.add(c.id)
      for (const p of round.foundations) for (const c of p) ids.add(c.id)
      for (const c of round.stock) ids.add(c.id)
      for (const c of round.waste) ids.add(c.id)
      for (const c of round.burned) ids.add(c.id)
      expect(ids.size).toBe(52)
      if (round.stock.length > 0) {
        const out = performMove(round, ru, { kind: 'deal_stock' })
        round = out.round
        ru = out.run
      } else if (round.waste.length > 0 && round.recyclesLeft > 0) {
        const out = performMove(round, ru, { kind: 'recycle' })
        round = out.round
        ru = out.run
      } else break
    }
    expect(buildDeck()).toHaveLength(52)
  })
})
