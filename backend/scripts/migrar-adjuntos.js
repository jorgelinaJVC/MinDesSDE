"use strict";

/* Copia a MongoDB (GridFS) los archivos que ya están en la carpeta almacen/.
 * Se usa una sola vez al pasar a ALMACENAMIENTO=mongo, para que las publicaciones que ya tenían fotos las sigan
 * mostrando. No borra nada de almacen/ y se puede correr más de una vez: lo que ya está en la base lo saltea.
 *   npm run adjuntos:migrar
 */

const fs = require("node:fs");
const path = require("node:path");
const { GridFSBucket } = require("mongodb");
const { pipeline } = require("node:stream/promises");
const config = require("../src/config");
const db = require("../src/db");

async function main() {
  if (!fs.existsSync(config.carpetaAdjuntos)) {
    console.log(`No hay carpeta ${config.carpetaAdjuntos}: no hay nada para copiar.`);
    return;
  }
  const bucket = new GridFSBucket(await db.obtenerBd(), { bucketName: "adjuntos" });
  const archivos = fs.readdirSync(config.carpetaAdjuntos).filter((n) => fs.statSync(path.join(config.carpetaAdjuntos, n)).isFile());
  let copiados = 0;
  let salteados = 0;
  for (const nombre of archivos) {
    if (await bucket.find({ filename: nombre }).limit(1).hasNext()) { salteados += 1; continue; }
    await pipeline(fs.createReadStream(path.join(config.carpetaAdjuntos, nombre)), bucket.openUploadStream(nombre));
    copiados += 1;
  }
  console.log(`Listo: ${copiados} archivos copiados a la base, ${salteados} ya estaban. (Total en almacen/: ${archivos.length})`);
}

main()
  .catch((error) => {
    console.error("No se pudieron copiar los archivos:", error.message);
    process.exitCode = 1;
  })
  .finally(() => db.cerrar());
