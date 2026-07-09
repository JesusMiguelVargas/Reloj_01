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
import { useClock } from './hooks/useClock';
import { useSound } from './hooks/useSound';
import { useStopwatch } from './hooks/useStopwatch';
import { useTimer } from './hooks/useTimer';
import { useWakeLock } from './hooks/useWakeLock';

const PRESETS = [1, 3, 5, 10, 15, 25, 45, 60];

type Mode = 'clock' | 'timer' | 'stopwatch';

const MODE_LABELS: Record<Mode, string> = {
  clock: 'Reloj',
  timer: 'Timer',
  stopwatch: 'Crono',
};

interface Settings {
  alarmSound: boolean;
  flipSound: boolean;
  vibrate: boolean;
  keepAwake: boolean;
  notify: boolean;
  hour12: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  alarmSound: true,
  flipSound: false,
  vibrate: true,
  keepAwake: true,
  notify: false,
  hour12: false,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('reloj:settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* localStorage puede no estar disponible */
  }
  return DEFAULT_SETTINGS;
}

function loadMode(): Mode {
  try {
    const raw = localStorage.getItem('reloj:mode');
    if (raw === 'clock' || raw === 'timer' || raw === 'stopwatch') return raw;
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

  const { playFlick, playAlarm, unlock } = useSound();

  const timer = useTimer(() => {
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
        icon: '/icon.svg',
      });
    }
  });

  const stopwatch = useStopwatch();
  const clock = useClock(mode === 'clock', settings.hour12);

  const isActive =
    mode === 'clock' || timer.status === 'running' || (mode === 'stopwatch' && stopwatch.running);
  useWakeLock(settings.keepAwake && isActive);

  const [showPicker, setShowPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

  // Dígitos según el modo activo
  let digits: string[];
  if (mode === 'clock') {
    digits = [clock.hh[0], clock.hh[1], clock.mm[0], clock.mm[1]];
  } else if (mode === 'stopwatch') {
    const mm = pad(Math.floor(stopwatch.elapsed / 60));
    const ss = pad(stopwatch.elapsed % 60);
    digits = [mm[0], mm[1], ss[0], ss[1]];
  } else {
    const mm = pad(Math.min(99, Math.floor(timer.remaining / 60)));
    const ss = pad(timer.remaining % 60);
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
    } else {
      document.title = 'Reloj — Temporizador Flip';
    }
  }, [mode, timer.status, stopwatch.running, digits]);

  const running = mode === 'timer' ? timer.status === 'running' : stopwatch.running;
  const finished = mode === 'timer' && timer.status === 'finished';

  const handlePlayPause = () => {
    unlock();
    if (mode === 'timer') {
      if (timer.status === 'running') timer.pause();
      else if (timer.status === 'finished') timer.reset();
      else timer.start();
    } else if (mode === 'stopwatch') {
      if (stopwatch.running) stopwatch.pause();
      else stopwatch.start();
    }
  };

  const handleClose = () => {
    if (mode === 'timer') timer.reset();
    else if (mode === 'stopwatch') stopwatch.reset();
  };

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

  return (
    <div className={`app${finished ? ' finished' : ''}`}>
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
            onClick={() => setSettings((s) => ({ ...s, alarmSound: !s.alarmSound }))}
            aria-label={settings.alarmSound ? 'Silenciar alarma' : 'Activar alarma'}
          >
            {settings.alarmSound ? <SoundOnIcon /> : <SoundOffIcon />}
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
        className="clock"
        role="timer"
        aria-label={`${digits[0]}${digits[1]} ${digits[2]}${digits[3]}`}
      >
        {digits.map((d, i) => (
          <FlipDigit key={i} value={d} />
        ))}
      </main>

      <footer className="bottombar" style={{ visibility: controlsHidden ? 'hidden' : 'visible' }}>
        <button
          className="play-btn"
          onClick={handlePlayPause}
          aria-label={running ? 'Pausar' : 'Iniciar'}
        >
          {running ? <PauseIcon /> : <PlayIcon />}
        </button>
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

      {showSettings && (
        <div className="sheet-backdrop" onClick={() => setShowSettings(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Ajustes</h2>
            <label className="toggle-row">
              <span>Alarma al terminar</span>
              <input
                type="checkbox"
                checked={settings.alarmSound}
                onChange={(e) => setSettings((s) => ({ ...s, alarmSound: e.target.checked }))}
              />
            </label>
            <label className="toggle-row">
              <span>Sonido de solapa (tic)</span>
              <input
                type="checkbox"
                checked={settings.flipSound}
                onChange={(e) => setSettings((s) => ({ ...s, flipSound: e.target.checked }))}
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
            <button className="sheet-primary" onClick={() => setShowSettings(false)}>
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
