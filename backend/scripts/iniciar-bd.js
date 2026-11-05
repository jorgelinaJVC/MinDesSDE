"use strict";

/* Prepara la base MongoDB: colecciones con validación, índices y la vista pública.
 *   npm run bd:iniciar                 crea o actualiza lo que falte (no borra datos)
 *   npm run bd:iniciar -- --reiniciar  BORRA la base y la crea de cero
 */

const config = require("../src/config");
const db = require("../src/db");
const { ObjectId } = db;
const { COLECCIONES, VISTA_PUBLICACIONES, INDICES_RETIRADOS } = require("../bd/esquema");
const { SITIOS_RENOMBRADOS } = require("../src/sitios");

async function existentes(bd) {
  const lista = await bd.listCollections({}, { nameOnly: true }).toArray();
  return new Set(lista.map((c) => c.name));
}

/* Retención de la auditoría: con AUDITORIA_DIAS > 0, un índice TTL borra los registros más viejos que eso
 * (lo hace MongoDB, no la aplicación, que no tiene permiso de borrado). Con 0, se conservan para siempre. */
async function aplicarRetencionAuditoria(bd) {
  const NOMBRE = "ttl_auditoria_fecha";
  const segundos = Math.round(config.auditoria.dias * 86400);
  const actual = (await bd.collection("auditoria").indexes()).find((i) => i.name === NOMBRE);
  if (actual && (segundos <= 0 || actual.expireAfterSeconds !== segundos)) await bd.collection("auditoria").dropIndex(NOMBRE);
  if (segundos > 0 && (!actual || actual.expireAfterSeconds !== segundos)) {
    await bd.collection("auditoria").createIndexes([{ key: { fecha: 1 }, name: NOMBRE, expireAfterSeconds: segundos }]);
  }
}

/* Migración a la publicación condicionada por sitio (idempotente: solo toca lo que todavía no se migró).
 *   - "sitio" (un solo texto) pasa a "sitiosDestino" (arreglo); lo mismo dentro del borrador.
 *   - Lo publicado recibe "destinoPublicado" (sitios, tipo y categoría aprobados), que es lo que lee la vista.
 *   - Los ids de sitio renombrados (sitio-3 → centro-de-dia) se reemplazan.
 *   - Contenidos anteriores a los sitios: quedan sin destino (no se ven en ningún sitio) hasta que se envíe
 *     una nueva versión eligiéndolo.
 * Se recorre documento por documento porque son pocos y así la misma lógica corre en cualquier versión de MongoDB. */
async function migrarDestinos(bd) {
  const contenidos = bd.collection("contenidos");
  const renombrar = (id) => SITIOS_RENOMBRADOS[id] || id;
  const aLista = (sitio) => (typeof sitio === "string" && sitio ? [renombrar(sitio)] : []);
  const pendientes = await contenidos.find({
    $or: [
      { sitiosDestino: { $exists: false } },
      { "borrador.sitio": { $exists: true } },
      { sitiosDestino: { $in: Object.keys(SITIOS_RENOMBRADOS) } },
      { "destinoPublicado.sitios": { $in: Object.keys(SITIOS_RENOMBRADOS) } },
      { versionPublicada: { $ne: null }, destinoPublicado: { $exists: false } },
    ],
  }).toArray();

  for (const c of pendientes) {
    const $set = {};
    const $unset = {};
    const destino = "sitiosDestino" in c ? [...new Set(c.sitiosDestino.map(renombrar))] : aLista(c.sitio);
    $set.sitiosDestino = destino;
    if ("sitio" in c) $unset.sitio = "";
    if (!("tipo" in c)) $set.tipo = null;
    if (c.borrador) {
      if ("sitio" in c.borrador) {
        $set["borrador.sitiosDestino"] = aLista(c.borrador.sitio);
        $unset["borrador.sitio"] = "";
      } else if (Array.isArray(c.borrador.sitiosDestino)) {
        $set["borrador.sitiosDestino"] = [...new Set(c.borrador.sitiosDestino.map(renombrar))];
      }
    }
    if (c.versionPublicada != null) {
      const previo = c.destinoPublicado;
      const sitios = previo ? [...new Set(previo.sitios.map(renombrar))] : destino;
      const tipo = previo ? previo.tipo : c.tipo;
      const seccion = previo ? previo.seccion : c.seccion;
      // sin sitio o sin tipo (anteriores a los sitios): publicado pero sin destino, no aparece en ningún sitio
      $set.destinoPublicado = sitios.length && tipo && seccion ? { sitios, tipo, seccion } : null;
    } else if (!("destinoPublicado" in c)) {
      $set.destinoPublicado = null;
    }
    const cambios = { $set };
    if (Object.keys($unset).length) cambios.$unset = $unset;
    await contenidos.updateOne({ _id: c._id }, cambios);
  }
  return pendientes.length;
}

/* Migración de observaciones (idempotente): los contenidos sin el campo "observaciones" lo reciben armado desde
 * sus devoluciones anteriores (revision/decision de tipo "devolucion" de cada versión). Una observación cuenta como
 * atendida si después hay otra versión enviada. El rol es el que la persona tiene hoy (antes no se guardaba). */
async function migrarObservaciones(bd) {
  const contenidos = bd.collection("contenidos");
  const pendientes = await contenidos.find({ observaciones: { $exists: false } }).toArray();
  if (!pendientes.length) return 0;
  const roles = new Map((await bd.collection("usuarios").find({}, { projection: { rol: 1 } }).toArray())
    .map((u) => [String(u._id), u.rol]));
  for (const c of pendientes) {
    const observaciones = [];
    (c.versiones || []).forEach((v, i) => {
      const siguiente = c.versiones[i + 1];
      for (const [registro, desdeRevision] of [[v.revision, true], [v.decision, false]]) {
        if (!registro || registro.tipo !== "devolucion") continue;
        const rol = roles.get(String(registro.usuarioId)) || (desdeRevision ? "director" : "autoridad");
        observaciones.push({
          _id: new ObjectId(),
          version: v.numero,
          nivel: desdeRevision || rol !== "autoridad" ? "direccion" : "autoridad",
          usuarioId: registro.usuarioId,
          rol,
          mensaje: (registro.comentario || "").trim() || "(sin comentario)",
          fecha: registro.fecha,
          atendidaEn: siguiente ? siguiente.creadaEn : null,
          atendidaEnVersion: siguiente ? siguiente.numero : null,
        });
      }
    });
    await contenidos.updateOne({ _id: c._id }, { $set: { observaciones } });
  }
  return pendientes.length;
}

async function iniciarBd({ reiniciar = false } = {}) {
  const bd = await db.obtenerBd();
  if (reiniciar) await bd.dropDatabase();

  const hay = await existentes(bd);

  for (const [nombre, { validador, indices }] of Object.entries(COLECCIONES)) {
    const reglas = { validator: { $jsonSchema: validador }, validationLevel: "strict", validationAction: "error" };
    if (hay.has(nombre)) {
      await bd.command({ collMod: nombre, ...reglas }); // actualiza la validación sin tocar los datos
    } else {
      await bd.createCollection(nombre, reglas);
    }
    // Índices que cambiaron de definición: se reemplazan por la versión nueva (el nombre nuevo evita choques).
    for (const viejo of INDICES_RETIRADOS[nombre] || []) {
      const actuales = await bd.collection(nombre).indexes();
      if (actuales.some((i) => i.name === viejo)) await bd.collection(nombre).dropIndex(viejo);
    }
    await bd.collection(nombre).createIndexes(indices);
  }
  await aplicarRetencionAuditoria(bd);

  await migrarDestinos(bd);
  await migrarObservaciones(bd);

  const { nombre, sobre, pipeline } = VISTA_PUBLICACIONES;
  if (hay.has(nombre)) {
    await bd.command({ collMod: nombre, viewOn: sobre, pipeline });
  } else {
    await bd.createCollection(nombre, { viewOn: sobre, pipeline });
  }
}

module.exports = { iniciarBd, migrarDestinos, migrarObservaciones };

if (require.main === module) {
  const reiniciar = process.argv.includes("--reiniciar");
  iniciarBd({ reiniciar })
    .then(() => console.log(`Base de datos "${config.mongo.base}" lista${reiniciar ? " (reiniciada)" : ""}.`))
    .catch((error) => {
      console.error("No se pudo preparar la base de datos:", error.message);
      process.exitCode = 1;
    })
    .finally(() => db.cerrar());
}
