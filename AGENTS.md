# AGENTS.md

Sitio estático de una obra: una galería de imágenes y, detrás de cada una, un video que se recorre fotograma a fotograma con el scroll.

Sin frameworks, sin bundler, sin dependencias de runtime. HTML, CSS y JavaScript puro.

## Levantar en local

```powershell
npx http-server -a 0.0.0.0 -p 8080 -c-1
```

No usar `python -m http.server`: no soporta peticiones `Range` y el video no se puede seekear. `currentTime` queda clavado en 0.

Para probar en el celular:

1. `ipconfig` y tomar la IPv4 de la PC.
2. Abrir `http://IP:8080` desde el teléfono, en la misma red Wi-Fi.
3. Permitir el acceso en el firewall de Windows.

## Archivos

```text
index.html           galería
mostrarVideo.html    página de video (?p=id)
justPlaces.css       estilos de las dos páginas
textos.js            textos ES/EN y detección de idioma
piezas.js            configuración de las piezas
galeria.js           genera la galería desde PIEZAS
moverVideo.js        carga la pieza y mueve los frames
imagenes/            imágenes de la galería
videos/              videos y audios para la web
```

`.gitignore` deja fuera los originales `videos/*.mp4` (salvo `*-web.mp4`): siguen en disco, pero no viajan al repo.

## Agregar una pieza

1. Copiar la imagen a `imagenes/`.
2. Re-encodear el video a `videos/<id>-web.mp4` y extraer el audio a `videos/<id>-audio.m4a`.
3. Sumar un objeto a `PIEZAS` en `piezas.js`:

```js
{
  id: "nueva",
  imagen: "imagenes/nueva.jpg",
  ancho: 1200,
  alto: 1600,
  video: "videos/nueva-web.mp4",
  audio: "videos/nueva-audio.m4a",
  fps: 30
}
```

4. Listo. `galeria.js` arma el enlace `mostrarVideo.html?p=nueva`.

`ancho` y `alto` son las dimensiones reales de la imagen. Se usan para reservar el espacio y evitar saltos de layout.

## Re-encode

```powershell
ffmpeg -i videos/original.mp4 -map 0:v:0 -an -vf "scale='min(1080,iw)':-2" -r 30 `
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 27 -preset slow `
  -g 5 -keyint_min 5 -sc_threshold 0 -movflags +faststart videos/original-web.mp4
```

```powershell
ffmpeg -i videos/original.mp4 -map 0:a:0 -vn -c:a aac -b:a 128k -movflags +faststart videos/original-audio.m4a
```

Valores que no se negocian:

- **30 fps CFR**: el motor asume frames parejos.
- **GOP 5**: cada 5 frames hay un keyframe, así el seek es rápido.
- **faststart**: `moov` antes de `mdat`, para que el video arranque sin descargar todo.
- **yuv420p, perfil main**: compatibilidad con iOS y Android.
- **Sin audio en el MP4**: el audio va aparte, en `.m4a`.

El CRF se ajusta por pieza según peso y calidad. Referencia: `prueba` quedó en CRF 32 (3,8 MB) y `miau` en CRF 27 (5,47 MB).

Verificar:

```powershell
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate -show_entries format=duration,size -of default=noprint_wrappers=1 videos/<id>-web.mp4
```

## Cómo funciona el movimiento

Toda la lógica está en `moverVideo.js`.

- `totalFrames = round(video.duration * fps)`.
- Frame visible = `(frame + 0.5) / fps`; se busca un solo frame a la vez y si llega otro objetivo mientras busca, se aplica al recibir `seeked`.
- En móvil manda el scroll nativo sobre `.scroll-track`:
  - `PX_PER_FRAME = 10`.
  - Un ciclo mide `max(totalFrames * 10, window.innerHeight)`.
  - El `scroll-space` mide tres ciclos y el scroll arranca en el del medio.
  - Cuando el scroll pasa de 0,5 o 1,5 ciclos se recentra sumando o restando un ciclo; el frame no cambia porque el mapeo es por módulo.
- En desktop la rueda acumula 100 px por frame, máximo 3 frames por evento. Las flechas del teclado mueven un frame por pulsación.
- El audio ambiente vive en `<audio loop>` y no se sincroniza con los frames.

Para que el recorrido sea más o menos sensible, cambiar `PX_PER_FRAME`: más chico = menos scroll por frame.

## Límites conocidos

- No hay texto visible en ninguna página. Los enlaces llevan `aria-label` desde `textos.js`, pero no hay títulos ni mensajes.
- Sin JavaScript la galería queda vacía.
- El video va muteado; el audio arranca con el primer gesto. Si iOS lo bloquea, se activa con el botón de sonido.
- El loop del audio puede tener una micro pausa. Si molesta, habría que pasar a Web Audio.
- Sin canvas, iOS podría mostrar algún overlay nativo sobre el video.
- Algunos navegadores móviles (Chrome en Android con ahorro de datos, Safari en iOS) ignoran `preload="auto"`. Por eso `moverVideo.js` fuerza la descarga con un `play()` muteado y pausa al recibir la metadata. Si aun así no carga, queda un aviso en la consola.
- Los originales `videos/prueba.mp4` y `videos/miau.mp4` no se usan en la web. No hace falta subirlos.

## Publicar

El sitio es estático: se sube la carpeta tal cual, con rutas relativas.

Opciones:

- **GitHub Pages** si el repo es público. Apuntar Pages a la rama `main`, carpeta raíz.
- **Netlify Drop** si se prefiere no tocar el repo: arrastrar la carpeta.

Qué subir: `index.html`, `mostrarVideo.html`, `justPlaces.css`, `textos.js`, `piezas.js`, `galeria.js`, `moverVideo.js`, `imagenes/` y los cuatro archivos `videos/*-web.mp4` / `videos/*-audio.m4a`.

Qué no hace falta subir: `videos/prueba.mp4`, `videos/miau.mp4` (originales, 18,4 MB), `package.json`, `PLAN.md` y `AGENTS.md`.

Ambos hosts sirven `Range`, así que el scrub funciona igual que en local.

## Checklist antes de publicar

- Cada imagen abre su video correcto.
- Rueda: un notch, un frame.
- Teclado: una flecha, un frame.
- Loop en los dos extremos.
- Recarga y deep link con `?p=id`.
- Audio: arranca, se silencia, se reactiva.
- En celular: scroll con el dedo, sin rebote ni zoom accidental.
- Consola sin errores.
