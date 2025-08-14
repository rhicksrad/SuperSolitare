import { useStore } from '../../state/store'
import { ACHIEVEMENTS } from '../../game/achievements'

export default function Achievements() {
  const goTo = useStore((s) => s.goTo)
  const owned = useStore((s) => s.achievements)
  return (
    <div className="min-h-full p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 shadow-xl p-6">
          <div className="text-center mb-5">
            <div className="text-3xl font-bold tracking-wide">Achievements</div>
            <div className="text-xs text-slate-400 mt-1">Collect them all! Your milestones are saved locally.</div>
          </div>

          {/* Celebration ribbon */}
          <div className="relative mb-4 flex justify-center">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
            <div className="relative px-4 py-1 rounded-full border border-amber-500/60 bg-amber-500/10 text-amber-300 text-xs">Milestones</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {ACHIEVEMENTS.map((a) => {
              const unlocked = !!owned[a.id]
              return (
                <div key={a.id} className={`relative rounded-xl p-4 flex flex-col items-center text-center gap-2 border ${unlocked ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-slate-700 bg-slate-800/40'}`}>
                  {/* Confetti ring for unlocked */}
                  {unlocked && (
                    <div className="pointer-events-none absolute -inset-1 rounded-xl border border-emerald-400/30 blur-[1px]" />
                  )}
                  <img className="w-14 h-14" src={`/assets/achievements/${a.id}.svg`} alt={a.name} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  <div className="font-semibold text-sm">{a.name}</div>
                  <div className="text-xs text-slate-400">{a.description}</div>
                  {!unlocked && <div className="text-[10px] text-slate-500">Locked</div>}
                  {unlocked && (
                    <div className="mt-1 text-[11px] text-emerald-300">Unlocked!</div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-6 text-center">
            <button className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2" onClick={() => goTo('start')}>Back</button>
          </div>
        </div>
      </div>
    </div>
  )
}


