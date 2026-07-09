import { useEffect, useState } from 'react';

/** Hora actual para el modo reloj de mesa. Solo tica cuando está activo. */
export function useClock(active: boolean, hour12: boolean) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 500);
    return () => window.clearInterval(id);
  }, [active]);

  let hours = now.getHours();
  if (hour12) hours = hours % 12 || 12;

  return {
    hh: String(hours).padStart(2, '0'),
    mm: String(now.getMinutes()).padStart(2, '0'),
  };
}
