// Guards the pixel-art registry: every joker/god/boss has a sprite, every
// sprite is a well-formed rectangle, and every pixel resolves to a color.

import { describe, expect, it } from 'vitest'
import { bossRegistry } from '../src/engine/bosses'
import { allDeckIds } from '../src/engine/decks'
import { allGodIds } from '../src/engine/gods'
import { allJokerIds } from '../src/engine/jokers'
import { allVoucherIds } from '../src/engine/vouchers'
import { BOSS_ART, DECK_ART, FACE_ART, GOD_ART, JOKER_ART, MYSTERY_ART, VOUCHER_ART } from '../src/ui/art'
import type { SpriteDef } from '../src/ui/palette'
import { BASE_PALETTE } from '../src/ui/palette'

function validateSprite(name: string, def: SpriteDef) {
  const palette = { ...BASE_PALETTE, ...def.palette }
  expect(def.grid.length, `${name}: grid height`).toBeGreaterThanOrEqual(8)
  const width = def.grid[0].length
  for (const [y, row] of def.grid.entries()) {
    expect(row.length, `${name}: row ${y} width (got "${row}")`).toBe(width)
    for (const ch of row) {
      if (ch === '.') continue
      expect(palette[ch], `${name}: row ${y} has unmapped pixel '${ch}'`).toBeTruthy()
    }
  }
}

describe('pixel art registry', () => {
  it('covers every joker', () => {
    for (const id of allJokerIds) {
      expect(JOKER_ART[id], `missing joker art: ${id}`).toBeTruthy()
    }
  })

  it('covers every god card', () => {
    for (const id of allGodIds) {
      expect(GOD_ART[id], `missing god art: ${id}`).toBeTruthy()
    }
  })

  it('covers every boss', () => {
    for (const id of Object.keys(bossRegistry)) {
      expect(BOSS_ART[id], `missing boss art: ${id}`).toBeTruthy()
    }
  })

  it('covers every voucher', () => {
    for (const id of allVoucherIds) {
      expect(VOUCHER_ART[id], `missing voucher art: ${id}`).toBeTruthy()
    }
  })

  it('covers every deck', () => {
    for (const id of allDeckIds) {
      expect(DECK_ART[id], `missing deck art: ${id}`).toBeTruthy()
    }
  })

  it('all sprites are well-formed rectangles with mapped colors', () => {
    const all = { ...JOKER_ART, ...GOD_ART, ...BOSS_ART, ...VOUCHER_ART, ...FACE_ART, ...DECK_ART, mystery: MYSTERY_ART }
    for (const [id, def] of Object.entries(all)) {
      validateSprite(id, def)
    }
  })
})
