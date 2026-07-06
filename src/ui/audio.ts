// Zero-asset audio: everything is synthesized with WebAudio.
// SFX are short envelopes on oscillators; music is a slow generative loop.
// The AudioContext is created lazily on the first user gesture (browser policy).

let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicGain: GainNode | null = null
let musicTimer: number | null = null

let sfxEnabled = true
let musicEnabled = true

export function configureAudio(opts: { sfx: boolean; music: boolean }) {
  sfxEnabled = opts.sfx
  musicEnabled = opts.music
  if (!musicEnabled) stopMusic()
  else if (ctx) startMusic()
}

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Call once on any user gesture to unlock audio + start music */
export function unlockAudio() {
  const c = ensureCtx()
  if (c && musicEnabled) startMusic()
}

// ---------------------------------------------------------------------------
// SFX primitives

function tone(
  freq: number,
  opts: {
    type?: OscillatorType
    dur?: number
    gain?: number
    when?: number
    slideTo?: number
    attack?: number
  } = {},
) {
  if (!sfxEnabled) return
  const c = ensureCtx()
  if (!c || !master) return
  const { type = 'triangle', dur = 0.15, gain = 0.25, when = 0, slideTo, attack = 0.005 } = opts
  const t0 = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  osc.connect(g).connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

function noise(opts: { dur?: number; gain?: number; when?: number; highpass?: number } = {}) {
  if (!sfxEnabled) return
  const c = ensureCtx()
  if (!c || !master) return
  const { dur = 0.08, gain = 0.12, when = 0, highpass = 2000 } = opts
  const t0 = c.currentTime + when
  const len = Math.ceil(c.sampleRate * dur)
  const buffer = c.createBuffer(1, len, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = highpass
  const g = c.createGain()
  g.gain.value = gain
  src.connect(filter).connect(g).connect(master)
  src.start(t0)
}

// pentatonic ladder for streak-pitched scoring plucks
const LADDER = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0, 880.0, 1046.5, 1174.7, 1318.5]

export const sfx = {
  click: () => tone(880, { type: 'square', dur: 0.04, gain: 0.06 }),
  deal: () => {
    noise({ dur: 0.06, gain: 0.1, highpass: 1200 })
    tone(220, { type: 'triangle', dur: 0.05, gain: 0.08 })
  },
  place: () => {
    noise({ dur: 0.04, gain: 0.08, highpass: 800 })
    tone(160, { type: 'sine', dur: 0.07, gain: 0.12 })
  },
  select: () => tone(660, { type: 'triangle', dur: 0.05, gain: 0.07 }),
  error: () => tone(160, { type: 'sawtooth', dur: 0.12, gain: 0.1, slideTo: 110 }),
  /** foundation play — pitch climbs with streak */
  play: (streak: number) => {
    const note = LADDER[Math.min(streak, LADDER.length - 1)]
    tone(note, { type: 'triangle', dur: 0.18, gain: 0.22 })
    tone(note * 2, { type: 'sine', dur: 0.12, gain: 0.08, when: 0.02 })
  },
  reveal: () => tone(1318, { type: 'sine', dur: 0.1, gain: 0.08, slideTo: 1760 }),
  emptyColumn: () => {
    tone(392, { dur: 0.2, gain: 0.15 })
    tone(494, { dur: 0.2, gain: 0.15, when: 0.05 })
    tone(587, { dur: 0.25, gain: 0.15, when: 0.1 })
  },
  bigMult: () => {
    tone(130.8, { type: 'sawtooth', dur: 0.3, gain: 0.14 })
    tone(196, { type: 'sawtooth', dur: 0.3, gain: 0.12, when: 0.02 })
    noise({ dur: 0.2, gain: 0.08, highpass: 4000 })
  },
  boardClear: () => {
    ;[523.3, 659.3, 784.0, 1046.5].forEach((f, i) => tone(f, { dur: 0.35, gain: 0.18, when: i * 0.09 }))
  },
  money: () => {
    tone(1567, { type: 'square', dur: 0.06, gain: 0.08 })
    tone(2093, { type: 'square', dur: 0.08, gain: 0.08, when: 0.06 })
  },
  buy: () => {
    tone(783, { type: 'square', dur: 0.06, gain: 0.1 })
    tone(1046, { type: 'square', dur: 0.1, gain: 0.1, when: 0.07 })
    noise({ dur: 0.05, gain: 0.05, when: 0.02 })
  },
  discard: () => {
    noise({ dur: 0.12, gain: 0.12, highpass: 600 })
    tone(196, { type: 'sine', dur: 0.1, gain: 0.1, slideTo: 98 })
  },
  cashOut: () => {
    ;[783.9, 987.7, 1174.7, 1568].forEach((f, i) => tone(f, { type: 'square', dur: 0.12, gain: 0.1, when: i * 0.07 }))
  },
  bossSting: () => {
    tone(98, { type: 'sawtooth', dur: 0.5, gain: 0.16 })
    tone(146.8, { type: 'sawtooth', dur: 0.5, gain: 0.12, when: 0.03 })
  },
  win: () => {
    ;[523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => tone(f, { dur: 0.4, gain: 0.16, when: i * 0.11 }))
  },
  lose: () => {
    ;[392, 349.2, 311.1, 261.6].forEach((f, i) => tone(f, { type: 'sawtooth', dur: 0.4, gain: 0.1, when: i * 0.16 }))
  },
}

// ---------------------------------------------------------------------------
// Generative ambient music: slow minor-key pads with a sparse arp on top.

const CHORDS: number[][] = [
  [110, 130.8, 164.8], // Am
  [87.3, 130.8, 174.6], // F
  [98, 146.8, 196], // G
  [82.4, 123.5, 164.8], // Em
]

let chordIdx = 0

function playChord() {
  const c = ensureCtx()
  if (!c || !master || !musicEnabled) return
  if (!musicGain) {
    musicGain = c.createGain()
    musicGain.gain.value = 0.16
    musicGain.connect(master)
  }
  const chord = CHORDS[chordIdx % CHORDS.length]
  chordIdx++
  const t0 = c.currentTime
  for (const f of chord) {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = f
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(0.11, t0 + 1.2)
    g.gain.linearRampToValueAtTime(0.0001, t0 + 5.6)
    osc.connect(g).connect(musicGain)
    osc.start(t0)
    osc.stop(t0 + 6)
  }
  // sparse arp: 0–2 high notes per bar
  const arpCount = Math.floor(Math.random() * 3)
  for (let i = 0; i < arpCount; i++) {
    const f = chord[Math.floor(Math.random() * chord.length)] * (Math.random() < 0.5 ? 4 : 8)
    const when = 0.8 + Math.random() * 3.5
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'triangle'
    osc.frequency.value = f
    g.gain.setValueAtTime(0, t0 + when)
    g.gain.linearRampToValueAtTime(0.05, t0 + when + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + when + 1.2)
    osc.connect(g).connect(musicGain)
    osc.start(t0 + when)
    osc.stop(t0 + when + 1.4)
  }
}

export function startMusic() {
  if (musicTimer != null || !musicEnabled) return
  const c = ensureCtx()
  if (!c) return
  playChord()
  musicTimer = window.setInterval(playChord, 5200)
}

export function stopMusic() {
  if (musicTimer != null) {
    clearInterval(musicTimer)
    musicTimer = null
  }
}
