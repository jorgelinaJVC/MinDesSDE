"use strict";

/* Esquema de la base MongoDB.
 *
 * MongoDB no tiene tablas con columnas fijas, así que las reglas que antes ponía MySQL
 * (tipos, enum, not null, largos máximos) se declaran con $jsonSchema: la base RECHAZA
 * cualquier documento que no cumpla, aunque alguien escriba saltándose la aplicación.
 *
 * Modelo: cada contenido es UN documento que lleva adentro sus versiones, sus adjuntos
 * y su historial. Así cada operación del circuito (enviar, aprobar, publicar, archivar…)
 * es una sola escritura atómica: no hacen falta transacciones ni replica set.
 */

const { ROLES } = require("../src/permisos");
const { ID_SITIOS, ID_TIPOS } = require("../src/sitios");

/* Ciclo de vida:
 *   borrador (privado del autor) → en_revision (dirección) → elevado (autoridad) → publicado
 * Al aprobar, la autoridad superior publica en los sitios elegidos en el mismo paso (publicación automática).
 * "aprobado" (aprobado pero todavía no visible) queda para lo que se restaura del archivo: se vuelve a publicar a mano.
 * Desde en_revision o elevado puede volver como "devuelto"; desde elevado, la autoridad puede "rechazar" (definitivo).
 * "descartado": un borrador que nunca se envió y su autor descartó. No se borra (la cuenta de la aplicación no
 * tiene permiso de borrado): queda fuera de todos los listados, con su historial. */
const ESTADOS_SIN_ENVIAR = ["borrador", "descartado"];
const ESTADOS_EN_CIRCUITO = ["en_revision", "elevado", "devuelto", "aprobado", "rechazado", "publicado", "archivado"];
const ESTADOS_CONTENIDO = [...ESTADOS_SIN_ENVIAR, ...ESTADOS_EN_CIRCUITO];
/* Estados en los que puede haber una versión aprobada visible: "publicado", o una corrección de algo publicado
 * que está en el circuito (en_revision, elevado, devuelto) o que se rechazó (lo anterior sigue visible).
 * Nunca: borrador, descartado, archivado ni aprobado sin publicar. La vista pública exige uno de estos. */
const ESTADOS_CON_PUBLICACION = ["publicado", "en_revision", "elevado", "devuelto", "rechazado"];
const ESTADOS_VERSION = [
  "en_revision", "elevada", "devuelta", "aprobada", "rechazada", "publicada", "reemplazada", "conservada", "archivada",
];
const TIPOS_EVENTO = [
  "borrador_creado", "adjunto_agregado", "adjunto_quitado", "borrador_descartado", // trabajo previo al envío
  "envio", "elevacion", "devolucion", "aprobacion", "rechazo", "publicacion", "archivo", "restauracion",
  "prioridad", // un revisor cambió la prioridad (normal ↔ urgente)
];
const TIPOS_REVISION = ["elevacion", "devolucion"]; // nivel intermedio: director de área
const TIPOS_DECISION = ["aprobacion", "devolucion", "rechazo"]; // nivel final: autoridad superior

const texto = (max, min = 1) => ({ bsonType: "string", minLength: min, maxLength: max });
const textoOpcional = (max) => ({ bsonType: ["string", "null"], maxLength: max });
const entero = { bsonType: "int", minimum: 0 };
const fecha = { bsonType: "date" };
const id = { bsonType: "objectId" };

/** Sitios de destino (las casillas del editor): ids del catálogo, sin repetir. */
const listaSitios = { bsonType: "array", uniqueItems: true, items: { enum: ID_SITIOS } };

/** Quién decidió qué sobre una versión (o null si todavía nadie). */
const registroDecision = (tipos) => ({
  oneOf: [
    { bsonType: "null" },
    {
      bsonType: "object",
      required: ["tipo", "usuarioId", "fecha", "comentario"],
      additionalProperties: false,
      properties: {
        tipo: { enum: tipos },
        usuarioId: id,
        fecha,
        comentario: texto(2000, 0), // observaciones detalladas de una devolución
      },
    },
  ],
});

/* ---------- Colecciones ---------- */

const usuarios = {
  bsonType: "object",
  required: ["nombre", "email", "passwordHash", "rol", "activo", "creadoEn"],
  additionalProperties: false,
  properties: {
    _id: id,
    nombre: texto(120),
    email: texto(160),
    passwordHash: { bsonType: "string", pattern: "^\\$2[aby]\\$" }, // solo hashes bcrypt
    rol: { enum: ROLES },
    activo: { bsonType: "bool" },
    ultimoAcceso: { bsonType: ["date", "null"] },
    creadoEn: fecha,
    // datos de contacto opcionales (directorio del administrador)
    telefono: { bsonType: ["string", "null"], maxLength: 40 },
    area: { bsonType: ["string", "null"], maxLength: 120 },
    // true cuando el administrador le dio una contraseña provisional: hasta cambiarla no puede usar el panel
    debeCambiarClave: { bsonType: "bool" },
  },
};

const sesiones = {
  bsonType: "object",
  required: ["usuarioId", "tokenHash", "expiraEn", "creadoEn"],
  additionalProperties: false,
  properties: {
    _id: id,
    usuarioId: id,
    tokenHash: { bsonType: "string", pattern: "^[0-9a-f]{64}$" }, // sha-256, nunca el token en claro
    expiraEn: fecha,
    creadoEn: fecha,
  },
};

const adjunto = {
  bsonType: "object",
  required: ["_id", "nombreOriginal", "nombreAlmacenado", "tipoMime", "tamano", "subidoPor", "creadoEn"],
  additionalProperties: false,
  properties: {
    _id: id,
    nombreOriginal: texto(255),
    nombreAlmacenado: texto(80),
    tipoMime: texto(100),
    tamano: entero,
    subidoPor: id,
    creadoEn: fecha,
  },
};

const version = {
  bsonType: "object",
  required: ["numero", "autorId", "titulo", "resumen", "cuerpo", "adjuntos", "estado", "decision", "creadaEn"],
  additionalProperties: false,
  properties: {
    numero: { bsonType: "int", minimum: 1 },
    autorId: id,
    titulo: texto(120),
    resumen: texto(280),
    cuerpo: texto(50000), // texto sin formato (búsquedas, auditoría, sitios sin formato)
    cuerpoHtml: textoOpcional(100000), // el mismo contenido con formato, ya limpio (lista blanca); null en versiones viejas
    adjuntos: { bsonType: "array", items: id }, // ids de contenidos.adjuntos
    estado: { enum: ESTADOS_VERSION },
    // No es obligatoria para que las versiones cargadas antes de la cadena de tres niveles sigan siendo válidas.
    revision: registroDecision(TIPOS_REVISION),
    decision: registroDecision(TIPOS_DECISION),
    creadaEn: fecha,
  },
};

const evento = {
  bsonType: "object",
  required: ["_id", "tipo", "usuarioId", "version", "comentario", "fecha"],
  additionalProperties: false,
  properties: {
    _id: id,
    tipo: { enum: TIPOS_EVENTO },
    usuarioId: id,
    version: { bsonType: "int", minimum: 1 },
    comentario: texto(2000, 0),
    fecha,
  },
};

/* Observación de un revisor al devolver una versión (director de área o autoridad superior).
 * Es el registro que ve el autor: qué corregir, quién lo pidió, con qué rol y cuándo. Queda "pendiente" hasta que el
 * autor envía la versión corregida; ahí se marca atendida (y en qué versión). No se borra nunca. */
const NIVELES_OBSERVACION = ["direccion", "autoridad"];
const observacion = {
  bsonType: "object",
  required: ["_id", "version", "nivel", "usuarioId", "rol", "mensaje", "fecha", "atendidaEn", "atendidaEnVersion"],
  additionalProperties: false,
  properties: {
    _id: id,
    version: { bsonType: "int", minimum: 1 }, // la versión observada
    nivel: { enum: NIVELES_OBSERVACION }, // revisión de dirección o decisión final
    usuarioId: id,
    rol: { enum: ROLES }, // rol de quien observó en ese momento (los roles pueden cambiar después)
    mensaje: texto(2000),
    fecha,
    atendidaEn: { bsonType: ["date", "null"] },
    atendidaEnVersion: { bsonType: ["int", "null"], minimum: 2 },
  },
};

/* Copia de trabajo privada de quien la creó. Puede estar incompleta: se valida en serio recién al enviarla.
 * Existe mientras el contenido es un borrador nuevo, o cuando el autor prepara una nueva versión de algo
 * devuelto o publicado (en ese caso el contenido sigue en su estado y la versión vigente no cambia). */
/* ---------- Prioridad (ver src/prioridad.js) ---------- */
const { NIVELES: NIVELES_PRIORIDAD, MAX_MOTIVO } = require("../src/prioridad");

/** Lo que elige quien escribe el borrador. */
const prioridadElegida = {
  bsonType: "object",
  required: ["nivel", "motivo", "vence"],
  additionalProperties: false,
  properties: {
    nivel: { enum: NIVELES_PRIORIDAD },
    motivo: texto(MAX_MOTIVO, 0), // por qué es urgente (lo ven los revisores)
    vence: { bsonType: ["date", "null"] }, // hasta cuándo se destaca en el sitio público (null: mientras esté publicado)
  },
};

/** Lo que queda en el contenido: además, quién la fijó y cuándo. */
const prioridadRegistrada = {
  bsonType: "object",
  required: ["nivel", "motivo", "vence", "marcadoPor", "marcadoEn"],
  additionalProperties: false,
  properties: {
    ...prioridadElegida.properties,
    marcadoPor: id,
    marcadoEn: fecha,
  },
};

const borrador = {
  bsonType: "object",
  required: ["autorId", "titulo", "resumen", "cuerpo", "sitiosDestino", "tipo", "seccion", "adjuntos", "iniciadoEn", "actualizadoEn"],
  additionalProperties: false,
  properties: {
    autorId: id, // la única persona que puede verlo, editarlo, enviarlo o descartarlo
    titulo: texto(120, 0),
    resumen: texto(280, 0),
    cuerpo: texto(50000, 0),
    cuerpoHtml: textoOpcional(100000),
    sitiosDestino: listaSitios, // puede estar vacío mientras se escribe; se exige al menos uno al enviar
    tipo: { enum: [...ID_TIPOS, null] },
    seccion: texto(60, 0),
    prioridad: prioridadElegida, // opcional: los borradores anteriores a la prioridad siguen siendo válidos
    adjuntos: { bsonType: "array", items: id }, // ids de contenidos.adjuntos
    iniciadoEn: fecha,
    actualizadoEn: fecha,
  },
};

const contenidos = {
  bsonType: "object",
  required: [
    "sitiosDestino", "tipo", "seccion", "slug", "autorId", "estado", "versionPublicada", "publicadoEn",
    "rev", "versiones", "adjuntos", "historial", "creadoEn", "actualizadoEn",
  ],
  additionalProperties: false,
  properties: {
    _id: id,
    // A qué sitios va dirigida la versión que está en el circuito (la elige quien la escribe).
    // Vacío solo en contenidos cargados antes de que existieran los sitios: no aparecen en ningún sitio.
    sitiosDestino: listaSitios,
    // Dónde se ve la versión publicada: se copia de sitiosDestino, tipo y seccion SOLO cuando la autoridad
    // superior aprueba. Así, si alguien envía una versión nueva eligiendo otros sitios, lo publicado no cambia
    // de sitio hasta que esa versión se apruebe. null mientras no haya nada publicado.
    destinoPublicado: {
      oneOf: [
        { bsonType: "null" },
        {
          bsonType: "object",
          required: ["sitios", "tipo", "seccion"],
          additionalProperties: false,
          properties: {
            sitios: { ...listaSitios, minItems: 1 },
            tipo: { enum: ID_TIPOS },
            seccion: texto(60),
          },
        },
      ],
    },
    tipo: { enum: [...ID_TIPOS, null] },
    // categoría o etiqueta que se muestra en el sitio (ej. "Locales", "Terapéutico"); null solo en borradores
    seccion: { bsonType: ["string", "null"], maxLength: 60 },
    // identificador web: único entre los que lo tienen (un borrador puede no tenerlo todavía)
    slug: { bsonType: ["string", "null"], maxLength: 80, pattern: "^[a-z0-9]+(-[a-z0-9]+)*$" },
    // opcional para que los documentos anteriores a los borradores sigan siendo válidos sin migrarlos
    borrador: { oneOf: [{ bsonType: "null" }, borrador] },
    autorId: id,
    estado: { enum: ESTADOS_CONTENIDO },
    versionPublicada: { bsonType: ["int", "null"] }, // número de la versión visible en la web
    // Prioridad vigente en el circuito (ordena las bandejas) y la que se aprobó con la versión visible en la web.
    // Opcionales: un contenido sin el campo es de prioridad normal (así no hace falta migrar los anteriores).
    prioridad: prioridadRegistrada,
    prioridadPublicada: { oneOf: [{ bsonType: "null" }, prioridadRegistrada] },
    publicadoEn: { bsonType: ["date", "null"] },
    rev: entero, // contador de cambios: evita que dos personas pisen la misma decisión
    versiones: { bsonType: "array", items: version },
    adjuntos: { bsonType: "array", items: adjunto },
    historial: { bsonType: "array", minItems: 1, items: evento },
    // opcional: los contenidos anteriores lo reciben con la migración (iniciar-bd), armado desde sus devoluciones
    observaciones: { bsonType: "array", items: observacion },
    creadoEn: fecha,
    actualizadoEn: fecha,
  },
  // Lo que cambia según si el contenido ya entró al circuito o no.
  anyOf: [
    {
      // Nunca enviado: sin versiones (la primera nace al enviar).
      properties: { estado: { enum: ESTADOS_SIN_ENVIAR }, versiones: { maxItems: 0 } },
    },
    {
      // En el circuito: al menos una versión, categoría e identificador web definidos.
      properties: {
        estado: { enum: ESTADOS_EN_CIRCUITO },
        versiones: { minItems: 1 },
        seccion: { bsonType: "string", minLength: 1 },
        slug: { bsonType: "string" },
      },
    },
  ],
};

/* ---------- Auditoría ----------
 * Un documento por movimiento. Colección aparte (no un arreglo dentro de usuarios): crece sin límite y se
 * consulta por fecha, persona o acción, así que va con sus propios índices y no engorda los documentos de personas.
 * Es de solo agregado: la cuenta de la aplicación puede insertar y leer, nunca modificar ni borrar
 * (ver usuario-app.mongosh.js). La identidad se guarda como estaba en ese momento: si después le cambian el rol
 * a alguien, el registro sigue mostrando con qué rol actuó. */
const { ACCIONES, MODULOS, RESULTADOS } = require("../src/auditoria/catalogo");

const auditoria = {
  bsonType: "object",
  required: ["fecha", "usuario", "accion", "modulo", "detalle", "resultado", "ubicacion", "peticion"],
  additionalProperties: false,
  properties: {
    _id: id,
    fecha, // marca de tiempo exacta (UTC, con milisegundos)
    usuario: {
      bsonType: "object",
      required: ["id", "nombre", "email", "rol"],
      additionalProperties: false,
      properties: {
        id: { bsonType: ["objectId", "null"] }, // null: un ingreso fallido con un correo que no existe
        nombre: { bsonType: ["string", "null"], maxLength: 120 },
        email: { bsonType: ["string", "null"], maxLength: 160 },
        rol: { enum: [...ROLES, null] },
      },
    },
    accion: { enum: Object.keys(ACCIONES) },
    modulo: { enum: MODULOS },
    detalle: texto(400), // lo que hizo, en palabras: «Envió a revisión «Becas 2026» (versión 2)»
    resultado: { enum: RESULTADOS }, // ok, rechazado (4xx: no tenía permiso, datos inválidos…) o error (5xx)
    motivo: { bsonType: ["string", "null"], maxLength: 300 }, // por qué se rechazó
    objeto: { // sobre qué actuó
      bsonType: ["object", "null"],
      additionalProperties: false,
      properties: {
        tipo: { enum: ["contenido", "usuario", "adjunto", "auditoria"] },
        id: { bsonType: ["objectId", "null"] },
        titulo: { bsonType: ["string", "null"], maxLength: 160 },
      },
    },
    ubicacion: {
      bsonType: "object",
      required: ["ip", "red"],
      additionalProperties: false,
      properties: {
        ip: texto(64, 0),
        red: { enum: ["Equipo local", "Red interna", "Internet"] },
        sede: { bsonType: ["string", "null"], maxLength: 80 }, // según AUDITORIA_SEDES (rangos de IP por sede)
        pais: { bsonType: ["string", "null"], maxLength: 2 }, // si un proxy de confianza lo informa
      },
    },
    peticion: {
      bsonType: "object",
      required: ["metodo", "ruta", "estado", "duracionMs"],
      additionalProperties: false,
      properties: {
        metodo: { enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
        ruta: texto(200),
        estado: entero,
        duracionMs: entero,
        navegador: { bsonType: ["string", "null"], maxLength: 80 }, // «Chrome en Windows», no el user-agent entero
      },
    },
  },
};

const COLECCIONES = {
  usuarios: {
    validador: usuarios,
    indices: [
      { key: { email: 1 }, name: "uq_usuarios_email", unique: true },
    ],
  },
  sesiones: {
    validador: sesiones,
    indices: [
      { key: { tokenHash: 1 }, name: "uq_sesiones_token", unique: true },
      { key: { usuarioId: 1 }, name: "ix_sesiones_usuario" },
      // TTL: MongoDB borra solo las sesiones vencidas (revisa cada ~60 s; la app igual controla la fecha)
      { key: { expiraEn: 1 }, name: "ttl_sesiones_expira", expireAfterSeconds: 0 },
    ],
  },
  auditoria: {
    validador: auditoria,
    indices: [
      // listado general (lo más reciente primero) y cada filtro habitual, todos ordenados por fecha
      { key: { fecha: -1 }, name: "ix_auditoria_fecha" },
      { key: { "usuario.id": 1, fecha: -1 }, name: "ix_auditoria_usuario_fecha" },
      { key: { accion: 1, fecha: -1 }, name: "ix_auditoria_accion_fecha" },
      { key: { modulo: 1, fecha: -1 }, name: "ix_auditoria_modulo_fecha" },
      { key: { resultado: 1, fecha: -1 }, name: "ix_auditoria_resultado_fecha" },
    ],
  },
  contenidos: {
    validador: contenidos,
    indices: [
      // único solo entre los que tienen identificador: varios borradores pueden no tenerlo todavía
      {
        key: { slug: 1 },
        name: "uq_contenidos_slug_v2",
        unique: true,
        partialFilterExpression: { slug: { $type: "string" } },
      },
      { key: { estado: 1 }, name: "ix_contenidos_estado" },
      // bandejas de revisión: por estado, lo urgente primero y, dentro de cada nivel, lo que más espera
      { key: { estado: 1, "prioridad.nivel": -1, actualizadoEn: 1 }, name: "ix_contenidos_bandeja" },
      { key: { seccion: 1 }, name: "ix_contenidos_seccion" },
      { key: { sitiosDestino: 1, tipo: 1 }, name: "ix_contenidos_destino_tipo" }, // multikey: uno por sitio elegido
      // consultas públicas por sitio (vista_publicaciones): lo publicado en un sitio, lo más reciente primero
      { key: { "destinoPublicado.sitios": 1, publicadoEn: -1 }, name: "ix_contenidos_publicado_sitio" },
      { key: { "adjuntos._id": 1 }, name: "ix_contenidos_adjunto" },
      {
        key: { "adjuntos.nombreAlmacenado": 1 },
        name: "uq_adjuntos_almacenado",
        unique: true,
        partialFilterExpression: { "adjuntos.nombreAlmacenado": { $exists: true } },
      },
    ],
  },
};

/* ---------- Vista pública ----------
 * Solo lo que tiene una versión aprobada y publicada por la autoridad superior (versionPublicada y destinoPublicado
 * los escribe únicamente esa decisión). La API pública lee solo esta vista (de solo lectura): nunca ve autores,
 * historial, versiones en revisión, borradores ni el destino de una versión que todavía no se aprobó.
 *
 * Por qué se filtra por "versionPublicada" y no por estado: un contenido publicado al que le envían una corrección
 * pasa a "en_revision", pero la versión ya aprobada tiene que seguir viéndose hasta que se apruebe la nueva.
 * Lo que nunca se aprobó (borrador, en_revision, elevado, devuelto o rechazado sin versión anterior) no tiene
 * versionPublicada y no entra. Las consultas de los sitios agregan siempre { sitios: "<id del sitio>" }.
 */
const VISTA_PUBLICACIONES = {
  nombre: "vista_publicaciones",
  sobre: "contenidos",
  pipeline: [
    {
      $match: {
        estado: { $in: ESTADOS_CON_PUBLICACION }, // estado autorizado (defensa extra: el dato que manda es el siguiente)
        versionPublicada: { $ne: null }, // la autoridad superior aprobó una versión
        "destinoPublicado.sitios.0": { $exists: true }, // con al menos un sitio aprobado
      },
    },
    {
      $project: {
        _id: 0,
        contenidoId: "$_id",
        // el destino aprobado (no el de una versión nueva que esté en revisión)
        sitios: "$destinoPublicado.sitios",
        tipo: "$destinoPublicado.tipo",
        slug: 1,
        seccion: "$destinoPublicado.seccion",
        fecha: "$publicadoEn",
        prioridad: "$prioridadPublicada", // la que se aprobó con la versión visible
        adjuntos: 1,
        version: {
          $arrayElemAt: [
            { $filter: { input: "$versiones", as: "v", cond: { $eq: ["$$v.numero", "$versionPublicada"] } } },
            0,
          ],
        },
      },
    },
    {
      $project: {
        contenidoId: 1,
        sitios: 1,
        tipo: 1,
        slug: 1,
        seccion: 1,
        fecha: 1,
        prioridad: { nivel: 1, vence: 1 }, // el motivo es interno (para los revisores): no sale a la web
        numero: "$version.numero",
        titulo: "$version.titulo",
        resumen: "$version.resumen",
        cuerpo: "$version.cuerpo",
        cuerpoHtml: { $ifNull: ["$version.cuerpoHtml", null] },
        adjuntos: {
          $map: {
            input: { $filter: { input: "$adjuntos", as: "a", cond: { $in: ["$$a._id", "$version.adjuntos"] } } },
            as: "a",
            in: { id: "$$a._id", nombre: "$$a.nombreOriginal", tamano: "$$a.tamano", tipoMime: "$$a.tipoMime" },
          },
        },
      },
    },
  ],
};

module.exports = {
  COLECCIONES, VISTA_PUBLICACIONES,
  ESTADOS_CONTENIDO, ESTADOS_CON_PUBLICACION, ESTADOS_SIN_ENVIAR, ESTADOS_EN_CIRCUITO, ESTADOS_VERSION, TIPOS_EVENTO, TIPOS_REVISION, TIPOS_DECISION,
  INDICES_RETIRADOS: { contenidos: ["uq_contenidos_slug", "ix_contenidos_sitio_tipo"] },
};
