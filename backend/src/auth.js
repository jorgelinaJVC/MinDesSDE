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
    debeCambiarClave: Boolean(doc.debeCambiarClave),
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

/**
 * La persona cambia su propia contraseña. Pide la actual (así nadie que encuentre la sesión abierta puede
 * cambiarla), aplica el mismo límite de intentos que el ingreso y, al terminar, cierra todas sus otras
 * sesiones: quien hubiera entrado con la contraseña anterior (o con la provisional) queda afuera en el acto.
 */
async function cambiarClave(usuario, token, actual, nueva, ip) {
  if (!usuario) throw crear("sin_sesion", "Tu sesión expiró. Volvé a ingresar.");
  const clave = `${ip}|cambio-clave|${usuario.id}`;
  verificarLimite(clave);
  if (typeof actual !== "string" || !actual) throw crear("datos_invalidos", "Ingresá tu contraseña actual.");
  if (typeof nueva !== "string") throw crear("datos_invalidos", "Ingresá la contraseña nueva.");
  validarPassword(nueva);

  const usuarios = await coleccion("usuarios");
  const doc = await usuarios.findOne({ _id: aId(usuario.id), activo: true });
  if (!doc) throw crear("sin_sesion", "Tu sesión expiró. Volvé a ingresar.");

  const coincide = actual.length <= 200 && await bcrypt.compare(actual, doc.passwordHash);
  if (!coincide) {
    registrarFallo(clave);
    throw crear("datos_invalidos", "La contraseña actual no es correcta.");
  }
  fallos.delete(clave);
  if (await bcrypt.compare(nueva, doc.passwordHash)) {
    throw crear("datos_invalidos", "La contraseña nueva tiene que ser distinta de la actual.");
  }

  const actualizado = await usuarios.findOneAndUpdate(
    { _id: doc._id, activo: true },
    { $set: { passwordHash: await hashPassword(nueva), debeCambiarClave: false } },
    { returnDocument: "after" }
  );
  if (!actualizado) throw crear("sin_sesion", "Tu sesión expiró. Volvé a ingresar.");

  const sesiones = await coleccion("sesiones");
  await sesiones.deleteMany({ usuarioId: doc._id, tokenHash: { $ne: hashToken(token || "") } });
  return usuarioPublico(actualizado);
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

/* Lo único que puede hacer alguien con contraseña provisional: ver su sesión, cambiarla o salir.
 * (y lo público, que no necesita sesión). Rutas relativas a /api. */
const PERMITIDO_CON_PROVISIONAL = new Set(["GET /auth/sesion", "POST /auth/logout", "POST /auth/cambiar-clave", "GET /salud"]);

/** Con contraseña provisional, el servidor corta cualquier otro pedido: no alcanza con ocultar el panel. */
function exigirClaveDefinitiva(req, res, next) {
  if (!req.usuario || !req.usuario.debeCambiarClave) return next();
  if (PERMITIDO_CON_PROVISIONAL.has(`${req.method} ${req.path}`) || req.path.startsWith("/publico/")) return next();
  throw crear("clave_provisional", "Antes de seguir tenés que cambiar tu contraseña provisional por una propia.");
}

/** Defensa extra contra CSRF: en pedidos que modifican datos, el Origin debe ser este mismo sitio. */
function verificarOrigen(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origen = req.get("origin");
  if (origen) {
    let url = null;
    try { url = new URL(origen); } catch (e) { /* origen ilegible */ }
    const mismoSitio = url && url.host === req.get("host");
    // además, las direcciones que el administrador del servidor autorizó a mano en ORIGENES_PERMITIDOS
    const autorizado = url && config.origenesPermitidos.includes(url.origin);
    if (!mismoSitio && !autorizado) throw crear("origen_invalido", "Origen no permitido.");
  }
  return next();
}

module.exports = {
  validarPassword, hashPassword, iniciarSesion, cerrarSesion, cambiarClave, usuarioPublico,
  cookieSesion, cookieVencida, cargarUsuario, requerirSesion, exigirClaveDefinitiva, verificarOrigen, reiniciarLimites,
};
