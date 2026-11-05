"use strict";

/* Consulta de la auditoría (solo administrador): filtros, paginación, resumen, exportación y directorio. */

const config = require("../config");
const { coleccion, aId } = require("../db");
const { crear } = require("../errores");
const { exigir } = require("../permisos");
const { ACCIONES, MODULOS, RESULTADOS, NOMBRES_ROL } = require("../auditoria/catalogo");
const usuarios = require("./usuarios");

const TAMANOS = [10, 25, 50, 100];
const MAX_EXPORTACION = 10000;
const DIA = 24 * 3600 * 1000;

const exigirAdmin = (actor) => exigir(actor, "auditoria", "Solo el administrador puede consultar la auditoría.");

/** "2026-10-01" se toma como día completo en hora argentina; también se acepta una fecha y hora ISO. */
function leerFecha(valor, { finDelDia }) {
  if (valor == null || valor === "") return null;
  const texto = String(valor);
  let fecha;
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    fecha = new Date(`${texto}T${finDelDia ? "23:59:59.999" : "00:00:00.000"}${config.auditoria.zonaHoraria}`);
  } else if (/^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})$/.test(texto)) {
    fecha = new Date(texto);
  }
  if (!fecha || Number.isNaN(fecha.getTime())) throw crear("datos_invalidos", `La fecha «${texto.slice(0, 30)}» no es válida.`);
  return fecha;
}

const escaparRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const lista = (v) => (Array.isArray(v) ? v : String(v || "").split(",")).map((x) => String(x).trim()).filter(Boolean);

/** Arma el filtro de MongoDB a partir de la consulta. Todo lo que llega se valida: nada va directo a la base. */
function construirFiltro(consulta = {}) {
  const filtro = {};
  const desde = leerFecha(consulta.desde, { finDelDia: false });
  const hasta = leerFecha(consulta.hasta, { finDelDia: true });
  if (desde && hasta && desde > hasta) throw crear("datos_invalidos", "La fecha «desde» es posterior a «hasta».");
  if (desde || hasta) filtro.fecha = { ...(desde && { $gte: desde }), ...(hasta && { $lte: hasta }) };

  if (consulta.usuario) {
    const id = aId(String(consulta.usuario));
    if (!id) throw crear("datos_invalidos", "El integrante indicado no es válido.");
    filtro["usuario.id"] = id;
  }
  const acciones = lista(consulta.accion);
  if (acciones.some((a) => !ACCIONES[a])) throw crear("datos_invalidos", "Alguna de las acciones indicadas no existe.");
  if (acciones.length) filtro.accion = { $in: acciones };

  if (consulta.modulo) {
    if (!MODULOS.includes(consulta.modulo)) throw crear("datos_invalidos", "El módulo indicado no existe.");
    filtro.modulo = consulta.modulo;
  }
  if (consulta.resultado) {
    if (!RESULTADOS.includes(consulta.resultado)) throw crear("datos_invalidos", "El resultado indicado no existe.");
    filtro.resultado = consulta.resultado;
  }
  const q = typeof consulta.q === "string" ? consulta.q.trim().slice(0, 100) : "";
  if (q) {
    const patron = { $regex: escaparRegex(q), $options: "i" }; // texto literal, nunca una expresión del usuario
    filtro.$or = [{ detalle: patron }, { "usuario.nombre": patron }, { "usuario.email": patron }, { "ubicacion.ip": patron }];
  }
  return filtro;
}

const texto = (v) => (v == null ? null : String(v));

function formatear(r) {
  return {
    id: String(r._id),
    fecha: r.fecha.toISOString(),
    usuario: { ...r.usuario, id: texto(r.usuario.id) },
    accion: r.accion,
    accionEtiqueta: ACCIONES[r.accion] ? ACCIONES[r.accion].etiqueta : r.accion,
    modulo: r.modulo,
    detalle: r.detalle,
    resultado: r.resultado,
    motivo: r.motivo || null,
    objeto: r.objeto ? { ...r.objeto, id: texto(r.objeto.id) } : null,
    ubicacion: r.ubicacion,
    peticion: r.peticion,
  };
}

/** Página de registros, del más reciente al más antiguo. */
async function consultar(actor, consulta = {}) {
  exigirAdmin(actor);
  const filtro = construirFiltro(consulta);
  const porPagina = TAMANOS.includes(Number(consulta.porPagina)) ? Number(consulta.porPagina) : 25;
  const pedida = Math.max(1, Math.min(10000, Number.parseInt(consulta.pagina, 10) || 1));

  const col = await coleccion("auditoria");
  const total = await col.countDocuments(filtro);
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(pedida, paginas);
  const registros = await col.find(filtro).sort({ fecha: -1, _id: -1 }).skip((pagina - 1) * porPagina).limit(porPagina).toArray();
  return { registros: registros.map(formatear), total, pagina, paginas, porPagina };
}

/** Indicadores para la cabecera del panel. */
async function resumen(actor) {
  exigirAdmin(actor);
  const col = await coleccion("auditoria");
  const ahora = Date.now();
  const hoy = leerFecha(new Date(ahora - 3 * 3600 * 1000).toISOString().slice(0, 10), { finDelDia: false }); // día argentino
  const [movimientosHoy, activosHoy, fallidos24h, rechazados7d] = await Promise.all([
    col.countDocuments({ fecha: { $gte: hoy } }),
    col.distinct("usuario.id", { fecha: { $gte: hoy }, resultado: "ok", "usuario.id": { $ne: null } }),
    col.countDocuments({ accion: "sesion.fallida", fecha: { $gte: new Date(ahora - DIA) } }),
    col.countDocuments({ resultado: "rechazado", accion: { $ne: "sesion.fallida" }, fecha: { $gte: new Date(ahora - 7 * DIA) } }),
  ]);
  return { movimientosHoy, integrantesActivosHoy: activosHoy.length, ingresosFallidos24h: fallidos24h, accionesRechazadas7d: rechazados7d };
}

/** Lo que la interfaz necesita para armar los filtros. */
function catalogo() {
  return {
    modulos: MODULOS,
    resultados: RESULTADOS,
    acciones: Object.entries(ACCIONES).map(([id, a]) => ({ id, etiqueta: a.etiqueta, modulo: a.modulo })),
  };
}

/* ---------- Exportación ---------- */

/** Una celda de CSV segura: entre comillas y sin fórmulas (un "=..." podría ejecutarse al abrirlo en Excel). */
function celda(valor) {
  let t = valor == null ? "" : String(valor);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
}

const fechaLocal = (d) => new Date(d.getTime() - 3 * 3600 * 1000).toISOString().replace("T", " ").slice(0, 19);

async function exportar(actor, consulta = {}) {
  exigirAdmin(actor);
  const filtro = construirFiltro(consulta);
  const col = await coleccion("auditoria");
  const total = await col.countDocuments(filtro);
  const registros = await col.find(filtro).sort({ fecha: -1, _id: -1 }).limit(MAX_EXPORTACION).toArray();
  const columnas = [
    "Fecha y hora (Argentina)", "Nombre", "Correo", "Rol", "Módulo", "Acción", "Detalle", "Resultado", "Motivo",
    "IP", "Red", "Sede", "País", "Navegador",
  ];
  const filas = registros.map((r) => [
    fechaLocal(r.fecha), r.usuario.nombre, r.usuario.email, NOMBRES_ROL[r.usuario.rol] || "", r.modulo,
    ACCIONES[r.accion] ? ACCIONES[r.accion].etiqueta : r.accion, r.detalle, r.resultado, r.motivo,
    r.ubicacion.ip, r.ubicacion.red, r.ubicacion.sede, r.ubicacion.pais, r.peticion.navegador,
  ].map(celda).join(";"));
  return {
    csv: `\uFEFF${[columnas.map(celda).join(";"), ...filas].join("\r\n")}\r\n`, // BOM: Excel lo abre con acentos bien
    total: registros.length,
    recortado: total > MAX_EXPORTACION,
  };
}

/* ---------- Directorio ---------- */

/** Directorio completo con la actividad de los últimos 30 días de cada persona. */
async function directorioConActividad(actor) {
  const personas = await usuarios.directorio(actor);
  const col = await coleccion("auditoria");
  const desde = new Date(Date.now() - 30 * DIA);
  const actividad = await Promise.all(personas.map(async (p) => {
    const id = aId(p.id);
    const [movimientos, ultimo] = await Promise.all([
      col.countDocuments({ "usuario.id": id, fecha: { $gte: desde } }),
      col.find({ "usuario.id": id }).sort({ fecha: -1 }).limit(1).toArray(),
    ]);
    return { movimientos30d: movimientos, ultimoMovimiento: ultimo[0] ? ultimo[0].fecha.toISOString() : null };
  }));
  return personas.map((p, i) => ({ ...p, ...actividad[i] }));
}

module.exports = { consultar, resumen, catalogo, exportar, directorioConActividad, construirFiltro, MAX_EXPORTACION };
