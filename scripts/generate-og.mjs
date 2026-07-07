// Generates the SEO raster assets (og.png, apple-touch-icon.png, icon-512.png)
// into public/ at build time. Pure Node — the PNG encoder uses node:zlib, the
// art is pixel grids in the same spirit as src/ui/art.ts. Outputs are
// gitignored so the repo keeps zero binary image assets.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

// ---------------------------------------------------------------------------
// PNG encoding (RGBA, no filtering)
// ---------------------------------------------------------------------------

const CRC_TABLE = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c
}

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------------------
// Tiny pixel canvas
// ---------------------------------------------------------------------------

function hex(color) {
  const n = parseInt(color.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

class Canvas {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.data = Buffer.alloc(w * h * 4)
  }
  rect(x, y, w, h, color, alpha = 255) {
    const [r, g, b] = hex(color)
    const x0 = Math.max(0, Math.round(x))
    const y0 = Math.max(0, Math.round(y))
    const x1 = Math.min(this.w, Math.round(x + w))
    const y1 = Math.min(this.h, Math.round(y + h))
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const i = (py * this.w + px) * 4
        this.data[i] = r
        this.data[i + 1] = g
        this.data[i + 2] = b
        this.data[i + 3] = alpha
      }
    }
  }
  // Rounded rect with corner radius of one "pixel" unit s
  card(x, y, w, h, s, color) {
    this.rect(x + s, y, w - 2 * s, h, color)
    this.rect(x, y + s, w, h - 2 * s, color)
  }
  grid(rows, x, y, s, color) {
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] === '#') this.rect(x + rx * s, y + ry * s, s, s, color)
      }
    })
  }
  png() {
    return encodePng(this.w, this.h, this.data)
  }
}

// ---------------------------------------------------------------------------
// 5x7 pixel font + suit sprites
// ---------------------------------------------------------------------------

const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
}

const SUITS = {
  spade: ['..#..', '.###.', '#####', '#####', '..#..', '.###.'],
  heart: ['.#.#.', '#####', '#####', '.###.', '..#..', '.....'],
  diamond: ['..#..', '.###.', '#####', '.###.', '..#..', '.....'],
  club: ['.###.', '.###.', '#####', '#####', '..#..', '.###.'],
}

function textWidth(text, s) {
  return text.length * 6 * s - s
}

function drawText(cv, text, x, y, s, color) {
  let cx = x
  for (const ch of text) {
    if (ch !== ' ') {
      const glyph = FONT[ch]
      if (!glyph) throw new Error(`No glyph for '${ch}'`)
      cv.grid(glyph, cx, y, s, color)
    }
    cx += 6 * s
  }
  return cx
}

// ---------------------------------------------------------------------------
// Palette (matches src/index.css / src/ui/palette.ts vibes)
// ---------------------------------------------------------------------------

const BG = '#0a0e19'
const FRAME = '#232a45'
const GOLD = '#ffbe3d'
const WHITE = '#f1f5f9'
const SLATE = '#9fb0c8'
const CHIPS = '#4f9cf9'
const MULT = '#ff6a77'
const PAPER = '#f2ecdc'
const INK = '#1c1408'
const RED = '#c22f3e'

function drawPlayingCard(cv, x, y, w, h, s, suit, suitColor) {
  cv.rect(x + s, y + s * 2, w, h, '#000000', 90) // soft shadow
  cv.card(x, y, w, h, s, INK)
  cv.card(x + s, y + s, w - 2 * s, h - 2 * s, s, PAPER)
  const pip = SUITS[suit]
  const pipS = Math.round(s * 2.2)
  cv.grid(pip, x + w / 2 - 2.5 * pipS, y + h / 2 - 2.5 * pipS, pipS, suitColor)
  cv.grid(pip, x + s * 2.5, y + s * 2.5, s, suitColor) // corner index
}

// ---------------------------------------------------------------------------
// og.png — 1200x630 social card
// ---------------------------------------------------------------------------

function makeOg() {
  const cv = new Canvas(1200, 630)
  cv.rect(0, 0, 1200, 630, BG)

  // frame with gold corner ticks
  const f = 18
  cv.rect(f, f, 1200 - 2 * f, 6, FRAME)
  cv.rect(f, 630 - f - 6, 1200 - 2 * f, 6, FRAME)
  cv.rect(f, f, 6, 630 - 2 * f, FRAME)
  cv.rect(1200 - f - 6, f, 6, 630 - 2 * f, FRAME)
  for (const [cx, cy] of [[f, f], [1200 - f - 24, f], [f, 630 - f - 24], [1200 - f - 24, 630 - f - 24]]) {
    cv.rect(cx, cy, 24, 24, GOLD)
  }

  // title: SUPER in white, SOLITAIRE in gold
  const ts = 11
  const titleW = textWidth('SUPERSOLITAIRE', ts)
  let tx = (1200 - titleW) / 2
  tx = drawText(cv, 'SUPER', tx, 78, ts, WHITE)
  drawText(cv, 'SOLITAIRE', tx, 78, ts, GOLD)

  // tagline with chips/mult colors
  const gs = 4
  const segs = [
    ['CHAIN ', SLATE],
    ['CHIPS', CHIPS],
    [' X ', WHITE],
    ['MULT', MULT],
    [' - SURVIVE 8 ANTES', SLATE],
  ]
  const tagW = textWidth(segs.map((seg) => seg[0]).join(''), gs)
  let gx = (1200 - tagW) / 2
  for (const [text, color] of segs) gx = drawText(cv, text, gx, 208, gs, color)

  // fanned suit cards
  const cw = 128
  const ch = 180
  const step = 112
  const suits = [
    ['spade', INK],
    ['heart', RED],
    ['diamond', RED],
    ['club', INK],
  ]
  const rowW = cw + step * 3
  const x0 = (1200 - rowW) / 2
  const lift = [26, 0, 8, 32]
  suits.forEach(([suit, color], i) => {
    drawPlayingCard(cv, x0 + i * step, 296 + lift[i], cw, ch, 6, suit, color)
  })

  // footer
  const fs = 3
  const foot = 'A ROGUELIKE DECKBUILDER ON KLONDIKE - FREE IN YOUR BROWSER'
  drawText(cv, foot, (1200 - textWidth(foot, fs)) / 2, 556, fs, SLATE)

  return cv.png()
}

// ---------------------------------------------------------------------------
// App icons — dark tile, gold-edged card, red heart
// ---------------------------------------------------------------------------

function makeIcon(size) {
  const cv = new Canvas(size, size)
  const u = size / 64 // logical pixel
  cv.card(0, 0, size, size, 6 * u, BG)
  cv.card(3 * u, 3 * u, size - 6 * u, size - 6 * u, 5 * u, FRAME)
  cv.card(6 * u, 6 * u, size - 12 * u, size - 12 * u, 4 * u, BG)

  const cw = 34 * u
  const chh = 46 * u
  const cx = (size - cw) / 2
  const cy = (size - chh) / 2
  const s = 2.4 * u
  cv.rect(cx + s, cy + s * 1.5, cw, chh, '#000000', 110)
  cv.card(cx - s, cy - s, cw + 2 * s, chh + 2 * s, s, GOLD)
  cv.card(cx, cy, cw, chh, s, INK)
  cv.card(cx + s, cy + s, cw - 2 * s, chh - 2 * s, s, PAPER)
  const pipS = Math.round(4.4 * u)
  cv.grid(SUITS.heart, cx + cw / 2 - 2.5 * pipS, cy + chh / 2 - 2.2 * pipS, pipS, RED)
  return cv.png()
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'og.png'), makeOg())
writeFileSync(join(OUT_DIR, 'icon-512.png'), makeIcon(512))
writeFileSync(join(OUT_DIR, 'apple-touch-icon.png'), makeIcon(180))
console.log('Generated public/og.png, public/icon-512.png, public/apple-touch-icon.png')
