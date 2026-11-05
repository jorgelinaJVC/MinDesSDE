"use strict";

const { MongoClient, ObjectId } = require("mongodb");
const config = require("./config");

let conexion = null; // promesa compartida: todos los pedidos usan el mismo cliente

function conectar() {
  conexion ??= (async () => {
    const cliente = new MongoClient(config.mongo.uri, { serverSelectionTimeoutMS: 5000 });
    await cliente.connect();
    return { cliente, bd: cliente.db(config.mongo.base) };
  })().catch((error) => {
    conexion = null; // si falla, el próximo pedido vuelve a intentar
    throw error;
  });
  return conexion;
}

/** Devuelve la base de datos ya conectada. */
async function obtenerBd() {
  return (await conectar()).bd;
}

/** Devuelve una colección: await coleccion("contenidos") */
async function coleccion(nombre) {
  return (await obtenerBd()).collection(nombre);
}

/**
 * Convierte un id recibido (texto de 24 caracteres hexadecimales) en ObjectId.
 * Cualquier otra cosa —números, objetos como { $ne: null }, texto suelto— devuelve null,
 * así nunca llega a una consulta un valor que no sea un id real.
 */
function aId(valor) {
  if (valor instanceof ObjectId) return valor;
  if (typeof valor === "string" && /^[0-9a-f]{24}$/i.test(valor)) return new ObjectId(valor);
  return null;
}

/** Error de índice único (equivalente al ER_DUP_ENTRY de MySQL). */
const esDuplicado = (error) => Boolean(error) && error.code === 11000;

async function cerrar() {
  if (!conexion) return;
  const actual = conexion;
  conexion = null;
  try {
    const { cliente } = await actual;
    await cliente.close();
  } catch (e) {
    /* nunca llegó a conectar */
  }
}

module.exports = { obtenerBd, coleccion, aId, esDuplicado, cerrar, ObjectId };
