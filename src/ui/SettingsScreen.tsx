import { useState } from 'react'
import { todaysDailySeed } from '../engine/save'
import { useGame } from '../state/store'

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className="panel p-4 flex items-center justify-between gap-4 w-full text-left hover:bg-slate-700/30"
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
    >
      <div>
        <div className="font-bold">{label}</div>
        <div className="text-sm text-slate-400">{desc}</div>
      </div>
      <div
        className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 ${value ? 'bg-[var(--gold)]' : 'bg-slate-600'}`}
      >
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : ''}`} />
      </div>
    </button>
  )
}

export function SettingsScreen() {
  const settings = useGame((s) => s.settings)
  const updateSettings = useGame((s) => s.updateSettings)
  const goTo = useGame((s) => s.goTo)
  const newGame = useGame((s) => s.newGame)
  const quickStart = useGame((s) => s.quickStart)
  const stats = useGame((s) => s.stats)
  const [seed, setSeed] = useState('')

  return (
    <div className="min-h-screen max-w-xl mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
        <button className="btn btn-dark px-4 py-2" onClick={() => goTo('menu')}>
          ← Menu
        </button>
      </div>

      <div className="flex gap-2">
        <button
          className="btn btn-dark flex-1 py-2.5 has-tip"
          onClick={() => newGame(undefined, 'daily', 'classic', 0)}
        >
          Daily Run
          <span className="tip">
            Everyone gets the same seed today: {todaysDailySeed()}. Always the Classic deck at White Stake.
          </span>
        </button>
        <button className="btn btn-dark flex-1 py-2.5" onClick={() => goTo('collection')}>
          Collection
        </button>
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg bg-slate-800/80 border-2 border-slate-600/50 px-3 py-2 text-sm placeholder:text-slate-500"
          placeholder="Custom seed"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          aria-label="Custom seed"
        />
        <button className="btn btn-dark px-4 py-2 text-sm" onClick={() => quickStart(seed.trim() || undefined)} disabled={!seed.trim()}>
          Seeded Run
        </button>
      </div>

      <Toggle
        label="Sound effects"
        desc="Card plucks, coins, boss stings — all synthesized live"
        value={settings.sfx}
        onChange={(v) => updateSettings({ sfx: v })}
      />
      <Toggle
        label="Music"
        desc="A lo-fi groove that heats up with your streak"
        value={settings.music}
        onChange={(v) => updateSettings({ music: v })}
      />
      <Toggle
        label="Reduce motion"
        desc="Disables card flight animations and screen shake"
        value={settings.reduceMotion}
        onChange={(v) => updateSettings({ reduceMotion: v })}
      />

      <div className="panel p-3 grid grid-cols-4 gap-2 text-sm">
        <div>
          <div className="text-slate-400 text-xs">Runs</div>
          <div className="font-bold big-number">{stats.runsStarted}</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">Wins</div>
          <div className="font-bold big-number">{stats.runsWon}</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">Best ante</div>
          <div className="font-bold big-number">{stats.bestAnte || '—'}</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">Best play</div>
          <div className="font-bold big-number">{stats.bestPlay ? stats.bestPlay.toLocaleString() : '—'}</div>
        </div>
      </div>
    </div>
  )
}
