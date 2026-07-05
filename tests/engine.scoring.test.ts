import { describe, expect, it } from 'vitest'
import { buildDeck } from '../src/engine/cards'
import { dealRound } from '../src/engine/klondike'
import type { RoundState } from '../src/engine/klondike'
import { newJokerInstance } from '../src/engine/jokers'
import { Rng } from '../src/engine/rng'
import { BASE_RULES, newRun } from '../src/engine/run'
import { foundationLevelBase, performMove } from '../src/engine/scoring'
import type { RunState } from '../src/engine/types'

function setup(seed = 'score-test'): { round: RoundState; run: RunState } {
  const round = dealRound(new Rng(seed), buildDeck(), {
    rules: { ...BASE_RULES },
    blind: 'small',
    bossId: null,
    target: 300,
  })
  return { round, run: newRun(seed) }
}

/** Put a known ace on top of t0 so we can play it to a foundation */
function primeAce(round: RoundState): void {
  round.tableau[0] = [
    { id: 'C-9', suit: 'clubs', rank: 9, faceUp: false },
    { id: 'S-1', suit: 'spades', rank: 1, faceUp: true },
  ]
}

describe('foundation play scoring', () => {
  it('scores (level chips + card chips) × (level mult + streak)', () => {
    const { round, run } = setup()
    primeAce(round)
    const out = performMove(round, run, { kind: 'tableau_to_foundation', from: 't0', to: 'f0' })
    const base = foundationLevelBase(1) // 15 chips, 1 mult
    const expectedPlay = (base.chips + 11) * (base.mult + 0) // streak 0 on first play
    const pop = out.pops.find((p) => p.kind === 'foundation')!
    expect(pop.total).toBe(expectedPlay)
    // the reveal of C-9 also scores
    const reveal = out.pops.find((p) => p.kind === 'reveal')!
    expect(reveal.total).toBe(20)
    expect(out.round.score).toBe(expectedPlay + 20)
    expect(out.round.streak).toBe(1)
  })

  it('streak raises mult on consecutive plays and breaks on stock deals', () => {
    const { round, run } = setup()
    round.tableau[0] = [{ id: 'S-1', suit: 'spades', rank: 1, faceUp: true }]
    round.tableau[1] = [{ id: 'S-2', suit: 'spades', rank: 2, faceUp: true }]
    let out = performMove(round, run, { kind: 'tableau_to_foundation', from: 't0', to: 'f0' })
    out = performMove(out.round, out.run, { kind: 'tableau_to_foundation', from: 't1', to: 'f0' })
    const second = out.pops.find((p) => p.kind === 'foundation')!
    // second play: chips 15+2=17, mult 1+1(streak)=2
    expect(second.total).toBe(17 * 2)
    const afterDeal = performMove(out.round, out.run, { kind: 'deal_stock' })
    expect(afterDeal.round.streak).toBe(0)
  })

  it('applies joker chips, mult, and xmult in tray order', () => {
    const { round, run } = setup()
    primeAce(round)
    run.jokers = [newJokerInstance('chip-stack'), newJokerInstance('jolly-roger'), newJokerInstance('kings-gambit')]
    const out = performMove(round, run, { kind: 'tableau_to_foundation', from: 't0', to: 'f0' })
    const pop = out.pops.find((p) => p.kind === 'foundation')!
    // chips 15+11+30 = 56, mult 1+4 = 5 (king's gambit doesn't fire on an ace)
    expect(pop.total).toBe(56 * 5)
  })

  it('applies enhancements (and twice with Alchemist)', () => {
    const { round, run } = setup()
    primeAce(round)
    run.enhancements['S-1'] = 'ruby'
    let out = performMove(round, run, { kind: 'tableau_to_foundation', from: 't0', to: 'f0' })
    expect(out.pops[0].total).toBe(26 * 3) // chips 26, mult 1+2

    const { round: r2, run: run2 } = setup()
    primeAce(r2)
    run2.enhancements['S-1'] = 'ruby'
    run2.jokers = [newJokerInstance('alchemist')]
    out = performMove(r2, run2, { kind: 'tableau_to_foundation', from: 't0', to: 'f0' })
    expect(out.pops[0].total).toBe(26 * 5) // ruby applied twice
  })

  it('scaling jokers grow their state (Snowball)', () => {
    const { round, run } = setup()
    run.jokers = [newJokerInstance('snowball')]
    round.tableau[0] = [{ id: 'H-7', suit: 'hearts', rank: 7, faceUp: true }]
    round.tableau[5] = [{ id: 'S-8', suit: 'spades', rank: 8, faceUp: true }]
    // moving H-7 onto S-8 empties t0 -> snowball grows
    const out = performMove(round, run, { kind: 'tableau_to_tableau', from: 't0', index: 0, to: 't5' })
    expect(out.events.some((e) => e.type === 'empty_column')).toBe(true)
    expect(out.run.jokers[0].state.grown).toBe(1)
    // and the grown mult applies on the next foundation play
    out.round.tableau[1] = [{ id: 'S-1', suit: 'spades', rank: 1, faceUp: true }]
    const play = performMove(out.round, out.run, { kind: 'tableau_to_foundation', from: 't1', to: 'f0' })
    expect(play.pops[0].total).toBe(26 * 2) // mult 1 + snowball 1
  })

  it('boss: the-toll charges points per stock deal; the-weight caps streak', () => {
    const { round, run } = setup()
    round.bossId = 'the-toll'
    round.score = 100
    const out = performMove(round, run, { kind: 'deal_stock' })
    expect(out.round.score).toBe(85)

    const { round: r2, run: run2 } = setup()
    r2.bossId = 'the-weight'
    r2.streak = 6
    r2.tableau[0] = [{ id: 'S-1', suit: 'spades', rank: 1, faceUp: true }]
    const out2 = performMove(r2, run2, { kind: 'tableau_to_foundation', from: 't0', to: 'f0' })
    // mult = 1 + min(6, 2) = 3
    expect(out2.pops[0].total).toBe(26 * 3)
  })

  it('boss: the-silence disables the leftmost joker', () => {
    const { round, run } = setup()
    round.bossId = 'the-silence'
    primeAce(round)
    run.jokers = [newJokerInstance('jolly-roger'), newJokerInstance('chip-stack')]
    const out = performMove(round, run, { kind: 'tableau_to_foundation', from: 't0', to: 'f0' })
    // jolly-roger silenced: chips 15+11+30=56, mult 1
    expect(out.pops[0].total).toBe(56)
  })

  it('Ouroboros preserves streak across stock deals', () => {
    const { round, run } = setup()
    run.jokers = [newJokerInstance('ouroboros')]
    round.streak = 5
    const out = performMove(round, run, { kind: 'deal_stock' })
    expect(out.round.streak).toBe(5)
  })

  it('board clear grants the bonus', () => {
    const { round, run } = setup()
    // Fabricate a nearly-cleared board
    round.tableau = Array.from({ length: 7 }, () => [])
    round.stock = []
    round.waste = []
    round.burned = []
    round.foundations = [
      buildDeck().filter((c) => c.suit === 'spades').map((c) => ({ ...c, faceUp: true })),
      buildDeck().filter((c) => c.suit === 'hearts').map((c) => ({ ...c, faceUp: true })),
      buildDeck().filter((c) => c.suit === 'diamonds').map((c) => ({ ...c, faceUp: true })),
      buildDeck().filter((c) => c.suit === 'clubs' && c.rank <= 12).map((c) => ({ ...c, faceUp: true })),
    ]
    round.tableau[0] = [{ id: 'C-13', suit: 'clubs', rank: 13, faceUp: true }]
    const out = performMove(round, run, { kind: 'tableau_to_foundation', from: 't0', to: 'f3' })
    expect(out.events.some((e) => e.type === 'board_clear')).toBe(true)
    expect(out.round.finished).toBe(true)
    const clearPop = out.pops.find((p) => p.kind === 'clear')!
    expect(clearPop.total).toBeGreaterThanOrEqual(500)
  })
})
