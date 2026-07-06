// The compendium: every joker, god, boss, voucher, enhancement, and deck.

import { bossRegistry } from '../engine/bosses'
import { ENHANCEMENTS } from '../engine/cards'
import { allDeckIds, deckRegistry } from '../engine/decks'
import { allGodIds, godRegistry } from '../engine/gods'
import { jokerRegistry } from '../engine/jokers'
import { EDITION_META } from '../engine/types'
import { allVoucherIds, voucherRegistry } from '../engine/vouchers'
import { useGame } from '../state/store'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold mb-2 text-slate-200">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">{children}</div>
    </section>
  )
}

function Entry({ name, sub, desc, accent }: { name: string; sub?: string; desc: string; accent?: string }) {
  return (
    <div className="panel p-3">
      <div className="font-bold text-sm" style={accent ? { color: accent } : undefined}>
        {name}
      </div>
      {sub && <div className="text-[10px] text-slate-400 capitalize">{sub}</div>}
      <div className="text-xs text-slate-300 mt-1">{desc}</div>
    </div>
  )
}

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, legendary: 3 }
const RARITY_COLOR = { common: '#9fb0c8', uncommon: '#47c47a', rare: '#4f9cf9', legendary: '#c66df2' }

export function CollectionScreen() {
  const goTo = useGame((s) => s.goTo)
  const jokers = Object.values(jokerRegistry).sort(
    (a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || a.name.localeCompare(b.name),
  )
  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Collection</h1>
        <button className="rounded-lg bg-slate-700/70 px-4 py-2 font-semibold hover:bg-slate-600/70" onClick={() => goTo('menu')}>
          ← Menu
        </button>
      </div>

      <Section title={`Jokers (${jokers.length})`}>
        {jokers.map((d) => (
          <Entry key={d.id} name={d.name} sub={`${d.rarity} · $${d.cost}`} desc={d.description.replace(/\{\w+\}/g, '0')} accent={RARITY_COLOR[d.rarity]} />
        ))}
      </Section>

      <Section title={`God Cards (${allGodIds.length})`}>
        {allGodIds.map((id) => {
          const d = godRegistry[id]
          return <Entry key={id} name={d.name} sub={d.title} desc={d.description} accent="#fcd34d" />
        })}
      </Section>

      <Section title={`Boss Blinds (${Object.keys(bossRegistry).length})`}>
        {Object.values(bossRegistry).map((d) => (
          <Entry key={d.id} name={d.name} sub={d.finisher ? 'ante 8 finisher' : 'boss'} desc={d.description} accent={d.finisher ? '#f87171' : '#fda4af'} />
        ))}
      </Section>

      <Section title={`Vouchers (${allVoucherIds.length})`}>
        {allVoucherIds.map((id) => {
          const d = voucherRegistry[id]
          return <Entry key={id} name={d.name} sub={`$${d.cost} · permanent`} desc={d.description} accent="#c4b5fd" />
        })}
      </Section>

      <Section title="Card Enhancements">
        {Object.values(ENHANCEMENTS).map((d) => (
          <Entry key={d.id} name={d.name} desc={d.description} accent="#7dd3fc" />
        ))}
      </Section>

      <Section title="Joker Editions">
        {Object.entries(EDITION_META).map(([id, d]) => (
          <Entry key={id} name={d.name} desc={d.description} accent="#93c5fd" />
        ))}
      </Section>

      <Section title={`Decks (${allDeckIds.length})`}>
        {allDeckIds.map((id) => {
          const d = deckRegistry[id]
          return <Entry key={id} name={d.name} desc={d.description} accent="#fbbf24" />
        })}
      </Section>
    </div>
  )
}
