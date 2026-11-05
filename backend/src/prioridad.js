"use strict";

/* Prioridad de los contenidos: "normal" o "urgente".
 *
 * - Quien escribe la marca en el borrador (interruptor "Prioritario / urgente"), con un motivo opcional y una fecha
 *   opcional hasta la cual se destaca en el sitio público. Al enviar, pasa al contenido (campo "prioridad").
 * - En el circuito, los revisores (dirección y autoridad superior) pueden subirla o bajarla: así una marca de
 *   urgencia mal puesta no se queda saltando la fila. Sobre algo publicado, solo la autoridad superior.
 * - Al publicar se copia a "prioridadPublicada": la web muestra la prioridad que se aprobó junto con la versión
 *   visible, aunque después se prepare una versión nueva con otra prioridad.
 *
 * El orden de las bandejas usa el texto del nivel: "urgente" > "normal" alfabéticamente, así que ordenar
 * "prioridad.nivel" de forma descendente pone primero lo urgente (y usa el índice). Si se agrega un nivel,
 * hay que elegir un nombre que respete ese orden o pasar a un peso numérico.
 */

const config = require("./config");
const { crear } = require("./errores");

const NIVELES = ["normal", "urgente"];
const MAX_MOTIVO = 200;
const MAX_DIAS_DESTACADO = 90;

const NORMAL = Object.freeze({ nivel: "normal", motivo: "", vence: null });

/** Fin del día (hora argentina) de una fecha "AAAA-MM-DD". */
function finDelDia(texto) {
  return new Date(`${texto}T23:59:59.999${config.auditoria.zonaHoraria}`);
}

/**
 * Valida lo que llega del formulario: { nivel, motivo, vence }. Devuelve siempre un objeto completo.
 * "estricta": exige que la fecha no esté vencida (al cambiarla); en un borrador se acepta guardar
 * una fecha que ya pasó, y el aviso se da al enviar.
 */
function validarPrioridad(entrada, { ahora = new Date(), estricta = true } = {}) {
  if (entrada == null) return { ...NORMAL };
  if (typeof entrada !== "object" || Array.isArray(entrada)) throw crear("datos_invalidos", "La prioridad no tiene un formato válido.");
  const nivel = entrada.nivel == null || entrada.nivel === "" ? "normal" : entrada.nivel;
  if (!NIVELES.includes(nivel)) throw crear("datos_invalidos", "La prioridad solo puede ser normal o urgente.");
  if (nivel === "normal") return { ...NORMAL }; // al quitar la urgencia, el motivo y la fecha dejan de tener sentido

  const motivo = typeof entrada.motivo === "string" ? entrada.motivo.trim().replace(/\s+/g, " ") : "";
  if (motivo.length > MAX_MOTIVO) throw crear("datos_invalidos", `El motivo de la urgencia admite hasta ${MAX_MOTIVO} caracteres.`);

  let vence = null;
  if (entrada.vence instanceof Date) {
    vence = entrada.vence; // ya guardada (en un borrador): solo se revisa que siga vigente
    if (estricta && vence < ahora) throw crear("datos_invalidos", "La fecha hasta la que se destaca ya pasó: cambiala o quitala.");
  } else if (entrada.vence != null && entrada.vence !== "") {
    // "2026-10-20" (se destaca hasta el final de ese día, hora argentina) o la fecha completa que devolvió la API
    const texto = String(entrada.vence);
    const completa = /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})$/.test(texto);
    if (!completa && !/^\d{4}-\d{2}-\d{2}$/.test(texto)) throw crear("datos_invalidos", "La fecha hasta la que se destaca no es válida.");
    vence = completa ? new Date(texto) : finDelDia(texto);
    if (Number.isNaN(vence.getTime())) throw crear("datos_invalidos", "La fecha hasta la que se destaca no es válida.");
    if (estricta && vence < ahora) throw crear("datos_invalidos", "La fecha hasta la que se destaca ya pasó.");
    if (vence.getTime() - ahora.getTime() > MAX_DIAS_DESTACADO * 86400000) {
      throw crear("datos_invalidos", `Un aviso urgente se puede destacar hasta ${MAX_DIAS_DESTACADO} días.`);
    }
  }
  return { nivel, motivo, vence };
}

/** Lo que se guarda en el contenido: la prioridad, quién la fijó y cuándo. */
const registro = (p, actorId, ahora) => ({
  nivel: p.nivel,
  motivo: p.nivel === "urgente" ? p.motivo : "",
  vence: p.nivel === "urgente" ? p.vence : null,
  marcadoPor: actorId,
  marcadoEn: ahora,
});

const esUrgente = (p) => Boolean(p) && p.nivel === "urgente";

/** En el sitio público se destaca mientras sea urgente y no haya pasado su fecha. */
const destacadaEnSitio = (p, ahora = new Date()) => esUrgente(p) && (!p.vence || new Date(p.vence) >= ahora);

const iso = (f) => (f ? new Date(f).toISOString() : null);
const fechaCorta = (f) => new Date(new Date(f).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10).split("-").reverse().join("/");

/** Formato para la API (ids y fechas como texto). Sin prioridad guardada (contenidos anteriores) = normal. */
function formatear(p) {
  if (!p) return { nivel: "normal", motivo: "", vence: null, marcadoPor: null, marcadoEn: null };
  return {
    nivel: p.nivel,
    motivo: p.motivo || "",
    vence: iso(p.vence),
    marcadoPor: p.marcadoPor ? String(p.marcadoPor) : null,
    marcadoEn: iso(p.marcadoEn),
  };
}

/** "urgente (motivo: …, en el sitio hasta el 20/10/2026)" para el historial y la auditoría. */
function describir(p) {
  if (!esUrgente(p)) return "normal";
  const partes = [p.motivo && `motivo: ${p.motivo}`, p.vence && `en el sitio hasta el ${fechaCorta(p.vence)}`].filter(Boolean);
  return partes.length ? `urgente (${partes.join("; ")})` : "urgente";
}

const iguales = (a, b) => (a ? a.nivel : "normal") === (b ? b.nivel : "normal")
  && ((a && a.motivo) || "") === ((b && b.motivo) || "")
  && iso(a && a.vence) === iso(b && b.vence);

module.exports = {
  NIVELES, NORMAL, MAX_MOTIVO, MAX_DIAS_DESTACADO, validarPrioridad, registro, esUrgente, destacadaEnSitio, formatear,
  describir, iguales,
};
