// Zero-asset audio: everything is synthesized with WebAudio.
// SFX are short envelopes on oscillators; music is a generative lo-fi groove.
// The AudioContext is created lazily on the first user gesture (browser policy).

let ctx: AudioContext | null = null
let master: GainNode | null = null
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
// Generative lo-fi groove: swung boom-bap drums, a round triangle bass, mellow
// 7th-chord keys, and a sparse chip-tune lead, scheduled a fraction of a beat
// ahead for tight timing. Intensity (streak, boss blinds) opens the key filter
// and adds hat/lead density; boss blinds swap in a darker progression.

const BPM = 82
const STEP = 60 / BPM / 4 // one 16th note
const SWING = STEP * 0.28 // laid-back delay on off 16ths
const BAR_STEPS = 16
const MUSIC_LEVEL = 0.42

type BarChord = { root: number; keys: number[] }

// Am7 – Fmaj7 – Cmaj7 – G7, voiced low and close
const PROG: BarChord[] = [
  { root: 110.0, keys: [220.0, 261.63, 329.63, 392.0] },
  { root: 87.31, keys: [174.61, 220.0, 261.63, 329.63] },
  { root: 130.81, keys: [196.0, 246.94, 329.63, 392.0] },
  { root: 98.0, keys: [196.0, 246.94, 293.66, 349.23] },
]
// boss rounds brood instead: Am7 – Fmaj7 – Am7 – E7
const BOSS_PROG: BarChord[] = [
  { root: 110.0, keys: [220.0, 261.63, 329.63, 392.0] },
  { root: 87.31, keys: [174.61, 220.0, 261.63, 329.63] },
  { root: 110.0, keys: [164.81, 220.0, 261.63, 329.63] },
  { root: 82.41, keys: [164.81, 207.65, 246.94, 293.66] },
]
// A minor pentatonic for the lead
const LEAD_SCALE = [440.0, 523.25, 587.33, 659.25, 783.99, 880.0]

let musicBus: GainNode | null = null // overall music volume, ramped on start/stop
let keysOut: BiquadFilterNode | null = null // lowpass "tape" filter for bass/keys/lead
let drumsOut: GainNode | null = null
let step = 0
let nextStepTime = 0
let intensity = 0
let intensityTarget = 0
let bossMode = false
let leadDegree = 2
let leadNotesInBar = 0

/** Drive the groove from game state: streak builds energy, boss blinds brood. */
export function setMusicIntensity(opts: { streak: number; boss: boolean }) {
  bossMode = opts.boss
  intensityTarget = Math.min(1, Math.min(opts.streak / 10, 1) * 0.6 + (opts.boss ? 0.4 : 0))
}

function musicSetup(c: AudioContext) {
  if (musicBus || !master) return
  musicBus = c.createGain()
  musicBus.gain.value = 0
  musicBus.connect(master)

  keysOut = c.createBiquadFilter()
  keysOut.type = 'lowpass'
  keysOut.frequency.value = 2400
  keysOut.Q.value = 0.4
  keysOut.connect(musicBus)

  drumsOut = c.createGain()
  drumsOut.connect(musicBus)

  // faint looped vinyl crackle so the mix never feels sterile
  const len = c.sampleRate * 2
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() < 0.0015 ? (Math.random() * 2 - 1) * 0.6 : (Math.random() * 2 - 1) * 0.02
  }
  const src = c.createBufferSource()
  src.buffer = buf
  src.loop = true
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 1800
  const g = c.createGain()
  g.gain.value = 0.05
  src.connect(hp).connect(g).connect(musicBus)
  src.start()
}

function mVoice(
  c: AudioContext,
  dest: AudioNode,
  freq: number,
  t: number,
  opts: { type?: OscillatorType; dur?: number; gain?: number; attack?: number; detune?: number },
) {
  const { type = 'triangle', dur = 0.3, gain = 0.1, attack = 0.01, detune = 0 } = opts
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.detune.value = detune
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + attack)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(g).connect(dest)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

function mNoise(
  c: AudioContext,
  dest: AudioNode,
  t: number,
  opts: { dur: number; gain: number; filter: 'highpass' | 'bandpass'; freq: number },
) {
  const len = Math.max(1, Math.ceil(c.sampleRate * opts.dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = opts.filter
  f.frequency.value = opts.freq
  const g = c.createGain()
  g.gain.value = opts.gain
  src.connect(f).connect(g).connect(dest)
  src.start(t)
}

function mKick(c: AudioContext, dest: AudioNode, t: number, gain = 0.5) {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(120, t)
  osc.frequency.exponentialRampToValueAtTime(43, t + 0.11)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
  osc.connect(g).connect(dest)
  osc.start(t)
  osc.stop(t + 0.25)
}

function scheduleStep(globalStep: number, when: number) {
  const c = ctx
  const keys = keysOut
  const drums = drumsOut
  if (!c || !keys || !drums) return
  const prog = bossMode ? BOSS_PROG : PROG
  const bar = prog[Math.floor(globalStep / BAR_STEPS) % prog.length]
  const s = globalStep % BAR_STEPS
  const t = when + (s % 2 === 1 ? SWING : 0)

  if (s === 0) {
    // ease intensity toward its target once per bar; open the filter with it
    intensity += (intensityTarget - intensity) * 0.5
    keys.frequency.setTargetAtTime(2200 + intensity * 2600, t, 0.5)
    leadNotesInBar = 0
  }

  // drums: boom-bap kick, soft snare on 2 & 4, swung 8th hats with 16th fills
  if (s === 0 || s === 10) mKick(c, drums, t)
  if (s === 7 && intensity > 0.45 && Math.random() < 0.6) mKick(c, drums, t, 0.35)
  if (s === 4 || s === 12) {
    mNoise(c, drums, t, { dur: 0.1, gain: 0.09, filter: 'bandpass', freq: 1800 })
    mVoice(c, drums, 185, t, { type: 'sine', dur: 0.06, gain: 0.05 })
  }
  if (s % 2 === 0) mNoise(c, drums, t, { dur: 0.035, gain: 0.028 + Math.random() * 0.014 + (s % 4 === 2 ? 0.012 : 0), filter: 'highpass', freq: 7500 })
  else if (Math.random() < 0.1 + intensity * 0.55) mNoise(c, drums, t, { dur: 0.03, gain: 0.018 + Math.random() * 0.01, filter: 'highpass', freq: 8000 })

  // bass: root on the one, root/fifth on the three, occasional octave pickup
  if (s === 0) mVoice(c, keys, bar.root, t, { dur: STEP * 7, gain: 0.2, attack: 0.02 })
  if (s === 8) mVoice(c, keys, Math.random() < 0.35 ? bar.root * 1.5 : bar.root, t, { dur: STEP * 5, gain: 0.17, attack: 0.02 })
  if (s === 14 && Math.random() < 0.45) mVoice(c, keys, bar.root * 2, t, { dur: STEP * 1.8, gain: 0.1 })

  // keys: soft chord on the one, ghost stab later in the bar
  if (s === 0) {
    for (const f of bar.keys) mVoice(c, keys, f, t, { dur: STEP * 11, gain: 0.042, attack: 0.06, detune: Math.random() * 8 - 4 })
  }
  if (s === 10 && Math.random() < 0.5) {
    for (const f of bar.keys) mVoice(c, keys, f, t, { dur: STEP * 2.5, gain: 0.022, attack: 0.01 })
  }

  // lead: a sparse chip-tune melody that wanders the pentatonic scale
  if (s % 2 === 0 && s !== 0 && leadNotesInBar < 3 && Math.random() < 0.14 + intensity * 0.28) {
    leadDegree = Math.max(0, Math.min(LEAD_SCALE.length - 1, leadDegree + Math.floor(Math.random() * 5) - 2))
    const f = LEAD_SCALE[leadDegree] * (!bossMode && Math.random() < 0.12 ? 2 : 1)
    mVoice(c, keys, f, t, { type: 'square', dur: STEP * (Math.random() < 0.3 ? 3 : 1.6), gain: 0.035, detune: 4 })
    leadNotesInBar++
  }
}

export function startMusic() {
  if (musicTimer != null || !musicEnabled) return
  const c = ensureCtx()
  if (!c || !master) return
  musicSetup(c)
  if (!musicBus) return
  musicBus.gain.cancelScheduledValues(c.currentTime)
  musicBus.gain.setTargetAtTime(MUSIC_LEVEL, c.currentTime, 0.8)
  // restart on a bar boundary so the groove never resumes mid-phrase
  step = 0
  nextStepTime = c.currentTime + 0.1
  musicTimer = window.setInterval(() => {
    if (!ctx) return
    while (nextStepTime < ctx.currentTime + 0.3) {
      scheduleStep(step, nextStepTime)
      step++
      nextStepTime += STEP
    }
  }, 100)
}

export function stopMusic() {
  if (musicTimer != null) {
    clearInterval(musicTimer)
    musicTimer = null
  }
  if (ctx && musicBus) {
    musicBus.gain.cancelScheduledValues(ctx.currentTime)
    musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.15)
  }
}
