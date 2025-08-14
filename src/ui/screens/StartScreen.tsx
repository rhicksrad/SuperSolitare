import { useStore } from '../../state/store'
import { useMemo, useState } from 'react'
import { getDailyBest, hasDailyPlayed } from '../../game/save'

function dailySeed(): string {
  const d = new Date()
  const iso = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10)
  return `daily-${iso}`
}

export default function StartScreen() {
  const startRun = useStore((s) => s.startRun)
  const continueRun = useStore((s) => s.continueSavedRun)
  const hasSaved = useStore((s) => s.hasSavedRun)
  const goTo = useStore((s) => s.goTo)
  const [seed, setSeed] = useState('')
  const today = useMemo(dailySeed, [])
  const best = useMemo(() => getDailyBest(today), [today])
  const played = useMemo(() => hasDailyPlayed(today), [today])

  return (
    <div className="min-h-full p-6 flex items-center justify-center">
      <div className="w-full max-w-lg">
        {/* Title with layered effects (x3): gradient text, glow, underline */}
        <div className="relative mb-6 text-center select-none">
          <div className="absolute inset-0 blur-xl opacity-30 bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400 rounded-full -z-10" />
          <div className="text-4xl md:text-5xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-violet-300 drop-shadow-[0_2px_12px_rgba(251,191,36,.30)]">
            SuperSolitaire
          </div>
          <div className="mx-auto mt-2 h-[2px] w-40 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
        </div>

        {/* Seed -> New Run */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl mb-5">
          <div className="flex flex-col gap-3">
            <input
              className="w-full rounded-lg bg-slate-800 text-slate-100 px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--ss-accent)]"
              placeholder="Seed (optional)"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
            <button
              className="w-full rounded-lg border border-emerald-500/70 bg-emerald-600/90 hover:bg-emerald-500 text-slate-50 font-semibold px-4 py-2 shadow-md"
              onClick={() => startRun(seed)}
            >
              New Run
            </button>
          </div>
        </div>

        {/* Vertical actions */}
        <div className="flex flex-col gap-3">
          <button
            className="w-full rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-100 px-4 py-2 shadow-md disabled:opacity-50"
            disabled={played}
            onClick={() => startRun(today)}
          >
            Daily Seed {best != null ? <span className="text-xs text-slate-300 ml-2">(Best: {best})</span> : null}
          </button>
          {/* Practice mode removed */}
          {hasSaved && (
            <button
              className="w-full rounded-lg border border-indigo-500/60 bg-indigo-600/90 hover:bg-indigo-500 text-slate-50 px-4 py-2 shadow-md"
              onClick={continueRun}
            >
              Continue Run
            </button>
          )}
          <button className="w-full rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-100 px-4 py-2 shadow-md" onClick={() => goTo('settings')}>Settings</button>
          <button className="w-full rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-100 px-4 py-2 shadow-md" onClick={() => goTo('achievements')}>Achievements</button>
          <button className="w-full rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-100 px-4 py-2 shadow-md" onClick={() => goTo('about')}>About</button>
        </div>
      </div>
    </div>
  )
}


