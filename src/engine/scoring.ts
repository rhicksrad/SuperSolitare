// The chips × mult pipeline. Consumes the events emitted by applyMove and
// produces score deltas plus a breakdown the UI can animate.
//
// Foundation play:  (level chips + card chips + enhancements + joker chips)
//                 × (level mult + streak + enhancements + joker mult)
//                 × (joker/enhancement/boost ×mults), then boss adjustments.

import { cardChips } from './cards'
import type { Card } from './cards'
import { bossRegistry } from './bosses'
import { deckRegistry } from './decks'
import { jokerRegistry } from './jokers'
import { applyMove } from './klondike'
import type { Move, MoveEvent, RoundState } from './klondike'
import { Rng } from './rng'
import type { HookResult, PlayContext, RunState } from './types'

export interface ScorePop {
  kind: 'foundation' | 'reveal' | 'empty_column' | 'penalty' | 'clear'
  label: string
  chips?: number
  mult?: number
  total: number
  card?: Card
  money?: number
}

export interface MoveOutcome {
  round: RoundState
  run: RunState
  pops: ScorePop[]
  events: MoveEvent[]
}

export function foundationLevelBase(level: number): { chips: number; mult: number } {
  return { chips: 10 + 5 * level, mult: level }
}

export function revealPoints(level: number): number {
  return 20 + 15 * (level - 1)
}

export function emptyColumnPoints(level: number): number {
  return 100 + 75 * (level - 1)
}

export const BOARD_CLEAR_BONUS = 500

function activeJokers(run: RunState, round: RoundState) {
  const boss = round.bossId ? bossRegistry[round.bossId] : null
  return run.jokers.filter((_j, i) => !(boss?.silencesFirstJoker && i === 0))
}

export function runHasPassive(
  run: RunState,
  round: RoundState | null,
  key: 'anyColorStacking' | 'enhancementsTwice' | 'streakNeverBreaks',
): boolean {
  const jokers = round ? activeJokers(run, round) : run.jokers
  return jokers.some((joker) => jokerRegistry[joker.id]?.passives?.[key])
}

function applyHookResult(
  acc: { chips: number; mult: number; xmults: number[]; money: number },
  res: HookResult | void,
) {
  if (!res) return
  if (res.chips) acc.chips += res.chips
  if (res.mult) acc.mult += res.mult
  if (res.xmult && res.xmult !== 1) acc.xmults.push(res.xmult)
  if (res.money) acc.money += res.money
}

/**
 * Score a single foundation play. Mutates nothing; returns the pop plus money
 * earned. Joker scaling-state mutations happen because ctx.state is the live
 * instance state on the (already-cloned) run.
 */
function scoreFoundationPlay(
  card: Card,
  fromWaste: boolean,
  round: RoundState,
  run: RunState,
  rng: Rng,
): ScorePop {
  const boss = round.bossId ? bossRegistry[round.bossId] : null
  const base = foundationLevelBase(run.levels.foundation)

  let streakBonus = round.streak
  if (boss?.streakCap != null) streakBonus = Math.min(streakBonus, boss.streakCap)

  const cursed = round.curses.includes(card.id)
  const acc = {
    chips: base.chips + (cursed ? 0 : cardChips(card.rank)),
    mult: base.mult + streakBonus + (cursed ? -2 : 0),
    xmults: [] as number[],
    money: 0,
  }

  // Card enhancement (muted by curses and by The Eclipse)
  const enh = run.enhancements[card.id]
  if (enh && !cursed && !boss?.mutesEnhancements) {
    const times = runHasPassive(run, round, 'enhancementsTwice') ? 2 : 1
    const hasJackpot = activeJokers(run, round).some((j) => j.id === 'jackpot')
    for (let t = 0; t < times; t++) {
      if (enh === 'gilded') acc.chips += 30
      if (enh === 'ruby') acc.mult += 2
      if (enh === 'sapphire') acc.xmults.push(1.5)
      if (enh === 'lucky' && rng.chance(1, 3)) {
        acc.money += 3
        if (hasJackpot) acc.xmults.push(3)
      }
    }
  }

  // Joker editions (also muted by The Eclipse)
  if (!boss?.mutesEnhancements) {
    for (const j of activeJokers(run, round)) {
      if (j.edition === 'foil') acc.chips += 30
      if (j.edition === 'holo') acc.mult += 4
    }
  }

  // Jokers, in tray order
  for (const j of activeJokers(run, round)) {
    const def = jokerRegistry[j.id]
    const hook = def?.hooks?.onFoundationPlay
    if (!hook) continue
    const ctx: PlayContext = {
      card,
      fromWaste,
      streak: round.streak,
      round,
      run,
      state: j.state,
      rng: () => rng.next(),
    }
    applyHookResult(acc, hook(ctx))
  }

  // One-shot ×2 boost charges (Poseidon, Excavator)
  if (round.boostCharges > 0) {
    acc.xmults.push(2)
    round.boostCharges--
  }

  let chips = acc.chips
  let mult = acc.mult
  for (const x of acc.xmults) mult *= x

  if (boss?.modifyPlayScore) {
    const adjusted = boss.modifyPlayScore({ chips, mult }, { card, run })
    chips = adjusted.chips
    mult = adjusted.mult
  }

  const total = Math.max(0, Math.round(chips * mult))
  return {
    kind: 'foundation',
    label: `${card.id}`,
    chips: Math.round(chips),
    mult: Math.round(mult * 100) / 100,
    total,
    card,
    money: acc.money || undefined,
  }
}

function scoreEvent(
  ev: MoveEvent,
  round: RoundState,
  run: RunState,
  rng: Rng,
): ScorePop | null {
  const boss = round.bossId ? bossRegistry[round.bossId] : null
  switch (ev.type) {
    case 'foundation_play': {
      const pop = scoreFoundationPlay(ev.card, ev.fromWaste, round, run, rng)
      round.streak += 1
      return pop
    }
    case 'reveal': {
      if (boss?.mutesCategory?.includes('reveal')) return null
      if (run.jokers.some((j) => j.id === 'midas')) return null // Midas trade-off
      const acc = { chips: revealPoints(run.levels.reveal), mult: 1, xmults: [] as number[], money: 0 }
      for (const j of activeJokers(run, round)) {
        const hook = jokerRegistry[j.id]?.hooks?.onReveal
        if (!hook) continue
        applyHookResult(acc, hook({ card: ev.card, fromWaste: false, streak: round.streak, round, run, state: j.state, rng: () => rng.next() }))
      }
      return { kind: 'reveal', label: 'Reveal', total: Math.round(acc.chips * acc.mult), money: acc.money || undefined }
    }
    case 'empty_column': {
      if (boss?.mutesCategory?.includes('empty_column')) return null
      const acc = { chips: emptyColumnPoints(run.levels.empty_column), mult: 1, xmults: [] as number[], money: 0 }
      for (const j of activeJokers(run, round)) {
        const hook = jokerRegistry[j.id]?.hooks?.onEmptyColumn
        if (!hook) continue
        applyHookResult(acc, hook({ card: undefined as unknown as Card, fromWaste: false, streak: round.streak, round, run, state: j.state, rng: () => rng.next() }))
      }
      return { kind: 'empty_column', label: 'Column cleared', total: Math.round(acc.chips * acc.mult), money: acc.money || undefined }
    }
    case 'stock_deal':
    case 'recycle': {
      if (boss?.moneyPerDeal) {
        const charged = Math.min(boss.moneyPerDeal, run.money)
        if (charged > 0) return { kind: 'penalty', label: boss.name, total: 0, money: -charged }
      }
      if (ev.type === 'stock_deal' && boss?.dealPenalty) {
        return { kind: 'penalty', label: boss.name, total: -boss.dealPenalty }
      }
      return null
    }
    case 'discard': {
      const acc = { chips: 0, mult: 1, xmults: [] as number[], money: 0 }
      for (const j of activeJokers(run, round)) {
        const hook = jokerRegistry[j.id]?.hooks?.onDiscard
        if (!hook) continue
        applyHookResult(acc, hook({ card: ev.card, fromWaste: true, streak: round.streak, round, run, state: j.state, rng: () => rng.next() }))
      }
      if (acc.chips === 0 && acc.money === 0) return null
      return { kind: 'reveal', label: 'Discard', total: Math.round(acc.chips * acc.mult), money: acc.money || undefined }
    }
    case 'board_clear': {
      const resourceBonus = 50 * (round.recyclesLeft + round.discardsLeft)
      return { kind: 'clear', label: 'Board clear!', total: BOARD_CLEAR_BONUS + resourceBonus }
    }
    default:
      return null
  }
}

function cloneRun(run: RunState): RunState {
  return {
    ...run,
    jokers: run.jokers.map((j) => ({ id: j.id, state: { ...j.state }, ...(j.edition ? { edition: j.edition } : {}) })),
    vouchers: [...run.vouchers],
    consumables: [...run.consumables],
    enhancements: { ...run.enhancements },
    levels: { ...run.levels },
    bosses: [...run.bosses],
    rng: { ...run.rng },
    history: [...run.history],
  }
}

/** Boss-imposed move restrictions (e.g. The Anchor pins kings) */
export function bossBlockReason(round: RoundState, move: Move): string | null {
  const boss = round.bossId ? bossRegistry[round.bossId] : null
  return boss?.blocksMove?.(move, round) ?? null
}

/**
 * The one entry point the UI uses to make a move: applies it, scores every
 * resulting event, updates streak/score/money, and returns pops to animate.
 * Throws on illegal moves — callers should check isLegalMove first for UX.
 */
export function performMove(prevRound: RoundState, prevRun: RunState, move: Move): MoveOutcome {
  const blocked = bossBlockReason(prevRound, move)
  if (blocked) throw new Error(`Blocked: ${blocked}`)
  const { state: round, events } = applyMove(prevRound, move)
  const run = cloneRun(prevRun)
  const rng = new Rng(run.rng)

  // Streak persistence: Ouroboros (always) or the Serpent Deck (recycles only)
  if ((move.kind === 'deal_stock' || move.kind === 'recycle') && runHasPassive(run, round, 'streakNeverBreaks')) {
    round.streak = prevRound.streak
  } else if (move.kind === 'recycle' && deckRegistry[run.deckId]?.serpentStreak) {
    round.streak = prevRound.streak
  }

  const pops: ScorePop[] = []
  for (const ev of events) {
    const pop = scoreEvent(ev, round, run, rng)
    if (!pop) continue
    round.score = Math.max(0, round.score + pop.total)
    if (pop.money) run.money = Math.max(0, run.money + pop.money)
    if (pop.kind === 'foundation' && pop.total > run.bestPlay) run.bestPlay = pop.total
    pops.push(pop)
  }

  run.rng = rng.state
  return { round, run, pops, events }
}
