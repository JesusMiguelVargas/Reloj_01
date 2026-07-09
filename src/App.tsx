import { useEffect, useRef, useState } from 'react';
import FlipDigit from './components/FlipDigit';
import {
  ClockIcon,
  CloseIcon,
  GearIcon,
  PauseIcon,
  PlayIcon,
  SoundOffIcon,
  SoundOnIcon,
} from './components/Icons';
import { useSound } from './hooks/useSound';
import { useTimer } from './hooks/useTimer';

const PRESETS = [1, 3, 5, 10, 15, 25, 45, 60];

interface Settings {
  alarmSound: boolean;
  flipSound: boolean;
  vibrate: boolean;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('reloj:settings');
    if (raw) return { alarmSound: true, flipSound: false, vibrate: true, ...JSON.parse(raw) };
  } catch {
    /* localStorage puede no estar disponible */
  }
  return { alarmSound: true, flipSound: false, vibrate: true };
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const { playFlick, playAlarm, unlock } = useSound();

  const { remaining, duration, status, start, pause, reset } = useTimer(() => {
    if (settingsRef.current.alarmSound) playAlarm();
    if (settingsRef.current.vibrate && 'vibrate' in navigator) {
      navigator.vibrate([300, 120, 300, 120, 600]);
    }
  });

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

  // Sonido de solapa en cada segundo mientras corre.
  const prevRemaining = useRef(remaining);
  useEffect(() => {
    if (remaining !== prevRemaining.current) {
      prevRemaining.current = remaining;
      if (status === 'running' && settingsRef.current.flipSound) playFlick();
    }
  }, [remaining, status, playFlick]);

  // Título de la pestaña con el tiempo restante.
  useEffect(() => {
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    document.title =
      status === 'running' || status === 'paused' ? `${mm}:${ss} — Temporizador` : 'Reloj — Temporizador Flip';
  }, [remaining, status]);

  const minutes = String(Math.min(99, Math.floor(remaining / 60))).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  const digits = [minutes[0], minutes[1], seconds[0], seconds[1]];

  const running = status === 'running';
  const finished = status === 'finished';

  const handlePlayPause = () => {
    unlock();
    if (running) {
      pause();
    } else if (finished) {
      reset();
    } else {
      start();
    }
  };

  const handleClose = () => {
    reset();
  };

  const openPicker = () => {
    setPickerMin(Math.floor(duration / 60));
    setPickerSec(duration % 60);
    setShowPicker(true);
  };

  const applyPicker = (totalSeconds: number) => {
    const clamped = Math.max(1, Math.min(99 * 60 + 59, totalSeconds));
    reset(clamped);
    setShowPicker(false);
  };

  return (
    <div className={`app${finished ? ' finished' : ''}`}>
      <header className="topbar">
        <button className="icon-btn close" onClick={handleClose} aria-label="Reiniciar">
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
          <button className="icon-btn" onClick={openPicker} aria-label="Elegir duración">
            <ClockIcon />
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Ajustes">
            <GearIcon />
          </button>
        </div>
      </header>

      <main
        className="clock"
        role="timer"
        aria-label={`Quedan ${minutes} minutos con ${seconds} segundos`}
      >
        {digits.map((d, i) => (
          <FlipDigit key={i} value={d} />
        ))}
      </main>

      <footer className="bottombar">
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
                  className={`preset${duration === m * 60 ? ' active' : ''}`}
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
            <button className="sheet-primary" onClick={() => setShowSettings(false)}>
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
