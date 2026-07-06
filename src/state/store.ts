// Zustand store: orchestrates the run/round engine and holds all UI state.

import { create } from 'zustand'
import type { CardPackChoice, ShopOffer } from '../engine/shop'
import { generateShop, openCardPack, openGodPack, openJokerPack, rerollCost } from '../engine/shop'
import type { Move, RoundState, TableauId } from '../engine/klondike'
import { foundationFor, hasAnyUsefulMove, isLegalMove } from '../engine/klondike'
import { jokerRegistry, newJokerInstance, sellValue } from '../engine/jokers'
import type { RoundResult } from '../engine/run'
import { ensureBossForAnte, finishRound, newRun, skipBlind, startRound, applyGodCard } from '../engine/run'
import { clearSave, loadGame, loadStats, saveGame, saveStats, todaysDailySeed } from '../engine/save'
import type { LifetimeStats } from '../engine/save'
import type { ScorePop } from '../engine/scoring'
import { bossBlockReason, performMove } from '../engine/scoring'
import type { RunState } from '../engine/types'
import { configureAudio, sfx, unlockAudio } from '../ui/audio'

export type Screen =
  | 'menu'
  | 'blind-select'
  | 'playing'
  | 'shop'
  | 'game-over'
  | 'victory'
  | 'collection'
  | 'settings'

export interface Settings {
  sfx: boolean
  music: boolean
  reduceMotion: boolean
}

const SETTINGS_KEY = 'ss-settings-v1'

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { sfx: true, music: true, reduceMotion: false, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    /* defaults below */
  }
  return { sfx: true, music: true, reduceMotion: false }
}

export type Selection =
  | { source: 'waste' }
  | { source: 'tableau'; col: number; index: number }

export interface ActivePop extends ScorePop {
  uid: number
}

export type PackState =
  | { type: 'card'; choices: CardPackChoice[] }
  | { type: 'god'; choices: string[] }
  | { type: 'joker'; choices: string[] }
  | null

let popUid = 1

interface GameStore {
  screen: Screen
  run: RunState | null
  round: RoundState | null
  stats: LifetimeStats
  hasSave: boolean

  selection: Selection | null
  pops: ActivePop[]
  lastPlay: ActivePop | null
  message: { text: string; uid: number } | null
  roundResult: RoundResult | null
  stuck: boolean

  shopOffers: ShopOffer[]
  rerolls: number
  pack: PackState
  skipReward: string | null
  settings: Settings

  // menu / lifecycle
  newGame: (seed?: string, mode?: 'standard' | 'daily', deckId?: string, stake?: number) => void
  continueGame: () => void
  abandonRun: () => void
  backToMenu: () => void
  goTo: (screen: Screen) => void
  updateSettings: (patch: Partial<Settings>) => void
  enterEndless: () => void

  // blind select
  playBlind: () => void
  skipCurrentBlind: () => void

  // playing
  tryMove: (move: Move) => void
  select: (sel: Selection | null) => void
  clickPile: (target: TableauId | `f${number}`) => void
  autoToFoundation: (sel: Selection) => void
  clickStock: () => void
  discardWaste: () => void
  cashOut: () => void
  dismissPop: (uid: number) => void
  activateGod: (godId: string) => void
  sellOwnedJoker: (jokerId: string) => void
  moveJoker: (jokerId: string, dir: -1 | 1) => void

  // shop
  buyOffer: (slot: number) => void
  reroll: () => void
  choosePackItem: (index: number) => void
  skipPack: () => void
  leaveShop: () => void
  dismissResult: () => void
}

function persist(get: () => GameStore) {
  const { run, round, screen } = get()
  if (!run) return
  if (screen === 'game-over' || screen === 'victory' || screen === 'menu') return
  saveGame({
    run,
    round: screen === 'playing' ? round : null,
    screen: screen === 'playing' ? 'playing' : screen === 'shop' ? 'shop' : 'blind-select',
  })
}

function pushPops(set: (fn: (s: GameStore) => Partial<GameStore>) => void, pops: ScorePop[]) {
  if (pops.length === 0) return
  const active = pops.map((p) => ({ ...p, uid: popUid++ }))
  set((s) => ({
    pops: [...s.pops.slice(-8), ...active],
    lastPlay: active.filter((p) => p.kind === 'foundation').pop() ?? s.lastPlay,
  }))
  // pops fade out via CSS; prune after animation
  setTimeout(() => {
    set((s) => ({ pops: s.pops.filter((p) => !active.some((a) => a.uid === p.uid)) }))
  }, 1600)
}

export const useGame = create<GameStore>((set, get) => {
  const say = (text: string) => set({ message: { text, uid: popUid++ } })

  const soundsFor = (move: Move, round: RoundState, pops: ScorePop[]) => {
    if (move.kind === 'deal_stock' || move.kind === 'recycle') sfx.deal()
    else if (move.kind === 'discard_waste') sfx.discard()
    else if (pops.length === 0) sfx.place()
    for (const p of pops) {
      if (p.kind === 'foundation') {
        sfx.play(round.streak)
        if ((p.mult ?? 0) >= 12 || p.total >= 400) sfx.bigMult()
      }
      if (p.kind === 'reveal') sfx.reveal()
      if (p.kind === 'empty_column') sfx.emptyColumn()
      if (p.kind === 'clear') sfx.boardClear()
      if (p.money && p.money > 0) sfx.money()
    }
  }

  const afterRoundStateChange = (run: RunState, round: RoundState, pops: ScorePop[]) => {
    set({ run, round, selection: null })
    pushPops(set as never, pops)
    if (round.finished) {
      // board cleared — cash out automatically
      finishAndShow()
      return
    }
    set({ stuck: !hasAnyUsefulMove(round) })
    persist(get)
  }

  const finishAndShow = () => {
    const { run, round, stats } = get()
    if (!run || !round) return
    const { run: nextRun, result } = finishRound(run, round)
    if (!result.won) {
      const nextStats: LifetimeStats = {
        ...stats,
        bestAnte: Math.max(stats.bestAnte, run.ante),
        bestPlay: Math.max(stats.bestPlay, nextRun.bestPlay),
      }
      saveStats(nextStats)
      clearSave()
      sfx.lose()
      set({ run: nextRun, round: null, roundResult: result, screen: 'game-over', stats: nextStats, hasSave: false })
      return
    }
    if (result.runWon) {
      const nextStats: LifetimeStats = {
        ...stats,
        runsWon: stats.runsWon + 1,
        bestAnte: Math.max(stats.bestAnte, 9),
        bestPlay: Math.max(stats.bestPlay, nextRun.bestPlay),
      }
      saveStats(nextStats)
      clearSave() // enterEndless re-saves if the player continues
      sfx.win()
      set({ run: nextRun, round: null, roundResult: result, screen: 'victory', stats: nextStats, hasSave: false })
      return
    }
    // Won the blind — go shopping
    sfx.cashOut()
    const { offers } = generateShop(nextRun, 0)
    set({ run: nextRun, round: null, roundResult: result, screen: 'shop', shopOffers: offers, rerolls: 0, pack: null })
    persist(get)
  }

  return {
    screen: 'menu',
    run: null,
    round: null,
    stats: loadStats(),
    hasSave: !!loadGame(),

    selection: null,
    pops: [],
    lastPlay: null,
    message: null,
    roundResult: null,
    stuck: false,

    shopOffers: [],
    rerolls: 0,
    pack: null,
    skipReward: null,
    settings: loadSettings(),

    newGame: (seed, mode = 'standard', deckId = 'classic', stake = 0) => {
      unlockAudio()
      const actualSeed = mode === 'daily' ? todaysDailySeed() : seed?.trim() || `run-${Date.now().toString(36)}`
      const run = newRun(actualSeed, mode, deckId, stake)
      const stats = { ...get().stats, runsStarted: get().stats.runsStarted + 1 }
      saveStats(stats)
      set({
        run,
        round: null,
        screen: 'blind-select',
        stats,
        roundResult: null,
        pops: [],
        lastPlay: null,
        selection: null,
        skipReward: null,
        hasSave: true,
      })
      persist(get)
    },

    continueGame: () => {
      const saved = loadGame()
      if (!saved) return
      set({
        run: saved.run,
        round: saved.round,
        screen: saved.round ? 'playing' : saved.screen === 'shop' ? 'shop' : 'blind-select',
        shopOffers: saved.screen === 'shop' ? generateShop(saved.run, 0).offers : [],
        rerolls: 0,
        roundResult: null,
        pops: [],
        lastPlay: null,
        selection: null,
        stuck: saved.round ? !hasAnyUsefulMove(saved.round) : false,
      })
    },

    abandonRun: () => {
      clearSave()
      set({ run: null, round: null, screen: 'menu', hasSave: false, roundResult: null })
    },

    backToMenu: () => {
      persist(get)
      set({ screen: 'menu', hasSave: !!loadGame() })
    },

    goTo: (screen) => {
      unlockAudio()
      set({ screen })
    },

    updateSettings: (patch) => {
      const settings = { ...get().settings, ...patch }
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      } catch {
        /* non-fatal */
      }
      configureAudio({ sfx: settings.sfx, music: settings.music })
      if (settings.music || settings.sfx) unlockAudio()
      set({ settings })
    },

    enterEndless: () => {
      const { run } = get()
      if (!run) return
      const endlessRun = ensureBossForAnte({ ...run, endless: true }, run.ante)
      set({ run: endlessRun, screen: 'blind-select', roundResult: null, hasSave: true })
      persist(get)
    },

    playBlind: () => {
      const { run } = get()
      if (!run) return
      unlockAudio()
      const { round, run: nextRun } = startRound(run)
      if (round.bossId) sfx.bossSting()
      else sfx.deal()
      set({ run: nextRun, round, screen: 'playing', selection: null, pops: [], lastPlay: null, roundResult: null, stuck: false, skipReward: null })
      persist(get)
    },

    skipCurrentBlind: () => {
      const { run } = get()
      if (!run || run.blindIndex >= 2) return
      const { run: next, message } = skipBlind(run)
      sfx.click()
      set({ run: next, skipReward: message })
      persist(get)
    },

    tryMove: (move) => {
      const { run, round } = get()
      if (!run || !round || round.finished) return
      const legal = isLegalMove(round, move)
      if (!legal.ok) {
        say(legal.reason)
        sfx.error()
        set({ selection: null })
        return
      }
      const blocked = bossBlockReason(round, move)
      if (blocked) {
        say(blocked)
        sfx.error()
        set({ selection: null })
        return
      }
      const out = performMove(round, run, move)
      soundsFor(move, out.round, out.pops)
      afterRoundStateChange(out.run, out.round, out.pops)
    },

    select: (sel) => {
      if (sel) sfx.select()
      set({ selection: sel })
    },

    clickPile: (target) => {
      const { selection, round } = get()
      if (!round) return
      if (!selection) return
      let move: Move | null = null
      if (target.startsWith('f')) {
        const to = target as `f${number}` as never
        move =
          selection.source === 'waste'
            ? { kind: 'waste_to_foundation', to }
            : { kind: 'tableau_to_foundation', from: `t${selection.col}` as TableauId, to }
      } else {
        const to = target as TableauId
        move =
          selection.source === 'waste'
            ? { kind: 'waste_to_tableau', to }
            : { kind: 'tableau_to_tableau', from: `t${selection.col}` as TableauId, index: selection.index, to }
      }
      get().tryMove(move)
    },

    autoToFoundation: (sel) => {
      const { round } = get()
      if (!round) return
      const card =
        sel.source === 'waste'
          ? round.waste[round.waste.length - 1]
          : round.tableau[sel.col][round.tableau[sel.col].length - 1]
      if (!card) return
      const f = foundationFor(round, card)
      if (!f) {
        say('No foundation accepts that card')
        return
      }
      if (sel.source === 'waste') get().tryMove({ kind: 'waste_to_foundation', to: f })
      else get().tryMove({ kind: 'tableau_to_foundation', from: `t${sel.col}` as TableauId, to: f })
    },

    clickStock: () => {
      const { round } = get()
      if (!round) return
      if (round.stock.length > 0) {
        get().tryMove({ kind: 'deal_stock' })
      } else if (round.waste.length > 0) {
        get().tryMove({ kind: 'recycle' })
      }
    },

    discardWaste: () => get().tryMove({ kind: 'discard_waste' }),

    cashOut: () => finishAndShow(),

    dismissPop: (uid) => set((s) => ({ pops: s.pops.filter((p) => p.uid !== uid) })),

    activateGod: (godId) => {
      const { run, round } = get()
      if (!run) return
      const out = applyGodCard(run, round, godId)
      say(out.message)
      if (!out.ok) return
      set({ run: out.run, round: out.round ?? null })
      if (out.pops) pushPops(set as never, out.pops)
      const r = get().round
      if (r?.finished) {
        finishAndShow()
        return
      }
      if (r) set({ stuck: !hasAnyUsefulMove(r) })
      persist(get)
    },

    sellOwnedJoker: (jokerId) => {
      const { run } = get()
      if (!run) return
      const idx = run.jokers.findIndex((j) => j.id === jokerId)
      if (idx < 0) return
      const jokers = [...run.jokers]
      jokers.splice(idx, 1)
      const value = sellValue(jokerId)
      set({ run: { ...run, jokers, money: run.money + value } })
      say(`Sold ${jokerRegistry[jokerId]?.name ?? jokerId} for $${value}`)
      persist(get)
    },

    moveJoker: (jokerId, dir) => {
      const { run } = get()
      if (!run) return
      const idx = run.jokers.findIndex((j) => j.id === jokerId)
      const to = idx + dir
      if (idx < 0 || to < 0 || to >= run.jokers.length) return
      const jokers = [...run.jokers]
      ;[jokers[idx], jokers[to]] = [jokers[to], jokers[idx]]
      set({ run: { ...run, jokers } })
      persist(get)
    },

    buyOffer: (slot) => {
      const { run, shopOffers } = get()
      if (!run) return
      const offer = shopOffers.find((o) => o.slot === slot && !o.sold)
      if (!offer) return
      if (run.money < offer.price) {
        say('Not enough money')
        return
      }
      if (offer.kind === 'joker') {
        const slotsUsed = run.jokers.filter((j) => j.edition !== 'negative').length
        if (offer.edition !== 'negative' && slotsUsed >= run.jokerSlots) {
          say('Joker slots are full — sell one first')
          return
        }
        const joker = { ...newJokerInstance(offer.jokerId), ...(offer.edition ? { edition: offer.edition } : {}) }
        sfx.buy()
        set({
          run: { ...run, money: run.money - offer.price, jokers: [...run.jokers, joker] },
          shopOffers: shopOffers.map((o) => (o.slot === slot ? { ...o, sold: true } : o)),
        })
      } else if (offer.kind === 'god') {
        if (run.consumables.length >= run.consumableSlots) {
          say('God card slots are full')
          return
        }
        sfx.buy()
        set({
          run: { ...run, money: run.money - offer.price, consumables: [...run.consumables, offer.godId] },
          shopOffers: shopOffers.map((o) => (o.slot === slot ? { ...o, sold: true } : o)),
        })
      } else if (offer.kind === 'voucher') {
        let next: RunState = { ...run, money: run.money - offer.price, vouchers: [...run.vouchers, offer.voucherId] }
        if (offer.voucherId === 'expansion') next = { ...next, jokerSlots: next.jokerSlots + 1 }
        if (offer.voucherId === 'satchel') next = { ...next, consumableSlots: next.consumableSlots + 1 }
        sfx.buy()
        set({
          run: next,
          shopOffers: shopOffers.map((o) => (o.slot === slot ? { ...o, sold: true } : o)),
        })
      } else {
        // pack: charge now, open the picker
        const paidRun = { ...run, money: run.money - offer.price }
        let pack: PackState = null
        let nextRun = paidRun
        if (offer.packType === 'card') {
          const out = openCardPack(paidRun)
          nextRun = out.run
          pack = { type: 'card', choices: out.choices }
        } else if (offer.packType === 'god') {
          const out = openGodPack(paidRun)
          nextRun = out.run
          pack = { type: 'god', choices: out.choices }
        } else {
          const out = openJokerPack(paidRun)
          nextRun = out.run
          pack = { type: 'joker', choices: out.choices }
        }
        sfx.buy()
        set({
          run: nextRun,
          pack,
          shopOffers: shopOffers.map((o) => (o.slot === slot ? { ...o, sold: true } : o)),
        })
      }
      persist(get)
    },

    reroll: () => {
      const { run, rerolls, shopOffers } = get()
      if (!run) return
      const cost = rerollCost(run, rerolls)
      if (run.money < cost) {
        say('Not enough money to reroll')
        return
      }
      sfx.click()
      const { offers } = generateShop(run, rerolls + 1)
      // keep sold offers + pack/voucher slots from the current shop
      const merged = offers.map((o) => {
        const existing = shopOffers.find((e) => e.slot === o.slot)
        if (existing && (existing.kind === 'pack' || existing.kind === 'voucher' || existing.sold)) return existing
        return o
      })
      set({ run: { ...run, money: run.money - cost }, rerolls: rerolls + 1, shopOffers: merged })
      persist(get)
    },

    choosePackItem: (index) => {
      const { run, pack } = get()
      if (!run || !pack) return
      if (pack.type === 'card') {
        const choice = pack.choices[index]
        if (!choice) return
        set({
          run: { ...run, enhancements: { ...run.enhancements, [choice.card.id]: choice.enhancement } },
          pack: null,
        })
        say(`${choice.card.id} is now ${choice.enhancement}`)
      } else if (pack.type === 'god') {
        const godId = pack.choices[index]
        if (!godId) return
        if (run.consumables.length >= run.consumableSlots) {
          say('God card slots are full')
          return
        }
        set({ run: { ...run, consumables: [...run.consumables, godId] }, pack: null })
      } else {
        const jokerId = pack.choices[index]
        if (!jokerId) return
        if (run.jokers.filter((j) => j.edition !== 'negative').length >= run.jokerSlots) {
          say('Joker slots are full — sell one first')
          return
        }
        set({ run: { ...run, jokers: [...run.jokers, newJokerInstance(jokerId)] }, pack: null })
      }
      persist(get)
    },

    skipPack: () => set({ pack: null }),

    leaveShop: () => {
      set({ screen: 'blind-select', shopOffers: [], pack: null, roundResult: null })
      persist(get)
    },

    dismissResult: () => set({ roundResult: null }),
  }
})

// apply persisted audio preferences once at startup
configureAudio(useGame.getState().settings)
