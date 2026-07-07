import { RANK_LABEL, SUIT_GLYPH, ENHANCEMENTS } from '../engine/cards'
import { godRegistry } from '../engine/gods'
import { describeJoker, jokerRegistry, newJokerInstance } from '../engine/jokers'
import { PACK_META, rerollCost } from '../engine/shop'
import { EDITION_META } from '../engine/types'
import { voucherRegistry } from '../engine/vouchers'
import { useGame } from '../state/store'
import { CardView } from './CardView'
import { GodCard, JokerCard, PackCard, VoucherCard } from './ArtCards'
import { packArt } from './art'
import { PixelSprite } from './sprites'
import { GodTray, JokerTray, LevelsBadge, MoneyBadge, VoucherStrip } from './Trays'

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
                {b.label}: <span className="text-[var(--gold)] font-bold">+${b.amount}</span>
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
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <PixelSprite sprite={packArt(pack.type)} size={30} />
          {PACK_META[pack.type].name}
        </h2>
        <p className="text-sm text-slate-400 mb-4">Choose one</p>
        <div className={pack.type === 'card' ? 'grid grid-cols-3 gap-4' : 'flex justify-center gap-4 flex-wrap'}>
          {pack.type === 'card' &&
            pack.choices.map((choice, i) => (
              <button
                key={i}
                className="panel p-3 hover:ring-2 hover:ring-[var(--gold)] flex flex-col items-center gap-2"
                onClick={() => choosePackItem(i)}
              >
                <CardView card={{ ...choice.card, faceUp: true }} enhancement={choice.enhancement} />
                <div className="text-sm font-bold capitalize">{ENHANCEMENTS[choice.enhancement].name}</div>
                <div className="text-xs text-slate-400 text-center">
                  {RANK_LABEL[choice.card.rank]}
                  {SUIT_GLYPH[choice.card.suit]} — {ENHANCEMENTS[choice.enhancement].description}
                </div>
              </button>
            ))}
          {pack.type === 'god' &&
            pack.choices.map((id, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <GodCard id={id} onClick={() => choosePackItem(i)} />
                <div className="text-xs text-slate-300 max-w-[130px] text-center leading-snug">{godRegistry[id]?.description}</div>
              </div>
            ))}
          {pack.type === 'joker' &&
            pack.choices.map((id, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <JokerCard joker={id} onClick={() => choosePackItem(i)} />
                <div className="text-xs text-slate-300 max-w-[130px] text-center leading-snug">
                  {describeJoker(newJokerInstance(id))}
                </div>
              </div>
            ))}
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

function PriceButton({
  sold,
  soldLabel,
  price,
  canAfford,
  onBuy,
  color = 'btn-gold',
  buyLabel = 'Buy',
  testid,
}: {
  sold: boolean
  soldLabel: string
  price: number
  canAfford: boolean
  onBuy: () => void
  color?: string
  buyLabel?: string
  testid?: string
}) {
  return (
    <button
      className={`btn ${color} mt-2 w-full py-1.5 text-sm`}
      onClick={onBuy}
      disabled={sold || !canAfford}
      data-testid={testid}
    >
      {sold ? soldLabel : `${buyLabel} $${price}`}
    </button>
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <JokerTray />
        <div className="flex items-center gap-3 flex-wrap">
          <GodTray />
          <LevelsBadge />
          <MoneyBadge />
        </div>
      </div>
      <VoucherStrip />

      <ResultBanner />

      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>
            The Shop
          </h1>
          <div className="flex gap-3">
            <button className="btn btn-dark px-4 py-2 text-sm" onClick={reroll} disabled={run.money < rerollCost(run, rerolls)}>
              Reroll ${rerollCost(run, rerolls)}
            </button>
            <button className="btn btn-gold px-4 py-2" onClick={leaveShop} data-testid="next-round">
              Next Round →
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
          {shopOffers.map((offer) => {
            if (offer.kind === 'joker') {
              const def = jokerRegistry[offer.jokerId]
              return (
                <div key={offer.slot} className={`flex flex-col w-[112px] ${offer.sold ? 'opacity-40' : ''}`}>
                  <div className="flex justify-center">
                    <JokerCard
                      joker={
                        offer.edition
                          ? { ...newJokerInstance(offer.jokerId), edition: offer.edition }
                          : offer.jokerId
                      }
                    />
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 text-center leading-snug min-h-8">
                    {describeJoker(newJokerInstance(def.id))}
                  </div>
                  {offer.edition && (
                    <div className={`text-[10px] text-center font-bold edition-text-${offer.edition}`}>
                      {EDITION_META[offer.edition].name}
                    </div>
                  )}
                  <PriceButton
                    sold={offer.sold ?? false}
                    soldLabel="Sold"
                    price={offer.price}
                    canAfford={run.money >= offer.price}
                    onBuy={() => buyOffer(offer.slot)}
                  />
                </div>
              )
            }
            if (offer.kind === 'god') {
              const def = godRegistry[offer.godId]
              return (
                <div key={offer.slot} className={`flex flex-col w-[112px] ${offer.sold ? 'opacity-40' : ''}`}>
                  <div className="flex justify-center">
                    <GodCard id={offer.godId} />
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 text-center leading-snug min-h-8">{def.description}</div>
                  <PriceButton
                    sold={offer.sold ?? false}
                    soldLabel="Sold"
                    price={offer.price}
                    canAfford={run.money >= offer.price}
                    onBuy={() => buyOffer(offer.slot)}
                  />
                </div>
              )
            }
            if (offer.kind === 'voucher') {
              const def = voucherRegistry[offer.voucherId]
              return (
                <div key={offer.slot} className={`flex flex-col w-[112px] ${offer.sold ? 'opacity-40' : ''}`}>
                  <div className="flex justify-center">
                    <VoucherCard id={offer.voucherId} redeemed={offer.sold} />
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 text-center leading-snug min-h-8">{def.description}</div>
                  <PriceButton
                    sold={offer.sold ?? false}
                    soldLabel="Redeemed"
                    price={offer.price}
                    canAfford={run.money >= offer.price}
                    onBuy={() => buyOffer(offer.slot)}
                    color="btn-purple"
                  />
                </div>
              )
            }
            const meta = PACK_META[offer.packType]
            return (
              <div key={offer.slot} className={`flex flex-col w-[112px] ${offer.sold ? 'opacity-40' : ''}`}>
                <div className="flex justify-center">
                  <PackCard type={offer.packType} opened={offer.sold} />
                </div>
                <div className="text-[11px] text-slate-300 mt-1 text-center leading-snug min-h-8">{meta.description}</div>
                <PriceButton
                  sold={offer.sold ?? false}
                  soldLabel="Opened"
                  buyLabel="Open"
                  price={offer.price}
                  canAfford={run.money >= offer.price}
                  onBuy={() => buyOffer(offer.slot)}
                  color="btn-dark"
                />
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Sell jokers from the tray above · packs and vouchers stay through rerolls · interest pays $1 per $5 held
        </p>
      </div>

      <PackModal />
    </div>
  )
}
