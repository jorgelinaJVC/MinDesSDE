"use strict";

const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const config = require("./config");
const { coleccion, aId } = require("./db");
const { crear } = require("./errores");

const COOKIE = "nexo_sesion";
const iso = (fecha) => (fecha ? new Date(fecha).toISOString() : null);
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/* ---------- Contraseñas ---------- */

function validarPassword(password) {
  if (typeof password !== "string" || password.length < 10) {
    throw crear("datos_invalidos", "La contraseña debe tener al menos 10 caracteres.");
  }
  if (Buffer.byteLength(password) > 72) {
    throw crear("datos_invalidos", "La contraseña no puede superar los 72 bytes.");
  }
}

const hashPassword = (password) => bcrypt.hash(password, config.costoBcrypt);

// Hash de relleno: así el tiempo de respuesta no delata si el correo existe.
let hashRelleno = null;
async function obtenerRelleno() {
  hashRelleno ??= await bcrypt.hash(crypto.randomBytes(8).toString("hex"), config.costoBcrypt);
  return hashRelleno;
}

/* ---------- Límite de intentos de inicio de sesión ---------- */

const fallos = new Map(); // clave -> { cantidad, desde }

function verificarLimite(clave) {
  const registro = fallos.get(clave);
  if (!registro) return;
  if (Date.now() - registro.desde > config.intentosLogin.ventanaMs) {
    fallos.delete(clave);
    return;
  }
  if (registro.cantidad >= config.intentosLogin.maximo) {
    throw crear("demasiados_intentos", "Demasiados intentos fallidos. Probá de nuevo en unos minutos.");
  }
}

function registrarFallo(clave) {
  const registro = fallos.get(clave) || { cantidad: 0, desde: Date.now() };
  registro.cantidad += 1;
  fallos.set(clave, registro);
}

const reiniciarLimites = () => fallos.clear();

/* ---------- Sesiones ---------- */

function usuarioPublico(doc) {
  return {
    id: String(doc._id),
    nombre: doc.nombre,
    email: doc.email,
    rol: doc.rol,
    ultimoAcceso: iso(doc.ultimoAcceso),
  };
}

async function iniciarSesion(email, password, ip) {
  // siempre texto: un objeto como { "$ne": null } nunca llega a la consulta
  const correo = String(email || "").trim().toLowerCase();
  const clave = `${ip}|${correo}`;
  verificarLimite(clave);

  const usuarios = await coleccion("usuarios");
  const usuario = await usuarios.findOne({ email: correo, activo: true });
  const coincide = password.length <= 200
    && await bcrypt.compare(password, usuario ? usuario.passwordHash : await obtenerRelleno());

  if (!usuario || !coincide) {
    registrarFallo(clave);
    throw crear("credenciales", "Correo o contraseña incorrectos.");
  }
  fallos.delete(clave);

  const ahora = new Date();
  const sesiones = await coleccion("sesiones");
  // el índice TTL ya las borra solo, pero así no quedan ni un minuto de más
  await sesiones.deleteMany({ expiraEn: { $lt: ahora } });

  const actualizado = await usuarios.findOneAndUpdate(
    { _id: usuario._id },
    { $set: { ultimoAcceso: ahora } },
    { returnDocument: "after" }
  );

  const token = crypto.randomBytes(32).toString("base64url");
  await sesiones.insertOne({
    usuarioId: usuario._id,
    tokenHash: hashToken(token),
    expiraEn: new Date(ahora.getTime() + config.sesionHoras * 3600 * 1000),
    creadoEn: ahora,
  });

  return { usuario: usuarioPublico(actualizado), token };
}

async function usuarioDesdeToken(token) {
  if (!token) return null;
  const sesiones = await coleccion("sesiones");
  const sesion = await sesiones.findOne({ tokenHash: hashToken(token), expiraEn: { $gt: new Date() } });
  if (!sesion) return null;
  const usuarios = await coleccion("usuarios");
  const usuario = await usuarios.findOne({ _id: aId(sesion.usuarioId), activo: true });
  return usuario ? usuarioPublico(usuario) : null;
}

async function cerrarSesion(token) {
  if (!token) return;
  const sesiones = await coleccion("sesiones");
  await sesiones.deleteOne({ tokenHash: hashToken(token) });
}

/* ---------- Cookies y middleware ---------- */

function leerCookie(req, nombre) {
  const cabecera = req.headers.cookie;
  if (!cabecera) return null;
  for (const par of cabecera.split(";")) {
    const [clave, ...resto] = par.trim().split("=");
    if (clave === nombre) return decodeURIComponent(resto.join("="));
  }
  return null;
}

function cookieSesion(token) {
  const atributos = [`${COOKIE}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${config.sesionHoras * 3600}`];
  if (config.produccion) atributos.push("Secure");
  return atributos.join("; ");
}

const cookieVencida = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

/** Carga req.usuario (o null) a partir de la cookie de sesión. */
async function cargarUsuario(req, res, next) {
  const token = leerCookie(req, COOKIE);
  req.token = token;
  req.usuario = await usuarioDesdeToken(token);
  next();
}

function requerirSesion(req, res, next) {
  if (!req.usuario) throw crear("sin_sesion", "Tu sesión expiró. Volvé a ingresar.");
  next();
}

/** Defensa extra contra CSRF: en pedidos que modifican datos, el Origin debe ser este mismo sitio. */
function verificarOrigen(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origen = req.get("origin");
  if (origen) {
    let host = null;
    try { host = new URL(origen).host; } catch (e) { /* origen ilegible */ }
    if (host !== req.get("host")) throw crear("origen_invalido", "Origen no permitido.");
  }
  return next();
}

module.exports = {
  validarPassword, hashPassword, iniciarSesion, cerrarSesion, usuarioPublico,
  cookieSesion, cookieVencida, cargarUsuario, requerirSesion, verificarOrigen, reiniciarLimites,
};
