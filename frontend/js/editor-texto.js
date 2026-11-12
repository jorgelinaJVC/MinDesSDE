/* editor-texto.js — editor con formato para "Contenido completo" (Quill 2, servido desde vendor/quill).
 *
 * Formatos habilitados (y ningún otro, ni siquiera al pegar desde Word o la web):
 *   Título H2 y subtítulo H3, negrita, cursiva, listas con viñetas o numeradas, enlaces y alineación.
 *
 * Mejora progresiva: si Quill no carga, el <textarea> original sigue funcionando como texto simple.
 * Lo que se manda al servidor:
 *   cuerpoHtml  el HTML del editor (el servidor lo vuelve a limpiar con su lista blanca)
 *   cuerpo      el mismo contenido como texto (para validar "obligatorio" y para clientes sin formato)
 */
window.Nexo = window.Nexo || {};

(function () {
  "use strict";

  const FORMATOS = ["header", "bold", "italic", "list", "link", "align"];
  const ALINEACIONES = { "": "Alinear a la izquierda", center: "Centrar", right: "Alinear a la derecha", justify: "Justificar" };

  /** Lo que se pega con un encabezado fuera de H2/H3 se acomoda: H1 pasa a H2; H4, H5 y H6 a H3. */
  function acomodarEncabezado(nodo, delta) {
    const nivel = nodo.tagName === "H1" ? 2 : 3;
    delta.ops.forEach((op) => {
      if (op.attributes && op.attributes.header) op.attributes.header = nivel;
    });
    return delta;
  }

  /** "www.sitio.gob.ar" -> "https://www.sitio.gob.ar"; un enlace sin protocolo válido no se guarda. */
  function completarEnlace(valor) {
    const limpio = String(valor || "").trim();
    if (/^(https?:\/\/|mailto:|tel:)/i.test(limpio)) return limpio;
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(limpio)) return `https://${limpio}`;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) return `mailto:${limpio}`;
    return null;
  }

  /** Etiquetas en castellano para lo que Quill arma por su cuenta (el selector de alineación y el cuadro del enlace). */
  function traducir(quill, barra) {
    const selector = barra.querySelector(".ql-align.ql-picker");
    if (selector) {
      const etiqueta = selector.querySelector(".ql-picker-label");
      etiqueta.setAttribute("aria-label", "Alineación del texto");
      etiqueta.setAttribute("title", "Alineación del texto");
      selector.querySelectorAll(".ql-picker-item").forEach((item) => {
        const nombre = ALINEACIONES[item.getAttribute("data-value") || ""];
        item.setAttribute("aria-label", nombre);
        item.setAttribute("title", nombre);
      });
    }
    const tooltip = quill.theme && quill.theme.tooltip;
    if (tooltip && tooltip.textbox) {
      tooltip.textbox.setAttribute("data-link", "https://www.ejemplo.gob.ar");
      tooltip.textbox.setAttribute("aria-label", "Dirección del enlace");
    }
  }

  /**
   * Monta el editor sobre el textarea indicado.
   *   alCambiar  se llama con cada cambio (texto o formato) hecho por la persona
   * Devuelve null si Quill no está disponible (queda el textarea).
   */
  function crear({ textarea, barra, alCambiar }) {
    const Quill = window.Quill;
    if (!Quill || !textarea || !barra) return null;

    const area = document.createElement("div");
    area.className = "editor-texto__area";
    textarea.insertAdjacentElement("afterend", area);

    const quill = new Quill(area, {
      theme: "snow",
      formats: FORMATOS,
      placeholder: textarea.getAttribute("placeholder") || "",
      modules: {
        toolbar: {
          container: barra,
          handlers: {
            // pide la dirección en el cuadro propio de Quill, pero normaliza lo escrito al guardar
            link(valor) {
              if (!valor) return this.quill.format("link", false);
              const rango = this.quill.getSelection();
              if (!rango || !rango.length) {
                aviso(area, "Seleccioná primero el texto que querés convertir en enlace.");
                return;
              }
              this.quill.theme.tooltip.edit("link", "");
            },
          },
        },
        clipboard: { matchVisual: false },
        // sin historial de pegado con estilos ajenos: el formato que sobrevive lo define FORMATOS
      },
    });
    ["H1", "H4", "H5", "H6"].forEach((tag) => quill.clipboard.addMatcher(tag, acomodarEncabezado));

    // el cuadro del enlace guarda la dirección ya normalizada (o no guarda nada si no es válida)
    const tooltip = quill.theme.tooltip;
    const guardarOriginal = tooltip.save.bind(tooltip);
    tooltip.save = function () {
      if (this.root.getAttribute("data-mode") === "link") {
        const direccion = completarEnlace(this.textbox.value);
        if (!direccion) {
          this.textbox.setCustomValidity("Escribí una dirección web (https://…), un correo o un teléfono (tel:…).");
          this.textbox.reportValidity();
          return;
        }
        this.textbox.setCustomValidity("");
        this.textbox.value = direccion;
      }
      guardarOriginal();
    };
    tooltip.textbox.addEventListener("input", () => tooltip.textbox.setCustomValidity(""));

    barra.hidden = false;
    textarea.hidden = true;
    textarea.tabIndex = -1;
    const raiz = quill.root;
    raiz.setAttribute("role", "textbox");
    raiz.setAttribute("aria-multiline", "true");
    raiz.setAttribute("aria-labelledby", textarea.getAttribute("aria-labelledby") || "");
    traducir(quill, barra);

    quill.on("text-change", (_delta, _anterior, origen) => {
      if (origen === "user" && alCambiar) alCambiar();
    });

    return {
      quill,
      /** HTML para guardar ("" si no hay texto). */
      html() {
        if (!this.texto()) return "";
        return quill.getSemanticHTML().replace(/&nbsp;/g, " ").replace(/ /g, " ");
      },
      /** El contenido sin formato. */
      texto() {
        return quill.getText().replace(/\s+$/, "");
      },
      /** Carga un contenido guardado: con formato si lo tiene (filtrado otra vez), si no el texto simple. */
      cargar({ cuerpo, cuerpoHtml } = {}) {
        if (cuerpoHtml) {
          quill.clipboard.dangerouslyPasteHTML(window.Nexo.util.htmlSeguro(cuerpoHtml), "silent");
        } else {
          quill.setText(cuerpo || "", "silent");
        }
        quill.history.clear();
        quill.setSelection(null, "silent");
      },
      vaciar() {
        quill.setText("", "silent");
        quill.history.clear();
      },
      enfocar() {
        quill.focus();
      },
    };
  }

  /** Aviso breve dentro del editor (por ejemplo, "seleccioná el texto antes de agregar un enlace"). */
  function aviso(area, texto) {
    const contenedor = area.parentElement;
    let caja = contenedor.querySelector(".editor-texto__aviso");
    if (!caja) {
      caja = document.createElement("p");
      caja.className = "editor-texto__aviso";
      caja.setAttribute("role", "status");
      contenedor.appendChild(caja);
    }
    caja.textContent = texto;
    clearTimeout(caja._temporizador);
    caja._temporizador = setTimeout(() => { caja.textContent = ""; }, 4000);
  }

  window.Nexo.editorTexto = { crear, completarEnlace };
})();
