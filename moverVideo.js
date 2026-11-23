// Recorre la pieza de la URL (?p=id) frame a frame: scroll en móvil, rueda y flechas en desktop.

const PX_PER_FRAME = 10; // px de scroll por frame
const PASO_RUEDA = 100;  // px de rueda por frame

const video = document.getElementById("video");
const audio = document.getElementById("audio");
const track = document.getElementById("scrollTrack");
const space = document.getElementById("scrollSpace");
const boton = document.getElementById("sound");

const pieza = PIEZAS.find(p => p.id === new URLSearchParams(location.search).get("p"));

let fps = 30, totalFrames = 0, ciclo = 0, frame = 0, objetivo = 0;
let buscando = false, listo = false, acumulado = 0, sonando = false;

video.muted = true;

if (pieza) {
  fps = pieza.fps || 30;
  video.src = pieza.video;
  audio.src = pieza.audio;
  video.addEventListener("loadedmetadata", alCargar);
  setTimeout(destrabar, 900); // algunos móviles ignoran preload="auto"
}

// Forzar la descarga: un play() muteado está permitido y arranca la carga.
function destrabar() {
  if (!totalFrames) video.play().then(() => video.pause()).catch(() => {});
}

function alCargar() {
  totalFrames = Math.round(video.duration * fps);
  if (!totalFrames) return;

  video.pause();
  ciclo = Math.max(totalFrames * PX_PER_FRAME, innerHeight); // nunca menos que la pantalla
  space.style.height = ciclo * 3 + "px";
  track.scrollTop = ciclo; // arranca en el ciclo del medio

  listo = true;
  irAFrame(0);
}

// Un seek a la vez: si llegan más pedidos mientras busca, gana el último.
function irAFrame(n) {
  if (!totalFrames) return;

  frame = ((n % totalFrames) + totalFrames) % totalFrames; // loop en los dos sentidos
  objetivo = (frame + 0.5) / fps;                          // centro del frame

  if (buscando || Math.abs(video.currentTime - objetivo) < 0.001) return;

  buscando = true;
  video.currentTime = objetivo;
}

video.addEventListener("seeked", () => {
  buscando = false;
  irAFrame(frame);
});

// Scroll del celular: tres ciclos; el salto se hace lejos de los bordes.
function alScrollear() {
  if (!listo) return;

  const y = track.scrollTop;

  if (y < ciclo / 2 || y > ciclo * 1.5) {
    track.scrollTop = y < ciclo / 2 ? y + ciclo : y - ciclo; // mismo frame, otro ciclo
    return;
  }

  const local = ((y % ciclo) + ciclo) % ciclo;
  irAFrame(Math.min(totalFrames - 1, Math.floor((local / ciclo) * totalFrames)));
}

track.addEventListener("scroll", alScrollear, { passive: true });

// Rueda: un notch = un frame. La capa de scroll solo se muestra en pantallas táctiles.
window.addEventListener("wheel", event => {
  if (!listo || getComputedStyle(track).display !== "none") return;

  event.preventDefault();

  acumulado += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);

  const pasos = Math.trunc(acumulado / PASO_RUEDA);
  if (!pasos) return;

  acumulado -= pasos * PASO_RUEDA;
  irAFrame(frame + Math.max(-3, Math.min(3, pasos))); // tope de 3 frames por gesto
}, { passive: false });

// Una flecha = un frame.
window.addEventListener("keydown", event => {
  if (!listo || event.repeat) return;

  const paso = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
  if (!paso) return;

  event.preventDefault();
  irAFrame(frame + paso);
});

// Audio ambiente en loop, independiente de los frames.
function pintarBoton() {
  boton.setAttribute("aria-pressed", sonando ? "true" : "false");
  boton.setAttribute("aria-label", sonando ? "Mute sound" : "Play sound");
}

function encender() {
  if (sonando || !audio.src) return;
  audio.play().then(() => {
    sonando = true;
    pintarBoton();
  }).catch(() => {});
}

// Un gesto fuera del botón habilita el audio y, si hacía falta, la descarga.
function primerGesto(event) {
  if (event.target.closest && event.target.closest(".sound")) return;
  destrabar();
  encender();
}

window.addEventListener("pointerdown", primerGesto);
window.addEventListener("keydown", primerGesto);

boton.addEventListener("click", () => {
  destrabar();

  if (sonando) {
    audio.pause();
    sonando = false;
    pintarBoton();
  } else {
    encender();
  }
});
