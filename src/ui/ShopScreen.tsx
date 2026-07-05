import { RANK_LABEL, SUIT_GLYPH, ENHANCEMENTS } from '../engine/cards'
import { godRegistry } from '../engine/gods'
import { describeJoker, jokerRegistry, newJokerInstance } from '../engine/jokers'
import { PACK_META, rerollCost } from '../engine/shop'
import { useGame } from '../state/store'
import { CardView } from './CardView'
import { GodTray, JokerTray, LevelsBadge, MoneyBadge } from './Trays'

function ResultBanner() {
  const result = useGame((s) => s.roundResult)
  const dismissResult = useGame((s) => s.dismissResult)
  if (!result) return null
  return (
    <div className="panel p-4 border-l-4" style={{ borderLeftColor: 'var(--gold)' }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-bold text-lg">
            Blind beaten! <span className="big-number">{result.score.toLocaleString()}</span>
            <span className="text-slate-400 text-sm"> / {result.target.toLocaleString()}</span>
          </div>
          <div className="text-sm text-slate-300 flex flex-wrap gap-x-4">
            {result.breakdown.map((b, i) => (
              <span key={i}>
                {b.label}: <span className="text-[var(--gold)] font-semibold">+${b.amount}</span>
              </span>
            ))}
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-200 text-xl px-2" onClick={dismissResult} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  )
}

function PackModal() {
  const pack = useGame((s) => s.pack)
  const choosePackItem = useGame((s) => s.choosePackItem)
  const skipPack = useGame((s) => s.skipPack)
  if (!pack) return null
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="panel p-6 max-w-2xl w-full">
        <h2 className="text-xl font-bold mb-1">
          {pack.type === 'card' ? 'Card Pack' : pack.type === 'god' ? 'Pantheon Pack' : 'Joker Pack'}
        </h2>
        <p className="text-sm text-slate-400 mb-4">Choose one</p>
        <div className="grid grid-cols-3 gap-4">
          {pack.type === 'card' &&
            pack.choices.map((choice, i) => (
              <button key={i} className="panel p-3 hover:ring-2 hover:ring-[var(--gold)] flex flex-col items-center gap-2" onClick={() => choosePackItem(i)}>
                <CardView card={{ ...choice.card, faceUp: true }} enhancement={choice.enhancement} />
                <div className="text-sm font-bold capitalize">{ENHANCEMENTS[choice.enhancement].name}</div>
                <div className="text-xs text-slate-400 text-center">
                  {RANK_LABEL[choice.card.rank]}
                  {SUIT_GLYPH[choice.card.suit]} — {ENHANCEMENTS[choice.enhancement].description}
                </div>
              </button>
            ))}
          {pack.type === 'god' &&
            pack.choices.map((id, i) => {
              const def = godRegistry[id]
              return (
                <button key={i} className="panel p-3 hover:ring-2 hover:ring-[var(--gold)] text-left" onClick={() => choosePackItem(i)}>
                  <div className="font-bold text-amber-200">{def.name}</div>
                  <div className="text-xs text-slate-400 mb-1">{def.title}</div>
                  <div className="text-xs text-slate-300">{def.description}</div>
                </button>
              )
            })}
          {pack.type === 'joker' &&
            pack.choices.map((id, i) => {
              const def = jokerRegistry[id]
              return (
                <button key={i} className={`panel p-3 hover:ring-2 hover:ring-[var(--gold)] text-left rarity-${def.rarity}`} onClick={() => choosePackItem(i)}>
                  <div className="font-bold">{def.name}</div>
                  <div className="text-[10px] text-slate-400 capitalize mb-1">{def.rarity}</div>
                  <div className="text-xs text-slate-300">{describeJoker(newJokerInstance(id))}</div>
                </button>
              )
            })}
        </div>
        <div className="mt-4 text-center">
          <button className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-4" onClick={skipPack}>
            Skip pack
          </button>
        </div>
      </div>
    </div>
  )
}

export function ShopScreen() {
  const run = useGame((s) => s.run)
  const shopOffers = useGame((s) => s.shopOffers)
  const buyOffer = useGame((s) => s.buyOffer)
  const reroll = useGame((s) => s.reroll)
  const rerolls = useGame((s) => s.rerolls)
  const leaveShop = useGame((s) => s.leaveShop)
  if (!run) return null

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <JokerTray />
        <div className="flex items-center gap-3">
          <GodTray />
          <LevelsBadge />
          <MoneyBadge />
        </div>
      </div>

      <ResultBanner />

      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold">The Shop</h1>
          <div className="flex gap-2">
            <button
              className="rounded-lg bg-slate-700/70 px-4 py-2 text-sm font-semibold hover:bg-slate-600/70 disabled:opacity-40"
              onClick={reroll}
              disabled={run.money < rerollCost(rerolls)}
            >
              Reroll ${rerollCost(rerolls)}
            </button>
            <button className="rounded-lg bg-[var(--gold)] text-slate-900 px-4 py-2 font-bold hover:brightness-110" onClick={leaveShop} data-testid="next-round">
              Next Round →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {shopOffers.map((offer) => {
            if (offer.kind === 'joker') {
              const def = jokerRegistry[offer.jokerId]
              return (
                <div key={offer.slot} className={`panel p-3 flex flex-col rarity-${def.rarity} ${offer.sold ? 'opacity-40' : ''}`}>
                  <div className="font-bold text-sm">{def.name}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{def.rarity} joker</div>
                  <div className="text-xs text-slate-300 mt-1 flex-1">{describeJoker(newJokerInstance(def.id))}</div>
                  <button
                    className="mt-2 rounded-lg bg-[var(--gold)] text-slate-900 font-bold py-1.5 text-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => buyOffer(offer.slot)}
                    disabled={offer.sold || run.money < offer.price}
                  >
                    {offer.sold ? 'Sold' : `Buy $${offer.price}`}
                  </button>
                </div>
              )
            }
            if (offer.kind === 'god') {
              const def = godRegistry[offer.godId]
              return (
                <div key={offer.slot} className={`panel p-3 flex flex-col ${offer.sold ? 'opacity-40' : ''}`}>
                  <div className="font-bold text-sm text-amber-200">{def.name}</div>
                  <div className="text-[10px] text-slate-400">{def.title}</div>
                  <div className="text-xs text-slate-300 mt-1 flex-1">{def.description}</div>
                  <button
                    className="mt-2 rounded-lg bg-[var(--gold)] text-slate-900 font-bold py-1.5 text-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => buyOffer(offer.slot)}
                    disabled={offer.sold || run.money < offer.price}
                  >
                    {offer.sold ? 'Sold' : `Buy $${offer.price}`}
                  </button>
                </div>
              )
            }
            const meta = PACK_META[offer.packType]
            return (
              <div key={offer.slot} className={`panel p-3 flex flex-col ${offer.sold ? 'opacity-40' : ''}`}>
                <div className="font-bold text-sm text-sky-200">{meta.name}</div>
                <div className="text-[10px] text-slate-400">booster pack</div>
                <div className="text-xs text-slate-300 mt-1 flex-1">{meta.description}</div>
                <button
                  className="mt-2 rounded-lg bg-[var(--gold)] text-slate-900 font-bold py-1.5 text-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => buyOffer(offer.slot)}
                  disabled={offer.sold || run.money < offer.price}
                >
                  {offer.sold ? 'Opened' : `Open $${offer.price}`}
                </button>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Sell jokers from the tray above · packs stay through rerolls · interest pays $1 per $5 held (max $5)
        </p>
      </div>

      <PackModal />
    </div>
  )
}
