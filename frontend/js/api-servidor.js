/* api-servidor.js — conecta el frontend con la API real.
 * Si config.modo es "servidor", reemplaza las funciones de Nexo.api (que en modo demo usan localStorage)
 * por pedidos HTTP con la misma firma. Las reglas de permisos de la interfaz (puede, puedeRevisar…) se mantienen
 * solo para mostrar u ocultar botones: la decisión real la toma siempre el servidor.
 */
(function () {
  "use strict";

  const config = Nexo.config || {};
  if (config.modo !== "servidor") return;

  const { api, ErrorNexo } = Nexo;
  const base = config.urlApi || "/api";
  const ruta = encodeURIComponent;

  async function pedir(metodo, camino, cuerpo) {
    const opciones = { method: metodo, credentials: "same-origin", headers: { Accept: "application/json" } };
    if (cuerpo instanceof FormData) {
      opciones.body = cuerpo;
    } else if (cuerpo !== undefined) {
      opciones.headers["Content-Type"] = "application/json";
      opciones.body = JSON.stringify(cuerpo);
    }

    let respuesta;
    try {
      respuesta = await fetch(base + camino, opciones);
    } catch (e) {
      throw new ErrorNexo("No pudimos conectar con el servidor. Revisá tu conexión.", "red");
    }

    let datos = null;
    try { datos = await respuesta.json(); } catch (e) { /* respuesta sin cuerpo */ }

    if (!respuesta.ok) {
      const error = (datos && datos.error) || {};
      throw new ErrorNexo(error.mensaje || "Ocurrió un error inesperado.", error.codigo || "error");
    }
    return datos;
  }

  /** Arma el multipart: los datos del formulario en JSON + los archivos nuevos + los ids de adjuntos que se conservan. */
  function formulario(datos) {
    const { adjuntos = [], ...campos } = datos;
    const conservar = adjuntos.filter((a) => a.id && !a.archivo).map((a) => a.id);
    const envio = new FormData();
    envio.append("datos", JSON.stringify({ ...campos, conservar }));
    adjuntos.filter((a) => a.archivo).forEach((a) => envio.append("adjuntos", a.archivo, a.nombre));
    return envio;
  }

  /** Solo los filtros con valor, como query string. */
  const consulta = (filtros) => new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)])
  ).toString();

  Object.assign(api, {
    modoDemo: false,

    async sesion() {
      return (await pedir("GET", "/auth/sesion")).usuario;
    },

    async iniciarSesion({ email, password }) {
      return (await pedir("POST", "/auth/login", { email, password })).usuario;
    },

    async cerrarSesion() {
      await pedir("POST", "/auth/logout");
    },

    /** Cambia la propia contraseña. Devuelve el usuario actualizado (ya sin contraseña provisional). */
    async cambiarClave({ actual, nueva }) {
      return (await pedir("POST", "/auth/cambiar-clave", { actual, nueva })).usuario;
    },

    async reiniciarDemo() {
      throw new ErrorNexo("Esta acción solo existe en el modo demostración.", "no_disponible");
    },

    listarUsuarios: () => pedir("GET", "/usuarios"),
    cambiarRol: (id, rol) => pedir("PATCH", `/usuarios/${ruta(id)}/rol`, { rol }),
    agregarIntegrante: ({ nombre, email, rol, password }) => pedir("POST", "/usuarios", { nombre, email, rol, password }),
    editarIntegrante: (id, { nombre, email, password }) => pedir("PATCH", `/usuarios/${ruta(id)}`, { nombre, email, password }),
    darDeBaja: (id) => pedir("DELETE", `/usuarios/${ruta(id)}`),

    /** { prioridad: "urgente" | "normal", orden: "prioridad" } -> el servidor filtra y ordena (urgente primero). */
    listarContenidos: (opciones = {}) => {
      const q = consulta(opciones);
      return pedir("GET", `/contenidos${q ? `?${q}` : ""}`);
    },
    bandeja: (opciones = {}) => {
      const q = consulta(opciones);
      return pedir("GET", `/contenidos/bandeja${q ? `?${q}` : ""}`);
    },
    cambiarPrioridad: (id, { nivel, motivo, vence }) => pedir("PATCH", `/contenidos/${ruta(id)}/prioridad`, { nivel, motivo, vence }),

    /* Borradores: los archivos se suben apenas se eligen (quedan guardados aunque se cierre la página). */
    crearBorrador: (datos) => pedir("POST", "/borradores", datos),
    iniciarBorradorDeVersion: (id) => pedir("POST", `/contenidos/${ruta(id)}/borrador`),
    guardarBorrador: (id, datos) => pedir("PUT", `/contenidos/${ruta(id)}/borrador`, datos),
    agregarAdjuntosBorrador(id, archivos) {
      const envio = new FormData();
      archivos.forEach((archivo) => envio.append("adjuntos", archivo, archivo.name));
      return pedir("POST", `/contenidos/${ruta(id)}/borrador/adjuntos`, envio);
    },
    quitarAdjuntoBorrador: (id, adjuntoId) => pedir("DELETE", `/contenidos/${ruta(id)}/borrador/adjuntos/${ruta(adjuntoId)}`),
    enviarBorrador: (id) => pedir("POST", `/contenidos/${ruta(id)}/borrador/enviar`),
    descartarBorrador: (id) => pedir("DELETE", `/contenidos/${ruta(id)}/borrador`),

    /** URL para ver (imágenes, PDF, texto) o descargar un adjunto. El servidor decide si la persona puede abrirlo. */
    iniciarArchivos: () => Promise.resolve(), // con servidor no hay nada que preparar
    /** URL para ver (imágenes, PDF, texto) o descargar un adjunto. El servidor decide si la persona puede abrirlo.
     *  Las miniaturas van marcadas para que no se registren en la auditoría como "abrió el archivo". */
    urlAdjunto: (id, { ver = false, miniatura = false } = {}) =>
      `${base}/adjuntos/${ruta(id)}${ver ? `?ver=1${miniatura ? "&miniatura=1" : ""}` : ""}`,

    /* Control y auditoría (solo administrador). El backend registra cada movimiento por su cuenta. */
    catalogoAuditoria: () => pedir("GET", "/auditoria/catalogo"),
    consultarAuditoria: (filtros = {}) => pedir("GET", `/auditoria?${consulta(filtros)}`),
    resumenAuditoria: () => pedir("GET", "/auditoria/resumen"),
    directorio: () => pedir("GET", "/directorio"),
    /** La descarga la hace el navegador con la sesión: así el archivo llega directo y la exportación queda auditada. */
    exportarAuditoria: async (filtros = {}) => ({ url: `${base}/auditoria/exportar?${consulta(filtros)}`, nombre: null }),
    registrarAccesoAdjunto: () => {}, // con servidor lo registra el backend al servir el archivo
    crearContenido: (datos) => pedir("POST", "/contenidos", formulario(datos)),
    enviarNuevaVersion: (id, datos) => pedir("POST", `/contenidos/${ruta(id)}/versiones`, formulario(datos)),
    revisar: (id, { decision, comentario }) => pedir("POST", `/contenidos/${ruta(id)}/revision`, { decision, comentario }),
    decidir: (id, { decision, comentario }) => pedir("POST", `/contenidos/${ruta(id)}/decision`, { decision, comentario }),
    publicar: (id) => pedir("POST", `/contenidos/${ruta(id)}/publicar`, {}),
    // dar de baja (borrado lógico): DELETE /api/contenidos/:id con el motivo
    archivar: (id, motivo) => pedir("DELETE", `/contenidos/${ruta(id)}`, { motivo }),
    restaurar: (id) => pedir("POST", `/contenidos/${ruta(id)}/restaurar`, {}),

    publico: {
      // toda consulta pública es para un sitio: solo devuelve lo que la autoridad superior aprobó para ese sitio
      listar: ({ sitio, urgentes = false } = {}) => pedir("GET", `/publico/sitios/${ruta(sitio)}/publicaciones${urgentes ? "?urgentes=1" : ""}`),
      obtener: (sitio, slug) => pedir("GET", `/publico/sitios/${ruta(sitio)}/publicaciones/${ruta(slug)}`),
    },
  });
})();
