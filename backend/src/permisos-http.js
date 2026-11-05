"use strict";

/* Middleware de control de acceso por rol (RBAC) para las rutas.
 * Corta el pedido con 403 antes de leer o escribir nada si el rol de la sesión no tiene el permiso.
 * Es la primera barrera: los servicios vuelven a exigir el mismo permiso (defensa en profundidad),
 * así una ruta nueva que se olvide del middleware sigue protegida. */

const { puede, PERMISOS } = require("./permisos");
const { crear } = require("./errores");

const MENSAJES = {
  revisar: "Solo un director de área o el administrador pueden hacer la revisión de dirección.",
  decidir: "Solo la autoridad superior o el administrador pueden tomar la decisión final.",
  publicar: "Solo la autoridad superior o el administrador pueden publicar en la web.",
  archivar: "Tu rol no permite dar de baja ni reactivar contenidos.",
  roles: "Solo el administrador puede gestionar el equipo.",
  auditoria: "Solo el administrador puede consultar la auditoría y el directorio completo.",
};

function requerirPermiso(permiso) {
  const existe = Object.values(PERMISOS).some((lista) => lista.includes(permiso));
  if (!existe) throw new Error(`Permiso desconocido en una ruta: "${permiso}"`); // error de programación, al arrancar

  return function verificarPermiso(req, res, next) {
    if (!req.usuario) throw crear("sin_sesion", "Tu sesión expiró. Volvé a ingresar.");
    if (!puede(req.usuario, permiso)) {
      throw crear("prohibido", MENSAJES[permiso] || "Tu rol no permite realizar esta acción.");
    }
    next();
  };
}

/** Alcanza con tener uno de los permisos (ej. revisar en dirección o decidir como autoridad superior). */
function requerirAlguno(permisos, mensaje) {
  for (const p of permisos) {
    if (!Object.values(PERMISOS).some((lista) => lista.includes(p))) throw new Error(`Permiso desconocido en una ruta: "${p}"`);
  }
  return function verificarAlguno(req, res, next) {
    if (!req.usuario) throw crear("sin_sesion", "Tu sesión expiró. Volvé a ingresar.");
    if (!permisos.some((p) => puede(req.usuario, p))) throw crear("prohibido", mensaje || "Tu rol no permite realizar esta acción.");
    next();
  };
}

module.exports = { requerirPermiso, requerirAlguno };
