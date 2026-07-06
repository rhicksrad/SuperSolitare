// Tests for the expansion systems: editions, curses, decks, stakes, vouchers,
// tags, endless scaling, and the new god cards.

import { describe, expect, it } from 'vitest'
import { buildDeck } from '../src/engine/cards'
import { dealRound } from '../src/engine/klondike'
import type { RoundState } from '../src/engine/klondike'
import { newJokerInstance } from '../src/engine/jokers'
import { Rng } from '../src/engine/rng'
import {
  anteBase,
  applyGodCard,
  BASE_RULES,
  blindTarget,
  ensureBossForAnte,
  finishRound,
  newRun,
  startRound,
} from '../src/engine/run'
import { bossBlockReason, performMove } from '../src/engine/scoring'
import { generateShop, openCardPack } from '../src/engine/shop'
import type { RunState } from '../src/engine/types'

function setup(seed = 'exp'): { round: RoundState; run: RunState } {
  const round = dealRound(new Rng(seed), buildDeck(), {
    rules: { ...BASE_RULES },
    blind: 'small',
    bossId: null,
    target: 300,
  })
  return { round, run: newRun(seed) }
}

function primeAce(round: RoundState): void {
  round.tableau[0] = [{ id: 'S-1', suit: 'spades', rank: 1, faceUp: true }]
}

describe('editions', () => {
  it('foil adds chips, holo adds mult', () => {
    const { round, run } = setup()
    primeAce(round)
    run.jokers = [{ ...newJokerInstance('chip-stack'), edition: 'foil' }]
    let out = performMove(round, run, { kind: 'tableau_to_foundation', from: 't0', to: 'f0' })
    // chips 15+11+30(joker)+30(foil) = 86, mult 1
    expect(out.pops[0].total).toBe(86)

    const { round: r2, run: run2 } = setup()
    primeAce(r2)
    run2.jokers = [{ ...newJokerInstance('chip-stack'), edition: 'holo' }]
    out = performMove(r2, run2, { kind: 'tableau_to_foundation', from: 't0', to: 'f0' })
    // chips 56, mult 1+4 = 5
    expect(out.pops[0].total).toBe(56 * 5)
  })

  it('the eclipse mutes enhancements and editions', () => {
    const { round, run } = setup()
    primeAce(round)
    round.bossId = 'the-eclipse'
    run.enhancements['S-1'] = 'ruby'
    run.jokers = [{ ...newJokerInstance('chip-stack'), edition: 'holo' }]
    const out = performMove(round, run, { kind: 'tableau_to_foundation', from: 't0', to: 'f0' })
    // ruby and holo muted: chips 15+11+30 = 56, mult 1
    expect(out.pops[0].total).toBe(56)
  })
})

describe('curses (the hex)', () => {
  it('cursed cards lose their chips and 2 mult', () => {
    const { round, run } = setup()
    primeAce(round)
    round.streak = 4
    round.curses = ['S-1']
    run.enhancements['S-1'] = 'ruby' // curses override enhancements
    const out = performMove(round, run, { kind: 'tableau_to_foundation', from: 't0', to: 'f0' })
    // chips 15 (no card chips), mult 1+4-2 = 3
    expect(out.pops[0].total).toBe(15 * 3)
  })

  it('hecate cleanses curses', () => {
    let run = newRun('hecate')
    run = { ...run, consumables: ['hecate'] }
    const { round, run: r2 } = startRound(run)
    round.curses = ['S-1', 'H-4']
    const out = applyGodCard(r2, round, 'hecate')
    expect(out.ok).toBe(true)
    expect(out.round!.curses).toHaveLength(0)
    expect(out.round!.discardsLeft).toBe(round.discardsLeft + 1)
  })
})

describe('gods: artemis', () => {
  it('burns the whole waste for free', () => {
    let run = newRun('artemis')
    run = { ...run, consumables: ['artemis'] }
    let { round, run: r2 } = startRound(run)
    const dealt = performMove(round, r2, { kind: 'deal_stock' })
    round = dealt.round
    r2 = dealt.run
    expect(round.waste.length).toBe(3)
    const out = applyGodCard(r2, round, 'artemis')
    expect(out.ok).toBe(true)
    expect(out.round!.waste).toHaveLength(0)
    expect(out.round!.burned).toHaveLength(3)
    expect(out.round!.discardsLeft).toBe(round.discardsLeft) // free
  })
})

describe('decks and stakes', () => {
  it('deck modifiers apply at run start', () => {
    const gilded = newRun('d1', 'standard', 'gilded')
    expect(gilded.money).toBe(10)
    const merchant = newRun('d2', 'standard', 'merchant')
    expect(merchant.vouchers).toHaveLength(1)
    const arcane = newRun('d3', 'standard', 'arcane')
    expect(Object.keys(arcane.enhancements)).toHaveLength(4)
  })

  it('serpent deck keeps streak through recycles but raises targets', () => {
    const serpent = newRun('d4', 'standard', 'serpent')
    const classic = newRun('d4', 'standard', 'classic')
    expect(blindTarget(serpent, 1, 'small')).toBeGreaterThan(blindTarget(classic, 1, 'small'))
    let { round, run } = startRound(serpent)
    // exhaust stock then recycle
    while (round.stock.length > 0) {
      const out = performMove(round, run, { kind: 'deal_stock' })
      round = out.round
      run = out.run
    }
    round.streak = 6
    const out = performMove(round, run, { kind: 'recycle' })
    expect(out.round.streak).toBe(6)
    // but a plain stock deal still breaks it
    const dealt = performMove(out.round, out.run, { kind: 'deal_stock' })
    expect(dealt.round.streak).toBe(0)
  })

  it('stakes raise targets and cut rewards', () => {
    const white = newRun('s', 'standard', 'classic', 0)
    const gold = newRun('s', 'standard', 'classic', 2)
    expect(blindTarget(gold, 3, 'big')).toBeGreaterThan(blindTarget(white, 3, 'big'))
    const { round: wr } = startRound(white)
    wr.score = wr.target
    const { result: wres } = finishRound(white, wr)
    const { round: gr } = startRound(gold)
    gr.score = gr.target
    const { result: gres } = finishRound(gold, gr)
    const wBase = wres.breakdown[0].amount
    const gBase = gres.breakdown[0].amount
    expect(gBase).toBe(wBase - 1)
  })
})

describe('vouchers', () => {
  it('crowbar and perpetual-motion add round resources', () => {
    let run = newRun('v1')
    run = { ...run, vouchers: ['crowbar', 'perpetual-motion'] }
    const { round } = startRound(run)
    expect(round.discardsLeft).toBe(BASE_RULES.discards + 1)
    expect(round.recyclesLeft).toBe(BASE_RULES.recycles + 1)
  })

  it('the shop sells one voucher per ante and showcase adds a joker slot', () => {
    const run = newRun('v2')
    const { offers } = generateShop(run, 0)
    expect(offers.filter((o) => o.kind === 'voucher')).toHaveLength(1)
    expect(offers.filter((o) => o.kind === 'joker')).toHaveLength(2)
    const withShowcase = { ...run, vouchers: ['showcase'] }
    const { offers: more } = generateShop(withShowcase, 0)
    expect(more.filter((o) => o.kind === 'joker')).toHaveLength(3)
  })

  it('lucky-charm widens card packs to 4 choices', () => {
    const run = { ...newRun('v3'), vouchers: ['lucky-charm'] }
    const { choices } = openCardPack(run)
    expect(choices).toHaveLength(4)
  })
})

describe('endless mode', () => {
  it('targets keep growing past ante 8', () => {
    expect(anteBase(9)).toBeGreaterThan(anteBase(8))
    expect(anteBase(12)).toBeGreaterThan(anteBase(9) * 2)
  })

  it('bosses are rolled lazily for endless antes', () => {
    let run = newRun('endless')
    run = ensureBossForAnte({ ...run, endless: true, ante: 11 }, 11)
    expect(run.bosses.length).toBeGreaterThanOrEqual(11)
    // deterministic
    let run2 = newRun('endless')
    run2 = ensureBossForAnte({ ...run2, endless: true, ante: 11 }, 11)
    expect(run2.bosses).toEqual(run.bosses)
  })

  it('winning the ante 8 boss in endless keeps the run going', () => {
    let run = newRun('endless2')
    run = ensureBossForAnte({ ...run, endless: true, ante: 9, blindIndex: 2 }, 9)
    const { round, run: r2 } = startRound(run)
    round.score = round.target
    const { run: after, result } = finishRound(r2, round)
    expect(result.runWon).toBe(false)
    expect(after.ante).toBe(10)
  })
})

describe('new bosses', () => {
  it('the usurer charges money per deal', () => {
    const { round, run } = setup()
    round.bossId = 'the-tithe-boss'
    run.money = 5
    const out = performMove(round, run, { kind: 'deal_stock' })
    expect(out.run.money).toBe(4)
  })

  it('the anchor blocks king column moves', () => {
    const { round, run } = setup()
    round.bossId = 'the-anchor'
    round.tableau[0] = [{ id: 'S-13', suit: 'spades', rank: 13, faceUp: true }]
    round.tableau[1] = []
    expect(bossBlockReason(round, { kind: 'tableau_to_tableau', from: 't0', index: 0, to: 't1' })).toBeTruthy()
    expect(() => performMove(round, run, { kind: 'tableau_to_tableau', from: 't0', index: 0, to: 't1' })).toThrow(/Anchor/)
  })
})
