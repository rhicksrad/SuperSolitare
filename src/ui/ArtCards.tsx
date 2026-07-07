// Card frames for jokers, god cards, vouchers, packs, and boss emblems — each
// renders its pixel sprite in a themed frame so every collectible reads as a
// real physical object: jokers are paper playing cards (a "J" card,
// Balatro-style), gods are gilded tarot cards, vouchers are punched tickets,
// packs are crimped foil pouches, bosses are seals.

import type { ReactNode } from 'react'
import { describeJoker, jokerRegistry, newJokerInstance } from '../engine/jokers'
import { godRegistry } from '../engine/gods'
import { bossRegistry } from '../engine/bosses'
import { voucherRegistry } from '../engine/vouchers'
import { PACK_META } from '../engine/shop'
import type { PackType } from '../engine/shop'
import type { JokerInstance } from '../engine/types'
import { EDITION_META } from '../engine/types'
import { bossArt, deckArt, godArt, jokerArt, MYSTERY_ART, packArt, voucherArt } from './art'
import { PixelSprite } from './sprites'

/** Shared "?" face for undiscovered collection entries */
function MysteryTip() {
  return (
    <div className="tip">
      <div className="font-bold mb-1">???</div>
      Not yet discovered — you&apos;ll unlock this entry when you encounter it in a run.
    </div>
  )
}

const RARITY_WINDOW: Record<string, string> = {
  common: 'radial-gradient(circle at 50% 30%, #3a4568, #202741 70%)',
  uncommon: 'radial-gradient(circle at 50% 30%, #1f5c46, #14273a 70%)',
  rare: 'radial-gradient(circle at 50% 30%, #274b8f, #17203f 70%)',
  legendary: 'radial-gradient(circle at 50% 30%, #5b2f8f, #241640 70%)',
}

export function JokerCard({
  joker,
  silenced,
  footer,
  tip,
  onClick,
  unknown,
}: {
  joker: JokerInstance | string
  silenced?: boolean
  footer?: ReactNode
  /** extra rows appended to the hover tooltip */
  tip?: ReactNode
  onClick?: () => void
  /** undiscovered: render as a "?" card */
  unknown?: boolean
}) {
  const instance = typeof joker === 'string' ? newJokerInstance(joker) : joker
  const def = jokerRegistry[instance.id]
  if (!def) return null
  const edition = typeof joker === 'string' ? undefined : joker.edition
  // render a real <button> when clickable; cast keeps prop-checking on the button shape
  const Tag = (onClick ? 'button' : 'div') as 'button'
  if (unknown) {
    return (
      <div className="pcard pcard-joker rarity-common has-tip" tabIndex={0}>
        <span className="pcard-index">J</span>
        <span className="pcard-index pcard-index-br">J</span>
        <div className="pcard-art pcard-art-joker" style={{ background: RARITY_WINDOW.common }}>
          <PixelSprite sprite={MYSTERY_ART} size="84%" className="pcard-sprite" />
        </div>
        <div className="pcard-name pcard-name-joker">???</div>
        <MysteryTip />
      </div>
    )
  }
  return (
    <Tag
      className={`pcard pcard-joker rarity-${def.rarity} ${edition ? `edition-${edition}` : ''} has-tip ${silenced ? 'pcard-silenced' : ''}`}
      tabIndex={0}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <span className="pcard-index" aria-hidden>
        J
      </span>
      <span className="pcard-index pcard-index-br" aria-hidden>
        J
      </span>
      <div className="pcard-art pcard-art-joker" style={{ background: RARITY_WINDOW[def.rarity] }}>
        <PixelSprite sprite={jokerArt(def.id)} size="84%" className="pcard-sprite" />
        <span className={`rarity-gem gem-${def.rarity}`} />
      </div>
      <div className="pcard-name pcard-name-joker">{def.name}</div>
      {footer}
      <div className="tip">
        <div className="font-bold mb-1">
          {def.name} <span className="capitalize text-slate-400">· {def.rarity}</span>
        </div>
        {describeJoker(instance)}
        {edition && (
          <div className={`mt-1 edition-text-${edition}`}>
            {EDITION_META[edition].name}: {EDITION_META[edition].description}
          </div>
        )}
        {silenced && <div className="mt-1 text-rose-300">Silenced this round!</div>}
        {tip}
      </div>
    </Tag>
  )
}

export function GodCard({
  id,
  footer,
  tip,
  onClick,
  unknown,
}: {
  id: string
  footer?: ReactNode
  tip?: ReactNode
  onClick?: () => void
  unknown?: boolean
}) {
  const def = godRegistry[id]
  if (!def) return null
  const Tag = (onClick ? 'button' : 'div') as 'button'
  if (unknown) {
    return (
      <div className="pcard pcard-god has-tip" tabIndex={0}>
        <div className="pcard-art pcard-art-god">
          <PixelSprite sprite={MYSTERY_ART} size="78%" className="pcard-sprite" />
        </div>
        <div className="pcard-name pcard-name-god">???</div>
        <div className="pcard-title">unknown god</div>
        <MysteryTip />
      </div>
    )
  }
  return (
    <Tag className="pcard pcard-god has-tip" tabIndex={0} onClick={onClick} type={onClick ? 'button' : undefined}>
      <div className="pcard-art pcard-art-god">
        <PixelSprite sprite={godArt(def.id)} size="78%" className="pcard-sprite" />
      </div>
      <div className="pcard-name pcard-name-god">{def.name}</div>
      <div className="pcard-title">{def.title}</div>
      {footer}
      <div className="tip">
        <div className="font-bold mb-1">
          {def.name}, {def.title}
        </div>
        {def.description}
        {tip}
      </div>
    </Tag>
  )
}

export function VoucherCard({
  id,
  redeemed,
  tip,
  onClick,
  unknown,
}: {
  id: string
  redeemed?: boolean
  tip?: ReactNode
  onClick?: () => void
  unknown?: boolean
}) {
  const def = voucherRegistry[id]
  if (!def) return null
  const Tag = (onClick ? 'button' : 'div') as 'button'
  if (unknown) {
    return (
      <div className="pcard pcard-voucher has-tip" tabIndex={0}>
        <div className="voucher-notch voucher-notch-l" aria-hidden />
        <div className="voucher-notch voucher-notch-r" aria-hidden />
        <div className="pcard-art pcard-art-voucher">
          <PixelSprite sprite={MYSTERY_ART} size="78%" className="pcard-sprite" />
        </div>
        <div className="pcard-name pcard-name-voucher">???</div>
        <div className="pcard-title pcard-title-voucher">voucher</div>
        <MysteryTip />
      </div>
    )
  }
  return (
    <Tag
      className={`pcard pcard-voucher has-tip ${redeemed ? 'pcard-redeemed' : ''}`}
      tabIndex={0}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <div className="voucher-notch voucher-notch-l" aria-hidden />
      <div className="voucher-notch voucher-notch-r" aria-hidden />
      <div className="pcard-art pcard-art-voucher">
        <PixelSprite sprite={voucherArt(def.id)} size="78%" className="pcard-sprite" />
      </div>
      <div className="pcard-name pcard-name-voucher">{def.name}</div>
      <div className="pcard-title pcard-title-voucher">{redeemed ? 'redeemed' : 'voucher'}</div>
      <div className="tip">
        <div className="font-bold mb-1">
          {def.name} <span className="text-purple-300">· voucher</span>
        </div>
        {def.description}
        <div className="mt-1 text-slate-400">Permanent for this run</div>
        {tip}
      </div>
    </Tag>
  )
}

export function PackCard({
  type,
  opened,
  tip,
  onClick,
}: {
  type: PackType
  opened?: boolean
  tip?: ReactNode
  onClick?: () => void
}) {
  const meta = PACK_META[type]
  const Tag = (onClick ? 'button' : 'div') as 'button'
  return (
    <Tag
      className={`pcard pcard-pack pack-theme-${type} has-tip ${opened ? 'pcard-opened' : ''}`}
      tabIndex={0}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <div className="pack-crimp" aria-hidden />
      <div className="pcard-art pcard-art-pack">
        <PixelSprite sprite={packArt(type)} size="78%" className="pcard-sprite" />
      </div>
      <div className="pcard-name pcard-name-pack">{meta.name}</div>
      <div className="pcard-title pcard-title-pack">{opened ? 'opened' : 'booster pack'}</div>
      <div className="pack-crimp pack-crimp-b" aria-hidden />
      <div className="tip">
        <div className="font-bold mb-1">
          {meta.name} <span className="text-sky-300">· booster</span>
        </div>
        {meta.description}
        {tip}
      </div>
    </Tag>
  )
}

export function BossEmblem({ id, size = 64, unknown }: { id: string; size?: number; unknown?: boolean }) {
  const def = bossRegistry[id]
  if (!def) return null
  return (
    <div
      className={`boss-emblem ${!unknown && def.finisher ? 'boss-emblem-finisher' : ''}`}
      style={{ width: size, height: size }}
    >
      <PixelSprite sprite={unknown ? MYSTERY_ART : bossArt(def.id)} size="72%" className="pcard-sprite" />
    </div>
  )
}

// ------------------------------------------------------------------ deck backs

const DECK_THEME: Record<string, { a: string; b: string; accent: string }> = {
  classic: { a: '#8d2540', b: '#5f1728', accent: 'rgba(255, 190, 61, 0.35)' },
  gilded: { a: '#8a651c', b: '#553d0e', accent: 'rgba(255, 235, 150, 0.4)' },
  merchant: { a: '#1d6e47', b: '#11402a', accent: 'rgba(255, 190, 61, 0.35)' },
  arcane: { a: '#54308a', b: '#2e1a4e', accent: 'rgba(216, 180, 255, 0.35)' },
  serpent: { a: '#456e1d', b: '#274011', accent: 'rgba(220, 255, 150, 0.35)' },
}

export function DeckBack({ id, width = 52, unknown }: { id: string; width?: number; unknown?: boolean }) {
  const t = (!unknown && DECK_THEME[id]) || { a: '#3a4256', b: '#232a3c', accent: 'rgba(255,255,255,0.14)' }
  return (
    <div
      className="deck-back"
      style={{
        width,
        height: Math.round(width * 1.4),
        backgroundImage: `repeating-linear-gradient(45deg, ${t.accent} 0 2px, transparent 2px 7px), repeating-linear-gradient(-45deg, ${t.accent} 0 2px, transparent 2px 7px), linear-gradient(180deg, ${t.a}, ${t.b})`,
      }}
    >
      <PixelSprite sprite={unknown ? MYSTERY_ART : deckArt(id)} size="62%" />
    </div>
  )
}
