"use strict";

const config = require("../config");
const { coleccion, aId, esDuplicado, ObjectId } = require("../db");
const { crear } = require("../errores");
const {
  exigir, puede, puedeRevisar, puedeDecidir, puedeReenviar, puedeDarDeBaja, puedeDarDeBajaAlguno,
} = require("../permisos");
const { formatearContenido, listarContenidos, ORDEN_BANDEJA, filtroPrioridad, esVisible } = require("../repositorio");
const prioridad = require("../prioridad");
const { existeTipo, normalizarSitios } = require("../sitios");
const { leerCuerpo } = require("../texto-enriquecido");

/* ---------- Validación ---------- */

const LIMITES = { seccion: 60, slug: 80, titulo: 120, resumen: 280, cuerpo: 50000, comentario: 2000 };

function validarDatos(entrada, { conSlug }) {
  const datos = entrada && typeof entrada === "object" ? entrada : {};
  const t = (x) => (typeof x === "string" ? x.trim() : "");
  // "sitiosDestino" (casillas); "sitio" se acepta por compatibilidad con clientes que mandan uno solo
  const elegidos = normalizarSitios("sitiosDestino" in datos ? datos.sitiosDestino : datos.sitio);
  if (elegidos.error) throw crear("datos_invalidos", elegidos.error);
  const limpio = {
    sitiosDestino: elegidos.sitios,
    tipo: t(datos.tipo),
    seccion: t(datos.seccion),
    slug: t(datos.slug).toLowerCase(),
    titulo: t(datos.titulo),
    resumen: t(datos.resumen),
    // contenido completo: HTML del editor (limpio con lista blanca) + su texto sin formato
    ...leerCuerpo(datos, { obligatorio: false }),
  };

  if (!limpio.sitiosDestino.length) throw crear("datos_invalidos", "Elegí al menos un sitio donde se va a publicar.");
  if (!existeTipo(limpio.tipo)) throw crear("datos_invalidos", "Elegí el tipo de contenido (noticia, proyecto o galería).");
  if (!limpio.seccion || !limpio.titulo || !limpio.resumen || !limpio.cuerpo) {
    throw crear("datos_invalidos", "Completá sección, título, resumen y contenido.");
  }
  for (const campo of ["seccion", "titulo", "resumen", "cuerpo"]) {
    if (limpio[campo].length > LIMITES[campo]) {
      throw crear("datos_invalidos", `El campo ${campo} supera los ${LIMITES[campo]} caracteres.`);
    }
  }
  if (conSlug) {
    if (limpio.slug.length > LIMITES.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(limpio.slug)) {
      throw crear("datos_invalidos", "El identificador web solo admite minúsculas, números y guiones.");
    }
  }
  return limpio;
}

const esImagen = (mime) => typeof mime === "string" && mime.startsWith("image/");

/** Una galería de fotos sin fotos no tiene sentido: exige al menos una imagen entre los adjuntos de la versión. */
function exigirImagenesSiEsGaleria(tipo, cantidadImagenes) {
  if (tipo === "galeria" && cantidadImagenes === 0) {
    throw crear("datos_invalidos", "Una galería de fotos necesita al menos una imagen (JPG, PNG, WEBP o AVIF).");
  }
}

const comentarioLimpio = (x) => (typeof x === "string" ? x.trim().slice(0, LIMITES.comentario) : "");

/* ---------- Helpers ----------
 * Todo el contenido (versiones, adjuntos e historial) vive en un solo documento, así que cada
 * operación es UNA escritura atómica. Para que dos personas no decidan a la vez sobre lo mismo,
 * cada documento lleva un contador "rev": la escritura solo se aplica si "rev" no cambió desde
 * que se leyó. Si cambió, se relee y se vuelven a evaluar las reglas (y ahí la segunda persona
 * recibe "Este contenido ya no está pendiente de revisión", igual que antes con "for update").
 */

const INTENTOS = 5;

/** "lector": a quién se le devuelve el resultado (decide si incluye su borrador). */
async function modificar(id, operacion, lector = null) {
  const _id = aId(id);
  if (!_id) throw crear("no_encontrado", "El contenido no existe.");
  const contenidos = await coleccion("contenidos");

  for (let intento = 0; intento < INTENTOS; intento += 1) {
    const actual = await contenidos.findOne({ _id });
    if (!actual) throw crear("no_encontrado", "El contenido no existe.");

    const ahora = new Date();
    const cambios = operacion(actual, ahora); // lanza ErrorApp si alguna regla no se cumple
    if (cambios === null) return formatearContenido(actual, lector); // la operación decidió que no hay nada que cambiar
    // una operación puede conservar "actualizadoEn" (ej. cambiar la prioridad no reinicia el tiempo de espera)
    cambios.$set = { actualizadoEn: ahora, ...(cambios.$set || {}) };
    cambios.$inc = { rev: 1 };

    const resultado = await contenidos.findOneAndUpdate({ _id, rev: actual.rev }, cambios, { returnDocument: "after" });
    if (resultado) return formatearContenido(resultado, lector);
  }
  throw crear("estado_invalido", "El contenido se modificó mientras guardabas. Recargá y probá de nuevo.");
}

const ultima = (c) => ({ version: c.versiones[c.versiones.length - 1], indice: c.versiones.length - 1 });
/** Lo que necesitan las reglas de permisos: estado, autor del contenido y autor de la última versión. */
const propietario = (c) => ({
  estado: c.estado,
  autorId: String(c.autorId),
  versiones: c.versiones.length ? [{ autorId: String(c.versiones[c.versiones.length - 1].autorId) }] : [],
});

/* ---------- Observaciones de los revisores ----------
 * Cada devolución (director de área o autoridad superior) deja una observación en contenido.observaciones con
 * quién, con qué rol, cuándo, sobre qué versión y el mensaje. Queda pendiente hasta que el autor envía la versión
 * corregida: ahí se marca atendida (atendidaEn, atendidaEnVersion). */
const nuevaObservacion = (actor, version, nivel, mensaje, fecha) => ({
  _id: new ObjectId(),
  version,
  nivel, // "direccion" | "autoridad"
  usuarioId: aId(actor.id),
  rol: actor.rol,
  mensaje,
  fecha,
  atendidaEn: null,
  atendidaEnVersion: null,
});

/** Marca como atendidas las observaciones pendientes (al enviar la versión corregida). Escribe en $set. */
function marcarObservacionesAtendidas(c, numero, ahora, $set) {
  (c.observaciones || []).forEach((o, i) => {
    if (o.atendidaEn) return;
    $set[`observaciones.${i}.atendidaEn`] = ahora;
    $set[`observaciones.${i}.atendidaEnVersion`] = numero;
  });
}

const evento = (tipo, actor, version, comentario, fecha) => ({
  _id: new ObjectId(),
  tipo,
  usuarioId: aId(actor.id),
  version,
  comentario: comentario || "",
  fecha,
});

const nuevaVersion = (numero, actor, d, adjuntos, fecha) => ({
  numero,
  autorId: aId(actor.id),
  titulo: d.titulo,
  resumen: d.resumen,
  cuerpo: d.cuerpo,
  cuerpoHtml: d.cuerpoHtml || null,
  adjuntos,
  estado: "en_revision",
  revision: null, // nivel intermedio (director de área)
  decision: null, // nivel final (autoridad superior)
  creadaEn: fecha,
});

const nuevosAdjuntos = (archivos, actor, fecha) =>
  archivos.map((a) => ({
    _id: new ObjectId(),
    nombreOriginal: a.nombreOriginal,
    nombreAlmacenado: a.nombreAlmacenado,
    tipoMime: a.mime,
    tamano: a.tamano,
    subidoPor: aId(actor.id),
    creadoEn: fecha,
  }));

/** Los adjuntos que se conservan tienen que existir y pertenecer a este contenido. */
function validarConservados(contenido, ids) {
  const lista = Array.isArray(ids) ? ids : [];
  const convertidos = lista.map(aId);
  if (convertidos.some((x) => !x)) throw crear("datos_invalidos", "La lista de adjuntos a conservar no es válida.");

  const unicos = [...new Map(convertidos.map((x) => [String(x), x])).values()];
  const propios = new Set(contenido.adjuntos.map((a) => String(a._id)));
  if (unicos.some((x) => !propios.has(String(x)))) {
    throw crear("datos_invalidos", "Alguno de los adjuntos que querés conservar no existe.");
  }
  return unicos;
}

/** Cambia el estado de todas las versiones que estén en "desde" (por posición en el arreglo). */
function cambiarEstados(contenido, desde, hacia, $set) {
  contenido.versiones.forEach((v, i) => {
    if (v.estado === desde) $set[`versiones.${i}.estado`] = hacia;
  });
}

/* ---------- Operaciones ---------- */

/** Valida las opciones de listado que llegan por la URL (?prioridad=urgente&orden=prioridad). */
function opcionesListado(consulta = {}) {
  const nivel = consulta.prioridad == null || consulta.prioridad === "" ? null : String(consulta.prioridad);
  if (nivel !== null && !prioridad.NIVELES.includes(nivel)) throw crear("datos_invalidos", "La prioridad indicada no existe (normal o urgente).");
  const orden = consulta.orden == null || consulta.orden === "" ? null : String(consulta.orden);
  if (orden !== null && orden !== "prioridad") throw crear("datos_invalidos", "El orden indicado no existe.");
  return { prioridad: nivel, orden };
}

async function listar(actor, consulta = {}) {
  return listarContenidos(actor, opcionesListado(consulta));
}

/** Comentario del evento "envio" cuando sale marcado como urgente (queda en el historial). */
const notaEnvio = (p) => (prioridad.esUrgente(p) ? `Enviado como urgente${p.motivo ? `: ${p.motivo}` : ""}`.slice(0, LIMITES.comentario) : "");

/**
 * Bandeja de quien revisa: solo lo que espera una acción suya, con lo urgente primero y, dentro de cada nivel,
 * lo que lleva más tiempo esperando.
 *   - director de área / administrador: lo que está en revisión de dirección (sin lo propio, salvo el administrador)
 *   - autoridad superior: lo elevado (decisión final) y lo aprobado sin publicar (restaurado del archivo)
 */
async function bandeja(actor, consulta = {}) {
  const { prioridad: nivel } = opcionesListado(consulta);
  const estados = [];
  if (puede(actor, "revisar")) estados.push("en_revision");
  if (puede(actor, "decidir")) estados.push("elevado");
  if (puede(actor, "publicar")) estados.push("aprobado");
  if (!estados.length) throw crear("prohibido", "Tu rol no revisa contenidos: no tenés bandeja de pendientes.");

  const contenidos = await coleccion("contenidos");
  const documentos = await contenidos.find({ estado: { $in: estados }, ...filtroPrioridad(nivel) }).sort(ORDEN_BANDEJA).toArray();
  const propios = (c) => c.estado === "en_revision" && !puedeRevisar(actor, propietario(c));
  const pendientes = documentos.filter((c) => esVisible(c, actor) && !propios(c)).map((c) => formatearContenido(c, actor));
  return {
    contenidos: pendientes,
    total: pendientes.length,
    urgentes: pendientes.filter((c) => c.prioridad.nivel === "urgente").length,
  };
}

async function crearContenido(actor, entrada, archivos = []) {
  exigir(actor, "crear");
  const d = validarDatos(entrada, { conSlug: true });
  const ahoraValidacion = new Date();
  const pri = prioridad.validarPrioridad(entrada && entrada.prioridad, { ahora: ahoraValidacion });
  if (archivos.length > config.maxAdjuntos) {
    throw crear("datos_invalidos", `Se permiten hasta ${config.maxAdjuntos} adjuntos por versión.`);
  }
  exigirImagenesSiEsGaleria(d.tipo, archivos.filter((a) => esImagen(a.mime)).length);

  const ahora = new Date();
  const adjuntos = nuevosAdjuntos(archivos, actor, ahora);
  const documento = {
    _id: new ObjectId(),
    sitiosDestino: d.sitiosDestino,
    destinoPublicado: null,
    tipo: d.tipo,
    seccion: d.seccion,
    slug: d.slug,
    autorId: aId(actor.id),
    estado: "en_revision",
    borrador: null,
    versionPublicada: null,
    observaciones: [],
    publicadoEn: null,
    prioridad: prioridad.registro(pri, aId(actor.id), ahora),
    prioridadPublicada: null,
    rev: 0,
    versiones: [nuevaVersion(1, actor, d, adjuntos.map((a) => a._id), ahora)],
    adjuntos,
    historial: [evento("envio", actor, 1, notaEnvio(pri), ahora)],
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  const contenidos = await coleccion("contenidos");
  try {
    await contenidos.insertOne(documento);
  } catch (error) {
    if (esDuplicado(error)) throw crear("slug_duplicado", "Ya existe un contenido con ese identificador web.");
    throw error;
  }
  return formatearContenido(documento);
}

async function enviarNuevaVersion(actor, id, entrada, archivos = [], conservar = []) {
  exigir(actor, "crear");
  const d = validarDatos(entrada, { conSlug: false });

  return modificar(id, (c, ahora) => {
    if (!puedeReenviar(actor, propietario(c))) {
      throw crear("prohibido", c.estado === "devuelto"
        ? "Un contenido observado lo corrige solo su autor."
        : "Solo el autor, un director de área o el administrador pueden editar este contenido.");
    }
    if (c.borrador) {
      throw crear("estado_invalido", "Hay un borrador de la nueva versión en preparación: enviala desde el borrador.");
    }
    if (!["devuelto", "publicado"].includes(c.estado)) {
      throw crear("estado_invalido", c.estado === "rechazado"
        ? "Este contenido fue rechazado por la autoridad superior: para insistir, cargalo como un contenido nuevo."
        : "Solo se puede enviar una nueva versión de un contenido devuelto o publicado.");
    }
    const conservados = validarConservados(c, conservar);
    if (conservados.length + archivos.length > config.maxAdjuntos) {
      throw crear("datos_invalidos", `Se permiten hasta ${config.maxAdjuntos} adjuntos por versión.`);
    }
    const imagenesConservadas = c.adjuntos.filter(
      (a) => esImagen(a.tipoMime) && conservados.some((x) => x.equals(a._id))
    ).length;
    exigirImagenesSiEsGaleria(d.tipo, imagenesConservadas + archivos.filter((a) => esImagen(a.mime)).length);

    const { version: previa, indice } = ultima(c);
    const numero = previa.numero + 1;
    const nuevos = nuevosAdjuntos(archivos, actor, ahora);

    // sin "prioridad" en el pedido se conserva la que tenía; con ella, se reemplaza
    const pri = entrada && "prioridad" in entrada
      ? prioridad.validarPrioridad(entrada.prioridad, { ahora })
      : prioridad.validarPrioridad(c.prioridad ? { ...c.prioridad } : null, { ahora, estricta: false });

    // los sitios y el tipo se pueden cambiar en una versión nueva; lo publicado sigue en su destino aprobado
    // (destinoPublicado) hasta que la autoridad superior apruebe esta versión
    const $set = {
      sitiosDestino: d.sitiosDestino, tipo: d.tipo, seccion: d.seccion, estado: "en_revision",
      prioridad: prioridad.registro(pri, aId(actor.id), ahora),
    };
    if (previa.estado === "devuelta") $set[`versiones.${indice}.estado`] = "conservada";
    marcarObservacionesAtendidas(c, numero, ahora, $set);
    // se agrega en la posición siguiente con $set (un $push sobre "versiones" chocaría con el $set de arriba)
    $set[`versiones.${c.versiones.length}`] = nuevaVersion(numero, actor, d, [...conservados, ...nuevos.map((a) => a._id)], ahora);

    return {
      $set,
      $push: {
        adjuntos: { $each: nuevos },
        historial: evento("envio", actor, numero, notaEnvio(pri), ahora),
      },
    };
  });
}

const registro = (tipo, actor, fecha, comentario) => ({ tipo, usuarioId: aId(actor.id), fecha, comentario });

/**
 * Nivel 2 — revisión del director de área.
 * "elevar" la deja pendiente de la autoridad superior; "devolver" la manda al autor con observaciones
 * (estado "devuelto" = observado / requiere cambios) y registra la observación.
 * No aprueba nada: aprobar y publicar son exclusivos de la autoridad superior.
 */
async function revisar(actor, id, { decision, comentario } = {}) {
  exigir(actor, "revisar", "Solo un director de área o el administrador pueden hacer la revisión de dirección.");
  const texto = comentarioLimpio(comentario);
  if (!["elevar", "devolver"].includes(decision)) {
    throw crear("datos_invalidos", "En la revisión de dirección solo se puede elevar o devolver.");
  }
  if (decision === "devolver" && !texto) {
    throw crear("datos_invalidos", "Para devolver un contenido hay que explicar qué debe ajustarse.");
  }
  const elevar = decision === "elevar";

  return modificar(id, (c, ahora) => {
    if (c.estado !== "en_revision") {
      throw crear("estado_invalido", "Este contenido ya no está pendiente de la revisión de dirección.");
    }
    if (!puedeRevisar(actor, propietario(c))) {
      throw crear("prohibido", "No podés revisar un contenido que cargaste o editaste vos.");
    }
    const { version, indice } = ultima(c);
    const tipo = elevar ? "elevacion" : "devolucion";
    const $push = { historial: evento(tipo, actor, version.numero, texto, ahora) };
    if (!elevar) $push.observaciones = nuevaObservacion(actor, version.numero, "direccion", texto, ahora);
    return {
      $set: {
        estado: elevar ? "elevado" : "devuelto",
        [`versiones.${indice}.estado`]: elevar ? "elevada" : "devuelta",
        [`versiones.${indice}.revision`]: registro(tipo, actor, ahora, texto),
      },
      $push,
    };
  });
}

/**
 * Lo que hace visible una versión en los sitios: la única forma de escribir versionPublicada y destinoPublicado
 * (que es lo que lee vista_publicaciones). Solo la llaman decidir("aprobar") y publicar(), ambas exclusivas
 * de la autoridad superior. Exige destino completo: sin al menos un sitio no se puede publicar.
 */
function camposPublicacion(c, version, indice, ahora) {
  if (!c.sitiosDestino || !c.sitiosDestino.length || !c.tipo || !c.seccion) {
    throw crear("estado_invalido",
      "Este contenido no tiene sitio de destino: devolvelo al autor para que elija dónde se publica.");
  }
  const $set = {
    estado: "publicado",
    versionPublicada: version.numero,
    publicadoEn: ahora,
    destinoPublicado: { sitios: [...c.sitiosDestino], tipo: c.tipo, seccion: c.seccion },
    // la web muestra la prioridad que se aprobó con esta versión (aunque después se prepare otra)
    prioridadPublicada: c.prioridad || null,
  };
  cambiarEstados(c, "publicada", "reemplazada", $set);
  $set[`versiones.${indice}.estado`] = "publicada";
  return $set;
}

/**
 * Nivel 3 — decisión final de la autoridad superior sobre lo elevado.
 *   "aprobar": aprueba Y publica en el mismo paso, en los sitios elegidos (publicación automática tras la
 *              autorización). Si es una corrección de algo ya publicado, reemplaza a la versión visible.
 *   "devolver": vuelve al autor.  "rechazar": cierra el contenido (lo ya publicado, si había, sigue visible).
 */
async function decidir(actor, id, { decision, comentario } = {}) {
  exigir(actor, "decidir", "Solo la autoridad superior o el administrador pueden tomar la decisión final.");
  const texto = comentarioLimpio(comentario);
  const DESTINO = {
    aprobar: { tipo: "aprobacion", contenido: "aprobado", version: "aprobada" },
    devolver: { tipo: "devolucion", contenido: "devuelto", version: "devuelta" },
    rechazar: { tipo: "rechazo", contenido: "rechazado", version: "rechazada" },
  };
  const destino = DESTINO[decision];
  if (!destino) throw crear("datos_invalidos", "La decisión indicada no es válida.");
  if (decision !== "aprobar" && !texto) {
    throw crear("datos_invalidos", decision === "rechazar"
      ? "Para rechazar un contenido hay que dejar asentado el motivo."
      : "Para devolver un contenido hay que explicar qué debe ajustarse.");
  }

  return modificar(id, (c, ahora) => {
    if (c.estado !== "elevado") {
      throw crear("estado_invalido", c.estado === "en_revision"
        ? "Este contenido todavía no pasó por la revisión de un director de área."
        : "Este contenido ya no está pendiente de la decisión final.");
    }
    if (!puedeDecidir(actor, c)) {
      throw crear("prohibido", "Elevaste vos esta versión: la decisión final la toma otra persona (la autoridad superior u otro administrador).");
    }

    const { version, indice } = ultima(c);
    const decisionRegistrada = registro(destino.tipo, actor, ahora, texto);
    if (decision === "aprobar") {
      const $set = camposPublicacion(c, version, indice, ahora);
      $set[`versiones.${indice}.decision`] = decisionRegistrada;
      return {
        $set,
        $push: {
          historial: {
            $each: [
              evento("aprobacion", actor, version.numero, texto, ahora),
              evento("publicacion", actor, version.numero, "Publicación automática al aprobar", ahora),
            ],
          },
        },
      };
    }
    const $push = { historial: evento(destino.tipo, actor, version.numero, texto, ahora) };
    if (decision === "devolver") $push.observaciones = nuevaObservacion(actor, version.numero, "autoridad", texto, ahora);
    return {
      $set: {
        estado: destino.contenido,
        [`versiones.${indice}.estado`]: destino.version,
        [`versiones.${indice}.decision`]: decisionRegistrada,
      },
      $push,
    };
  });
}

/** Vuelve a publicar algo aprobado que no está visible (lo restaurado del archivo). Lo nuevo se publica al aprobarse. */
async function publicar(actor, id) {
  exigir(actor, "publicar", "Solo la autoridad superior o el administrador pueden publicar en la web.");
  return modificar(id, (c, ahora) => {
    if (c.estado !== "aprobado") {
      throw crear("estado_invalido", "Solo se puede publicar un contenido aprobado.");
    }
    const { version, indice } = ultima(c);
    const $set = camposPublicacion(c, version, indice, ahora);
    return { $set, $push: { historial: evento("publicacion", actor, version.numero, "", ahora) } };
  });
}

/* ---------- Dar de baja (borrado lógico) y reactivar ----------
 *
 * Dar de baja NO borra el documento: pasa a estado "archivado" y se le quita el destino publicado
 * (versionPublicada, publicadoEn y destinoPublicado en null). vista_publicaciones solo incluye contenidos con
 * versión y destino publicados, así que desde ese instante los sitios satélite dejan de mostrarlo y sus archivos
 * dejan de servirse en /api/publico/adjuntos. Versiones, adjuntos e historial se conservan (trazabilidad).
 * Pueden hacerlo el autor, un director de área, el administrador o la autoridad superior (permisos.puedeDarDeBaja).
 */
const MOTIVO_BAJA_MINIMO = 3; // "Fin", "Vencido"…: lo justo para que el historial diga por qué

async function archivar(actor, id, motivo) {
  if (!puedeDarDeBajaAlguno(actor)) throw crear("prohibido", "Tu rol no permite dar de baja contenidos.");
  const nota = comentarioLimpio(motivo);
  if (nota.length < MOTIVO_BAJA_MINIMO) {
    throw crear("datos_invalidos", "Contá brevemente el motivo de la baja: queda registrado en el historial.");
  }
  return modificar(id, (c, ahora) => {
    if (!puedeDarDeBaja(actor, propietario(c))) {
      throw crear("prohibido", "Solo el autor, un director de área, el administrador o la autoridad superior pueden dar de baja este contenido.");
    }
    if (c.estado === "archivado") throw crear("estado_invalido", "El contenido ya está dado de baja.");
    if (["borrador", "descartado"].includes(c.estado)) {
      throw crear("estado_invalido", "Un borrador todavía no entró al circuito: no hay nada que dar de baja (descartalo desde «Borradores»).");
    }
    const { version } = ultima(c);
    const $set = { estado: "archivado", versionPublicada: null, publicadoEn: null, destinoPublicado: null };
    cambiarEstados(c, "publicada", "archivada", $set);
    return { $set, $push: { historial: evento("archivo", actor, version.numero, nota, ahora) } };
  }, actor);
}

/**
 * Reactivar algo dado de baja. Nunca vuelve directo a la web: si estaba publicado queda "aprobado" y la autoridad
 * superior tiene que publicarlo de nuevo; si estaba en revisión, vuelve a ese punto de la cadena.
 */
async function restaurar(actor, id) {
  if (!puedeDarDeBajaAlguno(actor)) throw crear("prohibido", "Tu rol no permite reactivar contenidos.");
  return modificar(id, (c, ahora) => {
    if (!puedeDarDeBaja(actor, propietario(c))) {
      throw crear("prohibido", "Solo el autor, un director de área, el administrador o la autoridad superior pueden reactivar este contenido.");
    }
    if (c.estado !== "archivado") throw crear("estado_invalido", "El contenido no está dado de baja.");

    const { version, indice } = ultima(c);
    const mapa = {
      en_revision: "en_revision", elevada: "elevado", devuelta: "devuelto", aprobada: "aprobado", rechazada: "rechazado",
    };
    const $set = { estado: mapa[version.estado] };
    if (!$set.estado) {
      // la última versión estaba publicada: vuelve como aprobada y hay que publicarla de nuevo
      $set[`versiones.${indice}.estado`] = "aprobada";
      $set.estado = "aprobado";
    }
    return { $set, $push: { historial: evento("restauracion", actor, version.numero, "", ahora) } };
  }, actor);
}

/* ---------- Prioridad en el circuito ---------- */

const ESTADOS_EN_REVISION = ["en_revision", "elevado", "aprobado"];

/**
 * Cambia la prioridad de un contenido ya enviado. La fija quien lo escribe; acá la ajustan quienes lo revisan:
 *   - en revisión de dirección, elevado o aprobado: director de área, administrador o autoridad superior;
 *   - publicado: solo la autoridad superior (cambia lo que se destaca en la web).
 * Queda en el historial con el antes y el después. Si no cambia nada, no escribe.
 */
async function cambiarPrioridad(actor, id, entrada) {
  if (!puede(actor, "revisar") && !puede(actor, "decidir")) {
    throw crear("prohibido", "Solo quienes revisan (dirección o autoridad superior) pueden cambiar la prioridad.");
  }
  return modificar(id, (c, ahora) => {
    const publicado = c.estado === "publicado";
    if (!ESTADOS_EN_REVISION.includes(c.estado) && !publicado) {
      throw crear("estado_invalido", c.estado === "devuelto"
        ? "Está devuelto al autor: la prioridad la vuelve a elegir al enviar la nueva versión."
        : "En este estado la prioridad ya no se puede cambiar.");
    }
    if (publicado && !puede(actor, "publicar")) {
      throw crear("prohibido", "Sobre un contenido publicado, solo la autoridad superior puede cambiar lo que se destaca en la web.");
    }
    const nueva = prioridad.validarPrioridad(entrada, { ahora });
    if (prioridad.iguales(c.prioridad, nueva)) return null; // nada que cambiar
    const reg = prioridad.registro(nueva, aId(actor.id), ahora);
    // no toca "actualizadoEn": en la bandeja sigue contando el tiempo que lleva esperando
    const $set = { prioridad: reg, actualizadoEn: c.actualizadoEn };
    if (publicado) $set.prioridadPublicada = reg;
    const texto = `De ${prioridad.describir(c.prioridad)} a ${prioridad.describir(nueva)}`.slice(0, LIMITES.comentario);
    return { $set, $push: { historial: evento("prioridad", actor, c.versiones[c.versiones.length - 1].numero, texto, ahora) } };
  }, actor);
}

module.exports = {
  listar, bandeja, cambiarPrioridad, opcionesListado, notaEnvio, crearContenido, enviarNuevaVersion, revisar, decidir, publicar, archivar, restaurar,
  // compartidos con el servicio de borradores
  modificar, validarDatos, LIMITES, esImagen, exigirImagenesSiEsGaleria, evento, nuevaVersion, nuevosAdjuntos,
  propietario, marcarObservacionesAtendidas,
};
