import { useCallback, useRef } from 'react';

/**
 * Sonidos generados con WebAudio: un "clac" mecánico al voltear cada tarjeta
 * y una alarma de campanadas al terminar. No se cargan archivos externos.
 */
export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  /** Clic corto y seco, como la solapa de un reloj de tarjetas. */
  const playFlick = useCallback(() => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
  }, [getCtx]);

  /** Alarma: tres tandas de pitidos dobles. */
  const playAlarm = useCallback(() => {
    const ctx = getCtx();
    const t0 = ctx.currentTime;
    for (let round = 0; round < 3; round++) {
      for (let beep = 0; beep < 2; beep++) {
        const t = t0 + round * 0.8 + beep * 0.22;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      }
    }
  }, [getCtx]);

  /** Aviso suave de cambio de fase (pomodoro): dos notas ascendentes. */
  const playChime = useCallback(() => {
    const ctx = getCtx();
    const t0 = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const t = t0 + i * 0.18;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }, [getCtx]);

  /** Los navegadores exigen un gesto del usuario antes de reproducir audio. */
  const unlock = useCallback(() => {
    void getCtx();
  }, [getCtx]);

  return { playFlick, playAlarm, playChime, unlock };
}
