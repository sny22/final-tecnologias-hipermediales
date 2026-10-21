# PLAN COMPLETO DE IMPLEMENTACIÓN

Proyecto: A love that didnt work but remains here
Carpeta: final

## DECISIONES CERRADAS

- Sitio estático en HTML, CSS y JavaScript puro. Sin frameworks, sin build, sin canvas.
- La galería muestra imágenes; al hacer clic se abre `mostrarVideo.html?p=id`.
- La página de video ocupa la pantalla y no scrollea.
- El video se recorre fotograma a fotograma con `<video>` y `currentTime`.
- Rueda hacia abajo y flecha hacia abajo avanzan; hacia arriba retroceden.
- Un toque de flecha avanza un frame. Mantener apretada acelera de forma progresiva.
- Las flechas se ven solo en celular/táctil, siempre visibles, abajo a la derecha.
- Al llegar al final, el recorrido vuelve al inicio en loop.
- Audio ambiente en loop, separado del video. El video va muteado.
- Fondo blanco y video con `object-fit: contain`.
- Sin hover decorativo; solo cursor y foco de teclado.
- Interfaz bilingüe español/inglés con detección automática y toggle visible.
- Sin botón volver ni siguiente/anterior por ahora.
- Sin títulos ni descripciones al pie. El título del proyecto se mantiene en el `<title>`.
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
ffmpeg -i videos/prueba.mp4 -map 0:v:0 -an -vf "scale='min(1080,iw)':-2" -r 30 -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 23 -preset slow -g 5 -keyint_min 5 -sc_threshold 0 -movflags +faststart videos/prueba-web.mp4
```

4. Re-encodear `miau.mp4` sin audio:

```powershell
ffmpeg -i videos/miau.mp4 -map 0:v:0 -an -vf "scale='min(1080,iw)':-2" -r 30 -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 23 -preset slow -g 5 -keyint_min 5 -sc_threshold 0 -movflags +faststart videos/miau-web.mp4
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

7. Objetivos de peso: `miau` entre 4 y 8 MB; `prueba` entre 1,5 y 2,5 MB. Si `miau` supera los 8 MB, re-encodear a 720 px de ancho o subir el CRF a 25.

8. Opcional: generar póster del primer frame:

```powershell
ffmpeg -i videos/miau-web.mp4 -frames:v 1 -q:v 2 videos/miau-poster.jpg
```

9. `faststart` mueve el índice del MP4 al inicio. Mejora el arranque y la reproducción progresiva, pero no reduce el peso ni reemplaza al GOP corto.

Criterio de aceptación: los dos videos pesan menos que los originales, están a 30 fps constantes, `miau` se ve vertical, los audios existen y el seek es sensiblemente más rápido.

## FASE 1 — ESTRUCTURA DE ARCHIVOS

```text
index.html
mostrarVideo.html
justPlaces.css
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

Sin `node_modules`, sin bundler, sin dependencias de runtime. FFmpeg es solo una herramienta de preparación.

## FASE 2 — CONFIGURACIÓN DE PIEZAS

Crear `piezas.js`:

```js
const PIEZAS = [
  {
    id: "prueba",
    imagen: "imagenes/imgPrueba.jpg",
    video: "videos/prueba-web.mp4",
    audio: "videos/prueba-audio.m4a",
    fps: 30,
    alt: ""
  },
  {
    id: "calavera",
    imagen: "imagenes/calavera.jpg",
    video: "videos/miau-web.mp4",
    audio: "videos/miau-audio.m4a",
    fps: 30,
    alt: ""
  }
];
```

Reglas:

- El orden del array es el orden de la galería.
- El `id` debe ser único y seguro para URL.
- `fps` queda en 30 porque ambos videos se re-encodean a 30 fps constantes.
- `alt` se usa para accesibilidad. Si queda vacío, el enlace usa `aria-label="View piece"` o `"Ver pieza"` según el idioma.
- Agregar una pieza nueva requiere solo sumar un objeto y los archivos.

Criterio de aceptación: el agente puede agregar una pieza sin tocar el HTML de la galería ni duplicar la página de video.

## FASE 3 — GALERÍA

1. Corregir `index.html`:
   - Eliminar el `</href>` inválido.
   - Dejar un contenedor `<div class="gallery"></div>`.
   - Cargar `piezas.js` y `galeria.js` con `defer`.
   - Agregar `<noscript>` bilingüe.

2. Crear `galeria.js`:
   - Recorrer `PIEZAS`.
   - Crear un `<a>` por pieza con `href="mostrarVideo.html?p=" + encodeURIComponent(id)`.
   - Crear un `<img>` con `src`, `alt`, `loading="lazy"` y `decoding="async"`.
   - Si `alt` está vacío, agregar `aria-label` al enlace.

3. CSS:
   - Grid de 2 columnas en móvil, 3 desde 700 px y 4 desde 1100 px.
   - `gap` y padding.
   - Imágenes con `width: 100%`, `height: auto`, sin recorte.
   - Fondo blanco.
   - Sin hover. Solo `cursor: pointer` y `:focus-visible` con anillo visible.
   - Sin títulos al pie.

Criterio de aceptación: cada imagen abre su video correcto; se puede navegar con teclado; no hay saltos de layout; no hay hover decorativo; funciona con más piezas.

## FASE 4 — PÁGINA DE VIDEO

1. En `mostrarVideo.html`:
   - `<main class="stage">`.
   - `<video id="video" playsinline muted preload="auto"></video>`.
   - `<audio id="audio" loop preload="auto"></audio>`.
   - Botón de sonido, botón de idioma, flechas, estado de carga y estado de error.
   - `<h1 class="sr-only">` con el título del proyecto.
   - Sin botón volver ni siguiente/anterior.

2. CSS:
   - Fondo blanco.
   - `html, body { height: 100%; overflow: hidden; overscroll-behavior: none; }`.
   - `.stage { position: fixed; inset: 0; height: 100dvh; display: grid; place-items: center; touch-action: none; }`.
   - Video `width: 100%; height: 100%; object-fit: contain; background: transparent;`.
   - Sin barras negras: el color de fondo de la página se ve detrás del video.
   - Safe areas con `env(safe-area-inset-*)`.
   - Sin selección de texto, sin callout, sin menú contextual.
   - Flechas ocultas en desktop y visibles en táctil.

3. Flechas:
   - Dos botones HTML, no canvas.
   - 56x56 px.
   - Abajo a la derecha, apiladas.
   - Siempre visibles en móvil, sin desvanecerse.
   - `aria-label` bilingüe.
   - `type="button"`.

Criterio de aceptación: el video se ve completo, sin deformación ni fondo negro; no hay scroll de página; las flechas solo aparecen en móvil.

## FASE 5 — CARGA DE LA PIEZA

En `moverVideo.js`:

1. Leer `new URLSearchParams(location.search).get("p")`.
2. Buscar la pieza en `PIEZAS`.
3. Si no existe, mostrar “Video unavailable” / “Video no disponible”.
4. Asignar `video.src`, `audio.src` y `video.load()`.
5. Esperar `loadedmetadata` para calcular `totalFrames = Math.round(video.duration * fps)`.
6. Habilitar flechas y rueda recién cuando el video esté listo.
7. Mantener el título del proyecto en `document.title`.

Criterio de aceptación: el deep link y la recarga funcionan; un `id` inexistente muestra un error; el audio no se reproduce hasta que corresponda.

## FASE 6 — MOTOR DE FOTOGRAMAS

El núcleo:

```js
const FPS = 30;
let frame = 0;
let totalFrames = 0;
let buscando = false;
let objetivo = 0;

function irAFrame(n) {
  if (!totalFrames) return;
  frame = ((n % totalFrames) + totalFrames) % totalFrames;
  objetivo = (frame + 0.5) / FPS;
  aplicar();
}

function aplicar() {
  if (buscando || !totalFrames) return;
  if (Math.abs(video.currentTime - objetivo) < 0.001) return;
  buscando = true;
  video.currentTime = objetivo;
}

video.addEventListener("seeked", () => {
  buscando = false;
  if (Math.abs(video.currentTime - objetivo) > 0.001) aplicar();
});
```

Reglas:

- Un toque de flecha = un frame.
- Mantener apretada:
  - Espera 250 ms.
  - Empieza a repetir cada ~60 ms.
  - Acelera hasta ~16 ms por paso.
  - Se detiene al soltar, cancelar, salir del botón, perder foco o cambiar de pestaña.
- Un solo hold activo a la vez.
- Si el navegador está buscando un frame, se actualiza el objetivo y se aplica el último al recibir `seeked`. No se encolan seeks.
- Si el input es muy rápido, se saltean frames intermedios. Es esperable.
- Rueda:
  - `preventDefault`.
  - Normalizar `deltaMode`.
  - Acumular aproximadamente 100 px por frame.
  - Máximo 3 frames por evento.
  - Abajo avanza, arriba retrocede.
- Teclado:
  - `keydown` inicia el hold.
  - `keyup` lo detiene.
  - Ignorar `event.repeat` para controlar la aceleración desde el código.
- Loop:
  - Al pasar del último frame, vuelve al 0.
  - Al retroceder desde el 0, va al último.
- Sin canvas.

Criterio de aceptación: un notch o toque avanza exactamente un frame; mantener acelera de forma fluida; soltar detiene; el loop funciona; no hay congelamientos por seeks encolados.

## FASE 7 — UI MÓVIL

- Flechas visibles solo con `(hover: none)` o `(pointer: coarse)`.
- En desktop se ocultan; quedan rueda y teclado.
- `touch-action: none` en el escenario.
- `touch-action: manipulation` en los botones.
- Bloquear zoom por doble toque, selección, callout y menú contextual.
- `pointer capture` para que el hold no se corte si el dedo se mueve un poco.
- Botón de sonido y toggle de idioma arriba a la derecha, con área de toque de 44x44.
- Respetar safe areas.
- Sin animaciones de desvanecimiento en las flechas.

Criterio de aceptación: se puede usar con una mano, sin scroll, zoom ni rebote; las flechas no quedan trabadas; en desktop no aparecen.

## FASE 8 — AUDIO AMBIENTE

- El `<video>` siempre va muteado.
- El audio sale de `<audio loop>` con el `.m4a` extraído.
- El audio no está sincronizado con los frames; es una capa continua.
- Al cambiar de pieza, se cambia el `src` del audio.
- El audio intenta arrancar con la primera interacción: `pointerdown` o `keydown`.
- Si el navegador lo bloquea, el botón de sonido permite iniciarlo.
- El botón de sonido usa `aria-pressed` y cambia entre “Mute sound” / “Play sound” y sus equivalentes en español.
- Si el loop tiene una micro pausa audible, se puede evaluar Web Audio para un loop seamless; no entra en la primera versión.

Criterio de aceptación: el audio se puede activar y silenciar; no se reproduce sin gesto del usuario; el video sigue muteado; el loop funciona en iOS y Android.

## FASE 9 — INTERFAZ BILINGÜE

- Objeto `TEXTOS` con claves en inglés y español.
- Idioma inicial según `navigator.language`.
- Toggle `EN / ES` arriba a la derecha.
- Persistir la elección en `localStorage`.
- Actualizar `document.documentElement.lang`.
- Actualizar textos visibles y etiquetas ARIA.
- El título de la obra queda en inglés.
- Sin títulos ni descripciones visibles.

Textos mínimos:

- Loading / Cargando.
- Video unavailable / Video no disponible.
- Previous frame / Fotograma anterior.
- Next frame / Fotograma siguiente.
- Mute sound / Silenciar.
- Play sound / Activar sonido.
- View piece / Ver pieza.

Criterio de aceptación: el idioma se detecta, se puede cambiar, se mantiene al recargar y las etiquetas ARIA cambian con él.

## FASE 10 — RENDIMIENTO

- Precargar solo el video actual.
- No precargar los videos de la galería.
- Imágenes de galería con `loading="lazy"`.
- Estado de carga visible hasta que el video esté listo.
- No mostrar las flechas como activas antes de `loadedmetadata`.
- `faststart` en todos los MP4.
- Probar `miau` en red móvil real.
- Si el peso o el seek siguen siendo un problema, bajar resolución o CRF antes de agregar canvas.

Criterio de aceptación: el video actual carga en un tiempo razonable; la galería no descarga videos innecesarios; los seeks son usables; no hay errores de consola.

## FASE 11 — QA

Desktop:

- Chrome, Firefox y Safari.
- Rueda y trackpad.
- Flechas de teclado.
- Loop en ambos extremos.
- Deep link y recarga.
- Botón atrás del navegador.
- Audio y cambio de idioma.

iOS Safari real:

- Toque simple.
- Hold y aceleración.
- Soltar y cancelar.
- Sin rebote, zoom ni selección.
- Rotación.
- Safe areas.
- Red lenta.
- Audio bloqueado y luego activado.
- Loop.

Android Chrome real:

- Los mismos casos.

Casos borde:

- `id` inexistente.
- Video faltante.
- Audio faltante o bloqueado.
- Sin JavaScript.
- Offline.
- Consola limpia.

Criterio de aceptación: la checklist pasa completa en desktop y en al menos un iOS y un Android reales.

## FASE 12 — DEPLOY Y DOCUMENTACIÓN

1. Servir en local:

```powershell
npx http-server -a 0.0.0.0 -p 8080 -c-1
```

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
   - Limitaciones conocidas.
   - Checklist de pruebas.

Criterio de aceptación: la URL pública funciona; otro agente puede agregar una pieza sin leer todo el código.

## CRITERIOS DE ACEPTACIÓN GLOBALES

- Cada imagen de la galería abre su video correspondiente.
- El video se recorre frame a frame.
- Un toque o notch avanza un frame.
- Mantener acelera y suelta detiene.
- El loop funciona en ambos extremos.
- Las flechas solo se ven en móvil y nunca generan scroll de página.
- No hay zoom, rebote ni selección accidental.
- El fondo es blanco y el video se ve completo, sin barras negras.
- El audio ambiente se activa y se silencia; no está sincronizado con los frames.
- La interfaz cambia entre español e inglés.
- No hay hover decorativo.
- No hay títulos al pie.
- El proyecto sigue siendo simple: pocos archivos, sin frameworks y sin canvas.
- Funciona en iOS Safari y Android Chrome reales.

## RIESGOS Y LÍMITES CONOCIDOS

- Sin canvas, el `<video>` nativo puede mostrar algún overlay de reproducción en iOS. Si ocurre, se evalúa un fallback con canvas solo para ese caso.
- El hold acelera mediante seeks. Si el dispositivo no llega a 60 seeks por segundo, se saltean frames intermedios; se siente como avance rápido, no como congelamiento.
- El audio ambiente en `<audio loop>` puede tener una micro pausa en el loop. Si se nota, se puede pasar a Web Audio.
- FFmpeg es una herramienta de preparación, no una dependencia del sitio.
- Abrir el proyecto con `file://` no es confiable; usar servidor local.
- OneDrive puede bloquear archivos durante la edición; si pasa, probar desde una copia local.
- Sin re-encode no se garantiza fluidez; por eso el re-encode es parte del plan.
