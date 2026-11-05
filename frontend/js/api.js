/* api.js — capa de datos del frontend.
 *
 * MODO DEMO: hoy guarda todo en localStorage y aplica acá las reglas de negocio
 * (roles, estados, versiones). Cuando exista el backend, cada función de Nexo.api
 * se reemplaza por un fetch() a la API real conservando la misma firma; el resto
 * del frontend no cambia. Las reglas de este archivo son la especificación que
 * el backend tiene que cumplir (y validar del lado del servidor).
 */
window.Nexo = window.Nexo || {};

(function () {
  "use strict";

  const CLAVE_DATOS = "nexo.datos.v6"; // v6: varios sitios de destino y publicación al aprobar

  /** Archivos reales de la demo (IndexedDB). En páginas que no lo cargan, los adjuntos quedan solo como nombre. */
  const archivos = () => (window.Nexo && window.Nexo.archivosDemo) || null;
  const CLAVE_SESION = "nexo.sesion.v1";
  const LATENCIA_MS = 80;
  const MAX_ADJUNTOS = 8;

  /* ---------- Roles y permisos ---------- */

  /* Cadena de aprobación de tres niveles (igual que backend/src/permisos.js):
   *   1. Colaborador carga  →  2. Director de área revisa (eleva o devuelve)  →  3. Autoridad superior decide y publica.
   * "nivel" es el escalón en la cadena (null = fuera de la cadena). El orden de este objeto es el de los selectores. */
  const ROLES = {
    observador: { nombre: "Observador", nivel: null, permisos: "Solo puede consultar" },
    colaborador: { nombre: "Colaborador", nivel: 1, permisos: "Carga contenidos y los envía a revisión" },
    director: { nombre: "Director de área", nivel: 2, permisos: "Revisa en primera instancia: eleva o devuelve con observaciones" },
    autoridad: { nombre: "Autoridad superior", nivel: 3, permisos: "Decisión final: aprueba, devuelve con observaciones o rechaza" },
    administrador: { nombre: "Administrador", nivel: null, permisos: "Gestiona el equipo; también revisa, aprueba y devuelve" },
  };

  const PERMISOS = {
    observador: [],
    colaborador: ["crear"],
    director: ["crear", "revisar"],
    autoridad: ["crear", "decidir", "publicar", "archivar"],
    administrador: ["crear", "revisar", "decidir", "publicar", "roles", "auditoria"],
  };

  const ESTADOS = {
    borrador: "Borrador",
    en_revision: "Revisión de dirección",
    elevado: "Elevado a autoridad",
    devuelto: "Observado",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
    publicado: "Publicado",
    archivado: "Dado de baja",
  };

  /** Roles que no pueden quedar vacantes. */
  const IMPRESCINDIBLES = {
    administrador: "Tiene que quedar al menos un administrador.",
    autoridad: "Tiene que quedar al menos una autoridad superior: sin ella nada se puede aprobar ni publicar.",
  };

  /* ---------- Sitios de destino y tipos de contenido ----------
   * Tienen que coincidir con backend/src/sitios.js (el "id" es lo que se guarda en la base). */

  const SITIOS = [
    { id: "adultos-mayores", nombre: "Portal Dirección General de Adultos Mayores", corto: "Adultos Mayores", activo: true },
    { id: "mama-antula", nombre: "Residencia de Larga Estadía Mama Antula", corto: "Mama Antula", activo: true },
    { id: "centro-de-dia", nombre: "Centro de Día", corto: "Centro de Día", activo: true },
  ];

  const TIPOS = [
    { id: "noticia", nombre: "Noticia" },
    { id: "proyecto", nombre: "Proyecto institucional" },
    { id: "galeria", nombre: "Galería de fotos" },
  ];

  const existeSitio = (id) => SITIOS.some((s) => s.id === id);
  const nombreSitio = (id) => (SITIOS.find((s) => s.id === id) || { corto: id }).corto;

  /** Casillas de sitios: ids sin repetir en el orden del catálogo (acepta "sitio" suelto por compatibilidad). */
  function normalizarSitios(entrada) {
    const lista = entrada == null || entrada === "" ? [] : typeof entrada === "string" ? [entrada] : entrada;
    if (!Array.isArray(lista)) throw new ErrorNexo("Los sitios de destino no tienen un formato válido.", "datos_invalidos");
    if (lista.some((x) => !existeSitio(String(x).trim()))) throw new ErrorNexo("Alguno de los sitios elegidos no existe.", "datos_invalidos");
    const limpios = lista.map((x) => String(x).trim());
    return SITIOS.map((x) => x.id).filter((id) => limpios.includes(id));
  }
  const elegidosDe = (entrada) => normalizarSitios("sitiosDestino" in entrada ? entrada.sitiosDestino : entrada.sitio);

  const enumerarSitios = (ids) => {
    const n = ids.map(nombreSitio);
    return n.length > 1 ? `${n.slice(0, -1).join(", ")} y ${n[n.length - 1]}` : n.join("");
  };
  const ESPERA = {
    en_revision: "pendiente de la revisión de dirección",
    elevado: "pendiente de aprobación de la Autoridad Superior",
    devuelto: "observada: el autor tiene que corregirla y reenviarla",
    rechazado: "rechazada por la Autoridad Superior",
    aprobado: "aprobada, falta volver a publicarla",
  };

  /** Igual que visibilidad() en backend/src/repositorio.js: en qué sitios se ve y qué está pendiente. */
  function visibilidad(c) {
    const publicados = c.publicada ? c.publicada.sitios || [] : [];
    const destino = c.sitiosDestino || [];
    const ultimaVersion = c.versiones.length ? c.versiones[c.versiones.length - 1].numero : 0;
    const base = { visible: publicados.length > 0, sitios: publicados, sitiosDestino: destino };
    if (c.estado === "borrador") return { ...base, codigo: "borrador", texto: "Borrador: no es visible en ningún sitio" };
    if (c.estado === "archivado") return { ...base, codigo: "retirado", texto: "Retirado: ya no se ve en ningún sitio" };
    if (publicados.length) {
      const texto = `Aprobada y visible en ${enumerarSitios(publicados)}`;
      if (c.publicada.version !== ultimaVersion && ESPERA[c.estado]) {
        const cambiaDestino = destino.join() !== publicados.join();
        return {
          ...base, codigo: "visible_con_cambios", texto,
          pendiente: `Versión ${ultimaVersion} ${ESPERA[c.estado]}`
            + (cambiaDestino && ["en_revision", "elevado"].includes(c.estado) ? `; al aprobarse se verá en ${enumerarSitios(destino)}` : ""),
        };
      }
      return { ...base, codigo: "visible", texto, pendiente: null };
    }
    const aDonde = destino.length ? ` (destino: ${enumerarSitios(destino)})` : "";
    if (c.estado === "aprobado") return { ...base, codigo: "listo", texto: `Aprobada, falta publicarla${aDonde}` };
    if (c.estado === "devuelto") return { ...base, codigo: "devuelto", texto: `Observada: el autor tiene que corregirla; todavía no es visible${aDonde}` };
    if (c.estado === "rechazado") return { ...base, codigo: "rechazado", texto: "Rechazada: no se publicará" };
    return {
      ...base, codigo: "pendiente",
      texto: `${c.estado === "elevado" ? "Pendiente de aprobación de la Autoridad Superior" : "Pendiente de la revisión de dirección"}: todavía no es visible${aDonde}`,
    };
  }
  const existeTipo = (id) => TIPOS.some((t) => t.id === id);
  const esImagenNombre = (nombre) => /\.(jpe?g|png|webp|avif)$/i.test(String(nombre || ""));

  /** Contenido completo como en el servidor: el HTML del editor filtrado con la lista blanca + su texto sin formato. */
  function cuerpoDe(entrada) {
    const html = typeof entrada.cuerpoHtml === "string" && entrada.cuerpoHtml.trim() ? Nexo.util.htmlSeguro(entrada.cuerpoHtml) : "";
    const texto = typeof entrada.cuerpo === "string" ? entrada.cuerpo.trim() : "";
    if (!html) return { cuerpo: texto, cuerpoHtml: null };
    const caja = document.createElement("template");
    caja.innerHTML = html;
    const derivado = texto || (caja.content.textContent || "").trim();
    return derivado ? { cuerpo: derivado, cuerpoHtml: html } : { cuerpo: "", cuerpoHtml: null };
  }

  const puede = (usuario, permiso) => Boolean(usuario) && PERMISOS[usuario.rol].includes(permiso);

  /** Autor del contenido y autor de su última versión (puede ser otra persona si lo editó un director). */
  const autoresDe = (contenido) => {
    const v = contenido.versiones && contenido.versiones.length ? contenido.versiones[contenido.versiones.length - 1] : null;
    return [contenido.autorId, v && v.autorId].filter(Boolean);
  };

  /** Revisión intermedia: exige el permiso y no revisar lo propio, ni lo cargado ni lo editado (salvo el administrador). */
  const puedeRevisar = (usuario, contenido) =>
    puede(usuario, "revisar") && (!autoresDe(contenido).includes(usuario.id) || usuario.rol === "administrador");

  /** Decisión final: solo la autoridad superior (lo elevado ya pasó por un director). */
  /** Decisión final: autoridad superior o administrador, nunca sobre una versión que uno mismo elevó. */
  const puedeDecidir = (usuario, contenido) => {
    if (!puede(usuario, "decidir")) return false;
    const v = contenido && contenido.versiones && contenido.versiones.length ? contenido.versiones[contenido.versiones.length - 1] : null;
    return !(v && v.revision && v.revision.tipo === "elevacion" && v.revision.usuarioId === usuario.id);
  };

  /** Un borrador solo lo ve y lo toca quien lo creó. */
  const esAutorDelBorrador = (usuario, borrador) => Boolean(usuario && borrador) && borrador.autorId === usuario.id;

  /** Quién puede abrir los archivos de una versión enviada (igual que permisos.puedeVerAdjunto del backend). */
  const puedeVerAdjuntos = (usuario, contenido, version) => Boolean(usuario) && (
    (contenido.publicada && version && contenido.publicada.version === version.numero)
    || contenido.autorId === usuario.id
    || (version && version.autorId === usuario.id)
    || puede(usuario, "revisar") || puede(usuario, "decidir") || usuario.rol === "administrador"
  );

  /* Editar y dar de baja (igual que backend/src/permisos.js):
   *   editar: el autor (si sigue pudiendo cargar), un director de área o el administrador;
   *   dar de baja / reactivar: los mismos y la autoridad superior. */
  const esResponsable = (usuario, contenido) => puede(usuario, "crear")
    && (contenido.autorId === usuario.id || ["director", "administrador"].includes(usuario.rol));
  /** Lo observado (devuelto) lo corrige solo su autor: quien lo cargó o quien escribió la versión devuelta. */
  const puedeEditarContenido = (usuario, contenido) => {
    if (!puede(usuario, "crear") || !contenido) return false;
    if (contenido.estado === "devuelto") return autoresDe(contenido).includes(usuario.id);
    return esResponsable(usuario, contenido);
  };
  const puedeDarDeBaja = (usuario, contenido) => esResponsable(usuario, contenido) || puede(usuario, "archivar");
  const puedeReenviar = puedeEditarContenido;

  /* ---------- Errores y utilidades ---------- */

  class ErrorNexo extends Error {
    constructor(mensaje, codigo = "error") {
      super(mensaje);
      this.name = "ErrorNexo";
      this.codigo = codigo;
    }
  }

  const demora = () => new Promise((resolver) => setTimeout(resolver, LATENCIA_MS));
  const clonar = (x) => JSON.parse(JSON.stringify(x));
  const ahora = () => new Date().toISOString();
  const nuevoId = (prefijo) => prefijo + Math.random().toString(36).slice(2, 10);
  const ultima = (contenido) => contenido.versiones[contenido.versiones.length - 1];
  const evento = (tipo, usuarioId, version, comentario) => ({
    id: nuevoId("e"), tipo, usuarioId, fecha: ahora(), version, comentario: comentario || "",
  });

  /* ---------- Datos de demostración ---------- */

  function semilla() {
    const f = (dia, hora = "12:00") => `2026-09-${dia}T${hora}:00-03:00`;
    const ev = (tipo, usuarioId, fecha, version) => ({
      id: nuevoId("e"), tipo, usuarioId, fecha, version, comentario: "",
    });
    const ver = (numero, fecha, datos, estado, revision, decision) => ({
      numero, autorId: "u3", fecha, titulo: datos.titulo, resumen: datos.resumen,
      cuerpo: datos.cuerpo, cuerpoHtml: datos.cuerpoHtml || null, adjuntos: datos.adjuntos || [], estado, revision: revision || null, decision: decision || null,
    });
    const elevacion = (fecha) => ({ tipo: "elevacion", usuarioId: "u2", fecha, comentario: "" });
    const aprobacion = (fecha) => ({ tipo: "aprobacion", usuarioId: "u5", fecha, comentario: "" });
    /** El recorrido completo de una versión publicada: envío → elevación → aprobación → publicación. */
    const circuito = (version, envio, elevado, aprobado, publicado) => [
      ev("envio", "u3", envio, version), ev("elevacion", "u2", elevado, version),
      ev("aprobacion", "u5", aprobado, version), ev("publicacion", "u5", publicado, version),
    ];
    const instantanea = (c, v, fecha) => ({
      slug: c.slug, sitios: [...c.sitiosDestino], tipo: c.tipo, seccion: c.seccion, titulo: v.titulo, resumen: v.resumen,
      cuerpo: v.cuerpo, cuerpoHtml: v.cuerpoHtml || null, adjuntos: v.adjuntos, version: v.numero, fecha,
    });

    const usuarios = [
      { id: "u1", nombre: "Jorgelina Campos", email: "jorgelina.campos@ejemplo.edu.ar", rol: "administrador", ultimoAcceso: f("18", "09:15"), telefono: "+54 385 421-0101", area: "Sistemas", creadoEn: f("01", "09:00") },
      { id: "u2", nombre: "Marcos Ledesma", email: "marcos.ledesma@ejemplo.edu.ar", rol: "director", ultimoAcceso: f("17", "09:00"), telefono: "+54 385 421-0202", area: "Dirección de Comunicación", creadoEn: f("01", "09:00") },
      { id: "u5", nombre: "Elena Suárez", email: "elena.suarez@ejemplo.edu.ar", rol: "autoridad", ultimoAcceso: f("17", "10:20"), telefono: "+54 385 421-0001", area: "Dirección General", creadoEn: f("01", "09:00") },
      { id: "u3", nombre: "Analía Rojas", email: "analia.rojas@ejemplo.edu.ar", rol: "colaborador", ultimoAcceso: f("18", "12:05"), telefono: "+54 385 421-0303", area: "Prensa y contenidos", creadoEn: f("01", "09:00") },
      { id: "u4", nombre: "Tomás Herrera", email: "tomas.herrera@ejemplo.edu.ar", rol: "observador", ultimoAcceso: f("12", "16:40"), telefono: null, area: "Mesa de entradas", creadoEn: f("01", "09:00") },
    ];

    /* Becas: dos versiones publicadas (la primera quedó reemplazada). */
    const becasV1 = {
      titulo: "Convocatoria de becas de permanencia 2026",
      resumen: "Información, requisitos y fechas para postular a las becas de permanencia estudiantil.",
      cuerpo: "Se abre la convocatoria de becas de permanencia para estudiantes regulares.\n\nLa inscripción se realiza en la oficina de Bienestar Estudiantil.",
    };
    const becasV2 = {
      titulo: "Convocatoria de becas de permanencia 2026",
      resumen: "Información, requisitos y fechas para postular a las becas de permanencia estudiantil.",
      cuerpo: "Se abre la convocatoria de becas de permanencia para estudiantes regulares.\n\nLa inscripción se realiza en línea o en la oficina de Bienestar Estudiantil, hasta el 30 de octubre.\n\nRequisitos: certificado de alumno regular, constancia de ingresos familiares y fotocopia del DNI.",
    };
    const becas = {
      id: "c1", sitiosDestino: ["adultos-mayores"], tipo: "noticia", seccion: "Becas y beneficios", slug: "convocatoria-becas-2026", autorId: "u3",
      estado: "publicado", creado: f("10", "10:00"), actualizado: f("17", "09:30"), publicada: null,
      versiones: [
        ver(1, f("10", "10:00"), becasV1, "reemplazada", elevacion(f("10", "12:00")), aprobacion(f("10", "15:00"))),
        ver(2, f("16", "11:00"), becasV2, "publicada", elevacion(f("16", "17:00")), aprobacion(f("17", "09:00"))),
      ],
      historial: [
        ...circuito(1, f("10", "10:00"), f("10", "12:00"), f("10", "15:00"), f("10", "16:00")),
        ...circuito(2, f("16", "11:00"), f("16", "17:00"), f("17", "09:00"), f("17", "09:30")),
      ],
    };
    // Urgente y publicado: se destaca en el sitio durante los próximos 10 días (relativo a hoy, para que la demo lo muestre)
    const enDiezDias = new Date(Date.now() - 3 * 3600 * 1000 + 10 * 86400000).toISOString().slice(0, 10);
    becas.prioridad = {
      nivel: "urgente", motivo: "La inscripción cierra el 30 de octubre", vence: new Date(`${enDiezDias}T23:59:59.999-03:00`).toISOString(),
      marcadoPor: "u3", marcadoEn: f("16", "11:00"),
    };
    becas.prioridadPublicada = becas.prioridad;
    becas.historial[becas.historial.length - 4].comentario = "Enviado como urgente: La inscripción cierra el 30 de octubre";
    becas.publicada = { ...instantanea(becas, becas.versiones[1], f("17", "09:30")), prioridad: { nivel: "urgente", vence: becas.prioridad.vence } };

    /* Contenidos publicados con una sola versión. */
    const simple = (id, sitios, tipo, seccion, slug, datos, envio, aprobado, publicado) => {
      const c = {
        id, sitiosDestino: sitios, tipo, seccion, slug, autorId: "u3", estado: "publicado", creado: envio, actualizado: publicado,
        publicada: null,
        versiones: [ver(1, envio, datos, "publicada", elevacion(envio), aprobacion(aprobado))],
        historial: circuito(1, envio, envio, aprobado, publicado),
      };
      c.publicada = instantanea(c, c.versiones[0], publicado);
      return c;
    };

    const calendario = simple("c2", ["adultos-mayores", "centro-de-dia"], "proyecto", "Comunidad académica", "calendario-academico-2027", {
      titulo: "Calendario académico 2027",
      resumen: "Fechas clave del año lectivo: inscripciones, recesos, exámenes y cierre de actas.",
      cuerpo: "El calendario académico 2027 fija el inicio de clases en marzo y el cierre de actas en diciembre.\n\nLas fechas de exámenes y recesos se publican por cuatrimestre.",
    }, f("14", "10:00"), f("15", "10:00"), f("15", "10:30"));

    const protocolo = simple("c3", ["mama-antula"], "noticia", "Vida universitaria", "protocolo-orientacion-acompanamiento", {
      titulo: "Protocolo de orientación y acompañamiento",
      resumen: "Guía de atención para derivaciones de orientación y acompañamiento integral.",
      cuerpo: "Este protocolo describe cómo se deriva y acompaña a estudiantes que necesitan orientación.\n\nLa primera consulta se solicita en la oficina de Bienestar Estudiantil.",
    }, f("10", "14:00"), f("11", "09:00"), f("11", "09:30"));

    /* Un contenido pendiente de revisión. */
    const abuelos = {
      id: "c4", sitiosDestino: ["mama-antula"], tipo: "noticia", seccion: "Proyecto escuelas", slug: "visitas", autorId: "u3", estado: "en_revision",
      creado: f("18", "12:00"), actualizado: f("18", "12:00"), publicada: null,
      versiones: [ver(1, f("18", "12:00"), {
        titulo: "Las escuelas podrán visitar a los abuelos",
        resumen: "Los alumnos de las escuelas podrán hacer una visita a los abuelos de la residencia.",
        cuerpo: "A partir del jueves, los estudiantes de las escuelas participantes visitarán la residencia de adultos mayores para compartir una tarde de actividades.",
        adjuntos: [{ id: "a-logo", nombre: "logoMA.png", tamano: 932864, esImagen: true }],
      }, "en_revision")],
      historial: [ev("envio", "u3", f("18", "12:00"), 1)],
    };

    /* Uno que el director ya elevó: espera la decisión final de la autoridad superior. */
    const taller = {
      id: "c5", sitiosDestino: ["adultos-mayores", "centro-de-dia"], tipo: "noticia", seccion: "Talleres", slug: "taller-alfabetizacion-digital",
      autorId: "u3", estado: "elevado", creado: f("17", "11:00"), actualizado: f("18", "10:00"), publicada: null,
      versiones: [ver(1, f("17", "11:00"), {
        titulo: "Taller de alfabetización digital",
        resumen: "Encuentros semanales para aprender a usar el celular, videollamadas y trámites en línea.",
        cuerpo: "Los talleres se dictan los martes en los centros de jubilados de la capital.\n\nNo hace falta experiencia previa.",
      }, "elevada", { tipo: "elevacion", usuarioId: "u2", fecha: f("18", "10:00"), comentario: "Revisado, listo para la decisión final." })],
      // urgente: espera la decisión final y en la bandeja de la autoridad va primero
      prioridad: { nivel: "urgente", motivo: "Las inscripciones cierran el viernes", vence: null, marcadoPor: "u3", marcadoEn: f("17", "11:00") },
      historial: [{ ...ev("envio", "u3", f("17", "11:00"), 1), comentario: "Enviado como urgente: Las inscripciones cierran el viernes" },
        { ...ev("elevacion", "u2", f("18", "10:00"), 1), comentario: "Revisado, listo para la decisión final." }],
    };

    /* Un borrador de Analía (solo ella lo ve): incompleto, con una foto. */
    const muestra = {
      id: "c6", sitiosDestino: ["centro-de-dia"], tipo: "noticia", seccion: null, slug: null, autorId: "u3", estado: "borrador",
      creado: f("18", "16:00"), actualizado: f("18", "16:20"), publicada: null, versiones: [],
      borrador: {
        autorId: "u3", titulo: "Muestra de pintura en el centro de día",
        resumen: "Los talleres de arte exponen sus obras durante todo octubre.", cuerpo: "",
        sitiosDestino: ["centro-de-dia"], tipo: "noticia", seccion: "",
        adjuntos: [{ id: "a-taller", nombre: "taller-pintura.png", tamano: 845000, esImagen: true }],
        iniciado: f("18", "16:00"), actualizado: f("18", "16:20"),
      },
      historial: [ev("borrador_creado", "u3", f("18", "16:00"), 1),
        { ...ev("adjunto_agregado", "u3", f("18", "16:05"), 1), comentario: "taller-pintura.png" }],
    };

    return { usuarios, contenidos: [becas, calendario, protocolo, abuelos, taller, muestra] };
  }

  /* ---------- Almacenamiento (localStorage con respaldo en memoria) ---------- */

  let memoriaDatos = null;
  let memoriaSesion = null;

  function guardar(datos) {
    memoriaDatos = datos;
    try { localStorage.setItem(CLAVE_DATOS, JSON.stringify(datos)); } catch (e) { /* usa la memoria */ }
  }

  function leer() {
    try {
      const texto = localStorage.getItem(CLAVE_DATOS);
      if (texto) return JSON.parse(texto);
    } catch (e) { /* datos ilegibles: se usa el respaldo o se regeneran */ }
    if (memoriaDatos) return memoriaDatos;
    const datos = semilla();
    guardar(datos);
    return datos;
  }

  function leerSesion() {
    try { return localStorage.getItem(CLAVE_SESION) || memoriaSesion; } catch (e) { return memoriaSesion; }
  }

  function guardarSesion(id) {
    memoriaSesion = id;
    try {
      if (id) localStorage.setItem(CLAVE_SESION, id); else localStorage.removeItem(CLAVE_SESION);
    } catch (e) { /* usa la memoria */ }
  }

  const usuarioActual = (datos) => activos(datos).find((u) => u.id === leerSesion()) || null;

  const sinSesion = () => new ErrorNexo("Tu sesión expiró. Volvé a ingresar.", "sin_sesion");
  const prohibido = (mensaje) => new ErrorNexo(mensaje || "Tu rol no permite realizar esta acción.", "prohibido");

  async function consultar(fn) {
    await demora();
    const datos = leer();
    const usuario = usuarioActual(datos);
    if (!usuario) throw sinSesion();
    return clonar(fn(datos, usuario));
  }

  async function mutar(fn) {
    await demora();
    const datos = leer();
    const usuario = usuarioActual(datos);
    if (!usuario) throw sinSesion();
    const resultado = fn(datos, usuario);
    guardar(datos);
    return clonar(resultado);
  }

  function exigir(usuario, permiso) {
    if (!puede(usuario, permiso)) throw prohibido();
  }

  function buscar(datos, id) {
    const contenido = datos.contenidos.find((c) => c.id === id);
    if (!contenido) throw new ErrorNexo("El contenido no existe.", "no_encontrado");
    return contenido;
  }

  /* Mismas reglas que backend/src/servicios/usuarios.js */
  /** Teléfono y área: opcionales; en una edición solo cambian si vinieron. */
  function validarContacto(entrada = {}) {
    const c = {};
    if ("telefono" in entrada) {
      const t = String(entrada.telefono ?? "").trim();
      if (t && !/^[0-9+()\-\s.]{6,40}$/.test(t)) throw new ErrorNexo("El teléfono solo admite números, espacios, +, guiones y paréntesis.", "datos_invalidos");
      c.telefono = t || null;
    }
    if ("area" in entrada) {
      const a = String(entrada.area ?? "").trim().replace(/\s+/g, " ");
      if (a.length > 120) throw new ErrorNexo("El área admite hasta 120 caracteres.", "datos_invalidos");
      c.area = a || null;
    }
    return c;
  }

  function validarIntegrante({ nombre, email }) {
    const nombreLimpio = String(nombre ?? "").trim().replace(/\s+/g, " ");
    const correo = String(email ?? "").trim().toLowerCase();
    if (!nombreLimpio || nombreLimpio.length > 120) throw new ErrorNexo("Indicá el nombre (hasta 120 caracteres).", "datos_invalidos");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 160) throw new ErrorNexo("El correo no es válido.", "datos_invalidos");
    return { nombre: nombreLimpio, email: correo };
  }

  const activos = (datos) => datos.usuarios.filter((u) => u.activo !== false);
  const correoDuplicado = () => new ErrorNexo("Ya existe una persona con ese correo.", "datos_invalidos");

  function exigirQueNoQuedeVacante(datos, rol) {
    if (IMPRESCINDIBLES[rol] && activos(datos).filter((u) => u.rol === rol).length <= 1) {
      throw new ErrorNexo(IMPRESCINDIBLES[rol], "regla_negocio");
    }
  }

  function buscarIntegrante(datos, id) {
    const objetivo = activos(datos).find((u) => u.id === id);
    if (!objetivo) throw new ErrorNexo("La persona no existe.", "no_encontrado");
    return objetivo;
  }

  const slugDuplicado = () => new ErrorNexo("Ya existe un contenido con ese identificador web.", "slug_duplicado");

  /** Validación liviana: el borrador puede estar incompleto, pero lo que tiene debe ser válido. */
  /* ---------- Prioridad (mismas reglas que backend/src/prioridad.js) ---------- */

  const NIVELES_PRIORIDAD = ["normal", "urgente"];
  const PRIORIDAD_NORMAL = Object.freeze({ nivel: "normal", motivo: "", vence: null });
  const MAX_MOTIVO = 200;
  const MAX_DIAS_DESTACADO = 90;
  const finDelDia = (texto) => new Date(`${texto}T23:59:59.999-03:00`);

  /** { nivel, motivo, vence: "AAAA-MM-DD" | ISO | null } -> objeto completo; "estricta" exige fecha no vencida. */
  function validarPrioridad(entrada, { estricta = true } = {}) {
    if (entrada == null) return { ...PRIORIDAD_NORMAL };
    if (typeof entrada !== "object" || Array.isArray(entrada)) throw new ErrorNexo("La prioridad no tiene un formato válido.", "datos_invalidos");
    const nivel = entrada.nivel == null || entrada.nivel === "" ? "normal" : entrada.nivel;
    if (!NIVELES_PRIORIDAD.includes(nivel)) throw new ErrorNexo("La prioridad solo puede ser normal o urgente.", "datos_invalidos");
    if (nivel === "normal") return { ...PRIORIDAD_NORMAL };
    const motivo = typeof entrada.motivo === "string" ? entrada.motivo.trim().replace(/\s+/g, " ") : "";
    if (motivo.length > MAX_MOTIVO) throw new ErrorNexo(`El motivo de la urgencia admite hasta ${MAX_MOTIVO} caracteres.`, "datos_invalidos");
    let vence = null;
    if (entrada.vence) {
      const texto = String(entrada.vence);
      const fecha = /^\d{4}-\d{2}-\d{2}$/.test(texto) ? finDelDia(texto) : new Date(texto);
      if (Number.isNaN(fecha.getTime())) throw new ErrorNexo("La fecha hasta la que se destaca no es válida.", "datos_invalidos");
      if (estricta && fecha.getTime() < Date.now()) throw new ErrorNexo("La fecha hasta la que se destaca ya pasó: cambiala o quitala.", "datos_invalidos");
      if (fecha.getTime() - Date.now() > MAX_DIAS_DESTACADO * 86400000) {
        throw new ErrorNexo(`Un aviso urgente se puede destacar hasta ${MAX_DIAS_DESTACADO} días.`, "datos_invalidos");
      }
      vence = fecha.toISOString();
    }
    return { nivel, motivo, vence };
  }

  const registroPrioridad = (p, usuarioId) => ({ ...p, marcadoPor: usuarioId, marcadoEn: ahora() });
  const formatearPrioridad = (p) => ({ ...PRIORIDAD_NORMAL, marcadoPor: null, marcadoEn: null, ...(p || {}) });
  const esUrgente = (p) => Boolean(p) && p.nivel === "urgente";
  const destacadaEnSitio = (p) => esUrgente(p) && (!p.vence || Date.parse(p.vence) >= Date.now());
  const fechaCortaAR = (iso) => new Date(Date.parse(iso) - 3 * 3600 * 1000).toISOString().slice(0, 10).split("-").reverse().join("/");
  function describirPrioridad(p) {
    if (!esUrgente(p)) return "normal";
    const partes = [p.motivo && `motivo: ${p.motivo}`, p.vence && `en el sitio hasta el ${fechaCortaAR(p.vence)}`].filter(Boolean);
    return partes.length ? `urgente (${partes.join("; ")})` : "urgente";
  }
  const prioridadesIguales = (a, b) => (a ? a.nivel : "normal") === (b ? b.nivel : "normal")
    && ((a && a.motivo) || "") === ((b && b.motivo) || "") && ((a && a.vence) || null) === ((b && b.vence) || null);
  const notaEnvio = (p) => (esUrgente(p) ? `Enviado como urgente${p.motivo ? `: ${p.motivo}` : ""}` : "");

  /** Orden de las bandejas: urgente primero; dentro de cada nivel, lo que más espera. */
  const ordenBandeja = (a, b) => Number(esUrgente(b.prioridad)) - Number(esUrgente(a.prioridad))
    || Date.parse(a.actualizado) - Date.parse(b.actualizado);

  function validarBorrador(entrada, { conSlug }) {
    const t = (x) => (typeof x === "string" ? x.trim() : "");
    const d = {
      titulo: t(entrada.titulo), resumen: t(entrada.resumen), ...cuerpoDe(entrada), seccion: t(entrada.seccion),
      sitiosDestino: elegidosDe(entrada), tipo: t(entrada.tipo) || null,
    };
    if (d.tipo && !existeTipo(d.tipo)) throw new ErrorNexo("El tipo de contenido elegido no existe.", "datos_invalidos");
    if (conSlug) {
      const slug = t(entrada.slug).toLowerCase();
      if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new ErrorNexo("El identificador web solo admite minúsculas, números y guiones.", "datos_invalidos");
      }
      d.slug = slug || null;
    }
    if ("prioridad" in entrada) d.prioridad = validarPrioridad(entrada.prioridad, { estricta: false });
    return d;
  }

  /** El borrador existe y es de quien actúa (si nunca se envió y es ajeno, responde como si no existiera). */
  function borradorPropio(datos, id, usuario) {
    exigir(usuario, "crear");
    const c = datos.contenidos.find((x) => x.id === id);
    const invisible = !c || c.estado === "descartado" || (c.estado === "borrador" && !esAutorDelBorrador(usuario, c.borrador));
    if (invisible) throw new ErrorNexo("El borrador no existe.", "no_encontrado");
    if (!c.borrador) throw new ErrorNexo("Este contenido no tiene un borrador en preparación.", "no_encontrado");
    if (!esAutorDelBorrador(usuario, c.borrador)) throw prohibido("Solo quien creó el borrador puede verlo, modificarlo o enviarlo.");
    return c;
  }

  /** Lo que ve cada persona de un contenido: su borrador (si es suyo) y el historial sin la actividad de borradores ajenos. */
  /* ---------- Observaciones de los revisores (como contenido.observaciones en el servidor) ---------- */

  const MAX_OBSERVACION = 2000;

  function observar(contenido, usuario, nivel, mensaje, version, fecha) {
    contenido.observaciones = contenido.observaciones || [];
    contenido.observaciones.push({
      id: nuevoId("o"), version, nivel, usuarioId: usuario.id, rol: usuario.rol, mensaje, fecha,
      atendida: false, atendidaEn: null, atendidaEnVersion: null,
    });
  }

  function atenderObservaciones(contenido, numero, fecha) {
    for (const o of contenido.observaciones || []) {
      if (o.atendida) continue;
      Object.assign(o, { atendida: true, atendidaEn: fecha, atendidaEnVersion: numero });
    }
  }

  /** Datos de ejemplo o guardados antes de las observaciones: se arman desde las devoluciones (como la migración). */
  function observacionesDe(c, usuarios) {
    if (Array.isArray(c.observaciones)) return c.observaciones;
    const rolDe = (id, porDefecto) => (usuarios.find((u) => u.id === id) || {}).rol || porDefecto;
    const lista = [];
    c.versiones.forEach((v, i) => {
      const siguiente = c.versiones[i + 1];
      for (const [reg, desdeRevision] of [[v.revision, true], [v.decision, false]]) {
        if (!reg || reg.tipo !== "devolucion") continue;
        const rol = rolDe(reg.usuarioId, desdeRevision ? "director" : "autoridad");
        lista.push({
          id: `o-${c.id}-${v.numero}-${desdeRevision ? "d" : "a"}`, version: v.numero,
          nivel: desdeRevision || rol !== "autoridad" ? "direccion" : "autoridad",
          usuarioId: reg.usuarioId, rol, mensaje: reg.comentario || "(sin comentario)", fecha: reg.fecha,
          atendida: Boolean(siguiente), atendidaEn: siguiente ? siguiente.fecha : null, atendidaEnVersion: siguiente ? siguiente.numero : null,
        });
      }
    });
    c.observaciones = lista;
    return lista;
  }

  function vistaPara(c, usuario) {
    const suyo = esAutorDelBorrador(usuario, c.borrador);
    const pendiente = c.versiones.length + 1;
    return {
      ...c,
      observaciones: observacionesDe(c, leer().usuarios || []),
      visibilidad: visibilidad(c),
      prioridad: formatearPrioridad(c.prioridad),
      prioridadPublicada: c.publicada ? formatearPrioridad(c.prioridadPublicada) : null,
      borrador: suyo
        ? { ...c.borrador, prioridad: { ...PRIORIDAD_NORMAL, ...(c.borrador.prioridad || {}) }, slug: c.slug, slugEditable: c.versiones.length === 0 }
        : null,
      historial: suyo ? c.historial : c.historial.filter((e) => !(e.version === pendiente && e.tipo !== "envio")),
    };
  }

  function validarDatos(datos, { conSlug }) {
    const t = (x) => String(x ?? "").trim();
    const limpio = {
      sitiosDestino: elegidosDe(datos),
      tipo: t(datos.tipo),
      seccion: t(datos.seccion),
      slug: t(datos.slug).toLowerCase(),
      titulo: t(datos.titulo),
      resumen: t(datos.resumen),
      ...cuerpoDe(datos),
      adjuntos: (datos.adjuntos || []).map((a) => ({ nombre: String(a.nombre), tamano: Number(a.tamano) || 0 })),
    };
    if (!limpio.sitiosDestino.length) throw new ErrorNexo("Elegí al menos un sitio donde se va a publicar.", "datos_invalidos");
    if (!existeTipo(limpio.tipo)) throw new ErrorNexo("Elegí el tipo de contenido (noticia, proyecto o galería).", "datos_invalidos");
    if (!limpio.seccion || !limpio.titulo || !limpio.resumen || !limpio.cuerpo) {
      throw new ErrorNexo("Completá sección, título, resumen y contenido.", "datos_invalidos");
    }
    if (limpio.tipo === "galeria" && !limpio.adjuntos.some((a) => esImagenNombre(a.nombre))) {
      throw new ErrorNexo("Una galería de fotos necesita al menos una imagen (JPG, PNG, WEBP o AVIF).", "datos_invalidos");
    }
    if (conSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(limpio.slug)) {
      throw new ErrorNexo("El identificador web solo admite minúsculas, números y guiones.", "datos_invalidos");
    }
    if (limpio.adjuntos.length > MAX_ADJUNTOS) {
      throw new ErrorNexo(`Se permiten hasta ${MAX_ADJUNTOS} adjuntos por versión.`, "datos_invalidos");
    }
    return limpio;
  }

  /** Una publicación como la entrega la API pública: aviso urgente mientras no pase su fecha, sin el motivo interno. */
  function publicacion(p) {
    const { prioridad, ...resto } = p;
    const urgente = destacadaEnSitio(prioridad);
    return { ...resto, urgente, urgenteHasta: urgente && prioridad.vence ? prioridad.vence : null };
  }

  /** Sin al menos un sitio no se publica (contenidos anteriores a los sitios). */
  function exigirDestino(c) {
    if (!c.sitiosDestino || !c.sitiosDestino.length || !c.tipo || !c.seccion) {
      throw new ErrorNexo("Este contenido no tiene sitio de destino: devolvelo al autor para que elija dónde se publica.", "estado_invalido");
    }
  }

  /** Lo único que hace visible una versión: copia el destino aprobado (sitios, tipo, categoría) a la publicación. */
  function hacerVisible(contenido, usuario, fecha, comentario) {
    contenido.versiones.forEach((v) => { if (v.estado === "publicada") v.estado = "reemplazada"; });
    const version = ultima(contenido);
    version.estado = "publicada";
    contenido.estado = "publicado";
    contenido.actualizado = fecha;
    // la web muestra la prioridad que se aprobó con esta versión
    contenido.prioridadPublicada = contenido.prioridad || null;
    contenido.publicada = {
      slug: contenido.slug, sitios: [...contenido.sitiosDestino], tipo: contenido.tipo, seccion: contenido.seccion,
      titulo: version.titulo, resumen: version.resumen, cuerpo: version.cuerpo, cuerpoHtml: version.cuerpoHtml || null, adjuntos: version.adjuntos, version: version.numero, fecha,
      prioridad: contenido.prioridadPublicada ? { nivel: contenido.prioridadPublicada.nivel, vence: contenido.prioridadPublicada.vence } : null,
    };
    contenido.historial.push({ ...evento("publicacion", usuario.id, version.numero, comentario), fecha });
  }

  /* ---------- API ---------- */

  const api = {
    modoDemo: true,
    roles: ROLES,
    estados: ESTADOS,
    sitios: SITIOS,
    tipos: TIPOS,
    puede,
    puedeRevisar,
    puedeDecidir,
    puedeReenviar,
    puedeEditarContenido,
    puedeDarDeBaja,
    esAutorDelBorrador,
    puedeVerAdjuntos,

    /** Carga los archivos guardados en el navegador (solo demo). */
    iniciarArchivos: () => (archivos() ? archivos().iniciar() : Promise.resolve()),
    /** URL para ver o descargar un adjunto, o null si en la demo no hay archivo guardado (ej. datos viejos). */
    urlAdjunto: (id) => (archivos() && id ? archivos().url(id) : null),

    /* Autenticación */
    async sesion() {
      await demora();
      const datos = leer();
      const usuario = usuarioActual(datos);
      return usuario ? clonar(usuario) : null;
    },

    async iniciarSesion(usuarioId = "u1") {
      await demora();
      const datos = leer();
      const usuario = activos(datos).find((u) => u.id === usuarioId);
      if (!usuario) throw new ErrorNexo("No encontramos esa cuenta institucional.", "no_encontrado");
      usuario.ultimoAcceso = ahora();
      guardar(datos);
      guardarSesion(usuario.id);
      return clonar(usuario);
    },

    async cerrarSesion() {
      await demora();
      guardarSesion(null);
    },

    async reiniciarDemo() {
      await demora();
      if (archivos()) await archivos().vaciar();
      guardar(semilla());
      localStorage.removeItem(CLAVE_AUDITORIA); // se regenera desde la semilla
      guardarSesion("u1");
    },

    /* Equipo y roles */
    listarUsuarios() {
      return consultar((datos) => activos(datos));
    },

    /** Alta (solo administrador). En la demo no hay contraseñas: se ingresa eligiendo la persona en "ver como". */
    agregarIntegrante(entrada) {
      return mutar((datos, usuario) => {
        exigir(usuario, "roles");
        const identidad = { ...validarIntegrante(entrada), ...validarContacto(entrada) };
        if (!ROLES[entrada.rol]) throw new ErrorNexo("El rol indicado no existe.", "datos_invalidos");
        const existente = datos.usuarios.find((u) => u.email === identidad.email);
        if (existente && existente.activo !== false) throw correoDuplicado();
        if (existente) {
          // reactivar conserva el id: sus contenidos anteriores vuelven a mostrar su nombre
          Object.assign(existente, identidad, { rol: entrada.rol, activo: true });
          return { ...existente, reactivado: true };
        }
        const nuevo = { id: nuevoId("u"), telefono: null, area: null, ...identidad, rol: entrada.rol, activo: true, ultimoAcceso: null, creadoEn: ahora() };
        datos.usuarios.push(nuevo);
        return nuevo;
      });
    },

    editarIntegrante(id, entrada) {
      return mutar((datos, usuario) => {
        exigir(usuario, "roles");
        const identidad = { ...validarIntegrante(entrada), ...validarContacto(entrada) };
        const objetivo = buscarIntegrante(datos, id);
        if (datos.usuarios.some((u) => u.id !== id && u.email === identidad.email)) throw correoDuplicado();
        Object.assign(objetivo, identidad);
        return objetivo;
      });
    },

    /** Baja lógica: deja de figurar y de poder ingresar, pero su autoría se conserva en el historial. */
    darDeBaja(id) {
      return mutar((datos, usuario) => {
        exigir(usuario, "roles");
        const objetivo = buscarIntegrante(datos, id);
        if (objetivo.id === usuario.id) throw new ErrorNexo("No podés darte de baja a vos mismo.", "regla_negocio");
        exigirQueNoQuedeVacante(datos, objetivo.rol);
        objetivo.activo = false;
        return { id: objetivo.id, activo: false };
      });
    },

    cambiarRol(usuarioId, rol) {
      return mutar((datos, usuario) => {
        exigir(usuario, "roles");
        if (!ROLES[rol]) throw new ErrorNexo("El rol indicado no existe.", "datos_invalidos");
        const objetivo = buscarIntegrante(datos, usuarioId);
        if (objetivo.rol !== rol) exigirQueNoQuedeVacante(datos, objetivo.rol);
        objetivo.rol = rol;
        return objetivo;
      });
    },

    /* Contenidos: lo que entró al circuito y los borradores propios. Nunca los ajenos. */
    /** Opciones como la API: { prioridad: "urgente" | "normal", orden: "prioridad" }. */
    listarContenidos({ prioridad: nivel = null, orden = null } = {}) {
      if (nivel && !NIVELES_PRIORIDAD.includes(nivel)) return Promise.reject(new ErrorNexo("La prioridad indicada no existe (normal o urgente).", "datos_invalidos"));
      return consultar((datos, usuario) => {
        const lista = datos.contenidos
          .filter((c) => c.estado !== "descartado" && (c.estado !== "borrador" || esAutorDelBorrador(usuario, c.borrador)))
          .filter((c) => !nivel || (nivel === "urgente") === esUrgente(c.prioridad))
          .map((c) => vistaPara(c, usuario));
        return orden === "prioridad" ? lista.sort(ordenBandeja) : lista;
      });
    },

    /** Lo que espera una acción de quien revisa, urgente primero (igual que GET /api/contenidos/bandeja). */
    bandeja({ prioridad: nivel = null } = {}) {
      return consultar((datos, usuario) => {
        const estados = [];
        if (puede(usuario, "revisar")) estados.push("en_revision");
        if (puede(usuario, "decidir")) estados.push("elevado");
        if (puede(usuario, "publicar")) estados.push("aprobado");
        if (!estados.length) throw prohibido("Tu rol no revisa contenidos: no tenés bandeja de pendientes.");
        const contenidos = datos.contenidos
          .filter((c) => estados.includes(c.estado) && (c.estado !== "en_revision" || puedeRevisar(usuario, c)))
          .filter((c) => !nivel || (nivel === "urgente") === esUrgente(c.prioridad))
          .map((c) => vistaPara(c, usuario)).sort(ordenBandeja);
        return { contenidos, total: contenidos.length, urgentes: contenidos.filter((c) => esUrgente(c.prioridad)).length };
      });
    },

    /** Los revisores ajustan la prioridad de algo enviado (igual que PATCH /api/contenidos/:id/prioridad). */
    cambiarPrioridad(id, entrada) {
      return mutar((datos, usuario) => {
        if (!puede(usuario, "revisar") && !puede(usuario, "decidir")) {
          throw prohibido("Solo quienes revisan (dirección o autoridad superior) pueden cambiar la prioridad.");
        }
        const c = buscar(datos, id);
        const publicado = c.estado === "publicado";
        if (!["en_revision", "elevado", "aprobado"].includes(c.estado) && !publicado) {
          throw new ErrorNexo(c.estado === "devuelto"
            ? "Está devuelto al autor: la prioridad la vuelve a elegir al enviar la nueva versión."
            : "En este estado la prioridad ya no se puede cambiar.", "estado_invalido");
        }
        if (publicado && !puede(usuario, "publicar")) {
          throw prohibido("Sobre un contenido publicado, solo la autoridad superior puede cambiar lo que se destaca en la web.");
        }
        const nueva = validarPrioridad(entrada);
        if (prioridadesIguales(c.prioridad, nueva)) return vistaPara(c, usuario);
        const reg = registroPrioridad(nueva, usuario.id);
        c.historial.push(evento("prioridad", usuario.id, ultima(c).numero, `De ${describirPrioridad(c.prioridad)} a ${describirPrioridad(nueva)}`));
        c.prioridad = reg; // no toca "actualizado": en la bandeja sigue contando lo que lleva esperando
        if (publicado) {
          c.prioridadPublicada = reg;
          c.publicada = { ...c.publicada, prioridad: { nivel: reg.nivel, vence: reg.vence } };
        }
        return vistaPara(c, usuario);
      });
    },

    /* ---------- Borradores ---------- */

    crearBorrador(entrada) {
      return mutar((datos, usuario) => {
        exigir(usuario, "crear");
        const d = validarBorrador(entrada, { conSlug: true });
        if (d.slug && datos.contenidos.some((c) => c.slug === d.slug)) throw slugDuplicado();
        const fecha = ahora();
        const c = {
          id: nuevoId("c"), sitiosDestino: d.sitiosDestino, tipo: d.tipo, seccion: d.seccion, slug: d.slug, autorId: usuario.id,
          estado: "borrador", creado: fecha, actualizado: fecha, publicada: null, versiones: [],
          borrador: { autorId: usuario.id, titulo: d.titulo, resumen: d.resumen, cuerpo: d.cuerpo, cuerpoHtml: d.cuerpoHtml, sitiosDestino: d.sitiosDestino,
            tipo: d.tipo, seccion: d.seccion, prioridad: d.prioridad || { ...PRIORIDAD_NORMAL }, adjuntos: [], iniciado: fecha, actualizado: fecha },
          historial: [evento("borrador_creado", usuario.id, 1, "")],
        };
        datos.contenidos.push(c);
        return vistaPara(c, usuario);
      });
    },

    iniciarBorradorDeVersion(id) {
      return mutar((datos, usuario) => {
        exigir(usuario, "crear");
        const c = buscar(datos, id);
        if (c.borrador) {
          if (esAutorDelBorrador(usuario, c.borrador)) return vistaPara(c, usuario);
          throw new ErrorNexo("Otra persona ya está editando este contenido (tiene un borrador de la nueva versión en curso).", "estado_invalido");
        }
        if (!puedeReenviar(usuario, c)) {
          throw prohibido(c.estado === "devuelto"
            ? "Un contenido observado lo corrige solo su autor."
            : "Solo el autor, un director de área o el administrador pueden editar este contenido.");
        }
        if (!["devuelto", "publicado"].includes(c.estado)) {
          throw new ErrorNexo(c.estado === "rechazado"
            ? "Este contenido fue rechazado por la autoridad superior: para insistir, cargalo como un contenido nuevo."
            : "Solo se puede preparar una nueva versión de un contenido devuelto o publicado.", "estado_invalido");
        }
        const v = ultima(c);
        const fecha = ahora();
        c.borrador = {
          autorId: usuario.id, titulo: v.titulo, resumen: v.resumen, cuerpo: v.cuerpo, cuerpoHtml: v.cuerpoHtml || null, sitiosDestino: [...(c.sitiosDestino || [])], tipo: c.tipo,
          seccion: c.seccion, adjuntos: v.adjuntos.map((a) => ({ ...a, id: a.id || nuevoId("a") })),
          // hereda la prioridad vigente, salvo una urgencia cuya fecha ya pasó
          prioridad: esUrgente(c.prioridad) && !(c.prioridad.vence && Date.parse(c.prioridad.vence) < Date.now())
            ? { nivel: "urgente", motivo: c.prioridad.motivo || "", vence: c.prioridad.vence || null }
            : { ...PRIORIDAD_NORMAL },
          iniciado: fecha, actualizado: fecha,
        };
        c.historial.push(evento("borrador_creado", usuario.id, c.versiones.length + 1, ""));
        return vistaPara(c, usuario);
      });
    },

    guardarBorrador(id, entrada) {
      return mutar((datos, usuario) => {
        const c = borradorPropio(datos, id, usuario);
        const sinEnviar = c.versiones.length === 0;
        const d = validarBorrador(entrada, { conSlug: sinEnviar });
        if (sinEnviar && d.slug && datos.contenidos.some((x) => x.id !== id && x.slug === d.slug)) throw slugDuplicado();
        Object.assign(c.borrador, {
          titulo: d.titulo, resumen: d.resumen, cuerpo: d.cuerpo, cuerpoHtml: d.cuerpoHtml, sitiosDestino: d.sitiosDestino, tipo: d.tipo, seccion: d.seccion,
          actualizado: ahora(),
        });
        if (d.prioridad) c.borrador.prioridad = d.prioridad;
        if (sinEnviar) Object.assign(c, { slug: d.slug, sitiosDestino: d.sitiosDestino, tipo: d.tipo, seccion: d.seccion });
        return vistaPara(c, usuario);
      });
    },

    /** En la demo el archivo se guarda en el navegador (IndexedDB): se puede ver, descargar y quitar. */
    async agregarAdjuntosBorrador(id, entrantes) {
      const nuevos = entrantes.map((archivo) => ({ id: nuevoId("a"), archivo }));
      const resultado = await mutar((datos, usuario) => {
        const c = borradorPropio(datos, id, usuario);
        if (c.borrador.adjuntos.length + nuevos.length > MAX_ADJUNTOS) {
          throw new ErrorNexo(`Se permiten hasta ${MAX_ADJUNTOS} adjuntos por versión.`, "datos_invalidos");
        }
        const version = c.versiones.length + 1;
        for (const { id: idAdjunto, archivo } of nuevos) {
          const nombre = String(archivo.nombre || archivo.name);
          c.borrador.adjuntos.push({
            id: idAdjunto, nombre, tamano: Number(archivo.tamano ?? archivo.size) || 0, esImagen: esImagenNombre(nombre),
          });
          c.historial.push(evento("adjunto_agregado", usuario.id, version, nombre));
        }
        c.borrador.actualizado = ahora();
        return vistaPara(c, usuario);
      });
      if (archivos()) {
        for (const { id: idAdjunto, archivo } of nuevos) if (archivo instanceof Blob) await archivos().guardar(idAdjunto, archivo);
      }
      return resultado;
    },

    quitarAdjuntoBorrador(id, adjuntoId) {
      return mutar((datos, usuario) => {
        const c = borradorPropio(datos, id, usuario);
        const adjunto = c.borrador.adjuntos.find((a) => a.id === adjuntoId);
        if (!adjunto) throw new ErrorNexo("Ese archivo no está en el borrador.", "no_encontrado");
        c.borrador.adjuntos = c.borrador.adjuntos.filter((a) => a.id !== adjuntoId);
        c.borrador.actualizado = ahora();
        c.historial.push(evento("adjunto_quitado", usuario.id, c.versiones.length + 1, adjunto.nombre));
        // si ninguna versión enviada lo usa, se elimina de verdad (como en el servidor)
        const usado = c.versiones.some((v) => v.adjuntos.some((a) => a.id === adjuntoId));
        return { contenido: vistaPara(c, usuario), eliminar: usado ? [] : [adjuntoId] };
      }).then(async ({ contenido, eliminar }) => {
        if (archivos() && eliminar.length) await archivos().borrar(eliminar);
        return contenido;
      });
    },

    enviarBorrador(id) {
      return mutar((datos, usuario) => {
        const c = borradorPropio(datos, id, usuario);
        const sinEnviar = c.versiones.length === 0;
        if (!sinEnviar && !["devuelto", "publicado"].includes(c.estado)) {
          throw new ErrorNexo("El contenido cambió de estado mientras preparabas el borrador: ya no admite una nueva versión.", "estado_invalido");
        }
        const b = c.borrador;
        const v = validarDatos({ ...b, slug: c.slug, adjuntos: b.adjuntos }, { conSlug: sinEnviar });
        const pri = validarPrioridad(b.prioridad || null); // al enviar, la fecha no puede estar vencida
        const previa = sinEnviar ? null : ultima(c);
        if (previa && previa.estado === "devuelta") previa.estado = "conservada";
        const numero = c.versiones.length + 1;
        const fecha = ahora();
        observacionesDe(c, datos.usuarios);
        atenderObservaciones(c, numero, fecha);
        Object.assign(c, {
          // lo publicado (c.publicada) conserva su destino hasta que se apruebe esta versión
          sitiosDestino: v.sitiosDestino, tipo: v.tipo, seccion: v.seccion, estado: "en_revision", actualizado: fecha, borrador: null,
          prioridad: registroPrioridad(pri, usuario.id),
        });
        c.versiones.push({
          numero, autorId: usuario.id, fecha, titulo: v.titulo, resumen: v.resumen, cuerpo: v.cuerpo, cuerpoHtml: v.cuerpoHtml || null,
          adjuntos: b.adjuntos.map((a) => ({ ...a })), estado: "en_revision", revision: null, decision: null,
        });
        c.historial.push(evento("envio", usuario.id, numero, notaEnvio(pri)));
        return vistaPara(c, usuario);
      });
    },

    descartarBorrador(id) {
      return mutar((datos, usuario) => {
        const c = borradorPropio(datos, id, usuario);
        c.historial.push(evento("borrador_descartado", usuario.id, c.versiones.length + 1, ""));
        const usados = new Set(c.versiones.flatMap((v) => v.adjuntos.map((a) => a.id)));
        const eliminar = c.borrador.adjuntos.map((a) => a.id).filter((x) => !usados.has(x));
        c.borrador = null;
        if (c.versiones.length === 0) Object.assign(c, { estado: "descartado", slug: null });
        return { contenido: vistaPara(c, usuario), eliminar };
      }).then(async ({ contenido, eliminar }) => {
        if (archivos() && eliminar.length) await archivos().borrar(eliminar);
        return contenido;
      });
    },

    crearContenido(entrada) {
      return mutar((datos, usuario) => {
        exigir(usuario, "crear");
        const v = validarDatos(entrada, { conSlug: true });
        const pri = validarPrioridad(entrada.prioridad);
        if (datos.contenidos.some((c) => c.slug === v.slug)) {
          throw new ErrorNexo("Ya existe un contenido con ese identificador web.", "slug_duplicado");
        }
        const fecha = ahora();
        const contenido = {
          id: nuevoId("c"), sitiosDestino: v.sitiosDestino, tipo: v.tipo, seccion: v.seccion, slug: v.slug, autorId: usuario.id,
          estado: "en_revision", creado: fecha, actualizado: fecha, publicada: null, prioridad: registroPrioridad(pri, usuario.id),
          versiones: [{
            numero: 1, autorId: usuario.id, fecha, titulo: v.titulo, resumen: v.resumen,
            cuerpo: v.cuerpo, cuerpoHtml: v.cuerpoHtml || null, adjuntos: v.adjuntos, estado: "en_revision", revision: null, decision: null,
          }],
          historial: [evento("envio", usuario.id, 1, notaEnvio(pri))],
        };
        datos.contenidos.push(contenido);
        return vistaPara(contenido, usuario);
      });
    },

    enviarNuevaVersion(id, entrada) {
      return mutar((datos, usuario) => {
        const contenido = buscar(datos, id);
        if (!puedeReenviar(usuario, contenido)) {
          throw prohibido(contenido.estado === "devuelto"
            ? "Un contenido observado lo corrige solo su autor."
            : "Solo el autor, un director de área o el administrador pueden editar este contenido.");
        }
        if (contenido.borrador) {
          throw new ErrorNexo("Hay un borrador de la nueva versión en preparación: enviala desde el borrador.", "estado_invalido");
        }
        if (!["devuelto", "publicado"].includes(contenido.estado)) {
          throw new ErrorNexo(contenido.estado === "rechazado"
            ? "Este contenido fue rechazado por la autoridad superior: para insistir, cargalo como un contenido nuevo."
            : "Solo se puede enviar una nueva versión de un contenido devuelto o publicado.", "estado_invalido");
        }
        const v = validarDatos(entrada, { conSlug: false });
        const pri = "prioridad" in entrada ? validarPrioridad(entrada.prioridad) : validarPrioridad(contenido.prioridad || null, { estricta: false });
        const previa = ultima(contenido);
        if (previa.estado === "devuelta") previa.estado = "conservada";
        const numero = previa.numero + 1;
        observacionesDe(contenido, datos.usuarios);
        atenderObservaciones(contenido, numero, ahora());
        contenido.sitiosDestino = v.sitiosDestino;
        contenido.tipo = v.tipo;
        contenido.seccion = v.seccion;
        contenido.versiones.push({
          numero, autorId: usuario.id, fecha: ahora(), titulo: v.titulo, resumen: v.resumen,
          cuerpo: v.cuerpo, cuerpoHtml: v.cuerpoHtml || null, adjuntos: v.adjuntos, estado: "en_revision", revision: null, decision: null,
        });
        contenido.estado = "en_revision";
        contenido.actualizado = ahora();
        contenido.prioridad = registroPrioridad(pri, usuario.id);
        contenido.historial.push(evento("envio", usuario.id, numero, notaEnvio(pri)));
        return vistaPara(contenido, usuario);
      });
    },

    /** Nivel 2: revisión de dirección. Eleva a la autoridad superior o devuelve al autor. */
    revisar(id, { decision, comentario }) {
      return mutar((datos, usuario) => {
        if (!puede(usuario, "revisar")) {
          throw prohibido("Solo un director de área o el administrador pueden hacer la revisión de dirección.");
        }
        const contenido = buscar(datos, id);
        if (contenido.estado !== "en_revision") {
          throw new ErrorNexo("Este contenido ya no está pendiente de la revisión de dirección.", "estado_invalido");
        }
        if (!puedeRevisar(usuario, contenido)) throw prohibido("No podés revisar un contenido que cargaste o editaste vos.");
        const texto = String(comentario ?? "").trim().slice(0, MAX_OBSERVACION);
        if (!["elevar", "devolver"].includes(decision)) {
          throw new ErrorNexo("En la revisión de dirección solo se puede elevar o devolver.", "datos_invalidos");
        }
        if (decision === "devolver" && !texto) {
          throw new ErrorNexo("Para devolver un contenido hay que explicar qué debe ajustarse.", "datos_invalidos");
        }
        const elevar = decision === "elevar";
        const tipo = elevar ? "elevacion" : "devolucion";
        const version = ultima(contenido);
        const fecha = ahora();
        version.estado = elevar ? "elevada" : "devuelta";
        version.revision = { tipo, usuarioId: usuario.id, fecha, comentario: texto };
        contenido.estado = elevar ? "elevado" : "devuelto";
        contenido.actualizado = fecha;
        observacionesDe(contenido, datos.usuarios);
        if (!elevar) observar(contenido, usuario, "direccion", texto, version.numero, fecha);
        contenido.historial.push(evento(tipo, usuario.id, version.numero, texto));
        return vistaPara(contenido, usuario);
      });
    },

    /** Nivel 3: decisión final de la autoridad superior sobre lo elevado. */
    decidir(id, { decision, comentario }) {
      return mutar((datos, usuario) => {
        if (!puede(usuario, "decidir")) throw prohibido("Solo la autoridad superior o el administrador pueden tomar la decisión final.");
        const contenido = buscar(datos, id);
        if (contenido.estado === "elevado" && !puedeDecidir(usuario, contenido)) {
          throw prohibido("Elevaste vos esta versión: la decisión final la toma otra persona (la autoridad superior u otro administrador).");
        }
        if (contenido.estado !== "elevado") {
          throw new ErrorNexo(contenido.estado === "en_revision"
            ? "Este contenido todavía no pasó por la revisión de un director de área."
            : "Este contenido ya no está pendiente de la decisión final.", "estado_invalido");
        }
        const DESTINO = {
          aprobar: ["aprobacion", "aprobado", "aprobada"],
          devolver: ["devolucion", "devuelto", "devuelta"],
          rechazar: ["rechazo", "rechazado", "rechazada"],
        };
        if (!DESTINO[decision]) throw new ErrorNexo("La decisión indicada no es válida.", "datos_invalidos");
        const texto = String(comentario ?? "").trim().slice(0, MAX_OBSERVACION);
        if (decision !== "aprobar" && !texto) {
          throw new ErrorNexo(decision === "rechazar"
            ? "Para rechazar un contenido hay que dejar asentado el motivo."
            : "Para devolver un contenido hay que explicar qué debe ajustarse.", "datos_invalidos");
        }
        const [tipo, estadoContenido, estadoVersion] = DESTINO[decision];
        const version = ultima(contenido);
        const fecha = ahora();
        if (decision === "aprobar") exigirDestino(contenido);
        version.estado = estadoVersion;
        version.decision = { tipo, usuarioId: usuario.id, fecha, comentario: texto };
        contenido.estado = estadoContenido;
        contenido.actualizado = fecha;
        observacionesDe(contenido, datos.usuarios);
        if (decision === "devolver") observar(contenido, usuario, "autoridad", texto, version.numero, fecha);
        contenido.historial.push(evento(tipo, usuario.id, version.numero, texto));
        // aprobar publica en el mismo paso, en los sitios elegidos (como el servidor)
        if (decision === "aprobar") hacerVisible(contenido, usuario, fecha, "Publicación automática al aprobar");
        return vistaPara(contenido, usuario);
      });
    },

    publicar(id) {
      return mutar((datos, usuario) => {
        if (!puede(usuario, "publicar")) throw prohibido("Solo la autoridad superior o el administrador pueden publicar en la web.");
        const contenido = buscar(datos, id);
        if (contenido.estado !== "aprobado") {
          throw new ErrorNexo("Solo se puede publicar un contenido aprobado.", "estado_invalido");
        }
        exigirDestino(contenido);
        hacerVisible(contenido, usuario, ahora(), "");
        return vistaPara(contenido, usuario);
      });
    },

    /** Dar de baja (borrado lógico): deja de verse en los sitios en el acto y conserva todo el registro. */
    archivar(id, motivo) {
      return mutar((datos, usuario) => {
        const nota = String(motivo ?? "").trim().slice(0, 600);
        if (nota.length < 3) throw new ErrorNexo("Contá brevemente el motivo de la baja: queda registrado en el historial.", "datos_invalidos");
        const contenido = buscar(datos, id);
        if (!puedeDarDeBaja(usuario, contenido)) {
          throw prohibido("Solo el autor, un director de área, el administrador o la autoridad superior pueden dar de baja este contenido.");
        }
        if (contenido.estado === "archivado") throw new ErrorNexo("El contenido ya está dado de baja.", "estado_invalido");
        if (["borrador", "descartado"].includes(contenido.estado)) {
          throw new ErrorNexo("Un borrador todavía no entró al circuito: no hay nada que dar de baja (descartalo desde «Borradores»).", "estado_invalido");
        }
        contenido.versiones.forEach((v) => { if (v.estado === "publicada") v.estado = "archivada"; });
        contenido.publicada = null;
        contenido.estado = "archivado";
        contenido.actualizado = ahora();
        contenido.historial.push(evento("archivo", usuario.id, ultima(contenido).numero, nota));
        return vistaPara(contenido, usuario);
      });
    },

    /** Reactivar: vuelve al circuito (si estaba publicado, queda aprobado y la autoridad lo publica de nuevo). */
    restaurar(id) {
      return mutar((datos, usuario) => {
        const contenido = buscar(datos, id);
        if (!puedeDarDeBaja(usuario, contenido)) {
          throw prohibido("Solo el autor, un director de área, el administrador o la autoridad superior pueden reactivar este contenido.");
        }
        if (contenido.estado !== "archivado") throw new ErrorNexo("El contenido no está dado de baja.", "estado_invalido");
        const version = ultima(contenido);
        const mapa = {
          en_revision: "en_revision", elevada: "elevado", devuelta: "devuelto", aprobada: "aprobado", rechazada: "rechazado",
        };
        if (mapa[version.estado]) {
          contenido.estado = mapa[version.estado];
        } else {
          version.estado = "aprobada";
          contenido.estado = "aprobado";
        }
        contenido.actualizado = ahora();
        contenido.historial.push(evento("restauracion", usuario.id, version.numero, ""));
        return vistaPara(contenido, usuario);
      });
    },

    /* Vista pública: no requiere sesión y solo expone lo publicado. */
    publico: {
      /** Lo aprobado para un sitio (obligatorio). Los avisos urgentes vigentes primero; { urgentes: true } devuelve solo esos. */
      async listar({ sitio, urgentes = false } = {}) {
        await demora();
        if (!existeSitio(sitio)) throw new ErrorNexo("El sitio indicado no existe.", "no_encontrado");
        const publicaciones = leer().contenidos.filter((c) => c.publicada && (c.publicada.sitios || []).includes(sitio))
          .map((c) => publicacion(c.publicada));
        publicaciones.sort((a, b) => Number(b.urgente) - Number(a.urgente) || new Date(b.fecha) - new Date(a.fecha));
        return clonar(urgentes ? publicaciones.filter((p) => p.urgente) : publicaciones);
      },

      async obtener(sitio, slug) {
        await demora();
        if (!existeSitio(sitio)) throw new ErrorNexo("El sitio indicado no existe.", "no_encontrado");
        const contenido = leer().contenidos.find((c) => c.publicada && c.slug === slug && (c.publicada.sitios || []).includes(sitio));
        if (!contenido) throw new ErrorNexo("La publicación no existe en este sitio o ya no está disponible.", "no_encontrado");
        return clonar(publicacion(contenido.publicada));
      },
    },
  };


  /* =====================================================================
   * Auditoría en modo demo. Mismo catálogo y mismas frases que backend/src/auditoria/catalogo.js.
   * Los métodos que cambian algo se envuelven: al terminar (bien o rechazados) dejan su registro, como hace
   * el middleware en el servidor. Con servidor, api-servidor.js reemplaza estos métodos y la auditoría la
   * lleva el backend (no se registra dos veces).
   * ===================================================================== */

  const CLAVE_AUDITORIA = "nexo.auditoria.v1";
  const MODULOS_AUDITORIA = ["Acceso", "Borradores", "Revisión editorial", "Publicaciones", "Archivos adjuntos", "Gobernanza", "Auditoría"];
  const ACCIONES_AUDITORIA = {
    "sesion.inicio": ["Inició sesión", "Acceso"],
    "sesion.fallida": ["Intento de ingreso fallido", "Acceso"],
    "sesion.cierre": ["Cerró sesión", "Acceso"],
    "borrador.crear": ["Creó borrador de contenido", "Borradores"],
    "borrador.nueva_version": ["Empezó una nueva versión", "Borradores"],
    "borrador.editar": ["Editó un borrador", "Borradores"],
    "borrador.adjuntar": ["Adjuntó archivo", "Borradores"],
    "borrador.quitar_adjunto": ["Quitó archivo", "Borradores"],
    "borrador.enviar": ["Envió a revisión", "Borradores"],
    "borrador.descartar": ["Descartó borrador", "Borradores"],
    "contenido.crear_y_enviar": ["Cargó y envió contenido", "Borradores"],
    "contenido.enviar_version": ["Envió nueva versión", "Borradores"],
    "revision.elevar": ["Elevó a la autoridad superior", "Revisión editorial"],
    "revision.devolver": ["Pidió cambios (dirección)", "Revisión editorial"],
    "decision.aprobar": ["Aprobó y publicó", "Revisión editorial"],
    "decision.devolver": ["Devolvió al autor (autoridad)", "Revisión editorial"],
    "decision.rechazar": ["Rechazó contenido", "Revisión editorial"],
    "contenido.prioridad": ["Cambió la prioridad", "Revisión editorial"],
    "contenido.publicar": ["Publicó en la web", "Publicaciones"],
    "contenido.archivar": ["Dio de baja un contenido", "Publicaciones"],
    "contenido.restaurar": ["Reactivó un contenido", "Publicaciones"],
    "adjunto.ver": ["Abrió archivo", "Archivos adjuntos"],
    "adjunto.descargar": ["Descargó archivo", "Archivos adjuntos"],
    "equipo.agregar": ["Agregó integrante", "Gobernanza"],
    "equipo.editar": ["Editó datos de integrante", "Gobernanza"],
    "equipo.cambiar_rol": ["Cambió rol", "Gobernanza"],
    "equipo.baja": ["Dio de baja a integrante", "Gobernanza"],
    "auditoria.exportar": ["Exportó la auditoría", "Auditoría"],
  };
  const ETIQUETAS_CAMPO = {
    titulo: "título", resumen: "resumen", cuerpo: "texto", cuerpoHtml: "formato del texto", sitiosDestino: "sitios", tipo: "tipo", seccion: "categoría",
    slug: "identificador web", nombre: "nombre", email: "correo", telefono: "teléfono", area: "área",
  };
  const comillas = (t) => (t ? `«${t}»` : "un contenido sin título");
  function enumerar(xs) {
    if (xs.length <= 1) return xs.join("");
    const ultimo = xs[xs.length - 1];
    return `${xs.slice(0, -1).join(", ")} ${/^(i|hi)(?!e)/i.test(ultimo) ? "e" : "y"} ${ultimo}`;
  }
  const tituloDe = (c) => (!c ? null : (c.borrador && c.borrador.titulo) || (c.versiones && c.versiones.length ? c.versiones[c.versiones.length - 1].titulo : null));
  const conNota = (texto, ok, nota) => (ok && typeof nota === "string" && nota.trim() ? `${texto}: “${nota.trim().slice(0, 160)}”` : texto);
  const comparable = (x) => (Array.isArray(x) ? x.join(",") : x ?? "");
  const cambiados = (antes = {}, despues = {}, campos) => {
    const lista = campos.filter((c) => c in despues && comparable(antes[c]) !== comparable(despues[c]));
    // si cambió el texto también cambió su HTML: "formato del texto" solo cuando se tocó únicamente el formato
    return lista.filter((c) => !(c === "cuerpoHtml" && lista.includes("cuerpo"))).map((c) => ETIQUETAS_CAMPO[c]);
  };

  /** En la demo no hay red: el "lugar" es este navegador. */
  function ubicacionDemo() {
    const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
    const nombre = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navegador";
    const so = /Windows/.test(ua) ? " en Windows" : /Android/.test(ua) ? " en Android" : /iPhone|iPad/.test(ua) ? " en iOS" : /Mac OS X/.test(ua) ? " en macOS" : /Linux/.test(ua) ? " en Linux" : "";
    return { ubicacion: { ip: "127.0.0.1", red: "Equipo local", sede: "Modo demostración", pais: null }, navegador: nombre + so };
  }

  const identidadDe = (u) => (u ? { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol } : { id: null, nombre: null, email: null, rol: null });

  function nuevoRegistro({ usuario, accion, detalle, resultado = "ok", motivo = null, objeto = null, metodo = "POST", ruta = "", fecha = null, ubicacion = null }) {
    const lugar = ubicacionDemo();
    const [etiqueta, modulo] = ACCIONES_AUDITORIA[accion];
    return {
      id: nuevoId("l"), fecha: fecha || new Date().toISOString(), usuario: identidadDe(usuario), accion, accionEtiqueta: etiqueta, modulo,
      detalle: String(detalle || etiqueta).slice(0, 400), resultado, motivo, objeto,
      ubicacion: ubicacion || lugar.ubicacion,
      peticion: { metodo, ruta, estado: resultado === "ok" ? 200 : 403, duracionMs: 0, navegador: lugar.navegador },
    };
  }

  /** Actividad de ejemplo: se arma a partir del historial de los contenidos de la semilla. */
  function semillaAuditoria(datos) {
    const persona = (id) => datos.usuarios.find((u) => u.id === id);
    const registros = [];
    const red = (ip, sede) => ({ ip, red: "Red interna", sede, pais: null });
    const lugares = { u1: red("10.0.1.15", "Sede Central"), u2: red("10.0.1.22", "Sede Central"), u5: red("10.0.1.8", "Sede Central"),
      u3: red("10.0.2.31", "Residencia Mama Antula"), u4: red("10.0.2.40", "Residencia Mama Antula") };
    for (const c of datos.contenidos) {
      for (const e of c.historial) {
        const v = c.versiones.find((x) => x.numero === e.version);
        const titulo = (v && v.titulo) || (c.borrador && c.borrador.titulo);
        const quien = persona(e.usuarioId);
        const MAPA = {
          borrador_creado: ["borrador.crear", `Creó el borrador ${comillas(titulo)}`],
          adjunto_agregado: ["borrador.adjuntar", `Adjuntó ${e.comentario} al borrador ${comillas(titulo)}`],
          envio: ["borrador.enviar", `Envió a revisión ${comillas(titulo)} (versión ${e.version})`],
          elevacion: ["revision.elevar", conNota(`Elevó ${comillas(titulo)} a la autoridad superior`, true, e.comentario)],
          devolucion: [quien && quien.rol === "autoridad" ? "decision.devolver" : "revision.devolver", conNota(`Pidió cambios en ${comillas(titulo)}`, true, e.comentario)],
          aprobacion: ["decision.aprobar", `Aprobó ${comillas(titulo)}`],
          rechazo: ["decision.rechazar", conNota(`Rechazó ${comillas(titulo)}`, true, e.comentario)],
          publicacion: ["contenido.publicar", `Publicó ${comillas(titulo)} (versión ${e.version})`],
          archivo: ["contenido.archivar", conNota(`Dio de baja ${comillas(titulo)}`, true, e.comentario)],
          restauracion: ["contenido.restaurar", `Reactivó ${comillas(titulo)}`],
        };
        if (!MAPA[e.tipo] || !quien) continue;
        registros.push(nuevoRegistro({ usuario: quien, accion: MAPA[e.tipo][0], detalle: MAPA[e.tipo][1], fecha: e.fecha,
          objeto: { tipo: "contenido", id: c.id, titulo }, ruta: `/api/contenidos/${c.id}`, ubicacion: lugares[quien.id] }));
      }
    }
    for (const u of datos.usuarios) {
      if (u.ultimoAcceso) registros.push(nuevoRegistro({ usuario: u, accion: "sesion.inicio", detalle: "Inició sesión", fecha: u.ultimoAcceso, ruta: "/api/auth/login", ubicacion: lugares[u.id] }));
    }
    // dos intentos rechazados, para que el filtro por resultado tenga qué mostrar
    registros.push(nuevoRegistro({ usuario: persona("u4"), accion: "adjunto.descargar", resultado: "rechazado",
      detalle: "Intentó descargar logoMA.png de «Las escuelas podrán visitar a los abuelos»", metodo: "GET", ruta: "/api/adjuntos/a-logo",
      motivo: "Este archivo solo lo pueden abrir su autor y quienes revisan el contenido.", fecha: "2026-09-18T12:40:00-03:00",
      objeto: { tipo: "adjunto", id: "a-logo", titulo: "logoMA.png" }, ubicacion: lugares.u4 }));
    registros.push(nuevoRegistro({ usuario: { id: null, nombre: null, email: "admin@ejemplo.com", rol: null }, accion: "sesion.fallida", resultado: "rechazado",
      detalle: "Intento de ingreso con correo o contraseña incorrectos", motivo: "Correo o contraseña incorrectos.", ruta: "/api/auth/login",
      fecha: "2026-09-18T03:12:00-03:00", ubicacion: { ip: "181.47.10.200", red: "Internet", sede: null, pais: "AR" } }));
    return registros.sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  }

  function leerAuditoria() {
    let lista = null;
    try { lista = JSON.parse(localStorage.getItem(CLAVE_AUDITORIA)); } catch (e) { lista = null; }
    if (!Array.isArray(lista)) {
      lista = semillaAuditoria(leer());
      guardarAuditoria(lista);
    }
    return lista;
  }
  const guardarAuditoria = (lista) => localStorage.setItem(CLAVE_AUDITORIA, JSON.stringify(lista.slice(0, 3000)));
  const registrar = (datos) => { const lista = leerAuditoria(); lista.unshift(nuevoRegistro(datos)); guardarAuditoria(lista); };

  /** Completa los parámetros de la ruta con los valores reales (como se ven en el servidor). */
  const conRuta = (d, args) => (d && d.ruta
    ? { ...d, ruta: d.ruta.replace(":id", encodeURIComponent(String(args[0] ?? ""))).replace(":adjuntoId", encodeURIComponent(String(args[1] ?? ""))) }
    : d);

  /** Envuelve un método de la API: registra el movimiento cuando termina, bien o rechazado. */
  function auditar(nombre, describir, { previo } = {}) {
    const original = api[nombre];
    api[nombre] = async function (...args) {
      const antes = leer();
      const usuario = usuarioActual(antes);
      const anterior = previo ? clonar(previo(antes, args)) : null;
      try {
        const r = await original.apply(api, args);
        const quien = nombre === "iniciarSesion" ? usuarioActual(leer()) : usuario;
        const d = conRuta(describir({ args, r, anterior, ok: true }), args);
        if (d && quien) registrar({ usuario: quien, ...d });
        return r;
      } catch (err) {
        if (usuario && err.codigo !== "sin_sesion") {
          const d = conRuta(describir({ args, r: null, anterior, ok: false }), args);
          if (d) registrar({ usuario, ...d, resultado: "rechazado", motivo: String(err.message).slice(0, 300) });
        }
        throw err;
      }
    };
  }

  const contenidoPorId = (datos, args) => datos.contenidos.find((c) => c.id === args[0]) || null;
  const personaPorId = (datos, args) => datos.usuarios.find((u) => u.id === args[0]) || null;
  const objContenido = (c, r) => ((r || c) ? { tipo: "contenido", id: (r || c).id, titulo: tituloDe(r) || tituloDe(c) } : null);

  auditar("iniciarSesion", () => ({ accion: "sesion.inicio", detalle: "Inició sesión", ruta: "/api/auth/login" }));
  auditar("cerrarSesion", () => ({ accion: "sesion.cierre", detalle: "Cerró sesión", ruta: "/api/auth/logout" }));
  auditar("crearBorrador", ({ r, ok }) => ({ accion: "borrador.crear", detalle: ok ? `Creó el borrador ${comillas(tituloDe(r))}` : "Intentó crear un borrador", objeto: objContenido(null, r), ruta: "/api/borradores" }));
  auditar("iniciarBorradorDeVersion", ({ anterior, r }) => ({ accion: "borrador.nueva_version",
    detalle: `Empezó la versión ${((anterior && anterior.versiones.length) || 0) + 1} de ${comillas(tituloDe(anterior))}`, objeto: objContenido(anterior, r), ruta: "/api/contenidos/:id/borrador" }), { previo: contenidoPorId });
  auditar("guardarBorrador", ({ anterior, r, ok }) => {
    const titulo = tituloDe(r || anterior);
    const lista = ok ? cambiados({ ...(anterior && anterior.borrador), slug: anterior && anterior.slug }, r.borrador, ["titulo", "resumen", "cuerpo", "cuerpoHtml", "sitiosDestino", "tipo", "seccion", "slug"]) : [];
    if (ok && !prioridadesIguales(anterior && anterior.borrador && anterior.borrador.prioridad, r.borrador.prioridad)) lista.push(`prioridad (${describirPrioridad(r.borrador.prioridad)})`);
    const detalle = !ok ? `Intentó editar el borrador ${comillas(titulo)}`
      : lista.length ? `Editó ${enumerar(lista)} del borrador ${comillas(titulo)}` : `Guardó el borrador ${comillas(titulo)} sin cambios`;
    return { accion: "borrador.editar", detalle, objeto: objContenido(anterior, r), metodo: "PUT", ruta: "/api/contenidos/:id/borrador" };
  }, { previo: contenidoPorId });
  auditar("agregarAdjuntosBorrador", ({ args, anterior, r, ok }) => ({ accion: "borrador.adjuntar",
    detalle: `${ok ? "Adjuntó" : "Intentó adjuntar"} ${enumerar(args[1].map((a) => a.name || a.nombre))} al borrador ${comillas(tituloDe(anterior))}`,
    objeto: objContenido(anterior, r), ruta: "/api/contenidos/:id/borrador/adjuntos" }), { previo: contenidoPorId });
  auditar("quitarAdjuntoBorrador", ({ args, anterior, r, ok }) => {
    const a = anterior && anterior.borrador && anterior.borrador.adjuntos.find((x) => x.id === args[1]);
    return { accion: "borrador.quitar_adjunto", detalle: `${ok ? "Quitó" : "Intentó quitar"} ${a ? a.nombre : "un archivo"} del borrador ${comillas(tituloDe(anterior))}`,
      objeto: objContenido(anterior, r), metodo: "DELETE", ruta: "/api/contenidos/:id/borrador/adjuntos/:adjuntoId" };
  }, { previo: contenidoPorId });
  auditar("enviarBorrador", ({ anterior, r, ok }) => ({ accion: "borrador.enviar",
    detalle: ok ? `Envió a revisión ${comillas(tituloDe(r))} (versión ${r.versiones.length})${esUrgente(r.prioridad) ? " como urgente" : ""}` : `Intentó enviar a revisión ${comillas(tituloDe(anterior))}`,
    objeto: objContenido(anterior, r), ruta: "/api/contenidos/:id/borrador/enviar" }), { previo: contenidoPorId });
  auditar("cambiarPrioridad", ({ args, anterior, ok }) => {
    const titulo = comillas(tituloDe(anterior));
    const pedida = args[1] || {};
    if (!ok) return { accion: "contenido.prioridad", detalle: `Intentó cambiar a ${pedida.nivel === "urgente" ? "urgente" : "normal"} la prioridad de ${titulo}`,
      objeto: objContenido(anterior), metodo: "PATCH", ruta: "/api/contenidos/:id/prioridad" };
    const antes = describirPrioridad(anterior && anterior.prioridad);
    const despues = describirPrioridad(validarPrioridad(pedida, { estricta: false }));
    return { accion: "contenido.prioridad", metodo: "PATCH", ruta: "/api/contenidos/:id/prioridad", objeto: objContenido(anterior),
      detalle: antes === despues ? `Confirmó la prioridad ${despues} de ${titulo}` : `Cambió la prioridad de ${titulo}: de ${antes} a ${despues}` };
  }, { previo: contenidoPorId });
  auditar("descartarBorrador", ({ anterior }) => ({ accion: "borrador.descartar", detalle: `Descartó el borrador ${comillas(tituloDe(anterior))}`,
    objeto: objContenido(anterior), metodo: "DELETE", ruta: "/api/contenidos/:id/borrador" }), { previo: contenidoPorId });
  auditar("crearContenido", ({ r, ok }) => ({ accion: "contenido.crear_y_enviar", detalle: ok ? `Cargó y envió a revisión ${comillas(tituloDe(r))}` : "Intentó cargar un contenido", objeto: objContenido(null, r), ruta: "/api/contenidos" }));
  auditar("enviarNuevaVersion", ({ anterior, r, ok }) => ({ accion: "contenido.enviar_version",
    detalle: ok ? `Envió la versión ${r.versiones.length} de ${comillas(tituloDe(r))}` : `Intentó enviar una nueva versión de ${comillas(tituloDe(anterior))}`,
    objeto: objContenido(anterior, r), ruta: "/api/contenidos/:id/versiones" }), { previo: contenidoPorId });
  auditar("revisar", ({ args, anterior, ok }) => {
    const devolver = args[1] && args[1].decision === "devolver";
    const t = comillas(tituloDe(anterior));
    const texto = ok ? (devolver ? `Pidió cambios en ${t}` : `Elevó ${t} a la autoridad superior`) : (devolver ? `Intentó pedir cambios en ${t}` : `Intentó elevar ${t}`);
    return { accion: devolver ? "revision.devolver" : "revision.elevar", detalle: conNota(texto, ok, args[1] && args[1].comentario), objeto: objContenido(anterior), ruta: "/api/contenidos/:id/revision" };
  }, { previo: contenidoPorId });
  auditar("decidir", ({ args, anterior, r, ok }) => {
    const d = args[1] && args[1].decision;
    const [hecho, intento, accion] = { aprobar: ["Aprobó", "aprobar", "decision.aprobar"], rechazar: ["Rechazó", "rechazar", "decision.rechazar"] }[d] || ["Devolvió al autor", "devolver", "decision.devolver"];
    const donde = ok && d === "aprobar" && r && r.publicada ? ` y lo publicó en ${enumerarSitios(r.publicada.sitios)}` : "";
    return { accion, detalle: conNota(`${ok ? hecho : `Intentó ${intento}`} ${comillas(tituloDe(anterior))}${donde}`, ok, args[1] && args[1].comentario), objeto: objContenido(anterior), ruta: "/api/contenidos/:id/decision" };
  }, { previo: contenidoPorId });
  auditar("publicar", ({ anterior, r, ok }) => ({ accion: "contenido.publicar",
    detalle: ok ? `Publicó ${comillas(tituloDe(r))} (versión ${r.publicada ? r.publicada.version : r.versiones.length})` : `Intentó publicar ${comillas(tituloDe(anterior))}`,
    objeto: objContenido(anterior, r), ruta: "/api/contenidos/:id/publicar" }), { previo: contenidoPorId });
  auditar("archivar", ({ args, anterior, ok }) => ({ accion: "contenido.archivar", detalle: conNota(`${ok ? "Dio de baja" : "Intentó dar de baja"} ${comillas(tituloDe(anterior))}`, ok, args[1]),
    objeto: objContenido(anterior), ruta: "/api/contenidos/:id" }), { previo: contenidoPorId });
  auditar("restaurar", ({ anterior, ok }) => ({ accion: "contenido.restaurar", detalle: `${ok ? "Reactivó" : "Intentó reactivar"} ${comillas(tituloDe(anterior))}`,
    objeto: objContenido(anterior), ruta: "/api/contenidos/:id/restaurar" }), { previo: contenidoPorId });
  auditar("agregarIntegrante", ({ args, r, ok }) => ({ accion: "equipo.agregar",
    detalle: ok ? `${r.reactivado ? "Reactivó" : "Agregó"} a ${r.nombre} (${r.email}) como ${ROLES[r.rol].nombre}` : `Intentó agregar a ${String(args[0].email || "un integrante").slice(0, 160)}`,
    objeto: ok ? { tipo: "usuario", id: r.id, titulo: r.nombre } : null, ruta: "/api/usuarios" }));
  auditar("editarIntegrante", ({ args, anterior, r, ok }) => {
    const quien = anterior ? anterior.nombre : "un integrante";
    const lista = ok ? cambiados(anterior || {}, r, ["nombre", "email", "telefono", "area"]) : [];
    return { accion: "equipo.editar", detalle: !ok ? `Intentó editar los datos de ${quien}` : lista.length ? `Editó ${enumerar(lista)} de ${quien}` : `Guardó los datos de ${quien} sin cambios`,
      objeto: { tipo: "usuario", id: args[0], titulo: quien }, metodo: "PATCH", ruta: "/api/usuarios/:id" };
  }, { previo: personaPorId });
  auditar("cambiarRol", ({ args, anterior, ok }) => {
    const quien = anterior ? anterior.nombre : "un integrante";
    const nuevo = ROLES[args[1]] ? ROLES[args[1]].nombre : "un rol inválido";
    return { accion: "equipo.cambiar_rol", detalle: ok ? `Cambió el rol de ${quien} de ${ROLES[anterior.rol].nombre} a ${nuevo}` : `Intentó cambiar el rol de ${quien} a ${nuevo}`,
      objeto: { tipo: "usuario", id: args[0], titulo: quien }, metodo: "PATCH", ruta: "/api/usuarios/:id/rol" };
  }, { previo: personaPorId });
  auditar("darDeBaja", ({ args, anterior, ok }) => ({ accion: "equipo.baja",
    detalle: `${ok ? "Dio de baja" : "Intentó dar de baja"} a ${anterior ? `${anterior.nombre} (${anterior.email})` : "un integrante"}`,
    objeto: { tipo: "usuario", id: args[0], titulo: anterior && anterior.nombre }, metodo: "DELETE", ruta: "/api/usuarios/:id" }), { previo: personaPorId });

  /* ---------- Consultas de auditoría (solo administrador) ---------- */

  const DIA_MS = 24 * 3600 * 1000;
  const inicioDia = (d) => Date.parse(`${d}T00:00:00.000-03:00`);
  const finDia = (d) => Date.parse(`${d}T23:59:59.999-03:00`);
  const hoyArgentina = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);

  function filtrarAuditoria(lista, f = {}) {
    const fechaValida = (x) => !x || /^\d{4}-\d{2}-\d{2}$/.test(x);
    if (!fechaValida(f.desde) || !fechaValida(f.hasta)) throw new ErrorNexo("La fecha no es válida.", "datos_invalidos");
    if (f.desde && f.hasta && f.desde > f.hasta) throw new ErrorNexo("La fecha «desde» es posterior a «hasta».", "datos_invalidos");
    const acciones = String(f.accion || "").split(",").filter(Boolean);
    const q = String(f.q || "").trim().toLowerCase();
    return lista.filter((r) => {
      const t = Date.parse(r.fecha);
      if (f.desde && t < inicioDia(f.desde)) return false;
      if (f.hasta && t > finDia(f.hasta)) return false;
      if (f.usuario && r.usuario.id !== f.usuario) return false;
      if (acciones.length && !acciones.includes(r.accion)) return false;
      if (f.modulo && r.modulo !== f.modulo) return false;
      if (f.resultado && r.resultado !== f.resultado) return false;
      if (q && ![r.detalle, r.usuario.nombre, r.usuario.email, r.ubicacion.ip].some((x) => String(x || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }

  function exigirAuditoria() {
    const usuario = usuarioActual(leer());
    if (!usuario) throw sinSesion();
    if (!puede(usuario, "auditoria")) throw prohibido("Solo el administrador puede consultar la auditoría.");
    return usuario;
  }

  Object.assign(api, {
    async catalogoAuditoria() {
      await demora();
      exigirAuditoria();
      return {
        modulos: MODULOS_AUDITORIA, resultados: ["ok", "rechazado", "error"],
        acciones: Object.entries(ACCIONES_AUDITORIA).map(([id, [etiqueta, modulo]]) => ({ id, etiqueta, modulo })),
      };
    },

    async consultarAuditoria(f = {}) {
      await demora();
      exigirAuditoria();
      const filtrados = filtrarAuditoria(leerAuditoria(), f);
      const porPagina = [10, 25, 50, 100].includes(Number(f.porPagina)) ? Number(f.porPagina) : 25;
      const paginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
      const pagina = Math.min(Math.max(1, Number(f.pagina) || 1), paginas);
      return { registros: clonar(filtrados.slice((pagina - 1) * porPagina, pagina * porPagina)), total: filtrados.length, pagina, paginas, porPagina };
    },

    async resumenAuditoria() {
      await demora();
      exigirAuditoria();
      const lista = leerAuditoria();
      const desdeHoy = inicioDia(hoyArgentina());
      const ahoraMs = Date.now();
      const hoy = lista.filter((r) => Date.parse(r.fecha) >= desdeHoy);
      return {
        movimientosHoy: hoy.length,
        integrantesActivosHoy: new Set(hoy.filter((r) => r.resultado === "ok" && r.usuario.id).map((r) => r.usuario.id)).size,
        ingresosFallidos24h: lista.filter((r) => r.accion === "sesion.fallida" && Date.parse(r.fecha) >= ahoraMs - DIA_MS).length,
        accionesRechazadas7d: lista.filter((r) => r.resultado === "rechazado" && r.accion !== "sesion.fallida" && Date.parse(r.fecha) >= ahoraMs - 7 * DIA_MS).length,
      };
    },

    /** Todas las personas, también las dadas de baja, con contacto y actividad de los últimos 30 días. */
    async directorio() {
      await demora();
      exigirAuditoria();
      const lista = leerAuditoria();
      const desde = Date.now() - 30 * DIA_MS;
      return clonar(leer().usuarios.map((u) => {
        const suyos = lista.filter((r) => r.usuario.id === u.id);
        return {
          id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, ultimoAcceso: u.ultimoAcceso || null,
          telefono: u.telefono ?? null, area: u.area ?? null, estado: u.activo === false ? "baja" : "activo", creadoEn: u.creadoEn || null,
          movimientos30d: suyos.filter((r) => Date.parse(r.fecha) >= desde).length,
          ultimoMovimiento: suyos.length ? suyos[0].fecha : null,
        };
      }));
    },

    /** CSV con los mismos filtros. Devuelve una URL para descargarlo (en la demo, un blob del navegador). */
    async exportarAuditoria(f = {}) {
      await demora();
      const usuario = exigirAuditoria();
      const filas = filtrarAuditoria(leerAuditoria(), f).slice(0, 10000);
      const celda = (v) => { let t = v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`; return `"${t.replace(/"/g, '""')}"`; };
      const local = (iso) => new Date(Date.parse(iso) - 3 * 3600 * 1000).toISOString().replace("T", " ").slice(0, 19);
      const columnas = ["Fecha y hora (Argentina)", "Nombre", "Correo", "Rol", "Módulo", "Acción", "Detalle", "Resultado", "Motivo", "IP", "Red", "Sede", "País", "Navegador"];
      const cuerpo = filas.map((r) => [local(r.fecha), r.usuario.nombre, r.usuario.email, ROLES[r.usuario.rol] ? ROLES[r.usuario.rol].nombre : "",
        r.modulo, r.accionEtiqueta, r.detalle, r.resultado, r.motivo, r.ubicacion.ip, r.ubicacion.red, r.ubicacion.sede, r.ubicacion.pais, r.peticion.navegador].map(celda).join(";"));
      const csv = `\uFEFF${[columnas.map(celda).join(";"), ...cuerpo].join("\r\n")}\r\n`;
      registrar({ usuario, accion: "auditoria.exportar", detalle: `Exportó la auditoría (${filas.length} registros, CSV)`, metodo: "GET", ruta: "/api/auditoria/exportar", objeto: { tipo: "auditoria", id: null, titulo: null } });
      const nombre = `auditoria-nexo-${hoyArgentina()}.csv`;
      const url = typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })) : null;
      return { url, nombre, total: filas.length, csv };
    },

    /** En la demo los archivos se abren desde el navegador: el panel avisa para dejar el registro. */
    registrarAccesoAdjunto(id, modo) {
      const datos = leer();
      const usuario = usuarioActual(datos);
      if (!usuario) return;
      for (const c of datos.contenidos) {
        const listas = [...c.versiones.map((v) => v.adjuntos), c.borrador ? c.borrador.adjuntos : []];
        const a = listas.flat().find((x) => x.id === id);
        if (a) {
          registrar({ usuario, accion: modo === "ver" ? "adjunto.ver" : "adjunto.descargar", metodo: "GET", ruta: `/api/adjuntos/${id}`,
            detalle: `${modo === "ver" ? "Abrió" : "Descargó"} ${a.nombre} de ${comillas(tituloDe(c))}`, objeto: { tipo: "adjunto", id, titulo: a.nombre } });
          return;
        }
      }
    },
  });

  window.Nexo.api = api;
  window.Nexo.ErrorNexo = ErrorNexo;
})();
