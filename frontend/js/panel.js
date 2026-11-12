/* panel.js — interfaz del panel editorial.
 * Todo acceso a datos pasa por Nexo.api, así el backend se conecta sin tocar este archivo.
 */
(function () {
  "use strict";

  const { api, util } = Nexo;
  const { esc, fechaCorta, iniciales, slugify, tamano, normalizar } = util;
  const $ = (selector, raiz = document) => raiz.querySelector(selector);

  /* ---------- Iconos ---------- */

  const TRAZOS = {
    alerta: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    panel: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/><polyline points="12 7 12 12 15 14"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    fileCheck: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    arrowUpRight: '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>',
    chevronRight: '<polyline points="9 18 15 12 9 6"/>',
    paperclip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  };

  const icono = (nombre, clase = "") =>
    `<svg class="icono ${clase}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${TRAZOS[nombre]}</svg>`;

  /* ---------- Configuración ---------- */

  const VISTAS = [
    { id: "resumen", menu: "Panel de control", pestana: "Resumen", iconoMenu: "panel", iconoPestana: "panel" },
    { id: "borradores", menu: "Mis borradores", pestana: "Borradores", iconoMenu: "pencil", iconoPestana: "pencil", permiso: "crear" },
    { id: "revision", menu: "Revisión editorial", pestana: "Revisión", iconoMenu: "fileCheck", iconoPestana: "inbox" },
    { id: "historial", menu: "Historial y archivo", pestana: "Historial", iconoMenu: "archive", iconoPestana: "history" },
    { id: "equipo", menu: "Equipo y roles", pestana: "Equipo", iconoMenu: "users", iconoPestana: "user" },
    { id: "auditoria", menu: "Control y auditoría", pestana: "Auditoría", iconoMenu: "shield", iconoPestana: "shield", permiso: "auditoria" },
  ];

  /** Estados que siguen en el circuito (aparecen en la bandeja de revisión). */
  const ABIERTOS = ["en_revision", "elevado", "aprobado", "devuelto"];

  const ETIQUETA_EVENTO = {
    prioridad: "Cambió la prioridad",
    borrador_creado: "Borrador iniciado",
    adjunto_agregado: "Adjuntó un archivo",
    adjunto_quitado: "Quitó un archivo",
    borrador_descartado: "Borrador descartado",
    envio: "Enviada a revisión",
    elevacion: "Elevada a la autoridad superior",
    aprobacion: "Aprobada por la autoridad superior",
    devolucion: "Devuelta con observaciones",
    rechazo: "Rechazada por la autoridad superior",
    publicacion: "Publicada",
    archivo: "Archivada",
    restauracion: "Restaurada",
  };

  const DESCRIPCION_VERSION = {
    en_revision: "En revisión de dirección.",
    elevada: "Elevada a la autoridad superior, pendiente de su decisión.",
    devuelta: "Devuelta con observaciones.",
    aprobada: "Aprobada por la autoridad superior, pendiente de publicación.",
    rechazada: "Rechazada por la autoridad superior: el contenido quedó cerrado.",
    publicada: "Publicada y visible para el público.",
    reemplazada: "Reemplazada por una actualización posterior.",
    conservada: "Conservada como respaldo institucional.",
    archivada: "Archivada: oculta del público, con su registro conservado.",
  };

  const EXTENSIONES_OK = ["jpg", "jpeg", "png", "webp", "avif", "pdf", "doc", "docx", "txt"];
  const FORMATOS_OK = "imágenes JPG, PNG, WEBP o AVIF; documentos PDF, Word o TXT";
  /** Tipo MIME que informa el navegador para cada imagen. Vacío u octet-stream se aceptan (algunos sistemas no
   *  reconocen WEBP/AVIF); el servidor igual verifica el contenido real del archivo. */
  const MIMES_IMAGEN = {
    jpg: ["image/jpeg"], jpeg: ["image/jpeg"], png: ["image/png"], webp: ["image/webp"], avif: ["image/avif"],
  };
  const mimeCoincide = (extension, tipo) =>
    !MIMES_IMAGEN[extension] || !tipo || tipo === "application/octet-stream" || MIMES_IMAGEN[extension].includes(tipo);
  const MAX_BYTES = 10 * 1024 * 1024;
  const MAX_ADJUNTOS = 8;
  const FILTROS_INICIALES = { q: "", estado: "todos", sitio: "todos", seccion: "todas", prioridad: "todas", orden: "recientes" };

  /** Qué se espera de cada tipo de contenido en el sitio de destino. */
  const AYUDA_TIPO = {
    noticia: "Noticia: la primera imagen adjunta se usa como foto de la tarjeta. El resumen se ve en la tarjeta y el contenido completo al abrirla.",
    proyecto: "Proyecto: la categoría se muestra como etiqueta (ej. TERAPÉUTICO) y el resumen como descripción de la tarjeta.",
    galeria: "Galería: adjuntá las fotos del álbum (JPG, PNG, WEBP o AVIF). La primera es la portada; el título es el nombre del álbum.",
  };

  /* ---------- Estado ---------- */

  const estado = {
    usuario: null,
    usuarios: [],
    contenidos: [],
    vista: "resumen",
    filtros: { ...FILTROS_INICIALES },
    seleccionRevision: null,
    seleccionHistorial: null,
    borradores: [], // propios: contenidos nuevos sin enviar y nuevas versiones en preparación
    editor: null, // el borrador abierto en el editor (ver abrirEditor)
    integranteEnEdicion: null,
  };

  /* ---------- Helpers ---------- */

  const ult = (c) => c.versiones[c.versiones.length - 1];

  const nombreUsuario = (id) => {
    const u = estado.usuarios.find((x) => x.id === id);
    return u ? u.nombre : "Usuario dado de baja";
  };

  const sitioPorId = (id) => api.sitios.find((x) => x.id === id) || null;
  const tipoPorId = (id) => api.tipos.find((x) => x.id === id) || null;

  const sitiosDe = (ids) => (ids || []).map(sitioPorId).filter(Boolean);
  /** "Adultos Mayores, Mama Antula y Centro de Día" */
  function enumerar(nombres) {
    return nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}` : nombres.join("");
  }
  const nombresSitios = (ids) => enumerar(sitiosDe(ids).map((x) => x.corto));

  /** Etiqueta "Adultos Mayores + Centro de Día · Noticia" (o aviso si el contenido es anterior a los sitios). */
  function destino(c) {
    const sitios = sitiosDe(c.sitiosDestino);
    if (!sitios.length) return `<span class="destino destino--sin" title="Enviá una nueva versión para elegir el sitio">Sin sitio asignado</span>`;
    const tipo = tipoPorId(c.tipo);
    return `<span class="destino" title="${esc(sitios.map((x) => x.nombre).join(" · "))}">${esc(sitios.map((x) => x.corto).join(" + "))}${tipo ? ` · ${esc(tipo.nombre)}` : ""}</span>`;
  }

  /* Indicador de visibilidad para quien crea: lo calcula la API (campo "visibilidad") con los mismos datos que lee
   * la vista pública, así "Visible en…" significa exactamente "lo muestra ese sitio". */
  const ICONO_VISIBILIDAD = {
    visible: "globe", visible_con_cambios: "globe", pendiente: "clock", listo: "check", devuelto: "history",
    rechazado: "x", retirado: "archive", borrador: "pencil", sin_destino: "alerta",
  };
  const CLASE_VISIBILIDAD = {
    visible: "visible", visible_con_cambios: "visible", pendiente: "pendiente", listo: "pendiente", devuelto: "alerta",
    rechazado: "cerrado", retirado: "cerrado", borrador: "cerrado", sin_destino: "alerta",
  };

  /** compacto: una línea para listas; completo: con los sitios uno por uno y lo que está pendiente. */
  function indicadorVisibilidad(c, { compacto = false } = {}) {
    const vis = c.visibilidad;
    if (!vis) return "";
    const clase = `visibilidad visibilidad--${CLASE_VISIBILIDAD[vis.codigo] || "cerrado"}`;
    const ico = icono(ICONO_VISIBILIDAD[vis.codigo] || "clock");
    if (compacto) {
      const texto = vis.visible ? `Visible en ${nombresSitios(vis.sitios)}` : vis.texto.split(":")[0].split(" (")[0];
      return `<span class="${clase}" title="${esc(vis.texto + (vis.pendiente ? ` · ${vis.pendiente}` : ""))}">${ico}${esc(texto)}${vis.pendiente ? " · cambios pendientes" : ""}</span>`;
    }
    // un renglón por sitio de destino (o publicado): visible / pendiente
    const ids = [...new Set([...(vis.sitios || []), ...(vis.sitiosDestino || [])])];
    const orden = api.sitios.map((x) => x.id).filter((id) => ids.includes(id));
    const filas = orden.map((id) => {
      const sitio = sitioPorId(id);
      const visible = vis.sitios.includes(id);
      const sale = visible && !vis.sitiosDestino.includes(id) && vis.codigo === "visible_con_cambios";
      const estadoSitio = visible
        ? (sale ? "Visible · deja de verse si se aprueba la versión nueva" : "Visible")
        : ["pendiente", "visible_con_cambios"].includes(vis.codigo) ? "Pendiente de aprobación"
          : vis.codigo === "listo" ? "Aprobado, sin publicar" : "No visible";
      return `<li class="visibilidad-sitio visibilidad-sitio--${visible ? "si" : "no"}">
          <span class="visibilidad-sitio__marca" aria-hidden="true">${icono(visible ? "check" : "clock")}</span>
          <span class="visibilidad-sitio__nombre">${visible && c.slug
            ? `<a href="publico.html?sitio=${encodeURIComponent(id)}#${encodeURIComponent(c.slug)}" target="_blank" rel="noopener">${esc(sitio ? sitio.nombre : id)}</a>`
            : esc(sitio ? sitio.nombre : id)}</span>
          <span class="visibilidad-sitio__estado">${estadoSitio}</span>
        </li>`;
    }).join("");
    return `
      <section class="estado-publicacion estado-publicacion--${CLASE_VISIBILIDAD[vis.codigo] || "cerrado"}" aria-label="Estado de publicación">
        <p class="estado-publicacion__titulo">${ico}${esc(filas ? vis.texto.replace(/ \(destino: [^)]*\)$/, "") : vis.texto)}</p>
        ${vis.pendiente ? `<p class="estado-publicacion__pendiente">${esc(vis.pendiente)}</p>` : ""}
        ${filas ? `<ul class="estado-publicacion__sitios">${filas}</ul>` : ""}
      </section>`;
  }

  /** Observado (devuelto) y le toca a quien mira corregirlo: solo el autor (mismas reglas que el servidor). */
  const aCorregirPor = (yo, c) => c.estado === "devuelto" && api.puedeEditarContenido(yo, c);
  const observadosPara = (yo) => estado.contenidos.filter((c) => aCorregirPor(yo, c));

  /** Lo que el usuario actual tiene que resolver: es lo que cuenta la insignia de la pestaña. */
  function pendientesPara(yo) {
    return estado.contenidos.filter((c) =>
      (c.estado === "en_revision" && api.puedeRevisar(yo, c))
      || (c.estado === "elevado" && api.puedeDecidir(yo, c))
      || (c.estado === "aprobado" && api.puede(yo, "publicar"))
      || aCorregirPor(yo, c)
    ).length;
  }

  /* ---------- Prioridad ---------- */

  const esUrgente = (p) => Boolean(p) && p.nivel === "urgente";

  /** Lo urgente que espera una acción de esta persona, del que más espera al que menos. */
  function urgentesPara(yo) {
    return estado.contenidos.filter((c) => esUrgente(c.prioridad) && (
      (c.estado === "en_revision" && api.puedeRevisar(yo, c))
      || (c.estado === "elevado" && api.puedeDecidir(yo, c))
      || (c.estado === "aprobado" && api.puede(yo, "publicar"))
    )).sort((a, b) => Date.parse(a.actualizado) - Date.parse(b.actualizado));
  }

  /** Quién puede ajustar la prioridad de algo enviado (igual que el backend). */
  function puedeCambiarPrioridad(yo, c) {
    if (!api.puede(yo, "revisar") && !api.puede(yo, "decidir")) return false;
    if (["en_revision", "elevado", "aprobado"].includes(c.estado)) return true;
    return c.estado === "publicado" && api.puede(yo, "publicar");
  }

  /** "AAAA-MM-DD" -> fin de ese día en hora argentina (como lo interpreta el servidor). */
  const finDelDiaAR = (dia) => new Date(`${dia}T23:59:59.999-03:00`);
  /** Fecha ISO -> "AAAA-MM-DD" del calendario argentino (para los <input type="date">). */
  const diaAR = (iso) => (iso ? new Date(Date.parse(iso) - 3 * 3600 * 1000).toISOString().slice(0, 10) : "");
  const vencida = (vence) => Boolean(vence) && (/^\d{4}-\d{2}-\d{2}$/.test(vence) ? finDelDiaAR(vence) : new Date(vence)) < new Date();

  /** Etiqueta "Urgente": color, ícono y texto (el color nunca es la única señal). */
  const marcaUrgente = (p, extra = "") => (esUrgente(p)
    ? `<span class="marca-urgente${extra}" title="${esc(p.motivo ? `Urgente: ${p.motivo}` : "Contenido prioritario")}">${icono("alerta")}Urgente</span>` : "");

  /** Si este contenido espera una acción de esta persona (lo mismo que cuenta la insignia). */
  const esperaA = (yo, c) => (c.estado === "en_revision" && api.puedeRevisar(yo, c))
    || (c.estado === "elevado" && api.puedeDecidir(yo, c))
    || (c.estado === "aprobado" && api.puede(yo, "publicar"))
    || aCorregirPor(yo, c);

  /** Grupo de urgentes de la bandeja: primero lo que le toca a quien mira, y dentro, lo que más espera. */
  const ordenUrgentes = (yo) => (a, b) => Number(esperaA(yo, b)) - Number(esperaA(yo, a)) || ordenBandeja(a, b);

  /** Comparador de bandeja: urgente primero y, dentro de cada nivel, lo que más espera. */
  const ordenBandeja = (a, b) => Number(esUrgente(b.prioridad)) - Number(esUrgente(a.prioridad))
    || Date.parse(a.actualizado) - Date.parse(b.actualizado);

  const hayAutoridad = () => estado.usuarios.some((u) => u.rol === "autoridad");
  const enCircuito = () => estado.contenidos.filter((c) => ["en_revision", "elevado"].includes(c.estado));

  const pill = (est) =>
    `<span class="estado estado--${est}"><span class="estado__punto"></span>${esc(api.estados[est])}</span>`;

  function saludoHora() {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 20) return "Buenas tardes";
    return "Buenas noches";
  }

  function vistaDesdeHash() {
    const h = location.hash.slice(1);
    return VISTAS.some((v) => v.id === h) ? h : "resumen";
  }

  function filtrar(base) {
    const f = estado.filtros;
    const busqueda = normalizar(f.q);
    const lista = base.filter((c) => {
      if (f.estado !== "todos" && c.estado !== f.estado) return false;
      if (f.sitio !== "todos") {
        // destino elegido o sitio donde ya está visible
        const ids = [...(c.sitiosDestino || []), ...((c.visibilidad && c.visibilidad.sitios) || [])];
        if (!(ids.length ? ids : ["sin"]).includes(f.sitio)) return false;
      }
      if (f.seccion !== "todas" && c.seccion !== f.seccion) return false;
      if (f.prioridad !== "todas" && (f.prioridad === "urgente") !== esUrgente(c.prioridad)) return false;
      if (!busqueda) return true;
      const sitios = sitiosDe(c.sitiosDestino).map((x) => `${x.nombre} ${x.corto}`).join(" ");
      const texto = normalizar([ult(c).titulo, sitios, c.seccion, c.slug, nombreUsuario(c.autorId)].join(" "));
      return texto.includes(busqueda);
    });
    const comparar = {
      recientes: (a, b) => new Date(b.actualizado) - new Date(a.actualizado),
      antiguos: (a, b) => new Date(a.actualizado) - new Date(b.actualizado),
      titulo: (a, b) => ult(a).titulo.localeCompare(ult(b).titulo, "es"),
      prioridad: ordenBandeja,
    }[f.orden];
    return lista.sort(comparar);
  }

  function contar(n) {
    $("#f-total").textContent = `${n} ${n === 1 ? "resultado" : "resultados"}`;
  }

  function aviso(texto, tipo = "ok") {
    const caja = document.createElement("div");
    caja.className = `aviso aviso--${tipo}`;
    caja.textContent = texto;
    $("#avisos").appendChild(caja);
    setTimeout(() => caja.remove(), tipo === "error" ? 6000 : 4000);
  }

  /** Confirmación previa. Con motivoObligatorio, el botón se habilita recién cuando hay un motivo (3+ letras). */
  const MOTIVO_MINIMO = 3;
  function confirmar({ titulo, texto, etiqueta = "Confirmar", conMotivo = false, motivoObligatorio = false, peligro = false }) {
    return new Promise((resolver) => {
      const dialogo = $("#dialogo");
      const ok = $("#dialogo-ok");
      const motivo = $("#dialogo-motivo");
      $("#dialogo-titulo").textContent = titulo;
      $("#dialogo-texto").textContent = texto;
      ok.textContent = etiqueta;
      ok.className = `btn ${peligro ? "btn--peligro-lleno" : "btn--primario"}`;
      $("#dialogo-motivo-caja").hidden = !conMotivo;
      $("#dialogo-motivo-etiqueta").textContent = motivoObligatorio ? "Motivo (obligatorio, queda en el historial)" : "Motivo (opcional)";
      motivo.value = "";
      motivo.required = motivoObligatorio;
      const habilitar = () => { ok.disabled = motivoObligatorio && motivo.value.trim().length < MOTIVO_MINIMO; };
      habilitar();
      motivo.addEventListener("input", habilitar);
      dialogo.addEventListener("close", () => {
        motivo.removeEventListener("input", habilitar);
        ok.disabled = false;
        const confirmado = dialogo.returnValue === "ok" && !(motivoObligatorio && motivo.value.trim().length < MOTIVO_MINIMO);
        resolver({ ok: confirmado, motivo: motivo.value.trim() });
      }, { once: true });
      dialogo.returnValue = "";
      dialogo.showModal();
      if (motivoObligatorio) motivo.focus();
    });
  }

  /* ---------- Carga y refresco de datos ---------- */

  async function refrescar() {
    try {
      // el servidor ya los devuelve en orden de bandeja: urgente primero, después lo que más espera
      const [usuarios, contenidos] = await Promise.all([api.listarUsuarios(), api.listarContenidos({ orden: "prioridad" })]);
      estado.usuarios = usuarios;
      // lo que nunca se envió no es parte del circuito: vive solo en «Borradores»
      estado.contenidos = contenidos.filter((c) => c.estado !== "borrador");
      estado.borradores = contenidos.filter((c) => c.borrador);
      // la auditoría cambia con cada movimiento: se vuelve a pedir la próxima vez que se dibuje
      if (estado.auditoria) Object.assign(estado.auditoria, { directorio: null, resultado: null, resumen: null });
      const yo = usuarios.find((u) => u.id === estado.usuario.id);
      if (yo) estado.usuario = yo;
      render();
    } catch (err) {
      if (err.codigo === "sin_sesion") { location.replace("index.html"); return; }
      aviso(err.message || "No pudimos cargar los datos.", "error");
    }
  }

  async function ejecutar(promesa, mensajeOk) {
    try {
      const resultado = await promesa;
      if (mensajeOk) aviso(mensajeOk, "ok");
      await refrescar();
      return resultado;
    } catch (err) {
      if (err.codigo === "sin_sesion") { location.replace("index.html"); return null; }
      aviso(err.message || "No se pudo completar la acción.", "error");
      await refrescar();
      return null;
    }
  }

  /* ---------- Render: estructura común ---------- */

  const vistasPara = (usuario) => VISTAS.filter((v) => !v.permiso || api.puede(usuario, v.permiso));

  function construirMenu() {
    $("#menu").innerHTML = vistasPara(estado.usuario).map((v) =>
      `<a class="menu__enlace" href="#${v.id}" data-vista="${v.id}">${icono(v.iconoMenu)}<span>${v.menu}</span></a>`
    ).join("") +
      `<a class="menu__enlace" href="publico.html" target="_blank" rel="noopener">${icono("globe")}<span>Vista pública</span></a>`;
  }

  function renderLateral() {
    construirMenu(); // el rol puede cambiar (demo o un administrador que lo modifica)
    document.querySelectorAll("#menu [data-vista]").forEach((a) => {
      if (a.dataset.vista === estado.vista) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    const u = estado.usuario;
    $("#usuario-avatar").textContent = u.nombre.charAt(0).toUpperCase();
    $("#usuario-nombre").textContent = u.nombre;
    $("#usuario-rol").textContent = api.roles[u.rol].nombre;

    $("#demo").hidden = !api.modoDemo;
    $("#selector-demo").innerHTML = estado.usuarios.map((x) =>
      `<option value="${esc(x.id)}"${x.id === u.id ? " selected" : ""}>${esc(x.nombre)} · ${esc(api.roles[x.rol].nombre)}</option>`
    ).join("");
  }

  function renderCabecera() {
    const primerNombre = estado.usuario.nombre.split(/\s+/)[0];
    $("#saludo").textContent = `${saludoHora()}, ${primerNombre}`;

    const boton = $("#btn-nuevo");
    const puedeCrear = api.puede(estado.usuario, "crear");
    boton.disabled = !puedeCrear;
    boton.title = puedeCrear ? "" : "Tu rol es de solo lectura.";
  }

  function renderPestanas() {
    const pendientes = pendientesPara(estado.usuario);
    const propios = estado.borradores.length;
    $("#pestanas").innerHTML = vistasPara(estado.usuario).map((v) => {
      const activa = v.id === estado.vista ? ' aria-current="page"' : "";
      const urgentes = v.id === "revision" ? urgentesPara(estado.usuario).length : 0;
      let insignia = v.id === "revision" && pendientes
        ? `<span class="insignia${urgentes ? " insignia--urgente" : ""}" title="${pendientes} ${api.puede(estado.usuario, "revisar") || api.puedeDecidir(estado.usuario) ? (pendientes === 1 ? "espera tu decisión" : "esperan tu decisión") : "para corregir"}${urgentes ? `, ${urgentes} ${urgentes === 1 ? "urgente" : "urgentes"}` : ""}">${urgentes ? icono("alerta") : ""}${pendientes}</span>` : "";
      if (v.id === "borradores" && propios) insignia = `<span class="insignia insignia--suave" title="${propios} en preparación">${propios}</span>`;
      return `<a class="pestana" href="#${v.id}"${activa}>${icono(v.iconoPestana)}<span>${v.pestana}</span>${insignia}</a>`;
    }).join("");
  }

  function renderFiltros() {
    $("#filtros").hidden = ["equipo", "borradores", "auditoria"].includes(estado.vista);

    const hayHuerfanos = estado.contenidos.some((c) => !sitiosDe(c.sitiosDestino).length);
    const selectSitio = $("#f-sitio");
    selectSitio.innerHTML = `<option value="todos">Todos los sitios</option>` +
      api.sitios.map((x) => `<option value="${esc(x.id)}">${esc(x.corto)}</option>`).join("") +
      (hayHuerfanos ? `<option value="sin">Sin sitio asignado</option>` : "");
    if (![...selectSitio.options].some((o) => o.value === estado.filtros.sitio)) estado.filtros.sitio = "todos";
    selectSitio.value = estado.filtros.sitio;

    const secciones = [...new Set(estado.contenidos.map((c) => c.seccion))].sort((a, b) => a.localeCompare(b, "es"));
    const select = $("#f-seccion");
    select.innerHTML = `<option value="todas">Todas las categorías</option>` +
      secciones.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
    if (!secciones.includes(estado.filtros.seccion)) estado.filtros.seccion = "todas";
    select.value = estado.filtros.seccion;

    $("#lista-secciones").innerHTML = secciones.map((s) => `<option value="${esc(s)}"></option>`).join("");
    $("#f-prioridad").value = estado.filtros.prioridad;
  }

  function restablecerFiltros() {
    estado.filtros = { ...FILTROS_INICIALES };
    $("#f-q").value = "";
    $("#f-estado").value = "todos";
    $("#f-sitio").value = "todos";
    $("#f-orden").value = "recientes";
    $("#f-prioridad").value = "todas";
  }

  function render() {
    renderLateral();
    renderCabecera();
    renderPestanas();
    renderFiltros();
    renderVista();
  }

  function renderVista() {
    const vistas = {
      resumen: vistaResumen,
      revision: vistaRevision,
      historial: vistaHistorial,
      equipo: vistaEquipo,
      borradores: vistaBorradores,
      auditoria: vistaAuditoria,
    };
    // una vista que este rol no tiene (ej. un observador con #borradores en la URL) vuelve al resumen
    if (!vistasPara(estado.usuario).some((v) => v.id === estado.vista)) estado.vista = "resumen";
    $("#vista").innerHTML = vistas[estado.vista]();
  }

  /* ---------- Vista: resumen ---------- */

  function tarjetaMetrica(m) {
    return `
      <article class="metrica">
        <div class="metrica__tope">
          <span class="chip-icono chip-icono--${m.tono}">${icono(m.icono)}</span>
          <span class="metrica__mas">${icono("more")}</span>
        </div>
        <p class="metrica__etiqueta">${m.etiqueta}</p>
        <p class="metrica__fila"><span class="metrica__valor">${m.valor}</span><span class="metrica__nota">${m.nota}</span></p>
      </article>`;
  }

  function filaActividad(c) {
    const v = ult(c);
    const adjuntos = v.adjuntos.length
      ? `<span class="fila__adjuntos">${icono("paperclip")}${v.adjuntos.length}</span>` : "";
    return `
      <li>
        <button type="button" class="fila${esUrgente(c.prioridad) ? " fila--urgente" : ""}" data-accion="abrir-contenido" data-id="${esc(c.id)}">
          <span class="chip-icono chip-icono--verde">${icono("fileText")}</span>
          <span class="fila__texto">
            <span class="fila__titulo">${marcaUrgente(c.prioridad)}${esc(v.titulo)} ${pill(c.estado)}</span>
            <span class="fila__meta">${destino(c)} ${esc(c.seccion)} · v${v.numero} · Actualizado ${fechaCorta(c.actualizado)} ${adjuntos}</span>
            <span class="fila__visibilidad">${indicadorVisibilidad(c, { compacto: true })}</span>
          </span>
          ${icono("chevronRight", "fila__flecha")}
        </button>
      </li>`;
  }

  /** Lo que se dice de cuánto lleva esperando: "hace 3 días", "hoy". */
  function esperando(iso) {
    const dias = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
    if (dias <= 0) return "desde hoy";
    if (dias === 1) return "desde ayer";
    return `hace ${dias} días`;
  }

  /* ---------- Observaciones de los revisores ---------- */

  const NIVEL_OBSERVACION = { direccion: "Revisión de dirección", autoridad: "Decisión final" };
  const nombreRol = (rol) => (api.roles[rol] ? api.roles[rol].nombre : rol);
  const pendientesDe = (c) => (c.observaciones || []).filter((o) => !o.atendida);

  /** El mensaje del revisor: cada línea, un punto a corregir (si hay una sola, un párrafo). */
  function mensajeObservacion(texto) {
    const lineas = String(texto || "").split(/\n+/).map((l) => l.replace(/^\s*[-•*·]\s*/, "").trim()).filter(Boolean);
    if (lineas.length <= 1) return `<p class="observacion__texto">${esc(lineas[0] || "")}</p>`;
    return `<ul class="observacion__puntos">${lineas.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`;
  }

  function tarjetaObservacion(o) {
    const estadoObs = o.atendida
      ? `<span class="observacion__estado observacion__estado--atendida">${icono("check")}Atendida en la versión ${o.atendidaEnVersion}</span>`
      : `<span class="observacion__estado observacion__estado--pendiente">${icono("alerta")}Pendiente</span>`;
    return `
      <li class="observacion observacion--${o.atendida ? "atendida" : "pendiente"}">
        <div class="observacion__cabecera">
          <span class="avatar avatar--chico" aria-hidden="true">${esc(iniciales(nombreUsuario(o.usuarioId)))}</span>
          <p class="observacion__quien">
            <strong>${esc(nombreUsuario(o.usuarioId))}</strong>
            <span>${esc(nombreRol(o.rol))} · ${NIVEL_OBSERVACION[o.nivel] || ""} · sobre la versión ${o.version} · ${fechaCorta(o.fecha)}</span>
          </p>
          ${estadoObs}
        </div>
        ${mensajeObservacion(o.mensaje)}
      </li>`;
  }

  /** Lista de observaciones (las más recientes primero). */
  const listaObservaciones = (lista) =>
    `<ol class="observaciones__lista">${[...lista].reverse().map(tarjetaObservacion).join("")}</ol>`;

  /** Historial completo de observaciones de un contenido, plegado (para revisores y autores). */
  function historialObservaciones(c, { abierto = false } = {}) {
    const todas = c.observaciones || [];
    if (!todas.length) return "";
    const pendientes = pendientesDe(c).length;
    return `
      <details class="observaciones"${abierto ? " open" : ""}>
        <summary class="observaciones__resumen">
          ${icono("history")}<span>Observaciones de los revisores (${todas.length})</span>
          ${pendientes ? `<span class="observaciones__contador">${pendientes} ${pendientes === 1 ? "pendiente" : "pendientes"}</span>` : ""}
        </summary>
        ${listaObservaciones(todas)}
      </details>`;
  }

  /** Aviso del resumen para el autor: lo que le devolvieron con observaciones. */
  function avisoObservados() {
    const lista = observadosPara(estado.usuario);
    if (!lista.length) return "";
    const n = lista.length;
    const filas = lista.slice(0, 4).map((c) => {
      const ultima = pendientesDe(c).at(-1);
      const quien = ultima ? `${esc(nombreUsuario(ultima.usuarioId))} (${esc(nombreRol(ultima.rol))}) · ${fechaCorta(ultima.fecha)}` : "";
      const primera = ultima ? String(ultima.mensaje).split(/\n/)[0] : "";
      return `
        <li>
          <button type="button" class="aviso-observado__item" data-accion="abrir-contenido" data-id="${esc(c.id)}">
            <strong>${esc(ult(c).titulo)}</strong>
            <span>${quien}</span>
            ${primera ? `<span class="aviso-observado__cita">“${esc(primera.slice(0, 140))}${primera.length > 140 ? "…" : ""}”</span>` : ""}
          </button>
        </li>`;
    }).join("");
    return `
      <section class="aviso-observado" role="region" aria-labelledby="t-aviso-observado">
        <div class="aviso-observado__cabecera">
          <span class="aviso-observado__icono">${icono("history")}</span>
          <div>
            <h3 class="aviso-observado__titulo" id="t-aviso-observado">${n === 1 ? "Te devolvieron un contenido con observaciones" : `Te devolvieron ${n} contenidos con observaciones`}</h3>
            <p class="aviso-observado__texto">Leé qué piden corregir, editalo y reenvialo: vuelve a pasar por la revisión de dirección y la decisión final.</p>
          </div>
        </div>
        <ul class="aviso-observado__lista">${filas}</ul>
      </section>`;
  }

  /** Banner del resumen: lo urgente que espera una acción de quien mira. Nada que mostrar, nada en pantalla. */
  function alertaUrgentes() {
    const urgentes = urgentesPara(estado.usuario);
    if (!urgentes.length) return "";
    const QUE = { en_revision: "Revisión de dirección", elevado: "Decisión final", aprobado: "Falta publicar" };
    const filas = urgentes.slice(0, 3).map((c) => `
      <li>
        <button type="button" class="alerta-urgente__item" data-accion="abrir-contenido" data-id="${esc(c.id)}">
          <strong>${esc(ult(c).titulo)}</strong>
          <span>${QUE[c.estado]} · esperando ${esperando(c.actualizado)}${c.prioridad.motivo ? ` · ${esc(c.prioridad.motivo)}` : ""}</span>
        </button>
      </li>`).join("");
    const n = urgentes.length;
    return `
      <section class="alerta-urgente" role="region" aria-labelledby="t-alerta-urgente">
        <div class="alerta-urgente__cabecera">
          <span class="alerta-urgente__icono">${icono("alerta")}</span>
          <div>
            <h3 class="alerta-urgente__titulo" id="t-alerta-urgente">${n} ${n === 1 ? "contenido urgente espera" : "contenidos urgentes esperan"} tu decisión</h3>
            <p class="alerta-urgente__texto">Fueron marcados como prioritarios: atendelos antes que el resto de la bandeja.</p>
          </div>
          <button type="button" class="btn btn--urgente" data-accion="abrir-contenido" data-id="${esc(urgentes[0].id)}">Atender el más antiguo</button>
        </div>
        <ul class="alerta-urgente__lista">${filas}</ul>
        ${n > 3 ? `<a class="alerta-urgente__mas" href="#revision">Ver los ${n} en la bandeja</a>` : ""}
      </section>`;
  }

  function vistaResumen() {
    const todos = estado.contenidos;
    const lista = filtrar(todos);
    contar(lista.length);

    const versiones = todos.flatMap((c) => c.versiones);
    const metricas = [
      { etiqueta: "Contenidos totales", valor: todos.filter((c) => c.estado !== "archivado").length, nota: "en el circuito editorial", icono: "fileText", tono: "verde" },
      {
        etiqueta: "En circuito de aprobación", valor: enCircuito().length,
        nota: `${todos.filter((c) => c.estado === "en_revision").length} en dirección, ${todos.filter((c) => c.estado === "elevado").length} en autoridad`,
        icono: "clock", tono: "ambar",
      },
      { etiqueta: "Publicados", valor: todos.filter((c) => c.publicada).length, nota: "visibles en la web", icono: "globe", tono: "verde" },
      { etiqueta: "Versiones archivadas", valor: versiones.filter((v) => ["reemplazada", "conservada", "archivada"].includes(v.estado)).length, nota: "conservadas para consulta", icono: "archive", tono: "gris" },
    ];

    const filas = lista.slice(0, 6).map(filaActividad).join("");
    const vacio = `<li class="vacio">${todos.length
      ? "Ningún contenido coincide con los filtros."
      : "Todavía no hay actividad. Cargá el primer contenido con «Nuevo contenido»."}</li>`;

    return `
      <div class="encabezado-seccion">
        <div>
          <p class="etiqueta">Resumen operativo</p>
          <h2 class="titulo-seccion">La información correcta, en el momento correcto.</h2>
          <p class="bajada">Supervisá el estado de cada contenido y mantené una trazabilidad completa antes de hacerlo público.</p>
        </div>
        <a class="enlace-flecha" href="#revision">Ver bandeja de revisión ${icono("arrowUpRight")}</a>
      </div>

      ${avisoObservados()}
      ${alertaUrgentes()}

      <div class="metricas">${metricas.map(tarjetaMetrica).join("")}</div>

      <div class="rejilla rejilla--resumen">
        <section class="panel" aria-labelledby="t-actividad">
          <header class="panel__cabecera">
            <div>
              <h3 class="panel__titulo" id="t-actividad">Actividad reciente</h3>
              <p class="panel__sub">Últimas novedades del circuito editorial</p>
            </div>
            <a class="enlace-suave" href="#historial">Ver historial</a>
          </header>
          <ul class="filas">${filas || vacio}</ul>
        </section>

        <aside class="control">
          <div class="control__tope">
            <span class="chip-icono chip-icono--oscuro">${icono("shield")}</span>
            <span class="pildora pildora--lima">Control editorial</span>
          </div>
          <h3 class="control__titulo">La web pública bajo control.</h3>
          <p class="control__texto">Ningún contenido llega al sitio sin una decisión registrada y una versión identificable.</p>
          <ul class="control__lista">
            <li>${icono("checkCircle")}Revisión de dirección y decisión final de la autoridad superior</li>
            <li>${icono("history")}Historial de versiones inmutable</li>
            <li>${icono("lock")}Nada se publica sin la aprobación final</li>
          </ul>
          <a class="btn btn--lima btn--bloque" href="publico.html" target="_blank" rel="noopener">Explorar vista pública ${icono("arrowUpRight")}</a>
        </aside>
      </div>`;
  }

  /* ---------- Vista: revisión ---------- */

  /** "Editar" (publicado), "Preparar nueva versión" (devuelto) o "Continuar edición" si la persona ya tiene una en curso. */
  function botonNuevaVersion(c, clase) {
    const propio = c.borrador && api.esAutorDelBorrador(estado.usuario, c.borrador);
    const texto = propio ? "Continuar edición" : c.estado === "publicado" ? "Editar" : "Preparar nueva versión";
    return `<button type="button" class="btn ${clase}" data-accion="nueva-version" data-id="${esc(c.id)}">${icono(propio || c.estado === "publicado" ? "pencil" : "send")}${texto}</button>`;
  }

  /* ---------- Acciones por contenido: editar, dar de baja, reactivar ----------
   * Las mismas reglas que el servidor (backend/src/permisos.js): editar, el autor, un director de área o el
   * administrador; dar de baja y reactivar, ellos y la autoridad superior. El servidor vuelve a validar todo. */

  const ESTADOS_EDITABLES = ["publicado", "devuelto"];
  const ESTADOS_EN_CIRCUITO = ["en_revision", "elevado", "aprobado"];

  function accionesDe(c) {
    const yo = estado.usuario;
    const acciones = [];
    if (api.puedeEditarContenido(yo, c)) {
      if (ESTADOS_EDITABLES.includes(c.estado)) {
        const propio = c.borrador && api.esAutorDelBorrador(yo, c.borrador);
        acciones.push({ accion: "nueva-version", texto: propio ? "Continuar edición" : "Editar", icono: "pencil",
          nota: c.estado === "publicado" ? "La web sigue igual hasta que se apruebe" : "" });
      } else if (ESTADOS_EN_CIRCUITO.includes(c.estado)) {
        acciones.push({ texto: "Editar", icono: "pencil", nota: "En revisión: se edita cuando termine", deshabilitada: true });
      }
    }
    if (api.puedeDarDeBaja(yo, c)) {
      if (c.estado === "archivado") acciones.push({ accion: "restaurar", texto: "Reactivar", icono: "history", nota: "Vuelve al circuito, no a la web" });
      else acciones.push({ accion: "archivar", texto: "Dar de baja", icono: "archive", peligro: true,
        nota: c.visibilidad && c.visibilidad.visible ? "Deja de verse en los sitios" : "" });
    }
    return acciones;
  }

  /** Botón ⋯ con el menú de acciones de un contenido (vacío si quien mira no puede hacer nada). */
  function menuAcciones(c) {
    const acciones = accionesDe(c);
    if (!acciones.length) return "";
    const idMenu = `acciones-${c.id}`;
    const items = acciones.map((a) => {
      const nota = a.nota ? `<small>${esc(a.nota)}</small>` : "";
      return a.deshabilitada
        ? `<button type="button" role="menuitem" class="menu-acciones__item" aria-disabled="true">${icono(a.icono)}<span>${a.texto}${nota}</span></button>`
        : `<button type="button" role="menuitem" class="menu-acciones__item${a.peligro ? " menu-acciones__item--peligro" : ""}" data-accion="${a.accion}" data-id="${esc(c.id)}">${icono(a.icono)}<span>${a.texto}${nota}</span></button>`;
    }).join("");
    return `
      <div class="menu-acciones">
        <button type="button" class="menu-acciones__boton" data-accion="menu-acciones" aria-haspopup="menu" aria-expanded="false" aria-controls="${idMenu}" aria-label="Acciones para «${esc(ult(c).titulo)}»" title="Editar o dar de baja">${icono("more")}</button>
        <div class="menu-acciones__lista" id="${idMenu}" role="menu" aria-label="Acciones" hidden>${items}</div>
      </div>`;
  }

  function cerrarMenus({ devolverFoco = false } = {}) {
    document.querySelectorAll(".menu-acciones__lista:not([hidden])").forEach((lista) => {
      lista.hidden = true;
      const boton = document.querySelector(`[aria-controls="${lista.id}"]`);
      if (boton) {
        boton.setAttribute("aria-expanded", "false");
        if (devolverFoco) boton.focus();
      }
    });
  }

  function alternarMenu(boton) {
    const lista = document.getElementById(boton.getAttribute("aria-controls"));
    if (!lista) return;
    const abrir = lista.hidden;
    cerrarMenus();
    if (!abrir) return;
    lista.hidden = false;
    boton.setAttribute("aria-expanded", "true");
    const primero = lista.querySelector('[role="menuitem"]:not([aria-disabled="true"])') || lista.querySelector('[role="menuitem"]');
    if (primero) primero.focus();
  }

  /** Teclado dentro del menú: flechas para moverse, Escape para cerrar (el foco vuelve al botón ⋯). */
  function tecladoMenu(e) {
    const lista = e.target.closest(".menu-acciones__lista");
    if (e.key === "Escape" && document.querySelector(".menu-acciones__lista:not([hidden])")) {
      cerrarMenus({ devolverFoco: true });
      return;
    }
    if (!lista || !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const items = [...lista.querySelectorAll('[role="menuitem"]')];
    const i = items.indexOf(document.activeElement);
    const destino = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key];
    items[(destino + items.length) % items.length].focus();
  }

  /**
   * Un archivo adjunto tal como lo ve quien revisa: miniatura (imágenes), ver en el navegador y descargar.
   * "abre" dice si esta persona puede abrirlo (autor, revisores de la cadena o versión publicada);
   * el servidor lo vuelve a verificar en cada descarga.
   */
  function archivoRevision(a, abre) {
    const url = abre ? api.urlAdjunto(a.id) : null;
    const imagen = a.esImagen || esImagenNombre(a.nombre);
    const urlVer = url ? api.urlAdjunto(a.id, { ver: true, miniatura: true }) : null;
    const previa = urlVer && imagen
      ? `<button type="button" class="archivo__previa archivo__previa--boton" data-accion="ver-adjunto" data-adjunto="${esc(a.id)}" aria-label="Ver ${esc(a.nombre)}"><img src="${esc(urlVer)}" alt="" loading="lazy"></button>`
      : `<span class="archivo__previa" aria-hidden="true">${esc(extensionDe(a.nombre))}</span>`;
    let acciones;
    if (url) acciones = `<span class="archivo__acciones">${accionesArchivo(a, url)}</span>`;
    else if (!abre) acciones = `<span class="archivo__nota">Lo abren el autor y quienes revisan</span>`;
    else acciones = `<span class="archivo__nota">Archivo no disponible en este navegador</span>`;
    return `
      <li class="archivo">
        ${previa}
        <span class="archivo__datos">
          <strong title="${esc(a.nombre)}">${esc(a.nombre)}</strong>
          <small>${tamano(a.tamano)}</small>
          ${acciones}
        </span>
      </li>`;
  }

  /** Cómo se va a ver en el sitio: la misma jerarquía que la tarjeta pública (imagen, categoría, título, bajada). */
  function previaSitio(c, v, abre) {
    const imagen = v.adjuntos.find((a) => a.esImagen || esImagenNombre(a.nombre));
    const urlFoto = imagen && abre ? api.urlAdjunto(imagen.id, { ver: true, miniatura: true }) : null;
    const foto = urlFoto ? `<img src="${esc(urlFoto)}" alt="">` : (imagen ? `Foto: ${esc(imagen.nombre)}` : "Sin imagen");
    return `
      <div class="previa-sitio">
        <div class="previa-sitio__imagen">${foto}</div>
        <div class="previa-sitio__texto">
          <span class="previa-sitio__categoria">${esc(c.seccion)}</span>
          <strong class="previa-sitio__titulo">${esc(v.titulo)}</strong>
          <span class="previa-sitio__resumen">${esc(v.resumen)}</span>
        </div>
      </div>`;
  }


  /* La cadena de aprobación de un contenido: en qué escalón está y quién intervino. */
  function cadena(c) {
    const v = ult(c);
    const rev = v.revision;
    const dec = v.decision;
    const pasos = [
      { titulo: "Carga", rol: api.roles.colaborador.nombre, quien: nombreUsuario(v.autorId), estado: "hecho" },
      {
        titulo: "Revisión de dirección", rol: api.roles.director.nombre,
        quien: rev ? nombreUsuario(rev.usuarioId) : "",
        estado: rev ? (rev.tipo === "devolucion" ? "devuelto" : "hecho") : (c.estado === "en_revision" ? "actual" : "pendiente"),
      },
      {
        titulo: "Decisión final", rol: api.roles.autoridad.nombre,
        quien: dec ? nombreUsuario(dec.usuarioId) : "",
        estado: dec
          ? { aprobacion: "hecho", devolucion: "devuelto", rechazo: "rechazado" }[dec.tipo]
          : (c.estado === "elevado" ? "actual" : "pendiente"),
      },
    ];
    // Versiones cargadas antes de la cadena de tres niveles: tenían una sola decisión, del director.
    if (!rev && dec) { pasos[1].estado = "omitido"; }

    const NOTA = { hecho: "", actual: "En curso", pendiente: "Pendiente", devuelto: "Devolvió", rechazado: "Rechazó", omitido: "Sin registro" };
    return `
      <ol class="cadena" aria-label="Cadena de aprobación">
        ${pasos.map((p, i) => `
          <li class="cadena__paso cadena__paso--${p.estado}"${p.estado === "actual" ? ' aria-current="step"' : ""}>
            <span class="cadena__marca" aria-hidden="true">${p.estado === "hecho" ? icono("check") : i + 1}</span>
            <span class="cadena__texto">
              <strong>${p.titulo}</strong>
              <small>${esc(p.quien || p.rol)}${NOTA[p.estado] ? ` · ${NOTA[p.estado]}` : ""}</small>
            </span>
          </li>`).join("")}
      </ol>`;
  }

  /** Observaciones + botones de una instancia de decisión (revisión de dirección o decisión final). */
  const MAX_OBSERVACION = 2000;
  function formularioDecision({ nivel, id, ayuda, placeholder, botones }) {
    return `
      <div class="decision">
        <div class="decision__etiquetas">
          <label class="etiqueta" for="comentario-decision">Observaciones para el autor</label>
          <span class="decision__contador" id="contador-decision" aria-live="polite">0 / ${MAX_OBSERVACION}</span>
        </div>
        <p class="decision__ayuda" id="ayuda-decision">${ayuda}</p>
        <textarea class="campo decision__campo" id="comentario-decision" rows="5" maxlength="${MAX_OBSERVACION}" aria-describedby="ayuda-decision consejo-decision" placeholder="${placeholder}"></textarea>
        <p class="decision__consejo" id="consejo-decision">${icono("pencil")}Al devolver, escribí un punto por línea: el autor los ve como una lista de cosas a corregir.</p>
        <p class="error-inline" id="error-decision" role="alert" hidden></p>
        <div class="decision__acciones">
          ${botones.map((b) => `<button type="button" class="btn ${b.clase}" data-accion="${nivel}" data-decision="${b.decision}" data-id="${esc(id)}">${icono(b.icono)}${b.texto}</button>`).join("")}
        </div>
      </div>`;
  }

  const callout = (tipo, titulo, texto, acciones = "") => `
    <div class="callout callout--${tipo}">
      <div>${titulo ? `<p class="callout__titulo">${titulo}</p>` : ""}<p class="callout__texto">${texto}</p></div>
      ${acciones ? `<div class="callout__acciones">${acciones}</div>` : ""}
    </div>`;

  function bloqueDecision(c) {
    const yo = estado.usuario;
    const v = ult(c);

    if (c.estado === "en_revision") {
      if (api.puedeRevisar(yo, c)) {
        return formularioDecision({
          nivel: "revision", id: c.id,
          ayuda: "Revisión de dirección: elevalo a la autoridad superior o devolvelo al autor con observaciones (obligatorias al devolver).",
          placeholder: "Ej.:\nFalta la fecha de cierre de la inscripción.\nLa foto principal está pixelada.",
          botones: [
            { decision: "devolver", clase: "btn--peligro", icono: "history", texto: "Devolver con observaciones" },
            { decision: "elevar", clase: "btn--primario", icono: "arrowUpRight", texto: "Elevar a autoridad superior" },
          ],
        });
      }
      let motivo = "Está esperando la revisión de un director de área.";
      if (api.puede(yo, "revisar")) motivo = "No podés revisar un contenido que cargaste o editaste vos: lo revisa otro director de área o un administrador.";
      else if (api.puedeDecidir(yo)) motivo = "Todavía está en revisión de dirección. Te llega para la decisión final cuando un director lo eleve.";
      return callout("info", "", motivo);
    }

    if (c.estado === "elevado") {
      const rev = v.revision || {};
      const nota = `Elevado por ${esc(nombreUsuario(rev.usuarioId))} el ${fechaCorta(rev.fecha)}${rev.comentario ? `: “${esc(rev.comentario)}”` : "."}`;
      if (api.puede(yo, "decidir") && !api.puedeDecidir(yo, c)) {
        return callout("info", "Elevaste vos esta versión",
          "La decisión final la toma otra persona: la autoridad superior u otro administrador. Así siempre intervienen al menos dos personas.");
      }
      if (api.puedeDecidir(yo, c)) {
        return callout("info", "Revisión de dirección completa", nota) + formularioDecision({
          nivel: "decision", id: c.id,
          ayuda: `Decisión final. Aprobar lo publica en el acto en ${esc(nombresSitios(c.sitiosDestino)) || "los sitios elegidos"}; devolver lo manda al autor con tus observaciones para que lo corrija; rechazar lo cierra de forma definitiva. Devolver y rechazar requieren observaciones.`,
          placeholder: "Qué tiene que corregir el autor, o el motivo del rechazo…",
          botones: [
            { decision: "rechazar", clase: "btn--peligro", icono: "x", texto: "Rechazar" },
            { decision: "devolver", clase: "btn--claro", icono: "history", texto: "Devolver con observaciones" },
            { decision: "aprobar", clase: "btn--primario", icono: "check", texto: "Aprobar y publicar" },
          ],
        });
      }
      return callout("info", "Esperando la decisión final de la autoridad superior", nota);
    }

    if (c.estado === "aprobado") {
      if (api.puede(yo, "publicar")) {
        return callout("ok", "Aprobado, falta publicarlo",
          `Se restauró del archivo: no es visible hasta que lo vuelvas a publicar en ${esc(nombresSitios(c.sitiosDestino)) || "sus sitios"}.`,
          `<button type="button" class="btn btn--primario" data-accion="publicar" data-id="${esc(c.id)}">${icono("globe")}Volver a publicar</button>`);
      }
      return callout("info", "", "Aprobado por la autoridad superior. Falta que lo publique.");
    }

    // devuelto = observado: lo corrige el autor y vuelve a empezar la cadena
    return bloqueObservado(c);
  }

  function bloqueObservado(c) {
    const yo = estado.usuario;
    const pendientes = pendientesDe(c);
    const corrige = aCorregirPor(yo, c);
    const propio = c.borrador && api.esAutorDelBorrador(yo, c.borrador);
    const enWeb = c.visibilidad && c.visibilidad.visible
      ? `<p class="observado__nota">${icono("globe")}Mientras tanto, los sitios siguen mostrando la versión ${c.publicada ? c.publicada.version : ""} aprobada.</p>` : "";
    const accion = corrige
      ? `<button type="button" class="btn btn--primario" data-accion="nueva-version" data-id="${esc(c.id)}">${icono("pencil")}${propio ? "Seguir corrigiendo" : "Corregir y reenviar"}</button>`
      : "";
    const texto = corrige
      ? "Corregí lo que piden los revisores y reenvialo. La versión nueva vuelve a pasar por la revisión de dirección y la decisión final."
      : `Esperando que ${esc(nombreUsuario(ult(c).autorId))} lo corrija y lo reenvíe. Solo el autor puede modificarlo.`;
    return `
      <section class="observado" aria-labelledby="t-observado-${esc(c.id)}">
        <div class="observado__cabecera">
          <span class="observado__icono">${icono("history")}</span>
          <div>
            <h4 class="observado__titulo" id="t-observado-${esc(c.id)}">Observado: requiere cambios</h4>
            <p class="observado__texto">${texto}</p>
          </div>
          ${accion}
        </div>
        ${enWeb}
        ${pendientes.length ? listaObservaciones(pendientes) : `<p class="vacio vacio--linea">Sin observaciones registradas.</p>`}
      </section>`;
  }

  /** Franja del detalle: si es urgente, por qué y hasta cuándo; si no, la opción de marcarlo (a quien puede). */
  function franjaPrioridad(c) {
    const p = c.prioridad;
    const puede = puedeCambiarPrioridad(estado.usuario, c);
    const boton = (texto) => (puede
      ? `<button type="button" class="btn btn--claro btn--mini" data-accion="abrir-prioridad" data-id="${esc(c.id)}">${texto}</button>` : "");
    if (!esUrgente(p)) {
      return puede ? `<div class="prioridad-normal"><span>Prioridad normal</span>${boton(`${icono("alerta")}Marcar como urgente`)}</div>` : "";
    }
    const enWeb = c.visibilidad && c.visibilidad.visible
      ? (c.prioridadPublicada && esUrgente(c.prioridadPublicada) && !vencida(c.prioridadPublicada.vence)
        ? "Se está destacando en el sitio" : "Ya no se destaca en el sitio")
      : "Al aprobarse se destaca en el sitio";
    const datos = [
      p.marcadoPor ? `Marcado por ${esc(nombreUsuario(p.marcadoPor))}${p.marcadoEn ? ` el ${fechaCorta(p.marcadoEn)}` : ""}` : "",
      p.vence ? `${enWeb} hasta el ${fechaCorta(p.vence)}${vencida(p.vence) ? " (fecha vencida)" : ""}` : `${enWeb} mientras esté publicado`,
      ["en_revision", "elevado", "aprobado"].includes(c.estado) ? `Esperando ${esperando(c.actualizado)}` : "",
    ].filter(Boolean);
    return `
      <div class="franja-urgente" role="note">
        <span class="franja-urgente__icono">${icono("alerta")}</span>
        <div class="franja-urgente__texto">
          <p class="franja-urgente__titulo">Contenido prioritario: atender con urgencia</p>
          ${p.motivo ? `<p class="franja-urgente__motivo">“${esc(p.motivo)}”</p>` : ""}
          <p class="franja-urgente__datos">${datos.join(" · ")}</p>
        </div>
        ${boton("Cambiar prioridad")}
      </div>`;
  }

  function detalleRevision(c) {
    const v = ult(c);
    const abre = api.puedeVerAdjuntos(estado.usuario, c, v);
    const adjuntos = v.adjuntos.length
      ? `<ul class="archivos">${v.adjuntos.map((a) => archivoRevision(a, abre)).join("")}</ul>`
      : `<p class="vacio vacio--linea">Esta versión no tiene adjuntos.</p>`;

    return `
      <article class="detalle">
        <header class="detalle__cabecera">
          <div class="detalle__pills">${marcaUrgente(c.prioridad, " marca-urgente--grande")}${pill(c.estado)}<span class="pildora">Versión ${v.numero}</span></div>
          <h3 class="detalle__titulo">${esc(v.titulo)}</h3>
          <p class="detalle__meta">${destino(c)} ${esc(c.seccion)} · enviado por ${esc(nombreUsuario(v.autorId))} el ${fechaCorta(v.fecha)}</p>
        </header>

        ${indicadorVisibilidad(c)}

        ${franjaPrioridad(c)}

        ${cadena(c)}

        <div class="detalle__cuerpo">
          <div class="detalle__principal">
            <section>
              <h4 class="etiqueta">Así se verá en ${esc(nombresSitios(c.sitiosDestino) || "el sitio")}</h4>
              ${previaSitio(c, v, abre)}
            </section>
            <section>
              <h4 class="etiqueta">Resumen para publicar</h4>
              <p class="texto-resumen">${esc(v.resumen)}</p>
            </section>
            <section>
              <h4 class="etiqueta">Contenido</h4>
              <div class="caja-texto texto-con-formato">${util.cuerpoHtml(v)}</div>
            </section>
            <section>
              <h4 class="etiqueta">Archivos adjuntos (${v.adjuntos.length})</h4>
              ${adjuntos}
            </section>
          </div>

          <aside class="ficha">
            <h4 class="etiqueta">Ficha editorial</h4>
            <dl>
              <div><dt>Autor</dt><dd>${esc(nombreUsuario(c.autorId))}</dd></div>
              <div><dt>Versión</dt><dd>v${v.numero}</dd></div>
              <div><dt>Último cambio</dt><dd>${fechaCorta(c.actualizado)}</dd></div>
              <div><dt>Identificador</dt><dd>${esc(c.slug)}</dd></div>
            </dl>
          </aside>
        </div>

        ${c.estado === "devuelto" ? "" : historialObservaciones(c)}
        ${bloqueDecision(c)}
        ${c.estado === "devuelto" && (c.observaciones || []).some((o) => o.atendida)
          ? historialObservaciones({ observaciones: c.observaciones.filter((o) => o.atendida) }) : ""}
      </article>`;
  }

  function vistaRevision() {
    const lista = filtrar(estado.contenidos.filter((c) => ABIERTOS.includes(c.estado)));
    contar(lista.length);
    if (!lista.some((c) => c.id === estado.seleccionRevision)) {
      // por defecto se abre el primero de la lista: el urgente que más espera (o el primero del resto)
      const primero = lista.filter((c) => esUrgente(c.prioridad)).sort(ordenUrgentes(estado.usuario))[0] || lista[0];
      estado.seleccionRevision = primero ? primero.id : null;
    }
    const seleccionado = lista.find((c) => c.id === estado.seleccionRevision);
    const yo = estado.usuario;
    const pendientes = pendientesPara(yo);

    let bajada = "Seguí el estado de las solicitudes enviadas: acá ves en qué escalón está cada una, quién decidió y qué observaciones dejó.";
    if (yo && yo.rol === "administrador") bajada = "Como administrador podés intervenir en las dos instancias: la revisión de dirección (elevar o devolver con observaciones) y la decisión final (aprobar —se publica en el acto—, devolver o rechazar). Nunca sobre lo que cargaste o elevaste vos.";
    else if (api.puedeDecidir(yo)) bajada = "Como autoridad superior, tenés la decisión final sobre lo que elevan los directores: aprobar (se publica en el acto en los sitios elegidos), devolver o rechazar.";
    else if (api.puede(yo, "revisar")) bajada = "Revisá lo que envía el equipo y elevalo a la autoridad superior, o devolvelo con observaciones. La decisión final no es tuya.";
    else if (observadosPara(yo).length) bajada = "Lo que te devolvieron con observaciones aparece marcado «Para corregir»: abrilo, leé qué piden y reenvialo.";

    const sinAutoridad = hayAutoridad() ? "" : `
      <div class="callout callout--alerta callout--franja">
        <div>
          <p class="callout__titulo">No hay ninguna autoridad superior asignada</p>
          <p class="callout__texto">Lo que elevan los directores queda en espera: nadie puede aprobarlo ni publicarlo.${api.puede(yo, "roles") ? " Asigná el rol desde Equipo y roles." : " Avisale al administrador."}</p>
        </div>
        ${api.puede(yo, "roles") ? `<div class="callout__acciones"><a class="btn btn--claro" href="#equipo">Ir a Equipo y roles</a></div>` : ""}
      </div>`;

    const item = (c) => {
      const v = ult(c);
      const urgente = esUrgente(c.prioridad);
      return `
        <li>
          <button type="button" class="solicitud${urgente ? " solicitud--urgente" : ""}${c.id === estado.seleccionRevision ? " solicitud--activa" : ""}" data-accion="seleccionar-revision" data-id="${esc(c.id)}">
            <span class="solicitud__tope">${marcaUrgente(c.prioridad)}${pill(c.estado)}${aCorregirPor(yo, c) ? `<span class="marca-corregir">${icono("pencil")}Para corregir</span>` : ""}<span class="solicitud__version">v${v.numero}</span></span>
            <strong class="solicitud__titulo">${esc(v.titulo)}</strong>
            <span class="solicitud__meta">${destino(c)} ${esc(c.seccion)} · ${urgente ? `esperando ${esperando(c.actualizado)}` : fechaCorta(c.actualizado)}</span>
          </button>
        </li>`;
    };
    // Lo urgente queda fijo arriba, en su propio grupo, sea cual sea el orden elegido para el resto.
    const urgentes = lista.filter((c) => esUrgente(c.prioridad)).sort(ordenUrgentes(yo));
    const resto = lista.filter((c) => !esUrgente(c.prioridad));
    const items = urgentes.length
      ? `<li class="grupo-solicitudes grupo-solicitudes--urgente" aria-hidden="true">${icono("alerta")}Urgentes · ${urgentes.length}</li>
         ${urgentes.map(item).join("")}
         ${resto.length ? `<li class="grupo-solicitudes" aria-hidden="true">Resto de las solicitudes · ${resto.length}</li>${resto.map(item).join("")}` : ""}`
      : resto.map(item).join("");

    return `
      <div class="encabezado-seccion">
        <div>
          <p class="etiqueta">Bandeja de revisión</p>
          <h2 class="titulo-seccion">Decisiones claras, antes de publicar.</h2>
          <p class="bajada">${bajada}</p>
        </div>
        <span class="pildora pildora--ambar">${icono("clock")}${pendientes} ${api.puede(yo, "revisar") || api.puedeDecidir(yo)
          ? (pendientes === 1 ? "espera tu decisión" : "esperan tu decisión")
          : (pendientes === 1 ? "para corregir" : "para corregir")}</span>
      </div>
      ${sinAutoridad}

      <div class="rejilla rejilla--dividida">
        <section class="panel" aria-labelledby="t-solicitudes">
          <header class="panel__cabecera">
            <div>
              <h3 class="panel__titulo" id="t-solicitudes">Solicitudes recibidas</h3>
              <p class="panel__sub">Seleccioná un contenido para ver el detalle.</p>
            </div>
          </header>
          <ul class="solicitudes">${items || `<li class="vacio">No hay solicitudes abiertas. Cuando alguien envíe contenido a revisión, va a aparecer acá.</li>`}</ul>
        </section>

        <section class="panel panel--detalle" aria-label="Detalle de la solicitud">
          ${seleccionado ? detalleRevision(seleccionado) : `<p class="vacio vacio--centrado">Elegí una solicitud de la lista para revisarla.</p>`}
        </section>
      </div>`;
  }

  /* ---------- Vista: historial y archivo ---------- */

  function eventosDeVersion(c, numero) {
    return c.historial
      .filter((e) => e.version === numero)
      .map((e) => `
        <li class="version__evento">
          <strong>${ETIQUETA_EVENTO[e.tipo] || e.tipo}</strong> · ${esc(nombreUsuario(e.usuarioId))} · ${fechaCorta(e.fecha)}
          ${e.comentario ? `<span class="version__comentario">“${esc(e.comentario)}”</span>` : ""}
        </li>`).join("");
  }

  function lineaDeVersiones(c) {
    const actual = c.publicada ? c.publicada.version : ult(c).numero;
    return [...c.versiones].reverse().map((v) => `
      <li class="version${v.numero === actual ? " version--actual" : ""}">
        <span class="version__punto" aria-hidden="true"></span>
        <div class="version__tarjeta">
          <div class="version__tope">
            <strong class="version__nombre">Versión ${v.numero}.0</strong>
            ${v.numero === actual ? '<span class="version__actual">Actual</span>' : ""}
            <time class="version__fecha">${fechaCorta(v.fecha)}</time>
          </div>
          <p class="version__desc">${DESCRIPCION_VERSION[v.estado] || ""}</p>
          <ul class="version__eventos">${eventosDeVersion(c, v.numero)}</ul>
        </div>
      </li>`).join("");
  }

  function cajaArchivo(c) {
    const puedeBaja = api.puedeDarDeBaja(estado.usuario, c);
    if (c.estado === "archivado") {
      return `
        <div class="archivar">
          <div>
            <p class="archivar__titulo">Este contenido está dado de baja</p>
            <p class="archivar__texto">No se ve en ningún sitio y conserva todo su registro. Al reactivarlo vuelve al circuito: para mostrarlo en la web, la autoridad superior lo publica de nuevo.</p>
          </div>
          ${puedeBaja ? `<button type="button" class="btn btn--claro" data-accion="restaurar" data-id="${esc(c.id)}">${icono("history")}Reactivar</button>` : ""}
        </div>`;
    }
    return `
      <div class="archivar">
        <div>
          <p class="archivar__titulo">¿Necesitás retirar este contenido?</p>
          <p class="archivar__texto">Darlo de baja lo saca de los sitios en el acto, sin borrar versiones, archivos ni historial.</p>
        </div>
        ${puedeBaja
          ? `<button type="button" class="btn btn--peligro" data-accion="archivar" data-id="${esc(c.id)}">${icono("archive")}Dar de baja</button>`
          : `<span class="archivar__nota">Lo pueden dar de baja su autor, un director de área, el administrador o la autoridad superior.</span>`}
      </div>`;
  }

  function vistaHistorial() {
    const lista = filtrar(estado.contenidos);
    contar(lista.length);
    if (!lista.some((c) => c.id === estado.seleccionHistorial)) {
      estado.seleccionHistorial = lista.length ? lista[0].id : null;
    }
    const c = lista.find((x) => x.id === estado.seleccionHistorial);

    const items = lista.map((x) => {
      const menu = menuAcciones(x);
      return `
      <li class="registro-fila${menu ? " registro-fila--con-menu" : ""}">
        <button type="button" class="registro${x.id === estado.seleccionHistorial ? " registro--activo" : ""}" data-accion="seleccionar-historial" data-id="${esc(x.id)}">
          <strong class="registro__titulo">${marcaUrgente(x.prioridad)}${esc(ult(x).titulo)}</strong>
          <span class="registro__meta">${destino(x)} ${esc(x.seccion)} · ${x.versiones.length} ${x.versiones.length === 1 ? "versión" : "versiones"}</span>
          ${pill(x.estado)}
          ${indicadorVisibilidad(x, { compacto: true })}
        </button>
        ${menu}
      </li>`;
    }).join("");

    const puedeNueva = c && ESTADOS_EDITABLES.includes(c.estado) && api.puedeEditarContenido(estado.usuario, c);
    const accionNueva = puedeNueva ? botonNuevaVersion(c, "btn--suave btn--mini linea-cabecera__accion") : "";

    const detalle = c ? `
      <div class="linea-cabecera">
        <span class="chip-icono chip-icono--verde">${icono("history")}</span>
        <div>
          <p class="etiqueta">Línea de tiempo</p>
          <h3 class="panel__titulo">Versiones del contenido</h3>
          <p class="panel__sub">${esc(ult(c).titulo)} · ${destino(c)} ${esc(c.seccion)}</p>
        </div>
        ${accionNueva}
      </div>
      ${indicadorVisibilidad(c)}
      ${historialObservaciones(c)}
      <ol class="linea">${lineaDeVersiones(c)}</ol>
      ${cajaArchivo(c)}` : `<p class="vacio vacio--centrado">Elegí un registro de la lista para ver sus versiones.</p>`;

    return `
      <div class="encabezado-seccion">
        <div>
          <p class="etiqueta">Trazabilidad</p>
          <h2 class="titulo-seccion">Cada cambio queda registrado.</h2>
          <p class="bajada">Reemplazar información no borra lo anterior: conserva autores, fechas, decisiones y el motivo de cada versión.</p>
        </div>
        <span class="pildora">${icono("history")}Retención activa</span>
      </div>

      <div class="rejilla rejilla--dividida">
        <section class="panel" aria-labelledby="t-registros">
          <header class="panel__cabecera">
            <div>
              <h3 class="panel__titulo" id="t-registros">Registros conservados</h3>
              <p class="panel__sub">Ningún reemplazo borra el historial.</p>
            </div>
          </header>
          <ul class="registros">${items || `<li class="vacio">Ningún registro coincide con los filtros.</li>`}</ul>
        </section>

        <section class="panel panel--linea" aria-label="Versiones del contenido">${detalle}</section>
      </div>`;
  }

  /* ---------- Vista: equipo y roles ---------- */

  const ultimoAcceso = (u) => (u.ultimoAcceso ? fechaCorta(u.ultimoAcceso) : "Todavía no ingresó");

  /** Opciones de rol agrupadas: primero la cadena de aprobación en orden jerárquico, después los roles fuera de ella. */
  function opcionesRol(seleccionado) {
    const opcion = ([clave, r]) =>
      `<option value="${clave}"${clave === seleccionado ? " selected" : ""}>${r.nivel ? `${r.nivel}. ` : ""}${esc(r.nombre)}</option>`;
    const roles = Object.entries(api.roles);
    const cadenaRoles = roles.filter(([, r]) => r.nivel).sort((a, b) => a[1].nivel - b[1].nivel);
    const otros = roles.filter(([, r]) => !r.nivel);
    return `<optgroup label="Cadena de aprobación">${cadenaRoles.map(opcion).join("")}</optgroup>`
      + `<optgroup label="Fuera de la cadena">${otros.map(opcion).join("")}</optgroup>`;
  }

  /** Los tres escalones con quiénes los ocupan hoy. */
  function jerarquiaEquipo() {
    const escalones = Object.entries(api.roles).filter(([, r]) => r.nivel).sort((a, b) => a[1].nivel - b[1].nivel);
    return `
      <section class="jerarquia" aria-label="Cadena de aprobación del equipo">
        <ol class="jerarquia__escalones">
          ${escalones.map(([clave, r]) => {
            const personas = estado.usuarios.filter((u) => u.rol === clave);
            const vacante = clave === "autoridad" && !personas.length;
            return `
              <li class="jerarquia__escalon${vacante ? " jerarquia__escalon--vacante" : ""}">
                <span class="jerarquia__nivel" aria-hidden="true">${r.nivel}</span>
                <span class="jerarquia__texto">
                  <strong>${esc(r.nombre)}</strong>
                  <small>${esc(r.permisos)}</small>
                  <span class="jerarquia__personas">${vacante
                    ? "Sin asignar: nada se puede aprobar ni publicar"
                    : `${personas.length} ${personas.length === 1 ? "persona" : "personas"}`}</span>
                </span>
              </li>`;
          }).join("")}
        </ol>
      </section>`;
  }

  function accionesIntegrante(u) {
    const esYo = u.id === estado.usuario.id;
    const borrar = esYo
      ? `<button type="button" class="btn-icono btn-icono--peligro" disabled title="No podés darte de baja a vos mismo" aria-label="No podés darte de baja a vos mismo">${icono("trash")}</button>`
      : `<button type="button" class="btn-icono btn-icono--peligro" data-accion="baja-integrante" data-id="${esc(u.id)}" title="Dar de baja" aria-label="Dar de baja a ${esc(u.nombre)}">${icono("trash")}</button>`;
    return `
      <div class="acciones-fila">
        <button type="button" class="btn-icono" data-accion="editar-integrante" data-id="${esc(u.id)}" title="Editar datos" aria-label="Editar datos de ${esc(u.nombre)}">${icono("pencil")}</button>
        ${borrar}
      </div>`;
  }

  function permisoDe(rol) {
    const r = api.roles[rol];
    const nivel = r.nivel ? `<span class="nivel nivel--${r.nivel}" title="Escalón ${r.nivel} de 3 en la cadena de aprobación">Nivel ${r.nivel}</span>` : "";
    return `<span class="permiso${r.nivel ? "" : " permiso--fuera"}">${nivel}${r.nivel ? "" : icono("checkCircle")}${esc(r.permisos)}</span>`;
  }

  function vistaEquipo() {
    const esAdmin = api.puede(estado.usuario, "roles");
    const total = estado.usuarios.length;

    const filas = estado.usuarios.map((u) => {
      const esYo = u.id === estado.usuario.id;
      const rol = esAdmin
        ? `<select class="select select--tabla" data-accion="cambiar-rol" data-id="${esc(u.id)}" aria-label="Rol de ${esc(u.nombre)}">${opcionesRol(u.rol)}</select>`
        : `<span class="pildora">${esc(api.roles[u.rol].nombre)}</span>`;
      return `
        <tr${esYo ? ' class="fila-propia"' : ""}>
          <td>
            <div class="persona">
              <span class="persona__avatar">${esc(iniciales(u.nombre))}</span>
              <span>
                <strong class="persona__nombre">${esc(u.nombre)}${esYo ? ' <span class="persona__yo">(vos)</span>' : ""}</strong>
                <span class="persona__correo">${esc(u.email)}</span>
              </span>
            </div>
          </td>
          <td>${rol}</td>
          <td class="celda-suave">${ultimoAcceso(u)}</td>
          <td>${permisoDe(u.rol)}</td>
          ${esAdmin ? `<td class="celda-acciones">${accionesIntegrante(u)}</td>` : ""}
        </tr>`;
    }).join("");

    const botonAgregar = esAdmin
      ? `<button type="button" class="btn btn--primario" data-accion="agregar-integrante">${icono("userPlus")}Agregar integrante</button>`
      : "";

    return `
      <div class="encabezado-seccion">
        <div>
          <p class="etiqueta">Gobernanza</p>
          <h2 class="titulo-seccion">Personas y permisos.</h2>
          <p class="bajada">Cada contenido pasa por tres escalones: lo carga un colaborador, lo revisa un director de área y la autoridad superior tiene la última palabra para aprobarlo, rechazarlo y publicarlo.</p>
        </div>
        <div class="encabezado-seccion__acciones">
          <span class="pildora">${icono("user")}${total} ${total === 1 ? "integrante" : "integrantes"}</span>
          ${botonAgregar}
        </div>
      </div>

      ${jerarquiaEquipo()}

      <section class="panel" aria-labelledby="t-permisos">
        <header class="panel__cabecera">
          <div>
            <h3 class="panel__titulo" id="t-permisos">Directorio de permisos</h3>
            <p class="panel__sub">${esAdmin ? "Un rol define qué puede hacer cada persona dentro del circuito. Los cambios de rol se aplican al instante." : "Solo el administrador puede agregar personas y cambiar sus roles."}</p>
          </div>
        </header>
        <div class="tabla-envoltura">
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Persona</th><th scope="col">Rol actual</th><th scope="col">Último acceso</th><th scope="col">Permisos</th>
                ${esAdmin ? '<th scope="col" class="celda-acciones"><span class="solo-lectores">Acciones</span></th>' : ""}
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </section>`;
  }

  /* ---------- Menú en celulares y tablets ---------- */

  /** En pantallas de hasta 900px el menú lateral se abre y se cierra con el botón ☰. */
  function prepararMenuMovil() {
    const lateral = $(".lateral");
    const boton = $("#btn-menu");
    const pantallaChica = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 900px)") : null;

    function abrir(si) {
      lateral.classList.toggle("abierto", si);
      boton.setAttribute("aria-expanded", String(si));
      boton.setAttribute("aria-label", si ? "Cerrar menú" : "Abrir menú");
    }

    boton.addEventListener("click", () => abrir(!lateral.classList.contains("abierto")));
    // al elegir una opción, se cierra para que se vea la pantalla elegida
    $("#menu").addEventListener("click", (e) => { if (e.target.closest(".menu__enlace")) abrir(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && lateral.classList.contains("abierto")) abrir(false); });
    document.addEventListener("click", (e) => { if (lateral.classList.contains("abierto") && !lateral.contains(e.target)) abrir(false); });
    if (pantallaChica) pantallaChica.addEventListener("change", () => abrir(false));
  }

  /* ---------- Cambiar mi contraseña ---------- */

  /**
   * Abre el diálogo para cambiar la propia contraseña.
   * obligatorio = true: la contraseña es provisional (la dio el administrador). No se puede cerrar ni cancelar:
   * solo cambiarla o cerrar sesión. El servidor además rechaza cualquier otro pedido hasta que se cambie.
   * Devuelve una promesa que se resuelve cuando la contraseña quedó cambiada.
   */
  function abrirCambioClave(obligatorio = false) {
    const dialogo = $("#dialogo-clave");
    $("#form-clave").reset();
    $("#clave-errores").hidden = true;
    dialogo.dataset.obligatorio = obligatorio ? "1" : "";
    $("#clave-titulo").textContent = obligatorio ? "Elegí tu contraseña" : "Cambiar mi contraseña";
    $("#clave-sub").textContent = obligatorio
      ? "Entraste con una contraseña provisional que te dio el administrador. Por seguridad, antes de seguir elegí una propia que solo vos conozcas."
      : "Ingresá tu contraseña actual y la nueva.";
    $("#clave-actual-etiqueta").innerHTML = obligatorio ? "Contraseña provisional <i>*</i>" : "Contraseña actual <i>*</i>";
    $("#btn-clave-cancelar").hidden = obligatorio;
    $("#btn-clave-salir").hidden = !obligatorio;
    dialogo.showModal();
    $("#c-actual").focus();
    return new Promise((resolver) => { estado.alCambiarClave = resolver; });
  }

  function erroresClave(mensajes) {
    const caja = $("#clave-errores");
    caja.innerHTML = mensajes.length === 1 ? esc(mensajes[0]) : `<ul>${mensajes.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`;
    caja.hidden = false;
  }

  async function guardarClave(evento) {
    evento.preventDefault();
    const actual = $("#c-actual").value;
    const nueva = $("#c-nueva").value;
    const repetir = $("#c-repetir").value;
    const errores = [];
    if (!actual) errores.push("Ingresá tu contraseña actual.");
    if (nueva.length < 10) errores.push("La contraseña nueva debe tener al menos 10 caracteres.");
    else if (new TextEncoder().encode(nueva).length > 72) errores.push("La contraseña nueva es demasiado larga.");
    if (nueva !== repetir) errores.push("Las dos contraseñas nuevas no coinciden.");
    if (actual && nueva && actual === nueva) errores.push("La contraseña nueva tiene que ser distinta de la actual.");
    if (errores.length) { erroresClave(errores); return; }

    const boton = $("#btn-clave-guardar");
    boton.disabled = true;
    try {
      estado.usuario = await api.cambiarClave({ actual, nueva });
      $("#form-clave").reset();
      $("#dialogo-clave").dataset.obligatorio = "";
      $("#dialogo-clave").close();
      aviso("Listo: tu contraseña se cambió. Tus otras sesiones abiertas se cerraron.", "ok");
      if (estado.alCambiarClave) { estado.alCambiarClave(); estado.alCambiarClave = null; }
    } catch (err) {
      erroresClave([err.message || "No se pudo cambiar la contraseña. Probá de nuevo."]);
    } finally {
      boton.disabled = false;
    }
  }

  /** Los eventos del diálogo se enlazan aparte: tiene que funcionar antes de que se arme el resto del panel. */
  function prepararDialogoClave() {
    const dialogo = $("#dialogo-clave");
    $("#form-clave").addEventListener("submit", guardarClave);
    $("#btn-clave-cancelar").addEventListener("click", () => dialogo.close());
    $("#btn-clave-salir").addEventListener("click", async () => {
      await api.cerrarSesion();
      location.replace("index.html");
    });
    // Con contraseña provisional, Escape no lo cierra.
    dialogo.addEventListener("cancel", (e) => { if (dialogo.dataset.obligatorio) e.preventDefault(); });
    $("#btn-cambiar-clave").hidden = api.modoDemo;
  }

  /* ---------- Formulario de integrante (alta y edición) ---------- */

  /** Contraseña provisional legible: sin caracteres que se confunden (0/O, 1/l/I). */
  function generarClave() {
    const alfabeto = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint32Array(14);
    crypto.getRandomValues(bytes);
    const texto = [...bytes].map((n) => alfabeto[n % alfabeto.length]).join("");
    return `${texto.slice(0, 5)}-${texto.slice(5, 10)}-${texto.slice(10)}`;
  }

  function mostrarAyudaRol() {
    const rol = api.roles[$("#i-rol").value];
    $("#i-rol-ayuda").textContent = rol ? `${rol.nombre}: ${rol.permisos.charAt(0).toLowerCase()}${rol.permisos.slice(1)}.` : "";
  }

  function abrirIntegrante(id = null) {
    const integrante = id ? estado.usuarios.find((u) => u.id === id) : null;
    if (id && !integrante) return;
    estado.integranteEnEdicion = integrante;
    const edicion = Boolean(integrante);
    const esYo = edicion && integrante.id === estado.usuario.id;

    $("#form-integrante").reset();
    $("#integrante-errores").hidden = true;
    $("#integrante-titulo").textContent = edicion ? "Editar integrante" : "Agregar integrante";
    $("#integrante-sub").textContent = edicion
      ? "Actualizá el nombre o el correo. El rol se cambia desde la tabla."
      : "Va a poder ingresar al panel con su correo y el rol que elijas. Podés cambiar el rol después.";
    $("#btn-integrante").textContent = edicion ? "Guardar cambios" : "Agregar integrante";

    $("#i-nombre").value = edicion ? integrante.nombre : "";
    $("#i-email").value = edicion ? integrante.email : "";
    $("#i-telefono").value = edicion ? integrante.telefono || "" : "";
    $("#i-area").value = edicion ? integrante.area || "" : "";

    // El rol solo se elige en el alta: después se gestiona con el selector de cada fila.
    $("#i-rol-caja").hidden = edicion;
    $("#i-rol-ayuda").hidden = edicion;
    $("#i-rol").innerHTML = opcionesRol("colaborador");
    mostrarAyudaRol();

    // En la demo no hay contraseñas (se entra eligiendo la persona en "ver como").
    const conClave = !api.modoDemo;
    $("#i-clave-caja").hidden = !conClave;
    $("#i-clave").value = conClave && !edicion ? generarClave() : "";
    $("#i-clave").placeholder = edicion ? "Dejala vacía para no cambiarla" : "";
    $("#i-clave-etiqueta").innerHTML = edicion ? "Restablecer contraseña (opcional)" : "Contraseña provisional <i>*</i>";
    $("#i-clave-ayuda").textContent = edicion
      ? (esYo ? "Mínimo 10 caracteres. Tu sesión actual sigue abierta." : "Mínimo 10 caracteres. Al cambiarla se cierran las sesiones abiertas de esta persona y, al ingresar, va a tener que elegir una propia.")
      : "Mínimo 10 caracteres. Compartila con la persona por un canal seguro: al ingresar, el sistema le va a pedir que la cambie por una propia.";

    $("#dialogo-integrante").showModal();
    $("#i-nombre").focus();
  }

  function cerrarIntegrante() {
    estado.integranteEnEdicion = null;
    $("#dialogo-integrante").close();
  }

  function erroresIntegrante(mensajes) {
    const caja = $("#integrante-errores");
    caja.innerHTML = mensajes.length === 1
      ? esc(mensajes[0])
      : `<ul>${mensajes.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`;
    caja.hidden = false;
  }

  function validarIntegrante(d, edicion) {
    const errores = [];
    if (!d.nombre) errores.push("Indicá el nombre y apellido.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errores.push("Ingresá un correo válido.");
    else if (estado.usuarios.some((u) => u.email === d.email && u.id !== (edicion ? estado.integranteEnEdicion.id : null))) {
      errores.push("Ya hay un integrante con ese correo.");
    }
    if (d.telefono && !/^[0-9+()\-\s.]{6,40}$/.test(d.telefono)) errores.push("El teléfono solo admite números, espacios, +, guiones y paréntesis.");
    if (!api.modoDemo) {
      if (!edicion && d.password.length < 10) errores.push("La contraseña provisional debe tener al menos 10 caracteres.");
      if (edicion && d.password && d.password.length < 10) errores.push("La nueva contraseña debe tener al menos 10 caracteres.");
    }
    return errores;
  }

  async function guardarIntegrante(evento) {
    evento.preventDefault();
    const edicion = Boolean(estado.integranteEnEdicion);
    const d = {
      nombre: $("#i-nombre").value.trim().replace(/\s+/g, " "),
      email: $("#i-email").value.trim().toLowerCase(),
      rol: $("#i-rol").value,
      password: $("#i-clave").value,
      telefono: $("#i-telefono").value.trim(),
      area: $("#i-area").value.trim(),
    };
    const errores = validarIntegrante(d, edicion);
    if (errores.length) { erroresIntegrante(errores); return; }

    const boton = $("#btn-integrante");
    boton.disabled = true;
    try {
      if (edicion) {
        const { id } = estado.integranteEnEdicion;
        await api.editarIntegrante(id, { nombre: d.nombre, email: d.email, telefono: d.telefono, area: d.area, password: d.password || undefined });
        cerrarIntegrante();
        aviso(d.password ? "Datos y contraseña actualizados." : "Datos del integrante actualizados.", "ok");
      } else {
        const creado = await api.agregarIntegrante(d);
        cerrarIntegrante();
        aviso(creado && creado.reactivado
          ? `${d.nombre} estaba dado de baja: se reactivó con el rol ${api.roles[d.rol].nombre}.`
          : `${d.nombre} se sumó al equipo como ${api.roles[d.rol].nombre}.`, "ok");
      }
    } catch (err) {
      if (err.codigo === "sin_sesion") { location.replace("index.html"); return; }
      erroresIntegrante([err.message || "No se pudo guardar."]);
      return;
    } finally {
      boton.disabled = false;
    }
    await refrescar();
  }

  async function darDeBaja(id) {
    const u = estado.usuarios.find((x) => x.id === id);
    if (!u) return;
    const { ok } = await confirmar({
      titulo: `Dar de baja a ${u.nombre}`,
      texto: `Deja de figurar en el equipo y no va a poder ingresar al panel. Los contenidos que cargó y las decisiones que tomó se conservan en el historial. Si más adelante la agregás con el mismo correo (${u.email}), se reactiva.`,
      etiqueta: "Dar de baja",
      peligro: true,
    });
    if (ok) await ejecutar(api.darDeBaja(id), `${u.nombre} fue dado de baja del equipo.`);
  }

  /* ---------- Editor de borradores ----------
   * El formulario de carga trabaja siempre sobre un borrador privado: se guarda incompleto, los archivos se suben
   * apenas se eligen y el envío valida todo. Cerrar guarda; nada se pierde por cerrar la pestaña del panel. */

  const CAMPOS_OBLIGATORIOS = [
    ["sitiosDestino", "Sitio"], ["tipo", "Tipo"], ["seccion", "Categoría"], ["slug", "Identificador web"],
    ["titulo", "Título"], ["resumen", "Resumen"], ["cuerpo", "Contenido"],
  ];

  const esImagenNombre = (nombre) => /\.(jpe?g|png|webp|avif)$/i.test(nombre || "");
  const extensionDe = (nombre) => (String(nombre).split(".").pop() || "").slice(0, 4);
  const SE_PUEDE_VER = /\.(jpe?g|png|webp|avif|pdf|txt)$/i;

  /** Qué falta para poder enviar un borrador (datos tal como están en el formulario o en el servidor). */
  function faltantes(d, adjuntos = []) {
    const vacio = (x) => (Array.isArray(x) ? !x.length : !String(x || "").trim());
    const lista = CAMPOS_OBLIGATORIOS.filter(([campo]) => vacio(d[campo])).map(([, nombre]) => nombre);
    if (d.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug)) lista.push("Identificador web válido");
    if (d.tipo === "galeria" && !adjuntos.some((a) => a.esImagen || esImagenNombre(a.nombre))) lista.push("Una imagen (es galería)");
    if (d.prioridad && esUrgente(d.prioridad) && vencida(d.prioridad.vence)) lista.push("Fecha de destaque vigente");
    return lista;
  }

  const hora = (iso) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  function leerCampos() {
    return {
      sitiosDestino: sitiosMarcados(),
      tipo: $("#c-tipo").value,
      seccion: $("#c-seccion").value.trim(),
      slug: $("#c-slug").value.trim().toLowerCase(),
      titulo: $("#c-titulo").value.trim(),
      resumen: $("#c-resumen").value.trim(),
      ...leerCuerpo(),
      prioridad: leerPrioridad("c"),
    };
  }

  /* --- Al corregir algo observado: las observaciones quedan a la vista arriba del formulario --- */

  function pintarObservacionesEditor(contenido) {
    const caja = $("#carga-observaciones");
    const pendientes = contenido ? pendientesDe(contenido) : [];
    caja.hidden = !pendientes.length;
    caja.innerHTML = pendientes.length ? `
      <div class="observado observado--editor">
        <div class="observado__cabecera">
          <span class="observado__icono">${icono("history")}</span>
          <div>
            <h3 class="observado__titulo">${pendientes.length === 1 ? "Observación a corregir" : `${pendientes.length} observaciones a corregir`}</h3>
            <p class="observado__texto">Al enviar la versión corregida quedan marcadas como atendidas y el contenido vuelve a la revisión de dirección.</p>
          </div>
        </div>
        ${listaObservaciones(pendientes)}
      </div>` : "";
  }

  /* --- Contenido completo: editor con formato (editor-texto.js) o, si no cargó, el cuadro de texto simple --- */

  let editorCuerpo = null;

  function leerCuerpo() {
    if (!editorCuerpo) return { cuerpo: $("#c-cuerpo").value.trim() };
    const html = editorCuerpo.html();
    return { cuerpo: editorCuerpo.texto().trim(), cuerpoHtml: html || null };
  }

  function escribirCuerpo(datos) {
    if (editorCuerpo) editorCuerpo.cargar(datos || {});
    else $("#c-cuerpo").value = (datos && datos.cuerpo) || "";
  }

  /* --- Control de prioridad (editor: prefijo "c"; diálogo de revisores: prefijo "p") --- */

  function leerPrioridad(prefijo) {
    const urgente = $(`#${prefijo}-urgente`).checked;
    return urgente
      ? { nivel: "urgente", motivo: $(`#${prefijo}-motivo`).value.trim(), vence: $(`#${prefijo}-vence`).value || null }
      : { nivel: "normal", motivo: "", vence: null };
  }

  function escribirPrioridad(prefijo, p) {
    const urgente = esUrgente(p);
    $(`#${prefijo}-urgente`).checked = urgente;
    $(`#${prefijo}-motivo`).value = urgente ? p.motivo || "" : "";
    $(`#${prefijo}-vence`).value = urgente ? diaAR(p.vence) : "";
    mostrarPrioridad(prefijo);
  }

  /** Muestra u oculta motivo y fecha según el interruptor; el editor entero toma el acento de urgencia. */
  function mostrarPrioridad(prefijo) {
    const urgente = $(`#${prefijo}-urgente`).checked;
    $(`#${prefijo}-urgente-detalle`).hidden = !urgente;
    const vence = $(`#${prefijo}-vence`);
    vence.min = hoyAR();
    // máximo 90 días destacado, igual que el servidor
    vence.max = new Date(Date.now() - 3 * 3600 * 1000 + 90 * 86400000).toISOString().slice(0, 10);
    if (prefijo === "c") $("#panel-carga").classList.toggle("carga--urgente", urgente);
  }

  /** Lo que se manda al guardar: sin slug si el contenido ya se envió alguna vez (ahí no se puede cambiar). */
  function datosParaGuardar() {
    const d = leerCampos();
    if (!estado.editor.slugEditable) delete d.slug;
    return d;
  }

  function mostrarErrores(mensajes) {
    const caja = $("#carga-errores");
    caja.innerHTML = mensajes.length === 1
      ? esc(mensajes[0])
      : `<ul>${mensajes.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`;
    caja.hidden = false;
  }

  function limpiarErrores() {
    const caja = $("#carga-errores");
    caja.hidden = true;
    caja.innerHTML = "";
  }

  /** Sitios tildados, en el orden del catálogo. */
  const sitiosMarcados = () => [...document.querySelectorAll('#c-sitios-opciones input[name="c-sitio"]:checked')].map((x) => x.value);

  function marcarSitios(ids) {
    document.querySelectorAll('#c-sitios-opciones input[name="c-sitio"]').forEach((x) => { x.checked = ids.includes(x.value); });
  }

  /** Arma las casillas de sitios y el desplegable de tipo (con una opción vacía para obligar a elegir). */
  function prepararDesplegables() {
    $("#c-sitios-opciones").innerHTML = api.sitios.map((x) => `
      <label class="casilla-sitio">
        <input type="checkbox" name="c-sitio" value="${esc(x.id)}">
        <span class="casilla-sitio__caja" aria-hidden="true">${icono("check")}</span>
        <span class="casilla-sitio__texto"><strong>${esc(x.corto)}</strong>${x.nombre !== x.corto || !x.activo ? `<small>${x.nombre !== x.corto ? esc(x.nombre) : ""}${x.activo ? "" : `${x.nombre !== x.corto ? " · " : ""}todavía no conectado`}</small>` : ""}</span>
      </label>`).join("");
    $("#c-tipo").innerHTML = `<option value="">Elegí el tipo…</option>` +
      api.tipos.map((x) => `<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join("");
  }

  function mostrarAyudaTipo() {
    const ayuda = $("#c-ayuda-tipo");
    const textos = [];
    sitiosDe(sitiosMarcados()).filter((x) => !x.activo)
      .forEach((x) => textos.push(`${x.nombre}: el sitio todavía no está conectado; el contenido quedará listo para cuando lo esté.`));
    if (AYUDA_TIPO[$("#c-tipo").value]) textos.push(AYUDA_TIPO[$("#c-tipo").value]);
    ayuda.textContent = textos.join(" ");
    ayuda.hidden = !textos.length;
  }

  function renderGuardado() {
    const ed = estado.editor;
    const caja = $("#carga-guardado");
    let texto = "Todavía no se guardó";
    let clase = "";
    if (ed.guardando) { texto = "Guardando…"; clase = "guardado--guardando"; }
    else if (ed.sucio) { texto = "Cambios sin guardar"; clase = "guardado--sucio"; }
    else if (ed.guardadoEn) { texto = `Guardado a las ${hora(ed.guardadoEn)}`; clase = "guardado--ok"; }
    caja.className = `guardado ${clase}`;
    caja.textContent = texto;
    $("#btn-descartar").hidden = !ed.id;
  }

  function renderFaltantes() {
    const lista = faltantes(leerCampos(), estado.editor.adjuntos);
    const caja = $("#carga-faltantes");
    caja.className = `faltantes${lista.length ? "" : " faltantes--completo"}`;
    caja.innerHTML = lista.length
      ? `<span>Para enviar falta:</span>${lista.map((x) => `<span class="faltantes__chip">${esc(x)}</span>`).join("")}`
      : `${icono("checkCircle")}<span>Completo: listo para la revisión de dirección.</span>`;
  }

  /** Botón "Ver" (abre el visor) y enlace "Descargar" de un adjunto que la persona puede abrir. */
  function accionesArchivo(a, url, claseVer = "") {
    const ver = SE_PUEDE_VER.test(a.nombre)
      ? `<button type="button" class="${claseVer}" data-accion="ver-adjunto" data-adjunto="${esc(a.id)}">Ver</button>` : "";
    return `${ver}<a href="${esc(url)}" download="${esc(a.nombre)}" data-adjunto="${esc(a.id)}">Descargar</a>`;
  }

  function previaAdjunto(a) {
    const url = api.urlAdjunto(a.id, { ver: true, miniatura: true });
    if (url && (a.esImagen || esImagenNombre(a.nombre))) return `<img src="${esc(url)}" alt="" loading="lazy">`;
    return esc(extensionDe(a.nombre));
  }

  function renderAdjuntosCarga() {
    const ed = estado.editor;
    const guardados = ed.adjuntos.map((a) => `
      <li class="adjunto-item">
        <span class="adjunto-item__previa" aria-hidden="true">${previaAdjunto(a)}</span>
        <span class="adjunto-item__info"><strong title="${esc(a.nombre)}">${esc(a.nombre)}</strong><small>${tamano(a.tamano)}</small></span>
        <span class="adjunto-item__acciones">
          ${api.urlAdjunto(a.id) ? accionesArchivo(a, api.urlAdjunto(a.id), "enlace") : ""}
          <button type="button" class="btn-icono btn-icono--peligro" data-accion="quitar-adjunto" data-id="${esc(a.id)}" aria-label="Quitar ${esc(a.nombre)}" title="Quitar del borrador">${icono("trash")}</button>
        </span>
      </li>`);
    const subiendo = ed.subiendo.map((a) => `
      <li class="adjunto-item adjunto-item--subiendo">
        <span class="adjunto-item__previa" aria-hidden="true">${esc(extensionDe(a.nombre))}</span>
        <span class="adjunto-item__info"><strong>${esc(a.nombre)}</strong><small>${tamano(a.tamano)}</small></span>
      </li>`);
    $("#lista-adjuntos").innerHTML = [...guardados, ...subiendo].join("");
    renderFaltantes();
  }

  /** Toma lo que devolvió el servidor (o la demo) después de cada operación sobre el borrador. */
  function aplicarRespuesta(contenido, enviados) {
    const ed = estado.editor;
    if (!ed || !contenido.borrador) return;
    ed.id = contenido.id;
    ed.adjuntos = contenido.borrador.adjuntos;
    ed.guardadoEn = contenido.borrador.actualizado;
    // si se siguió escribiendo mientras viajaba el pedido, los cambios nuevos siguen pendientes
    if (enviados) {
      ed.ultimoGuardado = JSON.stringify(enviados);
      ed.sucio = JSON.stringify(datosParaGuardar()) !== ed.ultimoGuardado;
    }
    renderGuardado();
    renderAdjuntosCarga();
  }

  /** Las operaciones sobre un borrador van en fila: así nunca se crean dos borradores por un doble clic. */
  function enCola(tarea) {
    const ed = estado.editor;
    const corrida = ed.cola.then(tarea, tarea);
    ed.cola = corrida.catch(() => {});
    return corrida;
  }

  function errorDelServidor(err, porDefecto) {
    if (err.codigo === "sin_sesion") { location.replace("index.html"); return; }
    mostrarErrores([err.message || porDefecto]);
  }

  /** Guarda el borrador (lo crea la primera vez). Devuelve true si quedó guardado. */
  function guardarBorrador() {
    return enCola(async () => {
      const ed = estado.editor;
      if (!ed) return false;
      // nada que guardar: ya existe y el formulario es igual a lo último guardado
      if (ed.id && !ed.sucio && JSON.stringify(datosParaGuardar()) === ed.ultimoGuardado) return true;
      const datos = datosParaGuardar();
      ed.guardando = true;
      renderGuardado();
      try {
        const r = ed.id ? await api.guardarBorrador(ed.id, datos) : await api.crearBorrador(datos);
        ed.guardando = false;
        aplicarRespuesta(r, datos);
        return true;
      } catch (err) {
        ed.guardando = false;
        renderGuardado();
        errorDelServidor(err, "No se pudo guardar el borrador.");
        return false;
      }
    });
  }

  function marcarSucio() {
    if (!estado.editor) return;
    estado.editor.sucio = true;
    estado.editor.cierreFallido = false; // volvió a editar: el próximo cierre intenta guardar otra vez
    renderGuardado();
    renderFaltantes();
  }

  /** Abre el editor: sin argumento, un contenido nuevo; con un contenido, su borrador (que tiene que ser propio). */
  function abrirEditor(contenido = null) {
    const b = contenido && contenido.borrador;
    const enviadoAntes = Boolean(contenido && contenido.versiones.length);
    estado.editor = {
      id: contenido ? contenido.id : null,
      slugEditable: b ? b.slugEditable : true,
      sucio: false, guardando: false, guardadoEn: b ? b.actualizado : null,
      adjuntos: b ? b.adjuntos : [], subiendo: [], cola: Promise.resolve(),
    };
    $("#form-carga").reset();
    prepararDesplegables();
    limpiarErrores();

    const slug = $("#c-slug");
    delete slug.dataset.manual;
    if (b) {
      marcarSitios(b.sitiosDestino || []);
      $("#c-tipo").value = tipoPorId(b.tipo) ? b.tipo : "";
      $("#c-seccion").value = b.seccion || "";
      slug.value = b.slug || "";
      if (b.slug) slug.dataset.manual = "1";
      $("#c-titulo").value = b.titulo;
      $("#c-resumen").value = b.resumen;
    }
    escribirCuerpo(b); // vacío si es un contenido nuevo (el reset del formulario no alcanza al editor)
    escribirPrioridad("c", b ? b.prioridad : null);
    slug.readOnly = !estado.editor.slugEditable;
    estado.editor.ultimoGuardado = b ? JSON.stringify(datosParaGuardar()) : null;

    pintarObservacionesEditor(contenido);
    if (enviadoAntes) {
      const v = ult(contenido);
      const publicado = contenido.estado === "publicado";
      const observado = contenido.estado === "devuelto";
      const enWeb = contenido.visibilidad && contenido.visibilidad.visible;
      $("#carga-contexto").textContent = publicado ? `Edición · versión ${v.numero + 1}`
        : observado ? `Corrección · versión ${v.numero + 1}` : `Nueva versión ${v.numero + 1}`;
      $("#carga-titulo").textContent = publicado ? `Editar «${v.titulo}»` : observado ? `Corregir «${v.titulo}»` : v.titulo;
      $("#carga-sub").textContent = publicado
        ? `Los sitios siguen mostrando la versión ${v.numero} hasta que la autoridad superior apruebe esta edición. Al enviarla pasa por la revisión de dirección.`
        : observado
          ? `Corregí lo observado y reenvialo: vuelve a pasar por la revisión de dirección y la decisión final.${enWeb ? " Mientras tanto, los sitios siguen mostrando la versión aprobada." : ""}`
          : `La versión ${v.numero} no cambia mientras preparás esta. Al enviarla empieza de nuevo por la revisión de dirección.`;
      $("#btn-enviar-texto").textContent = publicado ? "Enviar edición a revisión" : observado ? "Reenviar a revisión" : "Enviar nueva versión";
    } else {
      $("#carga-contexto").textContent = b ? "Contenido nuevo" : "Contenido nuevo, sin guardar";
      $("#carga-titulo").textContent = b && b.titulo ? b.titulo : "Cargar información institucional";
      $("#carga-sub").textContent = "Solo vos lo ves hasta que lo envíes. Podés guardarlo incompleto y seguir después desde «Borradores».";
      $("#btn-enviar-texto").textContent = "Enviar a revisión";
    }

    mostrarAyudaTipo();
    renderGuardado();
    renderAdjuntosCarga();
    $("#panel-carga").hidden = false;
    $("#panel-carga").scrollIntoView({ block: "nearest" });
    (enviadoAntes ? $("#c-titulo") : $('#c-sitios-opciones input[name="c-sitio"]')).focus();
  }

  function ocultarEditor() {
    $("#panel-carga").hidden = true;
    estado.editor = null;
  }

  /** Cerrar guarda lo pendiente. Si no se puede guardar, el editor queda abierto mostrando el motivo. */
  async function cerrarCarga() {
    const ed = estado.editor;
    if (!ed) return;
    const hayAlgo = ed.id || Object.values(leerCampos()).some(Boolean);
    const cambio = ed.sucio || (ed.id && JSON.stringify(datosParaGuardar()) !== ed.ultimoGuardado);
    // segundo intento después de un guardado fallido: se cierra sin los cambios que no se pudieron guardar
    if (cambio && hayAlgo && !ed.cierreFallido) {
      ed.sucio = true;
      if (!(await guardarBorrador())) {
        ed.cierreFallido = true;
        const caja = $("#carga-errores");
        caja.insertAdjacentHTML("beforeend", `<p class="errores__nota">Corregilo y volvé a guardar, o cerrá de nuevo para salir sin estos últimos cambios${ed.id ? " (lo guardado antes se conserva)" : ""}.</p>`);
        return;
      }
      aviso("Borrador guardado. Lo encontrás en «Borradores».", "ok");
    }
    ocultarEditor();
    await refrescar();
  }

  async function guardarYAvisar() {
    if (await guardarBorrador()) {
      limpiarErrores();
      aviso("Borrador guardado.", "ok");
      await refrescar();
    }
  }

  /** Valida en el navegador, sube los archivos y los suma al borrador (creándolo si hace falta). */
  async function agregarArchivos(archivos) {
    const ed = estado.editor;
    const rechazos = [];
    const aceptados = [];
    for (const archivo of archivos) {
      const extension = archivo.name.split(".").pop().toLowerCase();
      if (ed.adjuntos.length + ed.subiendo.length + aceptados.length >= MAX_ADJUNTOS) {
        rechazos.push(`Se permiten hasta ${MAX_ADJUNTOS} adjuntos por versión.`);
        break;
      }
      if (!EXTENSIONES_OK.includes(extension)) rechazos.push(`${archivo.name}: formato no permitido (se aceptan ${FORMATOS_OK}).`);
      else if (!mimeCoincide(extension, archivo.type)) rechazos.push(`${archivo.name}: el tipo del archivo (${archivo.type}) no corresponde a .${extension}.`);
      else if (archivo.size > MAX_BYTES) rechazos.push(`${archivo.name}: supera los 10 MB.`);
      else aceptados.push(archivo);
    }
    if (rechazos.length) mostrarErrores(rechazos); else limpiarErrores();
    if (!aceptados.length) return;

    const pendientes = aceptados.map((a) => ({ nombre: a.name, tamano: a.size }));
    ed.subiendo.push(...pendientes);
    renderAdjuntosCarga();
    if (!ed.id) ed.sucio = true; // el primer archivo crea el borrador con lo que haya escrito
    const listo = await guardarBorrador();
    try {
      if (!listo) return;
      await enCola(async () => aplicarRespuesta(await api.agregarAdjuntosBorrador(ed.id, aceptados)));
    } catch (err) {
      errorDelServidor(err, "No se pudieron subir los archivos.");
    } finally {
      if (estado.editor === ed) {
        ed.subiendo = ed.subiendo.filter((x) => !pendientes.includes(x));
        renderAdjuntosCarga();
      }
    }
  }

  async function quitarAdjunto(adjuntoId) {
    const ed = estado.editor;
    const adjunto = ed.adjuntos.find((a) => a.id === adjuntoId);
    try {
      await enCola(async () => aplicarRespuesta(await api.quitarAdjuntoBorrador(ed.id, adjuntoId)));
      if (adjunto) aviso(`${adjunto.nombre} se quitó del borrador.`, "ok");
    } catch (err) {
      errorDelServidor(err, "No se pudo quitar el archivo.");
    }
  }

  /** Enviar: valida todo, guarda lo pendiente y entra a la revisión de dirección. */
  async function enviarCarga(evento) {
    evento.preventDefault();
    const ed = estado.editor;
    if (!ed) return; // el editor se está abriendo o cerrando
    limpiarErrores();
    const campos = leerCampos();
    const falta = faltantes({ ...campos, slug: ed.slugEditable ? campos.slug : "fijo" }, ed.adjuntos);
    if (ed.subiendo.length) falta.push("Esperá a que terminen de subir los archivos");
    if (falta.length) {
      mostrarErrores([`Para enviar falta completar: ${falta.join(", ")}.`]);
      return;
    }
    // Primero queda guardado como borrador: si se cancela la confirmación, no se pierde nada.
    ed.sucio = ed.sucio || !ed.id;
    if (!(await guardarBorrador())) return;

    // El envío es un paso que se confirma: deja de ser borrador y entra a la cadena de aprobación.
    const nueva = estado.borradores.some((c) => c.id === ed.id && c.versiones.length);
    const n = ed.adjuntos.length;
    const { ok } = await confirmar({
      titulo: nueva ? "Enviar la nueva versión a revisión" : "Enviar a revisión",
      texto: `«${campos.titulo}» se envía ${n ? `con ${n} ${n === 1 ? "adjunto" : "adjuntos"}` : "sin adjuntos"}`
        + `${esUrgente(campos.prioridad) ? " y marcado como URGENTE: va primero en las bandejas" : ""}. Deja de ser un borrador: ya no vas a poder `
        + "editarlo, y le llega a un director de área para la revisión de dirección. Después decide la autoridad superior.",
      etiqueta: nueva ? "Enviar nueva versión" : "Enviar a revisión",
    });
    if (!ok || estado.editor !== ed) {
      if (estado.editor === ed) aviso("No se envió. Quedó guardado como borrador.", "ok");
      return;
    }

    const boton = $("#btn-enviar");
    boton.disabled = true;
    try {
      if (!(await guardarBorrador())) return; // por si se editó mientras estaba abierta la confirmación
      const enviado = await enCola(() => api.enviarBorrador(ed.id));
      ocultarEditor();
      aviso("Enviado a revisión. Un director de área lo revisa antes de elevarlo a la autoridad superior.", "ok");
      await refrescar();
      restablecerFiltros();
      estado.seleccionRevision = enviado.id;
      irA("revision");
    } catch (err) {
      errorDelServidor(err, "No se pudo enviar el contenido.");
    } finally {
      boton.disabled = false;
    }
  }

  async function descartarBorrador(id = estado.editor && estado.editor.id) {
    if (!id) return;
    const c = estado.borradores.find((x) => x.id === id);
    const nuevo = !c || !c.versiones.length;
    const { ok } = await confirmar({
      titulo: "Descartar el borrador",
      texto: nuevo
        ? "Se pierde lo escrito y se eliminan los archivos que subiste. No se puede deshacer."
        : "Se pierden los cambios de esta nueva versión y los archivos que agregaste en ella. La versión ya enviada no cambia.",
      etiqueta: "Descartar",
      peligro: true,
    });
    if (!ok) return;
    if (estado.editor && estado.editor.id === id) ocultarEditor();
    await ejecutar(api.descartarBorrador(id), "Borrador descartado.");
  }

  /** "Preparar nueva versión": crea (o retoma) el borrador de la siguiente versión y lo abre. */
  async function prepararNuevaVersion(id) {
    if (estado.editor) await cerrarCarga();
    if (estado.editor) return; // no se pudo guardar el que estaba abierto: queda a la vista con el motivo
    try {
      const c = await api.iniciarBorradorDeVersion(id);
      abrirEditor(c);
      refrescar();
    } catch (err) {
      if (err.codigo === "sin_sesion") { location.replace("index.html"); return; }
      aviso(err.message || "No se pudo preparar la nueva versión.", "error");
    }
  }

  function abrirBorrador(id) {
    const c = estado.borradores.find((x) => x.id === id);
    if (c) abrirEditor(c);
  }

  /* ---------- Visor de adjuntos ---------- */

  /** Busca un adjunto por id en el editor abierto y en los contenidos visibles (para el visor). */
  function buscarAdjunto(id) {
    const enEditor = estado.editor && estado.editor.adjuntos.find((a) => a.id === id);
    if (enEditor) return enEditor;
    for (const c of [...estado.contenidos, ...estado.borradores]) {
      const listas = [...c.versiones.map((v) => v.adjuntos), c.borrador ? c.borrador.adjuntos : []];
      for (const lista of listas) {
        const a = lista.find((x) => x.id === id);
        if (a) return a;
      }
    }
    return null;
  }

  async function abrirVisor(id) {
    const a = buscarAdjunto(id);
    const url = a && api.urlAdjunto(a.id, { ver: true });
    if (!url) return;
    const descarga = api.urlAdjunto(a.id);
    $("#visor-nombre").textContent = a.nombre;
    $("#visor-detalle").textContent = `${extensionDe(a.nombre).toUpperCase()} · ${tamano(a.tamano)}`;
    $("#visor-descargar").href = descarga;
    $("#visor-descargar").setAttribute("download", a.nombre);
    $("#visor-descargar").dataset.adjunto = a.id;
    api.registrarAccesoAdjunto(a.id, "ver"); // demo; con servidor ya lo registró el backend al servirlo
    $("#visor-pestana").href = url;

    const cuerpo = $("#visor-cuerpo");
    if (a.esImagen || esImagenNombre(a.nombre)) {
      cuerpo.innerHTML = `<img src="${esc(url)}" alt="${esc(a.nombre)}">`;
    } else if (/\.pdf$/i.test(a.nombre)) {
      cuerpo.innerHTML = `<iframe src="${esc(url)}" title="${esc(a.nombre)}"></iframe>`;
    } else if (/\.txt$/i.test(a.nombre)) {
      cuerpo.innerHTML = `<p class="visor__aviso">Cargando…</p>`;
      try {
        const r = await fetch(url, { credentials: "same-origin" });
        if (!r.ok) throw new Error(String(r.status));
        cuerpo.innerHTML = `<pre>${esc(await r.text())}</pre>`;
      } catch (e) {
        cuerpo.innerHTML = `<p class="visor__aviso">No se pudo mostrar el texto. Podés descargarlo.</p>`;
      }
    } else {
      cuerpo.innerHTML = `<p class="visor__aviso">Este formato no se puede mostrar en el navegador. Descargalo para abrirlo.</p>`;
    }
    $("#visor").showModal();
  }

  function cerrarVisor() {
    $("#visor").close();
    $("#visor-cuerpo").innerHTML = ""; // corta la carga de un PDF grande
  }

  /* ---------- Vista: control y auditoría (solo administrador) ---------- */

  const ZONA = "America/Argentina/Buenos_Aires";
  const FILTROS_AUDITORIA = { q: "", desde: "", hasta: "", usuario: "", modulo: "", accion: "", resultado: "", pagina: 1, porPagina: 25 };
  const hoyAR = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const diasAtras = (n) => new Date(Date.now() - 3 * 3600 * 1000 - n * 86400000).toISOString().slice(0, 10);
  const fechaAR = (iso) => new Date(iso).toLocaleDateString("es-AR", { timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric" });
  const horaAR = (iso) => new Date(iso).toLocaleTimeString("es-AR", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const RESULTADO = { ok: ["Realizado", "estado--publicado"], rechazado: ["Rechazado", "estado--rechazado"], error: ["Error", "estado--devuelto"] };

  function auditoriaEstado() {
    if (!estado.auditoria) {
      estado.auditoria = { pestana: "log", filtros: { ...FILTROS_AUDITORIA }, resultado: null, resumen: null, directorio: null, catalogo: null, abierto: null, cargando: false, error: null, consulta: 0 };
    }
    return estado.auditoria;
  }

  /** Primera carga de la vista: catálogo de filtros, directorio, indicadores y la primera página. */
  async function cargarAuditoria() {
    const a = auditoriaEstado();
    a.cargando = true;
    a.error = null;
    try {
      const [catalogo, directorio, resumen] = await Promise.all([
        a.catalogo || api.catalogoAuditoria(), api.directorio(), api.resumenAuditoria(),
      ]);
      Object.assign(a, { catalogo, directorio, resumen });
      await consultarRegistros({ redibujarVista: false });
    } catch (err) {
      if (err.codigo === "sin_sesion") { location.replace("index.html"); return; }
      a.error = err.message || "No se pudo cargar la auditoría.";
    } finally {
      a.cargando = false;
    }
    if (estado.vista === "auditoria") renderVista();
  }

  /** Vuelve a pedir la página con los filtros actuales. Solo redibuja la zona de resultados. */
  async function consultarRegistros({ redibujarVista = true } = {}) {
    const a = auditoriaEstado();
    const numero = ++a.consulta; // si llegan respuestas fuera de orden, gana la última consulta
    try {
      const r = await api.consultarAuditoria(a.filtros);
      if (numero !== a.consulta) return;
      a.resultado = r;
      a.error = null;
    } catch (err) {
      if (numero !== a.consulta) return;
      if (err.codigo === "sin_sesion") { location.replace("index.html"); return; }
      a.error = err.message || "No se pudo consultar la auditoría.";
    }
    if (redibujarVista && estado.vista === "auditoria") renderResultadosAuditoria();
  }

  function cambiarFiltro(campo, valor) {
    const a = auditoriaEstado();
    a.filtros[campo] = campo === "porPagina" ? Number(valor) : valor;
    if (campo !== "pagina") a.filtros.pagina = 1;
    a.abierto = null;
    consultarRegistros();
  }

  function aplicarRango(rango) {
    const a = auditoriaEstado();
    const desde = { hoy: hoyAR(), "7": diasAtras(6), "30": diasAtras(29), todo: "" }[rango];
    Object.assign(a.filtros, { desde, hasta: rango === "todo" ? "" : hoyAR(), pagina: 1 });
    renderVista();
    consultarRegistros();
  }

  const rangoActivo = (f) => {
    if (!f.desde && !f.hasta) return "todo";
    if (f.hasta !== hoyAR()) return null;
    return { [hoyAR()]: "hoy", [diasAtras(6)]: "7", [diasAtras(29)]: "30" }[f.desde] || null;
  };

  function verActividadDe(usuarioId) {
    const a = auditoriaEstado();
    a.pestana = "log";
    a.filtros = { ...FILTROS_AUDITORIA, usuario: usuarioId };
    renderVista();
    consultarRegistros();
  }

  async function exportarAuditoria() {
    try {
      const { url, nombre } = await api.exportarAuditoria(auditoriaEstado().filtros);
      if (!url) { aviso("Este navegador no permite descargar el archivo.", "error"); return; }
      const enlace = document.createElement("a");
      enlace.href = url;
      if (nombre) enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      aviso("Exportación lista. También quedó registrada en la auditoría.", "ok");
      consultarRegistros();
    } catch (err) {
      aviso(err.message || "No se pudo exportar.", "error");
    }
  }

  /* --- piezas --- */

  function resumenAuditoriaHtml(r) {
    const tarjetas = [
      { etiqueta: "Movimientos hoy", valor: r.movimientosHoy, nota: "acciones registradas desde las 0 h", icono: "history", tono: "verde" },
      { etiqueta: "Integrantes activos hoy", valor: r.integrantesActivosHoy, nota: "con al menos una acción realizada", icono: "users", tono: "verde" },
      { etiqueta: "Ingresos fallidos", valor: r.ingresosFallidos24h, nota: "en las últimas 24 horas", icono: "lock", tono: r.ingresosFallidos24h ? "ambar" : "gris" },
      { etiqueta: "Acciones rechazadas", valor: r.accionesRechazadas7d, nota: "intentos sin permiso o inválidos, 7 días", icono: "shield", tono: r.accionesRechazadas7d ? "ambar" : "gris" },
    ];
    return tarjetas.map(tarjetaMetrica).join("");
  }

  function opcionesUsuarios(personas, elegido) {
    const opcion = (p) => `<option value="${esc(p.id)}"${p.id === elegido ? " selected" : ""}>${esc(p.nombre)}${p.estado === "baja" ? " (dado de baja)" : ""}</option>`;
    const activos = personas.filter((p) => p.estado === "activo");
    const bajas = personas.filter((p) => p.estado === "baja");
    return `<option value="">Todos los integrantes</option>${activos.map(opcion).join("")}${bajas.length ? `<optgroup label="Dados de baja">${bajas.map(opcion).join("")}</optgroup>` : ""}`;
  }

  function opcionesAcciones(catalogo, elegida) {
    return `<option value="">Todas las acciones</option>` + catalogo.modulos.map((m) => {
      const acciones = catalogo.acciones.filter((x) => x.modulo === m);
      return `<optgroup label="${esc(m)}">${acciones.map((x) => `<option value="${esc(x.id)}"${x.id === elegida ? " selected" : ""}>${esc(x.etiqueta)}</option>`).join("")}</optgroup>`;
    }).join("");
  }

  function filtrosAuditoriaHtml(a) {
    const f = a.filtros;
    const rango = rangoActivo(f);
    const chip = (id, texto) => `<button type="button" class="chip${rango === id ? " chip--activo" : ""}" data-accion="auditoria-rango" data-rango="${id}" aria-pressed="${rango === id}">${texto}</button>`;
    const sel = (filtro, html, etiqueta) => `<label class="filtro-auditoria"><span>${etiqueta}</span><select class="select" data-filtro="${filtro}">${html}</select></label>`;
    return `
      <form class="filtros-auditoria" id="filtros-auditoria" role="search" aria-label="Filtros de la auditoría" onsubmit="return false">
        <div class="filtros-auditoria__fila">
          <label class="buscador buscador--auditoria">
            <span class="solo-lectores">Buscar en la auditoría</span>
            <input class="campo" type="search" data-filtro="q" value="${esc(f.q)}" placeholder="Buscar por detalle, nombre, correo o IP…" autocomplete="off">
          </label>
          <div class="chips" role="group" aria-label="Período">${chip("hoy", "Hoy")}${chip("7", "7 días")}${chip("30", "30 días")}${chip("todo", "Todo")}</div>
          <label class="filtro-auditoria filtro-auditoria--fecha"><span>Desde</span><input class="campo" type="date" data-filtro="desde" value="${esc(f.desde)}" max="${hoyAR()}"></label>
          <label class="filtro-auditoria filtro-auditoria--fecha"><span>Hasta</span><input class="campo" type="date" data-filtro="hasta" value="${esc(f.hasta)}" max="${hoyAR()}"></label>
        </div>
        <div class="filtros-auditoria__fila">
          ${sel("usuario", opcionesUsuarios(a.directorio, f.usuario), "Integrante")}
          ${sel("modulo", `<option value="">Todos los módulos</option>${a.catalogo.modulos.map((m) => `<option${m === f.modulo ? " selected" : ""}>${esc(m)}</option>`).join("")}`, "Módulo")}
          ${sel("accion", opcionesAcciones(a.catalogo, f.accion), "Acción")}
          ${sel("resultado", [["", "Todos"], ["ok", "Realizados"], ["rechazado", "Rechazados"], ["error", "Con error"]].map(([v, t]) => `<option value="${v}"${v === f.resultado ? " selected" : ""}>${t}</option>`).join(""), "Resultado")}
          <div class="filtros-auditoria__acciones">
            <button type="button" class="btn-texto" data-accion="auditoria-limpiar">Limpiar filtros</button>
            <button type="button" class="btn btn--claro btn--mini" data-accion="auditoria-exportar">${icono("download")}Exportar CSV</button>
          </div>
        </div>
      </form>`;
  }

  function quienHtml(u) {
    if (!u.nombre) {
      return `<span class="quien"><strong class="quien__nombre quien__nombre--anonimo">Sin cuenta</strong><span class="quien__correo">${esc(u.email || "correo no informado")}</span></span>`;
    }
    const enlace = u.id
      ? `<button type="button" class="quien__nombre enlace-filtro" data-accion="auditoria-ver-usuario" data-id="${esc(u.id)}" title="Ver solo la actividad de ${esc(u.nombre)}">${esc(u.nombre)}</button>`
      : `<strong class="quien__nombre">${esc(u.nombre)}</strong>`;
    return `<span class="quien">${enlace}<span class="quien__correo" title="${esc(u.email)}">${esc(u.email)}</span>${u.rol ? `<span class="quien__rol">${esc(api.roles[u.rol] ? api.roles[u.rol].nombre : u.rol)}</span>` : ""}</span>`;
  }

  function lugarHtml(r) {
    const u = r.ubicacion;
    const donde = [u.sede, u.sede ? null : u.red, u.pais].filter(Boolean).join(" · ");
    return `<span class="lugar"><strong>${esc(r.modulo)}</strong><span>${esc(u.ip)}${donde ? ` · ${esc(donde)}` : ""}</span></span>`;
  }

  function detalleRegistroHtml(r) {
    const p = r.peticion;
    const datos = [
      ["Fecha y hora exacta", `${fechaAR(r.fecha)} ${horaAR(r.fecha)} (Argentina) · ${r.fecha} UTC`],
      ["Pedido", `${p.metodo} ${p.ruta} → ${p.estado}${p.duracionMs ? ` en ${p.duracionMs} ms` : ""}`],
      ["Desde", [r.ubicacion.ip, r.ubicacion.red, r.ubicacion.sede, r.ubicacion.pais].filter(Boolean).join(" · ")],
      ["Navegador", p.navegador || "No informado"],
      ["Sobre", r.objeto ? `${{ contenido: "Contenido", usuario: "Integrante", adjunto: "Archivo", auditoria: "Auditoría" }[r.objeto.tipo]}${r.objeto.titulo ? `: ${r.objeto.titulo}` : ""}` : "—"],
      ["Registro", r.id],
    ];
    return `<dl class="registro-detalle__datos">${datos.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
  }

  function filaRegistro(r, abierto) {
    const [textoResultado, claseResultado] = RESULTADO[r.resultado] || RESULTADO.error;
    return `
      <tr class="registro-auditoria registro-auditoria--${r.resultado}${abierto ? " registro-auditoria--abierto" : ""}">
        <td class="registro-auditoria__fecha"><time datetime="${esc(r.fecha)}">${fechaAR(r.fecha)}<small>${horaAR(r.fecha)}</small></time></td>
        <td>${quienHtml(r.usuario)}</td>
        <td>${lugarHtml(r)}</td>
        <td class="registro-auditoria__movimiento">
          <span class="accion-etiqueta">${r.resultado === "ok" ? "" : "Intento rechazado · "}${esc(r.accionEtiqueta)}</span>
          <span class="registro-auditoria__detalle">${esc(r.detalle)}</span>
          ${r.motivo ? `<span class="registro-auditoria__motivo">${icono("x")}${esc(r.motivo)}</span>` : ""}
        </td>
        <td class="registro-auditoria__resultado">
          <span class="estado ${claseResultado}"><span class="estado__punto"></span>${textoResultado}</span>
          <button type="button" class="btn-icono" data-accion="auditoria-detalle" data-id="${esc(r.id)}" aria-expanded="${abierto}" aria-label="${abierto ? "Ocultar" : "Ver"} los datos técnicos de este registro" title="Datos técnicos">${icono("chevronRight")}</button>
        </td>
      </tr>
      ${abierto ? `<tr class="registro-detalle"><td colspan="5">${detalleRegistroHtml(r)}</td></tr>` : ""}`;
  }

  function paginacionHtml(res) {
    const desde = res.total ? (res.pagina - 1) * res.porPagina + 1 : 0;
    const hasta = Math.min(res.pagina * res.porPagina, res.total);
    return `
      <div class="paginacion">
        <p class="paginacion__texto">Mostrando <strong>${desde}–${hasta}</strong> de <strong>${res.total}</strong> ${res.total === 1 ? "movimiento" : "movimientos"}</p>
        <label class="paginacion__tamano"><span>Por página</span>
          <select class="select" data-filtro="porPagina">${[10, 25, 50, 100].map((n) => `<option${n === res.porPagina ? " selected" : ""}>${n}</option>`).join("")}</select>
        </label>
        <div class="paginacion__botones">
          <button type="button" class="btn btn--claro btn--mini" data-accion="auditoria-pagina" data-pagina="${res.pagina - 1}"${res.pagina <= 1 ? " disabled" : ""}>Anterior</button>
          <span class="paginacion__actual">Página ${res.pagina} de ${res.paginas}</span>
          <button type="button" class="btn btn--claro btn--mini" data-accion="auditoria-pagina" data-pagina="${res.pagina + 1}"${res.pagina >= res.paginas ? " disabled" : ""}>Siguiente</button>
        </div>
      </div>`;
  }

  function resultadosAuditoriaHtml(a) {
    if (a.error) return `<div class="callout callout--alerta"><p class="callout__texto">${esc(a.error)}</p></div>`;
    const res = a.resultado;
    if (!res) return `<p class="vacio">Cargando movimientos…</p>`;
    if (!res.total) return `<div class="vacio vacio--centrado"><p>No hay movimientos con estos filtros.</p></div>`;
    return `
      <div class="tabla-envoltura">
        <table class="tabla tabla--auditoria">
          <caption class="solo-lectores">Log de auditoría: del movimiento más reciente al más antiguo</caption>
          <thead><tr><th scope="col">Fecha y hora</th><th scope="col">Integrante</th><th scope="col">Lugar</th><th scope="col">Movimiento</th><th scope="col">Resultado</th></tr></thead>
          <tbody>${res.registros.map((r) => filaRegistro(r, a.abierto === r.id)).join("")}</tbody>
        </table>
      </div>
      ${paginacionHtml(res)}`;
  }

  function renderResultadosAuditoria() {
    const zona = $("#auditoria-resultados");
    if (zona) zona.innerHTML = resultadosAuditoriaHtml(auditoriaEstado());
  }

  /** Nombre del rol con su escalón en la cadena (el directorio necesita ver el rol, no la descripción). */
  function rolCompacto(rol) {
    const r = api.roles[rol];
    if (!r) return esc(rol);
    return `<span class="rol-compacto">${r.nivel ? `<span class="nivel nivel--${r.nivel}">Nivel ${r.nivel}</span>` : ""}<span>${esc(r.nombre)}</span></span>`;
  }

  function directorioHtml(a) {
    const personas = a.directorio;
    const activos = personas.filter((p) => p.estado === "activo").length;
    const filas = personas.map((p) => `
      <tr class="${p.estado === "baja" ? "fila-baja" : ""}">
        <td>
          <div class="persona">
            <span class="persona__avatar">${esc(iniciales(p.nombre))}</span>
            <span><strong class="persona__nombre">${esc(p.nombre)}</strong><span class="persona__correo"><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></span></span>
          </div>
        </td>
        <td class="celda-contacto">${p.telefono ? `<a href="tel:${esc(p.telefono.replace(/[^0-9+]/g, ""))}">${esc(p.telefono)}</a>` : `<span class="celda-suave">Sin teléfono</span>`}<small>${esc(p.area || "Sin área")}</small></td>
        <td>${rolCompacto(p.rol)}</td>
        <td><span class="estado ${p.estado === "activo" ? "estado--publicado" : "estado--archivado"}"><span class="estado__punto"></span>${p.estado === "activo" ? "Activo" : "Dado de baja"}</span></td>
        <td class="celda-suave">${p.creadoEn ? fechaAR(p.creadoEn) : "—"}</td>
        <td class="celda-suave">${p.ultimoAcceso ? `${fechaAR(p.ultimoAcceso)} ${horaAR(p.ultimoAcceso).slice(0, 5)}` : "Nunca ingresó"}</td>
        <td><strong>${p.movimientos30d}</strong><small class="celda-suave"> ${p.ultimoMovimiento ? `· último ${fechaAR(p.ultimoMovimiento)}` : ""}</small></td>
        <td><button type="button" class="btn btn--suave btn--mini" data-accion="auditoria-ver-usuario" data-id="${esc(p.id)}">Ver actividad</button></td>
      </tr>`).join("");
    return `
      <section class="panel" aria-labelledby="t-directorio">
        <header class="panel__cabecera">
          <div>
            <h3 class="panel__titulo" id="t-directorio">Registro de integrantes</h3>
            <p class="panel__sub">${activos} ${activos === 1 ? "activo" : "activos"} y ${personas.length - activos} ${personas.length - activos === 1 ? "dado de baja" : "dados de baja"}. Las bajas se conservan para que su actividad siga siendo auditable.</p>
          </div>
        </header>
        <div class="tabla-envoltura">
          <table class="tabla tabla--directorio">
            <thead><tr><th scope="col">Integrante</th><th scope="col">Contacto</th><th scope="col">Rol actual</th><th scope="col">Estado</th><th scope="col">Alta</th><th scope="col">Último acceso</th><th scope="col">Actividad (30 días)</th><th scope="col"><span class="solo-lectores">Acciones</span></th></tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </section>`;
  }

  function vistaAuditoria() {
    const a = auditoriaEstado();
    const encabezado = `
      <div class="encabezado-seccion">
        <div>
          <p class="etiqueta">Control y auditoría</p>
          <h2 class="titulo-seccion">Quién hizo qué, cuándo y desde dónde.</h2>
          <p class="bajada">Cada movimiento queda registrado automáticamente, también los intentos rechazados. Solo el administrador ve esta sección; los registros no se pueden editar ni borrar.</p>
        </div>
        <span class="pildora">${icono("shield")}Solo administración</span>
      </div>`;
    if (!a.catalogo || !a.directorio) {
      if (!a.cargando && !a.error) cargarAuditoria();
      return `${encabezado}${a.error ? `<div class="callout callout--alerta"><p class="callout__texto">${esc(a.error)}</p></div>` : `<p class="vacio">Cargando auditoría…</p>`}`;
    }
    const pestana = (id, texto) => `<button type="button" class="subpestana${a.pestana === id ? " subpestana--activa" : ""}" role="tab" aria-selected="${a.pestana === id}" data-accion="auditoria-pestana" data-pestana="${id}">${texto}</button>`;
    return `
      ${encabezado}
      <section class="metricas" id="auditoria-resumen" aria-label="Indicadores de actividad">${resumenAuditoriaHtml(a.resumen)}</section>
      <div class="subpestanas" role="tablist" aria-label="Secciones de la auditoría">
        ${pestana("log", `${icono("history")}Log de movimientos`)}
        ${pestana("directorio", `${icono("users")}Directorio de integrantes`)}
      </div>
      ${a.pestana === "log"
        ? `<section class="panel panel--auditoria" aria-label="Log de auditoría">${filtrosAuditoriaHtml(a)}<div id="auditoria-resultados" aria-live="polite">${resultadosAuditoriaHtml(a)}</div></section>`
        : directorioHtml(a)}`;
  }

  /* ---------- Cambiar la prioridad (revisores) ---------- */

  let prioridadEnEdicion = null;

  function abrirDialogoPrioridad(id) {
    const c = estado.contenidos.find((x) => x.id === id);
    if (!c) return;
    prioridadEnEdicion = c;
    escribirPrioridad("p", c.prioridad);
    $("#prioridad-sub").textContent = c.estado === "publicado"
      ? `«${ult(c).titulo}» ya está publicado: el cambio se ve enseguida en el sitio.`
      : `«${ult(c).titulo}». Queda en el historial con quién la cambió.`;
    $("#prioridad-errores").hidden = true;
    $("#dialogo-prioridad").showModal();
    $("#p-urgente").focus();
  }

  async function guardarPrioridad(evento) {
    evento.preventDefault();
    const c = prioridadEnEdicion;
    if (!c) return;
    const p = leerPrioridad("p");
    if (esUrgente(p) && vencida(p.vence)) {
      const caja = $("#prioridad-errores");
      caja.textContent = "La fecha hasta la que se destaca ya pasó: cambiala o dejala vacía.";
      caja.hidden = false;
      return;
    }
    const boton = $("#btn-prioridad");
    boton.disabled = true;
    try {
      await api.cambiarPrioridad(c.id, p);
      $("#dialogo-prioridad").close();
      aviso(esUrgente(p) ? "Marcado como urgente: va primero en las bandejas." : "Prioridad normal.", "ok");
      await refrescar();
    } catch (err) {
      if (err.codigo === "sin_sesion") { location.replace("index.html"); return; }
      const caja = $("#prioridad-errores");
      caja.textContent = err.message || "No se pudo cambiar la prioridad.";
      caja.hidden = false;
    } finally {
      boton.disabled = false;
    }
  }

  /* ---------- Vista: mis borradores ---------- */

  function tarjetaBorrador(c) {
    const b = c.borrador;
    const datos = { ...b, slug: b.slugEditable ? b.slug : "fijo" };
    const falta = faltantes(datos, b.adjuntos);
    const total = CAMPOS_OBLIGATORIOS.length;
    const completos = total - falta.filter((x) => CAMPOS_OBLIGATORIOS.some(([, n]) => n === x)).length;
    const contexto = c.versiones.length
      ? `Nueva versión ${c.versiones.length + 1} · ${pill(c.estado)}`
      : "Contenido nuevo";
    const sitios = sitiosDe(b.sitiosDestino);
    const tipo = tipoPorId(b.tipo);
    return `
      <article class="tarjeta-borrador">
        <div class="tarjeta-borrador__tope">${pill("borrador")}${marcaUrgente(b.prioridad)}<span>${contexto}</span></div>
        <h3 class="tarjeta-borrador__titulo${b.titulo ? "" : " tarjeta-borrador__titulo--vacio"}">${esc(b.titulo || "Sin título")}</h3>
        <p class="tarjeta-borrador__meta">${[sitios.length ? sitios.map((x) => x.corto).join(" + ") : "Sin sitio", tipo ? tipo.nombre : "sin tipo"].map(esc).join(" · ")}
          · ${b.adjuntos.length} ${b.adjuntos.length === 1 ? "adjunto" : "adjuntos"} · Guardado ${fechaCorta(b.actualizado)}</p>
        <div class="progreso${falta.length ? "" : " progreso--completo"}">
          <span>${falta.length ? `${completos} de ${total} campos · falta ${esc(falta.join(", ").toLowerCase())}` : "Completo: listo para enviar"}</span>
          <span class="progreso__barra" aria-hidden="true"><span style="width:${Math.round((completos / total) * 100)}%"></span></span>
        </div>
        <div class="tarjeta-borrador__acciones">
          <button type="button" class="btn-texto btn-texto--peligro" data-accion="descartar-borrador" data-id="${esc(c.id)}">Descartar</button>
          <button type="button" class="btn btn--primario btn--mini" data-accion="abrir-borrador" data-id="${esc(c.id)}">${icono("pencil")}Continuar</button>
        </div>
      </article>`;
  }

  function vistaBorradores() {
    const lista = [...estado.borradores].sort((a, b) => new Date(b.borrador.actualizado) - new Date(a.borrador.actualizado));
    const vacio = `
      <div class="panel vacio vacio--centrado">
        <p>No tenés borradores. Lo que empieces con «Nuevo contenido» queda guardado acá hasta que lo envíes.</p>
      </div>`;
    return `
      <div class="encabezado-seccion">
        <div>
          <p class="etiqueta">Trabajo en curso</p>
          <h2 class="titulo-seccion">Tus borradores.</h2>
          <p class="bajada">Solo vos los ves. Guardalos incompletos las veces que quieras; cuando estén listos, envialos a la revisión de dirección.</p>
        </div>
        <span class="pildora">${icono("lock")}Privados hasta enviarlos</span>
      </div>
      ${lista.length ? `<div class="borradores">${lista.map(tarjetaBorrador).join("")}</div>` : vacio}`;
  }

  /* ---------- Acciones ---------- */

  function irA(vista) {
    estado.vista = vista;
    if (location.hash !== `#${vista}`) location.hash = vista;
    else render();
  }

  const MENSAJE_RESOLUCION = {
    "revision:elevar": "Elevado a la autoridad superior para su decisión final.",
    "revision:devolver": "Contenido devuelto al autor con tus observaciones.",
    "decision:aprobar": "Aprobado y publicado: ya se ve en los sitios elegidos.",
    "decision:devolver": "Contenido devuelto al autor con tus observaciones.",
    "decision:rechazar": "Contenido rechazado. Queda cerrado y conservado en el historial.",
  };

  /** nivel: "revision" (director de área) o "decision" (autoridad superior). */
  async function resolver(nivel, id, decision) {
    const caja = $("#comentario-decision");
    const comentario = caja ? caja.value.trim() : "";
    if (decision !== "elevar" && decision !== "aprobar" && !comentario) {
      const error = $("#error-decision");
      error.textContent = decision === "rechazar"
        ? "Dejá asentado el motivo del rechazo."
        : "Explicá qué debe ajustarse para poder devolver el contenido.";
      error.hidden = false;
      caja.focus();
      return;
    }
    if (decision === "aprobar") {
      const c = estado.contenidos.find((x) => x.id === id);
      const donde = c ? nombresSitios(c.sitiosDestino) : "";
      const { ok } = await confirmar({
        titulo: "Aprobar y publicar",
        texto: `Al aprobarlo se publica en el acto${donde ? ` en ${donde}` : ""}: va a ser visible para cualquier persona en ${donde.includes(" y ") ? "esos sitios" : "ese sitio"}. Podés archivarlo después sin perder el registro.`,
        etiqueta: "Aprobar y publicar",
      });
      if (!ok) return;
    }
    if (decision === "rechazar") {
      const { ok } = await confirmar({
        titulo: "Rechazar de forma definitiva",
        texto: "El contenido queda cerrado: no se publica y no admite nuevas versiones. Todo su registro se conserva en el historial.",
        etiqueta: "Rechazar",
        peligro: true,
      });
      if (!ok) return;
    }
    const operacion = nivel === "revision" ? api.revisar : api.decidir;
    await ejecutar(operacion(id, { decision, comentario }), MENSAJE_RESOLUCION[`${nivel}:${decision}`]);
  }

  /** Solo para lo restaurado del archivo: lo nuevo se publica al aprobarse. */
  async function publicar(id) {
    const c = estado.contenidos.find((x) => x.id === id);
    const donde = c ? nombresSitios(c.sitiosDestino) : "";
    const { ok } = await confirmar({
      titulo: "Volver a publicar",
      texto: `El contenido vuelve a ser visible${donde ? ` en ${donde}` : ""}. Podés archivarlo después sin perder el registro.`,
      etiqueta: "Publicar",
    });
    if (ok) await ejecutar(api.publicar(id), `Publicado${donde ? ` en ${donde}` : ""}.`);
  }

  /** Dar de baja: confirmación con motivo obligatorio. Dice en qué sitios deja de verse. */
  async function archivar(id) {
    cerrarMenus();
    const c = estado.contenidos.find((x) => x.id === id);
    const titulo = c ? ult(c).titulo : "este contenido";
    const visible = c && c.visibilidad && c.visibilidad.visible;
    const { ok, motivo } = await confirmar({
      titulo: `¿Dar de baja «${titulo}»?`,
      texto: (visible
        ? `Deja de verse ahora mismo en ${nombresSitios(c.visibilidad.sitios)}.`
        : "No está visible en ningún sitio, pero sale del circuito editorial.")
        + " No se borra nada: versiones, archivos e historial se conservan y se puede reactivar.",
      etiqueta: "Dar de baja",
      conMotivo: true,
      motivoObligatorio: true,
      peligro: true,
    });
    if (ok) {
      await ejecutar(api.archivar(id, motivo),
        visible ? `«${titulo}» se dio de baja y ya no se ve en los sitios.` : `«${titulo}» se dio de baja.`);
    }
  }

  async function restaurar(id) {
    cerrarMenus();
    const { ok } = await confirmar({
      titulo: "Reactivar contenido",
      texto: "Vuelve al circuito editorial con su última versión. No aparece en los sitios hasta que la autoridad superior lo publique de nuevo.",
      etiqueta: "Reactivar",
    });
    if (ok) await ejecutar(api.restaurar(id), "Contenido reactivado. La autoridad superior lo publica de nuevo para mostrarlo en la web.");
  }

  async function cambiarUsuarioDemo(id) {
    try {
      const usuario = await api.iniciarSesion(id);
      estado.usuario = usuario;
      await refrescar();
      aviso(`Ahora ves el panel como ${usuario.nombre}.`, "ok");
    } catch (err) {
      aviso(err.message, "error");
    }
  }

  async function reiniciarDemo() {
    const { ok } = await confirmar({
      titulo: "Restablecer datos de ejemplo",
      texto: "Se borran los cambios hechos en este navegador y vuelven los contenidos de ejemplo.",
      etiqueta: "Restablecer",
    });
    if (!ok) return;
    await api.reiniciarDemo();
    estado.usuario = await api.sesion();
    restablecerFiltros();
    await refrescar();
    aviso("Datos de ejemplo restablecidos.", "ok");
  }

  function abrirContenido(id) {
    const c = estado.contenidos.find((x) => x.id === id);
    if (!c) return;
    restablecerFiltros();
    if (ABIERTOS.includes(c.estado)) {
      estado.seleccionRevision = id;
      irA("revision");
    } else {
      estado.seleccionHistorial = id;
      irA("historial");
    }
  }

  /* ---------- Eventos ---------- */

  function enlazarEventos() {
    document.addEventListener("click", async (e) => {
      // un clic fuera de un menú ⋯ abierto lo cierra
      if (!e.target.closest(".menu-acciones")) cerrarMenus();
      const el = e.target.closest("[data-accion]");
      if (!el || el.tagName === "SELECT") return;
      const { accion, id } = el.dataset;

      switch (accion) {
        case "menu-acciones": alternarMenu(el); break;
        case "abrir-contenido": abrirContenido(id); break;
        case "seleccionar-revision": estado.seleccionRevision = id; renderVista(); break;
        case "seleccionar-historial": estado.seleccionHistorial = id; renderVista(); break;
        case "revision":
        case "decision": await resolver(accion, id, el.dataset.decision); break;
        case "publicar": await publicar(id); break;
        case "archivar": await archivar(id); break;
        case "restaurar": await restaurar(id); break;
        case "nueva-version": cerrarMenus(); await prepararNuevaVersion(id); break;
        case "abrir-carga":
          if (estado.editor) await cerrarCarga();
          if (!estado.editor) abrirEditor();
          break;
        case "abrir-borrador":
          if (estado.editor) await cerrarCarga();
          if (!estado.editor) abrirBorrador(id);
          break;
        case "cerrar-carga": await cerrarCarga(); break;
        case "guardar-borrador": await guardarYAvisar(); break;
        case "descartar-borrador": await descartarBorrador(id); break;
        case "elegir-archivos": $("#c-archivos").click(); break;
        case "quitar-adjunto": await quitarAdjunto(id); break;
        case "ver-adjunto": await abrirVisor(el.dataset.adjunto); break;
        case "abrir-prioridad": abrirDialogoPrioridad(id); break;
        case "cerrar-prioridad": $("#dialogo-prioridad").close(); break;
        case "auditoria-pestana": auditoriaEstado().pestana = el.dataset.pestana; renderVista(); break;
        case "auditoria-rango": aplicarRango(el.dataset.rango); break;
        case "auditoria-pagina": cambiarFiltro("pagina", Number(el.dataset.pagina)); break;
        case "auditoria-limpiar": auditoriaEstado().filtros = { ...FILTROS_AUDITORIA }; renderVista(); consultarRegistros(); break;
        case "auditoria-exportar": await exportarAuditoria(); break;
        case "auditoria-ver-usuario": verActividadDe(id); break;
        case "auditoria-detalle": {
          const a = auditoriaEstado();
          a.abierto = a.abierto === id ? null : id;
          renderResultadosAuditoria();
          break;
        }
        case "cerrar-visor": cerrarVisor(); break;
        case "agregar-integrante": abrirIntegrante(); break;
        case "editar-integrante": abrirIntegrante(id); break;
        case "baja-integrante": await darDeBaja(id); break;
        case "cerrar-integrante": cerrarIntegrante(); break;
        case "generar-clave": $("#i-clave").value = generarClave(); $("#i-clave").select(); break;
        case "reiniciar-demo": await reiniciarDemo(); break;
        case "cambiar-clave": abrirCambioClave(false); break;
        case "cerrar-sesion":
          await api.cerrarSesion();
          location.replace("index.html");
          break;
        default: break;
      }
    });

    document.addEventListener("keydown", tecladoMenu);
    document.addEventListener("input", (e) => {
      if (e.target.id !== "comentario-decision") return;
      const contador = $("#contador-decision");
      if (contador) contador.textContent = `${e.target.value.length} / ${MAX_OBSERVACION}`;
    });

    document.addEventListener("change", async (e) => {
      const el = e.target;
      if (el.matches('[data-accion="cambiar-rol"]')) {
        await ejecutar(api.cambiarRol(el.dataset.id, el.value), "Rol actualizado.");
      } else if (el.matches("[data-filtro]") && el.dataset.filtro !== "q") {
        cambiarFiltro(el.dataset.filtro, el.value);
        if (["desde", "hasta"].includes(el.dataset.filtro)) renderVista(); // actualiza los chips de período
      } else if (el.id === "selector-demo") {
        await cambiarUsuarioDemo(el.value);
      }
    });

    $("#f-q").addEventListener("input", (e) => { estado.filtros.q = e.target.value; renderVista(); });
    $("#f-estado").addEventListener("change", (e) => { estado.filtros.estado = e.target.value; renderVista(); });
    $("#f-sitio").addEventListener("change", (e) => { estado.filtros.sitio = e.target.value; renderVista(); });
    $("#f-seccion").addEventListener("change", (e) => { estado.filtros.seccion = e.target.value; renderVista(); });
    $("#c-sitios-opciones").addEventListener("change", mostrarAyudaTipo);
    $("#c-tipo").addEventListener("change", mostrarAyudaTipo);
    $("#f-orden").addEventListener("change", (e) => { estado.filtros.orden = e.target.value; renderVista(); });
    $("#f-prioridad").addEventListener("change", (e) => { estado.filtros.prioridad = e.target.value; renderVista(); });

    editorCuerpo = Nexo.editorTexto
      ? Nexo.editorTexto.crear({ textarea: $("#c-cuerpo"), barra: $("#c-cuerpo-barra"), alCambiar: marcarSucio })
      : null;
    $("#form-carga").addEventListener("submit", enviarCarga);
    $("#form-prioridad").addEventListener("submit", guardarPrioridad);
    $("#c-urgente").addEventListener("change", () => mostrarPrioridad("c"));
    $("#p-urgente").addEventListener("change", () => mostrarPrioridad("p"));
    $("#dialogo-prioridad").addEventListener("close", () => { prioridadEnEdicion = null; });

    // buscador de la auditoría: espera a que se deje de escribir para no pedir una página por tecla
    let esperaBusqueda = null;
    document.addEventListener("input", (e) => {
      if (!e.target.matches('[data-filtro="q"]')) return;
      clearTimeout(esperaBusqueda);
      const valor = e.target.value;
      esperaBusqueda = setTimeout(() => cambiarFiltro("q", valor), 300);
    });

    // en la demo los archivos se abren desde el navegador: se avisa para dejar el registro (con servidor no hace nada)
    document.addEventListener("click", (e) => {
      const descarga = e.target.closest("a[download][data-adjunto]");
      if (descarga) api.registrarAccesoAdjunto(descarga.dataset.adjunto, "descargar");
    });
    $("#visor").addEventListener("close", () => { $("#visor-cuerpo").innerHTML = ""; });
    $("#form-integrante").addEventListener("submit", guardarIntegrante);
    $("#i-rol").addEventListener("change", mostrarAyudaRol);
    $("#dialogo-integrante").addEventListener("close", () => { estado.integranteEnEdicion = null; });

    $("#c-slug").addEventListener("input", (e) => { e.target.dataset.manual = "1"; });
    $("#c-titulo").addEventListener("input", (e) => {
      const slug = $("#c-slug");
      if (estado.editor && estado.editor.slugEditable && !slug.dataset.manual) slug.value = slugify(e.target.value);
    });
    // cualquier cambio en el formulario deja el borrador "sin guardar"
    $("#form-carga").addEventListener("input", marcarSucio);
    $("#form-carga").addEventListener("change", (e) => { if (e.target.id !== "c-archivos") marcarSucio(); });

    $("#c-archivos").addEventListener("change", (e) => {
      const archivos = [...e.target.files];
      e.target.value = "";
      agregarArchivos(archivos);
    });

    // arrastrar y soltar archivos sobre la zona de adjuntos
    const zona = $("#zona-adjuntos");
    ["dragenter", "dragover"].forEach((tipo) => zona.addEventListener(tipo, (e) => {
      e.preventDefault();
      zona.classList.add("zona-adjuntos--activa");
    }));
    ["dragleave", "drop"].forEach((tipo) => zona.addEventListener(tipo, () => zona.classList.remove("zona-adjuntos--activa")));
    zona.addEventListener("drop", (e) => {
      e.preventDefault();
      if (estado.editor && e.dataTransfer) agregarArchivos([...e.dataTransfer.files]);
    });

    // salir de la página con cambios sin guardar: el navegador pregunta antes
    window.addEventListener("beforeunload", (e) => {
      if (estado.editor && (estado.editor.sucio || estado.editor.subiendo.length)) e.preventDefault();
    });

    window.addEventListener("hashchange", () => {
      estado.vista = vistaDesdeHash();
      render();
      $("#vista").focus({ preventScroll: true });
    });
  }

  /* ---------- Inicio ---------- */

  async function iniciar() {
    const usuario = await api.sesion();
    if (!usuario) { location.replace("index.html"); return; }
    estado.usuario = usuario;
    prepararDialogoClave();
    prepararMenuMovil();
    // Contraseña provisional: primero hay que elegir una propia (el servidor no atiende nada más hasta entonces).
    if (usuario.debeCambiarClave) await abrirCambioClave(true);
    estado.vista = vistaDesdeHash();
    await api.iniciarArchivos(); // en la demo: los archivos guardados en el navegador
    construirMenu();
    enlazarEventos();
    await refrescar();
  }

  iniciar();
})();
