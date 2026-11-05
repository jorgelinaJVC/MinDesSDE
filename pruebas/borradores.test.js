"use strict";

/* Borradores (trabajo previo al envío) y acceso a los adjuntos según quién los pide. */

const fs = require("node:fs");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { iniciar, cliente, ingresarComo, datosContenido, db } = require("./ayudas");

let entorno;
let admin, director, autoridad, colab, obs;

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
const logo = { nombre: "logoMA.png", contenido: PNG, tipo: "image/png" };
const bases = { nombre: "bases.pdf", contenido: PDF, tipo: "application/pdf" };

before(async () => {
  entorno = await iniciar();
  [admin, director, autoridad, colab, obs] = await Promise.all(
    ["admin", "director", "autoridad", "colab", "obs"].map((c) => ingresarComo(entorno.url, c))
  );
});

after(() => entorno.cerrar());

function formulario(datos, archivos = []) {
  const envio = new FormData();
  envio.append("datos", JSON.stringify(datos));
  for (const { nombre, contenido, tipo } of archivos) envio.append("adjuntos", new Blob([contenido], { type: tipo }), nombre);
  return envio;
}
const soloArchivos = (archivos) => formulario({}, archivos);
const archivosEnDisco = () => (fs.existsSync(entorno.carpetaAdjuntos) ? fs.readdirSync(entorno.carpetaAdjuntos).length : 0);
const enLista = async (quien, id) => (await quien.get("/api/contenidos")).datos.find((c) => c.id === id);
const enBd = async (id) => (await db.coleccion("contenidos")).findOne({ _id: db.aId(id) });

/** Un borrador de la colaboradora, sin campos obligatorios completos. */
async function borradorIncompleto(extra = {}, archivos = []) {
  const r = await colab.post("/api/borradores", formulario({ titulo: "Idea a medio escribir", ...extra }, archivos));
  assert.equal(r.estado, 201, JSON.stringify(r.datos));
  return r.datos;
}

/** Completa el borrador con datos válidos (sin enviarlo). */
async function completar(b) {
  const { slug, ...resto } = datosContenido();
  const r = await colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { ...resto, slug });
  assert.equal(r.estado, 200, JSON.stringify(r.datos));
  return r.datos;
}

describe("borrador nuevo: guardado temporal privado", () => {
  it("cualquier rol que carga contenido puede crear un borrador incompleto; el observador no", async () => {
    const b = await borradorIncompleto();
    assert.equal(b.estado, "borrador");
    assert.deepEqual(b.versiones, []);
    assert.equal(b.borrador.titulo, "Idea a medio escribir");
    assert.equal(b.borrador.slugEditable, true);
    assert.equal((await obs.post("/api/borradores", { titulo: "X" })).estado, 403);
    assert.equal((await director.post("/api/borradores", { titulo: "Del director" })).estado, 201, "el director también carga");
  });

  it("solo su autora lo ve: ni dirección, ni la autoridad, ni el administrador", async () => {
    const b = await borradorIncompleto({ titulo: "Privado" });
    assert.ok(await enLista(colab, b.id), "la autora lo ve");
    for (const otro of [director, autoridad, admin, obs]) {
      assert.equal(await enLista(otro, b.id), undefined, "nadie más lo ve en el listado");
    }
  });

  it("solo su autora lo modifica (a otro le responde como si no existiera)", async () => {
    const b = await borradorIncompleto();
    const ajeno = await director.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { titulo: "Pisado" });
    assert.equal(ajeno.estado, 404);
    assert.equal((await director.pedir("POST", `/api/contenidos/${b.id}/borrador/enviar`)).estado, 404);
    assert.equal((await director.pedir("DELETE", `/api/contenidos/${b.id}/borrador`)).estado, 404);
    assert.equal((await enBd(b.id)).borrador.titulo, "Idea a medio escribir");
    assert.equal((await obs.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { titulo: "X" })).estado, 403, "sin permiso de carga, 403");
  });

  it("se edita libremente; lo que se completa tiene que ser válido", async () => {
    const b = await borradorIncompleto();
    const r = await colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { titulo: "Título nuevo", cuerpo: "Primer párrafo." });
    assert.equal(r.estado, 200);
    assert.equal(r.datos.borrador.titulo, "Título nuevo");
    assert.equal(r.datos.borrador.cuerpo, "Primer párrafo.");
    assert.equal((await colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { sitio: "sitio-inventado" })).estado, 400);
    assert.equal((await colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { slug: "Con Espacios" })).estado, 400);
    assert.equal((await colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { titulo: { $ne: "" } })).estado, 200, "un objeto se guarda como texto vacío, nunca como consulta");
  });

  it("varios borradores pueden no tener identificador, pero uno repetido se rechaza", async () => {
    const a = await borradorIncompleto();
    const b = await borradorIncompleto();
    assert.equal(a.slug, null);
    assert.equal(b.slug, null);
    const publicado = (await colab.post("/api/contenidos", datosContenido())).datos;
    const r = await colab.pedir("PUT", `/api/contenidos/${a.id}/borrador`, { titulo: "x", slug: publicado.slug });
    assert.equal(r.estado, 409);
    assert.equal(r.datos.error.codigo, "slug_duplicado");
  });
});

describe("adjuntos del borrador", () => {
  it("se agregan, se listan, la autora los abre y nadie más", async () => {
    const b = await borradorIncompleto();
    const r = await colab.post(`/api/contenidos/${b.id}/borrador/adjuntos`, soloArchivos([logo, bases]));
    assert.equal(r.estado, 201, JSON.stringify(r.datos));
    assert.deepEqual(r.datos.borrador.adjuntos.map((a) => a.nombre), ["logoMA.png", "bases.pdf"]);
    const [png] = r.datos.borrador.adjuntos;

    assert.equal((await colab.get(`/api/adjuntos/${png.id}`)).estado, 200);
    for (const otro of [director, autoridad, admin, obs]) {
      assert.equal((await otro.get(`/api/adjuntos/${png.id}`)).estado, 403, "un archivo de borrador es privado");
    }
  });

  it("quitar un archivo que solo estaba en el borrador lo elimina también del disco", async () => {
    const b = await borradorIncompleto({}, [logo]);
    const [png] = b.borrador.adjuntos;
    const antes = archivosEnDisco();
    const r = await colab.pedir("DELETE", `/api/contenidos/${b.id}/borrador/adjuntos/${png.id}`);
    assert.equal(r.estado, 200);
    assert.deepEqual(r.datos.borrador.adjuntos, []);
    assert.equal(archivosEnDisco(), antes - 1);
    assert.equal((await enBd(b.id)).adjuntos.length, 0);
    assert.equal((await colab.get(`/api/adjuntos/${png.id}`)).estado, 404);
  });

  it("un pedido no autorizado se corta antes de escribir archivos en disco", async () => {
    const b = await borradorIncompleto();
    const antes = archivosEnDisco();
    const r = await director.post(`/api/contenidos/${b.id}/borrador/adjuntos`, soloArchivos([logo, bases]));
    assert.equal(r.estado, 404);
    assert.equal(archivosEnDisco(), antes, "multer no llegó a guardar nada");
  });

  it("respeta el máximo de 8 adjuntos y valida el formato real", async () => {
    const b = await borradorIncompleto();
    const nueve = Array.from({ length: 9 }, (_, i) => ({ ...logo, nombre: `foto-${i}.png` }));
    assert.equal((await colab.post(`/api/contenidos/${b.id}/borrador/adjuntos`, soloArchivos(nueve))).estado, 400);
    const falso = { nombre: "virus.png", contenido: Buffer.from("MZ ejecutable"), tipo: "image/png" };
    const r = await colab.post(`/api/contenidos/${b.id}/borrador/adjuntos`, soloArchivos([falso]));
    assert.equal(r.estado, 400);
    assert.match(r.datos.error.mensaje, /no coincide/);
  });
});

describe("envío: del borrador a la cadena de aprobación", () => {
  it("no se envía incompleto; completo entra a la revisión de dirección como versión 1", async () => {
    const b = await borradorIncompleto({}, [logo]);
    const incompleto = await colab.post(`/api/contenidos/${b.id}/borrador/enviar`);
    assert.equal(incompleto.estado, 400);

    await completar(b);
    const r = await colab.post(`/api/contenidos/${b.id}/borrador/enviar`);
    assert.equal(r.estado, 200, JSON.stringify(r.datos));
    assert.equal(r.datos.estado, "en_revision");
    assert.equal(r.datos.borrador, null);
    assert.equal(r.datos.versiones.length, 1);
    assert.deepEqual(r.datos.versiones[0].adjuntos.map((a) => a.nombre), ["logoMA.png"]);

    // ya en la bandeja: la ven todos, pero solo autor y revisores abren el archivo
    assert.ok(await enLista(director, b.id));
    const idPng = r.datos.versiones[0].adjuntos[0].id;
    for (const quien of [colab, director, autoridad, admin]) assert.equal((await quien.get(`/api/adjuntos/${idPng}`)).estado, 200);
    assert.equal((await obs.get(`/api/adjuntos/${idPng}`)).estado, 403, "el observador no abre material sin publicar");

    // una vez enviado, el borrador ya no existe
    assert.equal((await colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { titulo: "x" })).estado, 404);
  });

  it("una galería no se envía sin al menos una imagen", async () => {
    const b = await borradorIncompleto({}, [bases]);
    await completar(b);
    await colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { ...datosContenido({ tipo: "galeria" }), slug: (await enBd(b.id)).slug });
    const r = await colab.post(`/api/contenidos/${b.id}/borrador/enviar`);
    assert.equal(r.estado, 400);
    assert.match(r.datos.error.mensaje, /galería/);
  });

  it("el enviado sigue la cadena: dirección eleva, la autoridad aprueba y publica, y recién ahí es público", async () => {
    const b = await borradorIncompleto({}, [logo]);
    await completar(b);
    const enviado = (await colab.post(`/api/contenidos/${b.id}/borrador/enviar`)).datos;
    const idPng = enviado.versiones[0].adjuntos[0].id;
    const anonimo = cliente(entorno.url);
    assert.equal((await autoridad.post(`/api/contenidos/${b.id}/decision`, { decision: "aprobar" })).estado, 409, "no se saltea dirección");
    await director.post(`/api/contenidos/${b.id}/revision`, { decision: "elevar" });
    assert.equal((await anonimo.get(`/api/publico/adjuntos/${idPng}`)).estado, 404, "elevado: todavía no es público");
    await autoridad.post(`/api/contenidos/${b.id}/decision`, { decision: "aprobar" }); // aprueba y publica
    assert.equal((await anonimo.get(`/api/publico/adjuntos/${idPng}`)).estado, 200);
    assert.equal((await obs.get(`/api/adjuntos/${idPng}`)).estado, 200, "publicado: ya lo puede abrir cualquiera");
  });

  it("deja el historial de auditoría completo del trabajo previo", async () => {
    const b = await borradorIncompleto({}, [logo]);
    await colab.post(`/api/contenidos/${b.id}/borrador/adjuntos`, soloArchivos([bases]));
    const pdf = (await enLista(colab, b.id)).borrador.adjuntos.find((a) => a.nombre === "bases.pdf");
    await colab.pedir("DELETE", `/api/contenidos/${b.id}/borrador/adjuntos/${pdf.id}`);
    await completar(b);
    const final = (await colab.post(`/api/contenidos/${b.id}/borrador/enviar`)).datos;
    assert.deepEqual(
      final.historial.map((e) => [e.tipo, e.comentario]),
      [["borrador_creado", ""], ["adjunto_agregado", "logoMA.png"], ["adjunto_agregado", "bases.pdf"],
        ["adjunto_quitado", "bases.pdf"], ["envio", ""]]
    );
    assert.ok(final.historial.every((e) => e.version === 1 && e.usuarioId === entorno.usuarios.colab.id));
  });
});

describe("borrador de una nueva versión", () => {
  async function devueltoConLogo() {
    const c = (await colab.post("/api/contenidos", formulario(datosContenido({ titulo: "Versión uno" }), [logo]))).datos;
    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "devolver", comentario: "Sumar las bases." });
    return c;
  }

  it("copia la última versión y el contenido sigue devuelto mientras se prepara", async () => {
    const c = await devueltoConLogo();
    const r = await colab.post(`/api/contenidos/${c.id}/borrador`);
    assert.equal(r.estado, 201);
    assert.equal(r.datos.estado, "devuelto");
    assert.equal(r.datos.borrador.titulo, "Versión uno");
    assert.equal(r.datos.borrador.slugEditable, false);
    assert.deepEqual(r.datos.borrador.adjuntos.map((a) => a.nombre), ["logoMA.png"]);
    assert.equal((await enLista(director, c.id)).borrador, null, "dirección no ve el borrador");
    await colab.post(`/api/contenidos/${c.id}/borrador/adjuntos`, soloArchivos([bases]));
    const visto = (await enLista(director, c.id)).historial.map((e) => e.tipo);
    assert.ok(!visto.includes("borrador_creado") && !visto.includes("adjunto_agregado"), "ni su actividad en el historial");
    assert.ok((await enLista(colab, c.id)).historial.some((e) => e.comentario === "bases.pdf"), "la autora sí la ve");
    assert.equal((await colab.post(`/api/contenidos/${c.id}/borrador`)).datos.borrador.titulo, "Versión uno", "pedirlo de nuevo no lo pisa");
  });

  it("lo inician el autor, un director o el administrador; con un borrador abierto no se reenvía por fuera", async () => {
    const c = await devueltoConLogo();
    assert.equal((await obs.post(`/api/contenidos/${c.id}/borrador`)).estado, 403);
    await colab.post(`/api/contenidos/${c.id}/borrador`);
    assert.equal((await admin.post(`/api/contenidos/${c.id}/borrador`)).estado, 409, "ya hay otra persona preparándolo");
    const directo = await colab.post(`/api/contenidos/${c.id}/versiones`, { ...datosContenido(), slug: undefined });
    assert.equal(directo.estado, 409);
  });

  it("quitar un archivo heredado no lo borra: la versión anterior lo conserva", async () => {
    const c = await devueltoConLogo();
    const b = (await colab.post(`/api/contenidos/${c.id}/borrador`)).datos;
    const heredado = b.borrador.adjuntos[0];
    const antes = archivosEnDisco();
    await colab.pedir("DELETE", `/api/contenidos/${c.id}/borrador/adjuntos/${heredado.id}`);
    assert.equal(archivosEnDisco(), antes);
    assert.equal((await director.get(`/api/adjuntos/${heredado.id}`)).estado, 200, "sigue en la versión 1");

    await colab.post(`/api/contenidos/${c.id}/borrador/adjuntos`, soloArchivos([bases]));
    await colab.pedir("PUT", `/api/contenidos/${c.id}/borrador`, { ...datosContenido({ titulo: "Versión dos" }), slug: undefined });
    const r = await colab.post(`/api/contenidos/${c.id}/borrador/enviar`);
    assert.equal(r.estado, 200, JSON.stringify(r.datos));
    assert.deepEqual(r.datos.versiones.map((v) => [v.numero, v.estado]), [[1, "conservada"], [2, "en_revision"]]);
    assert.deepEqual(r.datos.versiones[0].adjuntos.map((a) => a.nombre), ["logoMA.png"]);
    assert.deepEqual(r.datos.versiones[1].adjuntos.map((a) => a.nombre), ["bases.pdf"]);
  });

  it("sobre algo publicado, lo publicado sigue visible hasta que la versión nueva recorra la cadena", async () => {
    const c = (await colab.post("/api/contenidos", datosContenido({ titulo: "Vigente" }))).datos;
    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" });
    await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" });
    await autoridad.post(`/api/contenidos/${c.id}/publicar`);
    await colab.post(`/api/contenidos/${c.id}/borrador`);
    await colab.pedir("PUT", `/api/contenidos/${c.id}/borrador`, { ...datosContenido({ titulo: "En preparación" }), slug: undefined });
    const publico = cliente(entorno.url);
    assert.equal((await publico.get(`/api/publico/sitios/adultos-mayores/publicaciones/${c.slug}`)).datos.titulo, "Vigente");
    assert.equal((await enLista(colab, c.id)).estado, "publicado");
  });
});

describe("descartar", () => {
  it("un borrador nuevo descartado desaparece, libera el identificador y elimina sus archivos", async () => {
    const b = await borradorIncompleto({ slug: "slug-a-liberar" }, [logo]);
    const antes = archivosEnDisco();
    const r = await colab.pedir("DELETE", `/api/contenidos/${b.id}/borrador`);
    assert.equal(r.estado, 200);
    assert.equal(r.datos.estado, "descartado");
    assert.equal(archivosEnDisco(), antes - 1);
    assert.equal(await enLista(colab, b.id), undefined);
    assert.equal((await enBd(b.id)).historial.at(-1).tipo, "borrador_descartado", "queda registrado");
    assert.equal((await colab.post("/api/borradores", { slug: "slug-a-liberar" })).estado, 201, "el identificador quedó libre");
    assert.equal((await colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { titulo: "x" })).estado, 404);
  });

  it("descartar el borrador de una versión deja intacto lo que ya se había enviado", async () => {
    const c = (await colab.post("/api/contenidos", datosContenido())).datos;
    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "devolver", comentario: "Ajustar." });
    await colab.post(`/api/contenidos/${c.id}/borrador`);
    const r = await colab.pedir("DELETE", `/api/contenidos/${c.id}/borrador`);
    assert.equal(r.datos.estado, "devuelto");
    assert.equal(r.datos.borrador, null);
    assert.equal(r.datos.versiones.length, 1);
  });

  it("un borrador no se puede archivar ni decidir (no entró al circuito)", async () => {
    const b = await borradorIncompleto();
    assert.equal((await autoridad.post(`/api/contenidos/${b.id}/archivar`, { motivo: "Prueba" })).estado, 409);
    assert.equal((await director.post(`/api/contenidos/${b.id}/revision`, { decision: "elevar" })).estado, 409);
  });
});

describe("ver o descargar un adjunto", () => {
  it("?ver=1 muestra imágenes y PDF en el navegador; el resto siempre se descarga", async () => {
    const c = (await colab.post("/api/contenidos", formulario(datosContenido(), [logo, bases]))).datos;
    const [png, pdf] = c.versiones[0].adjuntos;
    const ver = await director.get(`/api/adjuntos/${png.id}?ver=1`);
    assert.match(ver.cabeceras.get("content-disposition"), /^inline/);
    assert.equal(ver.cabeceras.get("content-type"), "image/png");
    assert.match((await director.get(`/api/adjuntos/${pdf.id}?ver=1`)).cabeceras.get("content-disposition"), /^inline/);
    assert.match((await director.get(`/api/adjuntos/${png.id}`)).cabeceras.get("content-disposition"), /^attachment/);
    assert.match(ver.cabeceras.get("cache-control"), /no-store/);
  });
});

describe("base de datos", () => {
  it("el esquema rechaza un contenido en el circuito sin versiones y un borrador con versiones", async () => {
    const contenidos = await db.coleccion("contenidos");
    const doc = await enBd((await colab.post("/api/contenidos", datosContenido())).datos.id);
    await assert.rejects(contenidos.insertOne({ ...doc, _id: new db.ObjectId(), slug: "sin-versiones", versiones: [] }), { code: 121 });
    await assert.rejects(contenidos.insertOne({ ...doc, _id: new db.ObjectId(), slug: "borrador-raro", estado: "borrador" }), { code: 121 });
  });
});
