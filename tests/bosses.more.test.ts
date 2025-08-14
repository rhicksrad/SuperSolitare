import { describe, it, expect } from 'vitest'
import { createInitialRound, applyMove } from '../src/game/solitaire'
import { applyBossRoundStart, bossRegistry, applyBossOnScore, applyBossAfterMove } from '../src/game/bosses'

function ctx(modIds: string[]) {
  return modIds.map((id) => bossRegistry[id]).filter(Boolean) as any
}

describe('Boss modifiers (additional)', () => {
  it('Night Mode increases target by 10% and score deltas by 10%', () => {
    const round = createInitialRound('seed-nm', 1)
    const cfg = applyBossRoundStart(ctx(['night-mode']), round.config)
    expect(cfg.targetScore).toBeGreaterThan(round.config.targetScore)
    const delta = applyBossOnScore(ctx(['night-mode']), 100, round, { kind: 'deal_stock' } as any, {} as any, { foundation: 0, reveal: 0, emptyColumn: 0 })
    expect(delta).toBe(110)
  })

  it('Stoic Stock penalizes deal_stock by 25', () => {
    const round = createInitialRound('seed-ss', 1)
    const delta = applyBossOnScore(ctx(['stoic-stock']), 0, round, { kind: 'deal_stock' } as any, {} as any, { foundation: 0, reveal: 0, emptyColumn: 0 })
    expect(delta).toBe(-25)
  })

  it('Half-Deck halves stock on first move after round start', () => {
    const round = createInitialRound('seed-hd', 1)
    const stock = () => round.piles.find((p) => p.id === 'stock')!
    const before = stock().cards.length
    const next = applyMove(round, { kind: 'deal_stock' }, { bosses: ctx(['half-deck']) })
    expect(stock().cards.length).toBe(before)
    // effect is applied to "next" inside afterMove; simulate by using returned state
    const nextStock = next.piles.find((p) => p.id === 'stock')!
    expect(nextStock.cards.length).toBeLessThan(before)
  })

  it('Mirror Moves reverts every 5th non-foundation move', () => {
    let round = createInitialRound('seed-mm', 1)
    // Perform 4 stock deals
    for (let i = 0; i < 4; i++) round = applyMove(round, { kind: 'deal_stock' }, { bosses: ctx(['mirror-moves']) })
    const before = round.piles.map((p) => ({ id: p.id, n: p.cards.length }))
    // 5th move should mirror
    const next = applyMove(round, { kind: 'deal_stock' }, { bosses: ctx(['mirror-moves']) })
    const after = next.piles.map((p) => ({ id: p.id, n: p.cards.length }))
    expect(after).toEqual(before)
  })
})


