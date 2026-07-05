import { describe, expect, it } from 'vitest'
import { bossRegistry } from '../src/engine/bosses'
import { godRegistry } from '../src/engine/gods'
import { jokerRegistry, newJokerInstance, sellValue } from '../src/engine/jokers'
import {
  ANTE_BASE_TARGETS,
  blindTarget,
  FINAL_ANTE,
  finishRound,
  interestFor,
  newRun,
  skipBlind,
  startRound,
  applyGodCard,
} from '../src/engine/run'
import { generateShop, openCardPack, openGodPack, openJokerPack, rerollCost } from '../src/engine/shop'

describe('run structure', () => {
  it('creates a run with a boss per ante, deterministically', () => {
    const a = newRun('seed-x')
    const b = newRun('seed-x')
    expect(a.bosses).toEqual(b.bosses)
    expect(a.bosses).toHaveLength(FINAL_ANTE)
    for (const id of a.bosses) expect(bossRegistry[id]).toBeTruthy()
    // no repeats within the first bag of 8
    expect(new Set(a.bosses).size).toBe(8)
  })

  it('escalates targets across antes and blinds', () => {
    const run = newRun('t')
    for (let ante = 1; ante < FINAL_ANTE; ante++) {
      expect(ANTE_BASE_TARGETS[ante + 1]).toBeGreaterThan(ANTE_BASE_TARGETS[ante])
      expect(blindTarget(run, ante, 'big')).toBeGreaterThan(blindTarget(run, ante, 'small'))
      expect(blindTarget(run, ante, 'boss')).toBeGreaterThan(blindTarget(run, ante, 'big'))
    }
  })

  it('applies boss rules when starting a boss round', () => {
    let run = newRun('boss-round')
    run = { ...run, blindIndex: 2 }
    const droughtAnte = run.bosses.indexOf('the-drought') + 1
    run = { ...run, ante: droughtAnte }
    const { round } = startRound(run)
    expect(round.bossId).toBe('the-drought')
    expect(round.discardsLeft).toBe(0)
  })

  it('advances blinds and antes on wins, pays interest, and detects run win', () => {
    const run = newRun('adv')
    run.money = 12
    const { round } = startRound(run)
    round.score = round.target // exactly met
    const { run: afterSmall, result } = finishRound(run, round)
    expect(result.won).toBe(true)
    expect(afterSmall.blindIndex).toBe(1)
    expect(result.breakdown.some((b) => b.label.includes('Interest'))).toBe(true)
    expect(interestFor(12)).toBe(2)

    // losing ends the run without advancing
    const run2 = newRun('adv2')
    const { round: r2 } = startRound(run2)
    r2.score = 0
    const { run: after2, result: res2 } = finishRound(run2, r2)
    expect(res2.won).toBe(false)
    expect(after2.blindIndex).toBe(0)

    // boss win on final ante wins the run
    let run3 = newRun('adv3')
    run3 = { ...run3, ante: FINAL_ANTE, blindIndex: 2 }
    const { round: r3 } = startRound(run3)
    r3.score = r3.target + 1
    const { result: res3 } = finishRound(run3, r3)
    expect(res3.runWon).toBe(true)
  })

  it('golden joker pays at round end', () => {
    const run = newRun('gold')
    run.jokers = [newJokerInstance('golden-joker')]
    const { round } = startRound(run)
    round.score = round.target
    const { result } = finishRound(run, round)
    expect(result.breakdown.some((b) => b.label === 'Golden Joker' && b.amount === 4)).toBe(true)
  })

  it('skipping a blind grants a god card and advances', () => {
    const run = newRun('skip')
    const { run: after, godId } = skipBlind(run)
    expect(after.blindIndex).toBe(1)
    expect(godId).toBeTruthy()
    expect(after.consumables).toContain(godId)
  })
})

describe('god cards', () => {
  it('level gods upgrade permanently', () => {
    const run = newRun('gods')
    run.consumables = ['ares']
    const out = applyGodCard(run, null, 'ares')
    expect(out.ok).toBe(true)
    expect(out.run.levels.foundation).toBe(2)
    expect(out.run.consumables).toHaveLength(0)
  })

  it('enhancement gods enhance a random deck card', () => {
    const run = newRun('gods2')
    run.consumables = ['apollo']
    const out = applyGodCard(run, null, 'apollo')
    expect(out.ok).toBe(true)
    expect(Object.values(out.run.enhancements)).toContain('gilded')
  })

  it('round gods require an active round', () => {
    const run = newRun('gods3')
    run.consumables = ['chronos']
    const out = applyGodCard(run, null, 'chronos')
    expect(out.ok).toBe(false)
    const { round, run: r2 } = startRound({ ...run })
    const out2 = applyGodCard(r2, round, 'chronos')
    expect(out2.ok).toBe(true)
    expect(out2.round!.recyclesLeft).toBe(round.recyclesLeft + 1)
  })
})

describe('shop', () => {
  it('is deterministic and excludes owned jokers', () => {
    const run = newRun('shop')
    run.jokers = [newJokerInstance('jolly-roger')]
    const a = generateShop(run, 0)
    const b = generateShop(run, 0)
    expect(a.offers).toEqual(b.offers)
    for (const o of a.offers) {
      if (o.kind === 'joker') expect(o.jokerId).not.toBe('jolly-roger')
    }
    // reroll changes joker offers but keeps pack slots
    const c = generateShop(run, 1)
    const packsA = a.offers.filter((o) => o.kind === 'pack')
    const packsC = c.offers.filter((o) => o.kind === 'pack')
    expect(packsC).toEqual(packsA)
  })

  it('reroll cost escalates', () => {
    expect(rerollCost(0)).toBe(4)
    expect(rerollCost(2)).toBe(6)
  })

  it('packs offer 3 valid choices', () => {
    const run = newRun('packs')
    const cards = openCardPack(run)
    expect(cards.choices).toHaveLength(3)
    for (const ch of cards.choices) expect(['gilded', 'ruby', 'sapphire', 'lucky']).toContain(ch.enhancement)
    const gods = openGodPack(run)
    expect(gods.choices).toHaveLength(3)
    for (const id of gods.choices) expect(godRegistry[id]).toBeTruthy()
    const jokers = openJokerPack(run)
    expect(jokers.choices).toHaveLength(3)
    for (const id of jokers.choices) expect(jokerRegistry[id]).toBeTruthy()
  })

  it('sell value is half cost, rounded down, min 1', () => {
    expect(sellValue('jolly-roger')).toBe(2)
    expect(sellValue('ouroboros')).toBe(7)
  })
})
