// SFX are synthesized with WebAudio (short envelopes on oscillators — zero
// assets). Music is real recordings: three public-domain tracks in
// public/music (see CREDITS.md there), decoded into WebAudio buffers, looped,
// and crossfaded when the scene changes (menu lounge / round groove / boss
// chiptune). The AudioContext is created lazily on the first user gesture
// (browser policy).

let ctx: AudioContext | null = null
let master: GainNode | null = null

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
// Music: looped public-domain tracks (see public/music/CREDITS.md), one per
// scene, crossfaded on change. Every round has its own track — scenes are
// 'menu' plus 'a{ante}-{small|big|boss}' for all 24 rounds. Buffers decode
// lazily on first use and are cached; the store preloads the current ante's
// three tracks between rounds so blind starts never wait on the network.

export type MusicScene = string

const MUSIC_LEVEL = 0.32
const CROSSFADE = 1.2 // seconds

const TRACK_FILES: Record<MusicScene, string> = { menu: 'menu.mp3' }
for (let ante = 1; ante <= 8; ante++) {
  for (const blind of ['small', 'big', 'boss']) {
    TRACK_FILES[`a${ante}-${blind}`] = `a${ante}-${blind}.mp3`
  }
}

/** Scene key for a round. Endless antes past 8 cycle through the ante 6–8 set. */
export function roundMusicScene(ante: number, blindIndex: number): MusicScene {
  const a = ante <= 8 ? ante : 6 + ((ante - 9) % 3)
  const blind = (['small', 'big', 'boss'] as const)[Math.min(blindIndex, 2)]
  return `a${a}-${blind}`
}

// Titles/composers for the collection's Sound Test (mirrors public/music/CREDITS.md).
export const TRACK_INFO: Record<MusicScene, { title: string; artist: string }> = {
  menu: { title: 'Be Chillin', artist: 'Alexander Nakarada' },
  'a1-small': { title: '3 am West End', artist: 'Kevin MacLeod' },
  'a1-big': { title: 'A Good Bass for Gambling', artist: 'Komiku' },
  'a1-boss': { title: 'Bit Bit Loop', artist: 'Kevin MacLeod' },
  'a2-small': { title: 'Bass Meant Jazz', artist: 'Kevin MacLeod' },
  'a2-big': { title: 'Sunday Dub', artist: 'Kevin MacLeod' },
  'a2-boss': { title: 'Blippy Trance', artist: 'Kevin MacLeod' },
  'a3-small': { title: 'Compy Jazz', artist: 'Kevin MacLeod' },
  'a3-big': { title: 'Downtown Boogie', artist: 'Bryan Teoh' },
  'a3-boss': { title: 'Drop Point', artist: 'Bryan Teoh' },
  'a4-small': { title: 'Martini Sunset', artist: 'FreePD' },
  'a4-big': { title: 'Groovin', artist: 'Brian Boyko' },
  'a4-boss': { title: 'Spec Ops', artist: 'FreePD' },
  'a5-small': { title: 'Midnight in the Green House', artist: 'Kevin MacLeod' },
  'a5-big': { title: 'Funkeriffic', artist: 'Kevin MacLeod' },
  'a5-boss': { title: 'Guerilla Tactics', artist: 'FreePD' },
  'a6-small': { title: 'Patron Saint of Heists', artist: 'Bryan Teoh' },
  'a6-big': { title: 'Funky Energy Loop', artist: 'Kevin MacLeod' },
  'a6-boss': { title: 'Apex', artist: 'Alexander Nakarada' },
  'a7-small': { title: 'Lucky Break', artist: 'Bryan Teoh' },
  'a7-big': { title: "Gotta Keep On Movin'", artist: 'Bryan Teoh' },
  'a7-boss': { title: 'Evil Incoming', artist: 'Kevin MacLeod' },
  'a8-small': { title: 'Uberpunch', artist: 'Alexander Nakarada' },
  'a8-big': { title: 'Circuit', artist: 'FreePD' },
  'a8-boss': { title: 'Goodnightmare', artist: 'Kevin MacLeod' },
}

let musicBus: GainNode | null = null
let scene: MusicScene = 'menu'
let jukebox: MusicScene | null = null // Sound Test override; wins over the game scene
let musicOn = false // startMusic() called and not yet stopped
let playing: { scene: MusicScene; src: AudioBufferSourceNode; gain: GainNode } | null = null
const buffers = new Map<MusicScene, Promise<AudioBuffer | null>>()

const effectiveScene = () => jukebox ?? scene

let analyser: AnalyserNode | null = null
let analyserBins: Uint8Array | null = null

/**
 * Current music levels (0..1) for UI reactivity — zeros when nothing plays.
 * Boosted to compensate for MUSIC_LEVEL sitting on the bus ahead of the tap.
 */
export function musicLevels(): { bass: number; energy: number } {
  if (!analyser || !analyserBins) return { bass: 0, energy: 0 }
  analyser.getByteFrequencyData(analyserBins)
  const bassBins = 6
  let bassSum = 0
  let sum = 0
  for (let i = 0; i < analyserBins.length; i++) {
    sum += analyserBins[i]
    if (i < bassBins) bassSum += analyserBins[i]
  }
  return {
    bass: Math.min(1, (bassSum / (bassBins * 255)) * 1.2),
    energy: Math.min(1, (sum / (analyserBins.length * 255)) * 2.2),
  }
}

function loadBuffer(c: AudioContext, s: MusicScene): Promise<AudioBuffer | null> {
  let p = buffers.get(s)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}music/${TRACK_FILES[s]}`)
      .then((r) => {
        if (!r.ok) throw new Error(`music ${r.status}`)
        return r.arrayBuffer()
      })
      .then((data) => c.decodeAudioData(data))
      .catch(() => {
        buffers.delete(s) // allow a retry on the next scene change
        return null
      })
    buffers.set(s, p)
  }
  return p
}

/** Warm the buffer cache for scenes likely to play soon (no-op until unlocked). */
export function preloadMusic(scenes: MusicScene[]) {
  const c = ctx
  if (!c || !musicEnabled) return
  for (const s of scenes) void loadBuffer(c, s)
}

async function playScene(s: MusicScene) {
  const c = ctx
  if (!c || !master || !musicOn || !musicEnabled) return
  if (playing?.scene === s) return
  const buf = await loadBuffer(c, s)
  // the world may have moved on while the track decoded
  if (!buf || !musicOn || !musicEnabled || effectiveScene() !== s || playing?.scene === s) return
  if (!musicBus) {
    musicBus = c.createGain()
    musicBus.gain.value = MUSIC_LEVEL
    musicBus.connect(master)
    // side tap for UI reactivity (MusicGlow); the analyser outputs nowhere
    analyser = c.createAnalyser()
    analyser.fftSize = 128
    analyser.smoothingTimeConstant = 0.6
    analyserBins = new Uint8Array(analyser.frequencyBinCount)
    musicBus.connect(analyser)
  }
  const t = c.currentTime
  if (playing) {
    playing.gain.gain.cancelScheduledValues(t)
    playing.gain.gain.setValueAtTime(playing.gain.gain.value, t)
    playing.gain.gain.linearRampToValueAtTime(0, t + CROSSFADE)
    playing.src.stop(t + CROSSFADE + 0.1)
  }
  const src = c.createBufferSource()
  src.buffer = buf
  src.loop = true
  const gain = c.createGain()
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(1, t + CROSSFADE)
  src.connect(gain).connect(musicBus)
  src.start(t)
  playing = { scene: s, src, gain }
}

/** Pick the track for where the player is: menus/shop, a round, or a boss round. */
export function setMusicScene(s: MusicScene) {
  if (scene === s) return
  scene = s
  if (musicOn && !jukebox) void playScene(s)
}

/** Sound Test override: play an arbitrary track (null resumes the game scene). */
export function setJukebox(s: MusicScene | null) {
  if (jukebox === s) return
  jukebox = s
  if (musicOn) void playScene(effectiveScene())
}

export function startMusic() {
  if (!musicEnabled) return
  const c = ensureCtx()
  if (!c) return
  musicOn = true
  void playScene(effectiveScene())
  void loadBuffer(c, 'menu') // the one scene every session returns to
}

export function stopMusic() {
  musicOn = false
  if (ctx && playing) {
    const t = ctx.currentTime
    playing.gain.gain.cancelScheduledValues(t)
    playing.gain.gain.setValueAtTime(playing.gain.gain.value, t)
    playing.gain.gain.linearRampToValueAtTime(0, t + 0.3)
    playing.src.stop(t + 0.4)
    playing = null
  }
}
