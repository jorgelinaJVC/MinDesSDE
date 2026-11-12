"use strict";

/* Conexión de los sitios satélite con Nexo:
 *   - la consulta pública por sitio (estado autorizado, orden, límite aplicado en la base, caché)
 *   - el cliente frontend/sitios/nexo-sitio.js, cargado en jsdom contra el servidor real
 */

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM, VirtualConsole } = require("jsdom");
const { iniciar, cliente, ingresarComo, datosContenido, db } = require("./ayudas");

const SITIOS = path.join(__dirname, "..", "frontend", "sitios");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

let entorno, colab, director, autoridad, publico;

before(async () => {
  entorno = await iniciar();
  [colab, director, autoridad] = await Promise.all(["colab", "director", "autoridad"].map((c) => ingresarComo(entorno.url, c)));
  publico = cliente(entorno.url);
});
after(() => entorno.cerrar());

async function aprobar(datos, archivos = []) {
  let cuerpo = datos;
  if (archivos.length) {
    cuerpo = new FormData();
    cuerpo.append("datos", JSON.stringify(datos));
    for (const [contenido, nombre, tipo] of archivos) cuerpo.append("adjuntos", new Blob([contenido], { type: tipo }), nombre);
  }
  const c = await colab.post("/api/contenidos", cuerpo);
  assert.equal(c.estado, 201, JSON.stringify(c.datos));
  await director.post(`/api/contenidos/${c.datos.id}/revision`, { decision: "elevar" });
  const r = await autoridad.post(`/api/contenidos/${c.datos.id}/decision`, { decision: "aprobar" });
  assert.equal(r.estado, 200, JSON.stringify(r.datos));
  return r.datos;
}

const listar = async (sitio, consulta = "") => (await publico.get(`/api/publico/sitios/${sitio}/publicaciones${consulta}`));
const URGENTE = { nivel: "urgente", motivo: "Interno: no se publica" };

describe("consulta por sitio", () => {
  let viejoUrgente;

  before(async () => {
    // un urgente publicado ANTES que varios normales: por fecha quedaría último
    viejoUrgente = await aprobar(datosContenido({ sitio: "centro-de-dia", titulo: "Urgente más viejo", prioridad: URGENTE }));
    for (let i = 1; i <= 4; i += 1) await aprobar(datosContenido({ sitio: "centro-de-dia", titulo: `Normal ${i}` }));
  });

  it("urgentes vigentes primero y después el resto, cada grupo del más reciente al más antiguo", async () => {
    const r = await listar("centro-de-dia");
    assert.equal(r.estado, 200);
    assert.deepEqual(r.datos.map((p) => p.titulo), ["Urgente más viejo", "Normal 4", "Normal 3", "Normal 2", "Normal 1"]);
    assert.equal(r.datos[0].urgente, true);
  });

  it("el límite se aplica en la base sin dejar afuera a un urgente", async () => {
    const uno = (await listar("centro-de-dia", "?limite=1")).datos;
    assert.deepEqual(uno.map((p) => p.titulo), ["Urgente más viejo"]);
    const tres = (await listar("centro-de-dia", "?limite=3")).datos;
    assert.deepEqual(tres.map((p) => p.titulo), ["Urgente más viejo", "Normal 4", "Normal 3"]);
    for (const malo of ["0", "101", "abc", "2.5", "-1"]) {
      assert.equal((await listar("centro-de-dia", `?limite=${malo}`)).estado, 400, `limite=${malo}`);
    }
  });

  it("se puede recorrer por páginas (?desde=) y da lo mismo que la lista completa, sin repetir ni saltear", async () => {
    const completa = (await listar("centro-de-dia")).datos.map((p) => p.titulo);
    for (const tam of [1, 2, 3]) {
      const paginas = [];
      for (let desde = 0; desde < completa.length + tam; desde += tam) {
        const r = await listar("centro-de-dia", `?limite=${tam}&desde=${desde}`);
        assert.equal(r.estado, 200);
        paginas.push(...r.datos.map((p) => p.titulo));
      }
      assert.deepEqual(paginas, completa, `de a ${tam}`);
    }
    // por tipo, como lo piden los sitios para cada sección
    const noticias = (await listar("centro-de-dia", "?tipo=noticia&limite=2&desde=1")).datos.map((p) => p.titulo);
    assert.deepEqual(noticias, completa.slice(1, 3));
    for (const malo of ["-1", "abc", "1.5", "100001"]) {
      assert.equal((await listar("centro-de-dia", `?desde=${malo}`)).estado, 400, `desde=${malo}`);
    }
  });

  it("un urgente con la fecha vencida vuelve a su lugar por fecha", async () => {
    const contenidos = await db.coleccion("contenidos");
    await contenidos.updateOne({ _id: db.aId(viejoUrgente.id) }, { $set: { "prioridadPublicada.vence": new Date(Date.now() - 86400000) } });
    const lista = (await listar("centro-de-dia")).datos;
    assert.equal(lista.at(-1).titulo, "Urgente más viejo");
    assert.equal(lista.at(-1).urgente, false);
    await contenidos.updateOne({ _id: db.aId(viejoUrgente.id) }, { $set: { "prioridadPublicada.vence": null } });
  });

  it("exige un estado autorizado además de la versión aprobada (aunque alguien edite la base a mano)", async () => {
    const c = await aprobar(datosContenido({ sitio: "mama-antula", titulo: "Estado alterado" }));
    const contenidos = await db.coleccion("contenidos");
    assert.ok((await listar("mama-antula")).datos.some((p) => p.titulo === "Estado alterado"));
    for (const estado of ["borrador", "archivado", "aprobado", "descartado"]) {
      await contenidos.updateOne({ _id: db.aId(c.id) }, { $set: { estado } }, { bypassDocumentValidation: true });
      assert.ok(!(await listar("mama-antula")).datos.some((p) => p.titulo === "Estado alterado"), estado);
    }
    await contenidos.updateOne({ _id: db.aId(c.id) }, { $set: { estado: "publicado" } });
  });

  it("los sitios revalidan en cada carga (no queda una lista vieja en caché) y reciben 304 si nada cambió", async () => {
    const r = await fetch(`${entorno.url}/api/publico/sitios/centro-de-dia/publicaciones`);
    assert.equal(r.headers.get("cache-control"), "public, no-cache");
    const etag = r.headers.get("etag");
    assert.ok(etag);
    // con node:http (como un navegador que revalida): el fetch de Node agrega cabeceras que fuerzan una respuesta completa
    const estado = await new Promise((resolver, rechazar) => {
      http.get(`${entorno.url}/api/publico/sitios/centro-de-dia/publicaciones`, { headers: { "if-none-match": etag } }, (res) => {
        res.resume(); resolver(res.statusCode);
      }).on("error", rechazar);
    });
    assert.equal(estado, 304);
  });

  it("los archivos del cliente se pueden cargar desde otro dominio; el resto de Nexo no", async () => {
    for (const archivo of ["nexo-sitio.js", "nexo-sitio.css"]) {
      const r = await fetch(`${entorno.url}/sitios/${archivo}`);
      assert.equal(r.status, 200, archivo);
      assert.equal(r.headers.get("cross-origin-resource-policy"), "cross-origin", archivo);
    }
    const panel = await fetch(`${entorno.url}/js/panel.js`);
    assert.equal(panel.headers.get("cross-origin-resource-policy"), "same-origin");
  });
});

/* ---------- Cliente nexo-sitio.js en jsdom ---------- */

function pagina(atributos, { fetchFalso } = {}) {
  const consola = new VirtualConsole();
  const errores = [];
  consola.on("jsdomError", (e) => errores.push(e.message));
  // el script va en línea: se escapa "</script" (aparece en el comentario de uso) para que no corte la etiqueta
  const script = fs.readFileSync(path.join(SITIOS, "nexo-sitio.js"), "utf8").replace(/<\/script/gi, "<\\/script");
  const html = `<!DOCTYPE html><html><body><section id="bloque" ${atributos}></section><script>${script}</script></body></html>`;
  const dom = new JSDOM(html, {
    url: "http://sitio-satelite.ejemplo/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: consola,
    beforeParse(w) {
      // jsdom no trae fetch: se usa el de Node (pedido real al servidor de prueba), o uno falso
      w.fetch = fetchFalso || ((url, opciones) => fetch(url, opciones));
      w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
      w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event("close")); };
    },
  });
  dom.errores = errores;
  return dom;
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function hasta(fn, ms = 3000) { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await esperar(20); } return false; }

describe("cliente de los sitios satélite (nexo-sitio.js)", () => {
  before(async () => {
    await aprobar(datosContenido({ sitio: "adultos-mayores", tipo: "noticia", seccion: "Salud", titulo: "Noticia con foto" }),
      [[PNG, "portada.png", "image/png"]]);
    await aprobar(datosContenido({ sitio: "adultos-mayores", tipo: "proyecto", seccion: "Cognitivo", titulo: "Proyecto de memoria" }));
    await aprobar(datosContenido({ sitio: "adultos-mayores", tipo: "galeria", seccion: "Fiestas", titulo: "Álbum de la fiesta" }),
      [[PNG, "f1.png", "image/png"], [PNG, "f2.png", "image/png"]]);
    await aprobar(datosContenido({ sitio: "adultos-mayores", tipo: "noticia", seccion: "Avisos", titulo: "Aviso urgente", prioridad: URGENTE }));
    await aprobar(datosContenido({ sitio: "adultos-mayores", tipo: "noticia", seccion: "<b>x</b>", titulo: "<img src=x onerror=alert(1)>" }));
    await aprobar(datosContenido({ sitio: "mama-antula", titulo: "Solo de Mama Antula" }));
    // elevado, sin aprobar
    const p = (await colab.post("/api/contenidos", datosContenido({ sitio: "adultos-mayores", titulo: "Sin aprobar" }))).datos;
    await director.post(`/api/contenidos/${p.id}/revision`, { decision: "elevar" });
  });

  it("dibuja Noticias, Proyectos y Galerías del sitio, solo con lo aprobado", async () => {
    const dom = pagina(`data-nexo-sitio="adultos-mayores" data-nexo-api="${entorno.url}"`);
    const d = dom.window.document;
    assert.ok(await hasta(() => d.querySelector(".nexo-seccion")), "carga");
    assert.deepEqual([...d.querySelectorAll(".nexo-seccion__titulo")].map((x) => x.textContent), ["Noticias", "Proyectos institucionales", "Galerías de fotos"]);
    const titulos = [...d.querySelectorAll(".nexo-tarjeta__titulo")].map((x) => x.textContent);
    for (const t of ["Noticia con foto", "Proyecto de memoria", "Álbum de la fiesta", "Aviso urgente"]) assert.ok(titulos.includes(t), t);
    assert.ok(!titulos.includes("Solo de Mama Antula"), "lo de otro sitio no aparece");
    assert.ok(!titulos.includes("Sin aprobar"), "lo pendiente no aparece");
    assert.equal(d.querySelector(".nexo-seccion--proyecto .nexo-tarjeta__titulo").textContent, "Proyecto de memoria");
    assert.equal(d.querySelector(".nexo-seccion--galeria .nexo-tarjeta__contador").textContent, "2");
    assert.match(d.querySelector(".nexo-seccion--noticia img").getAttribute("src"), new RegExp(`^${entorno.url}/api/publico/adjuntos/[0-9a-f]{24}$`));
    assert.equal(d.getElementById("bloque").getAttribute("aria-busy"), "false");
    assert.deepEqual(dom.errores, []);
  });

  it("diferencia los prioritarios: banda arriba, tarjeta marcada y primera en su sección; sin el motivo interno", async () => {
    const dom = pagina(`data-nexo-sitio="adultos-mayores" data-nexo-api="${entorno.url}"`);
    const d = dom.window.document;
    assert.ok(await hasta(() => d.querySelector(".nexo-seccion")));
    assert.equal(d.querySelector(".nexo-aviso__titulo").textContent, "Aviso urgente");
    const marcada = d.querySelector(".nexo-tarjeta--prioritaria");
    assert.equal(marcada.querySelector(".nexo-tarjeta__titulo").textContent, "Aviso urgente");
    assert.ok(marcada.querySelector(".nexo-marca-prioritario").textContent.includes("Prioritario"));
    assert.equal(d.querySelector(".nexo-seccion--noticia .nexo-tarjeta__titulo").textContent, "Aviso urgente");
    assert.ok(!d.body.textContent.includes("Interno: no se publica"));
  });

  it("escribe todo como texto: un título con HTML no se interpreta", async () => {
    const dom = pagina(`data-nexo-sitio="adultos-mayores" data-nexo-api="${entorno.url}"`);
    const d = dom.window.document;
    assert.ok(await hasta(() => d.querySelector(".nexo-seccion")));
    const titulos = [...d.querySelectorAll(".nexo-tarjeta__titulo")].map((x) => x.textContent);
    assert.ok(titulos.includes("<img src=x onerror=alert(1)>"));
    assert.equal(d.querySelectorAll('img[src="x"]').length, 0);
    assert.equal(d.querySelectorAll(".nexo-publicaciones b").length, 0);
  });

  it("abre el detalle con el texto completo y, en una galería, todas las fotos", async () => {
    const dom = pagina(`data-nexo-sitio="adultos-mayores" data-nexo-api="${entorno.url}"`);
    const d = dom.window.document;
    assert.ok(await hasta(() => d.querySelector(".nexo-seccion")));
    [...d.querySelectorAll(".nexo-tarjeta")].find((b) => b.textContent.includes("Álbum de la fiesta")).click();
    const dialogo = d.getElementById("nexo-detalle");
    assert.ok(dialogo.open);
    assert.equal(dialogo.querySelector(".nexo-detalle__titulo").textContent, "Álbum de la fiesta");
    // álbum: cuadrícula de miniaturas (botones, no enlaces que abren otra pestaña)
    const miniaturas = dialogo.querySelectorAll(".nexo-album__grilla .nexo-album__foto");
    assert.equal(miniaturas.length, 2);
    assert.equal(dialogo.querySelectorAll("a[target=_blank]").length, 0);
    assert.match(dialogo.querySelector(".nexo-album__ayuda").textContent, /2 fotos/);

    // tocar una miniatura la amplía en el visor; las flechas recorren el álbum
    miniaturas[1].click();
    const visor = d.querySelector("dialog.nexo-visor");
    assert.ok(visor && visor.open, "abre el visor");
    assert.equal(visor.querySelector(".nexo-visor__pie").textContent, "Álbum de la fiesta · 2 de 2");
    assert.match(visor.querySelector(".nexo-visor__img").getAttribute("src"), /\/api\/publico\/adjuntos\/[0-9a-f]{24}$/);
    visor.querySelector(".nexo-visor__nav--siguiente").click();
    assert.equal(visor.querySelector(".nexo-visor__pie").textContent, "Álbum de la fiesta · 1 de 2");
    visor.querySelector(".nexo-visor__cerrar").click();
    assert.equal(visor.open, false, "la X cierra el visor");
    assert.ok(dialogo.open, "y deja el álbum abierto");
    assert.equal(d.activeElement, miniaturas[1], "el foco vuelve a la miniatura");

    dialogo.querySelector(".nexo-detalle__cerrar").click();
    assert.equal(dialogo.open, false);
  });

  it("respeta data-nexo-tipos y data-nexo-limite", async () => {
    const dom = pagina(`data-nexo-sitio="adultos-mayores" data-nexo-api="${entorno.url}" data-nexo-tipos="galeria,noticia" data-nexo-limite="2" data-nexo-titulo=""`);
    const d = dom.window.document;
    assert.ok(await hasta(() => d.querySelector(".nexo-seccion")));
    assert.deepEqual([...d.querySelectorAll(".nexo-seccion__titulo")].map((x) => x.textContent), ["Galerías de fotos", "Noticias"]);
    assert.equal(d.querySelectorAll(".nexo-tarjeta").length, 2);
    assert.equal(d.querySelector(".nexo-publicaciones__titulo"), null, "sin título");
  });

  it("si Nexo no responde o el sitio no existe, avisa y deja reintentar", async () => {
    const caido = pagina('data-nexo-sitio="adultos-mayores" data-nexo-api="http://127.0.0.1:9"');
    assert.ok(await hasta(() => caido.window.document.querySelector(".nexo-error")), "sin conexión");
    assert.ok(caido.window.document.querySelector(".nexo-error button"));

    const inexistente = pagina(`data-nexo-sitio="no-existe" data-nexo-api="${entorno.url}"`);
    assert.ok(await hasta(() => inexistente.window.document.querySelector(".nexo-error")));
    assert.match(inexistente.window.document.querySelector(".nexo-error__detalle").textContent, /no existe/);
  });

  it("descarta URL de archivos que no son de Nexo (aunque la API las mandara)", async () => {
    const dom = pagina('data-nexo-sitio="adultos-mayores" data-nexo-api="http://nexo.falso"', {
      fetchFalso: async () => ({
        ok: true, status: 200,
        json: async () => [{
          slug: "x", tipo: "noticia", seccion: "S", titulo: "T", resumen: "R", cuerpo: "C", fecha: new Date().toISOString(),
          imagenes: [{ id: "1", nombre: "a.png", url: "javascript:alert(1)" }, { id: "2", nombre: "b.png", url: "//malo.com/x.png" }],
          documentos: [{ id: "3", nombre: "d.pdf", url: "https://malo.com/d.pdf" }], urgente: false, urgenteHasta: null,
        }],
      }),
    });
    const d = dom.window.document;
    assert.ok(await hasta(() => d.querySelector(".nexo-tarjeta")));
    assert.equal(d.querySelectorAll(".nexo-publicaciones img").length, 0);
    assert.ok(d.querySelector(".nexo-tarjeta__sin-img"));
    d.querySelector(".nexo-tarjeta").click();
    assert.equal(d.querySelectorAll("#nexo-detalle a").length, 0, "ni enlaces a documentos de afuera");
  });

  it("muestra el contenido con formato y vuelve a filtrarlo (aunque la API mandara HTML peligroso)", async () => {
    const html = '<h2 onclick="x()">Requisitos</h2><p class="ql-align-center"><strong>DNI</strong> y <em>carnet</em></p>'
      + '<ul><li>Uno</li></ul><ol><li style="text-align:right">Dos</li></ol>'
      + '<p><a href="https://ok.gob.ar">bien</a> <a href="javascript:alert(1)">mal</a> <a href="www.gob.ar">www</a></p>'
      + '<img src=x onerror="window.atacado=1"><script>window.atacado=1</script><iframe src="https://malo.com"></iframe>'
      + '<p style="background:url(x)">fin<svg><g onload="window.atacado=1"></g></svg></p>';
    const dom = pagina('data-nexo-sitio="adultos-mayores" data-nexo-api="http://nexo.falso"', {
      fetchFalso: async () => ({
        ok: true, status: 200,
        json: async () => [{
          slug: "x", tipo: "noticia", seccion: "S", titulo: "Con formato", resumen: "R", cuerpo: "texto plano", cuerpoHtml: html,
          fecha: new Date().toISOString(), imagenes: [], documentos: [], urgente: false, urgenteHasta: null,
        }],
      }),
    });
    const d = dom.window.document;
    assert.ok(await hasta(() => d.querySelector(".nexo-tarjeta")));
    d.querySelector(".nexo-tarjeta").click();
    const texto = d.querySelector("#nexo-detalle .nexo-detalle__texto");
    assert.equal(texto.innerHTML,
      "<h2>Requisitos</h2><p style=\"text-align: center;\"><strong>DNI</strong> y <em>carnet</em></p>"
      + "<ul><li>Uno</li></ul><ol><li style=\"text-align: right;\">Dos</li></ol>"
      + "<p><a href=\"https://ok.gob.ar\" target=\"_blank\" rel=\"noopener noreferrer\">bien</a> mal "
      + "<a href=\"https://www.gob.ar\" target=\"_blank\" rel=\"noopener noreferrer\">www</a></p><p>fin</p>");
    await esperar(50);
    assert.equal(dom.window.atacado, undefined, "no se ejecutó nada");
    assert.deepEqual(dom.errores, []);
  });

  it("los contenidos sin formato se siguen mostrando como párrafos", async () => {
    const dom = pagina('data-nexo-sitio="adultos-mayores" data-nexo-api="http://nexo.falso"', {
      fetchFalso: async () => ({
        ok: true, status: 200,
        json: async () => [{
          slug: "y", tipo: "noticia", seccion: "S", titulo: "Sin formato", resumen: "R", cuerpo: "Uno\nlínea\n\nDos <b>", cuerpoHtml: null,
          fecha: new Date().toISOString(), imagenes: [], documentos: [], urgente: false, urgenteHasta: null,
        }],
      }),
    });
    const d = dom.window.document;
    assert.ok(await hasta(() => d.querySelector(".nexo-tarjeta")));
    d.querySelector(".nexo-tarjeta").click();
    assert.equal(d.querySelector("#nexo-detalle .nexo-detalle__texto").innerHTML, "<p>Uno<br>línea</p><p>Dos &lt;b&gt;</p>");
  });
});
