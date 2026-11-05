"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const multer = require("multer");
const config = require("../config");
const { coleccion, aId } = require("../db");
const { crear } = require("../errores");
const { puedeVerAdjunto } = require("../permisos");

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

const almacenamiento = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync(config.carpetaAdjuntos, { recursive: true });
    cb(null, config.carpetaAdjuntos);
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

/** Verifica extensión, tipo MIME y firma real del archivo. Devuelve los datos a guardar. */
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
    validos.push({
      nombreOriginal: nombre,
      nombreAlmacenado: archivo.filename,
      mime: formato.guardarComo || archivo.mimetype,
      tamano: archivo.size,
    });
  }
  return validos;
}

/** Borra archivos subidos cuando la operación falla (no quedan huérfanos en disco). */
async function descartar(archivos = []) {
  await Promise.all(archivos.map((a) => fs.promises.unlink(a.path).catch(() => {})));
}

/* ---------- Descarga ---------- */

const rutaEnDisco = (adjunto) => path.join(config.carpetaAdjuntos, path.basename(adjunto.nombreAlmacenado));

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

  return { ruta: rutaEnDisco(adjunto), nombre: adjunto.nombreOriginal, mime: adjunto.tipoMime };
}

/** Formatos que el navegador puede mostrar sin riesgo dentro de la página (el resto siempre se descarga). */
const SE_PUEDE_VER = ["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf", "text/plain"];

/** Borra del disco archivos que ya no están en el documento (después de quitarlos de un borrador). */
async function borrarDelDisco(adjuntos = []) {
  await Promise.all(adjuntos.map((a) => fs.promises.unlink(rutaEnDisco(a)).catch(() => {})));
}

module.exports = {
  subida, validarArchivos, descartar, buscarParaDescarga, borrarDelDisco, limpiarNombre, SE_PUEDE_VER,
};
