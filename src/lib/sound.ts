// A short, pleasant two-note chime made in code (no sound file to download).
let ctx: AudioContext | null = null

export function playChime() {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    ;[[880, 0], [1318.5, 0.14]].forEach(([freq, delay]) => {
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.25, now + delay + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.5)
      osc.connect(gain).connect(ctx!.destination)
      osc.start(now + delay)
      osc.stop(now + delay + 0.55)
    })
  } catch { /* sound not available: stay silent */ }
}

/** Browsers only allow sound after the user has tapped the page once. Call on first tap. */
export function unlockAudio() {
  const go = () => { try { ctx ??= new AudioContext(); ctx.resume() } catch {} }
  window.addEventListener('pointerdown', go, { once: true })
}
