// The compendium. Undiscovered entries show as "?" until you encounter them
// in a run; decks show unlock state and their highest-beaten-stake sticker.

import { bossRegistry } from '../engine/bosses'
import { ENHANCEMENTS } from '../engine/cards'
import { allDeckIds, deckRegistry, deckSticker, unlockedDeckIds } from '../engine/decks'
import { allGodIds } from '../engine/gods'
import { jokerRegistry } from '../engine/jokers'
import { EDITION_META } from '../engine/types'
import { allVoucherIds, voucherRegistry } from '../engine/vouchers'
import { useGame } from '../state/store'
import { BossEmblem, DeckBack, GodCard, JokerCard, VoucherCard } from './ArtCards'

function Section({ title, children, grid }: { title: string; children: React.ReactNode; grid?: boolean }) {
  return (
    <section>
      <h2 className="text-lg font-bold mb-2 text-slate-200">{title}</h2>
      <div className={grid ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2' : 'flex flex-wrap gap-3'}>{children}</div>
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

export function CollectionScreen() {
  const goTo = useGame((s) => s.goTo)
  const stats = useGame((s) => s.stats)
  const seen = stats.discovered
  const jokers = Object.values(jokerRegistry).sort(
    (a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || a.name.localeCompare(b.name),
  )
  const bosses = Object.values(bossRegistry)
  const unlockedDecks = unlockedDeckIds(stats.stakeWins)

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Collection</h1>
        <button className="btn btn-dark px-4 py-2" onClick={() => goTo('menu')}>
          ← Menu
        </button>
      </div>

      <Section title={`Jokers (${jokers.filter((d) => seen.jokers.includes(d.id)).length}/${jokers.length} discovered)`}>
        {jokers.map((d) => (
          <JokerCard
            key={d.id}
            joker={d.id}
            unknown={!seen.jokers.includes(d.id)}
            tip={<div className="mt-1 text-slate-400">${d.cost} in the shop</div>}
          />
        ))}
      </Section>

      <Section title={`God Cards (${allGodIds.filter((id) => seen.gods.includes(id)).length}/${allGodIds.length} discovered)`}>
        {allGodIds.map((id) => (
          <GodCard key={id} id={id} unknown={!seen.gods.includes(id)} />
        ))}
      </Section>

      <Section title={`Boss Blinds (${bosses.filter((d) => seen.bosses.includes(d.id)).length}/${bosses.length} discovered)`}>
        {bosses.map((d) => {
          const known = seen.bosses.includes(d.id)
          return (
            <div key={d.id} className="has-tip flex flex-col items-center gap-1 w-[84px]" tabIndex={0}>
              <BossEmblem id={d.id} size={64} unknown={!known} />
              <div
                className={`text-[11px] font-bold text-center leading-tight ${
                  !known ? 'text-slate-500' : d.finisher ? 'text-purple-300' : 'text-rose-300'
                }`}
              >
                {known ? d.name : '???'}
              </div>
              <div className="tip">
                {known ? (
                  <>
                    <div className="font-bold mb-1">
                      {d.name} {d.finisher && <span className="text-purple-300">· ante 8 finisher</span>}
                    </div>
                    {d.description}
                  </>
                ) : (
                  <>
                    <div className="font-bold mb-1">???</div>
                    Not yet discovered — face it in a run to reveal it.
                  </>
                )}
              </div>
            </div>
          )
        })}
      </Section>

      <Section title={`Vouchers (${allVoucherIds.filter((id) => seen.vouchers.includes(id)).length}/${allVoucherIds.length} discovered)`}>
        {allVoucherIds.map((id) => {
          const d = voucherRegistry[id]
          return (
            <VoucherCard
              key={id}
              id={id}
              unknown={!seen.vouchers.includes(id)}
              tip={<div className="mt-1 text-slate-400">${d.cost} in the shop</div>}
            />
          )
        })}
      </Section>

      <Section title={`Decks (${unlockedDecks.length}/${allDeckIds.length} unlocked)`}>
        {allDeckIds.map((id) => {
          const unlocked = unlockedDecks.includes(id)
          const sticker = deckSticker(id, stats.stakeWins)
          const d = deckRegistry[id]
          return (
            <div key={id} className="has-tip flex flex-col items-center gap-1 w-[84px]" tabIndex={0}>
              <span className="relative">
                <DeckBack id={id} width={56} unknown={!unlocked} />
                {sticker && (
                  <span
                    className={`stake-sticker stake-sticker-${sticker.level} absolute -top-1 -right-1`}
                    aria-label={`Beaten at ${sticker.name}`}
                  />
                )}
              </span>
              <div className={`text-[11px] font-bold text-center leading-tight ${unlocked ? 'text-amber-200' : 'text-slate-500'}`}>
                {unlocked ? d.name.replace(' Deck', '') : '???'}
              </div>
              <div className="tip">
                {unlocked ? (
                  <>
                    <div className="font-bold mb-1">{d.name}</div>
                    {d.description}
                    {sticker && <div className="mt-1 text-slate-400">Best win: {sticker.name}</div>}
                  </>
                ) : (
                  <>
                    <div className="font-bold mb-1">???</div>
                    Locked — win a run with the previous deck to unlock it.
                  </>
                )}
              </div>
            </div>
          )
        })}
      </Section>

      <Section title="Card Enhancements" grid>
        {Object.values(ENHANCEMENTS).map((d) => (
          <Entry key={d.id} name={d.name} desc={d.description} accent="#7dd3fc" />
        ))}
      </Section>

      <Section title="Joker Editions" grid>
        {Object.entries(EDITION_META).map(([id, d]) => (
          <Entry key={id} name={d.name} desc={d.description} accent="#93c5fd" />
        ))}
      </Section>
    </div>
  )
}
