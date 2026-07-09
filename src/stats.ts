/**
 * Estadística local (v2): por día guarda sesiones, segundos totales,
 * desglose por hora del día y por etiqueta. Todo vive en localStorage,
 * sin cuentas ni red.
 */

export interface DayStats {
  count: number;
  seconds: number;
  byHour: Record<string, number>;
  byTag: Record<string, number>;
}

interface Store {
  days: Record<string, DayStats>;
}

const KEY = 'reloj:stats:v2';

export const TAGS = ['Estudio', 'Trabajo', 'Lectura', 'Otro'] as const;
export type Tag = (typeof TAGS)[number];

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

const emptyDay = (): DayStats => ({ count: 0, seconds: 0, byHour: {}, byTag: {} });

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
    // Migrar el formato v1 (una clave por día) si existe.
    const store: Store = { days: {} };
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('reloj:stats:2')) {
        const date = k.slice('reloj:stats:'.length);
        try {
          const old = JSON.parse(localStorage.getItem(k) ?? '{}');
          store.days[date] = { ...emptyDay(), count: old.count ?? 0, seconds: old.seconds ?? 0 };
        } catch {
          /* entrada corrupta: ignorar */
        }
      }
    }
    return store;
  } catch {
    return { days: {} };
  }
}

function save(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* sin espacio o sin localStorage */
  }
}

export function todayStats(): DayStats {
  return load().days[dateKey(new Date())] ?? emptyDay();
}

export function recordSession(seconds: number, tag: string): DayStats {
  const store = load();
  const key = dateKey(new Date());
  const day = store.days[key] ?? emptyDay();
  const hour = String(new Date().getHours());
  day.count += 1;
  day.seconds += seconds;
  day.byHour[hour] = (day.byHour[hour] ?? 0) + seconds;
  day.byTag[tag] = (day.byTag[tag] ?? 0) + seconds;
  store.days[key] = day;
  save(store);
  return day;
}

/** Días consecutivos con al menos una sesión, contando hacia atrás desde hoy
 *  (si hoy aún no hay sesión, la racha sigue viva desde ayer). */
export function streak(): number {
  const days = load().days;
  let n = 0;
  const cursor = new Date();
  if (!days[dateKey(cursor)]?.count) cursor.setDate(cursor.getDate() - 1);
  while (days[dateKey(cursor)]?.count) {
    n++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

/** Hora del día (0-23) con más segundos de foco acumulados, o null. */
export function bestHour(): number | null {
  const days = load().days;
  const totals: Record<string, number> = {};
  for (const day of Object.values(days)) {
    for (const [h, s] of Object.entries(day.byHour)) {
      totals[h] = (totals[h] ?? 0) + s;
    }
  }
  const entries = Object.entries(totals);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return Number(entries[0][0]);
}

/** Últimos 7 días (incluye hoy), en orden cronológico. */
export function lastWeek(): { date: Date; seconds: number }[] {
  const days = load().days;
  const out: { date: Date; seconds: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ date: d, seconds: days[dateKey(d)]?.seconds ?? 0 });
  }
  return out;
}

/** Últimas 52 semanas alineadas a semanas completas (para el heatmap). */
export function yearGrid(): { date: Date; seconds: number }[] {
  const days = load().days;
  const today = new Date();
  const total = 52 * 7;
  // Terminar la cuadrícula en el sábado de esta semana (semana empieza en domingo)
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay()));
  const out: { date: Date; seconds: number }[] = [];
  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    out.push({ date: d, seconds: d > today ? -1 : (days[dateKey(d)]?.seconds ?? 0) });
  }
  return out;
}

/** Suma de segundos por etiqueta en todo el historial. */
export function tagTotals(): { tag: string; seconds: number }[] {
  const days = load().days;
  const totals: Record<string, number> = {};
  for (const day of Object.values(days)) {
    for (const [t, s] of Object.entries(day.byTag)) {
      totals[t] = (totals[t] ?? 0) + s;
    }
  }
  return Object.entries(totals)
    .map(([tag, seconds]) => ({ tag, seconds }))
    .sort((a, b) => b.seconds - a.seconds);
}

export function toCSV(): string {
  const days = load().days;
  const rows = Object.entries(days).sort(([a], [b]) => a.localeCompare(b));
  const lines = ['fecha,sesiones,minutos,etiquetas'];
  for (const [date, day] of rows) {
    const tags = Object.entries(day.byTag)
      .map(([t, s]) => `${t}:${Math.round(s / 60)}m`)
      .join(' ');
    lines.push(`${date},${day.count},${Math.round(day.seconds / 60)},"${tags}"`);
  }
  return lines.join('\n');
}

export function formatFocusTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h} h ${m} m`;
  return `${m} m`;
}
