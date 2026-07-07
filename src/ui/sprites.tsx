// Tiny pixel-art engine. Sprites are character grids ('.' = transparent);
// each char maps to a color via the sprite's palette merged over BASE_PALETTE.
// Rendered as crisp-edged SVG rects so they scale like real pixel art.

import type { SpriteDef } from './palette'
import { BASE_PALETTE } from './palette'

export function PixelSprite({
  sprite,
  size = 48,
  className,
}: {
  sprite: SpriteDef
  size?: number | string
  className?: string
}) {
  const grid = sprite.grid
  const h = grid.length
  const w = grid[0]?.length ?? 0
  const palette = sprite.palette ? { ...BASE_PALETTE, ...sprite.palette } : BASE_PALETTE
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden
      className={className}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    >
      {grid.flatMap((row, y) =>
        [...row].map((ch, x) => {
          if (ch === '.') return null
          const fill = palette[ch]
          if (!fill) return null
          return <rect key={`${x}.${y}`} x={x} y={y} width={1} height={1} fill={fill} />
        }),
      )}
    </svg>
  )
}

// ---------------------------------------------------------------- suit pips

const SUIT_GRIDS: Record<'spades' | 'hearts' | 'diamonds' | 'clubs', string[]> = {
  spades: [
    '...##...',
    '..####..',
    '.######.',
    '########',
    '########',
    '##.##.##',
    '...##...',
    '..####..',
  ],
  hearts: [
    '.##..##.',
    '########',
    '########',
    '########',
    '.######.',
    '..####..',
    '...##...',
    '........',
  ],
  diamonds: [
    '...##...',
    '..####..',
    '.######.',
    '########',
    '########',
    '.######.',
    '..####..',
    '...##...',
  ],
  clubs: [
    '..####..',
    '..####..',
    '##.##.##',
    '########',
    '##.##.##',
    '...##...',
    '..####..',
    '........',
  ],
}

// ------------------------------------------------------------- rank glyphs
// Hand-drawn 5×7 digits for card indices — the display font's 5 reads like an
// S at card sizes, so ranks get unambiguous pixel numerals instead.

const GLYPHS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  '0': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['#..#.', '#..#.', '#..#.', '#####', '...#.', '...#.', '...#.'],
  '5': ['#####', '#....', '#....', '####.', '....#', '....#', '####.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  J: ['.####', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
}

/** Renders a rank label ("A", "7", "10", "K") as crisp pixel digits */
export function RankGlyph({ label, color, size }: { label: string; color: string; size: number | string }) {
  const chars = [...label].filter((ch) => GLYPHS[ch])
  const w = chars.length * 6 - 1
  return (
    <svg
      viewBox={`0 0 ${w} 7`}
      shapeRendering="crispEdges"
      aria-hidden
      style={{ height: size, width: `calc(${typeof size === 'number' ? `${size}px` : size} * ${w / 7})` }}
    >
      {chars.flatMap((ch, ci) =>
        GLYPHS[ch].flatMap((row, y) =>
          [...row].map((px, x) =>
            px === '#' ? <rect key={`${ci}.${x}.${y}`} x={ci * 6 + x} y={y} width={1} height={1} fill={color} /> : null,
          ),
        ),
      )}
    </svg>
  )
}

export function SuitPip({
  suit,
  color,
  size = 16,
  className,
}: {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs'
  color: string
  size?: number | string
  className?: string
}) {
  const grid = SUIT_GRIDS[suit]
  return (
    <svg
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      aria-hidden
      className={className}
      style={{ width: size, height: size }}
    >
      {grid.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === '#' ? <rect key={`${x}.${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null,
        ),
      )}
    </svg>
  )
}
