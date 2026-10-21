const img = document.getElementsByClassName('imagenes');
const video = document.createElement('video');
video.src = "./videos/prueba.mp4";
video.preload = "auto";
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext('2d');


const frameStep = 0.1; 
function dibujarFotograma() {
            // Verificamos que el video realmente tenga dimensiones listas para dibujar
    if (video.videoWidth > 0 && video.videoHeight > 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
    }
        // Se ejecuta cuando el video ya cargó sus datos principales
    video.addEventListener('loadeddata', function() {
        dibujarFotograma();
    });

        // Se ejecuta cuando el navegador se posiciona en un nuevo currentTime
    video.addEventListener('seeked', function() {
        dibujarFotograma();
    });

        // Evento de la rueda del mouse sobre el canvas
    canvas.addEventListener('wheel', function(event) {
        event.preventDefault();

        if (event.deltaY < 0) {
            video.currentTime = Math.min(video.duration, video.currentTime + frameStep);
        } else {
            video.currentTime = Math.max(0, video.currentTime - frameStep); 
        }
    }, { passive: false });