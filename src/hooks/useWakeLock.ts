import { useEffect, useRef } from 'react';

/**
 * Mantiene la pantalla encendida mientras `active` sea true, usando la
 * Wake Lock API. El sistema libera el lock al ocultar la pestaña, así que
 * se vuelve a pedir cuando la página recupera visibilidad.
 */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!('wakeLock' in navigator)) return;

    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        lockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        /* denegado (p. ej. batería baja): no es crítico */
      }
    };

    const release = () => {
      void lockRef.current?.release();
      lockRef.current = null;
    };

    if (active) {
      void acquire();
      document.addEventListener('visibilitychange', acquire);
      return () => {
        cancelled = true;
        document.removeEventListener('visibilitychange', acquire);
        release();
      };
    }
    release();
  }, [active]);
}
