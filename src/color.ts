/** Utilidades de color para el editor de acento. */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function luminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

/**
 * Devuelve el color elegido, aclarado u oscurecido lo mínimo necesario para
 * que contraste con el fondo de la tarjeta (los dígitos siempre se leen).
 */
export function ensureContrast(colorHex: string, cardHex: string, min = 3): string {
  let rgb = hexToRgb(colorHex);
  const card = hexToRgb(cardHex);
  if (contrast(rgb, card) >= min) return colorHex;

  // Mover hacia blanco sobre fondos oscuros, hacia negro sobre claros.
  const towardWhite = luminance(card) < 0.5;
  for (let i = 0; i < 24 && contrast(rgb, card) < min; i++) {
    rgb = rgb.map((v) =>
      towardWhite ? Math.min(255, v + (255 - v) * 0.18 + 4) : Math.max(0, v * 0.82 - 4)
    ) as [number, number, number];
  }
  return rgbToHex(rgb);
}
