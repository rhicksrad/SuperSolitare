import { useStore } from '../../state/store'

export default function BossBanner() {
  const bosses = useStore((s) => s.currentBosses)
  if (!bosses || bosses.length === 0) return null
  return (
    <div className="rounded-2xl border border-indigo-700/60 bg-indigo-900/30 px-4 py-3 text-sm text-indigo-200 flex flex-wrap gap-x-4 gap-y-2 mx-auto max-w-[1100px] shadow-lg shadow-indigo-900/20 ring-1 ring-indigo-400/10" role="status" aria-live="polite">
      {bosses.map((b) => (
        <div key={b.id} className="flex items-center gap-2">
          <div className="relative w-6 h-6 shrink-0">
            <img
              src={`/assets/icons/${b.id}.svg`}
              alt=""
              className="absolute inset-0 w-6 h-6 object-contain drop-shadow"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <span className="font-semibold tracking-wide">{b.name}</span>
          <span className="opacity-80">— {b.description}</span>
        </div>
      ))}
    </div>
  )
}


