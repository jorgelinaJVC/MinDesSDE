"use strict";

/* Borradores: el trabajo previo al envío.
 *
 * Un borrador es la copia de trabajo privada de una persona (campo "borrador" del contenido):
 *   - Borrador nuevo: el contenido está en estado "borrador" y todavía no tiene versiones.
 *   - Borrador de nueva versión: el contenido sigue "devuelto" o "publicado" (la versión vigente no cambia)
 *     y el autor prepara la siguiente.
 *
 * Mientras es borrador se puede guardar incompleto, agregar y quitar archivos, y nadie más lo ve.
 * Al enviarlo se valida en serio, nace la versión nueva y el contenido entra a la revisión de dirección
 * (Colaborador → Director de área → Autoridad superior).
 */

const config = require("../config");
const { coleccion, aId, esDuplicado, ObjectId } = require("../db");
const { crear } = require("../errores");
const { exigir, esAutorDelBorrador, puedeIniciarBorradorDeVersion } = require("../permisos");
const { formatearContenido } = require("../repositorio");
const { existeTipo, normalizarSitios } = require("../sitios");
const { borrarDelDisco } = require("./adjuntos");
const { leerCuerpo } = require("../texto-enriquecido");
const {
  modificar, validarDatos, LIMITES, esImagen, exigirImagenesSiEsGaleria, evento, nuevaVersion, nuevosAdjuntos, notaEnvio,
  propietario, marcarObservacionesAtendidas,
} = require("./contenidos");
const prioridad = require("../prioridad");

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* ---------- Validación liviana (el borrador puede estar incompleto) ---------- */

function validarBorrador(entrada, { conSlug }) {
  const datos = entrada && typeof entrada === "object" ? entrada : {};
  const t = (x) => (typeof x === "string" ? x.trim() : "");
  // casillas de sitios: "sitiosDestino" (arreglo); "sitio" se acepta por compatibilidad. Puede quedar vacío.
  const elegidos = normalizarSitios("sitiosDestino" in datos ? datos.sitiosDestino : datos.sitio);
  if (elegidos.error) throw crear("datos_invalidos", elegidos.error);
  const limpio = {
    titulo: t(datos.titulo),
    resumen: t(datos.resumen),
    ...leerCuerpo(datos, { obligatorio: false }),
    seccion: t(datos.seccion),
    sitiosDestino: elegidos.sitios,
    tipo: t(datos.tipo) || null,
  };
  for (const campo of ["titulo", "resumen", "cuerpo", "seccion"]) {
    if (limpio[campo].length > LIMITES[campo]) {
      throw crear("datos_invalidos", `El campo ${campo} supera los ${LIMITES[campo]} caracteres.`);
    }
  }
  // lo que se completa tiene que ser válido aunque falte el resto
  if (limpio.tipo && !existeTipo(limpio.tipo)) throw crear("datos_invalidos", "El tipo de contenido elegido no existe.");
  if (conSlug) {
    const slug = t(datos.slug).toLowerCase();
    if (slug && (slug.length > LIMITES.slug || !SLUG.test(slug))) {
      throw crear("datos_invalidos", "El identificador web solo admite minúsculas, números y guiones.");
    }
    limpio.slug = slug || null;
  }
  // la prioridad cambia solo si vino en el pedido; un borrador puede guardar una fecha ya vencida (se avisa al enviar)
  if ("prioridad" in datos) limpio.prioridad = prioridad.validarPrioridad(datos.prioridad, { estricta: false });
  return limpio;
}

const slugDuplicado = () => crear("slug_duplicado", "Ya existe un contenido con ese identificador web.");

/** Ejecuta una modificación traduciendo el choque del índice único de slug a un error claro. */
async function conSlugUnico(promesa) {
  try {
    return await promesa;
  } catch (error) {
    if (esDuplicado(error)) throw slugDuplicado();
    throw error;
  }
}

/** Verifica dentro de la escritura (con el documento recién leído) que el borrador exista y sea de quien actúa. */
function exigirAutor(actor, c) {
  if (!c.borrador) throw crear("no_encontrado", "Este contenido no tiene un borrador en preparación.");
  if (!esAutorDelBorrador(actor, c.borrador)) {
    throw crear("prohibido", "Solo quien creó el borrador puede verlo, modificarlo o enviarlo.");
  }
}

/** Un borrador nuevo descartado no existe para nadie. */
function exigirVigente(c) {
  if (c.estado === "descartado") throw crear("no_encontrado", "El borrador no existe.");
}

const proximaVersion = (c) => c.versiones.length + 1;

/* ---------- Crear ---------- */

/** Crea un contenido nuevo en estado borrador (con archivos opcionales). */
async function crearBorrador(actor, entrada, archivos = []) {
  exigir(actor, "crear");
  const d = validarBorrador(entrada, { conSlug: true });
  if (archivos.length > config.maxAdjuntos) {
    throw crear("datos_invalidos", `Se permiten hasta ${config.maxAdjuntos} adjuntos por versión.`);
  }

  const ahora = new Date();
  const adjuntos = nuevosAdjuntos(archivos, actor, ahora);
  const documento = {
    _id: new ObjectId(),
    sitiosDestino: d.sitiosDestino,
    destinoPublicado: null,
    tipo: d.tipo,
    seccion: d.seccion || null,
    slug: d.slug,
    autorId: aId(actor.id),
    estado: "borrador",
    borrador: {
      autorId: aId(actor.id),
      titulo: d.titulo, resumen: d.resumen, cuerpo: d.cuerpo, cuerpoHtml: d.cuerpoHtml,
      sitiosDestino: d.sitiosDestino, tipo: d.tipo, seccion: d.seccion,
      prioridad: d.prioridad || { ...prioridad.NORMAL },
      adjuntos: adjuntos.map((a) => a._id),
      iniciadoEn: ahora,
      actualizadoEn: ahora,
    },
    versionPublicada: null,
    observaciones: [],
    publicadoEn: null,
    rev: 0,
    versiones: [],
    adjuntos,
    historial: [
      evento("borrador_creado", actor, 1, "", ahora),
      ...adjuntos.map((a) => evento("adjunto_agregado", actor, 1, a.nombreOriginal, ahora)),
    ],
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  const contenidos = await coleccion("contenidos");
  await conSlugUnico(contenidos.insertOne(documento));
  return formatearContenido(documento, actor);
}

/**
 * Empieza el borrador de una nueva versión de algo devuelto o publicado, copiando la última versión
 * (textos y adjuntos). Si la misma persona ya tiene uno, lo devuelve tal cual (no pisa su trabajo).
 */
async function iniciarBorradorDeVersion(actor, id) {
  exigir(actor, "crear");
  const _id = aId(id);
  const existente = _id ? await (await coleccion("contenidos")).findOne({ _id }) : null;
  if (existente && existente.borrador && esAutorDelBorrador(actor, existente.borrador)) {
    return formatearContenido(existente, actor); // ya lo tiene: se devuelve sin escribir nada
  }
  return modificar(id, (c, ahora) => {
    exigirVigente(c);
    if (c.borrador) {
      if (esAutorDelBorrador(actor, c.borrador)) return { $set: {} }; // lo creó en paralelo (otra pestaña)
      throw crear("estado_invalido", "Otra persona ya está editando este contenido (tiene un borrador de la nueva versión en curso).");
    }
    if (!puedeIniciarBorradorDeVersion(actor, propietario(c))) {
      throw crear("prohibido", c.estado === "devuelto"
        ? "Un contenido observado lo corrige solo su autor."
        : "Solo el autor, un director de área o el administrador pueden editar este contenido.");
    }
    if (!["devuelto", "publicado"].includes(c.estado)) {
      throw crear("estado_invalido", c.estado === "rechazado"
        ? "Este contenido fue rechazado por la autoridad superior: para insistir, cargalo como un contenido nuevo."
        : "Solo se puede preparar una nueva versión de un contenido devuelto o publicado.");
    }
    const ultima = c.versiones[c.versiones.length - 1];
    return {
      $set: {
        borrador: {
          autorId: aId(actor.id),
          titulo: ultima.titulo, resumen: ultima.resumen, cuerpo: ultima.cuerpo, cuerpoHtml: ultima.cuerpoHtml || null,
          sitiosDestino: [...(c.sitiosDestino || [])], tipo: c.tipo, seccion: c.seccion || "",
          // hereda la prioridad que tiene hoy el contenido, salvo una urgencia cuya fecha ya pasó
          prioridad: prioridad.esUrgente(c.prioridad) && !(c.prioridad.vence && c.prioridad.vence < ahora)
            ? { nivel: "urgente", motivo: c.prioridad.motivo || "", vence: c.prioridad.vence || null }
            : { ...prioridad.NORMAL },
          adjuntos: [...ultima.adjuntos],
          iniciadoEn: ahora,
          actualizadoEn: ahora,
        },
      },
      $push: { historial: evento("borrador_creado", actor, proximaVersion(c), "", ahora) },
    };
  }, actor);
}

/* ---------- Editar ---------- */

/** Guarda los campos del borrador. El identificador web solo se puede cambiar si el contenido nunca se envió. */
async function guardarBorrador(actor, id, entrada) {
  exigir(actor, "crear");
  return conSlugUnico(modificar(id, (c, ahora) => {
    exigirVigente(c);
    exigirAutor(actor, c);
    const sinEnviar = c.versiones.length === 0;
    const d = validarBorrador(entrada, { conSlug: sinEnviar });
    const $set = {
      "borrador.titulo": d.titulo,
      "borrador.resumen": d.resumen,
      "borrador.cuerpo": d.cuerpo,
      "borrador.cuerpoHtml": d.cuerpoHtml,
      "borrador.sitiosDestino": d.sitiosDestino,
      "borrador.tipo": d.tipo,
      "borrador.seccion": d.seccion,
      "borrador.actualizadoEn": ahora,
    };
    if (d.prioridad) $set["borrador.prioridad"] = d.prioridad;
    if (sinEnviar) {
      // mientras nunca se envió, los datos de la ficha viven también arriba (así el slug queda reservado)
      Object.assign($set, { slug: d.slug, sitiosDestino: d.sitiosDestino, tipo: d.tipo, seccion: d.seccion || null });
    }
    return { $set };
  }, actor));
}

/** Suma archivos (ya validados por firma) al borrador. */
async function agregarAdjuntos(actor, id, archivos) {
  exigir(actor, "crear");
  if (!archivos.length) throw crear("datos_invalidos", "No llegó ningún archivo.");
  return modificar(id, (c, ahora) => {
    exigirVigente(c);
    exigirAutor(actor, c);
    if (c.borrador.adjuntos.length + archivos.length > config.maxAdjuntos) {
      throw crear("datos_invalidos", `Se permiten hasta ${config.maxAdjuntos} adjuntos por versión.`);
    }
    const nuevos = nuevosAdjuntos(archivos, actor, ahora);
    const version = proximaVersion(c);
    return {
      $set: {
        "borrador.adjuntos": [...c.borrador.adjuntos, ...nuevos.map((a) => a._id)],
        "borrador.actualizadoEn": ahora,
      },
      $push: {
        adjuntos: { $each: nuevos },
        historial: { $each: nuevos.map((a) => evento("adjunto_agregado", actor, version, a.nombreOriginal, ahora)) },
      },
    };
  }, actor);
}

/**
 * Quita un archivo del borrador. Si ninguna versión enviada lo usa, se elimina de verdad (del documento
 * y del disco). Si lo usa una versión anterior, solo deja de formar parte de la nueva: el historial no se toca.
 */
async function quitarAdjunto(actor, id, adjuntoId) {
  exigir(actor, "crear");
  const _id = aId(adjuntoId);
  if (!_id) throw crear("no_encontrado", "El archivo no existe.");
  let eliminado = null;

  const resultado = await modificar(id, (c, ahora) => {
    eliminado = null;
    exigirVigente(c);
    exigirAutor(actor, c);
    if (!c.borrador.adjuntos.some((x) => x.equals(_id))) {
      throw crear("no_encontrado", "Ese archivo no está en el borrador.");
    }
    const adjunto = c.adjuntos.find((a) => a._id.equals(_id));
    const usadoEnVersiones = c.versiones.some((v) => v.adjuntos.some((x) => x.equals(_id)));
    const $set = {
      "borrador.adjuntos": c.borrador.adjuntos.filter((x) => !x.equals(_id)),
      "borrador.actualizadoEn": ahora,
    };
    if (!usadoEnVersiones) {
      $set.adjuntos = c.adjuntos.filter((a) => !a._id.equals(_id));
      eliminado = adjunto;
    }
    return {
      $set,
      $push: { historial: evento("adjunto_quitado", actor, proximaVersion(c), adjunto ? adjunto.nombreOriginal : "", ahora) },
    };
  }, actor);

  if (eliminado) await borrarDelDisco([eliminado]); // recién cuando la base ya no lo referencia
  return resultado;
}

/* ---------- Enviar o descartar ---------- */

/**
 * Envía el borrador a la revisión de dirección: valida todo (como si se cargara de una vez), crea la versión
 * nueva y deja el contenido "en_revision". La versión publicada, si la hay, sigue visible (en sus sitios aprobados)
 * hasta que la nueva recorra la cadena y la autoridad superior la apruebe.
 */
async function enviarBorrador(actor, id) {
  exigir(actor, "crear");
  return conSlugUnico(modificar(id, (c, ahora) => {
    exigirVigente(c);
    exigirAutor(actor, c);
    const sinEnviar = c.versiones.length === 0;
    if (!sinEnviar && !["devuelto", "publicado"].includes(c.estado)) {
      throw crear("estado_invalido", "El contenido cambió de estado mientras preparabas el borrador: ya no admite una nueva versión.");
    }
    const b = c.borrador;
    const d = validarDatos({ ...b, slug: c.slug }, { conSlug: sinEnviar });
    const imagenes = c.adjuntos.filter((a) => esImagen(a.tipoMime) && b.adjuntos.some((x) => x.equals(a._id))).length;
    exigirImagenesSiEsGaleria(d.tipo, imagenes);

    // al enviar se revisa la prioridad en serio (por ejemplo, que la fecha hasta la que se destaca no haya pasado)
    const pri = prioridad.validarPrioridad(b.prioridad ? { ...b.prioridad } : null, { ahora });

    const numero = proximaVersion(c);
    const $set = {
      // el destino elegido pasa al contenido; lo publicado sigue en su destino aprobado hasta la nueva aprobación
      sitiosDestino: d.sitiosDestino, tipo: d.tipo, seccion: d.seccion, estado: "en_revision", borrador: null,
      prioridad: prioridad.registro(pri, aId(actor.id), ahora),
      [`versiones.${c.versiones.length}`]: nuevaVersion(numero, actor, d, [...b.adjuntos], ahora),
    };
    const previa = c.versiones[c.versiones.length - 1];
    if (previa && previa.estado === "devuelta") $set[`versiones.${c.versiones.length - 1}.estado`] = "conservada";
    marcarObservacionesAtendidas(c, numero, ahora, $set);
    return { $set, $push: { historial: evento("envio", actor, numero, notaEnvio(pri), ahora) } };
  }, actor));
}

/**
 * Descarta el borrador. Los archivos que solo existían en él se eliminan. Si el contenido nunca se envió,
 * queda "descartado" (fuera de todos los listados, con su historial) y libera el identificador web.
 */
async function descartarBorrador(actor, id) {
  exigir(actor, "crear");
  let huerfanos = [];
  const resultado = await modificar(id, (c, ahora) => {
    exigirVigente(c);
    exigirAutor(actor, c);
    const usados = new Set(c.versiones.flatMap((v) => v.adjuntos.map(String)));
    huerfanos = c.adjuntos.filter((a) => !usados.has(String(a._id)));
    const $set = { borrador: null, adjuntos: c.adjuntos.filter((a) => usados.has(String(a._id))) };
    if (c.versiones.length === 0) Object.assign($set, { estado: "descartado", slug: null });
    return { $set, $push: { historial: evento("borrador_descartado", actor, proximaVersion(c), "", ahora) } };
  }, actor);
  await borrarDelDisco(huerfanos);
  return resultado;
}

module.exports = {
  crearBorrador, iniciarBorradorDeVersion, guardarBorrador, agregarAdjuntos, quitarAdjunto, enviarBorrador,
  descartarBorrador,
};
