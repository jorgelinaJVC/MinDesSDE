"use strict";

/*
 * Dónde se guardan los archivos adjuntos (fotos y documentos de las publicaciones).
 *
 * Dos modos, según la variable ALMACENAMIENTO del .env:
 *   - "disco" (por defecto): en la carpeta almacen/ del servidor. Sirve en una computadora o en un servidor
 *     con disco permanente.
 *   - "mongo": dentro de la base de datos (MongoDB GridFS, colecciones adjuntos.files y adjuntos.chunks).
 *     Es el modo para Render gratis y servicios parecidos, donde el disco se borra al reiniciar.
 *
 * El resto del portal no sabe cuál se usa: guarda, abre y borra siempre por el nombre interno del archivo
 * (un UUID que genera el servidor), igual en los dos modos.
 */

const fs = require("node:fs");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const { GridFSBucket } = require("mongodb");
const config = require("../config");
const { obtenerBd } = require("../db");

const BUCKET = "adjuntos";

/** El nombre interno nunca trae carpetas: así no se puede salir de almacen/ con "../". */
const nombreSeguro = (nombre) => path.basename(String(nombre));

/* ---------- Disco ---------- */

const disco = {
  async guardar(rutaTemporal, nombre) {
    await fs.promises.mkdir(config.carpetaAdjuntos, { recursive: true });
    const destino = path.join(config.carpetaAdjuntos, nombreSeguro(nombre));
    // copiar y borrar (en vez de mover): la carpeta temporal puede estar en otro disco
    await fs.promises.copyFile(rutaTemporal, destino);
    await fs.promises.unlink(rutaTemporal).catch(() => {});
  },

  async abrir(nombre) {
    const ruta = path.join(config.carpetaAdjuntos, nombreSeguro(nombre));
    try {
      const { size } = await fs.promises.stat(ruta);
      return { flujo: fs.createReadStream(ruta), tamano: size };
    } catch (e) {
      return null;
    }
  },

  async borrar(nombre) {
    await fs.promises.unlink(path.join(config.carpetaAdjuntos, nombreSeguro(nombre))).catch(() => {});
  },
};

/* ---------- MongoDB (GridFS) ---------- */

async function bucket() {
  return new GridFSBucket(await obtenerBd(), { bucketName: BUCKET });
}

const mongo = {
  async guardar(rutaTemporal, nombre) {
    const b = await bucket();
    await pipeline(fs.createReadStream(rutaTemporal), b.openUploadStream(nombreSeguro(nombre)));
    await fs.promises.unlink(rutaTemporal).catch(() => {});
  },

  async abrir(nombre) {
    const b = await bucket();
    const [archivo] = await b.find({ filename: nombreSeguro(nombre) }).limit(1).toArray();
    if (!archivo) return null;
    return { flujo: b.openDownloadStream(archivo._id), tamano: archivo.length };
  },

  async borrar(nombre) {
    const b = await bucket();
    const archivos = await b.find({ filename: nombreSeguro(nombre) }).toArray();
    for (const a of archivos) await b.delete(a._id).catch(() => {});
  },
};

const MODOS = { disco, mongo };

function modo() {
  const elegido = config.almacenamiento;
  if (!MODOS[elegido]) throw new Error(`ALMACENAMIENTO="${elegido}" no existe: usá "disco" o "mongo".`);
  return MODOS[elegido];
}

module.exports = {
  /** Mueve un archivo recién subido (en la carpeta temporal) al almacén definitivo. */
  guardar: (rutaTemporal, nombre) => modo().guardar(rutaTemporal, nombre),
  /** { flujo, tamano } para enviarlo, o null si no existe. */
  abrir: (nombre) => modo().abrir(nombre),
  /** Borra el archivo (si no existe, no hace nada). */
  borrar: (nombre) => modo().borrar(nombre),
  MODOS,
};
