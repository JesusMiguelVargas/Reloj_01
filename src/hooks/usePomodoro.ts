import { useCallback, useEffect, useRef, useState } from 'react';

export type PomodoroPhase = 'focus' | 'break' | 'longBreak';

export interface PomodoroConfig {
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  cyclesBeforeLongBreak: number;
}

export const DEFAULT_POMODORO: PomodoroConfig = {
  focusMin: 25,
  breakMin: 5,
  longBreakMin: 15,
  cyclesBeforeLongBreak: 4,
};

interface Callbacks {
  /** Terminó una fase; `next` es la fase que empieza automáticamente. */
  onPhaseEnd: (ended: PomodoroPhase, next: PomodoroPhase, focusSeconds: number) => void;
}

function phaseSeconds(phase: PomodoroPhase, cfg: PomodoroConfig) {
  if (phase === 'focus') return cfg.focusMin * 60;
  if (phase === 'break') return cfg.breakMin * 60;
  return cfg.longBreakMin * 60;
}

/**
 * Ciclos pomodoro continuos: foco -> descanso -> ... -> descanso largo,
 * y vuelve a empezar. Cuenta atrás basada en marca de tiempo.
 */
export function usePomodoro(config: PomodoroConfig, callbacks: Callbacks) {
  const [phase, setPhase] = useState<PomodoroPhase>('focus');
  const [cycle, setCycle] = useState(0); // focos completados en la ronda actual
  const [remaining, setRemaining] = useState(config.focusMin * 60);
  const [running, setRunning] = useState(false);

  const endAtRef = useRef(0);
  const phaseRef = useRef(phase);
  const cycleRef = useRef(cycle);
  const configRef = useRef(config);
  const callbacksRef = useRef(callbacks);
  phaseRef.current = phase;
  cycleRef.current = cycle;
  configRef.current = config;
  callbacksRef.current = callbacks;

  // Si cambia la duración configurada estando detenido, reflejarla al inicio de fase.
  useEffect(() => {
    if (!running) {
      setRemaining(phaseSeconds(phaseRef.current, config));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.focusMin, config.breakMin, config.longBreakMin]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      if (left > 0) {
        setRemaining(left);
        return;
      }

      // Fase terminada: avanzar automáticamente a la siguiente.
      const cfg = configRef.current;
      const current = phaseRef.current;
      let next: PomodoroPhase;
      if (current === 'focus') {
        const done = cycleRef.current + 1;
        setCycle(done);
        next = done >= cfg.cyclesBeforeLongBreak ? 'longBreak' : 'break';
      } else {
        if (current === 'longBreak') setCycle(0);
        next = 'focus';
      }
      const nextSeconds = phaseSeconds(next, cfg);
      endAtRef.current = Date.now() + nextSeconds * 1000;
      setPhase(next);
      setRemaining(nextSeconds);
      callbacksRef.current.onPhaseEnd(current, next, cfg.focusMin * 60);
    }, 150);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    setRemaining((left) => {
      const from = left > 0 ? left : phaseSeconds(phaseRef.current, configRef.current);
      endAtRef.current = Date.now() + from * 1000;
      setRunning(true);
      return from;
    });
  }, []);

  const pause = useCallback(() => setRunning(false), []);

  const reset = useCallback(() => {
    setRunning(false);
    setPhase('focus');
    setCycle(0);
    setRemaining(configRef.current.focusMin * 60);
  }, []);

  return { phase, cycle, remaining, running, start, pause, reset };
}
