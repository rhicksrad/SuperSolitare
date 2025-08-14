import type { Card as TCard } from '../../game/types'

function rankLabel(rank: number): string {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return String(rank)
}

function suitLabel(suit: TCard['suit']): string {
  // Unicode suit glyphs for a classic look
  switch (suit) {
    case 'hearts': return '♥'
    case 'diamonds': return '♦'
    case 'spades': return '♠'
    case 'clubs': return '♣'
  }
}

export default function Card({ card, small = false, isSelected = false }: { card: TCard; small?: boolean; isSelected?: boolean }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
  const colorBlindMode = document.documentElement.getAttribute('data-color-blind') === 'true'
  const size = small ? 'w-12 h-18' : 'w-16 h-22'
  const shadow = isSelected ? 'shadow-[0_6px_20px_rgba(56,189,248,0.35)]' : 'shadow-[0_2px_10px_rgba(0,0,0,0.25)]'
  if (!card.faceUp) {
    // Blue back
    return (
      <div className={`relative ${size} rounded-md border border-blue-700 bg-blue-800 card-pop overflow-hidden`} aria-label="Face-down card">
        <div className="absolute inset-0 opacity-70" style={{ background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0, rgba(255,255,255,0.12) 6px, rgba(0,0,0,0.12) 6px, rgba(0,0,0,0.12) 12px)' }} />
      </div>
    )
  }
  return (
    <div className={`relative ${size} rounded-md border ${isRed ? 'border-rose-400' : 'border-slate-300'} bg-white text-slate-900 card-pop ${isSelected ? 'ring-2 ring-sky-400' : ''} transition-transform duration-150 hover:-translate-y-0.5 ${shadow}`} aria-label={`${rankLabel(card.rank)} of ${card.suit}`}>
      <div className={`absolute inset-1 flex flex-col justify-between text-xs ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        <div className="leading-none">
          <div className="font-bold text-[12px]">{rankLabel(card.rank)}</div>
          <div className="leading-none flex items-center gap-0.5">
            <span>{suitLabel(card.suit)}</span>
            {colorBlindMode && (
              <span aria-hidden className={`inline-block w-2 h-2 rounded-full ${card.suit === 'hearts' ? 'bg-rose-500' : card.suit === 'diamonds' ? 'bg-amber-500' : card.suit === 'spades' ? 'bg-slate-700' : 'bg-emerald-600'}`} />
            )}
          </div>
        </div>
        {/* center suit mark */}
        <div className="absolute inset-0 flex items-center justify-center select-none" aria-hidden>
          <div className={`${isRed ? 'text-red-600' : 'text-slate-900'} ${small ? 'text-lg' : 'text-3xl'}`}>{suitLabel(card.suit)}</div>
        </div>
        <div className="self-end opacity-70 text-[10px] rotate-180">{rankLabel(card.rank)}{suitLabel(card.suit)}</div>
      </div>
    </div>
  )
}


