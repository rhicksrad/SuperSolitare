// Run orchestration: antes, blind targets, round creation, cash-out economy,
// and god-card effects. Pure functions over RunState/RoundState.

import { allBossIds, bossRegistry, finisherBossIds } from './bosses'
import { buildDeck, rollEnhancement } from './cards'
import { deckRegistry, STAKES } from './decks'
import { godRegistry } from './gods'
import { jokerRegistry } from './jokers'
import { dealRound, foundationFor } from './klondike'
import type { BlindKind, RoundRules, RoundState } from './klondike'
import { Rng } from './rng'
import { performMove, runHasPassive } from './scoring'
import type { ScorePop } from './scoring'
import type { RunState, SkipTag, TagKind } from './types'
import { allVoucherIds, hasVoucher } from './vouchers'

export const FINAL_ANTE = 8

/** Base target per ante; small = 1×, big = 1.4×, boss = 2× (× boss targetMult) */
export const ANTE_BASE_TARGETS = [0, 300, 800, 1700, 3000, 5000, 7500, 11000, 16000]

/** Endless: each ante past 8 multiplies the ante-8 base by this */
export const ENDLESS_GROWTH = 1.6

export const BLIND_MULT: Record<BlindKind, number> = { small: 1, big: 1.4, boss: 2 }

export const BLIND_REWARD: Record<BlindKind, number> = { small: 4, big: 5, boss: 6 }

export const INTEREST_STEP = 5 // $1 per $5 held
export const INTEREST_CAP = 5

export const BASE_RULES: RoundRules = { dealSize: 3, recycles: 2, discards: 3 }

export function anteBase(ante: number): number {
  if (ante <= FINAL_ANTE) return ANTE_BASE_TARGETS[Math.max(1, ante)]
  return Math.round(ANTE_BASE_TARGETS[FINAL_ANTE] * Math.pow(ENDLESS_GROWTH, ante - FINAL_ANTE))
}

export function blindTarget(run: RunState, ante: number, blind: BlindKind): number {
  let target = anteBase(ante) * BLIND_MULT[blind]
  if (blind === 'boss') {
    const boss = bossRegistry[run.bosses[ante - 1]]
    if (boss?.targetMult) target *= boss.targetMult
  }
  target *= STAKES[run.stake]?.targetMult ?? 1
  target *= deckRegistry[run.deckId]?.targetMult ?? 1
  return Math.round(target)
}

export function newRun(
  seed: string,
  mode: 'standard' | 'daily' = 'standard',
  deckId = 'classic',
  stake = 0,
): RunState {
  const rng = new Rng(`${seed}::run`)
  const deck = deckRegistry[deckId] ?? deckRegistry.classic
  const bosses: string[] = []
  let bag: string[] = []
  for (let a = 0; a < FINAL_ANTE - 1; a++) {
    if (bag.length === 0) bag = rng.shuffle(allBossIds)
    bosses.push(bag.pop()!)
  }
  bosses.push(rng.pick(finisherBossIds)) // ante 8 gets a finisher

  const enhancements: RunState['enhancements'] = {}
  if (deck.startEnhancedCards) {
    const cards = rng.shuffle(buildDeck()).slice(0, deck.startEnhancedCards)
    for (const c of cards) enhancements[c.id] = rollEnhancement(rng)
  }
  const vouchers: string[] = deck.startVoucher ? [rng.pick(allVoucherIds)] : []

  return {
    seed,
    ante: 1,
    blindIndex: 0,
    money: deck.startMoney ?? 4,
    jokers: [],
    jokerSlots: 5,
    consumables: [],
    consumableSlots: 2,
    enhancements,
    levels: { foundation: 1, reveal: 1, empty_column: 1 },
    bosses,
    vouchers,
    deckId: deck.id,
    stake,
    endless: false,
    rng: rng.state,
    history: [],
    skips: 0,
    roundsWon: 0,
    bestPlay: 0,
    mode,
  }
}

/** Endless mode rolls bosses lazily for antes past 8 */
export function ensureBossForAnte(run: RunState, ante: number): RunState {
  if (run.bosses.length >= ante) return run
  const rng = new Rng(run.rng)
  const bosses = [...run.bosses]
  while (bosses.length < ante) {
    const pool = bosses.length % 4 === 3 ? finisherBossIds : allBossIds
    bosses.push(rng.pick(pool))
  }
  return { ...run, bosses, rng: rng.state }
}

export function currentBlind(run: RunState): BlindKind {
  return (['small', 'big', 'boss'] as const)[run.blindIndex]
}

export function startRound(run: RunState): { round: RoundState; run: RunState } {
  const blind = currentBlind(run)
  const bossId = blind === 'boss' ? run.bosses[run.ante - 1] : null
  const boss = bossId ? bossRegistry[bossId] : null

  let rules: RoundRules = { ...BASE_RULES }
  // Joker round modifiers
  for (const j of run.jokers) {
    const mods = jokerRegistry[j.id]?.roundMods
    if (!mods) continue
    if (mods.extraRecycles) rules.recycles += mods.extraRecycles
    if (mods.extraDiscards) rules.discards += mods.extraDiscards
    if (mods.dealSize) rules.dealSize = mods.dealSize
  }
  if (runHasPassive(run, null, 'anyColorStacking')) rules.anyColorStacking = true
  // Voucher round modifiers
  if (hasVoucher(run.vouchers, 'crowbar')) rules.discards += 1
  if (hasVoucher(run.vouchers, 'perpetual-motion')) rules.recycles += 1
  // Surplus skip tag
  if (run.pendingSurplus) {
    rules.recycles += 1
    rules.discards += 2
  }
  if (boss?.modifyRules) rules = boss.modifyRules(rules)

  const target = blindTarget(run, run.ante, blind)
  const rng = new Rng(run.rng)
  const round = dealRound(rng.derive(`deal-${run.ante}-${blind}`), buildDeck(), {
    rules,
    blind,
    bossId,
    target,
  })
  // The Hex: curse random deck cards for this round
  if (boss?.cursesCards) {
    const cursed = rng.derive(`hex-${run.ante}`).shuffle(buildDeck()).slice(0, boss.cursesCards)
    round.curses = cursed.map((c) => c.id)
  }
  return { round, run: { ...run, rng: rng.state, pendingSurplus: false } }
}

// ---------------------------------------------------------------------------
// Round end & economy

export interface RoundResult {
  won: boolean
  score: number
  target: number
  reward: number
  breakdown: Array<{ label: string; amount: number }>
  runWon: boolean
}

export function interestFor(money: number, cap = INTEREST_CAP): number {
  return Math.min(cap, Math.floor(money / INTEREST_STEP))
}

export function interestCapFor(run: RunState): number {
  let cap = INTEREST_CAP + (deckRegistry[run.deckId]?.interestCapBonus ?? 0)
  if (hasVoucher(run.vouchers, 'deep-pockets')) cap = Math.max(cap, 10)
  return cap
}

export function interestForRun(run: RunState): number {
  return interestFor(run.money, interestCapFor(run))
}

/**
 * Cash out the round. Call when the player banks a win, clears the board, or
 * concedes. Returns the updated run (advanced to next blind/ante on a win).
 */
export function finishRound(run: RunState, round: RoundState): { run: RunState; result: RoundResult } {
  const blind = currentBlind(run)
  const won = round.score >= round.target
  const breakdown: Array<{ label: string; amount: number }> = []
  let reward = 0

  const boss = round.bossId ? bossRegistry[round.bossId] : null
  if (won) {
    if (!boss?.mutesBlindReward) {
      const stakePenalty = STAKES[run.stake]?.rewardPenalty ?? 0
      const tithe = hasVoucher(run.vouchers, 'tithe') ? 2 : 0
      const base = Math.max(1, BLIND_REWARD[blind] - stakePenalty + tithe)
      reward += base
      breakdown.push({ label: `${blind === 'boss' ? 'Boss' : blind === 'big' ? 'Big' : 'Small'} blind`, amount: base })
    } else {
      breakdown.push({ label: `${boss.name} devours the reward`, amount: 0 })
    }
    const unused = Math.min(3, round.discardsLeft)
    if (unused > 0) {
      reward += unused
      breakdown.push({ label: `Unused discards (${unused})`, amount: unused })
    }
    const interest = interestForRun(run)
    if (interest > 0) {
      reward += interest
      breakdown.push({ label: `Interest ($1 per $${INTEREST_STEP})`, amount: interest })
    }
    // Joker round-end money
    for (const j of run.jokers) {
      const hook = jokerRegistry[j.id]?.hooks?.onRoundEnd
      if (!hook) continue
      const res = hook(round, run, j.state)
      if (res?.money) {
        reward += res.money
        breakdown.push({ label: jokerRegistry[j.id].name, amount: res.money })
      }
    }
  }

  const history = [...run.history, { ante: run.ante, blind, score: round.score, target: round.target }]
  let next: RunState = { ...run, money: run.money + reward, history }

  let runWon = false
  if (won) {
    next.roundsWon = run.roundsWon + 1
    if (blind === 'boss') {
      if (run.ante >= FINAL_ANTE && !run.endless) {
        runWon = true // victory screen offers Endless from here
        next = { ...next, ante: run.ante + 1, blindIndex: 0 }
      } else {
        next = ensureBossForAnte({ ...next, ante: run.ante + 1, blindIndex: 0 }, run.ante + 1)
      }
    } else {
      next = { ...next, blindIndex: run.blindIndex + 1 }
    }
  }

  return {
    run: next,
    result: { won, score: round.score, target: round.target, reward, breakdown, runWon },
  }
}

// ---------------------------------------------------------------------------
// Skip tags — shown on the blind card before you commit to skipping

const TAG_KINDS: TagKind[] = ['money', 'god', 'joker', 'enhance', 'surplus']

/** Deterministic per ante+blind so the player can see it before skipping */
export function skipTagFor(run: RunState, blindIndex: number): SkipTag {
  const rng = new Rng(`${run.seed}::tag-${run.ante}-${blindIndex}`)
  const kind = rng.pick(TAG_KINDS)
  switch (kind) {
    case 'money':
      return { kind, name: 'Coin Tag', description: 'Gain $7' }
    case 'god':
      return { kind, name: 'Omen Tag', description: 'Gain a random god card' }
    case 'joker':
      return { kind, name: 'Wildcard Tag', description: 'Gain a random common joker' }
    case 'enhance':
      return { kind, name: 'Forge Tag', description: 'Enhance 2 random cards in your deck' }
    case 'surplus':
      return { kind, name: 'Surplus Tag', description: '+1 recycle and +2 discards next round' }
  }
}

export function skipBlind(run: RunState): { run: RunState; tag: SkipTag | null; message: string } {
  if (currentBlind(run) === 'boss') return { run, tag: null, message: 'Bosses cannot be skipped' }
  const tag = skipTagFor(run, run.blindIndex)
  const rng = new Rng(run.rng)
  let next: RunState = {
    ...run,
    blindIndex: run.blindIndex + 1,
    skips: run.skips + 1,
    rng: rng.state,
  }
  let message = tag.description
  switch (tag.kind) {
    case 'money':
      next = { ...next, money: next.money + 7 }
      message = '+$7'
      break
    case 'god': {
      if (next.consumables.length < next.consumableSlots) {
        const godId = rng.pick(Object.keys(godRegistry))
        next = { ...next, consumables: [...next.consumables, godId], rng: rng.state }
        message = `The fates grant ${godRegistry[godId].name}`
      } else {
        next = { ...next, money: next.money + 4 }
        message = 'God slots full — $4 instead'
      }
      break
    }
    case 'joker': {
      const commons = Object.values(jokerRegistry).filter(
        (d) => d.rarity === 'common' && !next.jokers.some((j) => j.id === d.id),
      )
      const slotsUsed = next.jokers.filter((j) => j.edition !== 'negative').length
      if (commons.length > 0 && slotsUsed < next.jokerSlots) {
        const def = rng.pick(commons)
        next = { ...next, jokers: [...next.jokers, { id: def.id, state: {} }], rng: rng.state }
        message = `${def.name} joins your crew`
      } else {
        next = { ...next, money: next.money + 4 }
        message = 'No room for a joker — $4 instead'
      }
      break
    }
    case 'enhance': {
      const unenhanced = rng.shuffle(buildDeck().filter((c) => !next.enhancements[c.id])).slice(0, 2)
      const enhancements = { ...next.enhancements }
      const named: string[] = []
      for (const c of unenhanced) {
        enhancements[c.id] = rollEnhancement(rng)
        named.push(`${c.id} → ${enhancements[c.id]}`)
      }
      next = { ...next, enhancements, rng: rng.state }
      message = named.join(', ') || 'Every card is already enhanced'
      break
    }
    case 'surplus':
      next = { ...next, pendingSurplus: true }
      message = '+1 recycle and +2 discards next round'
      break
  }
  return { run: next, tag, message }
}

// ---------------------------------------------------------------------------
// God card usage

export interface GodUseResult {
  run: RunState
  round: RoundState | null
  message: string
  pops?: ScorePop[]
  ok: boolean
}

export function applyGodCard(run: RunState, round: RoundState | null, godId: string): GodUseResult {
  const def = godRegistry[godId]
  const idx = run.consumables.indexOf(godId)
  if (!def || idx < 0) return { run, round, message: 'Card not held', ok: false }

  const consume = (r: RunState): RunState => {
    const consumables = [...r.consumables]
    consumables.splice(idx, 1)
    return { ...r, consumables }
  }
  const rng = new Rng(run.rng)

  switch (def.id) {
    case 'ares': {
      const next = consume({ ...run, levels: { ...run.levels, foundation: run.levels.foundation + 1 } })
      return { run: next, round, message: `Foundation plays are now level ${next.levels.foundation}`, ok: true }
    }
    case 'hermes': {
      const next = consume({ ...run, levels: { ...run.levels, reveal: run.levels.reveal + 1 } })
      return { run: next, round, message: `Reveals are now level ${next.levels.reveal}`, ok: true }
    }
    case 'hestia': {
      const next = consume({ ...run, levels: { ...run.levels, empty_column: run.levels.empty_column + 1 } })
      return { run: next, round, message: `Empty columns are now level ${next.levels.empty_column}`, ok: true }
    }
    case 'chronos': {
      if (!round) return { run, round, message: 'Only usable during a round', ok: false }
      return { run: consume(run), round: { ...round, recyclesLeft: round.recyclesLeft + 1 }, message: '+1 recycle', ok: true }
    }
    case 'hades': {
      if (!round) return { run, round, message: 'Only usable during a round', ok: false }
      return { run: consume(run), round: { ...round, discardsLeft: round.discardsLeft + 2 }, message: '+2 discards', ok: true }
    }
    case 'poseidon': {
      if (!round) return { run, round, message: 'Only usable during a round', ok: false }
      return { run: consume(run), round: { ...round, boostCharges: round.boostCharges + 3 }, message: 'Next 3 foundation plays get ×2 mult', ok: true }
    }
    case 'zeus': {
      if (!round) return { run, round, message: 'Only usable during a round', ok: false }
      let curRound = round
      let curRun = consume(run)
      const pops: ScorePop[] = []
      let moved = true
      let plays = 0
      while (moved) {
        moved = false
        for (let t = 0; t < 7; t++) {
          const col = curRound.tableau[t]
          const top = col[col.length - 1]
          if (top?.faceUp) {
            const f = foundationFor(curRound, top)
            if (f) {
              const out = performMove(curRound, curRun, {
                kind: 'tableau_to_foundation',
                from: `t${t}` as import('./klondike').TableauId,
                to: f,
              })
              curRound = out.round
              curRun = out.run
              pops.push(...out.pops)
              moved = true
              plays++
            }
          }
        }
        const wasteTop = curRound.waste[curRound.waste.length - 1]
        if (wasteTop) {
          const f = foundationFor(curRound, wasteTop)
          if (f) {
            const out = performMove(curRound, curRun, { kind: 'waste_to_foundation', to: f })
            curRound = out.round
            curRun = out.run
            pops.push(...out.pops)
            moved = true
            plays++
          }
        }
      }
      return { run: curRun, round: curRound, message: plays > 0 ? `Zeus played ${plays} card${plays === 1 ? '' : 's'}` : 'Nothing was playable', pops, ok: plays > 0 }
    }
    case 'apollo':
    case 'aphrodite':
    case 'athena': {
      const enhancement = def.id === 'apollo' ? 'gilded' : def.id === 'aphrodite' ? 'ruby' : 'sapphire'
      const unenhanced = buildDeck().filter((c) => !run.enhancements[c.id])
      if (unenhanced.length === 0) return { run, round, message: 'Every card is already enhanced', ok: false }
      const card = rng.pick(unenhanced)
      const next = consume({ ...run, enhancements: { ...run.enhancements, [card.id]: enhancement }, rng: rng.state })
      return { run: next, round, message: `${card.id} is now ${enhancement}`, ok: true }
    }
    case 'dionysus': {
      const gain = rng.range(3, 8)
      const next = consume({ ...run, money: run.money + gain, rng: rng.state })
      return { run: next, round, message: `+$${gain}`, ok: true }
    }
    case 'artemis': {
      if (!round) return { run, round, message: 'Only usable during a round', ok: false }
      if (round.waste.length === 0) return { run, round, message: 'The waste is already empty', ok: false }
      const burned = [...round.burned, ...round.waste.map((c) => ({ ...c }))]
      const count = round.waste.length
      const nextRound = { ...round, waste: [], burned }
      const onFoundations = nextRound.foundations.reduce((n, p) => n + p.length, 0)
      if (onFoundations + nextRound.burned.length === 52) nextRound.finished = true
      return { run: consume(run), round: nextRound, message: `Artemis burns ${count} card${count === 1 ? '' : 's'}`, ok: true }
    }
    case 'hecate': {
      if (!round) return { run, round, message: 'Only usable during a round', ok: false }
      const hadCurses = round.curses.length
      const nextRound = { ...round, curses: [], discardsLeft: round.discardsLeft + 1 }
      return {
        run: consume(run),
        round: nextRound,
        message: hadCurses > 0 ? `${hadCurses} curse${hadCurses === 1 ? '' : 's'} cleansed, +1 discard` : '+1 discard',
        ok: true,
      }
    }
    default:
      return { run, round, message: 'Unknown card', ok: false }
  }
}

/** Roll a random enhancement using the run RNG (for card packs) */
export function rollPackEnhancement(run: RunState): { run: RunState; enhancement: ReturnType<typeof rollEnhancement> } {
  const rng = new Rng(run.rng)
  const enhancement = rollEnhancement(rng)
  return { run: { ...run, rng: rng.state }, enhancement }
}
