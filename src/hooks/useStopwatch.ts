import { useCallback, useEffect, useRef, useState } from 'react';

const MAX = 99 * 60 + 59; // el display tiene dos dígitos de minutos

/** Cronómetro basado en marca de tiempo (exacto aunque la pestaña duerma). */
export function useStopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const accumulatedRef = useRef(0);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const total = accumulatedRef.current + (Date.now() - startedAtRef.current) / 1000;
      setElapsed(Math.min(MAX, Math.floor(total)));
    }, 150);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    startedAtRef.current = Date.now();
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    setRunning((r) => {
      if (r) {
        accumulatedRef.current += (Date.now() - startedAtRef.current) / 1000;
      }
      return false;
    });
  }, []);

  const reset = useCallback(() => {
    accumulatedRef.current = 0;
    setElapsed(0);
    setRunning(false);
  }, []);

  return { elapsed, running, start, pause, reset };
}
