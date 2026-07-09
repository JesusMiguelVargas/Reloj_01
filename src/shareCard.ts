import { formatFocusTime } from './stats';

interface ShareData {
  streak: number;
  todaySeconds: number;
  count: number;
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * Dibuja una tarjeta-resumen del día (1080×1350, formato historia/post) con
 * la estética flip clock del tema activo, y la comparte con Web Share o la
 * descarga como PNG.
 */
export async function shareSummary(data: ShareData) {
  const bg = cssVar('--bg', '#000000');
  const card = cssVar('--card', '#141416');
  const cardTop = cssVar('--card-top', '#17171a');
  const digit = cssVar('--digit', '#c9c9ce');

  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const font = (px: number, weight = 700) =>
    `${weight} ${px}px "SF Pro Rounded", ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif`;

  // Cabecera
  ctx.fillStyle = digit;
  ctx.globalAlpha = 0.45;
  ctx.font = font(34);
  ctx.textAlign = 'center';
  ctx.letterSpacing = '10px';
  ctx.fillText('RELOJ FLIP', W / 2, 130);
  ctx.letterSpacing = '0px';
  ctx.globalAlpha = 1;

  // Tarjeta central estilo flip con el tiempo de foco
  const cw = 760;
  const ch = 620;
  const cx = (W - cw) / 2;
  const cy = 240;
  ctx.fillStyle = cardTop;
  roundRect(ctx, cx, cy, cw, ch / 2, 48);
  ctx.fill();
  ctx.fillStyle = card;
  roundRect(ctx, cx, cy + ch / 2, cw, ch / 2, 48);
  ctx.fill();
  // esquinas internas rectas (como las mitades reales)
  ctx.fillStyle = cardTop;
  ctx.fillRect(cx, cy + ch / 2 - 48, cw, 48);
  ctx.fillStyle = card;
  ctx.fillRect(cx, cy + ch / 2, cw, 48);
  // bisagra
  ctx.fillStyle = bg;
  ctx.fillRect(cx, cy + ch / 2 - 3, cw, 6);

  ctx.fillStyle = digit;
  ctx.textBaseline = 'middle';
  const timeText = formatFocusTime(data.todaySeconds);
  let size = 210;
  ctx.font = font(size, 800);
  while (size > 80 && ctx.measureText(timeText).width > cw - 120) {
    size -= 10;
    ctx.font = font(size, 800);
  }
  ctx.fillText(timeText, W / 2, cy + ch / 2 + 8);

  // Datos bajo la tarjeta
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(52);
  ctx.globalAlpha = 0.9;
  const sesiones = `${data.count} ${data.count === 1 ? 'sesión' : 'sesiones'} de foco hoy`;
  ctx.fillText(sesiones, W / 2, cy + ch + 110);

  ctx.font = font(46);
  ctx.globalAlpha = 0.65;
  const racha =
    data.streak > 0
      ? `🔥 ${data.streak} ${data.streak === 1 ? 'día' : 'días'} de racha`
      : 'Primer día — la racha empieza hoy';
  ctx.fillText(racha, W / 2, cy + ch + 190);

  // Fecha
  ctx.font = font(36, 600);
  ctx.globalAlpha = 0.4;
  const fecha = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  ctx.fillText(fecha.charAt(0).toUpperCase() + fecha.slice(1), W / 2, H - 90);
  ctx.globalAlpha = 1;

  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  const file = new File([blob], 'mi-foco-hoy.png', { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Mi foco de hoy' });
      return;
    } catch {
      /* usuario canceló: caer a descarga */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mi-foco-hoy.png';
  a.click();
  URL.revokeObjectURL(url);
}
