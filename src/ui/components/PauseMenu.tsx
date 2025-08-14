import { useStore } from '../../state/store'

export default function PauseMenu() {
  const paused = useStore((s) => s.paused)
  const toggle = useStore((s) => s.togglePause)
  const back = useStore((s) => s.backToStart)
  if (!paused) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm rounded-lg bg-slate-900 border border-slate-700 p-4 flex flex-col gap-3">
        <div className="text-xl font-semibold">Paused</div>
        <button className="rounded bg-emerald-700 px-3 py-2" onClick={toggle}>Resume</button>
        <button className="rounded bg-slate-700 px-3 py-2" onClick={back}>Back to Start</button>
      </div>
    </div>
  )
}


