import { useEffect, useRef, useState } from 'react';
import FlipDigit from './components/FlipDigit';
import {
  ClockIcon,
  CloseIcon,
  ExpandIcon,
  GearIcon,
  PauseIcon,
  PlayIcon,
  SoundOffIcon,
  SoundOnIcon,
} from './components/Icons';
import { EMPTY_MIX, MIX_LABELS, useAmbient, type AmbientMix } from './hooks/useAmbient';
import { useClock } from './hooks/useClock';
import { DEFAULT_POMODORO, usePomodoro, type PomodoroConfig } from './hooks/usePomodoro';
import { useSound } from './hooks/useSound';
import { useStopwatch } from './hooks/useStopwatch';
import { useTimer } from './hooks/useTimer';
import { useWakeLock } from './hooks/useWakeLock';
import { ensureContrast } from './color';
import InsightsSheet from './components/InsightsSheet';
import { TAGS, formatFocusTime, recordSession, todayStats } from './stats';

const PRESETS = [1, 3, 5, 10, 15, 25, 45, 60];

type Mode = 'clock' | 'timer' | 'stopwatch' | 'pomodoro';

const MODE_LABELS: Record<Mode, string> = {
  clock: 'Reloj',
  timer: 'Timer',
  stopwatch: 'Crono',
  pomodoro: 'Pomo',
};

const PHASE_LABELS = {
  focus: 'Foco',
  break: 'Descanso',
  longBreak: 'Descanso largo',
} as const;

type Theme = 'negro' | 'marfil' | 'terminal' | 'rojo';

/** Colores de las muestras del selector (espejo de los temas en CSS). */
const THEMES: { id: Theme; name: string; card: string; digit: string }[] = [
  { id: 'negro', name: 'Negro', card: '#17171a', digit: '#c9c9ce' },
  { id: 'marfil', name: 'Marfil', card: '#f6f3ec', digit: '#2e2c28' },
  { id: 'terminal', name: 'Terminal', card: '#0d1710', digit: '#3fd97f' },
  { id: 'rojo', name: 'Rojo', card: '#170d0d', digit: '#c24141' },
];

interface Settings {
  alarmSound: boolean;
  flipSound: boolean;
  vibrate: boolean;
  keepAwake: boolean;
  notify: boolean;
  hour12: boolean;
  theme: Theme;
  ambientMix: AmbientMix;
  breathing: boolean;
  pomodoro: PomodoroConfig;
  flipStyle: 'suave' | 'mecanico' | 'instantaneo';
  flipSpeed: 'lenta' | 'normal' | 'rapida';
  digitFont: 'redondeada' | 'mono' | 'serif';
  nightDim: boolean;
  hourlyChime: boolean;
  accent: string | null;
  dailyGoalMin: number;
  defaultTag: string;
}

const DEFAULT_SETTINGS: Settings = {
  alarmSound: true,
  flipSound: false,
  vibrate: true,
  keepAwake: true,
  notify: false,
  hour12: false,
  theme: 'negro',
  ambientMix: EMPTY_MIX,
  breathing: true,
  pomodoro: DEFAULT_POMODORO,
  flipStyle: 'suave',
  flipSpeed: 'normal',
  digitFont: 'redondeada',
  nightDim: false,
  hourlyChime: false,
  accent: null,
  dailyGoalMin: 0,
  defaultTag: 'Trabajo',
};

const FLIP_HALF_MS = { lenta: 460, normal: 310, rapida: 200 } as const;

const FLIP_STYLES = [
  ['suave', 'Suave'],
  ['mecanico', 'Mecánico'],
  ['instantaneo', 'Directo'],
] as const;

const FLIP_SPEEDS = [
  ['lenta', 'Lenta'],
  ['normal', 'Normal'],
  ['rapida', 'Rápida'],
] as const;

const DIGIT_FONTS = [
  ['redondeada', 'Redonda'],
  ['mono', 'Mono'],
  ['serif', 'Serif'],
] as const;

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('reloj:settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migración: la versión anterior guardaba un solo ambiente ('rain'…)
      let ambientMix: AmbientMix = { ...EMPTY_MIX, ...(parsed.ambientMix ?? {}) };
      if (!parsed.ambientMix && parsed.ambient && parsed.ambient !== 'none') {
        const key = (['rain', 'noise', 'tick'] as const).find((k) => k === parsed.ambient);
        if (key) ambientMix = { ...EMPTY_MIX, [key]: 0.7 };
      }
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        ambientMix,
        pomodoro: { ...DEFAULT_POMODORO, ...(parsed.pomodoro ?? {}) },
      };
    }
  } catch {
    /* localStorage puede no estar disponible */
  }
  return DEFAULT_SETTINGS;
}

function loadMode(): Mode {
  try {
    const raw = localStorage.getItem('reloj:mode');
    if (raw === 'clock' || raw === 'timer' || raw === 'stopwatch' || raw === 'pomodoro') return raw;
  } catch {
    /* ignorar */
  }
  return 'timer';
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    void document.documentElement.requestFullscreen().catch(() => {
      /* algunos navegadores lo bloquean */
    });
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const [mode, setMode] = useState<Mode>(loadMode);

  const { playFlick, playAlarm, playChime, playDong, unlock } = useSound();
  const { apply: applyAmbient } = useAmbient();
  const [stats, setStats] = useState(todayStats);
  const timerDurationRef = useRef(0);

  const timer = useTimer(() => {
    setStats(recordSession(timerDurationRef.current, settingsRef.current.defaultTag));
    if (settingsRef.current.alarmSound) playAlarm();
    if (settingsRef.current.vibrate && 'vibrate' in navigator) {
      navigator.vibrate([300, 120, 300, 120, 600]);
    }
    if (
      settingsRef.current.notify &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      document.visibilityState !== 'visible'
    ) {
      new Notification('Tiempo terminado ⏱️', {
        body: 'Tu temporizador llegó a 00:00.',
        icon: `${import.meta.env.BASE_URL}icon.svg`,
      });
    }
  });

  timerDurationRef.current = timer.duration;

  const stopwatch = useStopwatch();
  const clock = useClock(mode === 'clock', settings.hour12, () => {
    if (settingsRef.current.hourlyChime) playDong();
  });

  const pomodoro = usePomodoro(settings.pomodoro, {
    onPhaseEnd: (ended, next, focusSeconds) => {
      if (ended === 'focus') {
        setStats(recordSession(focusSeconds, settingsRef.current.defaultTag));
      }
      if (settingsRef.current.alarmSound) playChime();
      if (settingsRef.current.vibrate && 'vibrate' in navigator) {
        navigator.vibrate(next === 'focus' ? [200] : [200, 100, 200]);
      }
      if (
        settingsRef.current.notify &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.visibilityState !== 'visible'
      ) {
        new Notification(next === 'focus' ? 'A concentrarse 🍅' : 'Descanso ☕', {
          body: `Empieza: ${PHASE_LABELS[next].toLowerCase()}.`,
          icon: `${import.meta.env.BASE_URL}icon.svg`,
        });
      }
    },
  });

  const isActive =
    mode === 'clock' ||
    timer.status === 'running' ||
    (mode === 'stopwatch' && stopwatch.running) ||
    (mode === 'pomodoro' && pomodoro.running);
  useWakeLock(settings.keepAwake && isActive);

  const [showPicker, setShowPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSound, setShowSound] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [pickerMin, setPickerMin] = useState(5);
  const [pickerSec, setPickerSec] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem('reloj:settings', JSON.stringify(settings));
    } catch {
      /* ignorar */
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('reloj:mode', mode);
    } catch {
      /* ignorar */
    }
  }, [mode]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  // Acento personalizado: se ajusta solo para que contraste con la tarjeta.
  useEffect(() => {
    if (settings.accent) {
      const themeCard = THEMES.find((t) => t.id === settings.theme)?.card ?? '#17171a';
      document.documentElement.style.setProperty(
        '--digit',
        ensureContrast(settings.accent, themeCard)
      );
    } else {
      document.documentElement.style.removeProperty('--digit');
    }
  }, [settings.accent, settings.theme]);

  // Atenuación nocturna: dígitos tenues de 21:00 a 07:00.
  const [night, setNight] = useState(false);
  useEffect(() => {
    if (!settings.nightDim) {
      setNight(false);
      return;
    }
    const check = () => {
      const h = new Date().getHours();
      setNight(h >= 21 || h < 7);
    };
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [settings.nightDim]);

  // Duración real del volteo según estilo y velocidad (para FlipDigit).
  const flipHalf = FLIP_HALF_MS[settings.flipSpeed];
  const flipDurationMs =
    settings.flipStyle === 'instantaneo'
      ? 60
      : settings.flipStyle === 'mecanico'
        ? Math.round(flipHalf * 2.7) + 60
        : flipHalf * 2 + 60;

  // ----- Gestos sobre las tarjetas -----
  // deslizar vertical (timer detenido) = ajustar minutos
  // doble tap = pantalla completa | mantener presionado = reiniciar
  const gestureRef = useRef({
    active: false,
    startY: 0,
    startX: 0,
    moved: false,
    steps: 0,
    baseDuration: 0,
    longPressTimer: 0,
    longPressFired: false,
    lastTap: 0,
  });

  const onClockPointerDown = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    g.active = true;
    g.startX = e.clientX;
    g.startY = e.clientY;
    g.moved = false;
    g.steps = 0;
    g.baseDuration = timer.duration;
    g.longPressFired = false;
    g.longPressTimer = window.setTimeout(() => {
      if (!g.moved && mode !== 'clock') {
        g.longPressFired = true;
        handleCloseRef.current();
        if ('vibrate' in navigator) navigator.vibrate(60);
      }
    }, 600);
  };

  const onClockPointerMove = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g.active) return;
    const dy = e.clientY - g.startY;
    const dx = e.clientX - g.startX;
    if (!g.moved && Math.hypot(dx, dy) > 12) {
      g.moved = true;
      window.clearTimeout(g.longPressTimer);
    }
    if (g.moved && mode === 'timer' && timer.status !== 'running') {
      const steps = Math.trunc(-dy / 26); // arrastrar hacia arriba suma minutos
      if (steps !== g.steps) {
        g.steps = steps;
        const next = Math.max(60, Math.min(99 * 60 + 59, g.baseDuration + steps * 60));
        timer.reset(next);
      }
    }
  };

  const onClockPointerUp = () => {
    const g = gestureRef.current;
    if (!g.active) return;
    g.active = false;
    window.clearTimeout(g.longPressTimer);
    if (g.longPressFired || g.moved) return;
    const now = Date.now();
    if (now - g.lastTap < 300) {
      g.lastTap = 0;
      toggleFullscreen();
    } else {
      g.lastTap = now;
    }
  };

  // Dígitos según el modo activo
  let digits: string[];
  if (mode === 'clock') {
    digits = [clock.hh[0], clock.hh[1], clock.mm[0], clock.mm[1]];
  } else if (mode === 'stopwatch') {
    const mm = pad(Math.floor(stopwatch.elapsed / 60));
    const ss = pad(stopwatch.elapsed % 60);
    digits = [mm[0], mm[1], ss[0], ss[1]];
  } else {
    const secondsLeft = mode === 'pomodoro' ? pomodoro.remaining : timer.remaining;
    const mm = pad(Math.min(99, Math.floor(secondsLeft / 60)));
    const ss = pad(secondsLeft % 60);
    digits = [mm[0], mm[1], ss[0], ss[1]];
  }

  // Sonido de solapa cuando cambia cualquier dígito visible
  const digitsKey = digits.join('');
  const prevDigitsKey = useRef(digitsKey);
  useEffect(() => {
    if (digitsKey !== prevDigitsKey.current) {
      prevDigitsKey.current = digitsKey;
      if (settingsRef.current.flipSound) playFlick();
    }
  }, [digitsKey, playFlick]);

  // Título de la pestaña
  useEffect(() => {
    if (mode === 'timer' && (timer.status === 'running' || timer.status === 'paused')) {
      document.title = `${digits[0]}${digits[1]}:${digits[2]}${digits[3]} — Temporizador`;
    } else if (mode === 'stopwatch' && stopwatch.running) {
      document.title = `${digits[0]}${digits[1]}:${digits[2]}${digits[3]} — Cronómetro`;
    } else if (mode === 'pomodoro' && pomodoro.running) {
      document.title = `${digits[0]}${digits[1]}:${digits[2]}${digits[3]} — ${PHASE_LABELS[pomodoro.phase]}`;
    } else {
      document.title = 'Reloj — Temporizador Flip';
    }
  }, [mode, timer.status, stopwatch.running, pomodoro.running, pomodoro.phase, digits]);

  const running =
    mode === 'timer'
      ? timer.status === 'running'
      : mode === 'pomodoro'
        ? pomodoro.running
        : stopwatch.running;
  const finished = mode === 'timer' && timer.status === 'finished';

  // Sonido ambiente: solo mientras corre la cuenta, con fundido de salida.
  useEffect(() => {
    applyAmbient(settings.ambientMix, running);
  }, [running, settings.ambientMix, applyAmbient]);

  // Anti burn-in: desplaza el reloj unos píxeles de vez en cuando.
  const [drift, setDrift] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const id = window.setInterval(() => {
      setDrift({
        x: Math.round(Math.random() * 12 - 6),
        y: Math.round(Math.random() * 12 - 6),
      });
    }, 50_000);
    return () => window.clearInterval(id);
  }, []);

  const handlePlayPause = () => {
    unlock();
    if (mode === 'timer') {
      if (timer.status === 'running') timer.pause();
      else if (timer.status === 'finished') timer.reset();
      else timer.start();
    } else if (mode === 'stopwatch') {
      if (stopwatch.running) stopwatch.pause();
      else stopwatch.start();
    } else if (mode === 'pomodoro') {
      if (pomodoro.running) pomodoro.pause();
      else pomodoro.start();
    }
  };

  const handleClose = () => {
    if (mode === 'timer') timer.reset();
    else if (mode === 'stopwatch') stopwatch.reset();
    else if (mode === 'pomodoro') pomodoro.reset();
  };
  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  const openPicker = () => {
    setPickerMin(Math.floor(timer.duration / 60));
    setPickerSec(timer.duration % 60);
    setShowPicker(true);
  };

  const applyPicker = (totalSeconds: number) => {
    const clamped = Math.max(1, Math.min(99 * 60 + 59, totalSeconds));
    timer.reset(clamped);
    setShowPicker(false);
  };

  const enableNotify = async (on: boolean) => {
    if (on && 'Notification' in window && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
    }
    setSettings((s) => ({ ...s, notify: on }));
  };

  const controlsHidden = mode === 'clock';

  // Respiración guiada: sustituye a los dígitos durante los descansos.
  const breathing =
    settings.breathing && mode === 'pomodoro' && pomodoro.running && pomodoro.phase !== 'focus';

  return (
    <div
      className={`app${finished ? ' finished' : ''}${night ? ' night' : ''}`}
      data-flip-style={settings.flipStyle}
      data-flip-speed={settings.flipSpeed}
      data-font={settings.digitFont}
    >
      <header className="topbar">
        <button
          className="icon-btn close"
          onClick={handleClose}
          aria-label="Reiniciar"
          style={{ visibility: controlsHidden ? 'hidden' : 'visible' }}
        >
          <CloseIcon />
        </button>
        <div className="topbar-right">
          <button
            className="icon-btn"
            onClick={() => setShowSound(true)}
            aria-label="Sonido"
          >
            {settings.alarmSound ||
            settings.ambientMix.rain + settings.ambientMix.noise + settings.ambientMix.tick >
              0.01 ? (
              <SoundOnIcon />
            ) : (
              <SoundOffIcon />
            )}
          </button>
          {mode === 'timer' && (
            <button className="icon-btn" onClick={openPicker} aria-label="Elegir duración">
              <ClockIcon />
            </button>
          )}
          <button className="icon-btn" onClick={toggleFullscreen} aria-label="Pantalla completa">
            <ExpandIcon />
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Ajustes">
            <GearIcon />
          </button>
        </div>
      </header>

      <nav className="modes" aria-label="Modo">
        {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
          <button
            key={m}
            className={`mode-btn${mode === m ? ' active' : ''}`}
            onClick={() => setMode(m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </nav>

      <main
        className={`clock${breathing ? ' breathing' : ''}`}
        role="timer"
        aria-label={`${digits[0]}${digits[1]} ${digits[2]}${digits[3]}`}
        onPointerDown={onClockPointerDown}
        onPointerMove={onClockPointerMove}
        onPointerUp={onClockPointerUp}
        onPointerCancel={onClockPointerUp}
        style={{ transform: `translate(${drift.x}px, ${drift.y}px)`, transition: 'transform 2s ease' }}
      >
        {breathing ? (
          <div className="breath">
            <div className="breath-circle" />
            <span className="breath-label">Respira</span>
            <span className="breath-time">
              {digits[0]}
              {digits[1]}:{digits[2]}
              {digits[3]}
            </span>
          </div>
        ) : (
          digits.map((d, i) => <FlipDigit key={i} value={d} durationMs={flipDurationMs} />)
        )}
      </main>

      {mode === 'pomodoro' && (
        <div className="pomo-status" aria-label={PHASE_LABELS[pomodoro.phase]}>
          <div className="pomo-dots">
            {Array.from({ length: settings.pomodoro.cyclesBeforeLongBreak }, (_, i) => (
              <span
                key={i}
                className={`pomo-dot${
                  i < pomodoro.cycle
                    ? ' done'
                    : i === pomodoro.cycle && pomodoro.phase === 'focus'
                      ? ' current'
                      : ''
                }`}
              />
            ))}
          </div>
          <span className="pomo-phase">{PHASE_LABELS[pomodoro.phase]}</span>
        </div>
      )}

      {(mode === 'timer' || mode === 'pomodoro') && !running && (
        <>
          <div className="tag-chips" aria-label="Etiqueta de la sesión">
            {TAGS.map((t) => (
              <button
                key={t}
                className={`tag-chip${settings.defaultTag === t ? ' active' : ''}`}
                onClick={() => setSettings((s) => ({ ...s, defaultTag: t }))}
              >
                {t}
              </button>
            ))}
          </div>
          {stats.count > 0 && (
            <button className="stats-line" onClick={() => setShowInsights(true)}>
              Hoy: {stats.count} {stats.count === 1 ? 'sesión' : 'sesiones'} ·{' '}
              {formatFocusTime(stats.seconds)}
            </button>
          )}
        </>
      )}

      <footer className="bottombar" style={{ visibility: controlsHidden ? 'hidden' : 'visible' }}>
        <div className="play-wrap">
          {settings.dailyGoalMin > 0 && (mode === 'timer' || mode === 'pomodoro') && (
            <svg className="goal-ring" viewBox="0 0 100 60" preserveAspectRatio="none">
              <rect className="ring-track" x="2" y="2" width="96" height="56" rx="28" />
              <rect
                className="ring-fill"
                x="2"
                y="2"
                width="96"
                height="56"
                rx="28"
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset={
                  100 - Math.min(100, (stats.seconds / (settings.dailyGoalMin * 60)) * 100)
                }
              />
            </svg>
          )}
          <button
            className="play-btn"
            onClick={handlePlayPause}
            aria-label={running ? 'Pausar' : 'Iniciar'}
          >
            {running ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>
      </footer>

      {showPicker && (
        <div className="sheet-backdrop" onClick={() => setShowPicker(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Duración</h2>
            <div className="presets">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  className={`preset${timer.duration === m * 60 ? ' active' : ''}`}
                  onClick={() => applyPicker(m * 60)}
                >
                  {m} min
                </button>
              ))}
            </div>
            <div className="custom-time">
              <label>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={pickerMin}
                  onChange={(e) => setPickerMin(Math.max(0, Math.min(99, Number(e.target.value) || 0)))}
                />
                <span>min</span>
              </label>
              <span className="colon">:</span>
              <label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={pickerSec}
                  onChange={(e) => setPickerSec(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                />
                <span>seg</span>
              </label>
            </div>
            <button className="sheet-primary" onClick={() => applyPicker(pickerMin * 60 + pickerSec)}>
              Aplicar
            </button>
          </div>
        </div>
      )}

      {showSound && (
        <div className="sheet-backdrop" onClick={() => setShowSound(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Sonido</h2>
            <label className="toggle-row">
              <span>Alarma al terminar</span>
              <input
                type="checkbox"
                checked={settings.alarmSound}
                onChange={(e) => setSettings((s) => ({ ...s, alarmSound: e.target.checked }))}
              />
            </label>
            <label className="toggle-row">
              <span>Sonido de solapa (clac)</span>
              <input
                type="checkbox"
                checked={settings.flipSound}
                onChange={(e) => setSettings((s) => ({ ...s, flipSound: e.target.checked }))}
              />
            </label>
            <label className="toggle-row">
              <span>Campanada cada hora (modo reloj)</span>
              <input
                type="checkbox"
                checked={settings.hourlyChime}
                onChange={(e) => {
                  unlock();
                  setSettings((s) => ({ ...s, hourlyChime: e.target.checked }));
                }}
              />
            </label>
            <h3 className="sheet-subtitle">Mezclador de ambiente (mientras corre)</h3>
            {(Object.keys(MIX_LABELS) as (keyof AmbientMix)[]).map((k) => (
              <label className="mix-row" key={k}>
                <span>{MIX_LABELS[k]}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.ambientMix[k] * 100)}
                  onChange={(e) => {
                    unlock();
                    const v = Number(e.target.value) / 100;
                    setSettings((s) => ({ ...s, ambientMix: { ...s.ambientMix, [k]: v } }));
                  }}
                />
              </label>
            ))}
            <button className="sheet-primary" onClick={() => setShowSound(false)}>
              Listo
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="sheet-backdrop" onClick={() => setShowSettings(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Ajustes</h2>

            <h3 className="sheet-subtitle">Tema</h3>
            <div className="themes">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-btn${settings.theme === t.id ? ' active' : ''}`}
                  onClick={() => setSettings((s) => ({ ...s, theme: t.id }))}
                >
                  <span className="theme-swatch" style={{ background: t.card, color: t.digit }}>
                    5
                  </span>
                  <span>{t.name}</span>
                </button>
              ))}
            </div>

            <div className="accent-row">
              <span>Color de dígitos</span>
              <div className="accent-controls">
                <input
                  type="color"
                  value={settings.accent ?? THEMES.find((t) => t.id === settings.theme)!.digit}
                  onChange={(e) => setSettings((s) => ({ ...s, accent: e.target.value }))}
                  aria-label="Color de dígitos"
                />
                {settings.accent && (
                  <button
                    className="accent-reset"
                    onClick={() => setSettings((s) => ({ ...s, accent: null }))}
                  >
                    Restablecer
                  </button>
                )}
              </div>
            </div>

            <h3 className="sheet-subtitle">Volteo</h3>
            <div className="presets chips3">
              {FLIP_STYLES.map(([id, label]) => (
                <button
                  key={id}
                  className={`preset${settings.flipStyle === id ? ' active' : ''}`}
                  onClick={() => setSettings((s) => ({ ...s, flipStyle: id }))}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="presets chips3">
              {FLIP_SPEEDS.map(([id, label]) => (
                <button
                  key={id}
                  className={`preset${settings.flipSpeed === id ? ' active' : ''}`}
                  onClick={() => setSettings((s) => ({ ...s, flipSpeed: id }))}
                >
                  {label}
                </button>
              ))}
            </div>

            <h3 className="sheet-subtitle">Tipografía</h3>
            <div className="presets chips3">
              {DIGIT_FONTS.map(([id, label]) => (
                <button
                  key={id}
                  className={`preset${settings.digitFont === id ? ' active' : ''}`}
                  onClick={() => setSettings((s) => ({ ...s, digitFont: id }))}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="toggle-row">
              <span>Respiración guiada en descansos</span>
              <input
                type="checkbox"
                checked={settings.breathing}
                onChange={(e) => setSettings((s) => ({ ...s, breathing: e.target.checked }))}
              />
            </label>
            <label className="toggle-row">
              <span>Atenuación nocturna (21:00–07:00)</span>
              <input
                type="checkbox"
                checked={settings.nightDim}
                onChange={(e) => setSettings((s) => ({ ...s, nightDim: e.target.checked }))}
              />
            </label>
            <label className="toggle-row">
              <span>Vibración al terminar</span>
              <input
                type="checkbox"
                checked={settings.vibrate}
                onChange={(e) => setSettings((s) => ({ ...s, vibrate: e.target.checked }))}
              />
            </label>
            <label className="toggle-row">
              <span>Mantener pantalla encendida</span>
              <input
                type="checkbox"
                checked={settings.keepAwake}
                onChange={(e) => setSettings((s) => ({ ...s, keepAwake: e.target.checked }))}
              />
            </label>
            <label className="toggle-row">
              <span>Notificación al terminar</span>
              <input
                type="checkbox"
                checked={settings.notify}
                onChange={(e) => void enableNotify(e.target.checked)}
              />
            </label>
            <label className="toggle-row">
              <span>Formato de 12 horas</span>
              <input
                type="checkbox"
                checked={settings.hour12}
                onChange={(e) => setSettings((s) => ({ ...s, hour12: e.target.checked }))}
              />
            </label>

            <div className="accent-row">
              <span>Meta diaria de foco (min, 0 = sin meta)</span>
              <input
                className="goal-input"
                type="number"
                min={0}
                max={960}
                value={settings.dailyGoalMin}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    dailyGoalMin: Math.max(0, Math.min(960, Number(e.target.value) || 0)),
                  }))
                }
              />
            </div>

            <button
              className="sheet-secondary"
              onClick={() => {
                setShowSettings(false);
                setShowInsights(true);
              }}
            >
              Ver estadísticas
            </button>

            <h3 className="sheet-subtitle">Pomodoro (minutos)</h3>
            <div className="pomo-config">
              {(
                [
                  ['focusMin', 'Foco'],
                  ['breakMin', 'Descanso'],
                  ['longBreakMin', 'Largo'],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={settings.pomodoro[key]}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        pomodoro: {
                          ...s.pomodoro,
                          [key]: Math.max(1, Math.min(99, Number(e.target.value) || 1)),
                        },
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <button className="sheet-primary" onClick={() => setShowSettings(false)}>
              Listo
            </button>
          </div>
        </div>
      )}

      {showInsights && <InsightsSheet onClose={() => setShowInsights(false)} />}
    </div>
  );
}
