import { useStore } from '../../state/store'
import { jokerRegistry } from '../../game/jokers'

function numberToWords(num: number): string {
  const n = Math.max(0, Math.floor(num))
  const ones = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
  const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']
  if (n < 20) return ones[n]
  if (n < 100) {
    const t = Math.floor(n / 10), o = n % 10
    return o === 0 ? tens[t] : `${tens[t]}-${ones[o]}`
  }
  return String(n)
}

export default function ShopModal() {
  const assetBase = (() => {
    const b = (import.meta as any).env?.BASE_URL || '/'
    return b.endsWith('/') ? b.slice(0, -1) : b
  })()
  const open = useStore((s) => s.shopOpen)
  const offers = useStore((s) => s.shopOffers)
  const coins = useStore((s) => s.run?.coins ?? 0)
  const rolls = useStore((s) => s.shopRolls || 0)
  const close = useStore((s) => s.closeShop)
  const reroll = useStore((s) => s.rerollShop)
  const buy = useStore((s) => s.buyOffer)
  const toggleLock = useStore((s) => s.toggleLockOffer)
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" data-testid="shop-modal" role="dialog" aria-modal="true" aria-label="Shop dialog">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-900/95 border border-slate-700/70 p-5 shadow-2xl shadow-black/40 ring-1 ring-[var(--ss-accent)]/10">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xl font-semibold tracking-wide">Shop</div>
            <div className="text-sm">Coins: <span className="font-semibold">{coins}</span></div>
          </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5" role="list" aria-label="Shop offers">
          {offers.map((o) => (
            <div key={o.id} className={`rounded-xl border ${o.locked ? 'border-yellow-600' : 'border-slate-700/80'} p-3 flex flex-col gap-2 group bg-slate-800/40 hover:bg-slate-800/60 transition-colors shadow-md`} role="listitem" aria-label={`${o.name} for ${o.price} coins`}>
              {o.kind === 'joker' && (
                <>
                  <div className="relative w-[96px] h-[136px] mx-auto">
                    <img className="absolute inset-0 w-full h-full object-contain drop-shadow" src={`${assetBase}/assets/jokers/${o.jokerId}.svg`} alt={o.name} onError={(e) => { (e.currentTarget as HTMLImageElement).src = `${assetBase}/assets/jokers/placeholder.svg` }} />
                    <div className="absolute inset-0 rounded-md border border-slate-700/60" />
                  </div>
                  <div className="mt-1 text-center px-1">
                    <div className="font-semibold text-sm tracking-wide">{o.name}</div>
                  <div className="text-[10px] uppercase opacity-70">{o.rarity}</div>
                    <div className="text-xs text-slate-300 break-words leading-snug">
                      {jokerRegistry[o.jokerId]?.description || 'Joker effect description'}
                    </div>
                  </div>
                </>
              )}
              {(o as any).kind === 'god' && (
                <>
                  <div className="font-semibold text-sm">{(o as any).name}</div>
                  <div className="text-xs opacity-80">{(o as any).description}</div>
                </>
              )}
              {o.kind === 'pack' && (
                <>
                  <div className="font-semibold text-sm">{o.name}</div>
                  <div className="text-xs opacity-80">{o.description}</div>
                  <div className="text-xs">Size: {o.size}</div>
                </>
              )}
              {o.kind === 'special' && (
                <>
                  <div className="font-semibold text-sm text-amber-300">{o.name}</div>
                  <div className="text-xs opacity-80">{o.description}</div>
                  <div className="text-[11px] text-amber-400">Special offer (cannot be rerolled)</div>
                </>
              )}
              {o.kind === 'boost' && (
                <>
                  <div className="font-semibold text-sm">{o.name}</div>
                  <div className="text-xs opacity-80">{o.description}</div>
                </>
              )}
              <button disabled={o.price > coins} onClick={() => buy(o.id)} className="rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 px-2 py-1 text-sm shadow" aria-label={`${numberToWords(o.price)} coins`}>
                {numberToWords(o.price)} coins
              </button>
              <button onClick={() => toggleLock(o.id)} className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs shadow">{o.locked ? 'Unlock' : 'Lock'}</button>
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-2 justify-end">
          <div className="text-xs text-slate-300 self-center mr-auto">Rerolls: {rolls} {rolls === 0 ? '(first reroll free)' : `(next costs 3)`}</div>
          <button className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm shadow" onClick={reroll} title={rolls === 0 ? 'First reroll is free' : 'Costs 3 coins'}>Reroll{rolls > 0 ? ' (-3)' : ''}</button>
          <button className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm shadow" onClick={close}>Close</button>
        </div>
      </div>
    </div>
  )
}


