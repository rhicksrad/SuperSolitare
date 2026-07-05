// Run orchestration: antes, blind targets, round creation, cash-out economy,
// and god-card effects. Pure functions over RunState/RoundState.

import { bossRegistry } from './bosses'
import { buildDeck, rollEnhancement } from './cards'
import { godRegistry } from './gods'
import { jokerRegistry } from './jokers'
import { dealRound, foundationFor } from './klondike'
import type { BlindKind, RoundRules, RoundState } from './klondike'
import { Rng } from './rng'
import { performMove, runHasPassive } from './scoring'
import type { ScorePop } from './scoring'
import type { RunState } from './types'
import { allBossIds } from './bosses'

export const FINAL_ANTE = 8

/** Base target per ante; small = 1×, big = 1.4×, boss = 2× (× boss targetMult) */
export const ANTE_BASE_TARGETS = [0, 300, 800, 1700, 3000, 5000, 7500, 11000, 16000]

export const BLIND_MULT: Record<BlindKind, number> = { small: 1, big: 1.4, boss: 2 }

export const BLIND_REWARD: Record<BlindKind, number> = { small: 4, big: 5, boss: 6 }

export const INTEREST_STEP = 5 // $1 per $5 held
export const INTEREST_CAP = 5

export const BASE_RULES: RoundRules = { dealSize: 3, recycles: 2, discards: 3 }

export function blindTarget(run: RunState, ante: number, blind: BlindKind): number {
  const base = ANTE_BASE_TARGETS[Math.min(ante, ANTE_BASE_TARGETS.length - 1)]
  let target = base * BLIND_MULT[blind]
  if (blind === 'boss') {
    const boss = bossRegistry[run.bosses[ante - 1]]
    if (boss?.targetMult) target *= boss.targetMult
  }
  return Math.round(target)
}

export function newRun(seed: string, mode: 'standard' | 'daily' = 'standard'): RunState {
  const rng = new Rng(`${seed}::run`)
  const bosses: string[] = []
  let bag: string[] = []
  for (let a = 0; a < FINAL_ANTE; a++) {
    if (bag.length === 0) bag = rng.shuffle(allBossIds)
    bosses.push(bag.pop()!)
  }
  return {
    seed,
    ante: 1,
    blindIndex: 0,
    money: 4,
    jokers: [],
    jokerSlots: 5,
    consumables: [],
    consumableSlots: 2,
    enhancements: {},
    levels: { foundation: 1, reveal: 1, empty_column: 1 },
    bosses,
    rng: rng.state,
    history: [],
    skips: 0,
    roundsWon: 0,
    bestPlay: 0,
    mode,
  }
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
  if (boss?.modifyRules) rules = boss.modifyRules(rules)

  const target = blindTarget(run, run.ante, blind)
  const rng = new Rng(run.rng)
  const round = dealRound(rng.derive(`deal-${run.ante}-${blind}`), buildDeck(), {
    rules,
    blind,
    bossId,
    target,
  })
  return { round, run: { ...run, rng: rng.state } }
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

export function interestFor(money: number): number {
  return Math.min(INTEREST_CAP, Math.floor(money / INTEREST_STEP))
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

  if (won) {
    reward += BLIND_REWARD[blind]
    breakdown.push({ label: `${blind === 'boss' ? 'Boss' : blind === 'big' ? 'Big' : 'Small'} blind`, amount: BLIND_REWARD[blind] })
    const unused = Math.min(3, round.discardsLeft)
    if (unused > 0) {
      reward += unused
      breakdown.push({ label: `Unused discards (${unused})`, amount: unused })
    }
    const interest = interestFor(run.money)
    if (interest > 0) {
      reward += interest
      breakdown.push({ label: `Interest ($1 per $${INTEREST_STEP}, max $${INTEREST_CAP})`, amount: interest })
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
      if (run.ante >= FINAL_ANTE) {
        runWon = true
        next = { ...next, ante: run.ante + 1 }
      } else {
        next = { ...next, ante: run.ante + 1, blindIndex: 0 }
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

/** Skip a small/big blind for a random god card ("an omen") */
export function skipBlind(run: RunState): { run: RunState; godId: string | null } {
  if (currentBlind(run) === 'boss') return { run, godId: null }
  const rng = new Rng(run.rng)
  let godId: string | null = null
  if (run.consumables.length < run.consumableSlots) {
    godId = rng.pick(Object.keys(godRegistry))
  }
  const next: RunState = {
    ...run,
    blindIndex: run.blindIndex + 1,
    skips: run.skips + 1,
    consumables: godId ? [...run.consumables, godId] : run.consumables,
    rng: rng.state,
  }
  return { run: next, godId }
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
