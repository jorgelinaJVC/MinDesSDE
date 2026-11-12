"use strict";

/* Rutas de borradores. Control de acceso en dos capas:
 *   1. requerirPermiso("crear"): solo roles que cargan contenido (no el observador).
 *   2. soloAutorDelBorrador: el borrador existe y es de quien hace el pedido. Corre ANTES de multer,
 *      así un pedido no autorizado no llega a escribir archivos en disco.
 * El servicio vuelve a verificar todo dentro de la escritura atómica (por si algo cambió en el medio). */

const { Router } = require("express");
const { requerirSesion } = require("../auth");
const { requerirPermiso } = require("../permisos-http");
const { esAutorDelBorrador } = require("../permisos");
const { coleccion, aId } = require("../db");
const { crear } = require("../errores");
const borradores = require("../servicios/borradores");
const adjuntos = require("../servicios/adjuntos");

const router = Router();
// Se aplica ruta por ruta (no con router.use): este router se monta en /api y un use() global
// cortaría también pedidos que no son de borradores.
const puedeCargar = [requerirSesion, requerirPermiso("crear")];

async function soloAutorDelBorrador(req, res, next) {
  const _id = aId(req.params.id);
  const doc = _id ? await (await coleccion("contenidos")).findOne({ _id }) : null;
  // un borrador ajeno responde igual que uno inexistente si el contenido nunca se envió (no se revela que existe)
  if (!doc || doc.estado === "descartado" || (doc.estado === "borrador" && !esAutorDelBorrador(req.usuario, doc.borrador))) {
    throw crear("no_encontrado", "El borrador no existe.");
  }
  if (!doc.borrador) throw crear("no_encontrado", "Este contenido no tiene un borrador en preparación.");
  if (!esAutorDelBorrador(req.usuario, doc.borrador)) {
    throw crear("prohibido", "Solo quien creó el borrador puede verlo, modificarlo o enviarlo.");
  }
  next();
}

/** El formulario viaja como multipart (campo "datos" en JSON + archivos) o como JSON puro. */
function leerEntrada(req) {
  if (!req.is("multipart/form-data")) return req.body || {};
  try {
    return JSON.parse(req.body.datos || "{}");
  } catch (e) {
    throw crear("datos_invalidos", "Los datos del formulario no son válidos.");
  }
}

/** Valida los archivos subidos y los borra del disco si la operación falla. */
async function conArchivos(req, operacion) {
  const subidos = req.files || [];
  try {
    return await operacion(await adjuntos.validarArchivos(subidos));
  } catch (error) {
    await adjuntos.descartar(subidos);
    throw error;
  }
}

// Borrador nuevo (con archivos opcionales)
router.post("/borradores", puedeCargar, adjuntos.subida, async (req, res) => {
  const entrada = leerEntrada(req);
  res.status(201).json(await conArchivos(req, (validos) => borradores.crearBorrador(req.usuario, entrada, validos)));
});

// Borrador de una nueva versión de algo devuelto o publicado (copia la última versión)
router.post("/contenidos/:id/borrador", puedeCargar, async (req, res) => {
  res.status(201).json(await borradores.iniciarBorradorDeVersion(req.usuario, req.params.id));
});

router.put("/contenidos/:id/borrador", puedeCargar, soloAutorDelBorrador, async (req, res) => {
  res.json(await borradores.guardarBorrador(req.usuario, req.params.id, req.body || {}));
});

router.post("/contenidos/:id/borrador/adjuntos", puedeCargar, soloAutorDelBorrador, adjuntos.subida, async (req, res) => {
  res.status(201).json(await conArchivos(req, (validos) => borradores.agregarAdjuntos(req.usuario, req.params.id, validos)));
});

router.delete("/contenidos/:id/borrador/adjuntos/:adjuntoId", puedeCargar, soloAutorDelBorrador, async (req, res) => {
  res.json(await borradores.quitarAdjunto(req.usuario, req.params.id, req.params.adjuntoId));
});

router.post("/contenidos/:id/borrador/enviar", puedeCargar, soloAutorDelBorrador, async (req, res) => {
  res.json(await borradores.enviarBorrador(req.usuario, req.params.id));
});

router.delete("/contenidos/:id/borrador", puedeCargar, soloAutorDelBorrador, async (req, res) => {
  res.json(await borradores.descartarBorrador(req.usuario, req.params.id));
});

module.exports = router;
