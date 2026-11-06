"use strict";

const { coleccion, aId, esDuplicado } = require("../db");
const { crear } = require("../errores");
const { ROLES, ROLES_IMPRESCINDIBLES, exigir, puede } = require("../permisos");
const { hashPassword, usuarioPublico, validarPassword } = require("../auth");

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Nombre y correo siempre como texto limpio (nunca un objeto que llegue a la consulta). */
function validarIdentidad({ nombre, email }) {
  const nombreLimpio = typeof nombre === "string" ? nombre.trim().replace(/\s+/g, " ") : "";
  const correo = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!nombreLimpio || nombreLimpio.length > 120) throw crear("datos_invalidos", "Indicá el nombre (hasta 120 caracteres).");
  if (!CORREO_VALIDO.test(correo) || correo.length > 160) throw crear("datos_invalidos", "El correo no es válido.");
  return { nombre: nombreLimpio, email: correo };
}

/** Datos de contacto opcionales. Solo devuelve los campos que vinieron (en una edición, lo que no vino no cambia). */
function validarContacto(entrada = {}) {
  const contacto = {};
  if ("telefono" in entrada) {
    const t = typeof entrada.telefono === "string" ? entrada.telefono.trim() : "";
    if (t && !/^[0-9+()\-\s.]{6,40}$/.test(t)) throw crear("datos_invalidos", "El teléfono solo admite números, espacios, +, guiones y paréntesis.");
    contacto.telefono = t || null;
  }
  if ("area" in entrada) {
    const a = typeof entrada.area === "string" ? entrada.area.trim().replace(/\s+/g, " ") : "";
    if (a.length > 120) throw crear("datos_invalidos", "El área admite hasta 120 caracteres.");
    contacto.area = a || null;
  }
  return contacto;
}

/** Lo que ve el administrador además de los datos públicos: contacto. */
const conContacto = (doc) => ({ ...usuarioPublico(doc), telefono: doc.telefono ?? null, area: doc.area ?? null });

function validarRol(rol) {
  if (typeof rol !== "string" || !ROLES.includes(rol)) throw crear("datos_invalidos", "El rol indicado no existe.");
  return rol;
}

const correoDuplicado = () => crear("datos_invalidos", "Ya existe una persona con ese correo.");
/* Administrador y autoridad superior no pueden quedar vacantes: no se puede quitar el rol ni dar de baja
 * a la última persona que lo tiene. (Una base anterior a la cadena de tres niveles arranca sin autoridad
 * superior: el administrador la asigna desde Equipo y roles.) */
const imprescindible = (rol) => Object.prototype.hasOwnProperty.call(ROLES_IMPRESCINDIBLES, rol);
const quedaVacante = (rol) => crear("regla_negocio", ROLES_IMPRESCINDIBLES[rol]);
const contarRol = (usuarios, rol) => usuarios.countDocuments({ rol, activo: true });

async function buscarActivo(usuarios, usuarioId) {
  const _id = aId(usuarioId);
  const objetivo = _id ? await usuarios.findOne({ _id, activo: true }) : null;
  if (!objetivo) throw crear("no_encontrado", "La persona no existe.");
  return objetivo;
}

async function cerrarSesionesDe(usuarioId) {
  const sesiones = await coleccion("sesiones");
  await sesiones.deleteMany({ usuarioId });
}

/* ---------- Consultas ---------- */

/** Integrantes activos. El administrador recibe también los datos de contacto (los necesita para editarlos). */
async function listar(actor = null) {
  const usuarios = await coleccion("usuarios");
  const documentos = await usuarios.find({ activo: true }).sort({ _id: 1 }).toArray();
  return documentos.map(puede(actor, "roles") ? conContacto : usuarioPublico);
}

/**
 * Directorio completo para el administrador: todas las personas registradas, también las dadas de baja,
 * con su estado, rol actual, contacto, alta y último acceso. Nunca incluye el hash de la contraseña.
 */
async function directorio(actor) {
  exigir(actor, "auditoria", "Solo el administrador puede ver el directorio completo.");
  const usuarios = await coleccion("usuarios");
  const documentos = await usuarios.find({}, { projection: { passwordHash: 0 } }).sort({ _id: 1 }).toArray();
  return documentos.map((d) => ({
    ...conContacto(d),
    estado: d.activo ? "activo" : "baja",
    creadoEn: d.creadoEn ? d.creadoEn.toISOString() : null,
  }));
}

/* ---------- Rol ---------- */

async function cambiarRol(actor, usuarioId, rol) {
  exigir(actor, "roles");
  validarRol(rol);
  const usuarios = await coleccion("usuarios");
  const objetivo = await buscarActivo(usuarios, usuarioId);
  const _id = objetivo._id;

  const rolQueDeja = objetivo.rol !== rol && imprescindible(objetivo.rol) ? objetivo.rol : null;
  if (rolQueDeja && (await contarRol(usuarios, rolQueDeja)) <= 1) throw quedaVacante(rolQueDeja);

  // solo se aplica si nadie cambió el rol de esta persona mientras tanto
  const actualizado = await usuarios.findOneAndUpdate(
    { _id, activo: true, rol: objetivo.rol },
    { $set: { rol } },
    { returnDocument: "after" }
  );
  if (!actualizado) throw crear("estado_invalido", "El rol de esta persona cambió recién. Revisá y probá de nuevo.");

  // Dos cambios simultáneos podrían dejar el rol vacante: se vuelve a contar después de escribir
  // y, si quedó en cero, se deshace el cambio.
  if (rolQueDeja && (await contarRol(usuarios, rolQueDeja)) === 0) {
    await usuarios.updateOne({ _id, rol }, { $set: { rol: rolQueDeja } });
    throw quedaVacante(rolQueDeja);
  }
  return usuarioPublico(actualizado);
}

/* ---------- Alta ---------- */

/** Alta de una persona sin controlar permisos (la usan los scripts de backend/scripts y las pruebas). */
async function crearUsuario({ nombre, email, password, rol = "observador", debeCambiarClave = false, ...extra }) {
  const identidad = validarIdentidad({ nombre, email });
  const contacto = validarContacto(extra);
  validarRol(rol);
  validarPassword(password);

  const documento = {
    ...identidad,
    passwordHash: await hashPassword(password),
    rol,
    activo: true,
    ultimoAcceso: null,
    creadoEn: new Date(),
    telefono: contacto.telefono ?? null,
    area: contacto.area ?? null,
    debeCambiarClave: Boolean(debeCambiarClave),
  };
  const usuarios = await coleccion("usuarios");
  try {
    const r = await usuarios.insertOne(documento);
    return conContacto({ ...documento, _id: r.insertedId });
  } catch (error) {
    if (esDuplicado(error)) throw correoDuplicado();
    throw error;
  }
}

/**
 * Alta desde el panel (solo administrador). La contraseña que pone el administrador es provisional:
 * la persona tiene que cambiarla por una propia en su primer ingreso.
 * Si el correo pertenece a alguien dado de baja, se lo reactiva con los datos nuevos: conserva su id,
 * así los contenidos que cargó antes vuelven a mostrar su nombre en vez de "Usuario dado de baja".
 */
async function agregarIntegrante(actor, entrada = {}) {
  exigir(actor, "roles");
  const identidad = validarIdentidad(entrada);
  const contacto = validarContacto(entrada);
  const rol = validarRol(entrada.rol);
  validarPassword(entrada.password);

  const usuarios = await coleccion("usuarios");
  const existente = await usuarios.findOne({ email: identidad.email });
  if (existente && existente.activo) throw correoDuplicado();

  if (existente) {
    const reactivado = await usuarios.findOneAndUpdate(
      { _id: existente._id, activo: false },
      { $set: { ...identidad, ...contacto, rol, activo: true, passwordHash: await hashPassword(entrada.password), debeCambiarClave: true } },
      { returnDocument: "after" }
    );
    if (!reactivado) throw correoDuplicado(); // alguien lo reactivó mientras tanto
    return { ...conContacto(reactivado), reactivado: true };
  }
  return crearUsuario({ ...identidad, ...contacto, rol, password: entrada.password, debeCambiarClave: true });
}

/* ---------- Edición ---------- */

/** Actualiza nombre y correo; si viene "password" con texto, también la restablece (queda provisional para
 * la otra persona: la tiene que cambiar al ingresar. Si el administrador cambia la suya, queda definitiva). */
async function editarIntegrante(actor, usuarioId, entrada = {}) {
  exigir(actor, "roles");
  const identidad = validarIdentidad(entrada);
  const nuevaClave = typeof entrada.password === "string" && entrada.password !== "" ? entrada.password : null;
  if (nuevaClave !== null) validarPassword(nuevaClave);

  const usuarios = await coleccion("usuarios");
  const objetivo = await buscarActivo(usuarios, usuarioId);

  const cambios = { ...identidad, ...validarContacto(entrada) };
  if (nuevaClave !== null) {
    cambios.passwordHash = await hashPassword(nuevaClave);
    cambios.debeCambiarClave = String(objetivo._id) !== actor.id;
  }

  let actualizado;
  try {
    actualizado = await usuarios.findOneAndUpdate(
      { _id: objetivo._id, activo: true },
      { $set: cambios },
      { returnDocument: "after" }
    );
  } catch (error) {
    if (esDuplicado(error)) throw correoDuplicado();
    throw error;
  }
  if (!actualizado) throw crear("no_encontrado", "La persona no existe.");

  // Con una contraseña nueva, las sesiones abiertas de esa persona dejan de valer (salvo la propia).
  if (nuevaClave !== null && String(objetivo._id) !== actor.id) await cerrarSesionesDe(objetivo._id);
  return conContacto(actualizado);
}

/* ---------- Baja ---------- */

/**
 * Da de baja sin borrar: la persona queda con activo = false, no puede ingresar y sale del directorio,
 * pero su autoría en el historial de contenidos se conserva.
 */
async function darDeBaja(actor, usuarioId) {
  exigir(actor, "roles");
  const usuarios = await coleccion("usuarios");
  const objetivo = await buscarActivo(usuarios, usuarioId);
  const _id = objetivo._id;

  if (String(_id) === actor.id) throw crear("regla_negocio", "No podés darte de baja a vos mismo.");
  const protegido = imprescindible(objetivo.rol);
  if (protegido && (await contarRol(usuarios, objetivo.rol)) <= 1) throw quedaVacante(objetivo.rol);

  const r = await usuarios.updateOne({ _id, activo: true }, { $set: { activo: false } });
  if (r.modifiedCount === 0) throw crear("no_encontrado", "La persona ya fue dada de baja.");

  // misma red de seguridad que en cambiarRol ante dos bajas simultáneas
  if (protegido && (await contarRol(usuarios, objetivo.rol)) === 0) {
    await usuarios.updateOne({ _id }, { $set: { activo: true } });
    throw quedaVacante(objetivo.rol);
  }
  await cerrarSesionesDe(_id);
  return { id: String(_id), activo: false };
}

module.exports = { listar, directorio, cambiarRol, crearUsuario, agregarIntegrante, editarIntegrante, darDeBaja };
