/** Estadística mínima del día: sesiones de foco completadas y tiempo total. */

export interface DayStats {
  count: number;
  seconds: number;
}

function todayKey() {
  const d = new Date();
  return `reloj:stats:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function todayStats(): DayStats {
  try {
    const raw = localStorage.getItem(todayKey());
    if (raw) return { count: 0, seconds: 0, ...JSON.parse(raw) };
  } catch {
    /* ignorar */
  }
  return { count: 0, seconds: 0 };
}

export function recordSession(seconds: number): DayStats {
  const next = {
    count: todayStats().count + 1,
    seconds: todayStats().seconds + seconds,
  };
  try {
    localStorage.setItem(todayKey(), JSON.stringify(next));
  } catch {
    /* ignorar */
  }
  return next;
}

export function formatFocusTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h} h ${m} m`;
  return `${m} m`;
}
