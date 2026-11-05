"use strict";

/* Prueba de extremo a extremo: las páginas reales del frontend (cargadas desde el servidor, con su /js/config.js)
 * hablando con la API real y la base de datos real, con sesión por cookie.
 * jsdom no trae fetch: se le inyecta uno que guarda las cookies igual que un navegador. */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

/** Escribe en el editor de "Contenido completo" (Quill) como lo haría una persona. Con HTML, lo pega con formato. */
function escribirEditor(doc, contenido, { html = false } = {}) {
  const quill = doc.defaultView.Quill.find(doc.querySelector(".editor-texto__area"));
  if (html) quill.clipboard.dangerouslyPasteHTML(contenido, "user");
  else quill.setText(contenido, "user");
}
const { JSDOM, ResourceLoader, CookieJar, VirtualConsole } = require("jsdom");
const { iniciar, ingresarComo, datosContenido, PASSWORD, db } = require("./ayudas");

let entorno;

before(async () => { entorno = await iniciar(); });
after(() => entorno.cerrar());

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function hasta(fn, ms = 4000) {
  const inicio = Date.now();
  while (Date.now() - inicio < ms) {
    if (await fn()) return true;
    await esperar(25);
  }
  return false;
}

/** fetch con cookies compartidas para una ventana de jsdom. */
function crearFetch(jar, base) {
  return async (ruta, opciones = {}) => {
    const url = new URL(ruta, base).href;
    const cabeceras = { ...(opciones.headers || {}) };
    const cookie = jar.getCookieStringSync(url, { http: true });
    if (cookie) cabeceras.cookie = cookie;
    const respuesta = await fetch(url, { ...opciones, headers: cabeceras, redirect: "manual" });
    for (const c of respuesta.headers.getSetCookie()) jar.setCookieSync(c, url, { http: true });
    return respuesta;
  };
}

/** Abre una página del sitio en jsdom, cargando sus scripts desde el servidor (nada externo). */
async function abrir(pagina, jar) {
  const base = entorno.url;
  class Cargador extends ResourceLoader {
    fetch(url, opciones) {
      return url.startsWith(base) ? super.fetch(url, opciones) : Promise.resolve(Buffer.from(""));
    }
  }
  const errores = [];
  const consola = new VirtualConsole();
  consola.on("jsdomError", (e) => { if (!/Not implemented/.test(e.message)) errores.push(e.message); });

  const dom = await JSDOM.fromURL(`${base}/${pagina}`, {
    runScripts: "dangerously",
    resources: new Cargador(),
    pretendToBeVisual: true,
    cookieJar: jar,
    virtualConsole: consola,
    beforeParse(w) {
      w.fetch = crearFetch(jar, base);
      w.FormData = FormData; // el de Node, para que fetch pueda enviarlo
      w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
      w.HTMLDialogElement.prototype.close = function (v) {
        if (v !== undefined) this.returnValue = v;
        this.open = false;
        this.dispatchEvent(new w.Event("close"));
      };
      w.Element.prototype.scrollIntoView = function () {};
      w.scrollTo = () => {};
    },
  });
  dom.errores = errores;

  // fromURL resuelve antes de que terminen de cargar los scripts: se espera al evento load.
  await new Promise((resolver) => {
    if (dom.window.document.readyState === "complete") resolver();
    else dom.window.addEventListener("load", resolver, { once: true });
  });
  assert.ok(await hasta(() => dom.window.Nexo && dom.window.Nexo.api), `los scripts de ${pagina} no se cargaron`);
  return dom;
}

async function confirmarDialogo(d, motivo) {
  await hasta(() => d.getElementById("dialogo").open);
  if (motivo) d.getElementById("dialogo-motivo").value = motivo;
  d.getElementById("dialogo").close("ok");
}

const contenidoEnBd = async (slug) => (await db.coleccion("contenidos")).findOne({ slug });
const estadoEnBd = async (slug) => (await contenidoEnBd(slug)).estado;
/** Todos los adjuntos guardados con ese nombre (en cualquier contenido). */
const adjuntosEnBd = async (nombre) =>
  (await (await db.coleccion("contenidos")).find({ "adjuntos.nombreOriginal": nombre }).toArray())
    .flatMap((c) => c.adjuntos.filter((a) => a.nombreOriginal === nombre).map((a) => ({ ...a, contenido: c })));

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

describe("login del frontend contra el servidor", () => {
  it("muestra correo y contraseña, valida y rechaza credenciales incorrectas", async () => {
    const jar = new CookieJar();
    const dom = await abrir("index.html", jar);
    const d = dom.window.document;
    await hasta(() => !d.getElementById("campos-login").hidden);
    assert.equal(d.getElementById("campos-login").hidden, false, "config.js del servidor activa el modo servidor");

    const enviar = () => d.getElementById("form-login").dispatchEvent(new dom.window.Event("submit", { cancelable: true }));

    enviar();
    assert.match(d.getElementById("error-login").textContent, /correo institucional y tu contraseña/);

    d.getElementById("l-email").value = "admin@prueba.edu.ar";
    d.getElementById("l-password").value = "clave-equivocada-1";
    enviar();
    await hasta(() => /incorrectos/.test(d.getElementById("error-login").textContent));
    assert.equal(d.getElementById("error-login").textContent, "Correo o contraseña incorrectos.");
    assert.equal(d.getElementById("btn-ingresar").disabled, false, "el botón vuelve a habilitarse");
  });

  it("con las credenciales correctas abre la sesión (cookie) y api.sesion() la devuelve", async () => {
    const jar = new CookieJar();
    const dom = await abrir("index.html", jar);
    const d = dom.window.document;
    d.getElementById("l-email").value = "admin@prueba.edu.ar";
    d.getElementById("l-password").value = PASSWORD;
    d.getElementById("form-login").dispatchEvent(new dom.window.Event("submit", { cancelable: true }));
    await hasta(async () => (await dom.window.Nexo.api.sesion()) !== null);
    const usuario = await dom.window.Nexo.api.sesion();
    assert.equal(usuario.rol, "administrador");
    assert.match(jar.getCookieStringSync(entorno.url, { http: true }), /nexo_sesion=/);
  });
});

describe("panel del frontend contra el servidor", () => {
  let colab, director, dom, d, w, jarAdmin, domAut, dAut, domDir, dDir;
  const slugs = {};

  before(async () => {
    colab = await ingresarComo(entorno.url, "colab");
    director = await ingresarComo(entorno.url, "director");

    // dos contenidos cargados por la colaboradora, uno con adjunto
    const conAdjunto = new FormData();
    slugs.pendiente = datosContenido({ titulo: "Las escuelas visitan a los abuelos", seccion: "Proyecto escuelas" }).slug;
    conAdjunto.append("datos", JSON.stringify(datosContenido({ slug: slugs.pendiente, titulo: "Las escuelas visitan a los abuelos", seccion: "Proyecto escuelas" })));
    conAdjunto.append("adjuntos", new Blob([PNG], { type: "image/png" }), "logoMA.png");
    const creado = await colab.post("/api/contenidos", conAdjunto);
    assert.equal(creado.estado, 201);

    jarAdmin = new CookieJar();
    dom = await abrir("index.html", jarAdmin);
    w = dom.window;
    await w.Nexo.api.iniciarSesion({ email: "admin@prueba.edu.ar", password: PASSWORD });
    dom.window.close();

    dom = await abrir("panel.html", jarAdmin);
    w = dom.window;
    d = w.document;
    assert.ok(await hasta(() => d.querySelector(".metrica")), "el panel se dibuja con datos reales");
  });

  it("muestra las métricas y la actividad que vienen de la base de datos", async () => {
    const valores = [...d.querySelectorAll(".metrica__valor")].map((e) => e.textContent);
    assert.deepEqual(valores, ["1", "1", "0", "0"]);
    assert.ok(d.body.textContent.includes("Las escuelas visitan a los abuelos"));
    assert.match(d.getElementById("saludo").textContent, /^Buen\S* \S+, Persona$/);
    assert.equal(d.getElementById("demo").hidden, true, "sin selector de usuarios de demostración");
  });

  it("en Revisión (director de área) muestra el autor real, la previsualización y el adjunto para ver y descargar", async () => {
    const jar = new CookieJar();
    const login = await abrir("index.html", jar);
    await login.window.Nexo.api.iniciarSesion({ email: "director@prueba.edu.ar", password: PASSWORD });
    login.window.close();
    domDir = await abrir("panel.html#revision", jar);
    dDir = domDir.window.document;
    const d = dDir;
    assert.ok(await hasta(() => d.querySelector(".detalle")));
    assert.ok(d.querySelector(".ficha").textContent.includes("Persona colab"));
    const archivo = d.querySelector(".archivo");
    assert.ok(archivo.textContent.includes("logoMA.png"));
    const descargar = archivo.querySelector("a[download]");
    assert.match(descargar.getAttribute("href"), /^\/api\/adjuntos\/[0-9a-f]{24}$/);
    assert.equal(descargar.getAttribute("download"), "logoMA.png");
    assert.ok(archivo.querySelector("img"), "miniatura de la imagen");
    assert.ok(d.querySelector(".previa-sitio img"), "la previsualización usa la primera imagen");

    // "Ver" abre el visor dentro del panel con la imagen servida por el backend
    archivo.querySelector('[data-accion="ver-adjunto"]').click();
    assert.ok(await hasta(() => d.getElementById("visor").open));
    const img = d.querySelector("#visor-cuerpo img");
    assert.match(img.getAttribute("src"), /^\/api\/adjuntos\/[0-9a-f]{24}\?ver=1$/);
    // y esa dirección responde con la sesión del revisor
    const r = await domDir.window.fetch(img.getAttribute("src"));
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-disposition"), /^inline/);
    d.querySelector('[data-accion="cerrar-visor"]').click();
  });

  it("revisión de dirección: devolver exige observaciones; elevar no aprueba ni publica; el administrador también puede revisar", async () => {
    // el administrador tiene los botones de la revisión de dirección (todavía no hay nada para decidir)
    w.location.hash = "revision";
    assert.ok(await hasta(() => d.querySelector('[data-accion="revision"][data-decision="elevar"]')), "el administrador puede revisar");
    assert.ok(!d.querySelector('[data-accion="decision"]'), "sin decisión final antes de que lo eleven");
    const d2 = dDir;
    const boton = (decision) => d2.querySelector(`[data-accion="revision"][data-decision="${decision}"]`);
    assert.ok(!d2.querySelector('[data-accion="decision"], [data-accion="publicar"]'), "el director no ve la decisión final");
    boton("devolver").click();
    await esperar(50);
    assert.equal(d2.getElementById("error-decision").hidden, false);
    assert.equal(await estadoEnBd(slugs.pendiente), "en_revision");

    boton("elevar").click();
    assert.ok(await hasta(async () => (await estadoEnBd(slugs.pendiente)) === "elevado"));
    assert.ok(await hasta(() => d2.body.textContent.includes("Esperando la decisión final")));
    assert.ok(!d2.querySelector('[data-accion="publicar"]'));
    domDir.window.close();
  });

  it("decisión final: la autoridad superior aprueba y publica desde su panel", async () => {
    const jar = new CookieJar();
    const login = await abrir("index.html", jar);
    await login.window.Nexo.api.iniciarSesion({ email: "autoridad@prueba.edu.ar", password: PASSWORD });
    login.window.close();

    domAut = await abrir("panel.html", jar);
    dAut = domAut.window.document;
    assert.ok(await hasta(() => dAut.querySelector(".metrica")));
    assert.equal(dAut.querySelector(".insignia")?.textContent, "1", "le espera una decisión");
    domAut.window.location.hash = "revision";
    assert.ok(await hasta(() => dAut.querySelector('[data-accion="decision"][data-decision="aprobar"]')));
    assert.ok(dAut.querySelector(".cadena__paso--actual").textContent.includes("Decisión final"));

    assert.ok(dAut.querySelector(".estado-publicacion").textContent.includes("Pendiente de aprobación de la Autoridad Superior"));
    const publicoAntes = await (await fetch(`${entorno.url}/api/publico/sitios/adultos-mayores/publicaciones`)).json();
    assert.equal(publicoAntes.length, 0, "elevado todavía no es público");

    // aprobar publica en el acto, previa confirmación que dice en qué sitios
    dAut.querySelector('[data-accion="decision"][data-decision="aprobar"]').click();
    assert.ok(await hasta(() => dAut.getElementById("dialogo").open));
    assert.match(dAut.getElementById("dialogo-texto").textContent, /se publica en el acto en Adultos Mayores/);
    await confirmarDialogo(dAut);
    assert.ok(await hasta(async () => (await estadoEnBd(slugs.pendiente)) === "publicado"));
    const publico = await (await fetch(`${entorno.url}/api/publico/sitios/adultos-mayores/publicaciones`)).json();
    assert.equal(publico.length, 1);
    const otroSitio = await (await fetch(`${entorno.url}/api/publico/sitios/mama-antula/publicaciones`)).json();
    assert.equal(otroSitio.length, 0, "solo en el sitio elegido");
  });

  it("el historial muestra las decisiones reales con sus responsables", async () => {
    domAut.window.location.hash = "historial";
    assert.ok(await hasta(() => dAut.querySelector(".version")));
    const texto = dAut.querySelector(".linea").textContent;
    assert.ok(texto.includes("Publicada y visible para el público."));
    assert.ok(texto.includes("Elevada a la autoridad superior") && texto.includes("Persona director"));
    assert.ok(texto.includes("Aprobada por la autoridad superior") && texto.includes("Persona autoridad"));
  });

  it("carga un contenido nuevo desde el formulario, con un archivo adjunto real", async () => {
    d.getElementById("btn-nuevo").click();
    const casillas = [...d.querySelectorAll('#c-sitios-opciones input[name="c-sitio"]')];
    assert.deepEqual(casillas.map((o) => o.value), ["adultos-mayores", "mama-antula", "centro-de-dia"], "casillas con los tres sitios");
    casillas[0].checked = true;
    casillas[2].checked = true;
    d.getElementById("c-sitios-opciones").dispatchEvent(new w.Event("change", { bubbles: true }));
    d.getElementById("c-tipo").value = "noticia";
    d.getElementById("c-seccion").value = "Becas y beneficios";
    d.getElementById("c-titulo").value = "Beca de transporte 2027";
    d.getElementById("c-titulo").dispatchEvent(new w.Event("input"));
    assert.equal(d.getElementById("c-slug").value, "beca-de-transporte-2027");
    d.getElementById("c-resumen").value = "Ayuda para viajes.";
    escribirEditor(d, '<h2>Requisitos</h2><p class="ql-align-center"><strong>Cuerpo</strong> del <em>contenido</em>.</p>'
      + '<ul><li>DNI</li></ul><p><a href="https://transporte.gob.ar">Más</a> <img src="x" onerror="alert(1)"></p>', { html: true });

    const archivo = new File([PNG], "afiche.png", { type: "image/png" });
    const input = d.getElementById("c-archivos");
    Object.defineProperty(input, "files", { value: [archivo], configurable: true });
    input.dispatchEvent(new w.Event("change"));
    assert.ok(d.getElementById("lista-adjuntos").textContent.includes("afiche.png"));
    // se sube apenas se elige: el borrador ya existe en la base con el archivo
    assert.ok(await hasta(() => d.querySelector('#lista-adjuntos [data-accion="quitar-adjunto"]')), d.getElementById("carga-errores").textContent);
    const borrador = await contenidoEnBd("beca-de-transporte-2027");
    assert.equal(borrador.estado, "borrador");
    assert.equal(borrador.borrador.adjuntos.length, 1);
    assert.equal(d.getElementById("carga-guardado").textContent.startsWith("Guardado"), true);

    d.getElementById("form-carga").dispatchEvent(new w.Event("submit", { cancelable: true }));
    await confirmarDialogo(d); // el envío se confirma
    assert.ok(await hasta(() => d.getElementById("panel-carga").hidden), d.getElementById("carga-errores").textContent);
    assert.ok(await hasta(async () => (await adjuntosEnBd("afiche.png")).length === 1));
    assert.equal(await estadoEnBd("beca-de-transporte-2027"), "en_revision");
    const guardado = await contenidoEnBd("beca-de-transporte-2027");
    assert.deepEqual(guardado.sitiosDestino, ["adultos-mayores", "centro-de-dia"]);
    assert.equal(guardado.tipo, "noticia");
    // el formato del editor llega a la versión, limpio
    const v = guardado.versiones[0];
    assert.equal(v.cuerpoHtml, '<h2>Requisitos</h2><p style="text-align:center"><strong>Cuerpo</strong> del <em>contenido</em>.</p>'
      + '<ul><li>DNI</li></ul><p><a href="https://transporte.gob.ar" target="_blank" rel="noopener noreferrer">Más</a></p>');
    assert.equal(v.cuerpo, "Requisitos\n\nCuerpo del contenido.\n\n• DNI\n\nMás", "el texto sin formato lo arma el servidor");
    assert.ok(await hasta(() => d.body.textContent.includes("Beca de transporte 2027")));
  });

  it("un identificador repetido muestra el error del servidor en el formulario", async () => {
    d.getElementById("btn-nuevo").click();
    d.querySelector('#c-sitios-opciones input[value="mama-antula"]').checked = true;
    d.getElementById("c-tipo").value = "noticia";
    d.getElementById("c-seccion").value = "X";
    d.getElementById("c-slug").value = slugs.pendiente;
    d.getElementById("c-titulo").value = "T";
    d.getElementById("c-resumen").value = "R";
    escribirEditor(d, "C");
    d.getElementById("form-carga").dispatchEvent(new w.Event("submit", { cancelable: true }));
    assert.ok(await hasta(() => /identificador web/.test(d.getElementById("carga-errores").textContent)));
    d.querySelector('[data-accion="cerrar-carga"]').click();
  });

  it("devolución con comentario y reenvío de nueva versión conservando el adjunto", async () => {
    const pendiente = String((await contenidoEnBd("beca-de-transporte-2027"))._id);
    const r = await director.post(`/api/contenidos/${pendiente}/revision`, { decision: "devolver", comentario: "Falta la fecha." });
    assert.equal(r.estado, 200);

    // el autor (la administradora, que lo cargó desde el formulario) recarga su panel y reenvía
    const domAutor = await abrir("panel.html", jarAdmin);
    const da = domAutor.window.document;
    assert.ok(await hasta(() => da.querySelector(".metrica")));
    domAutor.window.location.hash = "revision";
    assert.ok(await hasta(() => da.querySelector('[data-accion="nueva-version"]')));
    assert.ok(da.body.textContent.includes("Falta la fecha."), "ve el comentario de la devolución");

    da.querySelector('[data-accion="nueva-version"]').click();
    assert.ok(await hasta(() => !da.getElementById("panel-carga").hidden));
    assert.equal(da.getElementById("c-slug").readOnly, true);
    assert.ok(da.getElementById("lista-adjuntos").textContent.includes("afiche.png"), "precarga el adjunto existente");
    escribirEditor(da, "Cuerpo con la fecha de cierre.");
    da.getElementById("form-carga").dispatchEvent(new domAutor.window.Event("submit", { cancelable: true }));
    await confirmarDialogo(da);
    assert.ok(await hasta(() => da.getElementById("panel-carga").hidden), da.getElementById("carga-errores").textContent);

    const { versiones } = await contenidoEnBd("beca-de-transporte-2027");
    assert.deepEqual(versiones.map((v) => [v.numero, v.estado]), [[1, "conservada"], [2, "en_revision"]]);
    const afiches = await adjuntosEnBd("afiche.png");
    assert.equal(afiches.length, 1, "sin duplicar el archivo");
    const enlaces = versiones.filter((v) => v.adjuntos.some((id) => id.equals(afiches[0]._id))).length;
    assert.equal(enlaces, 2, "el mismo archivo enlazado a las dos versiones");
    await esperar(400); // deja terminar el refresco del panel antes de cerrar la ventana
    domAutor.window.close();
  });

  it("menú ⋯ de cada contenido: el administrador lo da de baja (con confirmación) y desaparece de los sitios", async () => {
    w.location.hash = "historial";
    assert.ok(await hasta(() => d.querySelector(".registro")));
    const idPublicado = String((await contenidoEnBd(slugs.pendiente))._id);
    const fila = () => d.querySelector(`[data-accion="seleccionar-historial"][data-id="${idPublicado}"]`).closest("li");
    const boton = fila().querySelector('[data-accion="menu-acciones"]');
    assert.ok(boton, "la fila tiene el menú de acciones");
    boton.click();
    const menu = fila().querySelector('[role="menu"]');
    assert.equal(menu.hidden, false);
    assert.equal(boton.getAttribute("aria-expanded"), "true");
    const opciones = [...menu.querySelectorAll('[role="menuitem"]')].map((x) => x.textContent.trim());
    assert.ok(opciones[0].startsWith("Editar") && opciones[1].startsWith("Dar de baja"), opciones.join(" | "));

    // cancelar no hace nada
    menu.querySelector('[data-accion="archivar"]').click();
    assert.ok(await hasta(() => d.getElementById("dialogo").open));
    assert.match(d.getElementById("dialogo-texto").textContent, /Deja de verse ahora mismo en Adultos Mayores/);
    assert.equal(d.getElementById("dialogo-ok").disabled, true, "sin motivo no se puede confirmar");
    d.getElementById("dialogo").close("cancelar");
    await esperar(200);
    assert.equal(await estadoEnBd(slugs.pendiente), "publicado");

    fila().querySelector('[data-accion="menu-acciones"]').click();
    fila().querySelector('[data-accion="archivar"]').click();
    await confirmarDialogo(d, "Convocatoria vencida");
    assert.ok(await hasta(async () => (await estadoEnBd(slugs.pendiente)) === "archivado"));
    const publico = await (await fetch(`${entorno.url}/api/publico/sitios/adultos-mayores/publicaciones`)).json();
    assert.equal(publico.length, 0);
    assert.equal((await contenidoEnBd(slugs.pendiente)).versiones.length, 1, "la versión se conserva");
    assert.ok(await hasta(() => fila().textContent.includes("Dado de baja")));
    // el menú ahora ofrece reactivar
    fila().querySelector('[data-accion="menu-acciones"]').click();
    assert.ok(fila().querySelector('[data-accion="restaurar"]'), "ofrece reactivar");
    d.body.click();
    assert.equal(fila().querySelector('[role="menu"]').hidden, true, "un clic afuera cierra el menú");
    await esperar(300);
    assert.deepEqual(domAut.errores, []);
    domAut.window.close();
  });

  it("Equipo: el administrador cambia un rol y se guarda en la base", async () => {
    w.location.hash = "equipo";
    assert.ok(await hasta(() => d.querySelector(".tabla")));
    assert.equal(d.querySelectorAll(".tabla tbody tr").length, 6);
    const usuarioEnBd = async () => (await db.coleccion("usuarios")).findOne({ email: "obs@prueba.edu.ar" });
    const idObs = String((await usuarioEnBd())._id);
    const buscar = () => d.querySelector(`select[data-id="${idObs}"]`);
    const rolEnBd = async () => (await usuarioEnBd()).rol;

    buscar().value = "colaborador";
    buscar().dispatchEvent(new w.Event("change", { bubbles: true }));
    assert.ok(await hasta(async () => (await rolEnBd()) === "colaborador"));

    // la tabla se vuelve a dibujar después de cada cambio, por eso se busca el select de nuevo
    assert.ok(await hasta(() => buscar() && buscar().value === "colaborador"));
    buscar().value = "observador";
    buscar().dispatchEvent(new w.Event("change", { bubbles: true }));
    assert.ok(await hasta(async () => (await rolEnBd()) === "observador"));
  });

  it("sin errores de JavaScript en toda la sesión", () => {
    assert.deepEqual(dom.errores, []);
  });
});

describe("permisos en la interfaz conectada al servidor", () => {
  it("el observador ve el panel de solo lectura y sin acciones de decisión ni de roles", async () => {
    const jar = new CookieJar();
    const login = await abrir("index.html", jar);
    await login.window.Nexo.api.iniciarSesion({ email: "obs@prueba.edu.ar", password: PASSWORD });
    login.window.close();

    const dom = await abrir("panel.html", jar);
    const d = dom.window.document;
    assert.ok(await hasta(() => d.querySelector(".metrica")));
    assert.equal(d.getElementById("btn-nuevo").disabled, true);
    dom.window.location.hash = "equipo";
    assert.ok(await hasta(() => d.querySelector(".tabla")));
    assert.equal(d.querySelectorAll("select[data-accion]").length, 0);
    dom.window.close();
  });

  it("sin sesión, el panel no muestra datos y lleva al login", async () => {
    const dom = await abrir("panel.html", new CookieJar());
    await esperar(600);
    assert.equal(dom.window.document.querySelector(".metrica"), null);
    dom.window.close();
  });

  it("la vista pública funciona sin sesión y muestra lo publicado", async () => {
    const admin = await ingresarComo(entorno.url, "admin");
    const conAdjunto = new FormData();
    conAdjunto.append("datos", JSON.stringify(datosContenido({ slug: "convocatoria-publica", titulo: "Convocatoria pública", seccion: "Comunidad" })));
    conAdjunto.append("adjuntos", new Blob([PNG], { type: "image/png" }), "bases.png");
    const creado = (await admin.post("/api/contenidos", conAdjunto)).datos;
    const director = await ingresarComo(entorno.url, "director");
    const autoridad = await ingresarComo(entorno.url, "autoridad");
    await director.post(`/api/contenidos/${creado.id}/revision`, { decision: "elevar" });
    await autoridad.post(`/api/contenidos/${creado.id}/decision`, { decision: "aprobar" }); // publica

    const dom = await abrir("publico.html", new CookieJar());
    const d = dom.window.document;
    assert.ok(await hasta(() => d.querySelector(".publicacion")));
    assert.ok(d.querySelector(".publicacion__titulo").textContent.includes("Convocatoria pública"));
    assert.ok(!d.body.textContent.includes("Persona"), "no aparecen autores");

    dom.window.location.hash = "convocatoria-publica";
    assert.ok(await hasta(() => d.querySelector(".articulo")));
    const enlace = d.querySelector(".articulo__documentos a");
    assert.ok(enlace, "muestra el documento adjunto");
    const descarga = await fetch(entorno.url + enlace.getAttribute("href"));
    assert.equal(descarga.status, 200);
    assert.deepEqual(Buffer.from(await descarga.arrayBuffer()), PNG);
    assert.deepEqual(dom.errores, []);
    dom.window.close();
  });
});

describe("control y auditoría en el panel, contra el servidor", () => {
  const { esperarPendientes } = require("../backend/src/auditoria/registro");
  let dom, d, w;

  before(async () => {
    const jar = new CookieJar();
    const login = await abrir("index.html", jar);
    await login.window.Nexo.api.iniciarSesion({ email: "admin@prueba.edu.ar", password: PASSWORD });
    login.window.close();
    // un intento rechazado de otro rol, para verlo en el log
    const director = await ingresarComo(entorno.url, "director");
    const c = (await (await ingresarComo(entorno.url, "colab")).post("/api/contenidos", datosContenido({ titulo: "Para auditar" }))).datos;
    await director.post(`/api/contenidos/${c.id}/publicar`);
    await esperarPendientes();
    dom = await abrir("panel.html#auditoria", jar);
    w = dom.window;
    d = w.document;
  });

  after(() => dom.window.close());

  it("muestra los movimientos que registró el backend, con quién, cuándo, dónde y qué", async () => {
    assert.ok(await hasta(() => d.querySelector(".tabla--auditoria tbody tr")), "carga el log");
    const texto = d.querySelector(".tabla--auditoria").textContent;
    assert.ok(texto.includes("Intentó publicar «Para auditar»"), "el intento rechazado del director");
    assert.ok(texto.includes("Persona director") && texto.includes("director@prueba.edu.ar"), "nombre y correo");
    assert.ok(texto.includes("Publicaciones") && texto.includes("127.0.0.1"), "módulo e IP");
    const fila = [...d.querySelectorAll(".registro-auditoria")].find((tr) => tr.textContent.includes("Intentó publicar «Para auditar»"));
    assert.ok(fila.classList.contains("registro-auditoria--rechazado"));
    assert.match(fila.querySelector(".registro-auditoria__motivo").textContent, /autoridad superior/);
    assert.match(fila.querySelector("time").textContent, /^\d{2}\/\d{2}\/\d{4}\d{2}:\d{2}:\d{2}$/, "fecha y hora con segundos");
  });

  it("filtra con el backend y pagina", async () => {
    const sel = d.querySelector('[data-filtro="resultado"]');
    sel.value = "rechazado";
    sel.dispatchEvent(new w.Event("change", { bubbles: true }));
    assert.ok(await hasta(() => {
      const filas = [...d.querySelectorAll(".registro-auditoria")];
      return filas.length && filas.every((tr) => tr.classList.contains("registro-auditoria--rechazado"));
    }));
    d.querySelector('[data-accion="auditoria-limpiar"]').click();
    const tam = await hasta(() => d.querySelector('[data-filtro="porPagina"]'));
    assert.ok(tam);
    const porPagina = d.querySelector('[data-filtro="porPagina"]');
    porPagina.value = "10";
    porPagina.dispatchEvent(new w.Event("change", { bubbles: true }));
    assert.ok(await hasta(() => d.querySelectorAll(".registro-auditoria").length === 10));
    assert.match(d.querySelector(".paginacion__texto").textContent, /Mostrando 1–10 de \d+ movimientos/);
  });

  it("directorio completo con contacto, y exportación que llega como CSV", async () => {
    d.querySelector('[data-accion="auditoria-pestana"][data-pestana="directorio"]').click();
    assert.ok(await hasta(() => d.querySelector(".tabla--directorio")));
    assert.ok(d.querySelector(".tabla--directorio").textContent.includes("obs@prueba.edu.ar"));
    const { url } = await w.Nexo.api.exportarAuditoria({ modulo: "Publicaciones" });
    const r = await w.fetch(url);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), /text\/csv/);
    assert.ok((await r.text()).includes("Intentó publicar «Para auditar»"));
    await esperar(300);
    assert.deepEqual(dom.errores, []);
  });
});
