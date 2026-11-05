"use strict";

const { Router } = require("express");
const { requerirSesion } = require("../auth");
const { requerirPermiso, requerirAlguno } = require("../permisos-http");
const { crear } = require("../errores");
const contenidos = require("../servicios/contenidos");
const usuarios = require("../servicios/usuarios");
const adjuntos = require("../servicios/adjuntos");

const router = Router();
router.use(requerirSesion);

/** Dar de baja o reactivar: corta a los observadores antes de tocar la base; el resto lo decide el servicio. */
const requerirBaja = requerirAlguno(["crear", "archivar"], "Tu rol no permite dar de baja ni reactivar contenidos.");

/* ---------- Equipo y roles ---------- */

router.get("/usuarios", async (req, res) => {
  res.json(await usuarios.listar(req.usuario));
});

router.patch("/usuarios/:id/rol", requerirPermiso("roles"), async (req, res) => {
  const rol = req.body && typeof req.body.rol === "string" ? req.body.rol : "";
  res.json(await usuarios.cambiarRol(req.usuario, req.params.id, rol));
});

router.post("/usuarios", requerirPermiso("roles"), async (req, res) => {
  const { nombre, email, rol, password, telefono, area } = req.body || {};
  res.status(201).json(await usuarios.agregarIntegrante(req.usuario, { nombre, email, rol, password, telefono, area }));
});

router.patch("/usuarios/:id", requerirPermiso("roles"), async (req, res) => {
  const { nombre, email, password, ...resto } = req.body || {};
  // el contacto solo cambia si vino en el pedido
  const contacto = Object.fromEntries(["telefono", "area"].filter((k) => k in resto).map((k) => [k, resto[k]]));
  res.json(await usuarios.editarIntegrante(req.usuario, req.params.id, { nombre, email, password, ...contacto }));
});

router.delete("/usuarios/:id", requerirPermiso("roles"), async (req, res) => {
  res.json(await usuarios.darDeBaja(req.usuario, req.params.id));
});

/* ---------- Contenidos ---------- */

/** El formulario viaja como multipart (campo "datos" en JSON + archivos) o como JSON puro. */
function leerEntrada(req) {
  if (!req.is("multipart/form-data")) return req.body || {};
  try {
    return JSON.parse(req.body.datos || "{}");
  } catch (e) {
    throw crear("datos_invalidos", "Los datos del formulario no son válidos.");
  }
}

/** Ejecuta la operación con los archivos subidos y los borra si algo falla. */
async function conArchivos(req, operacion) {
  const subidos = req.files || [];
  try {
    const validos = await adjuntos.validarArchivos(subidos);
    return await operacion(validos);
  } catch (error) {
    await adjuntos.descartar(subidos);
    throw error;
  }
}

// ?prioridad=urgente|normal filtra; ?orden=prioridad pone lo urgente primero y después lo que más espera
router.get("/contenidos", async (req, res) => {
  res.json(await contenidos.listar(req.usuario, req.query));
});

/* Bandeja de quien revisa: solo lo que espera una acción suya, con lo urgente primero.
 * GET /api/contenidos/bandeja?prioridad=urgente */
const SOLO_REVISORES = "Solo quienes revisan (dirección o autoridad superior) tienen bandeja de pendientes.";
router.get("/contenidos/bandeja", requerirAlguno(["revisar", "decidir"], SOLO_REVISORES), async (req, res) => {
  res.json(await contenidos.bandeja(req.usuario, req.query));
});

// Ajustar la prioridad de algo ya enviado: { nivel: "urgente" | "normal", motivo, vence: "2026-10-20" | null }
router.patch("/contenidos/:id/prioridad", requerirAlguno(["revisar", "decidir"], SOLO_REVISORES.replace("tienen bandeja de pendientes", "pueden cambiar la prioridad")), async (req, res) => {
  res.json(await contenidos.cambiarPrioridad(req.usuario, req.params.id, req.body || {}));
});

router.post("/contenidos", adjuntos.subida, async (req, res) => {
  const entrada = leerEntrada(req);
  const creado = await conArchivos(req, (validos) => contenidos.crearContenido(req.usuario, entrada, validos));
  res.status(201).json(creado);
});

router.post("/contenidos/:id/versiones", adjuntos.subida, async (req, res) => {
  const entrada = leerEntrada(req);
  const actualizado = await conArchivos(req, (validos) =>
    contenidos.enviarNuevaVersion(req.usuario, req.params.id, entrada, validos, entrada.conservar));
  res.status(201).json(actualizado);
});

/* Cadena de aprobación: revisión de dirección (nivel 2) → decisión final de la autoridad superior (nivel 3).
 * Cada ruta exige su permiso con requerirPermiso antes de tocar la base; el servicio vuelve a validar
 * el estado del contenido y las reglas finas (no revisar lo propio, etc.). */
router.post("/contenidos/:id/revision", requerirPermiso("revisar"), async (req, res) => {
  res.json(await contenidos.revisar(req.usuario, req.params.id, req.body || {}));
});

router.post("/contenidos/:id/decision", requerirPermiso("decidir"), async (req, res) => {
  res.json(await contenidos.decidir(req.usuario, req.params.id, req.body || {}));
});

router.post("/contenidos/:id/publicar", requerirPermiso("publicar"), async (req, res) => {
  res.json(await contenidos.publicar(req.usuario, req.params.id));
});

/* ---------- Editar y dar de baja ----------
 *
 * Editar lo ya cargado (rutas de borradores.js, mismo control de acceso: autor, director de área o administrador):
 *   POST   /api/contenidos/:id/borrador                     abre la edición: copia la última versión en un borrador
 *   PUT    /api/contenidos/:id/borrador                     guarda textos, título, sitios, categoría, prioridad
 *   POST   /api/contenidos/:id/borrador/adjuntos            agrega archivos
 *   DELETE /api/contenidos/:id/borrador/adjuntos/:adjuntoId quita un archivo
 *   POST   /api/contenidos/:id/borrador/enviar              manda la edición a revisión (la web sigue mostrando la
 *                                                           versión aprobada hasta que la autoridad apruebe esta)
 *
 * Dar de baja (borrado lógico) y reactivar. El permiso depende del contenido (autor, director, administrador o
 * autoridad superior): acá se corta solo a quien nunca podría; el servicio decide con el documento en la mano.
 *   DELETE /api/contenidos/:id            { motivo }   baja: deja de verse en los sitios en el acto
 *   POST   /api/contenidos/:id/archivar   { motivo }   lo mismo (nombre anterior, se mantiene por compatibilidad)
 *   POST   /api/contenidos/:id/restaurar               reactivar (vuelve al circuito, no a la web) */
const darDeBaja = async (req, res) => {
  res.json(await contenidos.archivar(req.usuario, req.params.id, (req.body || {}).motivo));
};
router.delete("/contenidos/:id", requerirBaja, darDeBaja);
router.post("/contenidos/:id/archivar", requerirBaja, darDeBaja);

router.post("/contenidos/:id/restaurar", requerirBaja, async (req, res) => {
  res.json(await contenidos.restaurar(req.usuario, req.params.id));
});

/* ---------- Descarga de adjuntos (requiere sesión) ---------- */

/* Ver (?ver=1, solo imágenes, PDF y texto) o descargar un adjunto. La regla de quién puede abrir qué
 * está en permisos.puedeVerAdjunto: autor, revisores de la cadena, o el autor del borrador. */
router.get("/adjuntos/:id", async (req, res) => {
  const archivo = await adjuntos.buscarParaDescarga(req.params.id, { soloPublicados: false, lector: req.usuario });
  res.set("Cache-Control", "private, no-store"); // no queda en cachés compartidas: puede ser material no publicado
  if (req.query.ver === "1" && adjuntos.SE_PUEDE_VER.includes(archivo.mime)) {
    res.type(archivo.mime);
    res.set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`);
    return res.sendFile(archivo.ruta);
  }
  return res.download(archivo.ruta, archivo.nombre);
});

module.exports = router;
