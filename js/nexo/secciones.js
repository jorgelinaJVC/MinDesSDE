/* secciones.js — dibuja Noticias, Galería y Proyectos con lo que Nexo aprobó para el sitio. Es el mismo archivo
 * en los tres sitios (indexAdultos.html, mama-antula.html y centro-dia.html): qué sitio es cada página lo dice su
 * <meta name="nexo-sitio">, y las tres comparten la estructura y las clases de css/adultos/secciones-contenido.css:
 *   - Noticias  -> article.news-item      dentro de [data-nexo="noticia"]
 *   - Galería   -> figure.gallery-cell    dentro de [data-nexo="galeria"]  (portada del álbum; al tocarla, todas las fotos)
 *   - Proyectos -> .project-card          dentro de [data-nexo="proyecto"]
 * Noticias, álbumes y proyectos abren un detalle centrado con el texto completo, el álbum y los documentos.
 * Los avisos prioritarios van primeros, con la marca «Prioritario», y además en una franja arriba de las noticias.
 */
(function () {
  "use strict";

  const N = window.NexoCliente;
  if (!N) return;
  const { el, icono } = N;

  /* ---------- Detalle (un solo <dialog> para toda la página) ---------- */

  function dialogo() {
    let d = document.getElementById("nexo-detalle");
    if (d) return d;
    d = el("dialog", { clase: "nexo-modal", attrs: { id: "nexo-detalle", "aria-labelledby": "nexo-detalle-titulo" } });
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); }); // clic en el fondo
    document.body.append(d);
    return d;
  }

  /** Foto principal de una noticia o proyecto: al tocarla se amplía en el visor. */
  function portada(fotos, titulo) {
    const boton = el("button", { clase: "nexo-portada", attrs: { type: "button", "aria-label": "Ampliar la foto" } },
      [N.imagen(fotos[0].url, titulo, "nexo-modal__portada")]);
    boton.addEventListener("click", () => N.visor(fotos, 0, titulo, boton));
    return boton;
  }

  function abrirDetalle(p) {
    const d = dialogo();
    const fotos = N.imagenes(p);
    const esGaleria = p.tipo === "galeria";
    // texto y no ícono: el botón de cerrar tiene que verse aunque no cargue la librería de íconos
    const cerrar = el("button", { clase: "nexo-modal__cerrar", texto: "✕", attrs: { type: "button", "aria-label": "Cerrar" } });
    cerrar.addEventListener("click", () => d.close());

    d.classList.toggle("nexo-modal--galeria", esGaleria); // el álbum usa un detalle más ancho
    d.replaceChildren(el("article", { clase: "nexo-modal__contenido" }, [
      cerrar,
      p.urgente ? el("p", { clase: "nexo-aviso-detalle" }, [icono("fa-triangle-exclamation"), el("strong", { texto: "Aviso prioritario" }), N.vigencia(p) ? ` · ${N.vigencia(p)}` : ""]) : null,
      el("div", { clase: "news-meta" }, [
        el("span", { clase: "news-category", texto: p.seccion }),
        el("span", { clase: "news-date", texto: N.fecha(p.fecha) }),
      ]),
      el("h3", { clase: "nexo-modal__titulo", texto: p.titulo, attrs: { id: "nexo-detalle-titulo" } }),
      !esGaleria && fotos[0] ? portada(fotos, p.titulo) : null,
      el("p", { clase: "nexo-resumen", texto: p.resumen }),
      el("div", { clase: "nexo-modal__texto nexo-texto-formato" }, N.cuerpoConFormato(p)),
      // galería: todas las fotos en álbum; noticia o proyecto: las demás fotos (la primera ya es la portada)
      N.album(esGaleria ? fotos : fotos.slice(1), p.titulo),
      N.listaDocumentos(p),
    ]));
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
    cerrar.focus();
  }

  /* ---------- Tarjetas con las clases de la plantilla ---------- */

  function tarjetaNoticia(p) {
    const fotos = N.imagenes(p);
    const tarjeta = el("article", { clase: `news-item nexo-clicable${p.urgente ? " nexo-card--prioritario" : ""}` }, [
      fotos[0] ? N.imagen(fotos[0].url, "", "nexo-news-img") : null,
      p.urgente ? N.marcaPrioritario() : null,
      el("div", { clase: "news-meta" }, [
        el("span", { clase: "news-category", texto: p.seccion }),
        el("span", { clase: "news-date", texto: N.mesYAnio(p.fecha) }),
      ]),
      el("h3", { texto: p.titulo }),
      el("p", { texto: p.resumen }),
      el("span", { clase: "nexo-leer-mas" }, ["Leer más ", icono("fa-arrow-right")]),
    ]);
    return N.activable(tarjeta, () => abrirDetalle(p), `Leer noticia: ${p.titulo}`);
  }

  function tarjetaAlbum(p) {
    const fotos = N.imagenes(p);
    const celda = el("figure", { clase: `gallery-cell nexo-clicable${p.urgente ? " nexo-card--prioritario" : ""}` }, [
      fotos[0] ? N.imagen(fotos[0].url, p.titulo) : el("div", { clase: "nexo-sin-imagen" }, [icono("fa-images")]),
      fotos.length > 1 ? el("span", { clase: "nexo-cantidad" }, [icono("fa-images"), String(fotos.length)]) : null,
      el("figcaption", {}, [p.urgente ? N.marcaPrioritario() : null, p.titulo]),
    ]);
    return N.activable(celda, () => abrirDetalle(p), `Ver álbum: ${p.titulo} (${fotos.length} fotos)`);
  }

  /** Ícono del proyecto según su categoría (si no coincide ninguna, uno genérico). */
  const ICONOS_CATEGORIA = [
    [/terap|salud|huerta|natur/i, "fa-seedling"],
    [/cogn|memoria|educ|taller|lectura/i, "fa-brain"],
    [/integr|paseo|salida|comunidad|recrea/i, "fa-map-location-dot"],
    [/arte|cultur|m[uú]sica/i, "fa-palette"],
    [/deporte|actividad f[ií]sica|gimnasia/i, "fa-person-walking"],
  ];
  const iconoProyecto = (seccion) => (ICONOS_CATEGORIA.find(([re]) => re.test(seccion)) || [null, "fa-lightbulb"])[1];

  function tarjetaProyecto(p) {
    const tarjeta = el("div", { clase: `project-card nexo-clicable${p.urgente ? " nexo-card--prioritario" : ""}` }, [
      el("div", { clase: "project-tag", texto: p.seccion }),
      p.urgente ? N.marcaPrioritario() : null,
      el("i", { clase: `fa-solid ${iconoProyecto(p.seccion)} proj-icon`, attrs: { "aria-hidden": "true" } }),
      el("h3", { texto: p.titulo }),
      el("p", { texto: p.resumen }),
    ]);
    return N.activable(tarjeta, () => abrirDetalle(p), `Ver proyecto: ${p.titulo}`);
  }

  function franjaPrioritarios(prioritarios) {
    if (!prioritarios.length) return null;
    return el("div", { clase: "nexo-aviso", attrs: { role: "region", "aria-label": "Avisos prioritarios" } }, [
      el("p", { clase: "nexo-aviso__rotulo" }, [icono("fa-triangle-exclamation"), prioritarios.length === 1 ? "Aviso prioritario" : `Avisos prioritarios (${prioritarios.length})`]),
      el("ul", {}, prioritarios.map((p) => el("li", {}, [
        N.activable(el("span", { clase: "nexo-aviso__enlace" }, [
          el("strong", { texto: p.titulo }),
          el("span", { texto: N.vigencia(p) || p.resumen }),
        ]), () => abrirDetalle(p), `Ver aviso: ${p.titulo}`),
      ]))),
    ]);
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
