"use strict";

/* Catálogo de movimientos auditables: única fuente de verdad para el esquema (enum de acciones), el middleware
 * (qué pedido es qué acción) y la interfaz (filtros por acción y por módulo). No depende de la base ni de Express. */

/** Áreas del portal desde donde se opera (el "lugar" funcional de cada movimiento). */
const MODULOS = [
  "Acceso",
  "Borradores",
  "Revisión editorial",
  "Publicaciones",
  "Archivos adjuntos",
  "Gobernanza",
  "Auditoría",
];

const RESULTADOS = ["ok", "rechazado", "error"];

/** código -> { etiqueta (para filtros), modulo } */
const ACCIONES = {
  "sesion.inicio": { etiqueta: "Inició sesión", modulo: "Acceso" },
  "sesion.fallida": { etiqueta: "Intento de ingreso fallido", modulo: "Acceso" },
  "sesion.cierre": { etiqueta: "Cerró sesión", modulo: "Acceso" },

  "borrador.crear": { etiqueta: "Creó borrador de contenido", modulo: "Borradores" },
  "borrador.nueva_version": { etiqueta: "Empezó una nueva versión", modulo: "Borradores" },
  "borrador.editar": { etiqueta: "Editó un borrador", modulo: "Borradores" },
  "borrador.adjuntar": { etiqueta: "Adjuntó archivo", modulo: "Borradores" },
  "borrador.quitar_adjunto": { etiqueta: "Quitó archivo", modulo: "Borradores" },
  "borrador.enviar": { etiqueta: "Envió a revisión", modulo: "Borradores" },
  "borrador.descartar": { etiqueta: "Descartó borrador", modulo: "Borradores" },
  "contenido.crear_y_enviar": { etiqueta: "Cargó y envió contenido", modulo: "Borradores" },
  "contenido.enviar_version": { etiqueta: "Envió nueva versión", modulo: "Borradores" },

  "revision.elevar": { etiqueta: "Elevó a la autoridad superior", modulo: "Revisión editorial" },
  "revision.devolver": { etiqueta: "Pidió cambios (dirección)", modulo: "Revisión editorial" },
  "decision.aprobar": { etiqueta: "Aprobó y publicó", modulo: "Revisión editorial" },
  "decision.devolver": { etiqueta: "Devolvió al autor (autoridad)", modulo: "Revisión editorial" },
  "decision.rechazar": { etiqueta: "Rechazó contenido", modulo: "Revisión editorial" },
  "contenido.prioridad": { etiqueta: "Cambió la prioridad", modulo: "Revisión editorial" },

  "contenido.publicar": { etiqueta: "Publicó en la web", modulo: "Publicaciones" },
  "contenido.archivar": { etiqueta: "Dio de baja un contenido", modulo: "Publicaciones" },
  "contenido.restaurar": { etiqueta: "Reactivó un contenido", modulo: "Publicaciones" },

  "adjunto.ver": { etiqueta: "Abrió archivo", modulo: "Archivos adjuntos" },
  "adjunto.descargar": { etiqueta: "Descargó archivo", modulo: "Archivos adjuntos" },

  "equipo.agregar": { etiqueta: "Agregó integrante", modulo: "Gobernanza" },
  "equipo.editar": { etiqueta: "Editó datos de integrante", modulo: "Gobernanza" },
  "equipo.cambiar_rol": { etiqueta: "Cambió rol", modulo: "Gobernanza" },
  "equipo.baja": { etiqueta: "Dio de baja a integrante", modulo: "Gobernanza" },

  "auditoria.exportar": { etiqueta: "Exportó la auditoría", modulo: "Auditoría" },
};

const NOMBRES_ROL = {
  observador: "Observador", colaborador: "Colaborador", director: "Director de área",
  autoridad: "Autoridad superior", administrador: "Administrador",
};

const ETIQUETAS_CAMPO = {
  titulo: "título", resumen: "resumen", cuerpo: "texto", cuerpoHtml: "formato del texto", sitiosDestino: "sitios", tipo: "tipo", seccion: "categoría",
  slug: "identificador web", nombre: "nombre", email: "correo", telefono: "teléfono", area: "área",
};

/* ---------- Redacción del detalle ---------- */

const comillas = (t) => (t ? `«${t}»` : "un contenido sin título");
/** "título, resumen y texto"; la "y" pasa a "e" ante sonido i ("categoría e identificador"), pero no ante "hie". */
function lista(xs) {
  if (xs.length <= 1) return xs.join("");
  const ultimo = xs[xs.length - 1];
  const conjuncion = /^(i|hi)(?!e)/i.test(ultimo) ? "e" : "y";
  return `${xs.slice(0, -1).join(", ")} ${conjuncion} ${ultimo}`;
}

/** Título de un contenido tal como viene en la respuesta (o lo que se leyó antes de atender el pedido). */
function tituloDe(contenido) {
  if (!contenido) return null;
  if (contenido.borrador && contenido.borrador.titulo) return contenido.borrador.titulo;
  const v = contenido.versiones && contenido.versiones[contenido.versiones.length - 1];
  return (v && v.titulo) || null;
}

/** Qué campos cambiaron entre dos objetos (para "Editó título y resumen"). */
function camposCambiados(antes = {}, despues = {}, campos = Object.keys(ETIQUETAS_CAMPO)) {
  const comparable = (x) => (Array.isArray(x) ? x.join(",") : x ?? "");
  const cambiados = campos.filter((c) => c in despues && comparable(antes[c]) !== comparable(despues[c]));
  // si cambió el texto, cambió también su HTML: se informa solo "texto"; "formato del texto" queda para cuando
  // solo se tocó el formato (negrita, listas, alineación…)
  return cambiados.filter((c) => !(c === "cuerpoHtml" && cambiados.includes("cuerpo"))).map((c) => ETIQUETAS_CAMPO[c]);
}

/** Agrega el comentario del revisor al detalle (recortado). */
const conNota = (texto, ok, nota) => {
  const limpia = typeof nota === "string" ? nota.trim() : "";
  return ok && limpia ? `${texto}: “${limpia.slice(0, 160)}”` : texto;
};

const prioridad = require("../prioridad");
const { nombreSitio } = require("../sitios");

/** " como urgente" cuando el contenido quedó marcado así (para envíos). */
const comoUrgente = (c) => (c && c.prioridad && c.prioridad.nivel === "urgente" ? " como urgente" : "");

const versionDe = (c) => (c && c.versiones ? c.versiones.length : null);

/** Dar de baja: la misma regla para DELETE /api/contenidos/:id y para el nombre anterior POST …/archivar. */
const BAJA = {
  ruta: "/api/contenidos/:id/archivar", accion: "contenido.archivar", antes: "contenido",
  detalle: ({ req, previo, ok }) =>
    conNota(`${ok ? "Dio de baja" : "Intentó dar de baja"} ${comillas(tituloDe(previo))}`, ok, req.body && req.body.motivo),
};

/*
 * Cada regla: método + ruta (con :parametros) -> acción, y cómo armar el detalle.
 *   accion:  código, o función (req) => código cuando depende del cuerpo (ej. aprobar / rechazar)
 *   antes:   qué leer de la base ANTES de atender el pedido (para saber el título, el rol anterior, etc.)
 *   detalle: ({ req, cuerpo, previo, ok }) => texto. "cuerpo" es la respuesta JSON; "previo", lo leído antes.
 * Las lecturas (listar contenidos, ver la sesión) no se registran: son ruido y no cambian nada. Sí se registra
 * abrir o descargar un archivo, porque es acceso a material que puede no estar publicado.
 */
const REGLAS = [
  {
    metodo: "POST", ruta: "/api/auth/login", accion: (req, res) => (res.statusCode < 400 ? "sesion.inicio" : "sesion.fallida"),
    antes: "usuarioPorCorreo",
    detalle: ({ ok, res }) => (ok ? "Inició sesión"
      : res.statusCode === 429 ? "Ingreso bloqueado por demasiados intentos" : "Intento de ingreso con correo o contraseña incorrectos"),
  },
  { metodo: "POST", ruta: "/api/auth/logout", accion: "sesion.cierre", detalle: () => "Cerró sesión" },

  {
    metodo: "POST", ruta: "/api/borradores", accion: "borrador.crear",
    detalle: ({ cuerpo, ok }) => {
      const n = ok && cuerpo.borrador ? cuerpo.borrador.adjuntos.length : 0;
      return `Creó el borrador ${comillas(ok && tituloDe(cuerpo))}${n ? ` con ${n} ${n === 1 ? "archivo" : "archivos"}` : ""}`;
    },
  },
  {
    metodo: "POST", ruta: "/api/contenidos/:id/borrador", accion: "borrador.nueva_version", antes: "contenido",
    detalle: ({ previo, cuerpo, ok }) => `Empezó la versión ${(versionDe(ok ? cuerpo : previo) || 0) + 1} de ${comillas(tituloDe(previo))}`,
  },
  {
    metodo: "PUT", ruta: "/api/contenidos/:id/borrador", accion: "borrador.editar", antes: "contenido",
    detalle: ({ previo, cuerpo, ok }) => {
      const titulo = tituloDe(ok ? cuerpo : previo);
      if (!ok) return `Intentó editar el borrador ${comillas(titulo)}`;
      const antes = { ...(previo && previo.borrador), slug: previo && previo.slug };
      const cambios = camposCambiados(antes, { ...cuerpo.borrador });
      const priAntes = (previo && previo.borrador && previo.borrador.prioridad) || null;
      if (!prioridad.iguales(priAntes, cuerpo.borrador.prioridad)) cambios.push(`prioridad (${prioridad.describir(cuerpo.borrador.prioridad)})`);
      return cambios.length ? `Editó ${lista(cambios)} del borrador ${comillas(titulo)}` : `Guardó el borrador ${comillas(titulo)} sin cambios`;
    },
  },
  {
    metodo: "POST", ruta: "/api/contenidos/:id/borrador/adjuntos", accion: "borrador.adjuntar", antes: "contenido",
    detalle: ({ req, previo, ok }) => {
      const nombres = (req.files || []).map((f) => Buffer.from(f.originalname, "latin1").toString("utf8"));
      return `${ok ? "Adjuntó" : "Intentó adjuntar"} ${nombres.length ? lista(nombres) : "archivos"} al borrador ${comillas(tituloDe(previo))}`;
    },
  },
  {
    metodo: "DELETE", ruta: "/api/contenidos/:id/borrador/adjuntos/:adjuntoId", accion: "borrador.quitar_adjunto", antes: "contenido",
    detalle: ({ req, previo, ok }) => {
      const a = previo && (previo.adjuntos || []).find((x) => String(x._id) === req.params.adjuntoId);
      return `${ok ? "Quitó" : "Intentó quitar"} ${a ? a.nombreOriginal : "un archivo"} del borrador ${comillas(tituloDe(previo))}`;
    },
  },
  {
    metodo: "POST", ruta: "/api/contenidos/:id/borrador/enviar", accion: "borrador.enviar", antes: "contenido",
    detalle: ({ previo, cuerpo, ok }) => (ok
      ? `Envió a revisión ${comillas(tituloDe(cuerpo))} (versión ${versionDe(cuerpo)})${comoUrgente(cuerpo)}`
      : `Intentó enviar a revisión ${comillas(tituloDe(previo))}`),
  },
  {
    metodo: "DELETE", ruta: "/api/contenidos/:id/borrador", accion: "borrador.descartar", antes: "contenido",
    detalle: ({ previo }) => `Descartó el borrador ${comillas(tituloDe(previo))}`,
  },
  {
    metodo: "POST", ruta: "/api/contenidos", accion: "contenido.crear_y_enviar",
    detalle: ({ cuerpo, ok }) => (ok ? `Cargó y envió a revisión ${comillas(tituloDe(cuerpo))}${comoUrgente(cuerpo)}` : "Intentó cargar un contenido"),
  },
  {
    metodo: "POST", ruta: "/api/contenidos/:id/versiones", accion: "contenido.enviar_version", antes: "contenido",
    detalle: ({ previo, cuerpo, ok }) => (ok
      ? `Envió la versión ${versionDe(cuerpo)} de ${comillas(tituloDe(cuerpo))}${comoUrgente(cuerpo)}`
      : `Intentó enviar una nueva versión de ${comillas(tituloDe(previo))}`),
  },

  {
    metodo: "POST", ruta: "/api/contenidos/:id/revision", antes: "contenido",
    accion: (req) => (req.body && req.body.decision === "devolver" ? "revision.devolver" : "revision.elevar"),
    detalle: ({ req, previo, ok }) => {
      const devolver = req.body && req.body.decision === "devolver";
      const titulo = comillas(tituloDe(previo));
      const texto = ok
        ? (devolver ? `Pidió cambios en ${titulo}` : `Elevó ${titulo} a la autoridad superior`)
        : (devolver ? `Intentó pedir cambios en ${titulo}` : `Intentó elevar ${titulo}`);
      return conNota(texto, ok, req.body && req.body.comentario);
    },
  },
  {
    metodo: "POST", ruta: "/api/contenidos/:id/decision", antes: "contenido",
    accion: (req) => ({ aprobar: "decision.aprobar", rechazar: "decision.rechazar" })[req.body && req.body.decision] || "decision.devolver",
    detalle: ({ req, previo, cuerpo, ok }) => {
      const d = req.body && req.body.decision;
      const [hecho, intento] = { aprobar: ["Aprobó", "aprobar"], rechazar: ["Rechazó", "rechazar"] }[d] || ["Devolvió al autor", "devolver"];
      // al aprobar se publica automáticamente: el detalle dice en qué sitios quedó visible
      const donde = ok && d === "aprobar" && cuerpo && cuerpo.publicada && cuerpo.publicada.sitios.length
        ? ` y lo publicó en ${lista(cuerpo.publicada.sitios.map(nombreSitio))}` : "";
      const texto = `${ok ? hecho : `Intentó ${intento}`} ${comillas(tituloDe(previo))}${donde}`;
      return conNota(texto, ok, req.body && req.body.comentario);
    },
  },
  {
    metodo: "PATCH", ruta: "/api/contenidos/:id/prioridad", accion: "contenido.prioridad", antes: "contenido",
    detalle: ({ req, previo, ok }) => {
      const titulo = comillas(tituloDe(previo));
      const pedida = req.body && typeof req.body === "object" ? req.body : {};
      const nueva = pedida.nivel === "urgente" ? "urgente" : "normal";
      if (!ok) return `Intentó cambiar a ${nueva} la prioridad de ${titulo}`;
      const antes = prioridad.describir(previo && previo.prioridad);
      const despues = prioridad.describir({ ...pedida, vence: pedida.vence ? new Date(`${String(pedida.vence).slice(0, 10)}T23:59:59.999-03:00`) : null });
      return antes === despues ? `Confirmó la prioridad ${despues} de ${titulo}` : `Cambió la prioridad de ${titulo}: de ${antes} a ${despues}`;
    },
  },
  {
    metodo: "POST", ruta: "/api/contenidos/:id/publicar", accion: "contenido.publicar", antes: "contenido",
    detalle: ({ previo, cuerpo, ok }) => (ok
      ? `Publicó ${comillas(tituloDe(cuerpo))} (versión ${cuerpo.publicada ? cuerpo.publicada.version : versionDe(cuerpo)})`
      : `Intentó publicar ${comillas(tituloDe(previo))}`),
  },
  // dar de baja: DELETE /api/contenidos/:id o el nombre anterior POST …/archivar (misma acción en la bitácora)
  { metodo: "DELETE", ...BAJA, ruta: "/api/contenidos/:id" },
  { metodo: "POST", ...BAJA },
  {
    metodo: "POST", ruta: "/api/contenidos/:id/restaurar", accion: "contenido.restaurar", antes: "contenido",
    detalle: ({ previo, ok }) => `${ok ? "Reactivó" : "Intentó reactivar"} ${comillas(tituloDe(previo))}`,
  },

  {
    metodo: "GET", ruta: "/api/adjuntos/:id", antes: "adjunto",
    // las miniaturas se cargan solas cada vez que se dibuja la bandeja: registrarlas llenaría la bitácora de ruido
    accion: (req) => (req.query && req.query.miniatura === "1" ? null
      : req.query && req.query.ver === "1" ? "adjunto.ver" : "adjunto.descargar"),
    detalle: ({ req, previo, ok }) => {
      const ver = req.query && req.query.ver === "1";
      const nombre = previo && previo.adjunto ? previo.adjunto.nombreOriginal : "un archivo";
      const de = previo && previo.contenido ? ` de ${comillas(tituloDe(previo.contenido))}` : "";
      return `${ok ? (ver ? "Abrió" : "Descargó") : (ver ? "Intentó abrir" : "Intentó descargar")} ${nombre}${de}`;
    },
  },

  {
    metodo: "POST", ruta: "/api/usuarios", accion: "equipo.agregar",
    detalle: ({ req, cuerpo, ok }) => (ok
      ? `${cuerpo.reactivado ? "Reactivó" : "Agregó"} a ${cuerpo.nombre} (${cuerpo.email}) como ${NOMBRES_ROL[cuerpo.rol]}`
      : `Intentó agregar a ${String((req.body && req.body.email) || "un integrante").slice(0, 160)}`),
  },
  {
    metodo: "PATCH", ruta: "/api/usuarios/:id/rol", accion: "equipo.cambiar_rol", antes: "usuario",
    detalle: ({ req, previo, ok }) => {
      const nuevo = NOMBRES_ROL[req.body && req.body.rol] || "un rol inválido";
      const quien = previo ? previo.nombre : "un integrante";
      return ok
        ? `Cambió el rol de ${quien} de ${NOMBRES_ROL[previo.rol]} a ${nuevo}`
        : `Intentó cambiar el rol de ${quien} a ${nuevo}`;
    },
  },
  {
    metodo: "PATCH", ruta: "/api/usuarios/:id", accion: "equipo.editar", antes: "usuario",
    detalle: ({ req, previo, cuerpo, ok }) => {
      const quien = previo ? previo.nombre : "un integrante";
      if (!ok) return `Intentó editar los datos de ${quien}`;
      const cambios = camposCambiados(previo || {}, cuerpo, ["nombre", "email", "telefono", "area"]);
      if (req.body && typeof req.body.password === "string" && req.body.password) cambios.push("contraseña (restablecida)");
      return cambios.length ? `Editó ${lista(cambios)} de ${quien}` : `Guardó los datos de ${quien} sin cambios`;
    },
  },
  {
    metodo: "DELETE", ruta: "/api/usuarios/:id", accion: "equipo.baja", antes: "usuario",
    detalle: ({ previo, ok }) => `${ok ? "Dio de baja" : "Intentó dar de baja"} a ${previo ? `${previo.nombre} (${previo.email})` : "un integrante"}`,
  },

  {
    metodo: "GET", ruta: "/api/auditoria/exportar", accion: "auditoria.exportar",
    detalle: ({ res }) => `Exportó la auditoría (${res.getHeader("X-Total-Registros") || 0} registros, CSV)`,
  },
];

/* "/api/contenidos/:id" -> expresión regular con grupos nombrados */
for (const regla of REGLAS) {
  const patron = regla.ruta.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\?:([a-zA-Z]+)/g, (_, p) => `(?<${p}>[^/]+)`);
  regla.expresion = new RegExp(`^${patron}/?$`);
}

/** La regla que corresponde a un pedido (o null si no es un movimiento auditable). */
function reglaPara(metodo, ruta) {
  for (const regla of REGLAS) {
    if (regla.metodo !== metodo) continue;
    const m = regla.expresion.exec(ruta);
    if (m) return { regla, params: m.groups || {} };
  }
  return null;
}

module.exports = { ACCIONES, MODULOS, RESULTADOS, NOMBRES_ROL, REGLAS, reglaPara, tituloDe };
