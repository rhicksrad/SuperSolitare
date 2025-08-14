import { describe, it, expect } from 'vitest'
import { roundConfig } from '../src/game/run'
import { initialKlondikeDeal } from '../src/game/deck'

describe('Initial Klondike deal', () => {
  it('deals 7 tableau columns with increasing size, top face-up', () => {
    const config = roundConfig(1)
    const { state } = initialKlondikeDeal('seed-initial-1', config)
    const tableau = state.piles.filter((p) => p.type === 'tableau')
    expect(tableau).toHaveLength(7)
    for (let i = 0; i < 7; i++) {
      const pile = tableau[i]
      expect(pile.cards.length).toBe(i + 1)
      expect(pile.cards[pile.cards.length - 1].faceUp).toBe(true)
      for (let j = 0; j < pile.cards.length - 1; j++) {
        expect(pile.cards[j].faceUp).toBe(false)
      }
    }
    const stock = state.piles.find((p) => p.id === 'stock')!
    const waste = state.piles.find((p) => p.id === 'waste')!
    expect(stock.type).toBe('stock')
    expect(waste.type).toBe('waste')
    // 52 total - (1+2+...+7)=28 => 24 in stock
    expect(stock.cards.length).toBe(24)
    expect(waste.cards.length).toBe(0)
  })
})


