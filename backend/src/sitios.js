"use strict";

/* Sitios web a los que Nexo publica y tipos de contenido que acepta cada uno.
 *
 * El "id" es lo que guardan la base y las URLs de la API: no lo cambies una vez que haya contenidos cargados.
 * El "nombre" es solo lo que se ve en el panel: podés cambiarlo cuando quieras.
 * Si agregás o cambiás algo acá, actualizá también SITIOS y TIPOS en frontend/js/api.js
 * y corré "npm run bd:iniciar" para que la base acepte el valor nuevo.
 */

const SITIOS = [
  { id: "adultos-mayores", nombre: "Portal Dirección General de Adultos Mayores", corto: "Adultos Mayores", activo: true },
  { id: "mama-antula", nombre: "Residencia de Larga Estadía Mama Antula", corto: "Mama Antula", activo: true },
  { id: "centro-de-dia", nombre: "Centro de Día Virgen del Valle", corto: "Centro de Día", activo: true },
];

/* Ids anteriores que cambiaron de nombre: "npm run bd:iniciar" los reemplaza en los contenidos guardados. */
const SITIOS_RENOMBRADOS = { "sitio-3": "centro-de-dia" };

const TIPOS = [
  { id: "noticia", nombre: "Noticia" },
  { id: "proyecto", nombre: "Proyecto institucional" },
  { id: "galeria", nombre: "Galería de fotos" },
];

const ID_SITIOS = SITIOS.map((s) => s.id);
const ID_TIPOS = TIPOS.map((t) => t.id);

const existeSitio = (id) => ID_SITIOS.includes(id);

/**
 * Sitios de destino elegidos (casillas del editor). Acepta un arreglo o, por compatibilidad con clientes
 * anteriores, un solo id en texto. Devuelve los ids sin repetir y en el orden del catálogo.
 * Lanza un error con "mensaje" si alguno no existe; el arreglo puede quedar vacío (quien llama decide si lo exige).
 */
function normalizarSitios(entrada) {
  let lista;
  if (entrada == null || entrada === "") lista = [];
  else if (typeof entrada === "string") lista = [entrada];
  else if (Array.isArray(entrada)) lista = entrada;
  else return { error: "Los sitios de destino no tienen un formato válido." };
  const limpios = lista.map((x) => (typeof x === "string" ? x.trim() : x));
  if (limpios.some((x) => typeof x !== "string" || !existeSitio(x))) return { error: "Alguno de los sitios elegidos no existe." };
  return { sitios: ID_SITIOS.filter((id) => limpios.includes(id)) };
}

const nombreSitio = (id) => (SITIOS.find((s) => s.id === id) || { corto: id }).corto;
const existeTipo = (id) => ID_TIPOS.includes(id);

module.exports = { SITIOS, TIPOS, ID_SITIOS, ID_TIPOS, SITIOS_RENOMBRADOS, existeSitio, existeTipo, normalizarSitios, nombreSitio };
