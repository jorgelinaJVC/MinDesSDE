"use strict";

/* Contenido completo con formato (editor del panel) e imágenes WEBP / AVIF. */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { iniciar, cliente, ingresarComo, datosContenido } = require("./ayudas");
const { limpiarHtml, textoPlano, leerCuerpo } = require("../backend/src/texto-enriquecido");
const { esperarPendientes } = require("../backend/src/auditoria/registro");

// imágenes reales de 2x2 píxeles
const WEBP = Buffer.from("UklGRjYAAABXRUJQVlA4ICoAAACQAQCdASoCAAIAAoBCJaACdLoAA5gA/uC5f+A3XxbeN/8zR+k30m7mAAA=", "base64");
const AVIF = Buffer.from(
  "AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAJwAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAgAAAAIAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAL21kYXQSAAoIGAA2iAhoNCAyGReHh4YhhJJJJlAAAABIVDZhrJy8OmSx9JM=",
  "base64"
);

let entorno, admin, colab, director, autoridad, publico;

before(async () => {
  entorno = await iniciar();
  [admin, colab, director, autoridad] = await Promise.all(
    ["admin", "colab", "director", "autoridad"].map((c) => ingresarComo(entorno.url, c))
  );
  publico = cliente(entorno.url);
});

after(() => entorno.cerrar());

function formulario(datos, archivos = []) {
  const envio = new FormData();
  envio.append("datos", JSON.stringify(datos));
  for (const [contenido, nombre, tipo] of archivos) envio.append("adjuntos", new Blob([contenido], { type: tipo }), nombre);
  return envio;
}

async function aprobar(datos, archivos = []) {
  const creado = await colab.post("/api/contenidos", archivos.length ? formulario(datos, archivos) : datos);
  assert.equal(creado.estado, 201, JSON.stringify(creado.datos));
  assert.equal((await director.post(`/api/contenidos/${creado.datos.id}/revision`, { decision: "elevar" })).estado, 200);
  const r = await autoridad.post(`/api/contenidos/${creado.datos.id}/decision`, { decision: "aprobar" });
  assert.equal(r.estado, 200, JSON.stringify(r.datos));
  return r.datos;
}

const HTML_EDITOR =
  '<h2>Inscripción</h2><p class="ql-align-center"><strong>Abierta</strong> hasta el <em>30 de octubre</em>.</p>' +
  '<ol><li>DNI</li><li>Certificado</li></ol><ul><li class="ql-align-right">Presencial</li></ul>' +
  '<p>Más datos en <a href="https://adultosmayores.gob.ar/becas">el sitio</a>.</p>';

describe("limpieza del HTML (lista blanca)", () => {
  it("conserva el formato del editor: negrita, cursiva, listas, H2, H3, enlaces y alineación", () => {
    const html = limpiarHtml(HTML_EDITOR);
    assert.match(html, /<h2>Inscripción<\/h2>/);
    assert.match(html, /<p style="text-align:center"><strong>Abierta<\/strong> hasta el <em>30 de octubre<\/em>\.<\/p>/);
    assert.match(html, /<ol><li>DNI<\/li><li>Certificado<\/li><\/ol>/);
    assert.match(html, /<li style="text-align:right">Presencial<\/li>/);
    assert.match(html, /<a href="https:\/\/adultosmayores\.gob\.ar\/becas" target="_blank" rel="noopener noreferrer">el sitio<\/a>/);
    assert.equal(limpiarHtml("<h3>Requisitos</h3>"), "<h3>Requisitos</h3>");
  });

  it("descarta scripts, eventos, iframes, imágenes, estilos y enlaces peligrosos", () => {
    const sucio =
      '<p onclick="alert(1)" style="color:red;text-align:center">Hola<script>alert(1)</script></p>' +
      '<img src=x onerror="alert(1)"><iframe src="https://malo.com"></iframe><style>body{display:none}</style>' +
      '<p><a href="javascript:alert(1)">js</a> <a href="data:text/html,x">data</a> <a href="//malo.com">rel</a>' +
      ' <a href="https://ok.gob.ar" onmouseover="x()">ok</a></p><svg><g onload="x()"></g></svg>';
    const html = limpiarHtml(sucio);
    assert.doesNotMatch(html, /script|onclick|onerror|onmouseover|onload|iframe|<img|<style|<svg|javascript:|data:|\/\/malo|color/i);
    assert.match(html, /<p style="text-align:center">Hola<\/p>/);
    assert.match(html, /<p>js data rel <a href="https:\/\/ok\.gob\.ar" target="_blank" rel="noopener noreferrer">ok<\/a><\/p>/);
  });

  it("lleva lo pegado desde Word o la web al formato permitido", () => {
    assert.equal(limpiarHtml("<h1>Título</h1><h5>Sub</h5><b>n</b><i>c</i>"), "<h2>Título</h2><h3>Sub</h3><strong>n</strong><em>c</em>");
    assert.equal(limpiarHtml('<p style="text-align: justify; font-size: 40px">x</p>'), '<p style="text-align:justify">x</p>');
    assert.equal(limpiarHtml('<p style="text-align: expression(alert(1))">x</p>'), "<p>x</p>");
  });

  it("deriva el texto sin formato (para búsquedas, auditoría y sitios sin formato)", () => {
    assert.equal(
      textoPlano(limpiarHtml(HTML_EDITOR)),
      "Inscripción\n\nAbierta hasta el 30 de octubre.\n\n• DNI\n• Certificado\n\n• Presencial\n\nMás datos en el sitio."
    );
    assert.equal(textoPlano("<p>A &amp; B &lt;3</p>"), "A & B <3");
  });

  it("un editor vacío cuenta como contenido vacío; los clientes viejos siguen mandando texto", () => {
    assert.deepEqual(leerCuerpo({ cuerpoHtml: "<p><br></p>" }, { obligatorio: false }), { cuerpo: "", cuerpoHtml: null });
    assert.throws(() => leerCuerpo({ cuerpoHtml: "<p><br></p>" }, { obligatorio: true }), /Completá/);
    assert.deepEqual(leerCuerpo({ cuerpo: "  Solo texto " }, { obligatorio: true }), { cuerpo: "Solo texto", cuerpoHtml: null });
  });
});

describe("contenido completo con formato en la API", () => {
  it("se guarda limpio, se ve en el panel y llega con formato a los sitios", async () => {
    const datos = datosContenido({ titulo: "Becas con formato", cuerpo: undefined, cuerpoHtml: HTML_EDITOR + "<script>alert(1)</script>" });
    const c = await aprobar(datos);
    const v = c.versiones[0];
    assert.doesNotMatch(v.cuerpoHtml, /script/);
    assert.match(v.cuerpoHtml, /<strong>Abierta<\/strong>/);
    assert.match(v.cuerpo, /^Inscripción\n\nAbierta hasta/);

    const lista = (await publico.get("/api/publico/sitios/adultos-mayores/publicaciones?tipo=noticia")).datos;
    const p = lista.find((x) => x.titulo === "Becas con formato");
    assert.equal(p.cuerpoHtml, v.cuerpoHtml);
    assert.equal(p.cuerpo, v.cuerpo);
    const detalle = (await publico.get(`/api/publico/sitios/adultos-mayores/publicaciones/${datos.slug}`)).datos;
    assert.equal(detalle.cuerpoHtml, v.cuerpoHtml);
  });

  it("los contenidos de solo texto siguen funcionando (cuerpoHtml null)", async () => {
    const datos = datosContenido({ titulo: "Solo texto" });
    await aprobar(datos);
    const p = (await publico.get(`/api/publico/sitios/adultos-mayores/publicaciones/${datos.slug}`)).datos;
    assert.equal(p.cuerpoHtml, null);
    assert.equal(p.cuerpo, "Texto completo del contenido.");
  });

  it("al enviar exige texto: un editor con solo formato vacío no alcanza", async () => {
    const r = await colab.post("/api/contenidos", datosContenido({ cuerpo: undefined, cuerpoHtml: "<p><strong> </strong></p>" }));
    assert.equal(r.estado, 400);
    assert.match(r.datos.error.mensaje, /Completá/);
  });

  it("el borrador guarda el formato, lo devuelve y lo pasa a la versión al enviar", async () => {
    const b = (await colab.post("/api/borradores", { titulo: "Borrador con formato", cuerpoHtml: "<p><em>Primera</em> idea</p>" })).datos;
    assert.equal(b.borrador.cuerpoHtml, "<p><em>Primera</em> idea</p>");
    assert.equal(b.borrador.cuerpo, "Primera idea");

    const guardado = await colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, {
      ...datosContenido({ titulo: "Borrador con formato", cuerpo: undefined }),
      cuerpoHtml: "<p><strong>Primera</strong> idea</p>",
    });
    assert.equal(guardado.estado, 200, JSON.stringify(guardado.datos));
    // solo cambió el formato: la auditoría lo dice así
    await esperarPendientes();
    const reg = (await admin.get("/api/auditoria?accion=borrador.editar&porPagina=1")).datos.registros[0];
    assert.match(reg.detalle, /formato del texto/);
    assert.doesNotMatch(reg.detalle.replace("formato del texto", ""), /texto/, "el texto en sí no cambió");

    const enviado = await colab.post(`/api/contenidos/${b.id}/borrador/enviar`, {});
    assert.equal(enviado.estado, 200, JSON.stringify(enviado.datos));
    assert.equal(enviado.datos.versiones[0].cuerpoHtml, "<p><strong>Primera</strong> idea</p>");

    // la versión siguiente arranca con el formato de la última
    await director.post(`/api/contenidos/${b.id}/revision`, { decision: "devolver", comentario: "Sumá la fecha." });
    const nueva = await colab.post(`/api/contenidos/${b.id}/borrador`, {});
    assert.equal(nueva.datos.borrador.cuerpoHtml, "<p><strong>Primera</strong> idea</p>");
  });
});

describe("imágenes WEBP y AVIF", () => {
  it("acepta .webp y .avif, los guarda como imagen y los publica en la galería", async () => {
    const datos = datosContenido({ titulo: "Álbum moderno", tipo: "galeria" });
    const c = await aprobar(datos, [[WEBP, "patio.webp", "image/webp"], [AVIF, "huerta.avif", "image/avif"]]);
    assert.deepEqual(c.versiones[0].adjuntos.map((a) => a.nombre), ["patio.webp", "huerta.avif"]);

    const p = (await publico.get(`/api/publico/sitios/adultos-mayores/publicaciones/${datos.slug}`)).datos;
    assert.equal(p.imagenes.length, 2, "las dos cuentan como fotos del álbum");
    const webp = await publico.get(p.imagenes[0].url);
    assert.equal(webp.cabeceras.get("content-type"), "image/webp");
    assert.deepEqual(webp.datos, WEBP);
    const avif = await publico.get(p.imagenes[1].url);
    assert.equal(avif.cabeceras.get("content-type"), "image/avif");
    assert.deepEqual(avif.datos, AVIF);
  });

  it("acepta WEBP/AVIF aunque el navegador los informe como application/octet-stream", async () => {
    const r = await colab.post("/api/contenidos", formulario(datosContenido({ tipo: "galeria" }), [
      [WEBP, "a.webp", "application/octet-stream"], [AVIF, "b.avif", "application/octet-stream"],
    ]));
    assert.equal(r.estado, 201, JSON.stringify(r.datos));
    const id = r.datos.versiones[0].adjuntos[0].id;
    const ver = await director.get(`/api/adjuntos/${id}?ver=1`);
    assert.equal(ver.cabeceras.get("content-type"), "image/webp", "se guarda con el tipo real, no el del navegador");
  });

  it("rechaza un .webp o .avif que no lo es por dentro", async () => {
    for (const [nombre, tipo, contenido] of [
      ["falso.webp", "image/webp", Buffer.from("RIFF0000WAVEfmt ")], // RIFF pero de audio
      ["falso.avif", "image/avif", Buffer.from("\x00\x00\x00\x18ftypheic\x00\x00\x00\x00mif1heic", "latin1")], // HEIC
      ["png.avif", "image/avif", WEBP],
    ]) {
      const r = await colab.post("/api/contenidos", formulario(datosContenido(), [[contenido, nombre, tipo]]));
      assert.equal(r.estado, 400, nombre);
      assert.match(r.datos.error.mensaje, /no coincide/, nombre);
    }
  });

  it("no acepta un tipo MIME que no corresponde a la extensión", async () => {
    const r = await colab.post("/api/contenidos", formulario(datosContenido(), [[WEBP, "foto.webp", "text/html"]]));
    assert.equal(r.estado, 400);
    assert.match(r.datos.error.mensaje, /formato no permitido/);
  });
});

describe("filtro al mostrar en el panel y la vista pública (util.js)", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM(`<script>${fs.readFileSync(path.join(__dirname, "../frontend/js/util.js"), "utf8")}</script>`, { runScripts: "dangerously" });
  const { util } = dom.window.Nexo;

  it("deja el formato permitido y descarta lo peligroso, sin ejecutar nada", async () => {
    const html = util.htmlSeguro(
      '<h1>T</h1><p class="ql-align-justify" onclick="x()">a <b>b</b> <i>c</i></p><img src=x onerror="window.atacado=1">'
      + '<p><a href="javascript:alert(1)">j</a> <a href="mailto:a@b.ar">m</a></p><script>window.atacado=1</script><p><br></p>'
    );
    assert.equal(html, '<h2>T</h2><p style="text-align: justify;">a <strong>b</strong> <em>c</em></p>'
      + '<p>j <a href="mailto:a@b.ar" target="_blank" rel="noopener noreferrer">m</a></p>');
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(dom.window.atacado, undefined);
  });

  it("sin HTML usa el texto en párrafos, escapado", () => {
    assert.equal(util.cuerpoHtml({ cuerpo: "Uno\n\n<b>Dos</b>", cuerpoHtml: null }), "<p>Uno</p><p>&lt;b&gt;Dos&lt;/b&gt;</p>");
    assert.equal(util.cuerpoHtml({ cuerpo: "x", cuerpoHtml: "<script>1</script>" }), "<p>x</p>", "si el HTML queda vacío, el texto");
  });
});
