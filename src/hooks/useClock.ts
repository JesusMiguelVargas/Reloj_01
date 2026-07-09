import { useEffect, useRef, useState } from 'react';

/**
 * Hora actual para el modo reloj de mesa. Solo tica cuando está activo.
 * `onHour` se dispara al cambiar la hora en punto (para la campanada).
 */
export function useClock(active: boolean, hour12: boolean, onHour?: () => void) {
  const [now, setNow] = useState(() => new Date());
  const lastHourRef = useRef(new Date().getHours());
  const onHourRef = useRef(onHour);
  onHourRef.current = onHour;

  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    lastHourRef.current = new Date().getHours();
    const id = window.setInterval(() => {
      const d = new Date();
      setNow(d);
      if (d.getHours() !== lastHourRef.current) {
        lastHourRef.current = d.getHours();
        onHourRef.current?.();
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [active]);

  let hours = now.getHours();
  if (hour12) hours = hours % 12 || 12;

  return {
    hh: String(hours).padStart(2, '0'),
    mm: String(now.getMinutes()).padStart(2, '0'),
  };
}
