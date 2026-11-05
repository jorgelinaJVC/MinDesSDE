"use strict";

const { Router } = require("express");
const { crear } = require("../errores");
const { listarPublicaciones, obtenerPublicacion, listarSitios, LIMITE_PUBLICACIONES } = require("../repositorio");
const { buscarParaDescarga } = require("../servicios/adjuntos");
const { existeSitio, existeTipo } = require("../sitios");

const router = Router();

/* La API pública es de solo lectura y solo expone lo publicado, así que la pueden leer otros sitios
 * (el portal de Adultos Mayores, el de Mama Antula…) aunque estén en otro dominio o puerto.
 * No viajan cookies: un sitio externo nunca actúa con la sesión de nadie. */
router.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Cross-Origin-Resource-Policy", "cross-origin"); // permite mostrar las imágenes en otros sitios
  if (req.method === "OPTIONS") return res.sendStatus(204);
  if (req.method !== "GET" && req.method !== "HEAD") throw crear("prohibido", "La API pública es de solo lectura.");
  return next();
});

// Catálogo de sitios y tipos de contenido.
router.get("/sitios", (req, res) => {
  res.json(listarSitios());
});

/* Los sitios piden siempre la versión fresca (así lo que aprueba la autoridad aparece en la próxima carga),
 * pero el navegador revalida con ETag (Express lo calcula solo): si nada cambió, la respuesta es un 304 vacío. */
const sinCacheVieja = (res) => res.set("Cache-Control", "public, no-cache");

/** ?limite=: entero de 1 a 100 (por defecto 50). */
function limiteDe(req) {
  if (req.query.limite == null || req.query.limite === "") return LIMITE_PUBLICACIONES.porDefecto;
  const n = Number(req.query.limite);
  if (!Number.isInteger(n) || n < 1 || n > LIMITE_PUBLICACIONES.maximo) {
    throw crear("datos_invalidos", `El límite tiene que ser un número entre 1 y ${LIMITE_PUBLICACIONES.maximo}.`);
  }
  return n;
}

/** ?desde=: cuántas publicaciones saltear (entero desde 0; por defecto 0). Sirve para "Ver todas". */
function desdeDe(req) {
  if (req.query.desde == null || req.query.desde === "") return 0;
  const n = Number(req.query.desde);
  if (!Number.isInteger(n) || n < 0 || n > LIMITE_PUBLICACIONES.desdeMaximo) {
    throw crear("datos_invalidos", "«desde» tiene que ser un número entero desde 0.");
  }
  return n;
}

/** Valida el sitio de la URL: toda consulta pública es para un sitio concreto. */
function sitioDe(req) {
  const { sitio } = req.params;
  if (!existeSitio(sitio)) throw crear("no_encontrado", "El sitio indicado no existe.");
  return sitio;
}

/*
 * Lo publicado para un sitio. Es lo que consume cada sitio satélite (ver frontend/sitios/nexo-sitio.js).
 *   GET /api/publico/sitios/adultos-mayores/publicaciones
 *   GET /api/publico/sitios/mama-antula/publicaciones?tipo=noticia&limite=6
 *   GET /api/publico/sitios/centro-de-dia/publicaciones?urgentes=1        solo los avisos urgentes vigentes
 *   GET /api/publico/sitios/adultos-mayores/publicaciones?tipo=noticia&limite=24&desde=8   la página siguiente
 * Solo devuelve lo que la Autoridad Superior aprobó para ese sitio (un contenido dirigido a varios aparece en cada uno).
 * Orden: avisos urgentes vigentes primero ("urgente": true, "urgenteHasta"), después el resto; los dos por fecha.
 */
router.get("/sitios/:sitio/publicaciones", async (req, res) => {
  const sitio = sitioDe(req);
  const tipo = typeof req.query.tipo === "string" ? req.query.tipo : "";
  if (tipo && !existeTipo(tipo)) throw crear("datos_invalidos", "El tipo indicado no existe (noticia, proyecto o galeria).");
  const limite = limiteDe(req);
  const desde = desdeDe(req);
  sinCacheVieja(res);
  res.json(await listarPublicaciones({ sitio, tipo: tipo || undefined, soloUrgentes: req.query.urgentes === "1", limite, desde }));
});

// Una publicación de un sitio. Si se publicó solo en otro sitio, acá responde 404 (no se filtra entre sitios).
router.get("/sitios/:sitio/publicaciones/:slug", async (req, res) => {
  const publicacion = await obtenerPublicacion(sitioDe(req), req.params.slug);
  if (!publicacion) throw crear("no_encontrado", "La publicación no existe en este sitio o ya no está disponible.");
  sinCacheVieja(res);
  res.json(publicacion);
});

// Las consultas sin sitio ya no existen: cada sitio pide solo lo suyo.
router.get(["/publicaciones", "/publicaciones/:slug"], () => {
  throw crear("datos_invalidos", "Las consultas públicas se hacen por sitio: /api/publico/sitios/{sitio}/publicaciones.");
});

// Solo se descargan adjuntos de la versión publicada. Las imágenes se muestran en la página (no se descargan).
router.get("/adjuntos/:id", async (req, res) => {
  const archivo = await buscarParaDescarga(req.params.id, { soloPublicados: true });
  if (archivo.mime.startsWith("image/")) {
    res.set("Cache-Control", "public, max-age=300");
    res.type(archivo.mime);
    res.set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`);
    return res.sendFile(archivo.ruta);
  }
  return res.download(archivo.ruta, archivo.nombre);
});

module.exports = router;
