import { useEffect, useRef, useState } from 'react';

/**
 * Un dígito de reloj de tarjetas (split-flap).
 *
 * Estructura:
 *  - Mitad superior estática  -> muestra el valor NUEVO
 *  - Mitad inferior estática  -> muestra el valor ANTERIOR
 *  - Solapa superior animada  -> valor anterior, gira hacia abajo (0° -> -90°)
 *  - Solapa inferior animada  -> valor nuevo, termina de caer (90° -> 0°)
 *
 * Cuando la animación termina, la mitad inferior estática pasa a mostrar
 * el valor nuevo y las solapas desaparecen.
 */
interface Props {
  value: string;
  /** Duración total del volteo en ms (según estilo y velocidad elegidos). */
  durationMs?: number;
}

export default function FlipDigit({ value, durationMs = 620 }: Props) {
  const prevRef = useRef(value);
  const [, rerender] = useState(0);

  const previous = prevRef.current;
  const flipping = previous !== value;

  useEffect(() => {
    if (prevRef.current !== value) {
      const t = window.setTimeout(() => {
        prevRef.current = value;
        rerender((n) => n + 1);
      }, durationMs);
      return () => window.clearTimeout(t);
    }
  }, [value, durationMs]);

  return (
    <div className="flip-card" aria-hidden="true">
      <div className="half top">
        <span>{value}</span>
      </div>
      <div className="half bottom">
        <span>{previous}</span>
      </div>

      {flipping && (
        <div className="flap-stage" key={`${previous}->${value}`}>
          <div className="flap flap-top">
            <span>{previous}</span>
          </div>
          <div className="flap flap-bottom">
            <span>{value}</span>
          </div>
        </div>
      )}

      <div className="hinge" />
    </div>
  );
}
