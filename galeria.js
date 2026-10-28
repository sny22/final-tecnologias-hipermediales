// Genera la galería a partir de PIEZAS (piezas.js).

const galeria = document.querySelector(".gallery");

if (galeria) {
  const fragmento = document.createDocumentFragment();

  PIEZAS.forEach(function (pieza) {
    const enlace = document.createElement("a");
    enlace.className = "pieza";
    enlace.href = "mostrarVideo.html?p=" + encodeURIComponent(pieza.id);
    enlace.setAttribute("aria-label", t("verPieza"));

    const imagen = document.createElement("img");
    imagen.src = pieza.imagen;
    imagen.alt = "";
    imagen.loading = "lazy";
    imagen.decoding = "async";

    if (pieza.ancho && pieza.alto) {
      imagen.width = pieza.ancho;
      imagen.height = pieza.alto;
    }

    enlace.appendChild(imagen);
    fragmento.appendChild(enlace);
  });

  galeria.appendChild(fragmento);
}
