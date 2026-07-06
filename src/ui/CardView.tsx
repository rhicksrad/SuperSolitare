import type { Card } from '../engine/cards'
import { isRed, RANK_LABEL, SUIT_GLYPH } from '../engine/cards'
import type { EnhancementId } from '../engine/cards'

const ENH_BADGE: Record<EnhancementId, string> = {
  gilded: '✦',
  ruby: '◆',
  sapphire: '❖',
  lucky: '☘',
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
  return (
    <div
      data-card-id={trackId ? card.id : undefined}
      className={[
        'card card-face',
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
      <div className="absolute top-[4%] left-[8%] leading-none font-bold" style={{ fontSize: 'calc(var(--card-w) * 0.24)' }}>
        {RANK_LABEL[card.rank]}
        <div style={{ fontSize: 'calc(var(--card-w) * 0.22)' }}>{SUIT_GLYPH[card.suit]}</div>
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center opacity-90"
        style={{ fontSize: 'calc(var(--card-w) * 0.44)' }}
      >
        {SUIT_GLYPH[card.suit]}
      </div>
      {cursed ? (
        <div className="absolute bottom-[4%] right-[8%] font-bold" style={{ fontSize: 'calc(var(--card-w) * 0.2)', color: '#8b3ff2' }}>
          ☠
        </div>
      ) : (
        enhancement && (
          <div
            className="absolute bottom-[4%] right-[8%] font-bold"
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
