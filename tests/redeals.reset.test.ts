import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../src/state/store'
import { roundConfig } from '../src/game/run'

describe('Redeals reset behavior', () => {
  beforeEach(() => {
    // Clear store pieces relevant to runs/rounds
    useStore.setState((s) => ({ ...s, run: null, currentRound: null, uiScreen: 'start', blindIndex: 0 }))
  })

  it('resets redeals to default when starting a round', () => {
    const cfg = roundConfig(1)
    useStore.getState().startRun('redeals-reset-1')
    useStore.getState().startRound('small')
    // Simulate usage
    useStore.setState((s) => ({ ...s, currentRound: { ...(s.currentRound as any), redealsLeft: 0 } as any }))
    // Start a fresh round
    useStore.getState().startRound('small')
    const r = useStore.getState().currentRound!
    expect(r.redealsLeft).toBe(cfg.redeals)
  })

  it('resets redeals when returning to start and starting a new run', () => {
    const cfg = roundConfig(1)
    useStore.getState().startRun('redeals-reset-2')
    useStore.getState().startRound('small')
    // Spend redeals
    useStore.setState((s) => ({ ...s, currentRound: { ...(s.currentRound as any), redealsLeft: 0 } as any }))
    // Back to start and new run
    useStore.getState().backToStart()
    useStore.getState().startRun('redeals-reset-3')
    useStore.getState().startRound('small')
    const r = useStore.getState().currentRound!
    expect(r.redealsLeft).toBe(cfg.redeals)
  })
})


