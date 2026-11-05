"use strict";

/* Registro automático de auditoría.
 *
 * Un middleware montado en /api reconoce cada pedido auditable por el catálogo (método + ruta) y, cuando la
 * respuesta termina, guarda un documento en la colección "auditoria" con: quién (nombre, correo y rol en ese
 * momento), cuándo (marca de tiempo exacta), desde dónde (módulo del portal, IP, red, sede y país si se conocen),
 * qué hizo (detalle en palabras) y cómo salió (ok / rechazado / error, con el motivo).
 *
 * Se registra también lo rechazado: un director que intenta publicar o un ingreso con contraseña incorrecta
 * son justamente lo que un administrador necesita ver.
 *
 * La escritura no demora la respuesta ni la rompe: si la auditoría falla, el pedido igual se atiende y el
 * error queda en el log del servidor.
 */

const config = require("../config");
const { coleccion, aId } = require("../db");
const { ACCIONES, reglaPara, tituloDe } = require("./catalogo");

/* ---------- Ubicación ---------- */

const normalizarIp = (ip) => String(ip || "").replace(/^::ffff:/, "").slice(0, 64) || "desconocida";

function ipv4ANumero(ip) {
  const partes = ip.split(".").map(Number);
  if (partes.length !== 4 || partes.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ((partes[0] << 24) >>> 0) + (partes[1] << 16) + (partes[2] << 8) + partes[3];
}

function enRango(ip, cidr) {
  const [base, bits] = cidr.split("/");
  const n = ipv4ANumero(ip);
  const b = ipv4ANumero(base);
  if (n === null || b === null) return false;
  const largo = Number(bits ?? 32);
  const mascara = largo === 0 ? 0 : (~0 << (32 - largo)) >>> 0;
  return (n & mascara) === (b & mascara);
}

const REDES_INTERNAS = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16"];

function clasificarRed(ip) {
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("127.")) return "Equipo local";
  if (REDES_INTERNAS.some((r) => enRango(ip, r)) || /^f[cd]/i.test(ip) || /^fe80:/i.test(ip)) return "Red interna";
  return "Internet";
}

/**
 * Lugar desde donde operó. La IP se "geolocaliza" de dos formas, sin servicios externos:
 *   - sede: rangos de la red institucional configurados en AUDITORIA_SEDES (ej. "10.0.1.0/24=Sede Central");
 *   - país: solo si un proxy de confianza lo informa en una cabecera (AUDITORIA_CABECERA_PAIS, ej. cf-ipcountry).
 */
function ubicar(req) {
  const ip = normalizarIp(req.ip);
  const sede = config.auditoria.sedes.find((s) => enRango(ip, s.rango));
  const cabecera = config.auditoria.cabeceraPais && req.get(config.auditoria.cabeceraPais);
  const pais = cabecera && /^[A-Za-z]{2}$/.test(cabecera) ? cabecera.toUpperCase() : null;
  return { ip, red: clasificarRed(ip), sede: sede ? sede.nombre : null, pais };
}

/** "Chrome en Windows": suficiente para auditar sin guardar el user-agent completo. */
function navegador(ua = "") {
  const nombre = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : null;
  const so = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : null;
  if (!nombre && !so) return ua ? "Otro cliente" : null;
  return [nombre || "Navegador", so && `en ${so}`].filter(Boolean).join(" ");
}

/* ---------- Lectura previa (estado anterior al pedido) ---------- */

async function cargarPrevio(tipo, params, req) {
  if (!tipo) return null;
  if (tipo === "usuarioPorCorreo") {
    const correo = req.body && typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return correo ? (await coleccion("usuarios")).findOne({ email: correo }, { projection: { passwordHash: 0 } }) : null;
  }
  const _id = aId(params.id);
  if (!_id) return null;
  if (tipo === "usuario") return (await coleccion("usuarios")).findOne({ _id }, { projection: { passwordHash: 0 } });
  if (tipo === "contenido") return (await coleccion("contenidos")).findOne({ _id });
  if (tipo === "adjunto") {
    const contenido = await (await coleccion("contenidos")).findOne({ "adjuntos._id": _id });
    const adjunto = contenido && contenido.adjuntos.find((a) => a._id.equals(_id));
    return adjunto ? { adjunto, contenido } : null;
  }
  return null;
}

/* ---------- Armado del registro ---------- */

const identidad = (u) => (u
  ? { id: aId(String(u.id || u._id)), nombre: u.nombre || null, email: u.email || null, rol: u.rol || null }
  : null);

function quienActuo(req, cuerpo, previo, regla) {
  if (req.usuario) return identidad(req.usuario);
  if (regla.ruta === "/api/auth/login") {
    if (cuerpo && cuerpo.usuario) return identidad(cuerpo.usuario); // ingresó
    if (previo) return identidad(previo); // falló con un correo existente: interesa saber de quién era la cuenta
    const intentado = req.body && typeof req.body.email === "string" ? req.body.email.trim().toLowerCase().slice(0, 160) : null;
    return { id: null, nombre: null, email: intentado || null, rol: null };
  }
  return null; // sin sesión (ej. una sesión vencida): no es un movimiento de un integrante
}

function objetoDe(regla, params, previo, cuerpo) {
  if (regla.antes === "contenido" || regla.ruta === "/api/borradores" || regla.ruta === "/api/contenidos") {
    const id = aId(params.id) || (cuerpo && aId(cuerpo.id));
    const titulo = tituloDe(cuerpo && cuerpo.versiones ? cuerpo : null) || tituloDe(previo && previo.versiones ? formatearMinimo(previo) : null);
    return id ? { tipo: "contenido", id, titulo: titulo ? titulo.slice(0, 160) : null } : null;
  }
  if (regla.antes === "adjunto") {
    return { tipo: "adjunto", id: aId(params.id), titulo: previo && previo.adjunto ? previo.adjunto.nombreOriginal.slice(0, 160) : null };
  }
  if (regla.antes === "usuario" || regla.ruta === "/api/usuarios") {
    const id = aId(params.id) || (cuerpo && aId(cuerpo.id));
    const nombre = (previo && previo.nombre) || (cuerpo && cuerpo.nombre) || null;
    return id ? { tipo: "usuario", id, titulo: nombre } : null;
  }
  if (regla.accion === "auditoria.exportar") return { tipo: "auditoria", id: null, titulo: null };
  return null;
}

/** Un documento de la base tiene el mismo formato mínimo que la API para leer su título. */
const formatearMinimo = (doc) => ({ borrador: doc.borrador, versiones: doc.versiones });

/* ---------- Escritura ---------- */

const pendientes = new Set();

async function guardar(registro) {
  try {
    await (await coleccion("auditoria")).insertOne(registro);
  } catch (error) {
    console.error("No se pudo guardar un registro de auditoría:", error.message);
  }
}

/** Para pruebas y para cerrar el servidor sin perder registros: espera a que se escriban los pendientes. */
async function esperarPendientes() {
  while (pendientes.size) await Promise.all([...pendientes]);
}

/* ---------- Middleware ---------- */

function auditar(req, res, next) {
  const ruta = req.originalUrl.split("?")[0];
  const coincidencia = reglaPara(req.method, ruta);
  if (!coincidencia) return next();
  const { regla, params } = coincidencia;
  const inicio = process.hrtime.bigint();

  // guarda el JSON de la respuesta (el contenido creado, el error con su motivo…) sin cambiarlo
  const json = res.json.bind(res);
  res.json = (cuerpo) => {
    res.locals.cuerpoAuditoria = cuerpo;
    return json(cuerpo);
  };

  let previo = null;
  cargarPrevio(regla.antes, params, req)
    .then((p) => { previo = p; })
    .catch(() => { /* sin estado previo, el detalle se arma igual */ })
    .finally(() => {
      res.on("finish", () => {
        const tarea = (async () => {
          const accion = typeof regla.accion === "function" ? regla.accion(req, res) : regla.accion;
          if (!accion) return; // la regla decidió no registrar este pedido (ej. una miniatura)
          const cuerpo = res.locals.cuerpoAuditoria || null;
          const usuario = quienActuo(req, cuerpo, previo, regla);
          if (!usuario) return;
          const ok = res.statusCode < 400;
          let detalle;
          try {
            detalle = regla.detalle({ req, res, cuerpo: ok ? cuerpo : null, previo, ok });
          } catch (e) {
            detalle = ACCIONES[accion].etiqueta;
          }
          const motivo = !ok && cuerpo && cuerpo.error ? String(cuerpo.error.mensaje).slice(0, 300) : null;
          await guardar({
            fecha: new Date(),
            usuario,
            accion,
            modulo: ACCIONES[accion].modulo,
            detalle: String(detalle || ACCIONES[accion].etiqueta).slice(0, 400),
            resultado: res.statusCode >= 500 ? "error" : ok ? "ok" : "rechazado",
            motivo,
            objeto: objetoDe(regla, params, previo, ok ? cuerpo : null),
            ubicacion: ubicar(req),
            peticion: {
              metodo: req.method,
              ruta: ruta.slice(0, 200),
              estado: res.statusCode,
              duracionMs: Number((process.hrtime.bigint() - inicio) / 1000000n),
              navegador: navegador(req.get("user-agent")),
            },
          });
        })();
        pendientes.add(tarea);
        tarea.finally(() => pendientes.delete(tarea));
      });
      next();
    });
}

module.exports = { auditar, esperarPendientes, ubicar, navegador, clasificarRed, enRango };
