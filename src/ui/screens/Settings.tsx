import { useStore } from '../../state/store'

export default function Settings() {
  const s = useStore()
  const resetRun = () => useStore.setState({ run: null, currentRound: null, hasSavedRun: false, uiScreen: 'start' })
  function applyTheme(theme: 'dark' | 'light' | 'high-contrast') {
    document.documentElement.setAttribute('data-theme', theme)
    s.updateSettings({ theme })
  }
  const accents = [
    { name: 'Sky', value: '#38bdf8' },
    { name: 'Emerald', value: '#34d399' },
    { name: 'Rose', value: '#fb7185' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Violet', value: '#8b5cf6' },
  ]
  function applyAccent(hex: string) {
    document.documentElement.style.setProperty('--ss-accent', hex)
  }
  function applyColorBlindMode(enabled: boolean) {
    if (enabled) document.documentElement.setAttribute('data-color-blind', 'true')
    else document.documentElement.removeAttribute('data-color-blind')
    s.updateSettings({ colorBlindMode: enabled })
  }
  return (
    <div className="min-h-full p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 shadow-xl p-6">
          <div className="text-center mb-4">
            <div className="text-2xl font-semibold">Settings</div>
            <div className="text-xs text-slate-400 mt-1">Personalize visuals, accessibility, and difficulty</div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span>Difficulty</span>
              <div className="flex flex-col items-end gap-1">
                <select
                  className="rounded bg-slate-800 border border-slate-700 px-2 py-1"
                  value={s.run?.difficulty || 'medium'}
                  onChange={(e) => {
                    const value = e.target.value as 'easy' | 'medium' | 'hard'
                    if (s.run) {
                      useStore.setState({ run: { ...s.run, difficulty: value } })
                      resetRun()
                    } else {
                      useStore.setState({ run: { seed: '', ante: 1, coins: 0, jokers: [], modifiers: [], stats: {}, history: [], rng: { seed: '', value: 0 }, mode: 'standard', difficulty: value, godCards: [], scoreRanks: { foundation_move: 1, reveal_face_down: 1, empty_column: 1 } } as any })
                      resetRun()
                    }
                  }}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <div className="text-[11px] text-slate-400">Changing difficulty resets your run</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Theme</span>
              <select className="rounded bg-slate-800 border border-slate-700 px-2 py-1" value={s.settings.theme} onChange={(e) => applyTheme(e.target.value as any)}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="high-contrast">High Contrast</option>
              </select>
            </div>

            <div className="flex flex-col items-center gap-2">
              <span>Accent</span>
              <div className="flex gap-2">
                {accents.map((a) => (
                  <button key={a.name} onClick={() => applyAccent(a.value)} aria-label={`Accent ${a.name}`} className="w-6 h-6 rounded-full border border-slate-600" style={{ backgroundColor: a.value }} />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={s.settings.reduceMotion} onChange={(e) => s.updateSettings({ reduceMotion: e.target.checked })} />
                <span>Reduce motion</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={s.settings.colorBlindMode} onChange={(e) => applyColorBlindMode(e.target.checked)} />
                <span>Color-blind mode</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={s.settings.sounds} onChange={(e) => s.updateSettings({ sounds: e.target.checked })} />
                <span>Sounds</span>
              </label>
            </div>

            <div className="pt-2 flex justify-center">
              <button className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2" onClick={() => s.goTo('start')}>Back</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


