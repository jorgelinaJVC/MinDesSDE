"use strict";

/* Carga cinco personas (una por rol) y contenidos de ejemplo, usando las mismas reglas que la aplicación.
 *   npm run bd:sembrar
 * La contraseña de ejemplo sale de SEMILLA_PASSWORD (por defecto "Nexo-demo-2026"): cambiala en cualquier entorno real.
 */

const db = require("../src/db");
const config = require("../src/config");
const { crearUsuario } = require("../src/servicios/usuarios");
const contenidos = require("../src/servicios/contenidos");
const borradores = require("../src/servicios/borradores");

const PERSONAS = [
  { nombre: "Jorgelina Campos", email: "jorgelina.campos@ejemplo.edu.ar", rol: "administrador" },
  { nombre: "Marcos Ledesma", email: "marcos.ledesma@ejemplo.edu.ar", rol: "director" },
  { nombre: "Elena Suárez", email: "elena.suarez@ejemplo.edu.ar", rol: "autoridad" },
  { nombre: "Analía Rojas", email: "analia.rojas@ejemplo.edu.ar", rol: "colaborador" },
  { nombre: "Tomás Herrera", email: "tomas.herrera@ejemplo.edu.ar", rol: "observador" },
];

async function sembrar() {
  const password = process.env.SEMILLA_PASSWORD || "Nexo-demo-2026";
  const usuarios = await db.coleccion("usuarios");
  const existentes = await usuarios.find({}, { projection: { email: 1 } }).toArray();
  const correos = new Set(existentes.map((u) => u.email));

  for (const persona of PERSONAS) {
    if (!correos.has(persona.email)) await crearUsuario({ ...persona, password });
  }

  const total = await (await db.coleccion("contenidos")).countDocuments();
  if (total > 0) return { contenidosCreados: false, password };

  const usuario = async (email) => {
    const doc = await usuarios.findOne({ email });
    return { id: String(doc._id), rol: doc.rol };
  };
  const director = await usuario("marcos.ledesma@ejemplo.edu.ar");
  const autoridad = await usuario("elena.suarez@ejemplo.edu.ar");
  const colaboradora = await usuario("analia.rojas@ejemplo.edu.ar");

  const publicado = async (datos) => {
    const creado = await contenidos.crearContenido(colaboradora, datos);
    // colaboradora → director (eleva) → autoridad superior (aprueba: se publica sola en los sitios elegidos)
    await contenidos.revisar(director, creado.id, { decision: "elevar", comentario: "" });
    await contenidos.decidir(autoridad, creado.id, { decision: "aprobar", comentario: "" });
    return creado;
  };

  /* Portal de la Dirección General de Adultos Mayores */
  const buenTrato = await publicado({
    sitiosDestino: ["adultos-mayores"],
    tipo: "noticia",
    seccion: "Locales",
    slug: "buen-trato-personas-mayores",
    titulo: "El valor del respeto: claves para promover el buen trato",
    resumen: "Pequeñas acciones diarias pueden hacer una gran diferencia en la vida de las personas mayores.",
    cuerpo: "Pequeñas acciones diarias en la familia, los comercios y el transporte público pueden hacer una gran diferencia.\n\nConocé cómo construir entre todos una comunidad más inclusiva y respetuosa.",
  });
  await contenidos.enviarNuevaVersion(colaboradora, buenTrato.id, {
    sitiosDestino: ["adultos-mayores"],
    tipo: "noticia",
    seccion: "Locales",
    titulo: "El valor del respeto: claves para promover el buen trato",
    resumen: "Pequeñas acciones diarias pueden hacer una gran diferencia en la vida de las personas mayores.",
    cuerpo: "Pequeñas acciones diarias en la familia, los comercios y el transporte público pueden hacer una gran diferencia.\n\nConocé cómo construir entre todos una comunidad más inclusiva y respetuosa.\n\nAnte cualquier situación de maltrato, comunicate con la Línea de Protección de la Dirección.",
  });
  await contenidos.revisar(director, buenTrato.id, { decision: "elevar", comentario: "Suma el contacto de la línea." });
  await contenidos.decidir(autoridad, buenTrato.id, { decision: "aprobar", comentario: "" });

  const gimnasio = await publicado({
    sitiosDestino: ["adultos-mayores"],
    tipo: "proyecto",
    seccion: "Cognitivo",
    slug: "gimnasio-de-la-memoria",
    titulo: "Gimnasio de la Memoria",
    resumen: "Sesiones guiadas de estimulación de la memoria, acertijos, narraciones de vida y lectura compartida.",
    cuerpo: "Los encuentros se realizan dos veces por semana en los centros diurnos de la capital.\n\nLa inscripción es libre y gratuita.",
  });

  // Corrección en revisión que suma el Centro de Día: hasta que se apruebe, sigue visible solo en Adultos Mayores
  await contenidos.enviarNuevaVersion(colaboradora, gimnasio.id, {
    sitiosDestino: ["adultos-mayores", "centro-de-dia"],
    tipo: "proyecto",
    seccion: "Cognitivo",
    titulo: "Gimnasio de la Memoria",
    resumen: "Sesiones guiadas de estimulación de la memoria, acertijos, narraciones de vida y lectura compartida.",
    cuerpo: "Los encuentros se realizan dos veces por semana en los centros diurnos de la capital y ahora también en el Centro de Día.\n\nLa inscripción es libre y gratuita.",
  });

  /* Centro de Día */
  await publicado({
    sitiosDestino: ["centro-de-dia"],
    tipo: "noticia",
    seccion: "Actividades",
    slug: "tarde-de-folclore-centro-de-dia",
    titulo: "Tarde de folclore en el Centro de Día",
    resumen: "Música en vivo, chacarera y merienda compartida para los concurrentes y sus familias.",
    cuerpo: "El viernes a las 16 h el Centro de Día recibe a un conjunto folclórico local.\n\nLas familias están invitadas.",
  });

  /* Residencia de Larga Estadía Mama Antula */
  await publicado({
    sitiosDestino: ["mama-antula"],
    tipo: "noticia",
    seccion: "Celebración",
    slug: "cumpleanos-colectivo-del-mes",
    titulo: "Cumpleaños colectivo del mes",
    resumen: "Celebramos los natalicios de nuestros residentes con torta artesanal, merienda y música folclórica.",
    cuerpo: "Celebramos los natalicios de nuestros residentes con torta artesanal, merienda compartida y música folclórica en vivo en el salón central.",
  });

  await publicado({
    sitiosDestino: ["mama-antula"],
    tipo: "proyecto",
    seccion: "Terapéutico",
    slug: "huerta-organica-comunitaria",
    titulo: "Huerta Orgánica Comunitaria",
    resumen: "Residentes cultivan plantas medicinales, aromáticas y verduras, combinando laborterapia y naturaleza.",
    cuerpo: "Espacio al aire libre donde los residentes cultivan plantas medicinales, aromáticas y verduras.",
  });

  /* Elevado: ya lo revisó el director, espera la decisión final */
  const taller = await contenidos.crearContenido(colaboradora, {
    // dirigido a dos sitios: al aprobarse aparece en ambos a la vez
    sitiosDestino: ["adultos-mayores", "centro-de-dia"],
    tipo: "noticia",
    seccion: "Talleres",
    slug: "taller-alfabetizacion-digital",
    titulo: "Taller de alfabetización digital",
    resumen: "Encuentros semanales para aprender a usar el celular, videollamadas y trámites en línea.",
    cuerpo: "Los talleres se dictan los martes en los centros de jubilados de la capital.\n\nNo hace falta experiencia previa.",
    // urgente: en la bandeja de la autoridad superior va primero
    prioridad: { nivel: "urgente", motivo: "Las inscripciones cierran el viernes" },
  });
  await contenidos.revisar(director, taller.id, { decision: "elevar", comentario: "Revisado, listo para la decisión final." });

  /* Pendiente de la revisión de dirección */
  await contenidos.crearContenido(colaboradora, {
    sitiosDestino: ["mama-antula"],
    tipo: "noticia",
    seccion: "Comunidad",
    slug: "visitas-escuelas",
    titulo: "Las escuelas podrán visitar a los abuelos",
    resumen: "Los alumnos de las escuelas podrán hacer una visita a los abuelos de la residencia.",
    cuerpo: "A partir del jueves, los estudiantes de las escuelas participantes visitarán la residencia para compartir una tarde de actividades.",
  });

  /* Observado: el director lo devolvió con observaciones y la colaboradora tiene que corregirlo */
  const jornada = await contenidos.crearContenido(colaboradora, {
    sitiosDestino: ["centro-de-dia"],
    tipo: "noticia",
    seccion: "Salud",
    slug: "jornada-salud-visual",
    titulo: "Jornada de salud visual",
    resumen: "Controles oftalmológicos gratuitos para personas mayores.",
    cuerpo: "Habrá controles de la vista y entrega de anteojos.",
  });
  await contenidos.revisar(director, jornada.id, {
    decision: "devolver",
    comentario: "Falta la fecha y el horario de la jornada.\nIndicá si hay que pedir turno o es por orden de llegada.\nAgregá una foto para la tarjeta.",
  });

  /* Un borrador de la colaboradora: incompleto, solo ella lo ve */
  await borradores.crearBorrador(colaboradora, {
    sitiosDestino: ["centro-de-dia"],
    tipo: "noticia",
    titulo: "Muestra de pintura en el centro de día",
    resumen: "Los talleres de arte exponen sus obras durante todo octubre.",
  });

  return { contenidosCreados: true, password };
}

module.exports = { sembrar };

if (require.main === module) {
  sembrar()
    .then(({ contenidosCreados, password }) => {
      console.log(`Base "${config.mongo.base}" sembrada${contenidosCreados ? " con contenidos de ejemplo" : " (los contenidos ya existían)"}.`);
      console.log(`Ingresá con cualquiera de estos correos y la contraseña: ${password}`);
      PERSONAS.forEach((p) => console.log(`  ${p.rol.padEnd(14)} ${p.email}`));
    })
    .catch((error) => {
      console.error("No se pudo sembrar la base:", error.message);
      process.exitCode = 1;
    })
    .finally(() => db.cerrar());
}
