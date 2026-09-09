/** Toca 3 bips curtos (sintetizados via Web Audio, sem precisar de arquivo).
 * So funciona a partir de um gesto do usuario (clique) -- e sempre o caso
 * aqui, ja que o alarme e disparado por uma tentativa de confirmar. */
export function playAlarmBeep() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const start = ctx.currentTime

    ;[0, 0.18, 0.36].forEach((offset) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(0.15, start + offset + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.15)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start + offset)
      osc.stop(start + offset + 0.16)
    })

    setTimeout(() => ctx.close(), 700)
  } catch {
    // Web Audio indisponivel -- o popup visual ainda funciona sem som
  }
}
