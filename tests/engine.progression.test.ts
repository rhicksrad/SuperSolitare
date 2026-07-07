// Deck/stake unlock progression (sticker system): decks unlock in order after
// any win with the previous deck; stakes unlock per deck, one level at a time.

import { describe, expect, it } from 'vitest'
import { allDeckIds, deckSticker, STAKES, unlockedDeckIds, unlockedStakesFor } from '../src/engine/decks'

describe('unlock progression', () => {
  it('starts with only the first deck and its base stake', () => {
    expect(unlockedDeckIds({})).toEqual([allDeckIds[0]])
    expect(unlockedStakesFor('classic', {}).map((s) => s.level)).toEqual([0])
    expect(deckSticker('classic', {})).toBeNull()
  })

  it('a deck win unlocks exactly the next deck', () => {
    expect(unlockedDeckIds({ classic: 0 })).toEqual(allDeckIds.slice(0, 2))
    // skipping ahead is impossible: gilded beaten without classic still gates on classic
    expect(unlockedDeckIds({ gilded: 0 })).toEqual([allDeckIds[0]])
  })

  it('stakes unlock per deck, one past the highest beaten', () => {
    expect(unlockedStakesFor('classic', { classic: 0 }).map((s) => s.level)).toEqual([0, 1])
    expect(unlockedStakesFor('classic', { classic: 1 }).map((s) => s.level)).toEqual([0, 1, 2])
    // another deck's wins don't raise this deck's ceiling
    expect(unlockedStakesFor('gilded', { classic: 2 }).map((s) => s.level)).toEqual([0])
    // never exceeds the defined stakes
    expect(unlockedStakesFor('classic', { classic: 99 }).length).toBe(STAKES.length)
  })

  it('stickers show the highest beaten stake for a deck', () => {
    expect(deckSticker('classic', { classic: 2 })?.name).toBe('Gold Stake')
    expect(deckSticker('classic', { classic: 0 })?.name).toBe('White Stake')
  })
})
