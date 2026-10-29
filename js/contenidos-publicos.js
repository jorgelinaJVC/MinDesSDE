/* =========================================================
   CONTENIDOS PÚBLICOS - MINISTERIO DE DESARROLLO SOCIAL
   Carrusel + Noticias + Videos
========================================================= */

const API_CONTENIDOS = 'backend-contenidos/api.php';


/* =========================================================
   FUNCIÓN GENERAL PARA CONSULTAR LA API
========================================================= */

async function obtenerContenidos(tipo) {

    try {

        const respuesta = await fetch(
            `${API_CONTENIDOS}?action=public-list&tipo=${tipo}`
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.ok) {
            throw new Error(
                resultado.message ||
                'No se pudo cargar el contenido'
            );
        }

        return resultado.data || [];

    } catch (error) {

        console.error(
            `Error cargando ${tipo}:`,
            error
        );

        return [];
    }
}


/* =========================================================
   SEGURIDAD PARA TEXTOS
========================================================= */

function escaparHTML(texto = '') {

    const div = document.createElement('div');

    div.textContent = texto;

    return div.innerHTML;
}


function escaparAtributo(valor = '') {

    return String(valor)
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}
function limpiarHTMLNoticia(html = '') {

    const plantilla =
        document.createElement('template');

    plantilla.innerHTML =
        String(html);

    const etiquetasPermitidas =
        new Set([
            'P',
            'BR',
            'STRONG',
            'B',
            'EM',
            'I',
            'U',
            'UL',
            'OL',
            'LI',
            'H2',
            'H3',
            'H4',
            'BLOCKQUOTE'
        ]);

    const limpiarNodo = nodo => {

        Array.from(
            nodo.children
        ).forEach(elemento => {

            if (
                !etiquetasPermitidas.has(
                    elemento.tagName
                )
            ) {

                elemento.replaceWith(
                    ...elemento.childNodes
                );

                return;
            }

            Array.from(
                elemento.attributes
            ).forEach(atributo => {

                elemento.removeAttribute(
                    atributo.name
                );
            });

            limpiarNodo(elemento);
        });
    };

    limpiarNodo(
        plantilla.content
    );

    return plantilla.innerHTML;
}
/* =========================================================
   CORREGIR RUTAS DE IMÁGENES PARA INDEX.HTML
========================================================= */

function rutaImagenPublica(ruta = '') {

    if (!ruta) {
        return '';
    }

    return ruta.replace(
        '../uploads/',
        'uploads/'
    );
}
function validarEnlacePublico(url = '') {

    const valor =
        String(url).trim();

    if (!valor) {
        return '';
    }

    /* Rutas internas del sitio */
    if (
        valor.startsWith('/') ||
        valor.startsWith('./') ||
        valor.startsWith('../') ||
        valor.startsWith('#')
    ) {
        return valor;
    }

    /* Enlaces externos */
    try {

        const enlace =
            new URL(valor);

        if (
            enlace.protocol === 'https:' ||
            enlace.protocol === 'http:'
        ) {
            return enlace.href;
        }

    } catch (error) {
        return '';
    }

    return '';
}


/* =========================================================
   1. CARRUSEL
========================================================= */

async function cargarCarruselPublico() {

    const contenedor =
        document.getElementById('heroSlides');

    const dots =
        document.getElementById('heroDots');

    if (!contenedor || !dots) {
        return;
    }


    let slides =
        await obtenerContenidos('carrusel');
    
    slides = slides
        .filter(
            slide =>
                Number(slide.activo) === 1
        )
        .sort(
            (a, b) =>
                Number(a.orden) -
                Number(b.orden)
        );


    if (slides.length === 0) {

        console.warn(
            'No hay slides activos en MySQL'
        );

        return;
    }


    contenedor.innerHTML =
        slides.map((slide, index) => {
            const enlaceSeguro =
                validarEnlacePublico(
                    slide.url || ''
                );
            return `

            <div
                class="hero__slide ${index === 0 ? 'active' : ''}"
                style="background-image:url('${escaparAtributo(rutaImagenPublica(slide.imagen))}')"
            >

                <div class="hero__overlay"></div>

                <div class="hero__content container">

                    <span class="hero__tag">
                        Institucional
                    </span>

                    <h2 class="hero__title">
                        ${escaparHTML(slide.titulo || '')}
                    </h2>

                    ${slide.descripcion
                    ? `
                                <p class="hero__description">
                                    ${escaparHTML(slide.descripcion)}
                                </p>
                              `
                    : ''
                }

                    ${enlaceSeguro
                    ? `
                        <a
                        href="${escaparAtributo(enlaceSeguro)}"
                        class="hero__button"
                        >
                        Ver más
                        </a>
                        `
                    : ''
                }
                    </div>
                    </div>
                    `;
        }).join('');


    dots.innerHTML =
        slides.map((slide, index) => `

            <button
                class="hero__dot ${index === 0 ? 'active' : ''}"
                data-index="${index}"
                aria-label="Ir al slide ${index + 1}">
            </button>

        `).join('');



    /* Ahora que existen los slides,
       iniciamos flechas, puntos y automático */

    if (
        typeof window.iniciarCarruselPrincipal
        === 'function'
    ) {

        window.iniciarCarruselPrincipal();
    }
}


/* =========================================================
   2. NOTICIAS INSTITUCIONALES
========================================================= */

async function cargarNoticiasPublicas() {

    const contenedor =
        document.getElementById('noticiasGrid');

    if (!contenedor) {
        return;
    }


    let noticias =
        await obtenerContenidos('noticias');


    noticias = noticias.filter(
        noticia =>
            Number(noticia.activo) === 1 &&
            noticia.estado === 'Publicada'
    );
    window.noticiasPublicas = noticias;


    if (noticias.length === 0) {

        contenedor.innerHTML = `
            <p>No hay noticias publicadas.</p>
        `;

        console.warn(
            'No hay noticias publicadas'
        );

        return;
    }


    contenedor.innerHTML =
        noticias.map(noticia => `

            <article
            class="noticia-card"
            data-noticia-id="${Number(noticia.id)}"
            tabindex="0"
            role="button"
            aria-label="Leer noticia: ${escaparAtributo(noticia.titulo || '')}">

                ${noticia.imagen
                ? `
                            <div class="noticia-card__img">

                                <img
                                    src="${escaparAtributo(rutaImagenPublica(noticia.imagen))}"
                                    alt="${escaparAtributo(noticia.titulo || 'Noticia')}">

                            </div>
                          `
                : ''
            }

              <div class="noticia-card__body">
                <h3 class="noticia-card__titulo">
                  ${escaparHTML(noticia.titulo || '')}
                </h3>
                <div class="noticia-card__descripcion">
                  ${escaparHTML(noticia.resumen || '')}
                </div>

                <span class="noticia-card__leer">
                   Leer noticia →
                </span>

               </div>

            </article>

        `).join('');

}
/* =========================================================
   DETALLE DE NOTICIAS
========================================================= */

function formatearFechaNoticia(fecha) {

    if (!fecha) {
        return '';
    }

    const fechaObj = new Date(fecha.replace(' ', 'T'));

    if (Number.isNaN(fechaObj.getTime())) {
        return '';
    }

    return fechaObj.toLocaleDateString(
        'es-AR',
        {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }
    );
}


function abrirNoticiaDetalle(id) {

    const noticias =
        window.noticiasPublicas || [];

    const noticia =
        noticias.find(
            item => Number(item.id) === Number(id)
        );

    if (!noticia) {
        return;
    }

    const modal =
        document.getElementById('noticiaModal');

    const imagen =
        document.getElementById('noticiaModalImagen');

    const categoria =
        document.getElementById('noticiaModalCategoria');

    const titulo =
        document.getElementById('noticiaModalTitulo');

    const fecha =
        document.getElementById('noticiaModalFecha');

    const texto =
        document.getElementById('noticiaModalTexto');

    if (!modal) {
        return;
    }


    /* IMAGEN */

    if (noticia.imagen) {

        imagen.innerHTML = `
            <img
                src="${escaparAtributo(
            rutaImagenPublica(noticia.imagen)
        )}"
                alt="${escaparAtributo(
            noticia.titulo || 'Noticia'
        )}">
        `;

        imagen.style.display = '';

    } else {

        imagen.innerHTML = '';
        imagen.style.display = 'none';
    }


    /* INFORMACIÓN */

    categoria.textContent =
        noticia.categoria || 'Institucional';

    titulo.textContent =
        noticia.titulo || '';

    fecha.textContent =
        formatearFechaNoticia(
            noticia.fecha_creacion
        );

    /*
       La descripción viene del editor del panel
       y puede contener HTML formateado.
    */
    texto.innerHTML =
        limpiarHTMLNoticia(
            noticia.descripcion || ''
        );


    /* MOSTRAR */

    modal.classList.add('activo');

    modal.setAttribute(
        'aria-hidden',
        'false'
    );

    document.body.classList.add(
        'modal-noticia-abierto'
    );
}


function cerrarNoticiaDetalle() {

    const modal =
        document.getElementById('noticiaModal');

    if (!modal) {
        return;
    }

    modal.classList.remove('activo');

    modal.setAttribute(
        'aria-hidden',
        'true'
    );

    document.body.classList.remove(
        'modal-noticia-abierto'
    );
}
document.addEventListener(
    'click',
    event => {

        const tarjeta =
            event.target.closest(
                '.noticia-card[data-noticia-id]'
            );

        if (tarjeta) {

            abrirNoticiaDetalle(
                tarjeta.dataset.noticiaId
            );

            return;
        }


        if (
            event.target.id === 'cerrarNoticiaModal' ||
            event.target.classList.contains(
                'noticia-modal__fondo'
            )
        ) {
            cerrarNoticiaDetalle();
        }
    }
);
document.addEventListener(
    'keydown',
    event => {

        if (event.key === 'Escape') {
            cerrarNoticiaDetalle();
            return;
        }

        if (
            event.key === 'Enter' ||
            event.key === ' '
        ) {

            const tarjeta =
                document.activeElement;

            if (
                tarjeta?.matches(
                    '.noticia-card[data-noticia-id]'
                )
            ) {

                event.preventDefault();

                abrirNoticiaDetalle(
                    tarjeta.dataset.noticiaId
                );
            }
        }
    }
);

/* =========================================================
   3. GALERÍA DE VIDEOS
========================================================= */

function convertirUrlVideo(url = '') {

    const valor =
        String(url).trim();

    if (!valor) {
        return '';
    }

    try {

        const enlace =
            new URL(valor);

        /* Solo HTTPS */

        if (enlace.protocol !== 'https:') {
            return '';
        }

        /* youtube.com / www.youtube.com */

        if (
            enlace.hostname === 'youtube.com' ||
            enlace.hostname === 'www.youtube.com'
        ) {

            if (enlace.pathname === '/watch') {

                const id =
                    enlace.searchParams.get('v');

                if (
                    id &&
                    /^[A-Za-z0-9_-]{11}$/.test(id)
                ) {
                    return `https://www.youtube.com/embed/${id}`;
                }
            }

            if (
                enlace.pathname.startsWith('/embed/')
            ) {

                const id =
                    enlace.pathname
                        .split('/embed/')[1]
                        ?.split('/')[0];

                if (
                    id &&
                    /^[A-Za-z0-9_-]{11}$/.test(id)
                ) {
                    return `https://www.youtube.com/embed/${id}`;
                }
            }
        }

        /* youtu.be */

        if (
            enlace.hostname === 'youtu.be' ||
            enlace.hostname === 'www.youtu.be'
        ) {

            const id =
                enlace.pathname
                    .replace('/', '')
                    .split('/')[0];

            if (
                id &&
                /^[A-Za-z0-9_-]{11}$/.test(id)
            ) {
                return `https://www.youtube.com/embed/${id}`;
            }
        }

    } catch (error) {

        console.warn(
            'URL de video rechazada:',
            valor
        );
    }

    return '';
}
function rutaVideoPublico(ruta = '') {

    if (!ruta) {
        return '';
    }

    return ruta.replace(
        '../uploads/',
        'uploads/'
    );
}


function esVideoPropio(ruta = '') {

    return /uploads\/videos\/[a-f0-9]{32}\.(mp4|webm)$/i.test(
        ruta
    );
}


async function cargarVideosPublicos() {

    const contenedor =
        document.getElementById('videosGrid');

    if (!contenedor) {
        return;
    }

    let videos =
        await obtenerContenidos('videos');

    videos = videos.filter(
        video =>
            Number(video.activo) === 1
    );

    if (videos.length === 0) {

        contenedor.innerHTML = `
            <p>No hay videos publicados.</p>
        `;

        console.warn(
            'No hay videos publicados'
        );

        return;
    }

    contenedor.innerHTML =
        videos.map(video => {

            const propio =
                esVideoPropio(
                    video.url || ''
                );

            let reproductor = '';

            /* VIDEO PROPIO MP4 / WEBM */

            if (propio) {

                const ruta =
                    rutaVideoPublico(
                        video.url
                    );

                reproductor = `
                    <video
                        controls
                        preload="metadata"
                    >
                        <source
                            src="${escaparAtributo(ruta)}"
                        >
                        Tu navegador no puede reproducir este video.
                    </video>
                `;

            } else {

                /* VIDEO DE YOUTUBE */

                const url =
                    convertirUrlVideo(
                        video.url || ''
                    );

                if (url) {

                    reproductor = `
                        <iframe
                            src="${escaparAtributo(url)}"
                            title="${escaparAtributo(
                                video.titulo ||
                                'Video institucional'
                            )}"
                            frameborder="0"
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen>
                        </iframe>
                    `;

                } else {

                    reproductor = `
                        <div class="video-no-disponible">
                            Video no disponible
                        </div>
                    `;
                }
            }

            return `
                <div class="video-card">

                    ${reproductor}

                    <p>
                        ${escaparHTML(
                            video.titulo || ''
                        )}
                    </p>

                    <div class="video-card__descripcion">
                        ${escaparHTML(
                            video.descripcion || ''
                        )}
                    </div>

                </div>
            `;

        }).join('');

}


/* =========================================================
   INICIAR
========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        await cargarCarruselPublico();

        await cargarNoticiasPublicas();

        await cargarVideosPublicos();

    }
);