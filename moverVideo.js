// Carga la pieza indicada en la URL (?p=id) y mueve el video fotograma a fotograma.
// En móvil manda el scroll nativo; en desktop, la rueda y las flechas del teclado.

const PX_PER_FRAME = 10;
const PASO_RUEDA = 100;
const MAX_PASOS_RUEDA = 3;

const video = document.getElementById("video");
const audio = document.getElementById("audio");
const scrollTrack = document.getElementById("scrollTrack");
const scrollSpace = document.getElementById("scrollSpace");
const botonSonido = document.getElementById("sound");

let fps = 30;
let totalFrames = 0;
let cycleHeight = 0;
let frame = 0;
let objetivo = 0;
let buscando = false;
let listo = false;
let acumuladoRueda = 0;
let sonidoActivo = false;

video.muted = true;
aplicarTextos();
actualizarBotonSonido();

const parametro = new URLSearchParams(location.search).get("p");
const pieza = PIEZAS.find(function (item) {
  return item.id === parametro;
});

if (!pieza) {
  console.warn("Pieza no encontrada:", parametro);
} else {
  fps = pieza.fps || 30;
  video.src = pieza.video;
  audio.src = pieza.audio;
  video.addEventListener("loadedmetadata", alCargarMetadata);
  video.load();
  audio.load();
}

function alCargarMetadata() {
  totalFrames = Math.round(video.duration * fps);
  if (!totalFrames) return;

  // El recorrido de un ciclo nunca es más corto que la pantalla,
  // para que siempre haya margen de scroll.
  cycleHeight = Math.max(totalFrames * PX_PER_FRAME, window.innerHeight);
  scrollSpace.style.height = cycleHeight * 3 + "px";
  scrollTrack.scrollTop = cycleHeight;

  listo = true;
  irAFrame(0);
}

// Un solo seek a la vez. Si llega otro objetivo mientras busca,
// se aplica al recibir "seeked".
function irAFrame(nuevo) {
  if (!totalFrames) return;
  frame = ((nuevo % totalFrames) + totalFrames) % totalFrames;
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

// Scroll nativo del celular: tres ciclos del recorrido.
// El salto de posición ocurre lejos de los bordes y no cambia el frame visible.
function alScrollear() {
  if (!listo) return;

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
  irAFrame(Math.min(totalFrames - 1, Math.floor((local / cycleHeight) * totalFrames)));
}

scrollTrack.addEventListener("scroll", alScrollear, { passive: true });

function trackVisible() {
  return getComputedStyle(scrollTrack).display !== "none";
}

// Rueda en desktop: un notch equivale a un frame.
window.addEventListener("wheel", function (event) {
  if (!listo || trackVisible()) return;

  event.preventDefault();

  let delta = event.deltaY;
  if (event.deltaMode === 1) delta *= 16;
  else if (event.deltaMode === 2) delta *= window.innerHeight;

  acumuladoRueda += delta;

  const pasos = Math.trunc(acumuladoRueda / PASO_RUEDA);
  if (!pasos) return;

  acumuladoRueda -= pasos * PASO_RUEDA;
  const limite = Math.max(-MAX_PASOS_RUEDA, Math.min(MAX_PASOS_RUEDA, pasos));
  irAFrame(frame + limite);
}, { passive: false });

// Teclado: una pulsación, un frame.
window.addEventListener("keydown", function (event) {
  if (!listo || event.repeat) return;

  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    event.preventDefault();
    irAFrame(frame + 1);
  } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    event.preventDefault();
    irAFrame(frame - 1);
  }
});

// Audio ambiente: capa continua, independiente de los frames.
function actualizarBotonSonido() {
  botonSonido.setAttribute("aria-pressed", sonidoActivo ? "true" : "false");
  botonSonido.dataset.etiqueta = sonidoActivo ? "silenciar" : "activarSonido";
  aplicarTextos();
}

function quitarGestos() {
  window.removeEventListener("pointerdown", alPrimerGesto);
  window.removeEventListener("keydown", alPrimerGesto);
}

function intentarSonido() {
  if (sonidoActivo || !audio.src) return;

  audio.play().then(function () {
    sonidoActivo = true;
    actualizarBotonSonido();
    quitarGestos();
  }).catch(function () {
    // El navegador todavía no lo permite: queda el botón para activarlo.
  });
}

function alPrimerGesto(event) {
  if (event.target.closest && event.target.closest(".sound")) return;
  intentarSonido();
}

window.addEventListener("pointerdown", alPrimerGesto);
window.addEventListener("keydown", alPrimerGesto);

botonSonido.addEventListener("click", function () {
  if (sonidoActivo) {
    audio.pause();
    sonidoActivo = false;
    actualizarBotonSonido();
  } else {
    intentarSonido();
  }
});
