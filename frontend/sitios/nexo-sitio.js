/* nexo-sitio.js — muestra en un sitio satélite las publicaciones que Nexo aprobó para ese sitio.
 *
 * Uso en la página del sitio (Adultos Mayores, Mama Antula, Centro de Día…):
 *
 *   <link rel="stylesheet" href="https://<nexo>/sitios/nexo-sitio.css">
 *   <section data-nexo-sitio="adultos-mayores"></section>
 *   <script src="https://<nexo>/sitios/nexo-sitio.js" defer></script>
 *
 * Atributos opcionales del contenedor:
 *   data-nexo-api="https://<nexo>"     dónde está Nexo (por defecto, el mismo origen que este script)
 *   data-nexo-tipos="noticia,galeria"  qué secciones dibujar y en qué orden (por defecto: noticia,proyecto,galeria)
 *   data-nexo-limite="24"              cuántas publicaciones pedir (1 a 100; por defecto 50)
 *   data-nexo-actualizar="300"         volver a consultar cada N segundos (por defecto no; mínimo 60)
 *   data-nexo-titulo="Novedades"       título del bloque (vacío para no mostrarlo)
 *
 * Solo lee la API pública (sin sesión ni cookies): /api/publico/sitios/<sitio>/publicaciones, que devuelve
 * únicamente lo que la Autoridad Superior aprobó para ese sitio, con los avisos urgentes vigentes primero.
 * Todo lo que llega se escribe como texto (nunca como HTML) y las URL de archivos se validan antes de usarlas.
 */
(function () {
  "use strict";

  const VERSION = "1.0.0";
  const TIPOS = {
    noticia: { titulo: "Noticias", singular: "Noticia", vacio: "Todavía no hay noticias publicadas." },
    proyecto: { titulo: "Proyectos institucionales", singular: "Proyecto", vacio: "Todavía no hay proyectos publicados." },
    galeria: { titulo: "Galerías de fotos", singular: "Galería", vacio: "Todavía no hay galerías publicadas." },
  };
  const ORDEN_POR_DEFECTO = ["noticia", "proyecto", "galeria"];
  const RUTA_ADJUNTO = /^\/api\/publico\/adjuntos\/[0-9a-f]{24}$/;

  // Origen de Nexo por defecto: de dónde se cargó este script (document.currentScript solo existe ahora).
  const ORIGEN_SCRIPT = (() => {
    try { return new URL(document.currentScript.src).origin; } catch (e) { return location.origin; }
  })();

  /* ---------- Ayudas ---------- */

  /** Crea un elemento con clase, atributos y texto. Nunca usa innerHTML con datos que vienen de la API. */
  function el(etiqueta, { clase, texto, attrs } = {}, hijos = []) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto != null) nodo.textContent = texto;
    if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null) nodo.setAttribute(k, v);
    for (const h of hijos) if (h) nodo.append(h);
    return nodo;
  }

  /** Iconos de trazo (SVG estático, sin datos externos). */
  const ICONOS = {
    alerta: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    fotos: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    archivo: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    cerrar: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    flecha: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  };
  function icono(nombre) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "nexo-icono");
    svg.innerHTML = ICONOS[nombre];
    return svg;
  }

  const FECHA = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
  const fecha = (iso) => (iso ? FECHA.format(new Date(iso)) : "");

  /** URL absoluta de un adjunto de Nexo, o null si no tiene la forma esperada. */
  function urlAdjunto(api, ruta) {
    return typeof ruta === "string" && RUTA_ADJUNTO.test(ruta) ? api + ruta : null;
  }

  const imagenesDe = (api, p) => (p.imagenes || []).map((i) => ({ ...i, url: urlAdjunto(api, i.url) })).filter((i) => i.url);

  /** Texto en párrafos (doble salto = párrafo nuevo, salto simple = línea nueva). */
  function parrafos(texto) {
    return String(texto || "").split(/\n{2,}/).filter((t) => t.trim()).map((bloque) => {
      const p = el("p");
      bloque.trim().split("\n").forEach((linea, i) => { if (i) p.append(el("br")); p.append(linea); });
      return p;
    });
  }

  /* Contenido completo con formato (editor de Nexo). Nexo ya lo guarda limpio, pero acá se vuelve a filtrar con la
   * misma lista blanca antes de mostrarlo: se lee en un <template> (inerte: no ejecuta nada ni carga imágenes) y se
   * reconstruye nodo por nodo. Solo pasan párrafos, H2, H3, negrita, cursiva, listas, enlaces http/https/mailto/tel
   * (se abren en otra pestaña) y la alineación del texto. */
  const FORMATO_ETIQUETAS = { P: "p", BR: "br", STRONG: "strong", B: "strong", EM: "em", I: "em", H1: "h2", H2: "h2", H3: "h3",
    H4: "h3", H5: "h3", H6: "h3", UL: "ul", OL: "ol", LI: "li", A: "a", DIV: "p" };
  const FORMATO_FUERA = /^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|SVG|MATH|TEMPLATE|NOSCRIPT|TEXTAREA|SELECT|BUTTON|INPUT|IMG|VIDEO|AUDIO|CANVAS|FORM|HEAD|TITLE|LINK|META)$/;

  function copiarFormato(origen, destino) {
    Array.from(origen.childNodes).forEach((nodo) => {
      if (nodo.nodeType === 3) { destino.append(nodo.nodeValue.replace(/ /g, " ")); return; }
      if (nodo.nodeType !== 1 || FORMATO_FUERA.test(nodo.nodeName.toUpperCase())) return;
      const etiqueta = FORMATO_ETIQUETAS[nodo.nodeName.toUpperCase()];
      if (!etiqueta) { copiarFormato(nodo, destino); return; } // span, font…: solo el texto
      if (etiqueta === "a") {
        let href = String(nodo.getAttribute("href") || "").trim();
        if (/^www\.[^\s/]+\.\S+$/i.test(href)) href = `https://${href}`;
        if (!/^(https?:\/\/|mailto:|tel:)/i.test(href)) { copiarFormato(nodo, destino); return; }
        const a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        copiarFormato(nodo, a);
        destino.append(a);
        return;
      }
      const nuevo = document.createElement(etiqueta);
      if (/^(p|h2|h3|li)$/.test(etiqueta)) {
        const clase = /(?:^|\s)ql-align-(center|right|justify)(?:\s|$)/.exec(nodo.getAttribute("class") || "");
        const estilo = /text-align\s*:\s*(center|right|justify)/i.exec(nodo.getAttribute("style") || "");
        const alinear = clase ? clase[1] : estilo && estilo[1].toLowerCase();
        if (alinear) nuevo.style.textAlign = alinear;
      }
      copiarFormato(nodo, nuevo);
      if (etiqueta === "p" && !nuevo.textContent.trim()) return; // párrafos vacíos fuera
      destino.append(nuevo);
    });
  }

  /** El contenido completo como nodos: con formato si lo tiene; si no (contenidos anteriores), el texto en párrafos. */
  function cuerpoConFormato(p) {
    if (p && p.cuerpoHtml) {
      const plantilla = document.createElement("template");
      plantilla.innerHTML = String(p.cuerpoHtml);
      const caja = document.createElement("div");
      copiarFormato(plantilla.content, caja);
      if (caja.childNodes.length) return Array.from(caja.childNodes);
    }
    return parrafos(p && p.cuerpo);
  }

  const vigenteHasta = (p) => (p.urgenteHasta ? `Vigente hasta el ${fecha(p.urgenteHasta)}` : "");

  /* ---------- Piezas ---------- */

  function marcaPrioritario() {
    return el("span", { clase: "nexo-marca-prioritario" }, [icono("alerta"), "Prioritario"]);
  }

  /** Imagen que, si no carga, deja el recuadro con un fondo neutro en vez de un ícono roto. */
  function imagen(url, alt, clase) {
    const img = el("img", { clase, attrs: { src: url, alt, loading: "lazy", decoding: "async" } });
    img.addEventListener("error", () => img.classList.add("nexo-img--error"), { once: true });
    return img;
  }

  /** Tarjeta de noticia, proyecto o galería. Al activarla abre el detalle. */
  function tarjeta(ctx, p) {
    const fotos = imagenesDe(ctx.api, p);
    const clase = `nexo-tarjeta nexo-tarjeta--${p.tipo}${p.urgente ? " nexo-tarjeta--prioritaria" : ""}`;
    const cuerpo = el("span", { clase: "nexo-tarjeta__cuerpo" }, [
      el("span", { clase: "nexo-tarjeta__tope" }, [
        p.urgente ? marcaPrioritario() : null,
        el("span", { clase: "nexo-etiqueta", texto: p.seccion }),
      ]),
      el("span", { clase: "nexo-tarjeta__titulo", texto: p.titulo }),
      p.tipo !== "galeria" ? el("span", { clase: "nexo-tarjeta__resumen", texto: p.resumen }) : null,
      el("span", { clase: "nexo-tarjeta__pie" }, [
        el("span", { texto: p.tipo === "galeria" ? `${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"}` : fecha(p.fecha) }),
        el("span", { clase: "nexo-tarjeta__ver" }, [p.tipo === "galeria" ? "Ver álbum" : "Leer más", icono("flecha")]),
      ]),
    ]);

    let media = null;
    if (p.tipo === "noticia" || p.tipo === "galeria") {
      media = el("span", { clase: "nexo-tarjeta__media" }, [
        fotos.length ? imagen(fotos[0].url, "", "nexo-tarjeta__img") : el("span", { clase: "nexo-tarjeta__sin-img" }, [icono("fotos")]),
        p.tipo === "galeria" && fotos.length > 1 ? el("span", { clase: "nexo-tarjeta__contador" }, [icono("fotos"), String(fotos.length)]) : null,
      ]);
    }
    const boton = el("button", { clase, attrs: { type: "button", "aria-haspopup": "dialog" } }, [media, cuerpo]);
    boton.addEventListener("click", () => abrirDetalle(ctx, p));
    return el("li", {}, [boton]);
  }

  /** Banda de avisos prioritarios: arriba de todo, para que no compitan con el resto. */
  function bandaPrioritarios(ctx, urgentes) {
    if (!urgentes.length) return null;
    const [principal, ...otros] = urgentes;
    const abrir = (p) => {
      const b = el("button", { clase: "nexo-aviso__enlace", attrs: { type: "button", "aria-haspopup": "dialog" } });
      b.addEventListener("click", () => abrirDetalle(ctx, p));
      return b;
    };
    const grande = abrir(principal);
    grande.classList.add("nexo-aviso__principal");
    grande.append(
      el("span", { clase: "nexo-aviso__seccion", texto: [TIPOS[principal.tipo] && TIPOS[principal.tipo].singular, principal.seccion].filter(Boolean).join(" · ") }),
      el("strong", { clase: "nexo-aviso__titulo", texto: principal.titulo }),
      el("span", { clase: "nexo-aviso__resumen", texto: principal.resumen }),
      el("span", { clase: "nexo-aviso__pie", texto: vigenteHasta(principal) || `Publicado el ${fecha(principal.fecha)}` }),
    );
    const lista = otros.length ? el("ul", { clase: "nexo-aviso__otros" }, otros.map((p) => {
      const b = abrir(p);
      b.append(el("strong", { texto: p.titulo }), el("span", { texto: vigenteHasta(p) || p.seccion }), icono("flecha"));
      return el("li", {}, [b]);
    })) : null;
    return el("section", { clase: "nexo-aviso", attrs: { "aria-label": "Avisos prioritarios" } }, [
      el("p", { clase: "nexo-aviso__rotulo" }, [icono("alerta"), urgentes.length === 1 ? "Aviso prioritario" : `Avisos prioritarios · ${urgentes.length}`]),
      grande,
      lista,
    ]);
  }

  function seccion(ctx, tipo, lista) {
    const info = TIPOS[tipo];
    const id = `${ctx.idBase}-${tipo}`;
    return el("section", { clase: `nexo-seccion nexo-seccion--${tipo}`, attrs: { "aria-labelledby": id } }, [
      el("h3", { clase: "nexo-seccion__titulo", texto: info.titulo, attrs: { id } }),
      lista.length
        ? el("ul", { clase: `nexo-grilla nexo-grilla--${tipo}` }, lista.map((p) => tarjeta(ctx, p)))
        : el("p", { clase: "nexo-vacio", texto: info.vacio }),
    ]);
  }

  /* ---------- Visor de fotos (lightbox) ----------
   * La foto ampliada y centrada sobre un fondo oscuro translúcido. Se cierra con la X, Escape o tocando el fondo;
   * las flechas (botones, teclado o deslizar) pasan de foto. Va en la capa superior, arriba del detalle. */
  let visorActual = null;

  function crearVisor() {
    const d = el("dialog", { clase: "nexo-visor", attrs: { "aria-roledescription": "visor de fotos" } });
    const img = el("img", { clase: "nexo-visor__img", attrs: { alt: "" } });
    const pie = el("figcaption", { clase: "nexo-visor__pie", attrs: { "aria-live": "polite" } });
    const boton = (clase, texto, etiqueta) => el("button", { clase: `nexo-visor__boton ${clase}`, texto, attrs: { type: "button", "aria-label": etiqueta } });
    const cerrar = boton("nexo-visor__cerrar", "✕", "Cerrar la foto");
    const anterior = boton("nexo-visor__nav nexo-visor__nav--anterior", "‹", "Foto anterior");
    const siguiente = boton("nexo-visor__nav nexo-visor__nav--siguiente", "›", "Foto siguiente");
    d.append(el("div", { clase: "nexo-visor__marco" }, [el("figure", { clase: "nexo-visor__figura" }, [img, pie])]), cerrar, anterior, siguiente);
    document.body.append(d);
    const v = { d, anterior, siguiente, fotos: [], indice: 0, titulo: "", origen: null };
    v.mostrar = (i) => {
      v.indice = (i + v.fotos.length) % v.fotos.length;
      const f = v.fotos[v.indice];
      img.src = f.url;
      img.alt = f.nombre ? `${v.titulo}: ${f.nombre}` : v.titulo;
      pie.textContent = v.fotos.length > 1 ? `${v.titulo} · ${v.indice + 1} de ${v.fotos.length}` : v.titulo;
    };
    cerrar.addEventListener("click", () => d.close());
    anterior.addEventListener("click", () => v.mostrar(v.indice - 1));
    siguiente.addEventListener("click", () => v.mostrar(v.indice + 1));
    d.addEventListener("click", (e) => { if (e.target === d || e.target.classList.contains("nexo-visor__marco")) d.close(); });
    d.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); v.mostrar(v.indice - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); v.mostrar(v.indice + 1); }
    });
    let inicioX = null;
    d.addEventListener("pointerdown", (e) => { inicioX = e.clientX; });
    d.addEventListener("pointerup", (e) => {
      if (inicioX == null || v.fotos.length < 2) return;
      const dx = e.clientX - inicioX;
      inicioX = null;
      if (Math.abs(dx) > 50) v.mostrar(v.indice + (dx < 0 ? 1 : -1));
    });
    d.addEventListener("close", () => {
      document.documentElement.classList.remove("nexo-visor-abierto");
      if (v.origen && v.origen.isConnected) v.origen.focus();
    });
    return v;
  }

  function abrirVisor(fotos, indice, titulo, origen) {
    visorActual = visorActual || crearVisor();
    const v = visorActual;
    Object.assign(v, { fotos, titulo, origen });
    v.anterior.hidden = v.siguiente.hidden = fotos.length < 2;
    v.d.setAttribute("aria-label", `Fotos: ${titulo}`);
    v.mostrar(indice);
    document.documentElement.classList.add("nexo-visor-abierto");
    if (!v.d.open) { if (typeof v.d.showModal === "function") v.d.showModal(); else v.d.setAttribute("open", ""); }
    v.d.querySelector(".nexo-visor__cerrar").focus();
  }

  /** Foto que se amplía en el visor al tocarla. */
  function botonFoto(fotos, i, titulo, clase, etiqueta) {
    const b = el("button", { clase: `nexo-foto-boton ${clase || ""}`, attrs: { type: "button", "aria-label": etiqueta } }, [imagen(fotos[i].url, "", "")]);
    b.addEventListener("click", () => abrirVisor(fotos, i, titulo, b));
    return b;
  }

  /** Álbum: cuadrícula de miniaturas del mismo tamaño (o null si no hay fotos). */
  function album(fotos, titulo) {
    if (!fotos.length) return null;
    return el("div", { clase: "nexo-album" }, [
      el("p", { clase: "nexo-album__ayuda", texto: `${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"} · Tocá una para verla en grande` }),
      el("ul", { clase: "nexo-album__grilla" }, fotos.map((f, i) =>
        el("li", {}, [botonFoto(fotos, i, titulo, "nexo-album__foto", `Ver foto ${i + 1} de ${fotos.length}${f.nombre ? `: ${f.nombre}` : ""}`)]))),
    ]);
  }

  /* ---------- Detalle (diálogo) ---------- */

  function dialogo() {
    let d = document.getElementById("nexo-detalle");
    if (d) return d;
    d = el("dialog", { clase: "nexo-detalle", attrs: { id: "nexo-detalle", "aria-labelledby": "nexo-detalle-titulo" } });
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); }); // clic en el fondo
    document.body.append(d);
    return d;
  }

  function abrirDetalle(ctx, p) {
    const d = dialogo();
    const fotos = imagenesDe(ctx.api, p);
    const documentos = (p.documentos || []).map((a) => ({ ...a, url: urlAdjunto(ctx.api, a.url) })).filter((a) => a.url);
    const cerrar = el("button", { clase: "nexo-detalle__cerrar", attrs: { type: "button", "aria-label": "Cerrar" } }, [icono("cerrar")]);
    cerrar.addEventListener("click", () => d.close());

    const contenido = el("article", { clase: `nexo-detalle__articulo nexo-detalle__articulo--${p.tipo}` }, [
      cerrar,
      p.urgente ? el("p", { clase: "nexo-detalle__prioritario" }, [icono("alerta"), el("strong", { texto: "Aviso prioritario" }), vigenteHasta(p) ? ` · ${vigenteHasta(p)}` : ""]) : null,
      el("span", { clase: "nexo-etiqueta", texto: p.seccion }),
      el("h2", { clase: "nexo-detalle__titulo", texto: p.titulo, attrs: { id: "nexo-detalle-titulo" } }),
      el("p", { clase: "nexo-detalle__fecha", texto: `Publicado el ${fecha(p.fecha)}` }),
      p.tipo !== "galeria" && fotos[0] ? botonFoto(fotos, 0, p.titulo, "nexo-detalle__portada", "Ampliar la foto") : null,
      el("p", { clase: "nexo-detalle__resumen", texto: p.resumen }),
      el("div", { clase: "nexo-detalle__texto nexo-texto-formato" }, cuerpoConFormato(p)),
      // galería: todas las fotos en un álbum; noticia o proyecto: las demás imágenes. Cada una se amplía en el visor.
      album(p.tipo === "galeria" ? fotos : fotos.slice(1), p.titulo),
      documentos.length
        ? el("div", { clase: "nexo-detalle__documentos" }, [
          el("h3", { texto: "Documentos" }),
          el("ul", {}, documentos.map((a) => el("li", {}, [
            el("a", { attrs: { href: a.url, rel: "noopener" } }, [icono("archivo"), a.nombre]),
          ]))),
        ])
        : null,
    ]);
    d.classList.toggle("nexo-detalle--galeria", p.tipo === "galeria");
    d.replaceChildren(contenido);
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
    cerrar.focus();
  }

  /* ---------- Carga ---------- */

  async function pedir(ctx) {
    const url = `${ctx.api}/api/publico/sitios/${encodeURIComponent(ctx.sitio)}/publicaciones?limite=${ctx.limite}`;
    // sin cookies: el sitio nunca actúa con la sesión de nadie en Nexo
    const respuesta = await fetch(url, { credentials: "omit", headers: { Accept: "application/json" } });
    const datos = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      const mensaje = datos && datos.error && datos.error.mensaje;
      throw new Error(mensaje || `Nexo respondió ${respuesta.status}.`);
    }
    if (!Array.isArray(datos)) throw new Error("Nexo devolvió una respuesta inesperada.");
    return datos;
  }

  function dibujar(ctx, publicaciones) {
    const urgentes = publicaciones.filter((p) => p.urgente);
    const partes = [
      ctx.titulo ? el("h2", { clase: "nexo-publicaciones__titulo", texto: ctx.titulo }) : null,
      bandaPrioritarios(ctx, urgentes),
      // los prioritarios también quedan en su sección (marcados), así nadie los busca solo arriba
      ...ctx.tipos.map((tipo) => seccion(ctx, tipo, publicaciones.filter((p) => p.tipo === tipo))),
    ];
    ctx.raiz.replaceChildren(...partes.filter(Boolean));
    ctx.raiz.setAttribute("aria-busy", "false");
    ctx.raiz.dispatchEvent(new CustomEvent("nexo:cargado", { detail: { publicaciones } }));
  }

  function dibujarError(ctx, error) {
    const reintentar = el("button", { clase: "nexo-boton", texto: "Reintentar", attrs: { type: "button" } });
    reintentar.addEventListener("click", () => cargar(ctx));
    ctx.raiz.replaceChildren(el("div", { clase: "nexo-error", attrs: { role: "alert" } }, [
      el("p", { texto: "No pudimos cargar las publicaciones en este momento." }),
      el("p", { clase: "nexo-error__detalle", texto: error.message }),
      reintentar,
    ]));
    ctx.raiz.setAttribute("aria-busy", "false");
    ctx.raiz.dispatchEvent(new CustomEvent("nexo:error", { detail: { error } }));
  }

  function dibujarCargando(ctx) {
    const esqueleto = () => el("li", { clase: "nexo-esqueleto" }, [el("span"), el("span"), el("span")]);
    ctx.raiz.replaceChildren(el("ul", { clase: "nexo-grilla", attrs: { "aria-hidden": "true" } }, [esqueleto(), esqueleto(), esqueleto()]));
    ctx.raiz.setAttribute("aria-busy", "true");
  }

  async function cargar(ctx, { silencioso = false } = {}) {
    if (!silencioso) dibujarCargando(ctx);
    try {
      dibujar(ctx, await pedir(ctx));
    } catch (error) {
      if (!silencioso) dibujarError(ctx, error); // en una actualización periódica se conserva lo que ya se ve
    }
  }

  let contador = 0;

  /** Lee la configuración del contenedor y lo llena. Devuelve el contexto (o null si falta el sitio). */
  function montar(raiz) {
    const sitio = (raiz.dataset.nexoSitio || "").trim();
    if (!/^[a-z0-9-]+$/.test(sitio)) {
      console.error("nexo-sitio: falta data-nexo-sitio (por ejemplo, data-nexo-sitio=\"adultos-mayores\").", raiz);
      return null;
    }
    const api = (raiz.dataset.nexoApi || ORIGEN_SCRIPT).replace(/\/+$/, "");
    const tipos = (raiz.dataset.nexoTipos || ORDEN_POR_DEFECTO.join(",")).split(",").map((t) => t.trim()).filter((t) => TIPOS[t]);
    const limite = Math.min(100, Math.max(1, parseInt(raiz.dataset.nexoLimite, 10) || 50));
    const titulo = raiz.dataset.nexoTitulo === undefined ? "Novedades" : raiz.dataset.nexoTitulo;
    const ctx = { raiz, sitio, api, tipos: tipos.length ? tipos : ORDEN_POR_DEFECTO, limite, titulo, idBase: `nexo-${++contador}` };

    raiz.classList.add("nexo-publicaciones");
    raiz.setAttribute("aria-live", "polite");
    cargar(ctx);

    const cada = parseInt(raiz.dataset.nexoActualizar, 10);
    if (cada >= 60) {
      setInterval(() => { if (document.visibilityState === "visible") cargar(ctx, { silencioso: true }); }, cada * 1000);
    }
    return ctx;
  }

  function iniciar() {
    document.querySelectorAll("[data-nexo-sitio]").forEach(montar);
  }

  window.NexoSitio = { version: VERSION, montar, iniciar };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
