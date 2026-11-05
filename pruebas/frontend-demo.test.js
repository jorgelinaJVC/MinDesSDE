"use strict";

/* Prueba del frontend en MODO DEMO (sin servidor): carga las páginas reales en jsdom y recorre el circuito
 * completo con los distintos roles. Las páginas se abren desde los archivos, con localStorage como "base de datos". */

const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

/** Escribe en el editor de "Contenido completo" (Quill) como lo haría una persona. Con HTML, lo pega con formato. */
function escribirEditor(doc, contenido, { html = false } = {}) {
  const quill = doc.defaultView.Quill.find(doc.querySelector(".editor-texto__area"));
  if (html) quill.clipboard.dangerouslyPasteHTML(contenido, "user");
  else quill.setText(contenido, "user");
}
const { JSDOM, VirtualConsole } = require("jsdom");

const RAIZ = path.join(__dirname, "..", "frontend");
const ok = (condicion, mensaje) => assert.ok(condicion, mensaje);

function cargar(pagina, sesion, hash = "") {
  let html = fs.readFileSync(path.join(RAIZ, pagina), "utf8");
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) =>
    `<script>${fs.readFileSync(path.join(RAIZ, src), "utf8")}</script>`);
  html = html.replace(/<link[^>]*>/g, "");
  const consola = new VirtualConsole();
  const errores = [];
  consola.on("jsdomError", (e) => errores.push(e.message));
  consola.on("error", (e) => errores.push(String(e)));
  const dom = new JSDOM(html, {
    url: `http://localhost/${pagina}${hash}`, runScripts: "dangerously", pretendToBeVisual: true,
    virtualConsole: consola,
    beforeParse(w) {
      if (sesion) w.localStorage.setItem("nexo.sesion.v1", sesion);
      w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
      w.HTMLDialogElement.prototype.close = function (v) { if (v !== undefined) this.returnValue = v; this.open = false; this.dispatchEvent(new w.Event("close")); };
      w.Element.prototype.scrollIntoView = function () {};
      // jsdom no crea URLs de blobs: se simulan para probar ver y descargar archivos en la demo
      let n = 0;
      w.URL.createObjectURL = () => `blob:http://localhost/archivo-${++n}`;
      w.URL.revokeObjectURL = () => {};
      w.scrollTo = () => {};
    },
  });
  dom.errores = errores;
  return dom;
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function hasta(fn, ms = 2000) { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await esperar(20); } return false; }

/** Todas las publicaciones visibles, sin repetir (cada sitio pide las suyas). */
async function publicas(w) {
  const vistas = new Map();
  for (const sitio of w.Nexo.api.sitios) {
    for (const p of await w.Nexo.api.publico.listar({ sitio: sitio.id })) vistas.set(p.slug, p);
  }
  return [...vistas.values()];
}

/** Tilda las casillas de sitios del editor (y avisa el cambio, como al hacer clic). */
function elegirSitios(w, ids) {
  w.document.querySelectorAll('#c-sitios-opciones input[name="c-sitio"]').forEach((x) => { x.checked = ids.includes(x.value); });
  w.document.getElementById("c-sitios-opciones").dispatchEvent(new w.Event("change", { bubbles: true }));
}

async function confirmarDialogo(w, valor = "ok", motivo) {
  await hasta(() => w.document.getElementById("dialogo").open);
  if (motivo) w.document.getElementById("dialogo-motivo").value = motivo;
  w.document.getElementById("dialogo").close(valor);
  await esperar(200);
}

describe("frontend en modo demo", () => {
  it("recorre el circuito editorial completo con los cinco roles y la vista pública", async () => {
    const dom = cargar("panel.html", "u1");
  const w = dom.window, d = w.document;
  ok(await hasta(() => d.querySelector(".metrica")), "renderiza las métricas");
  ok(/^Buen/.test(d.getElementById("saludo").textContent) && d.getElementById("saludo").textContent.includes("Jorgelina"), "saludo con nombre: " + d.getElementById("saludo").textContent);
  const valores = [...d.querySelectorAll(".metrica__valor")].map((e) => e.textContent);
  ok(valores.join() === "5,2,3,1", "métricas 5,2,3,1 -> " + valores.join());
  ok(d.querySelectorAll(".fila").length === 5, "5 filas de actividad");
  ok(d.querySelector(".insignia")?.textContent === "2", "insignia del administrador = 2: una en revisión de dirección y una elevada -> " + d.querySelector(".insignia")?.textContent);
  const selDemo = d.getElementById("selector-demo");
  const verComo = async (id) => { selDemo.value = id; selDemo.dispatchEvent(new w.Event("change", { bubbles: true })); await esperar(400); };
  const boton = (nivel, decision) => d.querySelector(`[data-accion="${nivel}"][data-decision="${decision}"]`);

  // Filtros
  const q = d.getElementById("f-q"); q.value = "escuelas"; q.dispatchEvent(new w.Event("input"));
  ok(d.getElementById("f-total").textContent === "1 resultado", "búsqueda por 'escuelas' -> 1 resultado");
  q.value = "BÉCAS"; q.dispatchEvent(new w.Event("input"));
  ok(d.querySelectorAll(".fila").length === 1, "búsqueda sin tildes/mayúsculas");
  q.value = ""; q.dispatchEvent(new w.Event("input"));

  // Ir a revisión como director de área (Marcos, u2)
  await verComo("u2");
  ok(d.querySelector(".insignia")?.textContent === "1", "insignia del director = 1 (solo lo que puede revisar)");
  w.location.hash = "revision";
  ok(await hasta(() => d.querySelector(".detalle")), "abre el detalle de revisión");
  // Prioridad: lo urgente queda fijo arriba de la bandeja y se abre primero
  ok(d.querySelector(".grupo-solicitudes--urgente")?.textContent.includes("Urgentes · 1"), "grupo fijo de urgentes arriba");
  ok(d.querySelector(".solicitudes .solicitud").classList.contains("solicitud--urgente"), "la primera solicitud es la urgente");
  ok(d.querySelector(".detalle__titulo").textContent.includes("alfabetización"), "se abre primero lo urgente");
  ok(d.querySelector(".franja-urgente")?.textContent.includes("Las inscripciones cierran el viernes"), "franja con el motivo de la urgencia");
  d.querySelector('[data-accion="seleccionar-revision"][data-id="c4"]').click();
  ok(d.querySelector(".detalle__titulo").textContent.includes("abuelos"), "detalle del contenido pendiente");
  ok(!d.querySelector(".franja-urgente") && d.querySelector('.prioridad-normal [data-accion="abrir-prioridad"]'), "uno normal ofrece marcarlo como urgente");
  ok(d.querySelectorAll(".archivo").length === 1 && d.body.textContent.includes("911 KB"), "adjunto logoMA.png 911 KB");
  ok(d.querySelector(".previa-sitio__titulo")?.textContent.includes("abuelos"), "previsualización como en el sitio");
  // el revisor ve y descarga los adjuntos (en la demo, guardados en el navegador)
  const tarjeta = d.querySelector(".archivo");
  ok(tarjeta.querySelector('a[download="logoMA.png"]')?.getAttribute("href").startsWith("blob:"), "el revisor puede descargar el adjunto");
  ok(tarjeta.querySelector(".archivo__previa img"), "miniatura de la imagen");
  ok(d.querySelector(".previa-sitio img"), "la previsualización usa la imagen adjunta");
  tarjeta.querySelector('[data-accion="ver-adjunto"]').click();
  ok(await hasta(() => d.getElementById("visor").open), "Ver abre el visor");
  ok(d.querySelector("#visor-cuerpo img") && d.getElementById("visor-nombre").textContent === "logoMA.png", "el visor muestra la imagen");
  ok(d.getElementById("visor-descargar").getAttribute("download") === "logoMA.png", "el visor ofrece descargar con su nombre");
  d.querySelector('[data-accion="cerrar-visor"]').click();
  ok(!d.getElementById("visor").open && d.getElementById("visor-cuerpo").innerHTML === "", "cerrar el visor");
  ok(d.querySelector('.ficha').textContent.includes("Analía Rojas"), "ficha muestra autor");

  ok(d.querySelector(".cadena__paso--actual")?.textContent.includes("Revisión de dirección"), "cadena: en revisión de dirección");

  // Nivel 2 (director de área): no puede aprobar, solo elevar o devolver con observaciones
  ok(!boton("decision", "aprobar") && !d.querySelector('[data-accion="publicar"]'), "el revisor no ve Aprobar ni Publicar");
  boton("revision", "devolver").click();
  await esperar(50);
  ok(!d.getElementById("error-decision").hidden, "pedir cambios sin comentario muestra error");
  let fallo = null; try { await w.Nexo.api.decidir("c4", { decision: "aprobar" }); } catch (e) { fallo = e; }
  ok(fallo && fallo.codigo === "prohibido", "la API no deja aprobar a quien no es autoridad superior");
  boton("revision", "elevar").click();
  ok(await hasta(() => d.body.textContent.includes("Esperando la decisión final")), "elevado: espera a la autoridad");
  ok((await w.Nexo.api.listarContenidos()).find((c) => c.id === "c4").estado === "elevado", "estado elevado");

  // Nivel 3: autoridad superior (Elena, u5)
  await verComo("u5");
  ok(d.querySelector(".insignia")?.textContent === "2", "insignia de la autoridad = 2 elevados");
  d.querySelector('[data-accion="seleccionar-revision"][data-id="c4"]').click();
  ok(d.querySelector(".cadena__paso--actual")?.textContent.includes("Decisión final"), "cadena: en decisión final");
  boton("decision", "rechazar").click();
  await esperar(50);
  ok(d.getElementById("error-decision").textContent.includes("motivo"), "rechazar exige motivo");
  ok(d.querySelector(".estado-publicacion")?.textContent.includes("Pendiente de aprobación de la Autoridad Superior"), "indicador: pendiente de aprobación");
  ok((await publicas(w)).length === 3, "elevado NO es público todavía");
  ok(d.body.textContent.includes("Aprobar lo publica en el acto en Mama Antula"), "la autoridad sabe que aprobar publica y dónde");
  boton("decision", "aprobar").click();
  ok(await hasta(() => d.getElementById("dialogo").open), "aprobar pide confirmación");
  ok(d.getElementById("dialogo-texto").textContent.includes("se publica en el acto en Mama Antula"), "la confirmación dice en qué sitios se publica");
  await confirmarDialogo(w, "cancelar");
  ok((await w.Nexo.api.listarContenidos()).find((c) => c.id === "c4").estado === "elevado", "cancelar no aprueba");
  boton("decision", "aprobar").click();
  await confirmarDialogo(w, "ok");
  ok(await hasta(async () => true), "aprobando…");
  await esperar(300);
  const c4 = (await w.Nexo.api.listarContenidos()).find((c) => c.id === "c4");
  ok(c4.estado === "publicado" && c4.historial.slice(-2).map((e) => e.tipo).join() === "aprobacion,publicacion", "aprobar publica en el mismo paso");
  const mama = await w.Nexo.api.publico.listar({ sitio: "mama-antula" });
  ok(mama[0].slug === "visitas" && !mama[0].urgente, "aparece enseguida en su sitio (Mama Antula)");
  const adultos = await w.Nexo.api.publico.listar({ sitio: "adultos-mayores" });
  ok(!adultos.some((x) => x.slug === "visitas"), "no aparece en un sitio que no eligió");
  ok(adultos[0].slug === "convocatoria-becas-2026" && adultos[0].urgente, "el aviso urgente vigente va primero");
  ok(!JSON.stringify(await publicas(w)).includes("La inscripción cierra"), "el motivo interno no sale a la web");
  w.location.hash = "historial";
  ok(await hasta(() => d.querySelector('[data-id="c4"][data-accion="seleccionar-historial"]')), "historial");
  d.querySelector('[data-id="c4"][data-accion="seleccionar-historial"]').click();
  ok(await hasta(() => d.querySelector(".estado-publicacion")?.textContent.includes("Aprobada y visible en Mama Antula")), "indicador: visible en el sitio elegido");
  ok(d.querySelector('.visibilidad-sitio--si a[href="publico.html?sitio=mama-antula#visitas"]'), "con enlace al sitio");

  // Historial
  w.location.hash = "historial";
  await hasta(() => d.querySelector(".linea"));
  ok(d.querySelectorAll(".version").length >= 1, "línea de tiempo renderizada");
  d.querySelector('[data-id="c1"][data-accion="seleccionar-historial"]').click();
  ok(d.querySelectorAll(".version").length === 2 && d.querySelector(".version--actual .version__nombre").textContent === "Versión 2.0", "becas: 2 versiones, actual = 2.0");
  ok(d.body.textContent.includes("Reemplazada por una actualización posterior"), "v1 marcada como reemplazada");

  // Rechazo definitivo del otro elevado (c5)
  w.location.hash = "revision";
  ok(await hasta(() => d.querySelector('[data-accion="seleccionar-revision"][data-id="c5"]')), "c5 en la bandeja");
  d.querySelector('[data-accion="seleccionar-revision"][data-id="c5"]').click();
  d.getElementById("comentario-decision").value = "No corresponde a este sitio.";
  boton("decision", "rechazar").click();
  await confirmarDialogo(w, "ok");
  const c5r = (await w.Nexo.api.listarContenidos()).find((c) => c.id === "c5");
  ok(c5r.estado === "rechazado" && c5r.versiones[0].decision.comentario === "No corresponde a este sitio.", "rechazado con motivo");
  ok(!d.querySelector('[data-accion="seleccionar-revision"][data-id="c5"]'), "el rechazado sale de la bandeja");
  await w.Nexo.api.iniciarSesion("u3"); // la autora
  fallo = null; try { await w.Nexo.api.enviarNuevaVersion("c5", {}); } catch (e) { fallo = e; }
  ok(fallo && fallo.codigo === "estado_invalido" && /rechazado/.test(fallo.message), "un rechazado no admite nuevas versiones");
  await w.Nexo.api.iniciarSesion("u5");

  // Dar de baja y reactivar (autoridad superior), desde el detalle del historial
  w.location.hash = "historial";
  await hasta(() => d.querySelector('[data-id="c1"][data-accion="seleccionar-historial"]'));
  d.querySelector('[data-id="c1"][data-accion="seleccionar-historial"]').click();
  d.querySelector('.panel--linea [data-accion="archivar"]').click();
  ok(d.getElementById("dialogo").open && d.getElementById("dialogo-ok").disabled, "la baja pide confirmación y el motivo es obligatorio");
  await confirmarDialogo(w, "ok", "Convocatoria vencida");
  await esperar(300);
  ok((await publicas(w)).length === 3, "archivar quita de la vista pública");
  const lista = await w.Nexo.api.listarContenidos();
  const c1 = lista.find((c) => c.id === "c1");
  ok(c1.versiones.length === 2 && c1.estado === "archivado", "archivar conserva versiones");
  ok(c1.historial.at(-1).comentario === "Convocatoria vencida", "motivo del archivo guardado");
  d.querySelector('.panel--linea [data-accion="restaurar"]').click();
  await confirmarDialogo(w);
  await esperar(300);
  ok((await publicas(w)).length === 3, "restaurar NO republica automáticamente");

  // Nuevo contenido (formulario)
  d.getElementById("btn-nuevo").click();
  ok(!d.getElementById("panel-carga").hidden, "abre formulario de carga");
  d.getElementById("c-titulo").value = "Beca de Transporte 2027"; d.getElementById("c-titulo").dispatchEvent(new w.Event("input"));
  ok(d.getElementById("c-slug").value === "beca-de-transporte-2027", "slug automático desde el título");
  d.getElementById("form-carga").dispatchEvent(new w.Event("submit", { cancelable: true }));
  await esperar(50);
  ok(!d.getElementById("carga-errores").hidden && /sitio/i.test(d.getElementById("carga-errores").textContent), "valida campos obligatorios (incluido el sitio)");
  ok(d.getElementById("carga-faltantes").textContent.includes("Para enviar falta"), "el pie muestra qué falta");
  const casillas = [...d.querySelectorAll('#c-sitios-opciones input[name="c-sitio"]')];
  ok(casillas.length === 3 && casillas.map((x) => x.value).join() === "adultos-mayores,mama-antula,centro-de-dia", "casillas para los tres sitios");
  ok(d.getElementById("c-sitios-opciones").textContent.includes("Centro de Día"), "el tercer sitio es el Centro de Día");
  elegirSitios(w, ["adultos-mayores", "centro-de-dia"]);
  d.getElementById("c-tipo").value = "noticia";
  d.getElementById("c-seccion").value = "Becas y beneficios";
  d.getElementById("c-resumen").value = "Resumen"; escribirEditor(d, "Cuerpo largo");
  d.getElementById("form-carga").dispatchEvent(new w.Event("submit", { cancelable: true }));
  ok(await hasta(() => d.getElementById("dialogo").open), "enviar pide confirmación");
  ok(d.getElementById("dialogo-texto").textContent.includes("director de área"), "la confirmación explica a quién le llega");
  await confirmarDialogo(w, "cancelar");
  ok(!d.getElementById("panel-carga").hidden, "cancelar no envía");
  ok((await w.Nexo.api.listarContenidos()).find((c) => c.borrador && c.borrador.titulo === "Beca de Transporte 2027").estado === "borrador", "sigue siendo borrador");
  d.getElementById("form-carga").dispatchEvent(new w.Event("submit", { cancelable: true }));
  await confirmarDialogo(w, "ok");
  await hasta(() => d.getElementById("panel-carga").hidden);
  ok(d.getElementById("panel-carga").hidden, "envía y cierra el formulario");
  await hasta(() => w.location.hash === "#revision");
  ok(w.location.hash === "#revision", "navega a la bandeja de revisión");
  await esperar(200);
  ok(d.body.textContent.includes("Beca de Transporte 2027"), "nuevo contenido en la bandeja");

  // Slug duplicado
  d.getElementById("btn-nuevo").click();
  elegirSitios(w, ["mama-antula"]); d.getElementById("c-tipo").value = "proyecto";
  d.getElementById("c-seccion").value = "X"; d.getElementById("c-slug").value = "visitas";
  d.getElementById("c-titulo").value = "T"; d.getElementById("c-resumen").value = "R"; escribirEditor(d, "C");
  d.getElementById("form-carga").dispatchEvent(new w.Event("submit", { cancelable: true }));
  await esperar(300);
  ok(!d.getElementById("dialogo").open, "si no se puede guardar, no llega a pedir confirmación");
  ok(d.getElementById("carga-errores").textContent.includes("identificador"), "rechaza identificador duplicado");
  d.querySelector('[data-accion="cerrar-carga"]').click();
  ok(await hasta(() => d.getElementById("carga-errores").textContent.includes("cerrá de nuevo")), "cerrar con un error explica cómo salir");
  ok(!d.getElementById("panel-carga").hidden, "y no pierde lo escrito sin avisar");

  // Borrador: se corrige el identificador, se adjunta un archivo y se cierra sin enviar
  d.getElementById("c-slug").value = "proyecto-en-preparacion";
  d.getElementById("c-slug").dispatchEvent(new w.Event("input", { bubbles: true }));
  ok(d.getElementById("carga-guardado").textContent.includes("sin guardar"), "indica cambios sin guardar");
  const archivoInput = d.getElementById("c-archivos");
  Object.defineProperty(archivoInput, "files", { value: [new w.File(["x"], "afiche.png", { type: "image/png" })], configurable: true });
  archivoInput.dispatchEvent(new w.Event("change"));
  ok(await hasta(() => d.querySelector('#lista-adjuntos [data-accion="quitar-adjunto"]')), "el archivo queda en el borrador");
  ok(d.querySelector('#lista-adjuntos [data-accion="ver-adjunto"]') && d.querySelector('#lista-adjuntos a[download="afiche.png"]'), "el autor puede ver y descargar lo que cargó");
  ok(d.querySelector("#lista-adjuntos img"), "con miniatura");
  // formatos de imagen: WEBP y AVIF se aceptan; extensión o tipo que no corresponden, no
  Object.defineProperty(archivoInput, "files", { configurable: true, value: [
    new w.File(["x"], "patio.webp", { type: "image/webp" }), new w.File(["x"], "huerta.avif", { type: "" }),
    new w.File(["x"], "falsa.avif", { type: "text/html" }), new w.File(["x"], "programa.exe", { type: "application/x-msdownload" }),
  ] });
  archivoInput.dispatchEvent(new w.Event("change"));
  ok(await hasta(() => d.querySelector('[aria-label="Quitar patio.webp"]') && d.querySelector('[aria-label="Quitar huerta.avif"]')),
    "acepta .webp y .avif (aunque el navegador no informe el tipo)");
  const erroresArchivos = d.getElementById("carga-errores").textContent;
  ok(/falsa\.avif: el tipo del archivo \(text\/html\)/.test(erroresArchivos), "rechaza un .avif cuyo tipo no es de imagen");
  ok(/programa\.exe: formato no permitido \(se aceptan imágenes JPG, PNG, WEBP o AVIF/.test(erroresArchivos), "el rechazo dice qué formatos se aceptan");
  ok(d.getElementById("lista-adjuntos").textContent.includes("patio.webp"), "el .webp queda en el borrador");
  for (const nombre of ["patio.webp", "huerta.avif"]) {
    d.querySelector(`[aria-label="Quitar ${nombre}"]`).click();
    await hasta(() => !d.getElementById("lista-adjuntos").textContent.includes(nombre));
  }
  ok(await hasta(() => !d.getElementById("lista-adjuntos").textContent.includes("patio.webp")), "se pueden quitar");
  ok(!d.getElementById("btn-descartar").hidden, "ya existe: se puede descartar");
  d.querySelector('[data-accion="cerrar-carga"]').click();
  ok(await hasta(() => d.getElementById("panel-carga").hidden), "cerrar guarda y cierra");
  const borradoresElena = (await w.Nexo.api.listarContenidos()).filter((c) => c.estado === "borrador");
  ok(borradoresElena.length === 1 && borradoresElena[0].borrador.adjuntos[0].nombre === "afiche.png", "borrador guardado con su adjunto");
  ok(!(await publicas(w)).some((p) => p.titulo === "T"), "un borrador nunca es público");

  // Vista «Borradores»
  w.location.hash = "borradores";
  ok(await hasta(() => d.querySelector(".tarjeta-borrador")), "la vista lista el borrador");
  ok(d.querySelector(".insignia--suave")?.textContent === "1", "la pestaña cuenta los borradores propios");
  ok(d.querySelector(".progreso").textContent.includes("Completo"), "muestra que está completo");
  d.querySelector('[data-accion="abrir-borrador"]').click();
  ok(await hasta(() => !d.getElementById("panel-carga").hidden && d.getElementById("c-slug").value === "proyecto-en-preparacion"), "Continuar reabre el borrador");
  d.querySelector('#lista-adjuntos [data-accion="quitar-adjunto"]').click();
  ok(await hasta(() => !d.querySelector('#lista-adjuntos [data-accion="quitar-adjunto"]')), "quitar el adjunto");
  d.querySelector('[data-accion="descartar-borrador"]').click();
  await confirmarDialogo(w, "ok");
  ok(await hasta(() => !d.querySelector(".tarjeta-borrador")), "descartado: sale de la lista");
  ok(d.getElementById("panel-carga").hidden, "y se cierra el editor");

  // Equipo (administradora)
  await verComo("u1");
  w.location.hash = "equipo";
  await hasta(() => d.querySelector(".tabla"));
  ok(d.querySelectorAll(".tabla tbody tr").length === 5, "tabla con 5 integrantes");
  ok(d.querySelectorAll(".jerarquia__escalon").length === 3, "muestra los tres escalones de la cadena");
  ok(d.querySelector('select[data-id="u5"] optgroup[label="Cadena de aprobación"]').textContent.includes("3. Autoridad superior"), "selector agrupado por jerarquía");
  ok(d.querySelector(".nivel--3")?.closest("tr").textContent.includes("Elena Suárez"), "Elena figura como nivel 3");
  const selAut = d.querySelector('select[data-id="u5"]'); selAut.value = "director"; selAut.dispatchEvent(new w.Event("change", { bubbles: true }));
  await esperar(300);
  ok((await w.Nexo.api.listarUsuarios()).find((u) => u.id === "u5").rol === "autoridad", "no deja sin autoridad superior");
  fallo = null; try { await w.Nexo.api.darDeBaja("u5"); } catch (e) { fallo = e; }
  ok(fallo && /autoridad superior/.test(fallo.message), "no da de baja a la única autoridad");
  const sel = d.querySelector('select[data-id="u4"]'); sel.value = "colaborador"; sel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await esperar(300);
  ok((await w.Nexo.api.listarUsuarios()).find((u) => u.id === "u4").rol === "colaborador", "cambia el rol de Tomás a colaborador");
  const selAdmin = d.querySelector('select[data-id="u1"]'); selAdmin.value = "observador"; selAdmin.dispatchEvent(new w.Event("change", { bubbles: true }));
  await esperar(300);
  ok((await w.Nexo.api.listarUsuarios()).find((u) => u.id === "u1").rol === "administrador", "no deja sin administradores");
  ok(d.querySelector(".aviso--error"), "muestra aviso de error");

  // Equipo: alta, edición y baja
  const filasEquipo = () => d.querySelectorAll(".tabla tbody tr").length;
  d.querySelector('[data-accion="agregar-integrante"]').click();
  ok(d.getElementById("dialogo-integrante").open, "abre el modal de alta");
  ok(d.getElementById("i-clave-caja").hidden, "demo: sin contraseña");
  d.getElementById("i-nombre").value = "Lucía Paz";
  d.getElementById("i-email").value = "jorgelina.campos@ejemplo.edu.ar";
  d.getElementById("i-rol").value = "director";
  d.getElementById("form-integrante").dispatchEvent(new w.Event("submit", { cancelable: true }));
  await esperar(200);
  ok(!d.getElementById("integrante-errores").hidden, "rechaza correo repetido");
  d.getElementById("i-email").value = "Lucia.Paz@Ejemplo.edu.ar";
  d.getElementById("form-integrante").dispatchEvent(new w.Event("submit", { cancelable: true }));
  ok(await hasta(() => filasEquipo() === 6), "alta: 6 integrantes");
  ok(!d.getElementById("dialogo-integrante").open, "cierra el modal al guardar");
  const lucia = (await w.Nexo.api.listarUsuarios()).find((u) => u.email === "lucia.paz@ejemplo.edu.ar");
  ok(lucia && lucia.rol === "director", "se guarda con correo en minúsculas y rol inicial");
  ok(d.body.textContent.includes("Todavía no ingresó"), "último acceso vacío");

  d.querySelector(`[data-accion="editar-integrante"][data-id="${lucia.id}"]`).click();
  ok(d.getElementById("i-nombre").value === "Lucía Paz" && d.getElementById("i-rol-caja").hidden, "edición precargada, sin rol");
  d.getElementById("i-nombre").value = "Lucía Belén Paz";
  d.getElementById("form-integrante").dispatchEvent(new w.Event("submit", { cancelable: true }));
  ok(await hasta(() => d.body.textContent.includes("Lucía Belén Paz")), "edita el nombre");

  ok(d.querySelector('[data-accion="baja-integrante"][data-id="u1"]') === null, "no puede darse de baja a sí misma");
  d.querySelector(`[data-accion="baja-integrante"][data-id="${lucia.id}"]`).click();
  await confirmarDialogo(w, "cancelar");
  ok(filasEquipo() === 6, "cancelar no da de baja");
  d.querySelector(`[data-accion="baja-integrante"][data-id="${lucia.id}"]`).click();
  await confirmarDialogo(w, "ok");
  ok(await hasta(() => filasEquipo() === 5), "baja: vuelve a 5 integrantes");
  await w.Nexo.api.agregarIntegrante({ nombre: "Lucía Paz", email: "lucia.paz@ejemplo.edu.ar", rol: "observador" });
  ok((await w.Nexo.api.listarUsuarios()).find((u) => u.email === "lucia.paz@ejemplo.edu.ar").id === lucia.id, "reactivar conserva el id");
  await w.Nexo.api.darDeBaja(lucia.id);

    await w.Nexo.api.cambiarRol("u4", "observador");
  selDemo.value = "u4"; selDemo.dispatchEvent(new w.Event("change", { bubbles: true }));
  await esperar(400);
  ok(d.getElementById("btn-nuevo").disabled, "observador: 'Nuevo contenido' deshabilitado");
  ok(!d.querySelector('select[data-id]'), "observador: no puede cambiar roles");
  ok(!d.querySelector('[data-accion="agregar-integrante"], [data-accion="editar-integrante"], [data-accion="baja-integrante"]'), "observador: sin acciones de gestión");
  w.location.hash = "revision"; await esperar(200);
  ok(!d.querySelector('[data-accion="revision"], [data-accion="decision"]'), "observador: sin botones de decisión");

  selDemo.value = "u3"; selDemo.dispatchEvent(new w.Event("change", { bubbles: true }));
  await esperar(400);
  ok(!d.getElementById("btn-nuevo").disabled, "colaboradora puede crear");
  w.location.hash = "borradores";
  ok(await hasta(() => d.querySelector(".tarjeta-borrador")?.textContent.includes("Muestra de pintura")), "Analía ve su borrador de ejemplo");
  d.querySelector('[data-accion="abrir-borrador"]').click();
  ok(await hasta(() => d.querySelector('#lista-adjuntos a[download="taller-pintura.png"]')), "con su foto, que puede ver y descargar");
  d.querySelector('[data-accion="cerrar-carga"]').click();
  await hasta(() => d.getElementById("panel-carga").hidden);
  ok(!d.querySelector('[data-accion="revision"], [data-accion="decision"]'), "colaboradora: sin botones de decisión");
  let rechazo = null; try { await w.Nexo.api.publicar("c4"); } catch (e) { rechazo = e; }
  ok(rechazo && rechazo.codigo === "prohibido", "la API rechaza publicar a una colaboradora");

  // Director (u2): solo eleva o pide cambios; no publica
  selDemo.value = "u2"; selDemo.dispatchEvent(new w.Event("change", { bubbles: true }));
  await esperar(400);
  fallo = null; try { await w.Nexo.api.publicar("c4"); } catch (e) { fallo = e; }
  ok(fallo && fallo.codigo === "prohibido", "el director no puede publicar");
  fallo = null; try { await w.Nexo.api.archivar("c4"); } catch (e) { fallo = e; }
  ok(fallo && fallo.codigo === "datos_invalidos", "dar de baja exige el motivo");

  // Devolver y reenviar (director u2)
  selDemo.value = "u2"; selDemo.dispatchEvent(new w.Event("change", { bubbles: true }));
  await esperar(400);
  w.location.hash = "revision";
  await hasta(() => d.querySelector(".detalle"));
  const nuevo = (await w.Nexo.api.listarContenidos()).find((c) => c.slug === "beca-de-transporte-2027");
  d.querySelector(`[data-accion="seleccionar-revision"][data-id="${nuevo.id}"]`)?.click();
  d.getElementById("comentario-decision").value = "Falta la fecha de cierre.";
  boton("revision", "devolver").click();
  await esperar(300);
  ok(d.querySelector(".observado .observacion")?.textContent.includes("Falta la fecha de cierre."), "devolución con observaciones visible");
  ok(d.querySelector(".observado")?.textContent.includes("Esperando que Elena Suárez lo corrija"), "el director ve que espera al autor");
  ok(!d.querySelector('.observado [data-accion="nueva-version"]'), "el director no puede corregirlo (solo el autor)");
  ok(d.querySelector(".cadena__paso--devuelto")?.textContent.includes("Marcos Ledesma"), "cadena: el director devolvió");
  // la administradora tampoco lo modifica
  await w.Nexo.api.iniciarSesion("u1");
  fallo = null; try { await w.Nexo.api.iniciarBorradorDeVersion(nuevo.id); } catch (e) { fallo = e; }
  ok(fallo && fallo.codigo === "prohibido" && /solo su autor/.test(fallo.message), "lo observado lo corrige solo su autor");
  // La autora (Elena, u5) ve el aviso y reenvía
  selDemo.value = "u5"; selDemo.dispatchEvent(new w.Event("change", { bubbles: true })); await esperar(300);
  w.location.hash = "resumen";
  ok(await hasta(() => d.querySelector(".aviso-observado")), "aviso en el panel de control para la autora");
  ok(d.querySelector(".aviso-observado").textContent.includes("Beca de Transporte 2027") && d.querySelector(".aviso-observado").textContent.includes("Falta la fecha de cierre."), "con el contenido y la observación");
  d.querySelector(".aviso-observado__item").click();
  ok(await hasta(() => d.querySelector('.observado [data-accion="nueva-version"]')), "abre el detalle con «Corregir y reenviar»");
  d.querySelector('.observado [data-accion="nueva-version"]').click();
  ok(await hasta(() => !d.getElementById("panel-carga").hidden), "abre el borrador de la nueva versión");
  ok(d.getElementById("c-slug").readOnly && d.getElementById("c-titulo").value === "Beca de Transporte 2027", "reenvío precarga y bloquea el identificador");
  ok(d.getElementById("carga-contexto").textContent === "Corrección · versión 2", "indica qué versión se prepara");
  ok(!d.getElementById("carga-observaciones").hidden && d.getElementById("carga-observaciones").textContent.includes("Falta la fecha de cierre."), "las observaciones quedan a la vista mientras corrige");
  escribirEditor(d, "Cuerpo con fecha de cierre.");
  d.getElementById("form-carga").dispatchEvent(new w.Event("submit", { cancelable: true }));
  await confirmarDialogo(w, "ok");
  await esperar(400);
  const c5 = (await w.Nexo.api.listarContenidos()).find((c) => c.slug === "beca-de-transporte-2027");
  ok(c5.versiones.length === 2 && c5.versiones[0].estado === "conservada" && c5.estado === "en_revision", "nueva versión: v1 conservada, v2 en revisión");
  ok(c5.versiones[1].cuerpo === "Cuerpo con fecha de cierre.", "lo escrito antes de enviar se guarda aunque no haya evento de teclado");
  ok(c5.borrador === null, "al enviar, el borrador deja de existir");
  ok(c5.observaciones.length === 1 && c5.observaciones[0].atendida && c5.observaciones[0].atendidaEnVersion === 2, "la observación queda atendida en la versión 2");
  await w.Nexo.api.iniciarSesion("u1");
  selDemo.value = "u1"; selDemo.dispatchEvent(new w.Event("change", { bubbles: true })); await esperar(300);

  // ---------- Control y auditoría (administradora) ----------
  ok(d.querySelector('#menu [data-vista="auditoria"]'), "la administradora ve «Control y auditoría»");
  w.location.hash = "auditoria";
  ok(await hasta(() => d.querySelector(".tabla--auditoria tbody tr"), 4000), "carga el log de movimientos");
  ok(d.querySelectorAll("#auditoria-resumen .metrica").length === 4, "cuatro indicadores");
  const log = (await w.Nexo.api.consultarAuditoria({ porPagina: 100 })).registros;
  const buscarLog = (fn) => log.find(fn);
  const envio = buscarLog((r) => r.accion === "borrador.enviar" && r.detalle === "Envió a revisión «Beca de Transporte 2027» (versión 1)");
  ok(buscarLog((r) => r.accion === "borrador.enviar" && r.usuario.nombre === "Elena Suárez" && r.detalle.endsWith("(versión 2)")), "y el reenvío de la versión 2, por quien lo hizo");
  ok(buscarLog((r) => r.accion === "borrador.crear" && r.resultado === "rechazado"), "también los intentos fallidos de guardar (identificador repetido)");
  ok(envio && envio.usuario.nombre === "Elena Suárez" && envio.usuario.rol === "autoridad" && envio.modulo === "Borradores", "registra el envío con quién y desde qué módulo");
  ok(envio && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(envio.fecha), "con fecha y hora exacta");
  ok(envio && envio.ubicacion.ip && envio.ubicacion.sede === "Modo demostración", "con el lugar");
  ok(buscarLog((r) => r.accion === "decision.rechazar" && r.detalle.startsWith("Rechazó «Taller de alfabetización digital»: “No corresponde")), "registra el rechazo con su fundamento");
  ok(buscarLog((r) => r.accion === "equipo.cambiar_rol" && r.detalle === "Cambió el rol de Tomás Herrera de Observador a Colaborador"), "registra el cambio de rol con el rol anterior");
  const intento = buscarLog((r) => r.accion === "contenido.publicar" && r.resultado === "rechazado" && r.usuario.rol === "director");
  ok(intento && /autoridad superior/.test(intento.motivo), "registra el intento rechazado del director con el motivo");
  ok(buscarLog((r) => r.accion === "adjunto.ver" && r.detalle.startsWith("Abrió logoMA.png")), "registra la apertura del adjunto en el visor");
  ok(buscarLog((r) => r.accion === "borrador.adjuntar" && r.detalle.startsWith("Adjuntó afiche.png")), "registra el adjunto agregado");
  ok(buscarLog((r) => r.accion === "sesion.inicio" && r.usuario.nombre === "Marcos Ledesma"), "registra los inicios de sesión");

  // filtros desde la interfaz
  const filtro = (nombre, valor) => { const el = d.querySelector(`[data-filtro="${nombre}"]`); el.value = valor; el.dispatchEvent(new w.Event("change", { bubbles: true })); };
  filtro("resultado", "rechazado");
  ok(await hasta(() => [...d.querySelectorAll(".registro-auditoria")].every((tr) => tr.classList.contains("registro-auditoria--rechazado"))), "filtra por resultado");
  ok(d.querySelector(".registro-auditoria__motivo"), "los rechazados muestran el motivo");
  d.querySelector('[data-accion="auditoria-limpiar"]').click();
  filtro("usuario", "u3");
  ok(await hasta(() => { const filas = [...d.querySelectorAll(".registro-auditoria")]; return filas.length && filas.every((tr) => tr.textContent.includes("Analía Rojas")); }), "filtra por integrante");
  d.querySelector('[data-accion="auditoria-limpiar"]').click();
  filtro("modulo", "Gobernanza");
  ok(await hasta(() => { const filas = [...d.querySelectorAll(".registro-auditoria")]; return filas.length && filas.every((tr) => tr.textContent.includes("Gobernanza")); }), "filtra por módulo");
  d.querySelector('[data-accion="auditoria-limpiar"]').click();
  filtro("accion", "decision.aprobar");
  ok(await hasta(() => { const f = [...d.querySelectorAll(".accion-etiqueta")]; return f.length && f.every((x) => x.textContent.endsWith("Aprobó y publicó")); }), "filtra por tipo de acción");
  ok([...d.querySelectorAll(".registro-auditoria--rechazado .accion-etiqueta")].every((x) => x.textContent.startsWith("Intento rechazado")), "los rechazados se rotulan como intento");
  d.querySelector('[data-accion="auditoria-limpiar"]').click();
  const buscadorLog = d.querySelector('[data-filtro="q"]'); buscadorLog.value = "alfabetización"; buscadorLog.dispatchEvent(new w.Event("input", { bubbles: true }));
  ok(await hasta(() => { const f = [...d.querySelectorAll(".registro-auditoria__detalle")]; return f.length && f.every((x) => x.textContent.includes("alfabetización")); }), "busca por texto");
  ok(d.querySelector('[data-filtro="q"]') === buscadorLog, "el buscador no se redibuja mientras se escribe (no pierde el foco)");
  d.querySelector('[data-accion="auditoria-limpiar"]').click();
  d.querySelector('[data-accion="auditoria-rango"][data-rango="hoy"]').click();
  ok(await hasta(() => d.querySelector('[data-rango="hoy"]').getAttribute("aria-pressed") === "true"), "rango rápido «Hoy»");
  d.querySelector('[data-accion="auditoria-limpiar"]').click();
  await hasta(() => d.querySelectorAll(".registro-auditoria").length === 25);
  filtro("porPagina", "10");
  ok(await hasta(() => d.querySelectorAll(".registro-auditoria").length === 10), "10 por página");
  const primera = d.querySelector(".registro-auditoria").textContent;
  d.querySelector('[data-accion="auditoria-pagina"][data-pagina="2"]').click();
  ok(await hasta(() => d.querySelector(".paginacion__actual").textContent.startsWith("Página 2") && d.querySelector(".registro-auditoria").textContent !== primera), "pasa a la página 2");
  d.querySelector('[data-accion="auditoria-detalle"]').click();
  ok(await hasta(() => d.querySelector(".registro-detalle__datos")?.textContent.includes("UTC")), "despliega los datos técnicos del registro");

  // exportar
  const exportado = await w.Nexo.api.exportarAuditoria({ modulo: "Revisión editorial" });
  ok(exportado.csv.startsWith("\uFEFF\"Fecha y hora (Argentina)\"") && exportado.nombre.endsWith(".csv"), "exporta CSV");
  ok((await w.Nexo.api.consultarAuditoria({ accion: "auditoria.exportar" })).total >= 1, "la exportación queda registrada");

  // directorio
  d.querySelector('[data-accion="auditoria-pestana"][data-pestana="directorio"]').click();
  ok(await hasta(() => d.querySelector(".tabla--directorio")), "pestaña directorio");
  const textoDirectorio = d.querySelector(".tabla--directorio").textContent;
  ok(["Jorgelina Campos", "Elena Suárez", "+54 385 421-0303", "Prensa y contenidos", "Dado de baja"].every((t) => textoDirectorio.includes(t)), "todos los integrantes, con contacto, incluidas las bajas");
  d.querySelector('.tabla--directorio [data-accion="auditoria-ver-usuario"][data-id="u2"]').click();
  ok(await hasta(() => { const f = [...d.querySelectorAll(".registro-auditoria")]; return f.length && f.every((tr) => tr.textContent.includes("Marcos Ledesma")); }), "«Ver actividad» abre el log filtrado por esa persona");

  // contacto editable desde Equipo
  await w.Nexo.api.editarIntegrante("u4", { nombre: "Tomás Herrera", email: "tomas.herrera@ejemplo.edu.ar", telefono: "385 555-1234", area: "Mesa de entradas" });
  ok((await w.Nexo.api.consultarAuditoria({ accion: "equipo.editar" })).registros[0].detalle === "Editó teléfono de Tomás Herrera", "la edición de contacto dice qué cambió");

  // solo el administrador
  selDemo.value = "u5"; selDemo.dispatchEvent(new w.Event("change", { bubbles: true })); await esperar(400);
  ok(!d.querySelector('#menu [data-vista="auditoria"]'), "la autoridad superior no ve la auditoría");
  fallo = null; try { await w.Nexo.api.consultarAuditoria({}); } catch (e) { fallo = e; }
  ok(fallo && fallo.codigo === "prohibido", "y la API se lo niega");
  selDemo.value = "u1"; selDemo.dispatchEvent(new w.Event("change", { bubbles: true })); await esperar(400);

  // ---------- Prioridad: de la redacción a la bandeja ----------
  const comoUsuario = async (id) => { const sd = d.getElementById("selector-demo"); sd.value = id; sd.dispatchEvent(new w.Event("change", { bubbles: true })); await esperar(400); };
  await comoUsuario("u3");
  d.getElementById("btn-nuevo").click();
  ok(await hasta(() => !d.getElementById("panel-carga").hidden), "abre el editor");
  ok(d.getElementById("c-urgente-detalle").hidden && !d.getElementById("c-urgente").checked, "por defecto no es urgente");
  const interruptor = d.getElementById("c-urgente");
  interruptor.checked = true; interruptor.dispatchEvent(new w.Event("change", { bubbles: true }));
  ok(!d.getElementById("c-urgente-detalle").hidden && d.getElementById("panel-carga").classList.contains("carga--urgente"), "el interruptor muestra motivo y fecha y marca el editor");
  const en5 = new Date(Date.now() - 3 * 3600 * 1000 + 5 * 86400000).toISOString().slice(0, 10);
  const completar = (id, v) => { const el = d.getElementById(id); el.value = v; el.dispatchEvent(new w.Event("input", { bubbles: true })); };
  completar("c-motivo", "El operativo empieza el lunes");
  completar("c-vence", en5);
  elegirSitios(w, ["adultos-mayores"]); d.getElementById("c-tipo").value = "noticia";
  completar("c-seccion", "Salud"); completar("c-titulo", "Operativo de vacunación antigripal");
  completar("c-resumen", "Vacunación gratuita en los centros de día."); escribirEditor(d, "Llevá el DNI y el carnet de vacunación.");
  d.querySelector('[data-accion="guardar-borrador"]').click();
  ok(await hasta(() => d.getElementById("carga-guardado").textContent.startsWith("Guardado")), "guarda el borrador urgente");
  const borradorUrgente = (await w.Nexo.api.listarContenidos()).find((c) => c.borrador && c.borrador.titulo === "Operativo de vacunación antigripal");
  ok(borradorUrgente.borrador.prioridad.nivel === "urgente" && borradorUrgente.borrador.prioridad.motivo === "El operativo empieza el lunes", "la prioridad queda en el borrador");
  d.getElementById("form-carga").dispatchEvent(new w.Event("submit", { cancelable: true }));
  ok(await hasta(() => d.getElementById("dialogo").open), "pide confirmación");
  ok(d.getElementById("dialogo-texto").textContent.includes("URGENTE"), "la confirmación avisa que va como urgente");
  await confirmarDialogo(w, "ok");
  ok(await hasta(() => d.getElementById("panel-carga").hidden), "enviado");
  const enviadoUrgente = (await w.Nexo.api.listarContenidos()).find((c) => c.id === borradorUrgente.id);
  ok(enviadoUrgente.estado === "en_revision" && enviadoUrgente.prioridad.nivel === "urgente" && enviadoUrgente.prioridad.marcadoPor === "u3", "llega urgente al circuito");

  await comoUsuario("u2");
  ok(d.querySelector('.pestana .insignia--urgente'), "la pestaña Revisión avisa que hay urgentes");
  w.location.hash = "resumen";
  ok(await hasta(() => d.querySelector(".alerta-urgente")), "el resumen muestra la alerta de urgentes");
  ok(d.querySelector(".alerta-urgente").textContent.includes("Operativo de vacunación antigripal"), "con el contenido");
  d.querySelector(".alerta-urgente [data-accion=abrir-contenido]").click();
  ok(await hasta(() => w.location.hash === "#revision" && d.querySelector(".detalle__titulo")?.textContent.includes("vacunación")), "«Atender» abre el detalle");
  ok(d.querySelector(".franja-urgente").textContent.includes("El operativo empieza el lunes"), "el detalle muestra por qué es urgente");
  // el director lo baja a normal con el diálogo
  d.querySelector('.franja-urgente [data-accion="abrir-prioridad"]').click();
  ok(d.getElementById("dialogo-prioridad").open && d.getElementById("p-urgente").checked, "abre el diálogo con la prioridad actual");
  const pu = d.getElementById("p-urgente"); pu.checked = false; pu.dispatchEvent(new w.Event("change", { bubbles: true }));
  d.getElementById("form-prioridad").dispatchEvent(new w.Event("submit", { cancelable: true }));
  ok(await hasta(() => !d.getElementById("dialogo-prioridad").open), "guarda y cierra");
  ok(await hasta(async () => (await w.Nexo.api.listarContenidos()).find((c) => c.id === borradorUrgente.id).prioridad.nivel === "normal"), "queda normal");
  ok(await hasta(() => !d.querySelector(".franja-urgente") && d.querySelector(".prioridad-normal")), "la franja desaparece");
  ok((await w.Nexo.api.listarContenidos()).find((c) => c.id === borradorUrgente.id).historial.at(-1).comentario.startsWith("De urgente (motivo: El operativo empieza el lunes"), "queda en el historial");
  // y lo vuelve a subir
  d.querySelector('.prioridad-normal [data-accion="abrir-prioridad"]').click();
  pu.checked = true; pu.dispatchEvent(new w.Event("change", { bubbles: true }));
  d.getElementById("form-prioridad").dispatchEvent(new w.Event("submit", { cancelable: true }));
  ok(await hasta(() => d.querySelector(".franja-urgente")), "vuelve a ser urgente");
  // filtro "Solo urgentes"
  const fp = d.getElementById("f-prioridad"); fp.value = "urgente"; fp.dispatchEvent(new w.Event("change", { bubbles: true }));
  ok(await hasta(() => { const f = [...d.querySelectorAll(".solicitud")]; return f.length && f.every((x) => x.classList.contains("solicitud--urgente")); }), "filtro solo urgentes");
  fp.value = "todas"; fp.dispatchEvent(new w.Event("change", { bubbles: true }));
  // el autor no puede cambiarla una vez enviada
  await comoUsuario("u3");
  fallo = null; try { await w.Nexo.api.cambiarPrioridad(borradorUrgente.id, { nivel: "normal" }); } catch (e) { fallo = e; }
  ok(fallo && fallo.codigo === "prohibido", "el colaborador no cambia la prioridad de algo enviado");
  await comoUsuario("u1");
  ok((await w.Nexo.api.consultarAuditoria({ accion: "contenido.prioridad" })).registros.some((r) => r.detalle.includes("de urgente (motivo: El operativo empieza el lunes") && r.usuario.nombre === "Marcos Ledesma"), "el cambio de prioridad queda auditado");

  ok(dom.errores.length === 0, "sin errores de JS en consola: " + dom.errores.join(" | "));

    const dp = cargar("publico.html", null);
  // copiar los datos del panel a la vista pública
  const datos = w.localStorage.getItem("nexo.datos.v6");
  ok(datos, "hay datos del panel para copiar (la clave coincide con la de api.js)");
  const abrirSitio = (sitio) => {
    let html = fs.readFileSync(path.join(RAIZ, "publico.html"), "utf8");
    html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, s) => `<script>${fs.readFileSync(path.join(RAIZ, s), "utf8")}</script>`).replace(/<link[^>]*>/g, "");
    return new JSDOM(html, { url: `http://localhost/publico.html${sitio ? `?sitio=${sitio}` : ""}`, runScripts: "dangerously", pretendToBeVisual: true, beforeParse(x) { x.localStorage.setItem("nexo.datos.v6", datos); x.scrollTo = () => {}; } });
  };
  // Mama Antula: la noticia recién aprobada y el protocolo
  const dom2 = abrirSitio("mama-antula");
  const p = dom2.window.document;
  await hasta(() => p.querySelector(".publicacion"));
  ok(p.querySelectorAll(".publicacion").length === 2, "Mama Antula: 2 tarjetas: " + p.querySelectorAll(".publicacion").length);
  ok(p.querySelector(".seccion-conteo").textContent.startsWith("2 publicaciones"), "contador de publicaciones");
  ok(p.querySelector('.sitios-nav__enlace[aria-current="page"]').textContent === "Mama Antula", "la barra marca el sitio");
  ok(p.querySelectorAll(".sitios-nav__enlace").length === 3, "barra con los tres sitios");
  ok(!p.body.textContent.includes("Beca de Transporte"), "lo que está en revisión no se ve en público");
  // (se mira <main>: el body incluye los scripts en línea, con los datos de ejemplo)
  ok(!p.getElementById("principal").textContent.includes("Calendario académico 2027"), "lo de otros sitios no aparece");
  dom2.window.location.hash = "calendario-academico-2027";
  await hasta(() => p.querySelector(".vacio-publico"));
  ok(p.querySelector(".vacio-publico")?.textContent.includes("no existe en este sitio"), "la ficha de otro sitio no se abre");

  // Centro de Día (sin sitio en la URL se abre el primero, Adultos Mayores)
  const dom3 = abrirSitio("centro-de-dia");
  const pc = dom3.window.document;
  await hasta(() => pc.querySelector(".publicacion"));
  ok([...pc.querySelectorAll(".publicacion__titulo")].map((x) => x.textContent).join() === "Calendario académico 2027", "Centro de Día: lo dirigido a él");
  dom3.window.location.hash = "calendario-academico-2027";
  await hasta(() => pc.querySelector(".articulo"));
  ok(pc.querySelector(".articulo__titulo").textContent === "Calendario académico 2027", "detalle de una publicación");
  const dom4 = abrirSitio(null);
  await hasta(() => dom4.window.document.querySelector(".sitios-nav__enlace"));
  ok(dom4.window.document.querySelector('.sitios-nav__enlace[aria-current="page"]').textContent === "Adultos Mayores", "sin sitio: el primero");
  dom2.window.location.hash = "no-existe";
  await hasta(() => p.querySelector(".vacio-publico"));
  ok(p.querySelector(".vacio-publico"), "publicación inexistente muestra mensaje");

  
  });
});
