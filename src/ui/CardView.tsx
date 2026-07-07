import type { Card } from '../engine/cards'
import { ENHANCEMENTS, isRed, RANK_LABEL } from '../engine/cards'
import type { EnhancementId } from '../engine/cards'
import { FACE_ART } from './art'
import { PixelSprite, RankGlyph, SuitPip } from './sprites'

const RANK_NAME: Record<number, string> = { 1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King' }

function cardName(card: Card): string {
  const rank = RANK_NAME[card.rank] ?? String(card.rank)
  return `${rank} of ${card.suit[0].toUpperCase()}${card.suit.slice(1)}`
}

const ENH_BADGE: Record<EnhancementId, string> = {
  gilded: '✦',
  ruby: '◆',
  sapphire: '❖',
  lucky: '☘',
}

const RED = '#d92b3f'
const BLACK = '#232839'

// Standard playing-card pip layouts for ranks 2–10, as [x%, y%] pip centers.
// Pips below the midline render rotated 180°, like a real deck.
const L = 35
const C = 54
const R = 73
const PIP_LAYOUT: Record<number, [number, number][]> = {
  2: [
    [C, 22],
    [C, 78],
  ],
  3: [
    [C, 22],
    [C, 50],
    [C, 78],
  ],
  4: [
    [L, 22],
    [R, 22],
    [L, 78],
    [R, 78],
  ],
  5: [
    [L, 22],
    [R, 22],
    [C, 50],
    [L, 78],
    [R, 78],
  ],
  6: [
    [L, 22],
    [R, 22],
    [L, 50],
    [R, 50],
    [L, 78],
    [R, 78],
  ],
  7: [
    [L, 22],
    [R, 22],
    [C, 36],
    [L, 50],
    [R, 50],
    [L, 78],
    [R, 78],
  ],
  8: [
    [L, 22],
    [R, 22],
    [C, 36],
    [L, 50],
    [R, 50],
    [C, 64],
    [L, 78],
    [R, 78],
  ],
  // 9 and 10 sit a notch inward so the four-row grid clears the corner indices
  9: [
    [38, 24],
    [70, 24],
    [38, 41],
    [70, 41],
    [C, 50],
    [38, 59],
    [70, 59],
    [38, 76],
    [70, 76],
  ],
  10: [
    [38, 24],
    [70, 24],
    [C, 32.5],
    [38, 41],
    [70, 41],
    [38, 59],
    [70, 59],
    [C, 67.5],
    [38, 76],
    [70, 76],
  ],
}

function CardFacePips({ rank, suit, color }: { rank: number; suit: Card['suit']; color: string }) {
  if (rank === 1) {
    // ace: one big center pip
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: '6%' }}>
        <SuitPip suit={suit} color={color} size="calc(var(--card-w) * 0.42)" />
      </div>
    )
  }
  if (rank >= 11) {
    // court portrait, robes tinted by suit color
    const face = rank === 11 ? 'jack' : rank === 12 ? 'queen' : 'king'
    const sprite = { ...FACE_ART[face], palette: { ...FACE_ART[face].palette, A: color } }
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: '8%', paddingLeft: '10%' }}>
        <PixelSprite sprite={sprite} size="calc(var(--card-w) * 0.62)" />
      </div>
    )
  }
  const pips = PIP_LAYOUT[rank] ?? []
  return (
    <>
      {pips.map(([x, y], i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: `translate(-50%, -50%)${y > 50 ? ' rotate(180deg)' : ''}`,
          }}
        >
          <SuitPip suit={suit} color={color} size="calc(var(--card-w) * 0.16)" />
        </div>
      ))}
    </>
  )
}

export function CardView({
  card,
  enhancement,
  cursed,
  selected,
  selectable,
  onClick,
  onDoubleClick,
  onDragStart,
  popIn,
  trackId,
}: {
  card: Card
  enhancement?: EnhancementId
  cursed?: boolean
  selected?: boolean
  selectable?: boolean
  onClick?: (e: React.MouseEvent) => void
  onDoubleClick?: (e: React.MouseEvent) => void
  onDragStart?: (e: React.DragEvent) => void
  popIn?: boolean
  /** set to enable FLIP move animation for this card */
  trackId?: boolean
}) {
  if (!card.faceUp) {
    return <div className="card card-back" aria-label="Face-down card" data-card-id={trackId ? card.id : undefined} />
  }
  const red = isRed(card.suit)
  const suitColor = red ? RED : BLACK
  return (
    <div
      data-card-id={trackId ? card.id : undefined}
      className={[
        'card card-face has-tip-slow',
        red ? 'red' : '',
        selectable ? 'card-selectable cursor-pointer' : '',
        selected ? 'card-selected' : '',
        cursed ? 'enh-cursed' : enhancement ? `enh-${enhancement}` : '',
        popIn ? 'card-pop-in' : '',
      ].join(' ')}
      role="button"
      tabIndex={selectable ? 0 : -1}
      aria-label={`${RANK_LABEL[card.rank]} of ${card.suit}${enhancement ? `, ${enhancement}` : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onClick) onClick(e as unknown as React.MouseEvent)
      }}
    >
      <div className="absolute top-[4%] left-[7%] flex flex-col items-center gap-[2px]">
        <RankGlyph label={RANK_LABEL[card.rank]} color={suitColor} size="calc(var(--card-w) * 0.18)" />
        {card.rank >= 11 && <SuitPip suit={card.suit} color={suitColor} size="calc(var(--card-w) * 0.15)" />}
      </div>
      <div className="absolute bottom-[4%] right-[7%] flex flex-col items-center gap-[2px] rotate-180">
        <RankGlyph label={RANK_LABEL[card.rank]} color={suitColor} size="calc(var(--card-w) * 0.18)" />
        {card.rank >= 11 && <SuitPip suit={card.suit} color={suitColor} size="calc(var(--card-w) * 0.15)" />}
      </div>
      <CardFacePips rank={card.rank} suit={card.suit} color={suitColor} />
      <div className="tip-slow">
        <div className="font-bold">{cardName(card)}</div>
        {enhancement && !cursed && (
          <div className="mt-1">
            <span className="font-bold" style={{ color: enhancement === 'ruby' ? '#ff6a77' : enhancement === 'sapphire' ? '#78b4ff' : enhancement === 'gilded' ? '#ffd166' : '#57e39a' }}>
              {ENHANCEMENTS[enhancement].name}
            </span>
            : {ENHANCEMENTS[enhancement].description}
          </div>
        )}
        {cursed && <div className="mt-1 text-purple-300">Cursed this round: 0 chips, −2 mult</div>}
        {!enhancement && !cursed && <div className="text-slate-500 mt-1">No enhancements</div>}
      </div>
      {cursed ? (
        <div
          className="absolute bottom-[4%] left-[8%] font-bold"
          style={{ fontSize: 'calc(var(--card-w) * 0.2)', color: '#8b3ff2' }}
        >
          ☠
        </div>
      ) : (
        enhancement && (
          <div
            className="absolute bottom-[4%] left-[8%] font-bold"
            style={{
              fontSize: 'calc(var(--card-w) * 0.2)',
              color:
                enhancement === 'gilded'
                  ? '#b8860b'
                  : enhancement === 'ruby'
                    ? '#d43a4b'
                    : enhancement === 'sapphire'
                      ? '#3c74e0'
                      : '#2fa35c',
            }}
          >
            {ENH_BADGE[enhancement]}
          </div>
        )
      )}
    </div>
  )
}
