import HUD from './HUD'
import Timer from './Timer'
import { useStore } from '../../state/store'
import { createPortal } from 'react-dom'

export default function TopMenu() {
  const startSmall = () => useStore.getState().startRound('small')
  const startBig = () => useStore.getState().startRound('big')
  const startBoss = () => useStore.getState().startRound('boss')
  // const run = useStore((s) => s.run)
  // Removed debug buttons in production
  const currentRound = useStore((s) => s.currentRound)
  const togglePause = () => useStore.getState().togglePause()
  const rankUp = (cat: 'foundation_move' | 'reveal_face_down' | 'empty_column') => useStore.getState().rankUp(cat)
  const ranks = useStore((s) => s.run?.scoreRanks)
  const patrons = useStore((s) => (s.run as any)?.scoreRankPatrons)
  const godCards = useStore((s) => (s.run as any)?.godCards || [])
  const useGod = (id: string) => useStore.getState().useGodCard(id)
  const fullRedeal = useStore((s) => (s as any).fullRedeal)
  const bosses = useStore((s) => s.currentBosses)
  const currentBlind = useStore((s) => s.currentBlind)
  // Skip controls offered only at start-of-round modal; not in top bar
  const startModalOpen = useStore((s) => (s as any).startModalOpen)
  const closeStartModal = () => useStore.setState({ startModalOpen: false })
  const backToStart = useStore((s) => s.backToStart)

  return (
    <div className="w-full bg-slate-950/70 backdrop-blur-sm">
      <div className="mx-auto max-w-[1500px] w-full px-4 py-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/70 shadow-lg shadow-black/30 ring-1 ring-[var(--ss-accent)]/10 px-4 py-2">
          {/* Brand */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/70 shadow-inner">
            <div className="text-lg font-semibold tracking-wide text-slate-100 drop-shadow">SuperSolitaire</div>
          </div>

          {/* HUD capsule */}
          <div className="flex-1 min-w-0 flex justify-center">
            <div className="hidden md:flex items-center px-3 py-1.5 rounded-xl bg-slate-800/50 border border-slate-700/60 shadow-sm">
              <HUD variant="compact" />
            </div>
          </div>

          {/* Boss chips */}
          {bosses && bosses.length > 0 && (
            <div className="hidden lg:flex items-center gap-2">
              {bosses.map((b) => (
                <span key={b.id} className="px-2 py-1 rounded-lg bg-indigo-900/40 border border-indigo-700/60 text-[11px] text-indigo-200 shadow-sm shadow-indigo-900/30">{b.name}</span>
              ))}
            </div>
          )}

          {/* Score + Timer */}
          {currentRound && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/70 text-slate-200 text-xs shadow-sm whitespace-nowrap flex items-center gap-3">
              {currentBlind && (
                <div className="px-2 py-0.5 rounded bg-slate-900/60 border border-slate-700" title="Current board">
                  Board: <span className="font-semibold">{currentBlind === 'small' ? 'Small' : currentBlind === 'big' ? 'Big' : 'Boss'}</span>
                </div>
              )}
              <div>
                Score: <span className="font-semibold">{currentRound.score}</span>
                <span className="opacity-70"> / {currentRound.config.targetScore}</span>
              </div>
              <div title="Rotations of stock remaining" className="px-2 py-0.5 rounded bg-slate-900/60 border border-slate-700">⟳ {currentRound.redealsLeft}</div>
            </div>
          )}
          <div className="px-3 py-1 rounded-full bg-slate-800/70 border border-slate-700/70 text-slate-200 shadow-sm"><Timer /></div>

          {/* Actions */}
          <button className="rounded-lg bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border border-slate-600 px-3 py-1.5 text-xs shadow-md" onClick={backToStart} title="Back to main menu">Back to Menu</button>
          <button className="rounded-lg bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border border-slate-600 px-3 py-1.5 text-xs shadow-md disabled:opacity-50" onClick={togglePause} disabled={!currentRound}>Pause</button>
          <button
            className="hidden md:inline-flex rounded-lg bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-700 px-3 py-1.5 text-xs shadow-md disabled:opacity-50"
            onClick={fullRedeal}
            disabled={!currentRound || (currentRound.redealsLeft || 0) <= 0}
            title="Full redeal: reset non-foundation cards back to stock (-1 redeal)"
          >
            Redeal
          </button>

          {/* Ranks */}
          <div
            className="hidden lg:flex items-center gap-2 text-[11px] text-slate-300 px-2 py-1 rounded-xl bg-slate-800/60 border border-slate-700/70 shadow-sm"
            title="Ranks increase scoring: F=foundation move, R=reveal face-down, E=empty column. Each + costs 5 coins and adds +0.1x to that category's points."
          >
            <span className="opacity-80">Ranks</span>
            <span
              className="px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-700"
              title={patrons?.foundation_move ? `${patrons.foundation_move.name} — ${patrons.foundation_move.title}` : undefined}
            >
              F:{((ranks?.foundation_move) ?? 1).toFixed(1)}{patrons?.foundation_move ? ` — ${patrons.foundation_move.name}` : ''}
            </span>
            <button
              className="rounded bg-slate-900/60 px-2 py-1 border border-slate-700 hover:bg-slate-800"
              onClick={() => rankUp('foundation_move')}
              title="Increase foundation scoring rank (+0.1x, cost 5 coins)"
            >
              F+
            </button>
            <span
              className="px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-700"
              title={patrons?.reveal_face_down ? `${patrons.reveal_face_down.name} — ${patrons.reveal_face_down.title}` : undefined}
            >
              R:{((ranks?.reveal_face_down) ?? 1).toFixed(1)}{patrons?.reveal_face_down ? ` — ${patrons.reveal_face_down.name}` : ''}
            </span>
            <button
              className="rounded bg-slate-900/60 px-2 py-1 border border-slate-700 hover:bg-slate-800"
              onClick={() => rankUp('reveal_face_down')}
              title="Increase reveal scoring rank (+0.1x, cost 5 coins)"
            >
              R+
            </button>
            <span
              className="px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-700"
              title={patrons?.empty_column ? `${patrons.empty_column.name} — ${patrons.empty_column.title}` : undefined}
            >
              E:{((ranks?.empty_column) ?? 1).toFixed(1)}{patrons?.empty_column ? ` — ${patrons.empty_column.name}` : ''}
            </span>
            <button
              className="rounded bg-slate-900/60 px-2 py-1 border border-slate-700 hover:bg-slate-800"
              onClick={() => rankUp('empty_column')}
              title="Increase empty-column scoring rank (+0.1x, cost 5 coins)"
            >
              E+
            </button>
          </div>
          {godCards.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-amber-300 px-2 py-1 rounded-xl bg-slate-800/60 border border-amber-700/60 shadow-sm ml-3 overflow-x-auto max-w-[40vw]">
              <span className="opacity-90">Gods</span>
              {godCards.map((g: any) => (
                <button key={g.id} className="px-2 py-0.5 rounded border border-amber-700/60 hover:bg-amber-800/20" title={g.description} onClick={() => useGod(g.id)}>
                  {g.name}
                </button>
              ))}
              <span className="opacity-70 text-[10px] ml-1">(click to use)</span>
            </div>
          )}
          {/* Skip controls removed from top bar; offered only at start-of-round modal */}
          {/* Debug buttons removed for production */}
        </div>
      </div>
			{startModalOpen && createPortal(
				<div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center">
					<div className="w-[90vw] max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-5 text-slate-200 shadow-2xl">
            <div className="text-lg font-semibold mb-2">Choose Your Start</div>
            <div className="text-sm text-slate-300 mb-4">
              Each round has three boards: Small, Big, then Boss. Small is the easiest target; Big raises the target; Boss adds a modifier. You can skip ahead for a coin bonus, but Boss targets are tough.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-sm" autoFocus onClick={() => { closeStartModal(); startSmall() }}>Start Small</button>
              <button className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-sm" onClick={() => { closeStartModal(); startBig() }}>Start Big</button>
              <button className="rounded bg-rose-800/80 hover:bg-rose-700 border border-rose-700 px-3 py-2 text-sm" onClick={() => { closeStartModal(); startBoss() }}>Start Boss</button>
            </div>
            <div className="mt-4 text-[12px] text-slate-400">
              - Skip to Big: gain +3 coins on completion, cannot play Small this round<br/>
              - Skip to Boss: gain +8 coins on completion, cannot play Small or Big this round
            </div>
            <div className="mt-4 text-right">
              <button className="rounded bg-slate-700 px-3 py-1.5 text-sm" onClick={closeStartModal} aria-label="Close start dialog">Close</button>
            </div>
          </div>
        </div>
			, document.body)}
    </div>
  )
}


