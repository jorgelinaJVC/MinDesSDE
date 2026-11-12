/* publico.js — vista pública de los sitios institucionales.
 * No usa sesión: solo lee lo publicado con Nexo.api.publico (con el backend, endpoints abiertos de solo lectura).
 * Toda consulta es para UN sitio (?sitio=adultos-mayores): cada sitio ve solo lo que la autoridad superior aprobó
 * para él, igual que los portales satélite que consumen /api/publico/sitios/{sitio}/publicaciones.
 */
(function () {
  "use strict";

  const { api, util } = Nexo;
  const { esc, fechaLarga, tamano } = util;
  const raiz = document.getElementById("principal");

  const ICONO_CALENDARIO = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const ICONO_ALERTA = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  const ICONO_FLECHA = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

  let publicaciones = [];
  let seccionActiva = "todas";

  /** Sitio elegido en la URL; si no hay o no existe, el primero del catálogo. */
  function sitioActual() {
    const pedido = new URLSearchParams(location.search).get("sitio");
    return api.sitios.find((s) => s.id === pedido) || api.sitios[0];
  }
  const sitio = sitioActual();

  function renderNavegacion() {
    const nav = document.getElementById("sitios-nav");
    nav.innerHTML = api.sitios.map((s) => `
      <a class="sitios-nav__enlace" href="publico.html?sitio=${encodeURIComponent(s.id)}"${s.id === sitio.id ? ' aria-current="page"' : ""}>${esc(s.corto)}</a>`).join("");
  }

  function tarjeta(p) {
    return `
      <article class="publicacion">
        <a class="publicacion__enlace" href="#${encodeURIComponent(p.slug)}">
          <div class="publicacion__tope">
            <span class="etiqueta-seccion">${esc(p.seccion)}</span>
            ${ICONO_CALENDARIO}
          </div>
          <h3 class="publicacion__titulo">${esc(p.titulo)}</h3>
          <p class="publicacion__resumen">${esc(p.resumen)}</p>
          <div class="publicacion__pie">
            <span>Publicado el ${fechaLarga(p.fecha)}</span>
            ${ICONO_FLECHA}
          </div>
        </a>
      </article>`;
  }

  /** "vigente hasta el 25 de octubre de 2026" (o nada si se destaca mientras esté publicado). */
  const hasta = (p) => (p.urgenteHasta ? `Vigente hasta el ${fechaLarga(p.urgenteHasta)}` : "");

  /**
   * Avisos urgentes: una banda fija arriba de todo, antes de los filtros. El primero se muestra grande;
   * si hay más, se listan debajo en una línea cada uno. Así un aviso urgente no compite con las novedades.
   */
  function bandaUrgente(urgentes) {
    if (!urgentes.length) return "";
    const [principal, ...otros] = urgentes;
    return `
      <section class="aviso-urgente" aria-labelledby="t-aviso-urgente">
        <p class="aviso-urgente__rotulo" id="t-aviso-urgente">${ICONO_ALERTA}${urgentes.length === 1 ? "Aviso urgente" : `Avisos urgentes · ${urgentes.length}`}</p>
        <a class="aviso-urgente__principal" href="#${encodeURIComponent(principal.slug)}">
          <span class="aviso-urgente__seccion">${esc(principal.seccion)}</span>
          <strong class="aviso-urgente__titulo">${esc(principal.titulo)}</strong>
          <span class="aviso-urgente__resumen">${esc(principal.resumen)}</span>
          <span class="aviso-urgente__pie"><span>${hasta(principal) || `Publicado el ${fechaLarga(principal.fecha)}`}</span><span class="aviso-urgente__ver">Leer el aviso ${ICONO_FLECHA}</span></span>
        </a>
        ${otros.length ? `<ul class="aviso-urgente__otros">${otros.map((p) => `
          <li><a href="#${encodeURIComponent(p.slug)}"><strong>${esc(p.titulo)}</strong><span>${hasta(p) || esc(p.seccion)}</span>${ICONO_FLECHA}</a></li>`).join("")}
        </ul>` : ""}
      </section>`;
  }

  function renderLista() {
    document.title = `Novedades y convocatorias | ${sitio.nombre}`;
    const secciones = [...new Set(publicaciones.map((p) => p.seccion))].sort((a, b) => a.localeCompare(b, "es"));
    // los urgentes van en su banda; la grilla muestra el resto (así no aparecen dos veces)
    const urgentes = publicaciones.filter((p) => p.urgente);
    const comunes = publicaciones.filter((p) => !p.urgente);
    const visibles = seccionActiva === "todas"
      ? comunes
      : comunes.filter((p) => p.seccion === seccionActiva);

    const chips = secciones.length > 1
      ? `<div class="chips" role="group" aria-label="Filtrar por sección">
          ${["todas", ...secciones].map((s) => `
            <button type="button" class="chip" data-seccion="${esc(s)}" aria-pressed="${s === seccionActiva}">${s === "todas" ? "Todas" : esc(s)}</button>`).join("")}
        </div>`
      : "";

    raiz.innerHTML = `
      ${bandaUrgente(urgentes)}
      <div class="seccion-cabecera">
        <div>
          <p class="etiqueta">${esc(sitio.nombre)}</p>
          <h1 class="seccion-titulo">Novedades y convocatorias</h1>
        </div>
        <p class="seccion-conteo">${publicaciones.length} ${publicaciones.length === 1 ? "publicación visible" : "publicaciones visibles"}</p>
      </div>
      ${chips}
      ${visibles.length
        ? `<div class="publicaciones">${visibles.map(tarjeta).join("")}</div>`
        : `<p class="vacio-publico">${urgentes.length ? "No hay otras publicaciones en esta sección." : "Todavía no hay publicaciones visibles."}</p>`}`;
  }

  function documentos(adjuntos) {
    const lista = (adjuntos || []).filter((a) => a.id);
    if (!lista.length) return "";
    return `
      <section class="articulo__documentos">
        <h2 class="etiqueta">Documentos</h2>
        <ul>${lista.map((a) => `
          <li><a href="/api/publico/adjuntos/${encodeURIComponent(a.id)}" download>${esc(a.nombre)}</a> <small>${tamano(a.tamano)}</small></li>`).join("")}
        </ul>
      </section>`;
  }

  async function renderArticulo(slug) {
    try {
      const p = await api.publico.obtener(sitio.id, slug);
      document.title = `${p.titulo} | ${sitio.nombre}`;
      raiz.innerHTML = `
        <article class="articulo">
          <a class="articulo__volver" href="#">${ICONO_FLECHA} Volver a novedades</a>
          ${p.urgente ? `<p class="articulo__urgente" role="note">${ICONO_ALERTA}<span><strong>Aviso urgente</strong>${hasta(p) ? ` · ${hasta(p)}` : ""}</span></p>` : ""}
          <span class="etiqueta-seccion">${esc(p.seccion)}</span>
          <h1 class="articulo__titulo">${esc(p.titulo)}</h1>
          <p class="articulo__fecha">Publicado el ${fechaLarga(p.fecha)}</p>
          <p class="articulo__resumen">${esc(p.resumen)}</p>
          <div class="articulo__cuerpo texto-con-formato">${util.cuerpoHtml(p)}</div>
          ${documentos(p.adjuntos)}
        </article>`;
    } catch (err) {
      raiz.innerHTML = `
        <a class="articulo__volver" href="#">${ICONO_FLECHA} Volver a novedades</a>
        <p class="vacio-publico">${esc(err.message)}</p>`;
    }
  }

  async function render() {
    const slug = decodeURIComponent(location.hash.slice(1));
    if (slug) {
      await renderArticulo(slug);
    } else {
      publicaciones = await api.publico.listar({ sitio: sitio.id });
      renderLista();
    }
    window.scrollTo(0, 0);
  }

  raiz.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-seccion]");
    if (!chip) return;
    seccionActiva = chip.dataset.seccion;
    renderLista();
  });

  window.addEventListener("hashchange", render);
  renderNavegacion();
  render();
})();
