/* nexo-cliente.js — conexión de los sitios con Nexo institucional (compartido por los tres sitios).
 *
 * Pide a Nexo las publicaciones aprobadas para ESTE sitio y se las pasa al dibujante de cada página
 * (js/nexo/secciones.js, el mismo en los tres sitios), que las muestra con la estructura compartida.
 * Cada sección (noticias, proyectos, galería) pide lo suyo: muestra las últimas y, si hay más,
 * un botón "Ver todas" que trae las siguientes de a tandas.
 *
 *   GET {api}/api/publico/sitios/{sitio}/publicaciones?tipo=noticia&limite=9
 *   GET {api}/api/publico/sitios/{sitio}/publicaciones?tipo=noticia&limite=25&desde=8   (al tocar "Ver todas")
 *
 * Nexo devuelve solo lo que la Autoridad Superior aprobó para este sitio, con los avisos prioritarios
 * vigentes primero y después el resto, del más reciente al más antiguo.
 *
 * Si Nexo no responde, el sitio conserva el contenido que ya tiene escrito en el HTML (no queda vacío).
 * Todo lo que llega se escribe como texto, nunca como HTML, y solo se usan archivos servidos por Nexo.
 */
(function () {
  "use strict";

  const config = window.NEXO_CONFIG || {};
  const API = String(config.api || "").replace(/\/+$/, "");
  const RUTA_ADJUNTO = /^\/api\/publico\/adjuntos\/[0-9a-f]{24}$/;

  const meta = document.querySelector('meta[name="nexo-sitio"]');
  const SITIO = meta ? meta.content.trim() : "";

  /* ---------- Ayudas para dibujar ---------- */

  /** Crea un elemento con clase, atributos y texto. Nunca usa innerHTML con datos de la API. */
  function el(etiqueta, { clase, texto, attrs } = {}, hijos = []) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto != null) nodo.textContent = texto;
    if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null) nodo.setAttribute(k, v);
    for (const h of hijos) if (h) nodo.append(h);
    return nodo;
  }

  /** Ícono de Font Awesome (los tres sitios ya cargan la librería). */
  const icono = (nombre) => el("i", { clase: `fa-solid ${nombre}`, attrs: { "aria-hidden": "true" } });

  const ZONA = "America/Argentina/Buenos_Aires";
  const FECHA = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: ZONA });
  const FECHA_LARGA = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: ZONA });
  const MES = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: ZONA });
  const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

  const fecha = (iso) => (iso ? FECHA.format(new Date(iso)) : "");
  const fechaLarga = (iso) => (iso ? mayuscula(FECHA_LARGA.format(new Date(iso))) : "");
  const mesYAnio = (iso) => (iso ? mayuscula(MES.format(new Date(iso))) : "");

  /** URL absoluta de un archivo de Nexo, o null si no tiene la forma esperada. */
  const urlAdjunto = (ruta) => (typeof ruta === "string" && RUTA_ADJUNTO.test(ruta) ? API + ruta : null);

  /** Imágenes y documentos de una publicación, con URL absoluta y validada. */
  const imagenes = (p) => (p.imagenes || []).map((i) => ({ nombre: i.nombre, url: urlAdjunto(i.url) })).filter((i) => i.url);
  const documentos = (p) => (p.documentos || []).map((d) => ({ nombre: d.nombre, url: urlAdjunto(d.url) })).filter((d) => d.url);

  /** Texto en párrafos: doble salto = párrafo nuevo, salto simple = línea nueva. */
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

  /** "Vigente hasta el 22 de octubre de 2026" (si el aviso prioritario tiene fecha de fin). */
  const vigencia = (p) => (p.urgente && p.urgenteHasta ? `Vigente hasta el ${fecha(p.urgenteHasta)}` : "");

  /** Marca «Prioritario» para las tarjetas (texto + ícono: no depende solo del color). */
  const marcaPrioritario = () => el("span", { clase: "nexo-prioritario" }, [icono("fa-triangle-exclamation"), "Prioritario"]);

  /** Lista de documentos para un detalle (o null si no hay). */
  function listaDocumentos(p) {
    const docs = documentos(p);
    if (!docs.length) return null;
    return el("div", { clase: "nexo-documentos" }, [
      el("h4", { texto: "Documentos" }),
      el("ul", {}, docs.map((d) => el("li", {}, [
        el("a", { attrs: { href: d.url, rel: "noopener" } }, [icono("fa-file-arrow-down"), d.nombre]),
      ]))),
    ]);
  }

  /** Imagen que, si no carga, se oculta en lugar de mostrar un ícono roto. */
  function imagen(url, alt, clase) {
    const img = el("img", { clase, attrs: { src: url, alt, loading: "lazy", decoding: "async" } });
    img.addEventListener("error", () => { img.hidden = true; }, { once: true });
    return img;
  }

  /** Hace que un elemento que no es botón se active con clic, Enter o Espacio. */
  function activable(nodo, accion, etiqueta) {
    nodo.setAttribute("role", "button");
    nodo.setAttribute("tabindex", "0");
    if (etiqueta) nodo.setAttribute("aria-label", etiqueta);
    nodo.addEventListener("click", accion);
    nodo.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); accion(); }
    });
    return nodo;
  }

  /* ---------- Visor de fotos (lightbox) ----------
   * Una foto ampliada, centrada, sobre un fondo oscuro translúcido. Se cierra con la X, con Escape o tocando
   * fuera de la foto; las flechas (botones, teclado o deslizar en el celular) pasan a la anterior o siguiente.
   * Es un <dialog> propio en la capa superior: queda arriba de cualquier modal del sitio.
   */
  let visorActual = null;

  function crearVisor() {
    const d = el("dialog", { clase: "nexo-visor", attrs: { "aria-roledescription": "visor de fotos" } });
    const img = el("img", { clase: "nexo-visor__img", attrs: { alt: "" } });
    const pie = el("figcaption", { clase: "nexo-visor__pie", attrs: { "aria-live": "polite" } });
    const cerrar = el("button", { clase: "nexo-visor__boton nexo-visor__cerrar", texto: "✕", attrs: { type: "button", "aria-label": "Cerrar la foto" } });
    const anterior = el("button", { clase: "nexo-visor__boton nexo-visor__nav nexo-visor__nav--anterior", texto: "‹", attrs: { type: "button", "aria-label": "Foto anterior" } });
    const siguiente = el("button", { clase: "nexo-visor__boton nexo-visor__nav nexo-visor__nav--siguiente", texto: "›", attrs: { type: "button", "aria-label": "Foto siguiente" } });
    const figura = el("figure", { clase: "nexo-visor__figura" }, [img, pie]);
    d.append(el("div", { clase: "nexo-visor__marco" }, [figura]), cerrar, anterior, siguiente);
    document.body.append(d);

    const v = { d, img, pie, anterior, siguiente, fotos: [], indice: 0, titulo: "", origen: null };
    v.mostrar = (i) => {
      v.indice = (i + v.fotos.length) % v.fotos.length;
      const f = v.fotos[v.indice];
      img.src = f.url;
      img.alt = f.nombre ? `${v.titulo}: ${f.nombre}` : v.titulo;
      pie.textContent = v.fotos.length > 1 ? `${v.titulo} · ${v.indice + 1} de ${v.fotos.length}` : v.titulo;
      // se precargan la anterior y la siguiente para que el cambio sea inmediato
      [v.indice - 1, v.indice + 1].forEach((j) => { const g = v.fotos[(j + v.fotos.length) % v.fotos.length]; if (g) new Image().src = g.url; });
    };
    cerrar.addEventListener("click", () => d.close());
    anterior.addEventListener("click", () => v.mostrar(v.indice - 1));
    siguiente.addEventListener("click", () => v.mostrar(v.indice + 1));
    // tocar el fondo (fuera de la foto y de los botones) cierra
    d.addEventListener("click", (e) => { if (e.target === d || e.target.classList.contains("nexo-visor__marco")) d.close(); });
    d.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); v.mostrar(v.indice - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); v.mostrar(v.indice + 1); }
    });
    // deslizar con el dedo
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

  /** Abre la foto "indice" de la lista en el visor. "origen" recibe el foco al cerrar. */
  function visor(fotos, indice, titulo, origen) {
    if (!fotos.length) return;
    visorActual = visorActual || crearVisor();
    const v = visorActual;
    Object.assign(v, { fotos, titulo: titulo || "", origen: origen || document.activeElement });
    v.anterior.hidden = v.siguiente.hidden = fotos.length < 2;
    v.d.setAttribute("aria-label", `Fotos: ${v.titulo}`);
    v.mostrar(indice);
    document.documentElement.classList.add("nexo-visor-abierto"); // sin scroll de la página detrás
    if (!v.d.open) { if (typeof v.d.showModal === "function") v.d.showModal(); else v.d.setAttribute("open", ""); }
    v.d.querySelector(".nexo-visor__cerrar").focus();
  }

  const visorAbierto = () => Boolean(visorActual && visorActual.d.open);

  /**
   * Álbum: cuadrícula de miniaturas del mismo tamaño. Cada una es un botón que abre la foto en el visor.
   * Devuelve null si no hay fotos.
   */
  function album(fotos, titulo) {
    if (!fotos.length) return null;
    return el("div", { clase: "nexo-album" }, [
      el("p", { clase: "nexo-album__ayuda" }, [
        icono("fa-images"), `${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"} · Tocá una para verla en grande`,
      ]),
      el("ul", { clase: "nexo-album__grilla" }, fotos.map((f, i) => {
        const boton = el("button", {
          clase: "nexo-album__foto",
          attrs: { type: "button", "aria-label": `Ver foto ${i + 1} de ${fotos.length}${f.nombre ? `: ${f.nombre}` : ""}` },
        }, [imagen(f.url, "")]);
        boton.addEventListener("click", () => visor(fotos, i, titulo, boton));
        return el("li", {}, [boton]);
      })),
    ]);
  }

  /* ---------- Pedidos a Nexo ---------- */

  /** GET /api/publico/sitios/{sitio}/publicaciones con los parámetros dados (tipo, limite, desde, urgentes). */
  async function pedir(parametros) {
    const consulta = new URLSearchParams(Object.entries(parametros).filter(([, v]) => v != null && v !== ""));
    const url = `${API}/api/publico/sitios/${encodeURIComponent(SITIO)}/publicaciones?${consulta}`;
    // sin cookies: el sitio nunca actúa con la sesión de nadie en Nexo
    const respuesta = await fetch(url, { credentials: "omit", headers: { Accept: "application/json" } });
    const datos = await respuesta.json().catch(() => null);
    if (!respuesta.ok) throw new Error((datos && datos.error && datos.error.mensaje) || `Nexo respondió ${respuesta.status}`);
    if (!Array.isArray(datos)) throw new Error("Nexo devolvió una respuesta inesperada");
    return datos;
  }

  /* ---------- Una sección con "Ver todas" ----------
   * Muestra las primeras N (portada) y, si hay más, un botón debajo de la grilla:
   *   "Ver todas las noticias" -> trae la tanda siguiente; mientras queden, "Cargar más noticias";
   *   cuando ya se ve todo y había más de N, "Mostrar solo las últimas" vuelve a la portada.
   * Se pide una de más (N + 1) para saber si hay más sin contar el total.
   */
  const NOMBRES = { noticia: "noticias", proyecto: "proyectos", galeria: "álbumes" };
  const TEXTOS = {
    noticia: { todas: "Ver todas las noticias", mas: "Cargar más noticias", menos: "Mostrar solo las últimas" },
    proyecto: { todas: "Ver todos los proyectos", mas: "Cargar más proyectos", menos: "Mostrar solo los últimos" },
    galeria: { todas: "Ver todos los álbumes", mas: "Cargar más álbumes", menos: "Mostrar solo los últimos" },
  };
  const PORTADA_POR_DEFECTO = { noticia: 6, proyecto: 6, galeria: 6 };
  const PORTADA_CELULAR_POR_DEFECTO = { noticia: 4, proyecto: 3, galeria: 4 };
  // en pantallas angostas las grillas quedan en una columna: se muestran menos al abrir
  const esCelular = () => window.matchMedia && window.matchMedia("(max-width: 700px)").matches;
  const LOTE = Math.min(100, Math.max(1, parseInt(config.lote, 10) || 24));

  function seccion(tipo, grilla, { tarjeta, vacio: textoVacio }) {
    const portada = Math.min(99, Math.max(1, esCelular()
      ? (parseInt(grilla.dataset.nexoPortadaCelular, 10)
        || (config.portadaCelular && parseInt(config.portadaCelular[tipo], 10)) || PORTADA_CELULAR_POR_DEFECTO[tipo])
      : (parseInt(grilla.dataset.nexoPortada, 10)
        || (config.portada && parseInt(config.portada[tipo], 10)) || PORTADA_POR_DEFECTO[tipo])));
    const nombre = NOMBRES[tipo];
    const textos = TEXTOS[tipo];
    // lista: todo lo que ya se trajo de Nexo; mostrando: cuántas se ven; hayMas: Nexo tiene más después de la lista
    const estado = { lista: [], hayMas: false, mostrando: 0 };
    if (!grilla.id) grilla.id = `nexo-${tipo}`;

    const boton = el("button", { clase: "nexo-ver-mas", attrs: { type: "button", "aria-controls": grilla.id } });
    const contenedorBoton = el("div", { clase: "nexo-ver-mas-caja" }, [boton]);

    function dibujar(cuantas) {
      estado.mostrando = Math.min(cuantas, estado.lista.length);
      const visibles = estado.lista.slice(0, estado.mostrando);
      grilla.replaceChildren(...(visibles.length ? visibles.map(tarjeta) : [vacio(textoVacio)]));
      actualizarBoton();
    }

    function actualizarBoton() {
      boton.disabled = false;
      contenedorBoton.hidden = !estado.hayMas && estado.lista.length <= portada;
      if (estado.mostrando <= portada) {
        boton.replaceChildren(textos.todas, icono("fa-chevron-down"));
        boton.setAttribute("aria-expanded", "false");
      } else if (estado.hayMas || estado.mostrando < estado.lista.length) {
        boton.replaceChildren(textos.mas, icono("fa-chevron-down"));
        boton.setAttribute("aria-expanded", "false");
      } else {
        boton.replaceChildren(textos.menos, icono("fa-chevron-up"));
        boton.setAttribute("aria-expanded", "true");
      }
    }

    /** Lleva el foco a la primera tarjeta que se agregó (para quien navega con teclado o lector de pantalla). */
    function enfocar(indice) {
      const tarjetaNueva = grilla.children[indice];
      if (tarjetaNueva && tarjetaNueva.focus) tarjetaNueva.focus();
    }

    async function alTocar() {
      const antes = estado.mostrando;
      // 1. ya se habían traído (se volvió a la portada): se muestran de nuevo, sin pedir nada
      if (estado.mostrando < estado.lista.length) {
        dibujar(estado.lista.length);
        enfocar(antes);
        return;
      }
      // 2. ya se ve todo: vuelve a la portada
      if (!estado.hayMas) {
        dibujar(portada);
        grilla.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // 3. se pide la tanda siguiente a Nexo (una de más, para saber si quedan)
      boton.disabled = true;
      boton.replaceChildren("Cargando…");
      try {
        const nuevas = await pedir({ tipo, limite: LOTE + 1, desde: estado.lista.length });
        estado.hayMas = nuevas.length > LOTE;
        estado.lista.push(...nuevas.slice(0, LOTE));
        dibujar(estado.lista.length);
        enfocar(antes);
      } catch (error) {
        console.warn(`Nexo: no se pudieron cargar más ${nombre} (${error.message}).`);
        boton.disabled = false;
        boton.replaceChildren("No se pudo cargar. Reintentar", icono("fa-rotate-right"));
      }
    }
    boton.addEventListener("click", alTocar);

    return {
      async cargar() {
        const primeras = await pedir({ tipo, limite: portada + 1, desde: 0 });
        estado.hayMas = primeras.length > portada;
        estado.lista = primeras.slice(0, portada);
        dibujar(portada);
        if (!contenedorBoton.isConnected) grilla.after(contenedorBoton);
        return estado.lista;
      },
    };
  }

  /**
   * Conecta las secciones de la página con Nexo.
   *   secciones: { noticia: { tarjeta, vacio }, proyecto: {...}, galeria: {...} }  (las que la página tenga)
   *   franja(prioritarios): nodo con los avisos prioritarios vigentes, o null; va arriba de la grilla de noticias.
   * Cada sección carga por su cuenta: si una falla, conserva el contenido original del HTML y las demás siguen.
   */
  async function conectar({ secciones, franja }) {
    if (!API || !/^[a-z0-9-]+$/.test(SITIO)) {
      console.warn("Nexo: falta configurar la dirección (js/nexo/config.js) o el sitio (<meta name=\"nexo-sitio\">).");
      return;
    }
    const tareas = Object.entries(secciones).map(async ([tipo, opciones]) => {
      const grilla = document.querySelector(`[data-nexo="${tipo}"]`);
      if (!grilla) return true;
      grilla.setAttribute("aria-busy", "true");
      try {
        await seccion(tipo, grilla, opciones).cargar();
        return true;
      } catch (error) {
        console.warn(`Nexo: no se pudieron cargar las ${NOMBRES[tipo]} (${error.message}). Se muestra el contenido original de la página.`);
        return false;
      } finally {
        grilla.setAttribute("aria-busy", "false");
      }
    });
    // los avisos prioritarios de todos los tipos (vigentes), para la franja de arriba
    const avisos = franja ? pedir({ urgentes: 1, limite: 10 }).catch(() => []) : Promise.resolve([]);

    const resultados = await Promise.all(tareas);
    const prioritarios = await avisos;
    const grillaNoticias = document.querySelector('[data-nexo="noticia"]');
    document.querySelectorAll(".nexo-aviso").forEach((x) => x.remove());
    const nodo = franja && prioritarios.length ? franja(prioritarios) : null;
    if (nodo && grillaNoticias) grillaNoticias.before(nodo);

    const todoBien = resultados.every(Boolean);
    document.documentElement.dataset.nexo = todoBien ? "conectado" : "sin-conexion";
    document.dispatchEvent(new CustomEvent(todoBien ? "nexo:cargado" : "nexo:error"));
  }

  /** Mensaje para una sección sin publicaciones. */
  const vacio = (texto) => el("p", { clase: "nexo-vacio", texto });

  window.NexoCliente = {
    SITIO, API, conectar, el, icono, fecha, fechaLarga, mesYAnio, imagenes, documentos, parrafos, cuerpoConFormato, vigencia,
    visor, visorAbierto, album,
    marcaPrioritario, listaDocumentos, imagen, activable, vacio,
  };
})();
