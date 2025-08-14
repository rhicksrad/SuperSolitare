import { useStore } from '../state/store'
import Board from './components/Board'
import JokerTray from './components/JokerTray'
import RunSummary from './components/RunSummary'
import { useEffect } from 'react'
// Timer and HUD imported elsewhere; keep App minimal
import StartScreen from './screens/StartScreen'
import Settings from './screens/Settings'
import About from './screens/About'
import Achievements from './screens/Achievements'
import PauseMenu from './components/PauseMenu'
import BossBanner from './components/BossBanner'
import ShopModal from './components/ShopModal'
import TopMenu from './components/TopMenu'

function Home() {
  const seedInput = useStore((s) => s.seedInput)
  const setSeed = (e: React.ChangeEvent<HTMLInputElement>) => useStore.setState({ seedInput: e.target.value })
  const startRun = useStore((s) => s.startRun)

  return (
    <div className="min-h-full flex flex-col items-center p-4 gap-4">
      <h1 className="text-2xl font-semibold">SuperSolitaire</h1>
      <div className="flex items-center gap-2 w-full max-w-sm">
        <label htmlFor="seed" className="sr-only">Seed</label>
        <input
          id="seed"
          value={seedInput}
          onChange={setSeed}
          placeholder="Seed (optional)"
          className="flex-1 rounded-md bg-slate-800 text-slate-100 px-3 py-2 border border-slate-700"
        />
        <button
          className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-4 py-2 font-medium"
          onClick={() => startRun(seedInput)}
        >
          New Run
        </button>
      </div>
      <p className="text-sm text-slate-400">MVP scaffold – Phase 0</p>
    </div>
  )
}

export default function App() {
  const ui = useStore((s) => s.uiScreen)
  const run = useStore((s) => s.run)
  // consume only the actions needed for global shortcuts
  const lastOutcome = useStore((s) => s.lastOutcome)
  const isGameOver = useStore((s) => s.isGameOver)
  // const startNextBoard = useStore((s) => s.startNextBoard)
  const deal = useStore((s) => s.dealStock)
  const undo = useStore((s) => s.undo)
  const hint = useStore((s) => s.hint)
  const cancel = useStore((s) => s.cancelSelection)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'd') deal()
      if (e.key.toLowerCase() === 'z') undo()
      if (e.key.toLowerCase() === 'h') hint()
      if (e.key === 'Escape') cancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deal, undo, hint, cancel])
  if (ui === 'start') return <StartScreen />
  if (ui === 'settings') return <Settings />
  if (ui === 'about') return <About />
  if (ui === 'achievements') return <Achievements />
  if (!run) return <Home />

  return (
    <div className="min-h-full p-2 sm:p-3 md:p-4">
      <a href="#board-region" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:bg-slate-900 focus:text-white focus:px-3 focus:py-2 focus:rounded">Skip to board</a>
      <div className="mb-3 md:mb-4"><TopMenu /></div>
      {/* Boss banner below the top menu when bosses are active */}
      <div className="mb-3"><BossBanner /></div>
      <div className="mb-3 md:mb-4 flex justify-center">
        <JokerTray jokers={run.jokers} />
      </div>
      <div id="board-region" className="rounded-lg border border-slate-800/60 bg-slate-900/30 backdrop-blur-sm p-1 sm:p-2 board-width">
        <Board />
      </div>
      
      {(lastOutcome || isGameOver) && <RunSummary />}
      <ShopModal />
      <PauseMenu />
    </div>
  )
}


