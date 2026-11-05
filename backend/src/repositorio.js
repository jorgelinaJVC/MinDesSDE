"use strict";

/* Convierte los documentos de MongoDB al formato que espera el frontend (ids como texto, fechas ISO). */

const { coleccion } = require("./db");
const { SITIOS, TIPOS, nombreSitio } = require("./sitios");
const prioridad = require("./prioridad");

const iso = (fecha) => (fecha ? new Date(fecha).toISOString() : null);
const texto = (id) => String(id);

const esImagen = (mime) => typeof mime === "string" && mime.startsWith("image/");
const formatearAdjunto = (a) => ({
  id: texto(a._id), nombre: a.nombreOriginal, tamano: a.tamano, esImagen: esImagen(a.tipoMime),
});

const formatearRegistro = (r) => (r
  ? { tipo: r.tipo, usuarioId: texto(r.usuarioId), fecha: iso(r.fecha), comentario: r.comentario || "" }
  : null);

function formatearVersion(v, adjuntos) {
  const propios = new Set(v.adjuntos.map(texto));
  return {
    numero: v.numero,
    autorId: texto(v.autorId),
    fecha: iso(v.creadaEn),
    titulo: v.titulo,
    resumen: v.resumen,
    cuerpo: v.cuerpo,
    cuerpoHtml: v.cuerpoHtml ?? null,
    adjuntos: adjuntos.filter((a) => propios.has(texto(a._id))).map(formatearAdjunto),
    estado: v.estado,
    revision: formatearRegistro(v.revision), // director de área (no existe en versiones anteriores a la cadena de 3 niveles)
    decision: formatearRegistro(v.decision), // autoridad superior
  };
}

function formatearObservacion(o) {
  return {
    id: texto(o._id),
    version: o.version,
    nivel: o.nivel,
    usuarioId: texto(o.usuarioId),
    rol: o.rol,
    mensaje: o.mensaje,
    fecha: iso(o.fecha),
    atendida: Boolean(o.atendidaEn),
    atendidaEn: o.atendidaEn ? iso(o.atendidaEn) : null,
    atendidaEnVersion: o.atendidaEnVersion ?? null,
  };
}

/** El borrador solo viaja a quien lo escribe; para el resto, no existe. */
function formatearBorrador(c, lector) {
  const b = c.borrador;
  if (!b || !lector || texto(b.autorId) !== lector.id) return null;
  const propios = new Set(b.adjuntos.map(texto));
  return {
    autorId: texto(b.autorId),
    titulo: b.titulo,
    resumen: b.resumen,
    cuerpo: b.cuerpo,
    cuerpoHtml: b.cuerpoHtml ?? null,
    sitiosDestino: b.sitiosDestino || [],
    tipo: b.tipo,
    seccion: b.seccion,
    prioridad: { ...prioridad.NORMAL, ...(b.prioridad || {}), vence: b.prioridad && b.prioridad.vence ? iso(b.prioridad.vence) : null },
    slug: c.slug ?? null, // editable solo mientras el contenido nunca se envió
    slugEditable: c.versiones.length === 0,
    // en el orden en que se agregaron al borrador
    adjuntos: b.adjuntos.map((id) => c.adjuntos.find((a) => texto(a._id) === texto(id))).filter(Boolean)
      .filter((a) => propios.has(texto(a._id))).map(formatearAdjunto),
    iniciado: iso(b.iniciadoEn),
    actualizado: iso(b.actualizadoEn),
  };
}

/** Los eventos del borrador en curso (la versión que todavía no se envió) solo los ve quien lo escribe. */
function historialVisible(c, lector) {
  const pendiente = c.versiones.length + 1;
  const esDelBorrador = (e) => e.version === pendiente && e.tipo !== "envio";
  const esSuyo = c.borrador && lector && texto(c.borrador.autorId) === lector.id;
  return esSuyo ? c.historial : c.historial.filter((e) => !esDelBorrador(e));
}

const enumerarSitios = (ids) => {
  const nombres = ids.map(nombreSitio);
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}` : nombres.join("");
};

/* Lo que espera la versión que está en el circuito, para quien la creó. */
const ESPERA = {
  en_revision: "pendiente de la revisión de dirección",
  elevado: "pendiente de aprobación de la Autoridad Superior",
  devuelto: "observada: el autor tiene que corregirla y reenviarla",
  rechazado: "rechazada por la Autoridad Superior",
  aprobado: "aprobada, falta volver a publicarla",
};

/**
 * Indicador de visibilidad para el panel: en qué sitios se ve hoy el contenido y qué está pendiente.
 *   codigo: borrador | pendiente | devuelto | rechazado | visible | visible_con_cambios | retirado | listo | sin_destino
 * Se calcula con los mismos campos que lee la vista pública (versionPublicada + destinoPublicado), así que
 * "visible" en el panel significa exactamente "lo devuelve la API pública de esos sitios".
 */
function visibilidad(c) {
  const publicados = c.versionPublicada != null && c.destinoPublicado ? c.destinoPublicado.sitios : [];
  const destino = c.sitiosDestino || [];
  const ultimaVersion = c.versiones.length ? c.versiones[c.versiones.length - 1].numero : 0;
  const base = { visible: publicados.length > 0, sitios: publicados, sitiosDestino: destino };

  if (c.estado === "borrador") {
    return { ...base, codigo: "borrador", texto: "Borrador: no es visible en ningún sitio" };
  }
  if (c.estado === "archivado") {
    return { ...base, codigo: "retirado", texto: "Retirado: ya no se ve en ningún sitio" };
  }
  if (publicados.length) {
    const texto = `Aprobada y visible en ${enumerarSitios(publicados)}`;
    // hay una versión nueva en el circuito: lo publicado sigue igual hasta que se apruebe
    if (c.versionPublicada !== ultimaVersion && ESPERA[c.estado]) {
      const cambiaDestino = destino.join() !== publicados.join();
      return {
        ...base, codigo: "visible_con_cambios", texto,
        pendiente: `Versión ${ultimaVersion} ${ESPERA[c.estado]}`
          + (cambiaDestino && ["en_revision", "elevado"].includes(c.estado)
            ? `; al aprobarse se verá en ${enumerarSitios(destino)}` : ""),
      };
    }
    return { ...base, codigo: "visible", texto, pendiente: null };
  }
  if (c.versionPublicada != null) {
    return { ...base, codigo: "sin_destino", texto: "Publicado sin sitio asignado: no aparece en ningún sitio. Enviá una versión nueva eligiendo el destino." };
  }
  const aDonde = destino.length ? ` (destino: ${enumerarSitios(destino)})` : "";
  if (c.estado === "aprobado") return { ...base, codigo: "listo", texto: `Aprobada, falta publicarla${aDonde}` };
  if (c.estado === "devuelto") return { ...base, codigo: "devuelto", texto: `Observada: el autor tiene que corregirla; todavía no es visible${aDonde}` };
  if (c.estado === "rechazado") return { ...base, codigo: "rechazado", texto: "Rechazada: no se publicará" };
  return {
    ...base, codigo: "pendiente",
    texto: `${c.estado === "elevado" ? "Pendiente de aprobación de la Autoridad Superior" : "Pendiente de la revisión de dirección"}: todavía no es visible${aDonde}`,
  };
}

/**
 * Un documento de la colección contenidos -> contenido completo (versiones, adjuntos e historial).
 * "lector" es quien lo pide: decide si se incluye su borrador.
 */
function formatearContenido(c, lector = null) {
  const versiones = c.versiones.map((v) => formatearVersion(v, c.adjuntos));
  const publicada = c.versionPublicada ? versiones.find((v) => v.numero === c.versionPublicada) : null;

  return {
    id: texto(c._id),
    sitiosDestino: c.sitiosDestino || [],
    tipo: c.tipo ?? null,
    seccion: c.seccion,
    slug: c.slug,
    autorId: texto(c.autorId),
    estado: c.estado,
    prioridad: prioridad.formatear(c.prioridad),
    prioridadPublicada: c.versionPublicada ? prioridad.formatear(c.prioridadPublicada) : null,
    borrador: formatearBorrador(c, lector),
    // observaciones de los revisores (internas: nunca salen en la API pública)
    observaciones: (c.observaciones || []).map(formatearObservacion),
    visibilidad: visibilidad(c),
    creado: iso(c.creadoEn),
    actualizado: iso(c.actualizadoEn),
    publicada: publicada
      ? {
          slug: c.slug,
          // destino aprobado con esta versión (puede diferir de sitiosDestino si hay una versión nueva en revisión)
          sitios: c.destinoPublicado ? c.destinoPublicado.sitios : [],
          tipo: c.destinoPublicado ? c.destinoPublicado.tipo : c.tipo ?? null,
          seccion: c.destinoPublicado ? c.destinoPublicado.seccion : c.seccion,
          titulo: publicada.titulo, resumen: publicada.resumen,
          cuerpo: publicada.cuerpo, cuerpoHtml: publicada.cuerpoHtml ?? null, adjuntos: publicada.adjuntos, version: publicada.numero,
          fecha: iso(c.publicadoEn),
        }
      : null,
    versiones,
    historial: historialVisible(c, lector).map((e) => ({
      id: texto(e._id),
      tipo: e.tipo,
      usuarioId: texto(e.usuarioId),
      fecha: iso(e.fecha),
      version: e.version,
      comentario: e.comentario,
    })),
  };
}

/** Lo que ve cada persona: todo lo que entró al circuito, más sus propios borradores. Nunca los ajenos. */
const esVisible = (c, lector) =>
  c.estado !== "descartado" && (c.estado !== "borrador" || (c.borrador && texto(c.borrador.autorId) === lector.id));

/** Orden de las bandejas: lo urgente primero y, dentro de cada nivel, lo que lleva más tiempo esperando. */
const ORDEN_BANDEJA = { "prioridad.nivel": -1, actualizadoEn: 1, _id: 1 };

/** Filtro de prioridad ya validado: "urgente", "normal" o null (todas). */
function filtroPrioridad(nivel) {
  if (nivel === "urgente") return { "prioridad.nivel": "urgente" };
  if (nivel === "normal") return { "prioridad.nivel": { $ne: "urgente" } }; // incluye los anteriores, sin el campo
  return {};
}

/**
 * Contenidos visibles para "lector". Opciones (ya validadas por quien llama):
 *   prioridad: "urgente" | "normal" | null
 *   orden: "prioridad" (urgente primero, después lo más antiguo) | null (orden de carga)
 */
async function listarContenidos(lector, { prioridad: nivel = null, orden = null } = {}) {
  const contenidos = await coleccion("contenidos");
  const documentos = await contenidos
    .find({ estado: { $ne: "descartado" }, ...filtroPrioridad(nivel) })
    .sort(orden === "prioridad" ? ORDEN_BANDEJA : { _id: 1 })
    .toArray();
  return documentos.filter((c) => esVisible(c, lector)).map((c) => formatearContenido(c, lector));
}

/* ---------- Vista pública (lee solo vista_publicaciones) ---------- */

/** Una publicación tal como la reciben los sitios externos. Las URL de los archivos son relativas a Nexo. */
function formatearPublicacion(p, ahora = new Date()) {
  const adjuntos = (p.adjuntos || []).map((a) => ({
    id: texto(a.id),
    nombre: a.nombre,
    tamano: a.tamano,
    esImagen: esImagen(a.tipoMime),
    url: `/api/publico/adjuntos/${texto(a.id)}`,
  }));
  return {
    slug: p.slug,
    sitios: p.sitios || [],
    tipo: p.tipo ?? null,
    seccion: p.seccion, // categoría o etiqueta
    titulo: p.titulo,
    resumen: p.resumen,
    cuerpo: p.cuerpo,
    cuerpoHtml: p.cuerpoHtml ?? null, // HTML ya limpio en Nexo; los sitios lo vuelven a filtrar al mostrarlo
    imagenes: adjuntos.filter((a) => a.esImagen),
    documentos: adjuntos.filter((a) => !a.esImagen),
    adjuntos: adjuntos.map(({ id, nombre, tamano }) => ({ id, nombre, tamano })),
    fecha: iso(p.fecha),
    // aviso urgente: se destaca mientras no pase su fecha (el motivo interno no sale de Nexo)
    urgente: prioridad.destacadaEnSitio(p.prioridad, ahora),
    urgenteHasta: prioridad.destacadaEnSitio(p.prioridad, ahora) && p.prioridad.vence ? iso(p.prioridad.vence) : null,
  };
}

/**
 * Consulta de un sitio sobre la vista pública. El sitio es OBLIGATORIO: sin él no hay consulta.
 *   { sitios: "<id>" }  -> coincide si el id está en el arreglo de sitios aprobados (índice multikey)
 * La vista ya excluye todo lo que no aprobó la Autoridad Superior; ver VISTA_PUBLICACIONES en bd/esquema.js.
 */
function filtroSitio(sitio, extra = {}) {
  if (typeof sitio !== "string" || !sitio) throw new Error("Las consultas públicas siempre se hacen para un sitio.");
  return { sitios: sitio, ...extra };
}

/** Límite de publicaciones por pedido (los sitios muestran las más recientes). */
const LIMITE_PUBLICACIONES = { porDefecto: 50, maximo: 100, desdeMaximo: 100000 };

/** Aviso urgente vigente: urgente y sin fecha de fin, o con la fecha todavía por delante. */
const filtroDestacadas = (ahora) => ({
  "prioridad.nivel": "urgente",
  $or: [{ "prioridad.vence": null }, { "prioridad.vence": { $gte: ahora } }],
});

/**
 * Publicaciones visibles en un sitio, listas para que el sitio las dibuje.
 *   sitio (obligatorio), tipo (noticia | proyecto | galeria), soloUrgentes, limite (1 a 100),
 *   desde (cuántas saltear: para "Ver todas", el sitio pide desde=8, desde=32… sobre el mismo orden).
 *
 * Orden: primero los avisos urgentes vigentes y después el resto; cada grupo, del más reciente al más antiguo.
 * Son dos consultas sobre la vista para que el límite se aplique en MongoDB sin perder un urgente que quede más
 * abajo por fecha (con un solo sort por fecha, un urgente viejo podría caer fuera del límite):
 *   1. { sitios: S, [tipo], prioridad.nivel: "urgente", vigente }   sort fecha -1, limit N
 *   2. { sitios: S, [tipo], $nor: [ <lo anterior> ] }                 sort fecha -1, limit N - (cuántos dio la 1)
 * Las dos usan el índice ix_contenidos_publicado_sitio (destinoPublicado.sitios + publicadoEn) a través de la vista.
 */
async function listarPublicaciones({ sitio, tipo, soloUrgentes = false, limite = LIMITE_PUBLICACIONES.porDefecto, desde = 0 } = {}) {
  const base = filtroSitio(sitio, tipo ? { tipo } : {});
  const ahora = new Date();
  const destacadas = filtroDestacadas(ahora);
  const orden = { fecha: -1, contenidoId: -1 };
  const vista = await coleccion("vista_publicaciones");

  const urgentes = await vista.find({ ...base, ...destacadas }).sort(orden).skip(desde).limit(limite).toArray();
  const quedan = limite - urgentes.length;
  // limit(0) en MongoDB significa "sin límite": si los urgentes ya llenaron el cupo, la segunda consulta no se hace
  if (soloUrgentes || quedan <= 0) return urgentes.map((f) => formatearPublicacion(f, ahora));
  // páginas siguientes: del resto se saltean las que ya se mostraron después de los urgentes
  const totalUrgentes = desde > 0 ? await vista.countDocuments({ ...base, ...destacadas }) : 0;
  const resto = await vista.find({ ...base, $nor: [destacadas] }).sort(orden)
    .skip(Math.max(0, desde - totalUrgentes)).limit(quedan).toArray();
  return [...urgentes, ...resto].map((f) => formatearPublicacion(f, ahora));
}

/** Una publicación de un sitio: si existe pero se publicó en otro sitio, para este no existe. */
async function obtenerPublicacion(sitio, slug) {
  if (typeof slug !== "string") return null;
  const vista = await coleccion("vista_publicaciones");
  const fila = await vista.findOne(filtroSitio(sitio, { slug }));
  return fila ? formatearPublicacion(fila) : null;
}

const listarSitios = () => ({
  sitios: SITIOS.map(({ id, nombre, corto, activo }) => ({ id, nombre, corto, activo })),
  tipos: TIPOS.map(({ id, nombre }) => ({ id, nombre })),
});

module.exports = { formatearContenido, visibilidad, filtroSitio, filtroDestacadas, LIMITE_PUBLICACIONES, esVisible, listarContenidos, ORDEN_BANDEJA, filtroPrioridad, listarPublicaciones, obtenerPublicacion, listarSitios };
