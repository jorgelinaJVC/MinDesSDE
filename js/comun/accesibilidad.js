/* accesibilidad.js — widget de accesibilidad compartido por los sitios de la red
 * (indexAdultos.html, habilitacion.html, mama-antula.html y centro-dia.html).
 *
 * Tamaño del texto: cambia el font-size de <html> en porcentaje (80 % a 150 %, de a 10). Como las tipografías de los
 * sitios están en rem, todo el texto escala junto. También deja la variable CSS --escala-texto (1, 1.1, 1.2…) para los
 * títulos fluidos que usan vw dentro de clamp().
 * Alto contraste y Resaltar enlaces: clases .high-contrast y .highlight-links en <html> y en <body> (las hojas de
 * estilo de los sitios usan una u otra).
 *
 * Persistencia y sincronización: la elección se guarda en localStorage y se comparte entre los sitios servidos desde
 * el mismo dominio. Si hay otra pestaña de la red abierta, se actualiza sola (evento "storage").
 *
 * Se carga como PRIMER elemento de <body>, sin defer: aplica la preferencia guardada antes de que se dibuje la página
 * (sin parpadeo). Los botones se atienden por delegación, así que no depende del orden de carga del resto.
 *
 * Marcado esperado (idéntico en los tres sitios):
 *   #accessibility-toggle, #accessibility-panel, #btn-desc-font, #font-size-indicator, #btn-inc-font,
 *   #btn-toggle-contrast, #btn-toggle-links, #btn-reset-accessibility
 */
(function () {
  "use strict";

  const CLAVE = "red-adultos-mayores.accesibilidad";
  const TEXTO = { minimo: 80, base: 100, maximo: 150, paso: 10 };
  const raiz = document.documentElement;

  /* ---------- Estado (localStorage) ---------- */

  function normalizar(datos) {
    const d = datos && typeof datos === "object" ? datos : {};
    let texto = Number(d.texto);
    if (!Number.isFinite(texto)) texto = TEXTO.base;
    texto = Math.round(texto / TEXTO.paso) * TEXTO.paso;
    texto = Math.min(TEXTO.maximo, Math.max(TEXTO.minimo, texto));
    return { texto, contraste: d.contraste === true, enlaces: d.enlaces === true };
  }

  function leer() {
    try {
      return normalizar(JSON.parse(window.localStorage.getItem(CLAVE) || "{}"));
    } catch (e) {
      return normalizar({}); // modo privado o almacenamiento bloqueado: valores de fábrica
    }
  }

  function guardar() {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch (e) {
      /* sin almacenamiento: el cambio vale solo para esta página */
    }
  }

  let estado = leer();

  /* ---------- Aplicar a la página ---------- */

  function aplicar() {
    raiz.style.fontSize = `${estado.texto}%`;
    raiz.style.setProperty("--escala-texto", String(estado.texto / 100));
    for (const el of [raiz, document.body]) {
      if (!el) continue;
      el.classList.toggle("high-contrast", estado.contraste);
      el.classList.toggle("highlight-links", estado.enlaces);
    }
    pintarControles();
  }

  const $ = (id) => document.getElementById(id);

  /** El panel refleja el estado: porcentaje, límites de + y −, y botones presionados. */
  function pintarControles() {
    const indicador = $("font-size-indicator");
    if (indicador) indicador.textContent = `${estado.texto}%`;
    const menos = $("btn-desc-font");
    const mas = $("btn-inc-font");
    // aria-disabled (y no disabled): el botón conserva el foco al llegar al límite
    if (menos) menos.setAttribute("aria-disabled", String(estado.texto <= TEXTO.minimo));
    if (mas) mas.setAttribute("aria-disabled", String(estado.texto >= TEXTO.maximo));
    const contraste = $("btn-toggle-contrast");
    const enlaces = $("btn-toggle-links");
    if (contraste) contraste.setAttribute("aria-pressed", String(estado.contraste));
    if (enlaces) enlaces.setAttribute("aria-pressed", String(estado.enlaces));
  }

  function cambiar(nuevo) {
    estado = normalizar({ ...estado, ...nuevo });
    aplicar();
    guardar();
  }

  /* ---------- Panel ---------- */

  function panelAbierto() {
    const panel = $("accessibility-panel");
    return Boolean(panel && panel.classList.contains("active"));
  }

  function abrirPanel(abrir) {
    const panel = $("accessibility-panel");
    const boton = $("accessibility-toggle");
    if (!panel || !boton) return;
    panel.classList.toggle("active", abrir);
    boton.setAttribute("aria-expanded", String(abrir));
    if (abrir) {
      const primero = panel.querySelector("button");
      if (primero) primero.focus();
    }
  }

  /* ---------- Eventos (delegados: funcionan aunque el panel se dibuje después) ---------- */

  const ACCIONES = {
    "btn-inc-font": () => cambiar({ texto: estado.texto + TEXTO.paso }),
    "btn-desc-font": () => cambiar({ texto: estado.texto - TEXTO.paso }),
    "btn-toggle-contrast": () => cambiar({ contraste: !estado.contraste }),
    "btn-toggle-links": () => cambiar({ enlaces: !estado.enlaces }),
    "btn-reset-accessibility": () => {
      cambiar({ texto: TEXTO.base, contraste: false, enlaces: false });
      abrirPanel(false);
      const boton = $("accessibility-toggle");
      if (boton) boton.focus();
    },
  };

  document.addEventListener("click", (evento) => {
    const objetivo = evento.target instanceof Element ? evento.target : null;
    if (!objetivo) return;

    if (objetivo.closest("#accessibility-toggle")) {
      abrirPanel(!panelAbierto());
      return;
    }
    const boton = objetivo.closest("#accessibility-panel button[id]");
    if (boton && ACCIONES[boton.id]) {
      ACCIONES[boton.id]();
      return;
    }
    // clic fuera del panel: se cierra
    if (panelAbierto() && !objetivo.closest("#accessibility-panel")) abrirPanel(false);
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && panelAbierto()) {
      abrirPanel(false);
      const boton = $("accessibility-toggle");
      if (boton) boton.focus();
    }
  });

  // otra pestaña de la red cambió la preferencia: se aplica acá también
  window.addEventListener("storage", (evento) => {
    if (evento.key !== CLAVE && evento.key !== null) return;
    estado = leer();
    aplicar();
  });

  /* ---------- Arranque ---------- */

  aplicar(); // antes de dibujar la página (el script está al principio de <body>)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", aplicar, { once: true }); // ya existen los controles del panel
  }

  // para otras partes del sitio que necesiten saber o fijar el tamaño
  window.Accesibilidad = {
    estado: () => ({ ...estado }),
    fijarTexto: (porcentaje) => cambiar({ texto: porcentaje }),
    restablecer: () => cambiar({ texto: TEXTO.base, contraste: false, enlaces: false }),
  };
})();
