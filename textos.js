// Textos e idioma compartidos por la galería y la página de video.

const TEXTOS = {
  en: {
    verPieza: "View piece",
    cargando: "Loading",
    noDisponible: "Video unavailable",
    activarSonido: "Play sound",
    silenciar: "Mute sound",
    recorrer: "Scroll to move through the video",
    idioma: "Change language"
  },
  es: {
    verPieza: "Ver pieza",
    cargando: "Cargando",
    noDisponible: "Video no disponible",
    activarSonido: "Activar sonido",
    silenciar: "Silenciar sonido",
    recorrer: "Deslizá para recorrer el video",
    idioma: "Cambiar idioma"
  }
};

const CLAVE_IDIOMA = "idioma";

function leerIdiomaGuardado() {
  try {
    return localStorage.getItem(CLAVE_IDIOMA);
  } catch (error) {
    return null;
  }
}

function idiomaInicial() {
  const guardado = leerIdiomaGuardado();
  if (guardado === "es" || guardado === "en") return guardado;
  return /^es/i.test(navigator.language || "") ? "es" : "en";
}

let idioma = idiomaInicial();

function t(clave) {
  return TEXTOS[idioma][clave] || clave;
}

function aplicarTextos() {
  document.querySelectorAll("[data-texto]").forEach(function (elemento) {
    elemento.textContent = t(elemento.dataset.texto);
  });
  document.querySelectorAll("[data-etiqueta]").forEach(function (elemento) {
    elemento.setAttribute("aria-label", t(elemento.dataset.etiqueta));
  });
}

function fijarIdioma(nuevo) {
  idioma = nuevo === "es" ? "es" : "en";
  try {
    localStorage.setItem(CLAVE_IDIOMA, idioma);
  } catch (error) {
    // Sin localStorage el idioma vale solo para esta visita.
  }
  document.documentElement.lang = idioma;
  aplicarTextos();
}

document.documentElement.lang = idioma;
