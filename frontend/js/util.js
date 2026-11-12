/* util.js — funciones pequeñas compartidas por el panel, el login y la vista pública. */
window.Nexo = window.Nexo || {};

(function () {
  "use strict";

  const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
  const MESES_LARGOS = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const dos = (n) => String(n).padStart(2, "0");

  /* ---------- Contenido completo con formato ----------
   * Nexo ya guarda el HTML limpio, pero al mostrarlo se vuelve a filtrar con la misma lista blanca (defensa en
   * profundidad: nunca se inserta HTML recibido sin pasar por acá). Se reconstruye nodo por nodo en un <template>
   * (inerte: no ejecuta scripts ni carga imágenes) y solo se copian etiquetas y atributos permitidos. */
  const PERMITIDAS = { P: "p", BR: "br", STRONG: "strong", B: "strong", EM: "em", I: "em", H1: "h2", H2: "h2", H3: "h3",
    H4: "h3", H5: "h3", H6: "h3", UL: "ul", OL: "ol", LI: "li", A: "a", DIV: "p" };
  const DESCARTADAS = /^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|SVG|MATH|TEMPLATE|NOSCRIPT|TEXTAREA|SELECT|BUTTON|INPUT|IMG|VIDEO|AUDIO|CANVAS|FORM|HEAD|TITLE|LINK|META)$/;
  const ALINEABLES = /^(p|h2|h3|li)$/;
  const ENLACE_OK = /^(https?:\/\/|mailto:|tel:)/i;

  function alineacionDe(el) {
    const clase = /(?:^|\s)ql-align-(center|right|justify)(?:\s|$)/.exec(el.getAttribute("class") || "");
    if (clase) return clase[1];
    const estilo = /text-align\s*:\s*(center|right|justify)/i.exec(el.getAttribute("style") || "");
    return estilo ? estilo[1].toLowerCase() : null;
  }

  function copiarLimpio(origen, destino, doc) {
    for (const nodo of Array.from(origen.childNodes)) {
      if (nodo.nodeType === 3) { destino.appendChild(doc.createTextNode(nodo.nodeValue.replace(/\u00a0/g, " "))); continue; }
      if (nodo.nodeType !== 1) continue; // comentarios, etc.
      const nombre = nodo.nodeName.toUpperCase();
      if (DESCARTADAS.test(nombre)) continue;
      const etiqueta = PERMITIDAS[nombre];
      if (!etiqueta) { copiarLimpio(nodo, destino, doc); continue; } // span, font, u…: queda el texto
      if (etiqueta === "a") {
        let href = String(nodo.getAttribute("href") || "").trim();
        if (/^www\.[^\s/]+\.\S+$/i.test(href)) href = `https://${href}`;
        if (!ENLACE_OK.test(href)) { copiarLimpio(nodo, destino, doc); continue; }
        const a = doc.createElement("a");
        a.setAttribute("href", href);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        copiarLimpio(nodo, a, doc);
        destino.appendChild(a);
        continue;
      }
      const el = doc.createElement(etiqueta);
      const alinear = ALINEABLES.test(etiqueta) ? alineacionDe(nodo) : null;
      if (alinear) el.style.textAlign = alinear;
      copiarLimpio(nodo, el, doc);
      // párrafos vacíos fuera (el espacio entre párrafos lo pone la hoja de estilos)
      if (etiqueta === "p" && !el.textContent.trim()) continue;
      destino.appendChild(el);
    }
  }

  const util = {
    /** Escapa texto para insertarlo de forma segura dentro de HTML. */
    esc(texto) {
      return String(texto ?? "").replace(/[&<>"']/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
      ));
    },

    /** Minúsculas y sin tildes, para comparar búsquedas. */
    normalizar(texto) {
      return String(texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    },

    /** 18 de sept de 2026 */
    fechaCorta(iso) {
      const f = new Date(iso);
      if (Number.isNaN(f.getTime())) return "—";
      return `${dos(f.getDate())} de ${MESES_CORTOS[f.getMonth()]} de ${f.getFullYear()}`;
    },

    /** 17 de septiembre de 2026 */
    fechaLarga(iso) {
      const f = new Date(iso);
      if (Number.isNaN(f.getTime())) return "—";
      return `${f.getDate()} de ${MESES_LARGOS[f.getMonth()]} de ${f.getFullYear()}`;
    },

    iniciales(nombre) {
      const partes = String(nombre ?? "").trim().split(/\s+/).filter(Boolean);
      if (!partes.length) return "?";
      const primera = partes[0][0];
      const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
      return (primera + ultima).toUpperCase();
    },

    /** "Convocatoria de Becas 2026" -> "convocatoria-de-becas-2026" */
    slugify(texto) {
      return util.normalizar(texto)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
    },

    /** HTML del editor, filtrado con la lista blanca: devuelve un string seguro para innerHTML. */
    htmlSeguro(html) {
      const doc = document;
      const plantilla = doc.createElement("template");
      plantilla.innerHTML = String(html || "");
      const caja = doc.createElement("div");
      copiarLimpio(plantilla.content, caja, doc);
      return caja.innerHTML;
    },

    /** Texto sin formato en párrafos (contenidos anteriores al editor). */
    parrafos(texto) {
      return String(texto || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
        .map((p) => `<p>${util.esc(p).replace(/\n/g, "<br>")}</p>`).join("");
    },

    /** El contenido completo listo para insertar: con formato si lo tiene, si no el texto en párrafos. */
    cuerpoHtml(item) {
      const conFormato = item && item.cuerpoHtml ? util.htmlSeguro(item.cuerpoHtml) : "";
      return conFormato || util.parrafos(item && item.cuerpo);
    },

    /** 932864 -> "911 KB" */
    tamano(bytes) {
      const n = Number(bytes) || 0;
      if (n < 1024) return `${n} B`;
      if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
      return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    },
  };

  window.Nexo.util = util;
})();
