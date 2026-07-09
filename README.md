# Reloj — Temporizador Flip ⏱️

Aplicación móvil (web, mobile-first, instalable como PWA) con diseño **minimalista tipo
flip clock**: cada dígito es una tarjeta dividida en dos mitades y, al cambiar de número,
la hoja superior cae hacia adelante con una animación 3D, igual que los relojes de
tarjetas clásicos.

## Modos

- ⏱️ **Timer** — cuenta atrás con presets (1–60 min) y tiempo personalizado hasta 99:59.
- 🕐 **Reloj** — reloj de mesa con la hora actual (12/24 h); deja el teléfono apoyado y listo.
- ⏰ **Crono** — cronómetro con flip hacia arriba.
- 🍅 **Pomo** — pomodoro con ciclos foco/descanso/descanso largo configurables,
  transición automática de fases con aviso sonoro e indicador de puntos.

## Diseño y animación

- 🂠 **Animación split-flap** con CSS 3D real: la hoja baja, se oscurece al girar y el
  nuevo número termina la caída. Al terminar la cuenta, las tarjetas parpadean en cascada.
- 📱 **Vertical y horizontal**: 2×2 en vertical (minutos arriba, segundos abajo); fila de 4 en horizontal.
- 🎨 **4 temas-material**: Negro, Marfil (día), Terminal (fósforo verde) y Rojo medianoche.
- 🔅 **Anti burn-in**: el reloj se desplaza unos píxeles de vez en cuando para cuidar pantallas OLED.

## Gestos

- **Desliza arriba/abajo** sobre las tarjetas (timer detenido) para ajustar los minutos.
- **Doble tap** para pantalla completa.
- **Mantén presionado** para reiniciar.

## Sonido (WebAudio, sin archivos)

- Alarma de pitidos al terminar y campanadas suaves entre fases pomodoro.
- "Clac" opcional de solapa en cada segundo, con tono que varía en cada golpe.
- **Ambiente mientras corre**: lluvia, ruido marrón o tic-tac mecánico, sintetizados en vivo.
- Vibración al terminar (en móviles compatibles).

## App completa

- 📲 **PWA instalable**: manifest + service worker; funciona sin conexión y se añade a la
  pantalla de inicio a pantalla completa.
- 🔆 **Wake Lock**: mantiene la pantalla encendida mientras corre (o en modo reloj).
- 🔔 **Notificación web** al terminar si la pestaña está en segundo plano.
- 📈 **Estadística mínima**: "Hoy: N sesiones · Xh Ym" (timer y pomodoro), guardada en el navegador.
- ⏲️ Cuentas exactas basadas en marca de tiempo (sin deriva aunque la pestaña pierda foco).
- ♿ Respeta `prefers-reduced-motion`.

## Funciones premium

- 🔔 **Campanada horaria** en modo reloj (el "dong" clásico, sintetizado).
- 🂠 **3 estilos de volteo** (suave, mecánico con rebote, directo) y 3 velocidades.
- 🌙 **Atenuación nocturna automática** (21:00–07:00) para la mesita de noche.
- 🔤 **3 tipografías de dígito** (redonda, mono, serif) y **color de acento personalizado**
  con ajuste automático de contraste.
- 📊 **Panel de insights**: heatmap anual, barras semanales, racha de días, mejor hora,
  desglose por etiqueta y exportación a CSV.
- 🏷️ **Etiquetas de sesión** (Estudio / Trabajo / Lectura / Otro) de un tap.
- 🎯 **Meta diaria** de foco con anillo de progreso alrededor del botón de play.
- 🎚️ **Mezclador de ambiente**: capas de lluvia, ruido marrón y tic-tac con volumen
  independiente y fundido de entrada/salida.
- 🫁 **Respiración guiada** en los descansos del pomodoro (círculo que respira).
- 📤 **Tarjeta compartible**: imagen del resumen del día con estética flip clock
  (Web Share o descarga PNG).
- ⚡ **Lanzadores rápidos por URL**: `?timer=10`, `?timer=12:30&auto=1`,
  `?mode=reloj|timer|crono|pomo` — ideales para atajos del teléfono.

## Stack tecnológico

- [Vite](https://vitejs.dev/) — servidor de desarrollo y build.
- [React 18](https://react.dev/) + TypeScript.
- CSS puro (transformaciones 3D) para la animación, sin librerías extra.

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Abre el navegador en **http://localhost:5173** (el servidor también escucha en la red local,
así que puedes abrirlo desde tu teléfono con la IP de tu computadora, p. ej. `http://192.168.x.x:5173`).

Para probar la vista móvil en escritorio: abre las DevTools (F12) → modo dispositivo (Ctrl+Shift+M)
y rota entre vertical y horizontal.

## Build de producción

```bash
npm run build
npm run preview
```
