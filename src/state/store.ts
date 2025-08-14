import { create } from 'zustand'
import type { RunState, RoundState, BlindType, RoundOutcome, Move, BossModifier } from '../game/types'
import { createInitialRun, createRound, evaluateRound, getBossesForRound } from '../game/run'
import { applyRoundStartJokerHooks, variantMultiplier } from '../game/jokers'
import { applyMove, isLegalMove } from '../game/solitaire'
import { saveRun, loadRun, setDailyBest, setDailyPlayed } from '../game/save'
import { jokerRegistry } from '../game/jokers'
import { LcgRng } from '../game/rng'
import { generateShopOffers } from '../game/shop'
import { shuffle } from '../game/deck'

interface UIState {
  run: RunState | null
  currentRound: RoundState | null
  blindIndex: number
  seedInput: string
  lastOutcome: RoundOutcome | null
  isGameOver: boolean
  currentBlind: BlindType | null
  currentBosses: BossModifier[]
  selected: { fromPileId: string; count: number } | null
  uiScreen: 'start' | 'game' | 'settings' | 'about' | 'achievements'
  settings: {
    reduceMotion: boolean
    colorBlindMode: boolean
    sounds: boolean
    theme: 'dark' | 'light' | 'high-contrast'
  }
  lastMessage: { type: 'error' | 'info'; text: string; ts: number } | null
  paused: boolean
  achievements: Record<string, boolean>
  hasSavedRun: boolean
  startRun: (seed: string) => void
  startRound: (blind: BlindType) => void
  startNextBoard: () => void
  completeRound: (forceSuccess?: boolean) => void
  dismissSummary: () => void
  debugAutoWinRound: () => void
  tickTimer: () => void
  // Core actions
  dealStock: () => void
  undo: () => void
  hint: () => void
  selectFromTableau: (pileId: string, cardIndex: number) => void
  selectWasteTop: () => void
  tryMoveToPile: (toPileId: string) => void
  cancelSelection: () => void
  selectCustom: (fromPileId: string, count: number) => void
  goTo: (screen: UIState['uiScreen']) => void
  backToStart: () => void
  updateSettings: (patch: Partial<UIState['settings']>) => void
  clearMessage: () => void
  togglePause: () => void
  setPaused: (v: boolean) => void
  continueSavedRun: () => void
  unlockAchievement: (id: string) => void
  // FX
  foundationFx?: { cardId: string; ts: number }
  // Shop
  shopOpen: boolean
  shopOffers: Array<
    | { id: string; kind: 'joker'; jokerId: string; name: string; rarity: string; price: number; locked?: boolean }
    | { id: string; kind: 'boost'; boostId: 'redeal' | 'time10' | 'target10off'; name: string; description: string; price: number; locked?: boolean }
    | { id: string; kind: 'god'; godId: string; name: string; description: string; price: number; locked?: boolean }
    | { id: string; kind: 'pack'; packType: 'cards' | 'jokers' | 'gods'; name: string; description: string; size: number; price: number; locked?: boolean }
    | { id: string; kind: 'special'; specialId: string; name: string; description: string; price: number; locked?: boolean }
  >
  shopRolls?: number
  openShop: () => void
  closeShop: () => void
  rerollShop: () => void
  buyOffer: (id: string) => void
  toggleLockOffer: (id: string) => void
  sellJoker: (jokerId: string) => void
  pendingBoosts: string[]
  rankUp: (cat: 'foundation_move' | 'reveal_face_down' | 'empty_column') => void
  useGodCard: (godId: string) => void
  reorderJoker?: (jokerId: string, toIndex: number) => void
  // Skip/bonus
  skippedSmallThisAnte?: boolean
  skippedBigThisAnte?: boolean
  skipBonusBank?: number
  // Start-of-run modal
  startModalOpen?: boolean
}

export const useStore = create<UIState>((set, get) => ({
  run: null,
  currentRound: null,
  blindIndex: 0,
  seedInput: '',
  lastOutcome: null,
  isGameOver: false,
  currentBlind: null,
  currentBosses: [],
  selected: null,
  uiScreen: 'start',
  settings: { reduceMotion: false, colorBlindMode: false, sounds: true, theme: 'dark' },
  lastMessage: null,
  paused: false,
  achievements: {},
  hasSavedRun: !!loadRun(),
  shopOpen: false,
  shopOffers: [],
  shopRolls: 0,
  pendingBoosts: [],
  skippedSmallThisAnte: false,
  skippedBigThisAnte: false,
  skipBonusBank: 0,
  startModalOpen: false,
  startRun: (seed: string) => {
    const actualSeed = seed || String(Date.now())
    const run = createInitialRun(actualSeed)
    // Apply round-start config modifications from jokers (none equipped at start)
    if (run.jokers.length) {
      const ctx = { ante: run.ante, seed: run.seed }
      const config = applyRoundStartJokerHooks(run.jokers, ctx, {
        targetScore: 500 * run.ante,
        timeLimitSec: 120,
        redeals: 2,
        dealSize: 3,
      })
      void config
    }
    const mode: 'standard' | 'daily' = actualSeed.startsWith('daily-') ? 'daily' : 'standard'
    // Difficulty default to medium; can be updated via settings later
    const difficulty: 'easy' | 'medium' | 'hard' = 'medium'
    const tagged = { ...run, mode, difficulty }
    set({ run: tagged, currentRound: null, blindIndex: 0, lastOutcome: null, isGameOver: false, currentBlind: null, currentBosses: [], selected: null, hasSavedRun: true, uiScreen: 'game', startModalOpen: true })
    saveRun(tagged)
    if (mode === 'daily') setDailyPlayed(actualSeed)
  },
  startRound: (blind) => {
    const { run } = get()
    if (!run) return
    const bosses = blind === 'boss' ? getBossesForRound(run.seed, run.ante) : []
    const round = createRound(run.seed, run.ante, blind, bosses, run.difficulty || 'medium')
    // Apply joker round-start config modifications (e.g., +redeal, +time)
    const ctx = { ante: run.ante, seed: run.seed }
    const cfgOut = applyRoundStartJokerHooks(run.jokers, ctx, round.config)
    round.config = cfgOut
    // carry score ranks into the round so scoring honors rank-ups
    ;(round as any).scoreRanks = run.scoreRanks
    // One-shot round flags from jokers
    const hasPerfectDraw = run.jokers.some((j) => j.id === 'perfect-draw')
    if (hasPerfectDraw) (round as any).perfectDraw = true, (round as any).perfectDrawDone = false
    const hasRoyal = run.jokers.some((j) => j.id === 'royal-decree')
    if (hasRoyal) (round as any).royalDecreeCharge = 1
    // Tactician: one forgiveness per round
    const hasTactician = run.jokers.some((j) => j.id === 'tactician')
    if (hasTactician) (round as any).tacticianForgiveUsed = false
    // Apply skip bonus hooks: skipping earlier blinds grants bonus coins-at-end multiplier or bonus coins now
    let skipBonus = 0
    const st = get()
    if (blind === 'big' && st.skippedSmallThisAnte) {
      // Already flagged; do nothing
    }
    if (blind === 'boss') {
      if (st.skippedSmallThisAnte && st.skippedBigThisAnte) skipBonus += 8
      else if (st.skippedSmallThisAnte || st.skippedBigThisAnte) skipBonus += 3
    }
    set({ currentRound: round, lastOutcome: null, isGameOver: false, currentBlind: blind, currentBosses: bosses, selected: null, skipBonusBank: (st.skipBonusBank || 0) + skipBonus })
  },
  startNextBoard: () => {
    const { blindIndex } = get()
    const blinds: BlindType[] = ['small', 'big', 'boss']
    // Clear outcome so summary overlay goes away before starting next
    set({ lastOutcome: null, shopRolls: 0, shopOffers: [] })
    get().startRound(blinds[blindIndex])
  },
  // Skip directly to big or boss; mark flags to prevent earlier boards this round
  skipToBig: () => {
    const { run } = get()
    if (!run) return
    set({ skippedSmallThisAnte: true })
    get().startRound('big')
  },
  skipToBoss: () => {
    const { run } = get()
    if (!run) return
    set({ skippedSmallThisAnte: true, skippedBigThisAnte: true })
    get().startRound('boss')
  },
  completeRound: (forceSuccess) => {
    const { currentRound, run, blindIndex } = get()
    if (!run || !currentRound) return
    const blinds: BlindType[] = ['small', 'big', 'boss']
    const blind = blinds[blindIndex]
    let outcome = forceSuccess
      ? { blind, success: true, score: currentRound.score, target: currentRound.config.targetScore, coinsEarned: Math.round(currentRound.config.targetScore / 100) }
      : evaluateRound(currentRound, blind)
    // Apply joker onRoundEnd modifiers that may adjust score/coins
    if (run.jokers.length) {
      const ctx = { ante: run.ante, seed: run.seed }
      const summary = {
        score: currentRound.score,
        timeRemainingSec: currentRound.timeRemainingSec,
        foundationCount: currentRound.piles.filter((p) => p.type === 'foundation').reduce((n, p) => n + p.cards.length, 0),
        stockLeft: currentRound.piles.find((p) => p.id === 'stock')?.cards.length || 0,
        reveals: currentRound.stats?.tableauReveals || 0,
        dealtThisRound: !!(currentRound as any)._dealtThisRound,
      }
      let scoreDelta = 0
      for (const j of run.jokers) {
        const add = j.applyHooks?.onRoundEnd?.(summary as any, ctx)
        if (typeof add === 'number' && Number.isFinite(add)) {
          scoreDelta += Math.round(add * variantMultiplier((j as any).variant))
        }
      }
      if (scoreDelta !== 0) {
        const adjustedScore = Math.max(0, outcome.score + scoreDelta)
        const baseCoins = outcome.success ? Math.round(adjustedScore / 100) : Math.round(adjustedScore / 200)
        const coinsEarned = baseCoins + (outcome.coinsBreakdown?.bonus || 0)
        outcome = { ...outcome, score: adjustedScore, coinsEarned, coinsBreakdown: { base: baseCoins, bonus: (outcome.coinsBreakdown?.bonus || 0) } }
      }
    }
    // Apply skip bonus bank (earned from skipping earlier boards) to coins earned for this completion
    const bonusCoins = get().skipBonusBank || 0
    const nextCoins = run.coins + outcome.coinsEarned + bonusCoins
      const nextHistory = run.history.concat({ ante: run.ante, score: currentRound.score })
    if (!outcome.success) {
      const updated = { ...run, coins: nextCoins, history: nextHistory }
      set({ run: updated, lastOutcome: outcome, isGameOver: true, currentRound: null, skipBonusBank: 0 })
      saveRun(updated)
      return
    }
    if (blindIndex < 2) {
      const updated = { ...run, coins: nextCoins, history: nextHistory }
      const ach = { ...get().achievements }
      if (outcome.success) ach['first_clear'] = true
      if (blinds[blindIndex] === 'boss' && outcome.success) ach['clear_boss'] = true
      if (blinds[blindIndex] === 'boss' && (outcome as any).perfectClear) ach['boss_perfect'] = true
      if ((currentRound.timeRemainingSec || 0) > Math.floor(currentRound.config.timeLimitSec * 0.25)) ach['early_finish'] = true
      if ((currentRound.stats?.columnsEmptied || 0) >= 2) ach['two_columns'] = true
      set({ run: updated, blindIndex: blindIndex + 1, currentRound: null, lastOutcome: outcome, currentBlind: null, currentBosses: [], selected: null, achievements: ach, skipBonusBank: 0 })
      saveRun(updated)
    } else {
      const nextAnte = run.ante + 1
      const updated = { ...run, coins: nextCoins, history: nextHistory, ante: nextAnte }
      // Achievements on boss completion (boss is always the 3rd board)
      set((s) => {
        const ach = { ...s.achievements }
        if (outcome.success) ach['first_clear'] = true
        // Boss completion achievements
        ach['clear_boss'] = outcome.success || ach['clear_boss']
        if ((outcome as any).perfectClear) ach['boss_perfect'] = true
        if ((currentRound.timeRemainingSec || 0) > Math.floor(currentRound.config.timeLimitSec * 0.25)) ach['early_finish'] = true
        if ((currentRound.stats?.columnsEmptied || 0) >= 2) ach['two_columns'] = true
        return { run: updated, blindIndex: 0, currentRound: null, lastOutcome: outcome, currentBlind: null, currentBosses: [], selected: null, achievements: { ...ach, [`reached_ante_${nextAnte}`]: true, [`reach_ante_2`]: nextAnte >= 2 || ach['reach_ante_2'], [`reach_ante_4`]: nextAnte >= 4 || ach['reach_ante_4'] }, skippedSmallThisAnte: false, skippedBigThisAnte: false, skipBonusBank: 0 }
      })
      saveRun(updated)
      if (run.mode === 'daily') {
        setDailyBest(run.seed, currentRound.score)
      }
    }
  },
  debugAutoWinRound: () => {
    const { currentRound } = get()
    if (!currentRound) return
    currentRound.score = currentRound.config.targetScore
    set({ currentRound: { ...currentRound } })
    get().completeRound(true)
  },
  tickTimer: () => {
    const { currentRound, paused } = get()
    if (!currentRound || paused) return
    if (currentRound.timeRemainingSec <= 0) return
    const next = { ...currentRound, timeRemainingSec: currentRound.timeRemainingSec - 1 }
    set({ currentRound: next })
    if (next.timeRemainingSec <= 0) {
      get().completeRound(false)
    }
  },
  dealStock: () => {
    const { currentRound, run, currentBosses } = get()
    if (!run || !currentRound) return
    // Prevent dealing a new group while previous dealt group hasn't been fully consumed
    const stockPile = currentRound.piles.find((p) => p.id === 'stock')
    const groupRem = (currentRound as any).wasteGroupRemaining || 0
    if ((stockPile?.cards.length || 0) > 0 && groupRem > 0) {
      set({ lastMessage: { type: 'info', text: 'Play the waste cards first', ts: Date.now() } })
      return
    }
    // Normal dealing from stock/waste cycling
    const move: Move = { kind: 'deal_stock' }
    const legal = isLegalMove(currentRound, move)
    if (!legal.ok) {
      set({ lastMessage: { type: 'error', text: `Cannot deal: ${'reason' in legal ? legal.reason : 'illegal'}`, ts: Date.now() } })
      return
    }
    const next = applyMove(currentRound, move, { jokers: run.jokers, bosses: currentBosses })
    set({ currentRound: next })
    ;(get() as any)._autoCompleteIfTarget()
  },
  // Full redeal: deterministically reshuffle all non-foundation cards and redeal tableau + stock; decrement redeals
  fullRedeal: () => {
    const { currentRound, run } = get()
    if (!currentRound || !run) return
    if (currentRound.redealsLeft <= 0) return
    const foundations = currentRound.piles.filter((p) => p.type === 'foundation')
    const keepFoundationIds = new Set<string>()
    for (const f of foundations) for (const c of f.cards) keepFoundationIds.add(c.id)
    // Collect non-foundation cards (tableau, stock, waste), excluding foundation cards
    const pool: any[] = []
    for (const p of currentRound.piles) {
      if (p.type === 'foundation') continue
      for (const c of p.cards) if (!keepFoundationIds.has(c.id)) pool.push({ ...c, faceUp: false })
    }
    // Deterministic shuffle
    const rng = new LcgRng(`${run.seed}-fullredeal-${run.ante}-${currentRound.redealsLeft}`)
    const shuffled = shuffle(pool, rng)
    // Build fresh tableau t0..t6
    const newTableau = Array.from({ length: 7 }, (_, col) => ({ id: `t${col}`, type: 'tableau', cards: [] as any[] }))
    let idx = 0
    for (let col = 0; col < 7; col++) {
      const start = idx
      for (let n = 0; n <= col && idx < shuffled.length; n++) {
        const card = { ...shuffled[idx++], faceUp: false }
        newTableau[col].cards.push(card)
      }
      // Top card in the column faces up if any
      const colCards = newTableau[col].cards
      if (colCards.length > 0) colCards[colCards.length - 1].faceUp = true
      // If we couldn't place any in this column and no more cards, remaining columns stay empty
      if (start === idx && idx >= shuffled.length) {
        // nothing to do; loop continues but will place none
      }
    }
    // Remaining to stock face-down
    const remaining = shuffled.slice(idx).map((c) => ({ ...c, faceUp: false }))
    const newStock = { id: 'stock', type: 'stock', cards: remaining } as any
    const newWaste = { id: 'waste', type: 'waste', cards: [] as any[] } as any
    // Preserve foundations as-is
    const newPiles = [
      ...newTableau,
      ...foundations.map((p) => ({ ...p, cards: p.cards.slice() })),
      newStock,
      newWaste,
    ]
    const next = {
      ...currentRound,
      piles: newPiles,
      redealsLeft: Math.max(0, currentRound.redealsLeft - 1),
      // Reset waste dealing group
      wasteGroupRemaining: 0 as any,
    }
    set({ currentRound: next as any, selected: null })
  },
  undo: () => {
    const { currentRound, run, currentBosses } = get()
    if (!run || !currentRound) return
    const move: Move = { kind: 'undo' }
    const next = applyMove(currentRound, move, { jokers: run.jokers, bosses: currentBosses })
    set({ currentRound: next })
  },
  hint: () => {
    const { currentRound } = get()
    if (!currentRound) return
    // Very basic: find any tableau->foundation or waste->foundation legal move
    const foundations = currentRound.piles.filter((p) => p.type === 'foundation')
    const tableau = currentRound.piles.filter((p) => p.type === 'tableau')
    for (const t of tableau) {
      const top = t.cards[t.cards.length - 1]
      if (!top || !top.faceUp) continue
      for (const f of foundations) {
        const m: Move = { kind: 'tableau_to_foundation', fromPileId: t.id, toPileId: f.id }
        if (isLegalMove(currentRound, m).ok) {
          set({ selected: { fromPileId: t.id, count: 1 } })
          return
        }
      }
    }
  },
  selectFromTableau: (pileId, cardIndex) => {
    const { currentRound } = get()
    if (!currentRound) return
    const pile = currentRound.piles.find((p) => p.id === pileId)
    if (!pile || pile.type !== 'tableau') return
    const faceUpStart = pile.cards.findIndex((c) => c.faceUp)
    if (faceUpStart < 0) return
    const count = pile.cards.length - cardIndex
    set({ selected: { fromPileId: pileId, count } })
  },
  selectWasteTop: () => {
    const { currentRound } = get()
    if (!currentRound) return
    const waste = currentRound.piles.find((p) => p.id === 'waste')
    if (!waste || waste.cards.length === 0) {
      // If waste is empty, interpret click as a deal action
      get().dealStock()
      return
    }
    set({ selected: { fromPileId: 'waste', count: 1 } })
  },
  selectCustom: (fromPileId, count) => set({ selected: { fromPileId, count } }),
  tryMoveToPile: (toPileId) => {
    const { selected, currentRound, run, currentBosses } = get()
    if (!run || !currentRound || !selected) return
    const from = currentRound.piles.find((p) => p.id === selected.fromPileId)
    const to = currentRound.piles.find((p) => p.id === toPileId)
    if (!from || !to) return
    let move: Move | null = null
    if (from.type === 'tableau' && to.type === 'tableau') {
      move = { kind: 'tableau_to_tableau', fromPileId: from.id, toPileId: to.id, count: selected.count }
    } else if (from.type === 'tableau' && to.type === 'foundation' && selected.count === 1) {
      move = { kind: 'tableau_to_foundation', fromPileId: from.id, toPileId: to.id }
    } else if (from.type === 'waste' && to.type === 'tableau') {
      move = { kind: 'waste_to_tableau', fromPileId: 'waste', toPileId: to.id }
    } else if (from.type === 'waste' && to.type === 'foundation') {
      move = { kind: 'waste_to_foundation', fromPileId: 'waste', toPileId: to.id }
    }
    if (!move) return
    const legal = isLegalMove(currentRound, move)
    if (!legal.ok) {
      // Tactician: forgive one illegal move per round (no error message, consume charge)
      const hasTact = run.jokers.some((j) => j.id === 'tactician')
      const used = (currentRound as any).tacticianForgiveUsed
      if (hasTact && !used) {
        ;(currentRound as any).tacticianForgiveUsed = true
        set({ selected: null, lastMessage: { type: 'info', text: 'Tactician forgives an illegal move.', ts: Date.now() } })
        return
      }
      set({ selected: null, lastMessage: { type: 'error', text: `Illegal: ${'reason' in legal ? legal.reason : 'move'}`, ts: Date.now() } })
      return
    }
    // Prevent auto-dealing more than the current dealt group until consumed
    const groupRem = (currentRound as any).wasteGroupRemaining || 0
    const next = applyMove(currentRound, move, { jokers: run.jokers, bosses: currentBosses })
    // If we moved from waste, decrement remaining; otherwise preserve
    if (move.kind === 'waste_to_tableau' || move.kind === 'waste_to_foundation') {
      ;(next as any).wasteGroupRemaining = Math.max(0, groupRem - 1)
    } else {
      ;(next as any).wasteGroupRemaining = groupRem
    }
    set({ currentRound: next, selected: null })
    ;(get() as any)._autoCompleteIfTarget()
  },
  cancelSelection: () => set({ selected: null }),
  goTo: (screen) => set({ uiScreen: screen }),
  backToStart: () => set({ uiScreen: 'start', run: null, currentRound: null }),
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  clearMessage: () => set({ lastMessage: null }),
  dismissSummary: () => set({ lastOutcome: null }),
  togglePause: () => set((s) => ({ paused: !s.paused })),
  setPaused: (v) => set({ paused: v }),
  continueSavedRun: () => {
    const saved = loadRun()
    if (!saved) return
    // Infer next board from history entries for current round
    const completedInAnte = saved.history.filter((h) => h.ante === saved.ante).length
    const inferredBlindIndex = Math.min(2, Math.max(0, completedInAnte))
    set({ run: saved, uiScreen: 'game', hasSavedRun: true, blindIndex: inferredBlindIndex, lastOutcome: null, currentRound: null, currentBlind: null, currentBosses: [], selected: null })
  },
  unlockAchievement: (id) => set((s) => ({ achievements: { ...s.achievements, [id]: true } })),
  openShop: () => set({ shopOpen: true, lastOutcome: null }),
  closeShop: () => {
    const { currentRound, isGameOver } = get()
    set({ shopOpen: false })
    // If we're between boards (no active round, not game over), auto-start the next board
    if (!currentRound && !isGameOver) {
      get().startNextBoard()
    }
  },
  // Initialize shop when summary opens
  initShop: () => set((s): Partial<UIState> => {
    if (!s.run) return {}
    let { offers } = generateShopOffers(s.run.seed, s.run.ante, 0, [])
    // Variant roll for jokers (deterministic)
    const rng = new LcgRng(`${s.run.seed}-shop-${s.run.ante}-v2-0`)
    offers = offers.map((o) => {
      if ((o as any).kind === 'joker') {
        const rollVar = rng.float()
        const variant = rollVar < 0.05 ? 'holo' : rollVar < 0.15 ? 'foil' : undefined
        if (variant) {
          const name = variant === 'foil' ? `${(o as any).name} [Foil]` : `${(o as any).name} [Holo]`
          const priceBump = variant === 'foil' ? 3 : 6
          return { ...(o as any), name, price: (o as any).price + priceBump }
        }
      }
      return o
    })
    return { shopOffers: offers as any, shopRolls: 0 }
  }),
  rerollShop: () => set((s): Partial<UIState> => {
    if (!s.run) return {}
    const rolls = s.shopRolls || 0
    const cost = rolls >= 1 ? 3 : 0
    if (cost > 0 && s.run.coins < cost) {
      return { lastMessage: { type: 'error', text: 'Not enough coins to reroll', ts: Date.now() } }
    }
    const locked = s.shopOffers.filter((o) => o.locked || o.kind === 'special') as any
    let { offers } = generateShopOffers(s.run.seed, s.run.ante, (s.shopRolls || 0) + 1, locked)
    // Variant roll for jokers (deterministic)
    const rng = new LcgRng(`${s.run.seed}-shop-${s.run.ante}-v2-${(s.shopRolls || 0) + 1}`)
    offers = offers.map((o) => {
      if ((o as any).kind === 'joker' && !(o as any).name.includes('[Foil]') && !(o as any).name.includes('[Holo]')) {
        const rollVar = rng.float()
        const variant = rollVar < 0.05 ? 'holo' : rollVar < 0.15 ? 'foil' : undefined
        if (variant) {
          const name = variant === 'foil' ? `${(o as any).name} [Foil]` : `${(o as any).name} [Holo]`
          const priceBump = variant === 'foil' ? 3 : 6
          return { ...(o as any), name, price: (o as any).price + priceBump }
        }
      }
      return o
    })
    const updates: Partial<UIState> = { shopOffers: offers as any, shopRolls: (s.shopRolls || 0) + 1 }
    if (cost > 0) updates.run = { ...s.run, coins: s.run.coins - cost }
    return updates
  }),
  buyOffer: (id) => set((s): Partial<UIState> => {
    const offer = s.shopOffers.find((o) => o.id === id)
    if (!offer || !s.run) return {}
    if (offer.price > s.run.coins) return {}
    const nextCoins = s.run.coins - offer.price
    if (offer.kind === 'joker') {
      if (s.run.jokers.length >= 5) return { lastMessage: { type: 'error', text: 'Joker tray full', ts: Date.now() } }
      const baseJoker = jokerRegistry[offer.jokerId]
      if (!baseJoker) return {}
      // Infer variant from the offer name suffix
      let variant: 'foil' | 'holo' | undefined
      if (offer.name.endsWith(' [Foil]')) variant = 'foil'
      if (offer.name.endsWith(' [Holo]')) variant = 'holo'
      const equipped = [...s.run.jokers, { ...baseJoker, ...(variant ? { variant } : {}) }]
      return { run: { ...s.run, coins: nextCoins, jokers: equipped }, shopOffers: s.shopOffers.filter((o) => o.id !== id) }
    } else if (offer.kind === 'boost') {
      // Boosts: apply immediately to current round config
      let patch: any = {}
      if (offer.boostId === 'redeal') patch = { redealsLeft: (s.currentRound?.redealsLeft || 0) + 1 }
      if (offer.boostId === 'time10') patch = { timeRemainingSec: Math.round((s.currentRound?.timeRemainingSec || 0) * 1.1) }
      if (offer.boostId === 'target10off' && s.currentRound) s.currentRound.config.targetScore = Math.max(0, Math.round(s.currentRound.config.targetScore * 0.9))
      const newRound = s.currentRound ? { ...s.currentRound, ...patch } : s.currentRound
      return { run: { ...s.run, coins: nextCoins }, currentRound: newRound, shopOffers: s.shopOffers.filter((o) => o.id !== id) }
    } else if ((offer as any).kind === 'god') {
      // Add God Card to inventory
      const baseId = (offer as any).godId as string
      let effect: any = 'double_next'
      if (baseId === 'zephyr') effect = 'reveal_tops'
      else if (baseId === 'chronos') effect = 'time_plus'
      else if (baseId === 'athena') effect = 'double_next'
      else if (baseId === 'ares') effect = 'rank_up_foundation'
      else if (baseId === 'hermes') effect = 'rank_up_reveal'
      else if (baseId === 'hestia') effect = 'rank_up_empty'
      const god = { id: baseId, name: (offer as any).name as string, description: (offer as any).description as string, effect }
      const run = { ...s.run, coins: nextCoins, godCards: [...(s.run.godCards || []), god] }
      return { run, shopOffers: s.shopOffers.filter((o) => o.id !== id) }
    } else if (offer.kind === 'pack') {
      // Packs: apply rewards on purchase
      if (!s.run) return {}
      // For now, packs grant coins or reroll options simplified; extend to real content later
      let deltaCoins = 0
      if (offer.packType === 'cards') deltaCoins = 0 // no coins, placeholder for deck enrichment
      if (offer.packType === 'jokers') deltaCoins = 0
      if (offer.packType === 'gods') deltaCoins = 0
      return { run: { ...s.run, coins: nextCoins + deltaCoins }, shopOffers: s.shopOffers.filter((o) => o.id !== id) }
    } else if (offer.kind === 'special') {
      // Special: apply unique effect placeholder; just a cosmetic coin sink for now
      return { run: { ...s.run, coins: nextCoins }, shopOffers: s.shopOffers.filter((o) => o.id !== id) }
    }
    return {}
  }),
  toggleLockOffer: (id) => set((s): Partial<UIState> => ({ shopOffers: s.shopOffers.map(o => o.id === id ? { ...o, locked: !o.locked } : o) })),
  sellJoker: (jokerId) => set((s) => {
    if (!s.run) return {}
    const idx = s.run.jokers.findIndex(j => j.id === jokerId)
    if (idx < 0) return {}
    const rarity = jokerRegistry[jokerId]?.rarity || 'common'
    const avgPrice: Record<string, number> = { common: 4, uncommon: 7, rare: 12, legendary: 20 }
    const refund = Math.floor((avgPrice[rarity] || 5) * 0.5)
    const nextJokers = s.run.jokers.slice()
    nextJokers.splice(idx, 1)
    return { run: { ...s.run, coins: s.run.coins + refund, jokers: nextJokers }, lastMessage: { type: 'info', text: `Sold for ${refund}`, ts: Date.now() } }
  }),
  useGodCard: (godId) => set((s): Partial<UIState> => {
    const run = s.run
    if (!run) return {}
    const idx = (run.godCards || []).findIndex((g) => g.id === godId)
    if (idx < 0) return {}
    const g = run.godCards[idx]
    // Apply effects
    if (g.effect === 'reveal_tops') {
      const r = s.currentRound
      if (r) {
        const next = { ...r, piles: r.piles.map((p: any) => p.type === 'tableau' && p.cards.length > 0 ? { ...p, cards: p.cards.map((c: any, i: number, arr: any[]) => i === arr.length - 1 ? { ...c, faceUp: true } : c) } : p) }
        // remove card
        const nextGods = run.godCards.slice(); nextGods.splice(idx, 1)
        return { currentRound: next, run: { ...run, godCards: nextGods } }
      }
    }
    if (g.effect === 'time_plus') {
      const r = s.currentRound
      const nextGods = run.godCards.slice(); nextGods.splice(idx, 1)
      if (r) return { currentRound: { ...r, timeRemainingSec: r.timeRemainingSec + 30 }, run: { ...run, godCards: nextGods } }
      return { run: { ...run, godCards: nextGods } }
    }
    if (g.effect === 'double_next') {
      const r: any = s.currentRound
      const nextGods = run.godCards.slice(); nextGods.splice(idx, 1)
      if (r) { r.snapCharges = (r.snapCharges || 0) + 1; return { currentRound: { ...r }, run: { ...run, godCards: nextGods } } }
      return { run: { ...run, godCards: nextGods } }
    }
    if (g.effect === 'rank_up_foundation' || g.effect === 'rank_up_reveal' || g.effect === 'rank_up_empty') {
      const cat = g.effect === 'rank_up_foundation' ? 'foundation_move' : g.effect === 'rank_up_reveal' ? 'reveal_face_down' : 'empty_column'
      const nextRanks = { ...run.scoreRanks, [cat]: (run.scoreRanks[cat] || 1) + 0.1 }
      const title = cat === 'foundation_move' ? `${g.name}, Patron of Pillars` : cat === 'reveal_face_down' ? `${g.name}, Keeper of Secrets` : `${g.name}, Warden of the Void`
      const patrons = { ...(run as any).scoreRankPatrons, [cat]: { godId: g.id, name: g.name, title } }
      const nextGods = run.godCards.slice(); nextGods.splice(idx, 1)
      return { run: { ...run, scoreRanks: nextRanks, scoreRankPatrons: patrons, godCards: nextGods } }
    }
    // default: just remove if unknown
    const nextGods = run.godCards.slice(); nextGods.splice(idx, 1)
    return { run: { ...run, godCards: nextGods } }
  }),
  unequipJoker: (jokerId: string) => set((s): Partial<UIState> => {
    if (!s.run) return {}
    const nextJokers = s.run.jokers.filter((j) => j.id !== jokerId)
    return { run: { ...s.run, jokers: nextJokers } }
  }),
  moveJoker: (jokerId: string, direction: 'left' | 'right') => set((s): Partial<UIState> => {
    if (!s.run) return {}
    const arr = s.run.jokers.slice()
    const idx = arr.findIndex((j) => j.id === jokerId)
    if (idx < 0) return {}
    const swapWith = direction === 'left' ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= arr.length) return {}
    ;[arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]]
    return { run: { ...s.run, jokers: arr } }
  }),
  reorderJoker: (jokerId, toIndex) => set((s): Partial<UIState> => {
    if (!s.run) return {}
    const currentJokers = s.run.jokers.slice()
    const fromIndex = currentJokers.findIndex((j) => j.id === jokerId)
    if (fromIndex < 0) return {}
    const boundedIndex = Math.max(0, Math.min(toIndex, currentJokers.length - 1))
    if (fromIndex === boundedIndex) return {}
    const [moving] = currentJokers.splice(fromIndex, 1)
    currentJokers.splice(boundedIndex, 0, moving)
    return { run: { ...s.run, jokers: currentJokers } }
  }),
  rankUp: (cat) => set((s): Partial<UIState> => {
    if (!s.run) return {}
    const cost = 5
    if (s.run.coins < cost) return { lastMessage: { type: 'error', text: 'Not enough coins to rank up', ts: Date.now() } }
    const nextRanks = { ...s.run.scoreRanks, [cat]: (s.run.scoreRanks[cat] || 1) + 0.1 }
    // If no patron set yet for this category, leave it blank; god cards can set it when used
    return { run: { ...s.run, coins: s.run.coins - cost, scoreRanks: nextRanks } }
  }),
  // internal helper
  _autoCompleteIfTarget: () => {
    const { currentRound } = get()
    if (!currentRound) return
    if (currentRound.score >= currentRound.config.targetScore) {
      // finalize round success
      get().completeRound(true)
    }
  },
}))


