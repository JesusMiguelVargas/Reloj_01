import { useCallback, useEffect, useRef } from 'react';

export interface AmbientMix {
  rain: number;
  noise: number;
  tick: number;
}

export const EMPTY_MIX: AmbientMix = { rain: 0, noise: 0, tick: 0 };

export const MIX_LABELS: Record<keyof AmbientMix, string> = {
  rain: 'Lluvia',
  noise: 'Ruido',
  tick: 'Tic-tac',
};

const totalLevel = (m: AmbientMix) => m.rain + m.noise + m.tick;

interface Graph {
  ctx: AudioContext;
  master: GainNode;
  rainGain: GainNode;
  noiseGain: GainNode;
  tickGain: GainNode;
  cleanup: () => void;
}

/**
 * Mezclador de ambiente sintetizado con WebAudio: tres capas (lluvia, ruido
 * marrón, tic-tac) con volumen independiente. Entra y sale con fundido suave;
 * mover un slider ajusta la ganancia en vivo sin reiniciar el audio.
 */
export function useAmbient() {
  const graphRef = useRef<Graph | null>(null);
  const fadeOutTimer = useRef(0);

  const build = useCallback((): Graph => {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // --- Lluvia: ruido blanco filtrado con vaivén lento ---
    const rainBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const rd = rainBuf.getChannelData(0);
    for (let i = 0; i < rd.length; i++) rd[i] = Math.random() * 2 - 1;
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = rainBuf;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.value = 1600;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rainSrc.connect(rainFilter).connect(rainGain).connect(master);
    rainSrc.start();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain).connect(rainGain.gain);
    lfo.start();

    // --- Ruido marrón: paseo aleatorio, grave y arrullador ---
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < nd.length; i++) {
      last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02;
      nd[i] = last * 3.5;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 900;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(master);
    noiseSrc.start();

    // --- Tic-tac: clic mecánico por segundo, tono alternante ---
    const tickGain = ctx.createGain();
    tickGain.gain.value = 0;
    tickGain.connect(master);
    let high = true;
    const tick = () => {
      const t = ctx.currentTime;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.025, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = high ? 2100 : 1500;
      f.Q.value = 2;
      src.connect(f).connect(tickGain);
      src.start(t);
      high = !high;
    };
    const tickInt = window.setInterval(tick, 1000);

    const cleanup = () => {
      window.clearInterval(tickInt);
      rainSrc.stop();
      noiseSrc.stop();
      lfo.stop();
      void ctx.close();
    };

    return { ctx, master, rainGain, noiseGain, tickGain, cleanup };
  }, []);

  /** Aplica el estado deseado: crea, ajusta niveles o funde y apaga. */
  const apply = useCallback(
    (mix: AmbientMix, playing: boolean) => {
      const shouldPlay = playing && totalLevel(mix) > 0.01;

      if (shouldPlay) {
        window.clearTimeout(fadeOutTimer.current);
        if (!graphRef.current) {
          graphRef.current = build();
        }
        const g = graphRef.current;
        if (g.ctx.state === 'suspended') void g.ctx.resume();
        const t = g.ctx.currentTime;
        // Fundido de entrada del master y niveles por capa en vivo.
        g.master.gain.cancelScheduledValues(t);
        g.master.gain.setTargetAtTime(1, t, 0.4);
        g.rainGain.gain.setTargetAtTime(0.12 * mix.rain, t, 0.15);
        g.noiseGain.gain.setTargetAtTime(0.15 * mix.noise, t, 0.15);
        g.tickGain.gain.setTargetAtTime(0.14 * mix.tick, t, 0.15);
        return;
      }

      // Auto-fade de salida y liberación del audio.
      const g = graphRef.current;
      if (!g) return;
      const t = g.ctx.currentTime;
      g.master.gain.cancelScheduledValues(t);
      g.master.gain.setTargetAtTime(0, t, 0.35);
      window.clearTimeout(fadeOutTimer.current);
      fadeOutTimer.current = window.setTimeout(() => {
        graphRef.current?.cleanup();
        graphRef.current = null;
      }, 1600);
    },
    [build]
  );

  useEffect(
    () => () => {
      window.clearTimeout(fadeOutTimer.current);
      graphRef.current?.cleanup();
      graphRef.current = null;
    },
    []
  );

  return { apply };
}
