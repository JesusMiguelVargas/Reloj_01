# Reloj — Temporizador Flip ⏱️

Aplicación móvil (web, mobile-first) de temporizador con diseño **minimalista tipo flip clock**:
cada dígito es una tarjeta dividida en dos mitades y, al cambiar de número, la hoja superior
cae hacia adelante con una animación 3D, igual que los relojes de tarjetas clásicos.

## Características

- 🂠 **Animación de volteo (split-flap)** con CSS 3D real: la hoja baja, se oscurece al girar y el nuevo número termina la caída.
- 📱 **Vertical y horizontal**: en vertical los dígitos se ordenan en 2×2 (minutos arriba, segundos abajo); en horizontal en una fila de 4.
- ▶️ Botón de iniciar/pausar tipo píldora.
- ✕ Botón para reiniciar el temporizador.
- 🕐 Selector de duración con presets (1, 3, 5, 10, 15, 25, 45, 60 min) y tiempo personalizado hasta 99:59.
- 🔊 Alarma al terminar (WebAudio, sin archivos), sonido opcional de solapa en cada segundo y vibración (en móviles compatibles).
- 🌙 Tema oscuro puro, pensado para dejar el teléfono como reloj de mesa.
- ⏲️ Cuenta atrás sin deriva (basada en marca de tiempo, exacta aunque la pestaña pierda foco).

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
