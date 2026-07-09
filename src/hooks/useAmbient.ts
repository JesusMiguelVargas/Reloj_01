import { useCallback, useEffect, useRef } from 'react';

export type Ambient = 'none' | 'rain' | 'noise' | 'tick';

export const AMBIENT_LABELS: Record<Ambient, string> = {
  none: 'Ninguno',
  rain: 'Lluvia',
  noise: 'Ruido',
  tick: 'Tic-tac',
};

/**
 * Sonido ambiente sintetizado con WebAudio (sin archivos): lluvia, ruido
 * marrón o tic-tac de reloj mecánico. Solo suena mientras el temporizador
 * corre.
 */
export function useAmbient() {
  const ctxRef = useRef<AudioContext | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const stop = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const start = useCallback(
    (type: Ambient) => {
      stop();
      if (type === 'none') return;
      const ctx = getCtx();

      if (type === 'tick') {
        // Tic-tac: clics filtrados alternando tono, uno por segundo.
        let high = true;
        const tick = () => {
          const t = ctx.currentTime;
          const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.025, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
          }
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = high ? 2100 : 1500;
          filter.Q.value = 2;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.12, t);
          src.connect(filter).connect(gain).connect(ctx.destination);
          src.start(t);
          high = !high;
        };
        tick();
        const id = window.setInterval(tick, 1000);
        cleanupRef.current = () => window.clearInterval(id);
        return;
      }

      // Lluvia y ruido comparten la base: un bucle de ruido filtrado.
      const seconds = 3;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      if (type === 'noise') {
        // Ruido marrón: paseo aleatorio, más grave y arrullador.
        let last = 0;
        for (let i = 0; i < data.length; i++) {
          last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02;
          data[i] = last * 3.5;
        }
      } else {
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = type === 'rain' ? 1600 : 900;

      const gain = ctx.createGain();
      gain.gain.value = type === 'rain' ? 0.09 : 0.11;

      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start();

      let lfoCleanup = () => {};
      if (type === 'rain') {
        // Vaivén lento del volumen, como ráfagas de lluvia.
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.13;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.035;
        lfo.connect(lfoGain).connect(gain.gain);
        lfo.start();
        lfoCleanup = () => {
          lfo.stop();
          lfo.disconnect();
        };
      }

      cleanupRef.current = () => {
        lfoCleanup();
        src.stop();
        src.disconnect();
      };
    },
    [getCtx, stop]
  );

  useEffect(() => stop, [stop]);

  return { start, stop };
}
