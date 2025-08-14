let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
	try {
		if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
		return ctx
	} catch {
		return null
	}
}

async function beep(freq: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.05) {
	const ac = getCtx()
	if (!ac) return
	if (ac.state === 'suspended') {
		try { await ac.resume() } catch {}
	}
	const osc = ac.createOscillator()
	const g = ac.createGain()
	osc.type = type
	osc.frequency.value = freq
	g.gain.value = gain
	osc.connect(g).connect(ac.destination)
	const now = ac.currentTime
	osc.start(now)
	// simple envelope
	g.gain.setValueAtTime(gain, now)
	g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)
	osc.stop(now + durationMs / 1000 + 0.01)
}

export function playDeal() {
	void beep(420, 60, 'triangle', 0.04)
}

export function playFoundation() {
	void beep(660, 90, 'sine', 0.06)
}

export function playError() {
	void beep(180, 120, 'square', 0.06)
}

export function playSnap() {
	void beep(520, 40, 'sawtooth', 0.04)
}


