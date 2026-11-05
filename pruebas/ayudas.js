"use strict";

/* Ayudas de las pruebas de integración.
 * Usan una base APARTE (por defecto "nexo_pruebas") que se BORRA y se recrea en cada archivo de prueba.
 * Conexión: la misma MONGODB_URI que la aplicación (.env).
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.DB_NAME = process.env.DB_NAME_PRUEBAS || "nexo_pruebas";
process.env.BCRYPT_COSTO = "4"; // hashes rápidos: en las pruebas no importa la dureza
process.env.CARPETA_ADJUNTOS = path.join(os.tmpdir(), `nexo-adjuntos-${process.pid}`);

// Red de seguridad: nunca correr contra una base que no sea de pruebas.
if (!/prueba|test/i.test(process.env.DB_NAME)) {
  throw new Error(`DB_NAME_PRUEBAS ("${process.env.DB_NAME}") debe contener "prueba" o "test" para no borrar datos reales.`);
}

const { iniciarBd } = require("../backend/scripts/iniciar-bd");
const { crearApp } = require("../backend/src/app");
const auth = require("../backend/src/auth");
const db = require("../backend/src/db");
const { crearUsuario } = require("../backend/src/servicios/usuarios");

const PASSWORD = "Clave-de-prueba-1";
const PERSONAS = [
  ["admin", "administrador"],
  ["director", "director"],
  ["director2", "director"], // otro director: revisa lo que carga o edita el primero (nadie revisa lo propio)
  ["autoridad", "autoridad"],
  ["colab", "colaborador"],
  ["obs", "observador"],
];

/** Recrea la base, crea una persona por rol y levanta el servidor en un puerto libre. */
async function iniciar() {
  await iniciarBd({ reiniciar: true });
  auth.reiniciarLimites();

  const usuarios = {};
  for (const [clave, rol] of PERSONAS) {
    usuarios[clave] = await crearUsuario({
      nombre: `Persona ${clave}`, email: `${clave}@prueba.edu.ar`, password: PASSWORD, rol,
    });
  }

  const servidor = await new Promise((resolver) => {
    const s = crearApp().listen(0, "127.0.0.1", () => resolver(s));
  });
  const url = `http://127.0.0.1:${servidor.address().port}`;

  return {
    url,
    usuarios,
    carpetaAdjuntos: process.env.CARPETA_ADJUNTOS,
    async cerrar() {
      await new Promise((resolver) => servidor.close(resolver));
      await db.cerrar();
      fs.rmSync(process.env.CARPETA_ADJUNTOS, { recursive: true, force: true });
    },
  };
}

/** Cliente HTTP mínimo que guarda la cookie de sesión, como haría un navegador. */
function cliente(url) {
  let cookie = "";

  async function pedir(metodo, ruta, cuerpo, cabeceras = {}) {
    const opciones = { method: metodo, headers: { ...cabeceras }, redirect: "manual" };
    if (cookie) opciones.headers.cookie = cookie;
    if (cuerpo instanceof FormData) {
      opciones.body = cuerpo;
    } else if (cuerpo !== undefined) {
      opciones.headers["content-type"] = "application/json";
      opciones.body = JSON.stringify(cuerpo);
    }

    const respuesta = await fetch(url + ruta, opciones);
    const nuevas = respuesta.headers.getSetCookie();
    if (nuevas.length) {
      const par = nuevas[0].split(";")[0];
      cookie = par.endsWith("=") ? "" : par;
    }

    const tipo = respuesta.headers.get("content-type") || "";
    const datos = tipo.includes("json") ? await respuesta.json() : Buffer.from(await respuesta.arrayBuffer());
    return { estado: respuesta.status, datos, cabeceras: respuesta.headers };
  }

  return {
    pedir,
    get: (ruta) => pedir("GET", ruta),
    post: (ruta, cuerpo = {}, cabeceras) => pedir("POST", ruta, cuerpo, cabeceras),
    patch: (ruta, cuerpo) => pedir("PATCH", ruta, cuerpo),
    delete: (ruta) => pedir("DELETE", ruta),
    get cookie() { return cookie; },
    set cookie(valor) { cookie = valor; },
    async ingresar(clave, password = PASSWORD) {
      return pedir("POST", "/api/auth/login", { email: `${clave}@prueba.edu.ar`, password });
    },
  };
}

/** Un cliente ya autenticado como la persona indicada (admin, director, autoridad, colab u obs). */
async function ingresarComo(url, clave) {
  const c = cliente(url);
  const r = await c.ingresar(clave);
  if (r.estado !== 200) throw new Error(`No se pudo ingresar como ${clave}: ${r.estado}`);
  return c;
}

let contador = 0;
/** Datos válidos de un contenido. Atajo: { sitio: "x" } equivale a { sitiosDestino: ["x"] }. */
function datosContenido(extra = {}) {
  const { sitio, ...resto } = extra;
  const datos = {
    sitiosDestino: ["adultos-mayores"],
    tipo: "noticia",
    seccion: "Becas y beneficios",
    slug: `contenido-${process.pid}-${++contador}`,
    titulo: "Convocatoria de becas",
    resumen: "Resumen breve del contenido.",
    cuerpo: "Texto completo del contenido.",
    ...resto,
  };
  if ("sitio" in extra) datos.sitiosDestino = sitio === undefined ? [] : [sitio];
  return datos;
}

module.exports = { iniciar, cliente, ingresarComo, datosContenido, PASSWORD, db };
