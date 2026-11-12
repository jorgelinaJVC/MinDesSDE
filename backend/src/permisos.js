"use strict";

const { crear } = require("./errores");

/*
 * Cadena de aprobación en tres niveles:
 *
 *   Colaborador ──envía──▶ Director de área ──eleva──▶ Autoridad superior ──aprueba / rechaza / publica──▶ web
 *                               │ (devuelve)                  │ (devuelve)
 *                               ▼                             ▼
 *                            al autor                      al autor
 *
 * - "revisar": revisión intermedia (elevar o devolver con observaciones): director de área y administrador.
 *   No define nada: lo elevado lo valida la autoridad superior (o el administrador).
 * - "decidir": decisión final sobre lo elevado (aprobar, devolver o rechazar de forma definitiva).
 * - "publicar": lo que entra a la web. Solo la autoridad superior.
 * - "archivar": la autoridad superior puede dar de baja cualquier contenido. Además, cada contenido lo pueden
 *   editar o dar de baja su autor, un director de área o el administrador (ver puedeEditarContenido).
 * - "roles": gestión del equipo. El administrador gobierna la plataforma, no la línea editorial.
 * - "auditoria": directorio completo (incluidas las bajas) y bitácora de movimientos. Solo el administrador.
 */

/** En orden jerárquico (de menor a mayor alcance editorial). El administrador va aparte, al final. */
const ROLES = ["observador", "colaborador", "director", "autoridad", "administrador"];

const PERMISOS = {
  observador: [],
  colaborador: ["crear"],
  director: ["crear", "revisar"],
  autoridad: ["crear", "decidir", "publicar", "archivar"],
  // el administrador puede intervenir en las dos instancias (revisión de dirección y decisión final), además de
  // gobernar el equipo y la auditoría. Nunca sobre lo propio en la revisión, ni decide lo que él mismo elevó.
  administrador: ["crear", "revisar", "decidir", "publicar", "roles", "auditoria"],
};

/** Roles de los que siempre tiene que quedar al menos una persona activa. */
const ROLES_IMPRESCINDIBLES = {
  administrador: "Tiene que quedar al menos un administrador.",
  autoridad: "Tiene que quedar al menos una autoridad superior: sin ella nada se puede aprobar ni publicar.",
};

const puede = (usuario, permiso) => Boolean(usuario) && (PERMISOS[usuario.rol] || []).includes(permiso);

/** Quién escribió el contenido y quién su última versión (puede ser otra persona si lo editó un director). */
function autoresDe(contenido) {
  const versiones = Array.isArray(contenido.versiones) ? contenido.versiones : [];
  const ultima = versiones.length ? versiones[versiones.length - 1] : null;
  return [contenido.autorId, ultima && ultima.autorId].filter(Boolean).map(String);
}

/** Revisión intermedia: exige el permiso y no revisar lo propio, ni lo cargado ni lo editado. */
const puedeRevisar = (usuario, contenido) =>
  puede(usuario, "revisar") && !autoresDe(contenido).includes(String(usuario.id));

/**
 * Decisión final: la autoridad superior o el administrador. Se puede decidir sobre lo que uno cargó porque, para
 * llegar a esta instancia, el contenido ya pasó por la revisión de dirección de otra persona. Lo que no se puede es
 * decidir sobre una versión que uno mismo elevó: así siempre intervienen al menos dos personas distintas.
 * Sin contenido, responde si el rol tiene la facultad en general.
 */
function puedeDecidir(usuario, contenido) {
  if (!puede(usuario, "decidir")) return false;
  if (!contenido || !Array.isArray(contenido.versiones) || !contenido.versiones.length) return true;
  const revision = contenido.versiones[contenido.versiones.length - 1].revision;
  return !(revision && revision.tipo === "elevacion" && String(revision.usuarioId) === String(usuario.id));
}

/* ---------- Editar y dar de baja lo ya cargado (RBAC) ----------
 *
 *                          editar publicado   corregir observado   dar de baja / reactivar
 *   autor                        sí                  sí                     sí
 *   director de área             sí            solo si escribió             sí
 *                                               esa versión
 *   administrador                sí            solo si escribió             sí
 *                                               esa versión
 *   autoridad superior      solo lo propio      solo lo propio        sí (cualquiera)
 *   colaborador (no autor)       no                  no                     no
 *   observador                   no                  no                     no
 *
 * Un contenido observado (estado "devuelto") lo corrige solo su autor: quien lo cargó o quien escribió la versión
 * que se devolvió (si un director editó algo publicado y se lo observaron, lo corrige él).
 *
 * Editar NO publica: la edición es una versión nueva que vuelve a pasar por dirección y por la autoridad superior;
 * mientras tanto la web sigue mostrando la versión aprobada. El autor necesita seguir teniendo permiso de cargar
 * (si pasó a observador, ya no edita lo que escribió). */
const ROLES_QUE_EDITAN_TODO = ["director", "administrador"];

const esAutorDelContenido = (usuario, contenido) =>
  Boolean(usuario && contenido) && String(contenido.autorId) === String(usuario.id);

/** Autor, director de área o administrador (con permiso de cargar): responsables de un contenido ya enviado. */
const esResponsable = (usuario, contenido) =>
  puede(usuario, "crear") && Boolean(contenido)
  && (esAutorDelContenido(usuario, contenido) || ROLES_QUE_EDITAN_TODO.includes(usuario.rol));

function puedeEditarContenido(usuario, contenido) {
  if (!puede(usuario, "crear") || !contenido) return false;
  if (contenido.estado === "devuelto") return autoresDe(contenido).includes(String(usuario.id));
  return esResponsable(usuario, contenido);
}

const puedeDarDeBaja = (usuario, contenido) => esResponsable(usuario, contenido) || puede(usuario, "archivar");

/** Quién puede llegar a dar de baja algo (para cortar antes de buscar el contenido): no los observadores. */
const puedeDarDeBajaAlguno = (usuario) => puede(usuario, "crear") || puede(usuario, "archivar");

/** Enviar una nueva versión: quien puede editar el contenido. */
const puedeReenviar = puedeEditarContenido;

/* ---------- Borradores ----------
 * Un borrador es trabajo en curso: solo lo ve, edita, envía o descarta quien lo creó. Ni el administrador ni la
 * autoridad superior lo ven hasta que se envía (recién ahí entra a la cadena de aprobación). */
const esAutorDelBorrador = (usuario, borrador) =>
  Boolean(usuario && borrador) && String(borrador.autorId) === String(usuario.id);

/** Empezar un borrador de nueva versión (editar): las mismas personas que pueden reenviar. */
const puedeIniciarBorradorDeVersion = (usuario, contenido) => puedeReenviar(usuario, contenido);

/* ---------- Adjuntos ----------
 * Quién puede ver o descargar un archivo depende de dónde está:
 *   - en una versión publicada: cualquiera con sesión (además es público en /api/publico/adjuntos);
 *   - en una versión enviada: el autor del contenido o de esa versión, quienes revisan o deciden
 *     (director de área y autoridad superior) y el administrador;
 *   - solo en un borrador: únicamente quien escribe ese borrador.
 * "ubicacion" la arma el servicio de adjuntos a partir del documento. */
function puedeVerAdjunto(usuario, ubicacion) {
  if (!usuario) return false;
  const { publicado, versiones = [], autorContenidoId, borradorAutorId } = ubicacion;
  if (versiones.length) {
    if (publicado) return true;
    if (String(autorContenidoId) === usuario.id) return true;
    if (versiones.some((v) => String(v.autorId) === usuario.id)) return true;
    if (puede(usuario, "revisar") || puede(usuario, "decidir")) return true;
    if (usuario.rol === "administrador") return true; // supervisa la plataforma (no revisa, pero puede abrir lo enviado)
  }
  return borradorAutorId != null && String(borradorAutorId) === usuario.id;
}

function exigir(usuario, permiso, mensaje) {
  if (!puede(usuario, permiso)) throw crear("prohibido", mensaje || "Tu rol no permite realizar esta acción.");
}

module.exports = {
  ROLES, PERMISOS, ROLES_IMPRESCINDIBLES, puede, puedeRevisar, puedeDecidir, puedeReenviar, exigir,
  puedeEditarContenido, puedeDarDeBaja, puedeDarDeBajaAlguno, esAutorDelContenido, autoresDe,
  esAutorDelBorrador, puedeIniciarBorradorDeVersion, puedeVerAdjunto,
};
