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

  return (
    <div className="min-h-screen max-w-xl mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Settings</h1>
        <button className="rounded-lg bg-slate-700/70 px-4 py-2 font-semibold hover:bg-slate-600/70" onClick={() => goTo('menu')}>
          ← Menu
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
        desc="A slow generative ambience under the game"
        value={settings.music}
        onChange={(v) => updateSettings({ music: v })}
      />
      <Toggle
        label="Reduce motion"
        desc="Disables card flight animations and screen shake"
        value={settings.reduceMotion}
        onChange={(v) => updateSettings({ reduceMotion: v })}
      />
    </div>
  )
}
