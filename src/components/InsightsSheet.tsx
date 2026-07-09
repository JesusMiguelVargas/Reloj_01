import {
  bestHour,
  formatFocusTime,
  lastWeek,
  streak,
  tagTotals,
  toCSV,
  todayStats,
  yearGrid,
} from '../stats';
import { shareSummary } from '../shareCard';

const DAY_LETTERS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function level(seconds: number, max: number): number {
  if (seconds <= 0) return 0;
  const r = seconds / max;
  if (r < 0.25) return 1;
  if (r < 0.5) return 2;
  if (r < 0.75) return 3;
  return 4;
}

function downloadCSV() {
  const blob = new Blob([toCSV()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reloj-estadisticas.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function InsightsSheet({ onClose }: { onClose: () => void }) {
  const today = todayStats();
  const racha = streak();
  const hora = bestHour();
  const week = lastWeek();
  const grid = yearGrid();
  const tags = tagTotals();

  const weekMax = Math.max(1, ...week.map((d) => d.seconds));
  const gridMax = Math.max(1, ...grid.map((d) => d.seconds));
  const tagMax = Math.max(1, ...tags.map((t) => t.seconds));

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet-insights" onClick={(e) => e.stopPropagation()}>
        <h2>Estadísticas</h2>

        <div className="stat-tiles">
          <div className="stat-tile">
            <span className="stat-value">{racha}</span>
            <span className="stat-label">{racha === 1 ? 'día de racha' : 'días de racha'}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">{formatFocusTime(today.seconds)}</span>
            <span className="stat-label">
              hoy · {today.count} {today.count === 1 ? 'sesión' : 'sesiones'}
            </span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">{hora === null ? '—' : `${hora}:00`}</span>
            <span className="stat-label">mejor hora</span>
          </div>
        </div>

        <h3 className="sheet-subtitle">Últimos 7 días</h3>
        <div className="week-bars" role="img" aria-label="Minutos de foco por día de la semana">
          {week.map(({ date, seconds }) => (
            <div className="week-col" key={date.toISOString()}>
              <div
                className="week-bar"
                style={{ height: `${Math.max(seconds > 0 ? 8 : 2, (seconds / weekMax) * 100)}%` }}
                title={`${date.toLocaleDateString()} · ${formatFocusTime(seconds)}`}
              />
              <span className="week-day">{DAY_LETTERS[date.getDay()]}</span>
            </div>
          ))}
        </div>

        <h3 className="sheet-subtitle">Último año</h3>
        <div className="heatmap-scroll">
          <div className="heatmap" role="img" aria-label="Mapa de calor anual de foco">
            {grid.map(({ date, seconds }) => (
              <span
                key={date.toISOString()}
                className={`hm-cell${seconds < 0 ? ' hm-future' : ` hm-${level(seconds, gridMax)}`}`}
                title={seconds >= 0 ? `${date.toLocaleDateString()} · ${formatFocusTime(seconds)}` : ''}
              />
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <>
            <h3 className="sheet-subtitle">Por etiqueta</h3>
            <div className="tag-rows">
              {tags.map(({ tag, seconds }) => (
                <div className="tag-row" key={tag}>
                  <span className="tag-name">{tag}</span>
                  <div className="tag-track">
                    <div className="tag-fill" style={{ width: `${(seconds / tagMax) * 100}%` }} />
                  </div>
                  <span className="tag-time">{formatFocusTime(seconds)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          className="sheet-secondary"
          onClick={() =>
            void shareSummary({ streak: racha, todaySeconds: today.seconds, count: today.count })
          }
        >
          Compartir resumen del día
        </button>
        <button className="sheet-secondary" onClick={downloadCSV}>
          Exportar CSV
        </button>
        <button className="sheet-primary" onClick={onClose}>
          Listo
        </button>
      </div>
    </div>
  );
}
