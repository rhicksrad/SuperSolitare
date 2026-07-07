import { describe, expect, it } from 'vitest'
import { buildDeck, cardChips, isRed } from '../src/engine/cards'
import { applyMove, dealRound, isLegalMove } from '../src/engine/klondike'
import type { RoundState } from '../src/engine/klondike'
import { Rng } from '../src/engine/rng'
import { BASE_RULES } from '../src/engine/run'

function freshRound(seed = 'test'): RoundState {
  return dealRound(new Rng(seed), buildDeck(), {
    rules: { ...BASE_RULES },
    blind: 'small',
    bossId: null,
    target: 300,
  })
}

describe('rng', () => {
  it('is deterministic and serializable', () => {
    const a = new Rng('seed-1')
    const seq = [a.next(), a.next(), a.next()]
    const b = new Rng('seed-1')
    expect([b.next(), b.next(), b.next()]).toEqual(seq)
    const c = new Rng({ ...b.state })
    expect(c.next()).toBe(b.next())
  })
})

describe('deal', () => {
  it('deals a classic klondike layout', () => {
    const r = freshRound()
    expect(r.tableau.map((c) => c.length)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(r.stock.length).toBe(24)
    for (const col of r.tableau) {
      expect(col[col.length - 1].faceUp).toBe(true)
      for (const c of col.slice(0, -1)) expect(c.faceUp).toBe(false)
    }
  })

  it('is deterministic per seed', () => {
    const a = freshRound('abc')
    const b = freshRound('abc')
    expect(a.tableau).toEqual(b.tableau)
    const c = freshRound('other')
    expect(JSON.stringify(c.tableau)).not.toBe(JSON.stringify(a.tableau))
  })
})

describe('moves', () => {
  it('deals from stock, breaks streak, and recycles with a budget', () => {
    const r = freshRound()
    r.streak = 4
    const { state: afterDeal } = applyMove(r, { kind: 'deal_stock' })
    expect(afterDeal.waste.length).toBe(3)
    expect(afterDeal.streak).toBe(0)
    // exhaust stock: 24 cards / 3 per deal = 8 deals
    let cur = r
    for (let i = 0; i < 8; i++) cur = applyMove(cur, { kind: 'deal_stock' }).state
    expect(cur.stock.length).toBe(0)
    expect(isLegalMove(cur, { kind: 'deal_stock' }).ok).toBe(false)
    expect(isLegalMove(cur, { kind: 'recycle' }).ok).toBe(true)
    const recycled = applyMove(cur, { kind: 'recycle' }).state
    expect(recycled.stock.length).toBe(24)
    expect(recycled.waste.length).toBe(0)
    expect(recycled.recyclesLeft).toBe(BASE_RULES.recycles - 1)
  })

  it('discards burn the top waste card and consume the budget', () => {
    let r = freshRound()
    r = applyMove(r, { kind: 'deal_stock' }).state
    const top = r.waste[r.waste.length - 1]
    const { state: next, events } = applyMove(r, { kind: 'discard_waste' })
    expect(next.burned[0].id).toBe(top.id)
    expect(next.discardsLeft).toBe(BASE_RULES.discards - 1)
    expect(events.some((e) => e.type === 'discard')).toBe(true)
  })

  it('rejects illegal tableau stacking and foundation plays', () => {
    const r = freshRound()
    // brute-force check every t2t combination agrees with the color/rank rule
    for (let a = 0; a < 7; a++) {
      for (let b = 0; b < 7; b++) {
        if (a === b) continue
        const from = r.tableau[a]
        const idx = from.length - 1
        const moving = from[idx]
        const target = r.tableau[b][r.tableau[b].length - 1]
        const legal = isLegalMove(r, { kind: 'tableau_to_tableau', from: `t${a}` as const, index: idx, to: `t${b}` as const })
        const expected = target.rank === moving.rank + 1 && isRed(target.suit) !== isRed(moving.suit)
        expect(legal.ok).toBe(expected)
      }
    }
    // aces only on empty foundations
    for (let t = 0; t < 7; t++) {
      const top = r.tableau[t][r.tableau[t].length - 1]
      const legal = isLegalMove(r, { kind: 'tableau_to_foundation', from: `t${t}` as const, to: 'f0' })
      expect(legal.ok).toBe(top.rank === 1)
    }
  })

  it('flips the newly exposed card and reports reveal + empty column events', () => {
    const r = freshRound()
    // Construct a controlled state: t1 has facedown + faceup movable onto t2
    r.tableau[0] = []
    r.tableau[1] = [
      { id: 'C-9', suit: 'clubs', rank: 9, faceUp: false },
      { id: 'H-5', suit: 'hearts', rank: 5, faceUp: true },
    ]
    r.tableau[2] = [{ id: 'S-6', suit: 'spades', rank: 6, faceUp: true }]
    const { state: next, events } = applyMove(r, { kind: 'tableau_to_tableau', from: 't1', index: 1, to: 't2' })
    expect(next.tableau[1][0].faceUp).toBe(true)
    expect(events.some((e) => e.type === 'reveal')).toBe(true)

    // moving the whole remaining pile empties the column
    const r2 = next
    r2.tableau[3] = [{ id: 'D-10', suit: 'diamonds', rank: 10, faceUp: true }]
    const out = applyMove(r2, { kind: 'tableau_to_tableau', from: 't1', index: 0, to: 't3' })
    expect(out.state.tableau[1].length).toBe(0)
    expect(out.events.some((e) => e.type === 'empty_column')).toBe(true)
  })

  it('does not award empty_column for shuttling a whole pile between empty columns', () => {
    const r = freshRound()
    r.tableau[0] = [{ id: 'S-13', suit: 'spades', rank: 13, faceUp: true }]
    r.tableau[1] = []
    // king onto an empty column: source empties but destination fills — net zero
    const out = applyMove(r, { kind: 'tableau_to_tableau', from: 't0', index: 0, to: 't1' })
    expect(out.state.tableau[0].length).toBe(0)
    expect(out.events.some((e) => e.type === 'empty_column')).toBe(false)
    expect(out.state.stats.emptiedColumns).toBe(0)
    // and shuttling back scores nothing either
    const back = applyMove(out.state, { kind: 'tableau_to_tableau', from: 't1', index: 0, to: 't0' })
    expect(back.events.some((e) => e.type === 'empty_column')).toBe(false)
  })

  it('still awards empty_column when the whole pile lands on a non-empty column', () => {
    const r = freshRound()
    r.tableau[0] = [{ id: 'H-12', suit: 'hearts', rank: 12, faceUp: true }]
    r.tableau[1] = [{ id: 'S-13', suit: 'spades', rank: 13, faceUp: true }]
    const out = applyMove(r, { kind: 'tableau_to_tableau', from: 't0', index: 0, to: 't1' })
    expect(out.events.some((e) => e.type === 'empty_column')).toBe(true)
  })

  it('tracks the waste fan like real deal-3: shrinks per play, resets per deal', () => {
    let r = freshRound()
    expect(r.wasteFan).toBe(0)
    r = applyMove(r, { kind: 'deal_stock' }).state
    expect(r.wasteFan).toBe(3)
    r = applyMove(r, { kind: 'discard_waste' }).state
    expect(r.wasteFan).toBe(2)
    // make the waste top playable somewhere to exercise waste_to_tableau
    const top = r.waste[r.waste.length - 1]
    r.tableau[0] =
      top.rank === 13
        ? [] // kings go to an empty column
        : [{ id: 'X-test', suit: isRed(top.suit) ? 'spades' : 'hearts', rank: top.rank + 1, faceUp: true }]
    r = applyMove(r, { kind: 'waste_to_tableau', to: 't0' }).state
    expect(r.wasteFan).toBe(1)
    r = applyMove(r, { kind: 'deal_stock' }).state
    expect(r.wasteFan).toBe(3)
    // recycle clears the fan
    let cur = r
    while (cur.stock.length > 0) cur = applyMove(cur, { kind: 'deal_stock' }).state
    cur = applyMove(cur, { kind: 'recycle' }).state
    expect(cur.wasteFan).toBe(0)
  })
})

describe('cardChips', () => {
  it('values aces high and faces at 10', () => {
    expect(cardChips(1)).toBe(11)
    expect(cardChips(7)).toBe(7)
    expect(cardChips(13)).toBe(10)
  })
})
