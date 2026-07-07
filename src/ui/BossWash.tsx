// Boss-aware table lighting: during a boss round a fixed wash layer fades in
// behind the UI, tinting the felt in that boss's color (The Hex bathes the
// table purple, The Toll pulls it cold blue, finishers go dark). The last
// boss's tint is kept through the fade-out so the color doesn't snap.

import { useRef } from 'react'
import { useGame } from '../state/store'

const BOSS_TINT: Record<string, string> = {
  'the-wall': 'rgba(90, 100, 132, 0.50)',
  'the-drought': 'rgba(178, 90, 29, 0.45)',
  'the-loop': 'rgba(63, 168, 184, 0.40)',
  'the-crimson': 'rgba(181, 46, 60, 0.50)',
  'the-court': 'rgba(201, 134, 30, 0.45)',
  'the-weight': 'rgba(58, 66, 86, 0.60)',
  'the-flood': 'rgba(42, 95, 196, 0.45)',
  'the-toll': 'rgba(79, 156, 249, 0.40)',
  'the-silence': 'rgba(154, 167, 196, 0.30)',
  'the-veil': 'rgba(139, 147, 173, 0.40)',
  'the-hex': 'rgba(126, 63, 178, 0.50)',
  'the-fog': 'rgba(90, 110, 100, 0.45)',
  'the-anchor': 'rgba(35, 42, 69, 0.65)',
  'the-famine': 'rgba(42, 149, 96, 0.40)',
  'the-tithe-boss': 'rgba(255, 190, 61, 0.35)',
  // finishers get to be dramatic
  'the-house': 'rgba(126, 33, 54, 0.55)',
  'the-reaper': 'rgba(36, 22, 64, 0.70)',
  'the-eclipse': 'rgba(14, 16, 28, 0.80)',
}
const DEFAULT_TINT = 'rgba(122, 30, 52, 0.45)'

export function BossWash() {
  const bossId = useGame((s) => (s.screen === 'playing' && s.round?.bossId) || null)
  const lastBoss = useRef<string | null>(null)
  if (bossId) lastBoss.current = bossId
  const tint = BOSS_TINT[bossId ?? lastBoss.current ?? ''] ?? DEFAULT_TINT
  return (
    <div
      className="boss-wash"
      aria-hidden
      style={{
        opacity: bossId ? 1 : 0,
        background: `radial-gradient(1100px 700px at 50% -12%, ${tint}, transparent 62%), radial-gradient(1000px 640px at 50% 115%, ${tint}, transparent 58%)`,
      }}
    />
  )
}
