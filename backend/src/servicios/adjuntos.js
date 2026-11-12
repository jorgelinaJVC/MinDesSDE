"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const multer = require("multer");
const config = require("../config");
const { coleccion, aId } = require("../db");
const { crear } = require("../errores");
const { puedeVerAdjunto } = require("../permisos");
const almacen = require("./almacen");

/** WEBP: contenedor RIFF ("RIFF" + tamaño + "WEBP"). */
const esWebp = (c) => c.length >= 12 && c.toString("latin1", 0, 4) === "RIFF" && c.toString("latin1", 8, 12) === "WEBP";

/** AVIF: caja ISO "ftyp" al principio, con la marca avif (imagen) o avis (secuencia) como principal o compatible. */
function esAvif(c) {
  if (c.length < 16 || c.toString("latin1", 4, 8) !== "ftyp") return false;
  const fin = Math.min(c.readUInt32BE(0), c.length);
  const marcas = [c.toString("latin1", 8, 12)];
  for (let i = 16; i + 4 <= fin; i += 4) marcas.push(c.toString("latin1", i, i + 4));
  return marcas.includes("avif") || marcas.includes("avis");
}

/**
 * extensión permitida -> tipos MIME aceptados y firma real del formato (primeros bytes, o una función que la verifica).
 * "guardarComo": el tipo que se guarda, sin importar cuál informó el navegador (algunos sistemas todavía mandan
 * WEBP o AVIF como application/octet-stream); así se sirven y se reconocen siempre como imagen.
 */
const FORMATOS = {
  jpg: { mimes: ["image/jpeg"], firma: [0xff, 0xd8, 0xff] },
  jpeg: { mimes: ["image/jpeg"], firma: [0xff, 0xd8, 0xff] },
  png: { mimes: ["image/png"], firma: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  webp: { mimes: ["image/webp", "application/octet-stream"], firma: esWebp, guardarComo: "image/webp" },
  avif: { mimes: ["image/avif", "application/octet-stream"], firma: esAvif, guardarComo: "image/avif" },
  pdf: { mimes: ["application/pdf"], firma: [0x25, 0x50, 0x44, 0x46] },
  docx: {
    mimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"],
    firma: [0x50, 0x4b, 0x03, 0x04],
  },
  doc: { mimes: ["application/msword", "application/octet-stream"], firma: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
  txt: { mimes: ["text/plain"], firma: null }, // texto: no debe contener bytes nulos
};

const FORMATOS_TEXTO = "imágenes JPG, PNG, WEBP o AVIF; documentos PDF, Word o TXT";

const extension = (nombre) => path.extname(nombre).slice(1).toLowerCase();

/** multer entrega el nombre en latin1; lo pasamos a utf8 y quitamos rutas y caracteres de control. */
function limpiarNombre(original) {
  const utf8 = Buffer.from(original, "latin1").toString("utf8");
  return path.basename(utf8.replace(/\\/g, "/")).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200) || "archivo";
}

/* ---------- Subida (multer) ---------- */

/* Los archivos llegan primero a una carpeta temporal; recién cuando pasan la validación se guardan en el
 * almacén definitivo (disco o MongoDB, ver almacen.js). */
const almacenamiento = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync(config.carpetaTemporal, { recursive: true });
    cb(null, config.carpetaTemporal);
  },
  // el nombre en disco lo genera el servidor: nada que venga del cliente
  filename: (req, file, cb) => cb(null, crypto.randomUUID()),
});

const subida = multer({
  storage: almacenamiento,
  limits: {
    fileSize: config.maxAdjuntoBytes,
    files: config.maxAdjuntos,
    fields: 10,
    fieldSize: 300 * 1024,
  },
  fileFilter(req, file, cb) {
    const ext = extension(limpiarNombre(file.originalname));
    if (!FORMATOS[ext]) {
      return cb(crear("datos_invalidos", `${limpiarNombre(file.originalname)}: formato no permitido (se aceptan ${FORMATOS_TEXTO}).`));
    }
    return cb(null, true);
  },
}).array("adjuntos", config.maxAdjuntos);

/* ---------- Validación posterior a la subida ---------- */

async function leerCabecera(ruta) {
  const manejador = await fs.promises.open(ruta, "r");
  try {
    const buffer = Buffer.alloc(1024);
    const { bytesRead } = await manejador.read(buffer, 0, 1024, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await manejador.close();
  }
}

/** Verifica extensión, tipo MIME y firma real del archivo y lo guarda en el almacén. Devuelve los datos a guardar. */
async function validarArchivos(archivos) {
  const validos = [];
  for (const archivo of archivos) {
    const nombre = limpiarNombre(archivo.originalname);
    const formato = FORMATOS[extension(nombre)];
    if (!formato || !formato.mimes.includes(archivo.mimetype)) {
      throw crear("datos_invalidos", `${nombre}: formato no permitido (se aceptan ${FORMATOS_TEXTO}).`);
    }
    const cabecera = await leerCabecera(archivo.path);
    let firmaOk;
    if (typeof formato.firma === "function") firmaOk = formato.firma(cabecera);
    else if (formato.firma) firmaOk = formato.firma.every((byte, i) => cabecera[i] === byte);
    else firmaOk = !cabecera.includes(0);
    if (!firmaOk) throw crear("datos_invalidos", `${nombre}: el contenido no coincide con el formato del archivo.`);
  }
  // Recién con todos validados se pasan al almacén definitivo (si uno falla, no se guarda ninguno)
  for (const archivo of archivos) {
    const nombre = limpiarNombre(archivo.originalname);
    const formato = FORMATOS[extension(nombre)];
    await almacen.guardar(archivo.path, archivo.filename);
    validos.push({
      nombreOriginal: nombre,
      nombreAlmacenado: archivo.filename,
      mime: formato.guardarComo || archivo.mimetype,
      tamano: archivo.size,
    });
  }
  return validos;
}

/** Borra archivos subidos cuando la operación falla: de la carpeta temporal y, si ya se habían guardado, del almacén. */
async function descartar(archivos = []) {
  await Promise.all(archivos.map(async (a) => {
    await fs.promises.unlink(a.path).catch(() => {});
    if (a.filename) await almacen.borrar(a.filename).catch(() => {});
  }));
}

/* ---------- Descarga ---------- */


/** Dónde vive un adjunto dentro de su contenido: en qué versiones, si está publicado y si está en un borrador. */
function ubicar(doc, _id) {
  const tiene = (lista) => lista.some((x) => x.equals(_id));
  const versiones = doc.versiones.filter((v) => tiene(v.adjuntos));
  return {
    versiones,
    publicado: versiones.some((v) => v.numero === doc.versionPublicada),
    autorContenidoId: doc.autorId,
    borradorAutorId: doc.borrador && tiene(doc.borrador.adjuntos) ? doc.borrador.autorId : null,
  };
}

/**
 * Busca un adjunto para servirlo.
 *   soloPublicados: la parte pública (sin sesión) solo confía en la vista de publicaciones.
 *   lector: dentro del panel, aplica puedeVerAdjunto (autor, revisores o autor del borrador).
 * Ante un archivo que existe pero no se puede ver responde 403; si no existe, 404.
 */
async function buscarParaDescarga(id, { soloPublicados, lector = null }) {
  const _id = aId(id);
  if (!_id) throw crear("no_encontrado", "El archivo no existe.");

  if (soloPublicados) {
    const vista = await coleccion("vista_publicaciones");
    const publicado = await vista.findOne({ "adjuntos.id": _id }, { projection: { _id: 0, slug: 1 } });
    if (!publicado) throw crear("no_encontrado", "El archivo no existe.");
  }

  const contenidos = await coleccion("contenidos");
  const doc = await contenidos.findOne({ "adjuntos._id": _id });
  const adjunto = doc && doc.adjuntos.find((a) => a._id.equals(_id));
  if (!adjunto) throw crear("no_encontrado", "El archivo no existe.");

  if (!soloPublicados) {
    const ubicacion = ubicar(doc, _id);
    // un adjunto que no está en ninguna versión ni en un borrador es un resto: no se sirve
    if (!ubicacion.versiones.length && !ubicacion.borradorAutorId) throw crear("no_encontrado", "El archivo no existe.");
    if (!puedeVerAdjunto(lector, ubicacion)) {
      throw crear("prohibido", "Este archivo solo lo pueden abrir su autor y quienes revisan el contenido.");
    }
  }

  return { nombreAlmacenado: adjunto.nombreAlmacenado, nombre: adjunto.nombreOriginal, mime: adjunto.tipoMime };
}

/**
 * Envía un adjunto al navegador desde el almacén (disco o MongoDB).
 * enLinea: se muestra en la página (imágenes, PDF); si no, se descarga con su nombre original.
 */
async function enviar(res, archivo, { enLinea = false } = {}) {
  const abierto = await almacen.abrir(archivo.nombreAlmacenado);
  if (!abierto) throw crear("no_encontrado", "El archivo no existe.");
  res.type(archivo.mime);
  if (abierto.tamano != null) res.set("Content-Length", String(abierto.tamano));
  res.set("Content-Disposition", `${enLinea ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`);
  res.set("X-Content-Type-Options", "nosniff");
  await new Promise((resolver, rechazar) => {
    abierto.flujo.on("error", rechazar);
    res.on("finish", resolver);
    // si el navegador corta la descarga, se deja de leer el archivo
    res.on("close", () => { abierto.flujo.destroy(); resolver(); });
    abierto.flujo.pipe(res);
  });
}

/** Formatos que el navegador puede mostrar sin riesgo dentro de la página (el resto siempre se descarga). */
const SE_PUEDE_VER = ["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf", "text/plain"];

/** Borra del almacén archivos que ya no están en el documento (después de quitarlos de un borrador). */
async function borrarDelDisco(adjuntos = []) {
  await Promise.all(adjuntos.map((a) => almacen.borrar(a.nombreAlmacenado).catch(() => {})));
}

module.exports = {
  subida, validarArchivos, descartar, buscarParaDescarga, enviar, borrarDelDisco, limpiarNombre, SE_PUEDE_VER,
};
