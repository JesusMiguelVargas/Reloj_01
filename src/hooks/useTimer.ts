import { useCallback, useEffect, useRef, useState } from 'react';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

/**
 * Temporizador basado en marca de tiempo final (sin deriva): en cada tick se
 * recalcula el restante contra Date.now(), así la cuenta sigue siendo exacta
 * aunque la pestaña pierda el foco.
 */
export function useTimer(onFinish: () => void) {
  const [duration, setDuration] = useState(5 * 60);
  const [remaining, setRemaining] = useState(5 * 60);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const endAtRef = useRef(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    if (status !== 'running') return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setStatus('finished');
        onFinishRef.current();
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [status]);

  const start = useCallback(() => {
    setRemaining((left) => {
      const from = left > 0 ? left : 0;
      if (from <= 0) return left;
      endAtRef.current = Date.now() + from * 1000;
      setStatus('running');
      return from;
    });
  }, []);

  const pause = useCallback(() => {
    setStatus((s) => (s === 'running' ? 'paused' : s));
  }, []);

  const reset = useCallback(
    (newDuration?: number) => {
      const d = newDuration ?? duration;
      setDuration(d);
      setRemaining(d);
      setStatus('idle');
    },
    [duration]
  );

  return { duration, remaining, status, start, pause, reset };
}
