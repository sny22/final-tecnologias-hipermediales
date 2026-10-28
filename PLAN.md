# PLAN COMPLETO DE IMPLEMENTACIÓN

Proyecto: A love that didnt work but remains here
Carpeta: final

## DECISIONES CERRADAS

- Sitio estático en HTML, CSS y JavaScript puro. Sin frameworks, sin build, sin canvas.
- La galería muestra imágenes; al hacer clic se abre `mostrarVideo.html?p=id`.
- El video queda fijo en pantalla. En celular se recorre con el scroll nativo del teléfono; el `body` no scrollea.
- En desktop se usa la rueda del mouse y el teclado. No hay flechas visibles.
- El video se recorre fotograma a fotograma con `<video>` y `currentTime`.
- En móvil, el gesto de scroll normal avanza o retrocede frames. Sin flechas y sin botones de hold.
- En desktop, la rueda hacia abajo avanza y hacia arriba retrocede. Un notch equivale a un frame.
- Al llegar al final, el recorrido vuelve al inicio en loop.
- Audio ambiente en loop, separado del video. El video va muteado.
- Fondo blanco y video con `object-fit: contain`.
- Sin hover decorativo; solo cursor y foco de teclado.
- Sin texto visible en las páginas: ni títulos, ni descripciones, ni mensajes de carga o error. El título del proyecto vive solo en el `<title>` del documento.
- `textos.js` guarda los textos español/inglés y el idioma, pero solo alimenta etiquetas ARIA. No hay toggle visible por ahora.
- Sin `alt` en las imágenes; el `aria-label` del enlace sale de `textos.js`.
- Sin botón volver ni siguiente/anterior por ahora.
- Re-encode de los videos con FFmpeg.
- Mapping confirmado: `imgPrueba.jpg → prueba.mp4`, `calavera.jpg → miau.mp4`.

## FASE 0 — RE-ENCODE DE ASSETS

1. Instalar FFmpeg:

```powershell
winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
ffmpeg -version
```

2. Conservar los originales. No sobrescribir. Crear archivos nuevos `-web.mp4` y `-audio.m4a`.

3. Re-encodear `prueba.mp4` sin audio:

```powershell
ffmpeg -i videos/prueba.mp4 -map 0:v:0 -an -vf "scale='min(1080,iw)':-2" -r 30 -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 32 -preset slow -g 5 -keyint_min 5 -sc_threshold 0 -movflags +faststart videos/prueba-web.mp4
```

4. Re-encodear `miau.mp4` sin audio:

```powershell
ffmpeg -i videos/miau.mp4 -map 0:v:0 -an -vf "scale='min(1080,iw)':-2" -r 30 -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 27 -preset slow -g 5 -keyint_min 5 -sc_threshold 0 -movflags +faststart videos/miau-web.mp4
```

5. Extraer el audio:

```powershell
ffmpeg -i videos/prueba.mp4 -map 0:a:0 -vn -c:a aac -b:a 128k -movflags +faststart videos/prueba-audio.m4a
```

```powershell
ffmpeg -i videos/miau.mp4 -map 0:a:0 -vn -c:a aac -b:a 128k -movflags +faststart videos/miau-audio.m4a
```

6. Verificar resolución, orientación, fps, duración y peso:

```powershell
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,avg_frame_rate -show_entries format=duration,size,bit_rate -of default=noprint_wrappers=1 videos/miau-web.mp4
```

`miau` debe quedar vertical, aproximadamente 1080x2336. Si FFmpeg no aplicó la rotación, corregir con `transpose` antes de escalar.

7. Resultados obtenidos (parámetros reales y peso final):

| Archivo | CRF | Resolución | Frames | Peso | Bitrate |
| --- | --- | --- | --- | --- | --- |
| `prueba-web.mp4` | 32 | 848x478 | 475 (15,83 s) | 3,80 MB | 1,92 Mbps |
| `miau-web.mp4` | 27 | 1080x2336 | 214 (7,13 s) | 5,47 MB | 6,13 Mbps |
| `prueba-audio.m4a` | — | AAC 48 kHz estéreo | — | 258 KB | 131 kbps |
| `miau-audio.m4a` | — | AAC 48 kHz estéreo | — | 117 KB | 131 kbps |

Notas sobre el peso:

- `prueba.mp4` original pesaba 3,58 MB, así que `prueba-web.mp4` queda 0,22 MB por encima. Se priorizó la calidad visual en un video de 16 s. Si se necesita bajar el peso: CRF 30 daba 4,85 MB, CRF 32 da 3,80 MB. Para bajar de 3,5 MB habría que subir a CRF 34 o reducir resolución, con pérdida visible.
- `miau.mp4` original pesaba 14,84 MB (HEVC 2336x1080); `miau-web.mp4` queda en 5,47 MB, un 63 % menos, y ya no depende de metadata de rotación.
- El objetivo original de `prueba` entre 1,5 y 2,5 MB no es alcanzable sin degradar demasiado la imagen; se reemplaza por el criterio de la sección siguiente.

8. Opcional: generar póster del primer frame:

```powershell
ffmpeg -i videos/miau-web.mp4 -frames:v 1 -q:v 2 videos/miau-poster.jpg
```

9. `faststart` mueve el índice del MP4 al inicio. Mejora el arranque y la reproducción progresiva, pero no reduce el peso ni reemplaza al GOP corto.

Criterio de aceptación: ambos videos están a 30 fps constantes, `miau` se ve vertical sin depender de metadata, los audios existen, el GOP es de 5 frames, `moov` está antes de `mdat` y el seek es sensiblemente más rápido. `prueba` puede pesar levemente más que el original; el criterio de peso aplica a que el conjunto total baje, y baja: 18,4 MB de originales contra 9,3 MB de assets web.

## FASE 1 — ESTRUCTURA DE ARCHIVOS

```text
index.html
mostrarVideo.html
justPlaces.css
textos.js
piezas.js
galeria.js
moverVideo.js
imagenes/
  imgPrueba.jpg
  calavera.jpg
videos/
  prueba-web.mp4
  prueba-audio.m4a
  miau-web.mp4
  miau-audio.m4a
  originales/        (opcional, para conservar los originales)
AGENTS.md            (opcional)
```

`textos.js` concentra el idioma y los textos para que la galería y la página de video no tengan lógica duplicada. No agrega texto visible: solo alimenta etiquetas ARIA y, si se agrega, el toggle de idioma.

Sin `node_modules`, sin bundler, sin dependencias de runtime. FFmpeg es solo una herramienta de preparación.

## FASE 2 — CONFIGURACIÓN DE PIEZAS

Crear `piezas.js`:

```js
const PIEZAS = [
  {
    id: "prueba",
    imagen: "imagenes/imgPrueba.jpg",
    ancho: 1848,
    alto: 1927,
    video: "videos/prueba-web.mp4",
    audio: "videos/prueba-audio.m4a",
    fps: 30
  },
  {
    id: "calavera",
    imagen: "imagenes/calavera.jpg",
    ancho: 787,
    alto: 1140,
    video: "videos/miau-web.mp4",
    audio: "videos/miau-audio.m4a",
    fps: 30
  }
];
```

Reglas:

- El orden del array es el orden de la galería.
- El `id` debe ser único y seguro para URL.
- `fps` queda en 30 porque ambos videos se re-encodean a 30 fps constantes.
- `ancho` y `alto` son las dimensiones reales de la imagen. Se aplican como atributos `width` y `height` para que el navegador reserve el espacio y no haya saltos de layout con `loading="lazy"`.
- La imagen no lleva `alt`; el enlace toma su `aria-label` de `t("verPieza")` en `textos.js`, así que no hay texto visible pero el enlace tiene nombre accesible.
- Agregar una pieza nueva requiere solo sumar un objeto y los archivos.

Criterio de aceptación: el agente puede agregar una pieza sin tocar el HTML de la galería ni duplicar la página de video.

## FASE 3 — GALERÍA

1. Corregir `index.html`:
   - Eliminar el `</href>` inválido.
   - Dejar un contenedor `<main class="gallery"></main>`.
   - Cargar `piezas.js` y `galeria.js` con `defer`.
   - Sin `<noscript>`: no hay texto que mostrar.

2. Crear `galeria.js`:
   - Recorrer `PIEZAS`.
   - Crear un `<a>` por pieza con `href="mostrarVideo.html?p=" + encodeURIComponent(id)`.
   - Crear un `<img>` con `src`, `alt=""`, `loading="lazy"` y `decoding="async"`.
   - Agregar `aria-label` con `t("verPieza")`. Es lo único textual y no se ve.

3. CSS:
   - Grid de 2 columnas en móvil, 3 desde 700 px y 4 desde 1100 px.
   - `gap` y padding.
   - Imágenes con `width: 100%`, `height: auto`, sin recorte.
   - Fondo blanco.
   - Sin hover. Solo `cursor: pointer` y `:focus-visible` con anillo visible.
   - Sin títulos al pie ni texto de ningún tipo.

Criterio de aceptación: cada imagen abre su video correcto; se puede navegar con teclado; no hay saltos de layout; no hay hover decorativo; funciona con más piezas.

## FASE 4 — PÁGINA DE VIDEO

La página tiene tres capas:

1. El video fijo que se ve.
2. Una superficie de scroll transparente que recibe el gesto en móvil.
3. El control de sonido por encima, como icono.

HTML base:

```html
<main class="stage">
  <video id="video" playsinline muted preload="auto"></video>

  <div class="scroll-track" id="scrollTrack">
    <div class="scroll-space" id="scrollSpace"></div>
  </div>

  <button class="sound" id="sound" type="button" aria-pressed="false" data-etiqueta="activarSonido">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path class="parlante" d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"></path>
      <path class="ondas" d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"></path>
      <path class="tachado" d="M4.5 19.5 19.5 4.5"></path>
    </svg>
  </button>
</main>

<audio id="audio" loop preload="auto"></audio>
```

El `<html>` de esta página lleva `class="escena"`. Así las reglas de scroll bloqueado no afectan a la galería, que comparte el mismo CSS.

Sin `<h1>`, sin textos de carga, sin mensajes de error y sin botón de idioma. El título del proyecto queda solo en el `<title>` del documento.

CSS principal:

- Fondo blanco.
- `html.escena, html.escena body { height: 100%; overflow: hidden; overscroll-behavior: none; }`.
- `.stage { position: fixed; inset: 0; height: 100dvh; display: grid; place-items: center; }`.
- El video ocupa todo y usa `object-fit: contain`, `background: transparent`.
- El `scroll-track` también es `position: fixed; inset: 0; overflow-y: auto;` y queda por encima del video, pero es transparente.
- El `scroll-track` solo se muestra en dispositivos táctiles: `(hover: none)` o `(pointer: coarse)`.
- En desktop se oculta; la rueda y el teclado manejan los frames.
- Ocultar la barra de scroll con `scrollbar-width: none` y `::-webkit-scrollbar { display: none; }`.
- `overscroll-behavior: none`, `overflow-anchor: none`, `scroll-behavior: auto`, `-webkit-overflow-scrolling: touch`.
- `touch-action: pan-y pinch-zoom` en el scroll; no `none`. Permite scroll vertical y pinch zoom, pero evita el doble toque accidental.
- `user-select: none`, `-webkit-touch-callout: none`.
- El video va con `pointer-events: none`; el `scroll-track` recibe el gesto; el botón de sonido va por encima con `z-index` superior, 44x44 px y safe areas.
- El botón de sonido es un SVG de 24 px: parlante con ondas cuando hay sonido, parlante tachado cuando está muteado.
- Sin flechas.
- Sin barras negras: el fondo blanco se ve detrás del video.
- Safe areas con `env(safe-area-inset-*)`.

Criterio de aceptación: el video se ve completo, fijo y sin deformación; el gesto de scroll del celular recorre frames; no hay flechas; no hay fondo negro; no hay rebote de página; no aparece texto.

## FASE 5 — CARGA DE LA PIEZA

En `moverVideo.js`:

1. Leer `new URLSearchParams(location.search).get("p")`.
2. Buscar la pieza en `PIEZAS`.
3. Si no existe, no cargar nada: la página queda en blanco y se avisa por `console.warn`.
4. Asignar `video.src`, `audio.src`, escuchar `loadedmetadata` y recién ahí llamar a `video.load()` y `audio.load()`.
5. En `loadedmetadata`, calcular `totalFrames = Math.round(video.duration * fps)`. Con `prueba` da 475 y con `calavera` 214.
6. Preparar la superficie de scroll:
   - Calcular `cycleHeight = Math.max(totalFrames * PX_PER_FRAME, window.innerHeight)`. El mínimo de una pantalla evita que un video muy corto deje el recorrido sin margen de scroll.
   - Asignar al `scroll-space` una altura de `cycleHeight * 3`.
   - Colocar `scrollTrack.scrollTop = cycleHeight`, para arrancar en la copia del medio.
7. Recién ahí marcar `listo = true` y llamar a `irAFrame(0)`, que hace el primer seek al centro del frame 0.
8. Mantener el título del proyecto en `document.title`.

El servidor local **tiene que soportar peticiones Range**. `python -m http.server` no las soporta y el video no se puede seekear: `currentTime` queda clavado en 0. `npx http-server` sí las soporta y es el que usa el plan.

Criterio de aceptación: el deep link y la recarga funcionan; un `id` inexistente deja la página en blanco, sin ningún texto; el scroll arranca en el frame 0; el audio no se reproduce hasta que corresponda.

## FASE 6 — MOTOR DE FOTOGRAMAS Y SCROLL

El núcleo del frame no cambia:

```js
let fps = 30;
let frame = 0;
let totalFrames = 0;
let buscando = false;
let objetivo = 0;

function irAFrame(n) {
  if (!totalFrames) return;
  frame = ((n % totalFrames) + totalFrames) % totalFrames;
  objetivo = (frame + 0.5) / fps;
  aplicar();
}

function aplicar() {
  if (buscando || !totalFrames) return;
  if (Math.abs(video.currentTime - objetivo) < 0.001) return;
  buscando = true;
  video.currentTime = objetivo;
}

video.addEventListener("seeked", function () {
  buscando = false;
  if (Math.abs(video.currentTime - objetivo) > 0.001) aplicar();
});
```

`fps` sale de `pieza.fps`, no de una constante fija, para que una pieza pueda usar otra cadencia sin tocar el motor.

### Scroll nativo en móvil

- Constante inicial: `PX_PER_FRAME = 10`.
- La altura de un ciclo es `max(totalFrames * PX_PER_FRAME, window.innerHeight)`.
- El `scroll-space` mide tres ciclos.
- Se arranca en `cycleHeight`, en la copia del medio.
- En cada evento `scroll`:

```js
const y = scrollTrack.scrollTop;

if (y < cycleHeight / 2) {
  scrollTrack.scrollTop = y + cycleHeight;
  return;
}

if (y > cycleHeight * 1.5) {
  scrollTrack.scrollTop = y - cycleHeight;
  return;
}

const local = ((y % cycleHeight) + cycleHeight) % cycleHeight;
const siguienteFrame = Math.min(
  totalFrames - 1,
  Math.floor((local / cycleHeight) * totalFrames)
);

irAFrame(siguienteFrame);
```

- El salto de posición ocurre en una zona invisible; como el mapeo es por módulo, el frame visible no cambia.
- Eso permite loop infinito hacia arriba y hacia abajo sin que se note el reinicio.
- `PX_PER_FRAME` se puede ajustar después de probar: más chico = más sensible; más grande = más recorrido por frame.
- No hay flechas, no hay hold y no hay `preventDefault` en touch.

### Rueda y teclado en desktop

- En desktop, el `scroll-track` está oculto. Si está visible, la rueda no se intercepta: deja que el scroll nativo haga el mapeo.
- La rueda escucha en `window` con `{ passive: false }`.
- Se normaliza `deltaMode` (línea ×16, página ×alto de ventana).
- Se acumulan 100 px por paso; el resto queda para el evento siguiente.
- Un notch = un frame; máximo 3 frames por evento.
- Abajo avanza, arriba retrocede.
- Las teclas `ArrowDown` y `ArrowRight` avanzan; `ArrowUp` y `ArrowLeft` retroceden.
- Ignorar `event.repeat` para que una pulsación sea un frame.
- No hay hold en desktop.

### Loop

- En móvil, el loop sale de las tres copias del scroll.
- En desktop, el loop sale del módulo de `irAFrame`.
- Al pasar del último frame, vuelve al 0.
- Al retroceder desde el 0, va al último.

Criterio de aceptación: el scroll del celular avanza y retrocede frames de forma continua; el loop no produce saltos visibles; la rueda de desktop avanza un frame por notch; no se encolan seeks; no hay flechas.

## FASE 7 — UI MÓVIL

Implementado en `justPlaces.css`, dentro del bloque `escena`:

- Sin flechas y sin botones de hold.
- El gesto es el scroll vertical normal del teléfono.
- El `scroll-track` es transparente, cubre la pantalla y el video queda detrás.
- El scroll no arrastra la página: `html.escena` y `body` van con `overflow: hidden` y `overscroll-behavior: none`.
- `.stage` usa `height: 100vh` como respaldo y `100dvh` cuando el navegador lo soporta.
- `touch-action: pan-y pinch-zoom` en el track: permite scroll vertical y pinch zoom, y desactiva el doble toque.
- `overscroll-behavior: none` para evitar pull-to-refresh y rebote.
- `-webkit-overflow-scrolling: touch` para momentum en iOS.
- `overflow-anchor: none` y `scroll-behavior: auto` para evitar saltos por anclaje y scroll suave.
- `user-select: none`, `-webkit-touch-callout: none` y `-webkit-tap-highlight-color: transparent`.
- No se bloquea el zoom del navegador desde el viewport; no hay `maximum-scale=1`.
- Botón de sonido arriba a la derecha, 44x44 px, con `touch-action: manipulation` y safe areas.
- Sin texto en el botón: solo el icono, con `aria-label` desde `textos.js`.

Criterio de aceptación: se puede recorrer con el pulgar usando el scroll normal; no hay flechas; no hay scroll de página visible; no hay rebote, doble toque accidental ni selección; el botón de sonido sigue siendo tocable.

## FASE 8 — AUDIO AMBIENTE

Implementado en `moverVideo.js`:

- El `<video>` va muteado desde el HTML y además con `video.muted = true` por las dudas.
- El audio sale de `<audio loop>` con el `.m4a` extraído. El loop lo resuelve el propio elemento.
- El audio no está sincronizado con los frames: ningún seek lo toca, así que suena continuo mientras el video salta de fotograma.
- Al cambiar de pieza se cambia el `src` del audio, junto con el del video.
- El audio arranca con el primer `pointerdown` o `keydown` en la página. Si el gesto es sobre el botón de sonido, no se dispara: decide el botón.
- Si el navegador bloquea el `play()`, la promesa se ignora y queda el botón para activarlo. Los listeners de gesto no se quitan hasta que el audio arranca de verdad.
- El botón alterna entre `pause()` y `play()`. No usa `muted`: pausar libera el decodificador y al reactivar retoma donde estaba.
- `aria-pressed` refleja el estado y el `aria-label` sale de `t("activarSonido")` / `t("silenciar")`; se actualiza con `data-etiqueta` + `aplicarTextos()`, así también cambia si cambia el idioma.
- Si el loop tiene una micro pausa audible, se puede evaluar Web Audio para un loop seamless; no entra en la primera versión.

Criterio de aceptación: el audio se puede activar y silenciar; no se reproduce sin gesto del usuario; el video sigue muteado; el loop funciona en iOS y Android.

## FASE 9 — TEXTOS E IDIOMA

- `textos.js` concentra el diccionario español/inglés (`verPieza`, `cargando`, `noDisponible`, `activarSonido`, `silenciar`, `recorrer`, `idioma`) y la detección de idioma. Lo cargan la galería y la página de video.
- Idioma inicial según `navigator.language`, con la elección guardada en `localStorage` (clave `idioma`).
- `textos.js` actualiza `document.documentElement.lang`.
- La galería usa `t("verPieza")` para el `aria-label` del enlace, pero **no muestra texto visible**.
- La página de video usa `t()` para el `aria-label` del botón de sonido.
- No hay toggle `EN / ES` por ahora: la interfaz visible sigue sin palabras. `fijarIdioma()` ya está listo si se agrega.
- Ninguna página muestra texto: no hay "Cargando" ni "Video no disponible". Si el video no carga, la página queda en blanco y el problema se ve en la consola.
- El único texto del proyecto es el `<title>` del documento, que no aparece en la página.

Criterio de aceptación: ninguna de las dos páginas muestra texto visible; los `aria-label` responden al idioma guardado o al del navegador; el idioma se respeta al recargar; el único texto del documento es el `<title>`.

## FASE 10 — RENDIMIENTO

- Precargar solo el video actual.
- No precargar los videos de la galería.
- Imágenes de galería con `loading="lazy"`.
- Sin estado de carga textual: el video aparece cuando está listo y mientras tanto la página queda blanca.
- No habilitar el scroll hasta tener `totalFrames`.
- `faststart` en todos los MP4.
- Probar `miau` en red móvil real.
- Si el peso o el seek siguen siendo un problema, bajar resolución o CRF antes de agregar canvas.

### Medido en Chromium sobre `http://127.0.0.1:8082`

Galería:

- Pide documento, CSS y 3 JS. Ningún video.
- Con `loading="lazy"`, las imágenes no se piden hasta que la pestaña se hace visible. Al mostrarse, solo las dos de la vista.
- Ambas imágenes cargan completas y con `naturalWidth` correcto.

Página de video (`calavera`):

- Pide documento, CSS, 3 JS, `miau-web.mp4` y `miau-audio.m4a`. Ningún otro video.
- El video se descarga completo por `preload="auto"`: 5.340 KB de 5.468 KB. Es el precio de tener el archivo listo para scrub.
- El audio pesa 115 KB.
- Latencia de seek medida en 10 frames salteados: mínimo 3,2 ms, promedio 6,0 ms, máximo 11,4 ms.

Lectura: el seek va bien. El punto flojo es el peso de `miau` en red móvil: 5,3 MB antes de que el scrub sea fluido. Si molesta, el camino es re-encodear a 720 px de ancho o subir el CRF, no tocar el motor.

Criterio de aceptación: el video actual carga en un tiempo razonable; la galería no descarga videos innecesarios; el scroll responde; no hay errores de consola.

## FASE 11 — QA

### Ejecutado y pasado (Chromium de escritorio)

- Rueda: 100 px = 1 frame; 6 eventos = 6 frames; máximo 3 por evento.
- Trackpad: la acumulación de deltas chicos funciona con el mismo umbral.
- Teclado: una pulsación = un frame; `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`.
- Loop en los dos extremos: 0 → 474 con `ArrowUp`, 474 → 0 con `ArrowDown`.
- Ráfaga de 20 teclas: termina en frame 20, sin desincronización entre `frame` y `currentTime`.
- Scroll móvil simulado: mapeo correcto a 500 px (frame 50), recentrado en los dos bordes sin cambiar de frame, página que no scrollea.
- Deep link, recarga, atrás y adelante del navegador.
- `id` inexistente: página en blanco y aviso por consola.
- Audio: arranca con el primer gesto, se silencia y se reactiva; no se sincroniza con los frames.
- Cambio de idioma: `aria-label` de galería y botón de sonido en ES y EN.
- Lighthouse: accesibilidad 1.0 y buenas prácticas 1.0 en las dos páginas. SEO 0.8/0.75, solo por falta de `meta description`, que es deliberado.
- Consola limpia en ambas páginas.

### Pendiente en dispositivo real

iOS Safari:

- Scroll vertical con el dedo, momentum y frenado.
- Loop sin salto visible al cambiar de copia.
- Sin rebote, doble toque ni selección.
- Rotación y safe areas.
- Audio bloqueado y luego activado.
- Red lenta: cuánto tarda `miau` en quedar scrubeable.

Android Chrome: los mismos casos.

### No verificable en este entorno

- Firefox y Safari de escritorio.
- Sin JavaScript: la galería queda vacía, es el comportamiento esperado.
- Offline.
- Video o audio faltante: el `<video>` queda en blanco, sin mensaje, por diseño.
- Scroll antes de que el video esté listo: las entradas se ignoran hasta `loadedmetadata`.

Criterio de aceptación: la checklist pasa completa en desktop y en al menos un iOS y un Android reales.

## FASE 12 — DEPLOY Y DOCUMENTACIÓN

1. Servir en local:

```powershell
npx http-server -a 0.0.0.0 -p 8080 -c-1
```

No usar `python -m http.server`: no soporta `Range` y el video no se puede seekear.

2. Para probar en el celular:
   - Ejecutar `ipconfig`.
   - Usar la IPv4 de la PC.
   - Abrir `http://IP:8080` en el celular, en la misma red Wi-Fi.
   - Permitir el acceso en el firewall de Windows.

3. Publicar:
   - GitHub Pages si el repo es público.
   - Netlify Drop si es privado.
   - Mantener rutas relativas.

4. Crear `AGENTS.md` con:
   - Cómo levantar el servidor.
   - Cómo agregar una pieza.
   - Comandos de re-encode.
   - Valores de fps, GOP y faststart.
   - Cómo funciona el scroll de tres ciclos y `PX_PER_FRAME`.
   - Limitaciones conocidas.
   - Checklist de pruebas.

### Estado de la fase

- Documentación: `AGENTS.md` creado, con servidor, alta de piezas, re-encode, movimiento, límites y checklist.
- Servidor local levantado en `0.0.0.0:8080` y probado desde la IP LAN `192.168.0.4:8080`: galería, deep link, 100 frames de scrub y consola limpia.
- `Range` verificado por red: `curl -H "Range: bytes=0-1023"` devuelve `206 Partial Content` y `Accept-Ranges: bytes`.
- Publicación: decidida como pendiente. El repo `sny22/final-tecnologias-hipermediales` es público, rama `main`, y GitHub Pages no está activado. Todo el trabajo está sin commitear.
- Originales: se sacaron del índice con `git rm --cached` y quedaron ignorados por `.gitignore` (`videos/*.mp4` salvo `*-web.mp4`). Siguen en disco (18,4 MB) y el repo deja de cargarlos. La eliminación está staged, sin commitear.

Criterio de aceptación: la URL pública funciona; otro agente puede agregar una pieza sin leer todo el código.

## CRITERIOS DE ACEPTACIÓN GLOBALES

- Cada imagen de la galería abre su video correspondiente.
- El video se recorre frame a frame.
- En móvil, el scroll normal del teléfono avanza y retrocede frames.
- En desktop, un notch de rueda o una tecla avanza un frame.
- No hay flechas visibles.
- El loop funciona en ambos extremos sin saltos visuales.
- El video queda fijo y no se deforma.
- El fondo es blanco y no hay barras negras.
- El audio ambiente se activa y se silencia; no está sincronizado con los frames.
- No hay hover decorativo.
- No aparece ningún texto visible en ninguna página.
- El proyecto sigue siendo simple: pocos archivos, sin frameworks y sin canvas.
- Funciona en iOS Safari y Android Chrome reales.

## RIESGOS Y LÍMITES CONOCIDOS

- El loop móvil usa tres copias del recorrido. El salto de `scrollTop` es invisible porque el mapeo es por módulo, pero hay que probarlo en iOS con momentum.
- El scroll nativo puede tener inercia y saltear frames; el motor aplica el último frame objetivo y no encola seeks.
- Sin canvas, el `<video>` nativo puede mostrar algún overlay de reproducción en iOS. Si ocurre, se evalúa un fallback con canvas solo para ese caso.
- Al no haber texto, el nombre accesible de los enlaces y del botón de sonido depende solo del `aria-label` de `textos.js`. No hay aviso visible si JavaScript está desactivado: la galería queda vacía. Es una decisión explícita del proyecto.
- El audio ambiente en `<audio loop>` puede tener una micro pausa en el loop. Si se nota, se puede pasar a Web Audio.
- FFmpeg es una herramienta de preparación, no una dependencia del sitio.
- Abrir el proyecto con `file://` no es confiable; usar servidor local.
- OneDrive puede bloquear archivos durante la edición; si pasa, probar desde una copia local.
- Sin re-encode no se garantiza fluidez; por eso el re-encode es parte del plan.
