// Audio-reactive table lighting: a rAF loop reads the music analyser and
// drives the `--music-glow` / `--music-bass` CSS vars consumed by #root::after
// in index.css. Fast attack / slow release so bass hits bloom and linger.
// Renders nothing; fully disabled by the reduceMotion or music settings.

import { useEffect } from 'react'
import { useGame } from '../state/store'
import { musicLevels } from './audio'

export function MusicGlow() {
  const reduceMotion = useGame((s) => s.settings.reduceMotion)
  const music = useGame((s) => s.settings.music)

  useEffect(() => {
    const root = document.documentElement
    const reset = () => {
      root.style.setProperty('--music-glow', '0')
      root.style.setProperty('--music-bass', '0')
    }
    if (reduceMotion || !music) {
      reset()
      return
    }
    let raf = 0
    let glow = 0
    let bass = 0
    let bassAvg = 0
    const tick = () => {
      const lv = musicLevels()
      glow += (lv.energy - glow) * (lv.energy > glow ? 0.25 : 0.06)
      // pulse on bass *hits*: deviation above a slow-moving baseline, so a
      // constantly bass-heavy track still reads as beats, not a pinned max
      bassAvg += (lv.bass - bassAvg) * 0.02
      const hit = Math.min(1, Math.max(0, lv.bass - bassAvg) * 4)
      bass += (hit - bass) * (hit > bass ? 0.5 : 0.12)
      root.style.setProperty('--music-glow', glow.toFixed(3))
      root.style.setProperty('--music-bass', bass.toFixed(3))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      reset()
    }
  }, [reduceMotion, music])

  return null
}
