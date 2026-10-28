/* adultos.js — muestra en indexAdultos.html las noticias, la galería y los proyectos que Nexo aprobó
 * para el Portal de la Dirección General de Adultos Mayores.
 *
 * Usa el diseño y los modales que ya tiene la página:
 *   - Noticias  -> tarjetas .gallery-item en #news; al hacer clic abre el modal #news-modal
 *   - Galería   -> álbumes .gallery-item en #gallery; al hacer clic abre #gallery-modal con flechas
 *   - Proyectos -> tarjetas .proyecto-card en #proyectos
 * Los avisos prioritarios van primeros, con la marca «Prioritario», y además en una franja arriba de las noticias.
 */
(function () {
  "use strict";

  const N = window.NexoCliente;
  if (!N) return;
  const { el, icono } = N;

  let cerrarActivo = null; // para cerrar con Escape el modal que esté abierto

  function abrirModal(modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    const cerrar = () => {
      modal.classList.remove("active");
      document.body.style.overflow = "auto";
      cerrarActivo = null;
    };
    cerrarActivo = cerrar;
    const boton = modal.querySelector(".modal-close");
    if (boton) {
      boton.onclick = cerrar;
      boton.setAttribute("role", "button");
      boton.setAttribute("tabindex", "0");
      boton.setAttribute("aria-label", "Cerrar");
      boton.focus();
    }
    modal.onclick = (e) => { if (e.target === modal) cerrar(); };
  }

  document.addEventListener("keydown", (e) => {
    // con el visor de fotos abierto, Escape cierra solo el visor (lo resuelve el propio visor)
    if (e.key === "Escape" && cerrarActivo && !N.visorAbierto()) cerrarActivo();
  });

  /* ---------- Noticias ---------- */

  function abrirNoticia(p) {
    const modal = document.getElementById("news-modal");
    if (!modal) return;
    const fotos = N.imagenes(p);
    document.getElementById("modal-news-tag").textContent = p.seccion;
    document.getElementById("modal-news-title").textContent = p.titulo;
    document.getElementById("modal-news-date").textContent = N.fechaLarga(p.fecha);

    const caja = document.getElementById("modal-news-image-container");
    // la foto principal se amplía en el visor al tocarla
    let portada = null;
    if (fotos[0]) {
      portada = el("button", { clase: "nexo-portada", attrs: { type: "button", "aria-label": "Ampliar la foto" } },
        [N.imagen(fotos[0].url, p.titulo, "nexo-modal-noticia__img")]);
      portada.addEventListener("click", () => N.visor(fotos, 0, p.titulo, portada));
    }
    caja.replaceChildren(...(portada ? [portada] : []));
    caja.hidden = !fotos[0];

    const texto = document.getElementById("modal-news-text");
    texto.replaceChildren(
      ...(p.urgente ? [el("p", { clase: "nexo-aviso-detalle" }, [icono("fa-triangle-exclamation"), el("strong", { texto: "Aviso prioritario" }), N.vigencia(p) ? ` · ${N.vigencia(p)}` : ""])] : []),
      el("p", { clase: "nexo-resumen", texto: p.resumen }),
      ...N.parrafos(p.cuerpo),
      // las demás fotos de la noticia, si tiene más de una
      N.album(fotos.slice(1), p.titulo),
      N.listaDocumentos(p),
    );
    abrirModal(modal);
  }

  function tarjetaNoticia(p) {
    const fotos = N.imagenes(p);
    const tarjeta = el("div", { clase: `gallery-item${p.urgente ? " nexo-card--prioritario" : ""}` }, [
      el("div", { clase: "gallery-image-wrapper" }, [
        fotos[0] ? N.imagen(fotos[0].url, p.titulo) : el("div", { clase: "nexo-sin-imagen" }, [icono("fa-newspaper")]),
        el("div", { clase: "gallery-overlay" }, [el("p", { texto: "Leer noticia" })]),
      ]),
      el("div", { clase: "gallery-caption" }, [
        p.urgente ? N.marcaPrioritario() : null,
        el("h4", { texto: `${p.seccion} • ${N.fecha(p.fecha)}` }),
        el("p", {}, [el("strong", { texto: `${p.titulo}:` }), ` ${p.resumen}`]),
      ]),
    ]);
    return N.activable(tarjeta, () => abrirNoticia(p), `Leer noticia: ${p.titulo}`);
  }

  /** Franja de avisos prioritarios arriba de la grilla de noticias. */
  function franjaPrioritarios(prioritarios) {
    if (!prioritarios.length) return null;
    return el("div", { clase: "nexo-aviso", attrs: { role: "region", "aria-label": "Avisos prioritarios" } }, [
      el("p", { clase: "nexo-aviso__rotulo" }, [icono("fa-triangle-exclamation"), prioritarios.length === 1 ? "Aviso prioritario" : `Avisos prioritarios (${prioritarios.length})`]),
      el("ul", {}, prioritarios.map((p) => el("li", {}, [
        N.activable(el("span", { clase: "nexo-aviso__enlace" }, [
          el("strong", { texto: p.titulo }),
          el("span", { texto: N.vigencia(p) || p.resumen }),
        ]), () => (p.tipo === "galeria" ? abrirAlbum(p) : abrirNoticia(p)), `Ver aviso: ${p.titulo}`),
      ]))),
    ]);
  }

  /* ---------- Galería ---------- */

  /**
   * Álbum de Nexo en el modal de galería del sitio: título y una cuadrícula con todas las miniaturas.
   * Al tocar una, se amplía en el visor (fondo oscuro, flechas, Escape para cerrar).
   */
  function abrirAlbum(p) {
    const modal = document.getElementById("gallery-modal");
    const contenedor = document.getElementById("modal-images-container");
    const fotos = N.imagenes(p);
    if (!modal || !contenedor || !fotos.length) return;
    document.getElementById("modal-title").textContent = p.titulo;
    // las flechas del visor de una sola foto de js/adultos/adultos.js no se usan con los álbumes de Nexo
    modal.querySelectorAll(".modal-nav-btn").forEach((b) => { b.hidden = true; });
    modal.querySelector(".modal-content").classList.add("nexo-modal-album");
    contenedor.classList.add("nexo-album-modo");
    contenedor.replaceChildren(
      ...(p.resumen ? [el("p", { clase: "nexo-album__resumen", texto: p.resumen })] : []),
      N.album(fotos, p.titulo),
    );
    abrirModal(modal);
  }

  function tarjetaAlbum(p) {
    const fotos = N.imagenes(p);
    const tarjeta = el("div", { clase: `gallery-item${p.urgente ? " nexo-card--prioritario" : ""}` }, [
      el("div", { clase: "gallery-image-wrapper" }, [
        fotos[0] ? N.imagen(fotos[0].url, p.titulo) : el("div", { clase: "nexo-sin-imagen" }, [icono("fa-images")]),
        el("div", { clase: "gallery-overlay" }, [el("p", { texto: "Ver más" })]),
        fotos.length > 1 ? el("span", { clase: "nexo-cantidad" }, [icono("fa-images"), String(fotos.length)]) : null,
      ]),
      el("div", { clase: "gallery-caption" }, [
        p.urgente ? N.marcaPrioritario() : null,
        el("h4", { texto: p.titulo }),
        el("p", { texto: p.resumen }),
      ]),
    ]);
    return N.activable(tarjeta, () => abrirAlbum(p), `Ver álbum: ${p.titulo}`);
  }

  /* ---------- Proyectos ---------- */

  function tarjetaProyecto(p) {
    const tarjeta = el("article", { clase: `proyecto-card${p.urgente ? " nexo-card--prioritario" : ""}` }, [
      p.urgente ? N.marcaPrioritario() : null,
      el("div", { clase: "proyecto-card-header" }, [
        el("h3", { clase: "proyecto-card-title", texto: p.titulo }),
        el("span", { clase: "badge-tag", texto: p.seccion.toUpperCase() }),
      ]),
      el("p", { clase: "proyecto-card-text", texto: p.resumen }),
    ]);
    // el proyecto completo se lee en el mismo modal de noticias
    return N.activable(tarjeta, () => abrirNoticia(p), `Ver proyecto: ${p.titulo}`);
  }

  /* ---------- Conexión ----------
   * Cada sección muestra las últimas (8 noticias, 6 proyectos, 8 álbumes, o lo que diga data-nexo-portada)
   * y, si hay más, el botón "Ver todas" debajo (lo maneja js/nexo/nexo-cliente.js). */

  N.conectar({
    secciones: {
      noticia: { tarjeta: tarjetaNoticia, vacio: "Todavía no hay noticias publicadas." },
      galeria: { tarjeta: tarjetaAlbum, vacio: "Todavía no hay álbumes publicados." },
      proyecto: { tarjeta: tarjetaProyecto, vacio: "Todavía no hay proyectos publicados." },
    },
    franja: franjaPrioritarios,
  });
})();
