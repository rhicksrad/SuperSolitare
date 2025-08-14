import { useEffect } from 'react'
import { useStore } from '../../state/store'

export default function Timer({ silent = false }: { silent?: boolean }) {
  const currentRound = useStore((s) => s.currentRound)
  const tick = useStore((s) => s.tickTimer)
  useEffect(() => {
    if (!currentRound) return
    const id = setInterval(() => tick(), 1000)
    return () => clearInterval(id)
  }, [currentRound, tick])
  if (!currentRound || silent) return null
  return <div className="text-sm text-slate-300">Time: {currentRound.timeRemainingSec}s</div>
}


