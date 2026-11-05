"use strict";

/* Contenido completo con formato (editor del panel).
 *
 * El editor manda HTML; acá se limpia con una LISTA BLANCA antes de guardarlo. Solo sobrevive:
 *   párrafos, saltos de línea, negrita, cursiva, encabezados H2 y H3, listas con viñetas o numeradas,
 *   enlaces (http, https, mailto o tel; siempre se abren en otra pestaña con rel="noopener noreferrer")
 *   y la alineación del texto (izquierda, centro, derecha, justificado) como style="text-align: …".
 * Todo lo demás (scripts, eventos on*, iframes, estilos, imágenes, clases, javascript:…) se descarta.
 *
 * Se guarda en dos campos:
 *   cuerpoHtml  el HTML limpio (lo que muestran los sitios)
 *   cuerpo      el mismo texto sin formato (búsquedas, auditoría y sitios que todavía no muestran formato)
 * Los contenidos anteriores solo tienen "cuerpo": siguen funcionando igual, como texto en párrafos.
 */

const sanitizeHtml = require("sanitize-html");
const { crear } = require("./errores");

const MAX_HTML = 100000;
const MAX_TEXTO = 50000;
const ALINEACIONES = ["left", "center", "right", "justify"];
const BLOQUES_ALINEABLES = ["p", "h2", "h3", "li"];
const ENLACE_PERMITIDO = /^(https?:\/\/|mailto:|tel:)/i;

/** "www.sitio.gob.ar" (sin protocolo) se completa con https://; el resto queda igual y se valida aparte. */
const completarEnlace = (href) => {
  const limpio = String(href || "").trim();
  return /^www\.[^\s/]+\.[^\s]+$/i.test(limpio) ? `https://${limpio}` : limpio;
};

/** Quill marca la alineación con una clase (ql-align-center); se pasa a un estilo que cualquier sitio entiende. */
function alineacion(atributos) {
  const deClase = /(?:^|\s)ql-align-(center|right|justify)(?:\s|$)/.exec(atributos.class || "");
  if (deClase) return deClase[1];
  const deEstilo = /text-align\s*:\s*(left|center|right|justify)/i.exec(atributos.style || "");
  return deEstilo ? deEstilo[1].toLowerCase() : null;
}

function bloque(etiqueta) {
  return (_, atributos) => {
    const alinear = alineacion(atributos);
    return { tagName: etiqueta, attribs: alinear && alinear !== "left" ? { style: `text-align: ${alinear}` } : {} };
  };
}

const OPCIONES = {
  allowedTags: ["p", "br", "strong", "em", "h2", "h3", "ul", "ol", "li", "a"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    p: ["style"], h2: ["style"], h3: ["style"], li: ["style"],
  },
  allowedStyles: Object.fromEntries(BLOQUES_ALINEABLES.map((t) => [t, { "text-align": [new RegExp(`^(${ALINEACIONES.join("|")})$`)] }])),
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  transformTags: {
    // equivalencias: lo que pegue el usuario desde Word o la web queda dentro del formato permitido
    b: "strong",
    i: "em",
    h1: bloque("h2"),
    h2: bloque("h2"),
    h3: bloque("h3"),
    h4: bloque("h3"),
    h5: bloque("h3"),
    h6: bloque("h3"),
    div: bloque("p"),
    p: bloque("p"),
    li: bloque("li"),
    // enlace con dirección no permitida (javascript:, data:, //otro-sitio…): se le quita la dirección y,
    // al final de limpiarHtml, la etiqueta (queda el texto)
    a: (_, atributos) => {
      const href = completarEnlace(atributos.href);
      return { tagName: "a", attribs: ENLACE_PERMITIDO.test(href) ? { href, target: "_blank", rel: "noopener noreferrer" } : {} };
    },
  },
  nonTextTags: ["style", "script", "textarea", "option", "noscript", "title", "head"],
};

const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
function decodificar(texto) {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (todo, e) => {
    if (e[0] === "#") {
      const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENTIDADES[e.toLowerCase()] ?? todo;
  });
}

/** HTML limpio según la lista blanca. Quita los párrafos vacíos (el espacio entre párrafos lo pone cada sitio). */
function limpiarHtml(html) {
  return sanitizeHtml(String(html || ""), OPCIONES)
    .replace(/<a>([\s\S]*?)<\/a>/g, "$1") // enlaces que quedaron sin dirección: solo el texto
    .replace(/&nbsp;|\u00a0/g, " ") // el editor convierte cada espacio en &nbsp; y eso impide cortar las líneas
    .replace(/\s+(<\/(?:p|h2|h3|li)>)/g, "$1") // espacios sueltos al final de cada bloque
    .replace(/<p(?: style="[^"]*")?>(\s|<br \/>)*<\/p>/g, "")
    .trim();
}

/** El texto sin formato: un párrafo por bloque, viñetas como "• ". */
function textoPlano(htmlLimpio) {
  const conSaltos = String(htmlLimpio || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(p|h2|h3|li|ul|ol)>/gi, (m, t) => (t.toLowerCase() === "li" ? "\n" : "\n\n"));
  const sinEtiquetas = sanitizeHtml(conSaltos, { allowedTags: [], allowedAttributes: {} });
  return decodificar(sinEtiquetas)
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Lee el contenido completo de lo que llega del formulario.
 *   { cuerpoHtml: "<p>…</p>" }  -> lo limpia y deriva el texto
 *   { cuerpo: "texto" }         -> clientes anteriores: texto sin formato
 * "obligatorio": al enviar a revisión hace falta texto; en un borrador puede quedar vacío.
 */
function leerCuerpo(datos, { obligatorio }) {
  let cuerpoHtml = null;
  let cuerpo;
  if (typeof datos.cuerpoHtml === "string" && datos.cuerpoHtml.trim()) {
    cuerpoHtml = limpiarHtml(datos.cuerpoHtml);
    cuerpo = textoPlano(cuerpoHtml);
    if (!cuerpo) cuerpoHtml = null;
  } else {
    cuerpo = typeof datos.cuerpo === "string" ? datos.cuerpo.trim() : "";
  }
  if (cuerpoHtml && cuerpoHtml.length > MAX_HTML) {
    throw crear("datos_invalidos", "El contenido con formato es demasiado largo.");
  }
  if (cuerpo.length > MAX_TEXTO) throw crear("datos_invalidos", `El campo cuerpo supera los ${MAX_TEXTO} caracteres.`);
  if (obligatorio && !cuerpo) throw crear("datos_invalidos", "Completá sección, título, resumen y contenido.");
  return { cuerpo, cuerpoHtml };
}

module.exports = { limpiarHtml, textoPlano, leerCuerpo, MAX_HTML };
