const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function CloseIcon() {
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em">
      <circle cx="16" cy="16" r="14" fill="currentColor" />
      <path d="M11.5 11.5 L20.5 20.5 M20.5 11.5 L11.5 20.5" stroke="#000" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function SoundOnIcon() {
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em" {...stroke}>
      <path d="M6 12 h4 l6 -5 v18 l-6 -5 h-4 z" fill="none" />
      <path d="M20.5 12.5 a5 5 0 0 1 0 7" />
      <path d="M23.5 9.5 a9.5 9.5 0 0 1 0 13" />
    </svg>
  );
}

export function SoundOffIcon() {
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em" {...stroke}>
      <path d="M6 12 h4 l6 -5 v18 l-6 -5 h-4 z" fill="none" />
      <path d="M21 12.5 l7 7 M28 12.5 l-7 7" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em" {...stroke}>
      <circle cx="16" cy="16" r="12" />
      <path d="M16 9.5 V16 l4.5 2.8" />
    </svg>
  );
}

export function GearIcon() {
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em" {...stroke}>
      <path d="M13.2 4.6 a3.2 3.2 0 0 1 5.6 0 l.7 1.3 a3.2 3.2 0 0 0 3.1 1.7 l1.5 -.1 a3.2 3.2 0 0 1 2.8 4.8 l-.8 1.3 a3.2 3.2 0 0 0 0 3.4 l.8 1.3 a3.2 3.2 0 0 1 -2.8 4.8 l-1.5 -.1 a3.2 3.2 0 0 0 -3.1 1.7 l-.7 1.3 a3.2 3.2 0 0 1 -5.6 0 l-.7 -1.3 a3.2 3.2 0 0 0 -3.1 -1.7 l-1.5 .1 a3.2 3.2 0 0 1 -2.8 -4.8 l.8 -1.3 a3.2 3.2 0 0 0 0 -3.4 l-.8 -1.3 a3.2 3.2 0 0 1 2.8 -4.8 l1.5 .1 a3.2 3.2 0 0 0 3.1 -1.7 z" />
      <circle cx="16" cy="16" r="3.4" />
    </svg>
  );
}

export function ExpandIcon() {
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em" {...stroke}>
      <path d="M12 6 H7 a1 1 0 0 0 -1 1 V12 M20 6 h5 a1 1 0 0 1 1 1 V12 M12 26 H7 a1 1 0 0 1 -1 -1 V20 M20 26 h5 a1 1 0 0 0 1 -1 V20" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em">
      <path d="M12 8.5 L24 16 L12 23.5 Z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em">
      <rect x="10" y="8" width="4.2" height="16" rx="1.6" fill="currentColor" />
      <rect x="17.8" y="8" width="4.2" height="16" rx="1.6" fill="currentColor" />
    </svg>
  );
}
