"use strict";

/* Publicación condicionada por sitio.
 *   1. Al cargar se eligen uno o varios sitios de destino (Adultos Mayores, Mama Antula, Centro de Día).
 *   2. Nada aparece en ningún sitio mientras está en borrador, en revisión, elevado o devuelto.
 *   3. Cada sitio consulta solo lo suyo y solo lo aprobado; solo la autoridad superior aprueba, y al aprobar se
 *      publica sola en los sitios elegidos.
 *   4. Quien crea ve en qué sitios está visible o qué está pendiente (campo "visibilidad").
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { iniciar, cliente, ingresarComo, datosContenido, db } = require("./ayudas");
const { iniciarBd } = require("../backend/scripts/iniciar-bd");

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const PDF = Buffer.from("%PDF-1.4\n%prueba\n");
const SITIOS = ["adultos-mayores", "mama-antula", "centro-de-dia"];

let entorno, admin, colab, director, autoridad, publico;

before(async () => {
  entorno = await iniciar();
  [admin, colab, director, autoridad] = await Promise.all(
    ["admin", "colab", "director", "autoridad"].map((c) => ingresarComo(entorno.url, c))
  );
  publico = cliente(entorno.url);
});

after(() => entorno.cerrar());

function formulario(datos, archivos) {
  const cuerpo = new FormData();
  cuerpo.append("datos", JSON.stringify(datos));
  for (const [contenido, nombre, tipo] of archivos) cuerpo.append("adjuntos", new Blob([contenido], { type: tipo }), nombre);
  return cuerpo;
}

/** Envía un contenido y recorre la cadena: dirección eleva, la autoridad aprueba (y con eso se publica). */
async function aprobar(datos, archivos = []) {
  const creado = await colab.post("/api/contenidos", archivos.length ? formulario(datos, archivos) : datos);
  assert.equal(creado.estado, 201, JSON.stringify(creado.datos));
  assert.equal((await director.post(`/api/contenidos/${creado.datos.id}/revision`, { decision: "elevar" })).estado, 200);
  const r = await autoridad.post(`/api/contenidos/${creado.datos.id}/decision`, { decision: "aprobar" });
  assert.equal(r.estado, 200, JSON.stringify(r.datos));
  return r.datos;
}

/** Títulos visibles hoy en cada sitio, como los pide cada portal satélite. */
async function titulosPorSitio() {
  const resultado = {};
  for (const sitio of SITIOS) {
    const r = await publico.get(`/api/publico/sitios/${sitio}/publicaciones`);
    assert.equal(r.estado, 200);
    resultado[sitio] = r.datos.map((p) => p.titulo);
  }
  return resultado;
}

const enAlgunSitio = async (titulo) => Object.values(await titulosPorSitio()).some((l) => l.includes(titulo));
const contenidoDe = async (cliente, id) => (await cliente.get("/api/contenidos")).datos.find((c) => c.id === id);

describe("1. elegir los sitios de destino al cargar", () => {
  it("hay que elegir al menos un sitio, y tienen que existir", async () => {
    const sinSitio = await colab.post("/api/contenidos", datosContenido({ sitiosDestino: [] }));
    assert.equal(sinSitio.estado, 400);
    assert.match(sinSitio.datos.error.mensaje, /al menos un sitio/);

    assert.equal((await colab.post("/api/contenidos", datosContenido({ sitiosDestino: ["sitio-inventado"] }))).estado, 400);
    assert.equal((await colab.post("/api/contenidos", datosContenido({ sitiosDestino: ["adultos-mayores", "sitio-3"] }))).estado, 400,
      "el id viejo del tercer sitio ya no existe");
    assert.equal((await colab.post("/api/contenidos", datosContenido({ sitiosDestino: { $ne: null } }))).estado, 400);
    assert.equal((await colab.post("/api/contenidos", datosContenido({ sitiosDestino: [{ $ne: null }] }))).estado, 400);
    assert.equal((await colab.post("/api/contenidos", datosContenido({ tipo: "video" }))).estado, 400);
  });

  it("se guardan varios sitios, sin repetir y en el orden del catálogo", async () => {
    const r = await colab.post("/api/contenidos", datosContenido({
      sitiosDestino: ["centro-de-dia", "adultos-mayores", "centro-de-dia"], tipo: "proyecto",
    }));
    assert.equal(r.estado, 201);
    assert.deepEqual(r.datos.sitiosDestino, ["adultos-mayores", "centro-de-dia"]);
    assert.equal(r.datos.tipo, "proyecto");
  });

  it("acepta los tres sitios, incluido el Centro de Día", async () => {
    const r = await colab.post("/api/contenidos", datosContenido({ sitiosDestino: SITIOS }));
    assert.equal(r.estado, 201);
    assert.deepEqual(r.datos.sitiosDestino, SITIOS);
  });

  it("un cliente anterior que manda un solo «sitio» en texto sigue funcionando", async () => {
    const { sitiosDestino, ...datos } = datosContenido();
    const r = await colab.post("/api/contenidos", { ...datos, sitio: "mama-antula" });
    assert.equal(r.estado, 201);
    assert.deepEqual(r.datos.sitiosDestino, ["mama-antula"]);
    assert.ok(sitiosDestino);
  });

  it("los borradores guardan los sitios elegidos (pueden estar vacíos) y se exigen al enviar", async () => {
    const b = await colab.post("/api/borradores", { titulo: "Borrador con destino", sitiosDestino: ["mama-antula", "centro-de-dia"] });
    assert.equal(b.estado, 201, JSON.stringify(b.datos));
    assert.deepEqual(b.datos.borrador.sitiosDestino, ["mama-antula", "centro-de-dia"]);

    const vacio = await colab.post("/api/borradores", { titulo: "Sin destino todavía" });
    assert.deepEqual(vacio.datos.borrador.sitiosDestino, []);
    await colab.pedir("PUT", `/api/contenidos/${vacio.datos.id}/borrador`, {
      ...datosContenido({ sitiosDestino: [] }), titulo: "Sin destino todavía",
    });
    const envio = await colab.post(`/api/contenidos/${vacio.datos.id}/borrador/enviar`);
    assert.equal(envio.estado, 400);
    assert.match(envio.datos.error.mensaje, /al menos un sitio/);

    assert.equal((await colab.post("/api/borradores", { sitiosDestino: ["no-existe"] })).estado, 400);
  });

  it("una galería exige al menos una imagen", async () => {
    const sinFotos = await colab.post("/api/contenidos", datosContenido({ tipo: "galeria" }));
    assert.equal(sinFotos.estado, 400);
    assert.match(sinFotos.datos.error.mensaje, /imagen/);
    assert.equal((await colab.post("/api/contenidos", formulario(datosContenido({ tipo: "galeria" }), [[PDF, "bases.pdf", "application/pdf"]]))).estado, 400);
    assert.equal((await colab.post("/api/contenidos", formulario(datosContenido({ tipo: "galeria" }), [[PNG, "foto.png", "image/png"]]))).estado, 201);
  });
});

describe("2 y 3. nada es visible hasta la aprobación de la autoridad superior", () => {
  it("en revisión, elevado o devuelto no aparece en ningún sitio; al aprobar aparece en todos los elegidos a la vez", async () => {
    const titulo = "Jornada de salud compartida";
    const c = (await colab.post("/api/contenidos", datosContenido({ titulo, sitiosDestino: ["adultos-mayores", "centro-de-dia"] }))).datos;
    assert.equal(c.estado, "en_revision");
    assert.equal(await enAlgunSitio(titulo), false, "en revisión de dirección");

    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "devolver", comentario: "Sumá el horario." });
    assert.equal(await enAlgunSitio(titulo), false, "devuelto");

    await colab.post(`/api/contenidos/${c.id}/versiones`, { ...datosContenido({ titulo, sitiosDestino: ["adultos-mayores", "centro-de-dia"] }), slug: undefined });
    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" });
    assert.equal(await enAlgunSitio(titulo), false, "elevado, esperando a la autoridad superior");

    const aprobado = await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" });
    assert.equal(aprobado.estado, 200);
    assert.equal(aprobado.datos.estado, "publicado", "aprobar publica en el mismo paso");
    assert.deepEqual(aprobado.datos.publicada.sitios, ["adultos-mayores", "centro-de-dia"]);
    const tiposHistorial = aprobado.datos.historial.map((e) => e.tipo);
    assert.deepEqual(tiposHistorial.slice(-2), ["aprobacion", "publicacion"], "queda registrado que se publicó al aprobar");

    const ahora = await titulosPorSitio();
    assert.ok(ahora["adultos-mayores"].includes(titulo));
    assert.ok(ahora["centro-de-dia"].includes(titulo));
    assert.ok(!ahora["mama-antula"].includes(titulo), "no aparece en un sitio que no se eligió");
  });

  it("un borrador nunca es visible, aunque tenga sitios elegidos", async () => {
    const b = await colab.post("/api/borradores", {
      ...datosContenido({ sitiosDestino: SITIOS }), titulo: "Borrador que no se ve",
    });
    assert.equal(b.estado, 201);
    assert.equal(await enAlgunSitio("Borrador que no se ve"), false);
  });

  it("rechazado no aparece", async () => {
    const c = (await colab.post("/api/contenidos", datosContenido({ titulo: "Propuesta rechazada" }))).datos;
    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" });
    await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "rechazar", comentario: "No corresponde." });
    assert.equal(await enAlgunSitio("Propuesta rechazada"), false);
  });

  it("RBAC: solo la autoridad superior (o el administrador) aprueba; nadie más puede hacerlo visible", async () => {
    const titulo = "Intento de saltear la cadena";
    const c = (await colab.post("/api/contenidos", datosContenido({ titulo }))).datos;

    // nadie puede publicar algo que no está aprobado, ni siquiera la autoridad
    for (const quien of [colab, director, admin, autoridad]) {
      const r = await quien.post(`/api/contenidos/${c.id}/publicar`);
      assert.ok([403, 409].includes(r.estado), `publicar sin aprobar: ${r.estado}`);
    }
    // la autoridad no puede aprobar lo que no pasó por la revisión de dirección
    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" })).estado, 409);

    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" });
    // con lo elevado, ni el autor ni el director pueden aprobar
    for (const quien of [colab, director]) {
      assert.equal((await quien.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" })).estado, 403);
      assert.equal((await quien.post(`/api/contenidos/${c.id}/publicar`)).estado, 403);
    }
    assert.equal(await enAlgunSitio(titulo), false);
    assert.equal((await contenidoDe(colab, c.id)).estado, "elevado");

    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" })).estado, 200);
    assert.equal(await enAlgunSitio(titulo), true);
  });

  it("aprobar algo sin sitio de destino (anterior a los sitios) se rechaza: hay que devolverlo", async () => {
    const c = (await colab.post("/api/contenidos", datosContenido({ titulo: "Sin destino viejo" }))).datos;
    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" });
    const contenidos = await db.coleccion("contenidos");
    await contenidos.updateOne({ _id: db.aId(c.id) }, { $set: { sitiosDestino: [] } });

    const r = await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" });
    assert.equal(r.estado, 409);
    assert.match(r.datos.error.mensaje, /sitio de destino/);
    assert.equal((await contenidos.findOne({ _id: db.aId(c.id) })).versionPublicada, null);
  });
});

describe("una corrección de algo publicado no cambia lo visible hasta que se apruebe", () => {
  it("la versión anterior sigue en sus sitios; el destino nuevo rige recién al aprobar", async () => {
    const titulo = "Gimnasio de la Memoria";
    const c = await aprobar(datosContenido({ titulo, sitiosDestino: ["adultos-mayores"] }));
    assert.deepEqual((await titulosPorSitio())["adultos-mayores"].filter((t) => t === titulo), [titulo]);

    // nueva versión que cambia el título y pasa a Mama Antula + Centro de Día (saca Adultos Mayores)
    const nueva = await colab.post(`/api/contenidos/${c.id}/versiones`, {
      ...datosContenido({ titulo: "Gimnasio de la Memoria (nuevos horarios)", sitiosDestino: ["mama-antula", "centro-de-dia"] }), slug: undefined,
    });
    assert.equal(nueva.estado, 201);
    assert.deepEqual(nueva.datos.sitiosDestino, ["mama-antula", "centro-de-dia"]);
    assert.deepEqual(nueva.datos.publicada.sitios, ["adultos-mayores"], "lo publicado conserva su destino aprobado");

    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" });
    let visibles = await titulosPorSitio();
    assert.ok(visibles["adultos-mayores"].includes(titulo), "sigue la versión aprobada, en su sitio");
    assert.ok(!visibles["mama-antula"].includes(titulo) && !visibles["centro-de-dia"].includes(titulo),
      "no se adelanta a los sitios nuevos");
    assert.ok(!Object.values(visibles).flat().includes("Gimnasio de la Memoria (nuevos horarios)"));

    await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" });
    visibles = await titulosPorSitio();
    assert.ok(!visibles["adultos-mayores"].includes(titulo) && !visibles["adultos-mayores"].includes("Gimnasio de la Memoria (nuevos horarios)"));
    assert.ok(visibles["mama-antula"].includes("Gimnasio de la Memoria (nuevos horarios)"));
    assert.ok(visibles["centro-de-dia"].includes("Gimnasio de la Memoria (nuevos horarios)"));
  });

  it("si la corrección se rechaza, lo aprobado antes sigue visible donde estaba", async () => {
    const c = await aprobar(datosContenido({ titulo: "Aviso original", sitiosDestino: ["mama-antula"] }));
    await colab.post(`/api/contenidos/${c.id}/versiones`, { ...datosContenido({ titulo: "Aviso corregido", sitiosDestino: SITIOS }), slug: undefined });
    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" });
    await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "rechazar", comentario: "Se mantiene el original." });
    const visibles = await titulosPorSitio();
    assert.ok(visibles["mama-antula"].includes("Aviso original"));
    assert.equal(await enAlgunSitio("Aviso corregido"), false);
  });

  it("archivar lo retira de todos sus sitios", async () => {
    const c = await aprobar(datosContenido({ titulo: "Para archivar", sitiosDestino: SITIOS }));
    assert.equal(await enAlgunSitio("Para archivar"), true);
    await autoridad.post(`/api/contenidos/${c.id}/archivar`, { motivo: "Terminó" });
    assert.equal(await enAlgunSitio("Para archivar"), false);
  });
});

describe("4. indicador de visibilidad para quien crea", () => {
  it("acompaña cada paso: pendiente → visible en X → visible con cambios pendientes → retirado", async () => {
    const c = (await colab.post("/api/contenidos", datosContenido({ titulo: "Indicador", sitiosDestino: ["adultos-mayores", "mama-antula"] }))).datos;
    assert.equal(c.visibilidad.codigo, "pendiente");
    assert.equal(c.visibilidad.visible, false);
    assert.match(c.visibilidad.texto, /Pendiente de la revisión de dirección: todavía no es visible \(destino: Adultos Mayores y Mama Antula\)/);

    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" });
    let visto = await contenidoDe(colab, c.id);
    assert.match(visto.visibilidad.texto, /^Pendiente de aprobación de la Autoridad Superior/);

    await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" });
    visto = await contenidoDe(colab, c.id);
    assert.equal(visto.visibilidad.codigo, "visible");
    assert.equal(visto.visibilidad.texto, "Aprobada y visible en Adultos Mayores y Mama Antula");
    assert.deepEqual(visto.visibilidad.sitios, ["adultos-mayores", "mama-antula"]);

    await colab.post(`/api/contenidos/${c.id}/versiones`, { ...datosContenido({ titulo: "Indicador", sitiosDestino: SITIOS }), slug: undefined });
    visto = await contenidoDe(colab, c.id);
    assert.equal(visto.visibilidad.codigo, "visible_con_cambios");
    assert.equal(visto.visibilidad.texto, "Aprobada y visible en Adultos Mayores y Mama Antula");
    assert.equal(visto.visibilidad.pendiente,
      "Versión 2 pendiente de la revisión de dirección; al aprobarse se verá en Adultos Mayores, Mama Antula y Centro de Día");

    await autoridad.post(`/api/contenidos/${c.id}/archivar`, { motivo: "Fin" });
    visto = await contenidoDe(colab, c.id);
    assert.equal(visto.visibilidad.codigo, "retirado");
    assert.equal(visto.visibilidad.visible, false);
  });

  it("devuelto y borrador lo dicen explícitamente", async () => {
    const c = (await colab.post("/api/contenidos", datosContenido({ titulo: "Para devolver" }))).datos;
    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "devolver", comentario: "Falta la fecha." });
    assert.equal((await contenidoDe(colab, c.id)).visibilidad.codigo, "devuelto");

    const b = (await colab.post("/api/borradores", { titulo: "Indicador borrador" })).datos;
    assert.equal(b.visibilidad.codigo, "borrador");
    assert.match(b.visibilidad.texto, /no es visible en ningún sitio/);
  });
});

describe("API pública por sitio", () => {
  let noticiaAdultos, proyectoAdultos;

  before(async () => {
    noticiaAdultos = await aprobar(
      datosContenido({ sitio: "adultos-mayores", tipo: "noticia", seccion: "Locales", titulo: "Noticia de Adultos" }),
      [[PNG, "portada.png", "image/png"], [PDF, "bases.pdf", "application/pdf"]]
    );
    proyectoAdultos = await aprobar(datosContenido({ sitio: "adultos-mayores", tipo: "proyecto", seccion: "Cognitivo", titulo: "Proyecto de Adultos" }));
    await aprobar(datosContenido({ sitio: "mama-antula", tipo: "noticia", titulo: "Noticia de Mama Antula" }));
    await aprobar(
      datosContenido({ sitio: "mama-antula", tipo: "galeria", titulo: "Álbum de Mama Antula" }),
      [[PNG, "foto1.png", "image/png"], [PNG, "foto2.png", "image/png"]]
    );
    await aprobar(datosContenido({ sitiosDestino: ["mama-antula", "centro-de-dia"], tipo: "noticia", titulo: "Noticia compartida" }));
  });

  it("lista los tres sitios (con el Centro de Día) y los tipos", async () => {
    const r = await publico.get("/api/publico/sitios");
    assert.equal(r.estado, 200);
    assert.deepEqual(r.datos.sitios.map((s) => s.id), SITIOS);
    assert.equal(r.datos.sitios[2].nombre, "Centro de Día");
    assert.equal(r.datos.sitios[2].activo, true);
    assert.deepEqual(r.datos.tipos.map((t) => t.id), ["noticia", "proyecto", "galeria"]);
  });

  it("cada sitio recibe solo lo suyo; lo dirigido a varios aparece en cada uno", async () => {
    const mama = (await publico.get("/api/publico/sitios/mama-antula/publicaciones")).datos.map((p) => p.titulo);
    const centro = (await publico.get("/api/publico/sitios/centro-de-dia/publicaciones")).datos.map((p) => p.titulo);
    const adultos = (await publico.get("/api/publico/sitios/adultos-mayores/publicaciones")).datos.map((p) => p.titulo);
    assert.ok(mama.includes("Noticia compartida") && centro.includes("Noticia compartida"));
    assert.ok(!adultos.includes("Noticia compartida"));
    assert.ok(adultos.includes("Noticia de Adultos") && !mama.includes("Noticia de Adultos") && !centro.includes("Noticia de Adultos"));
    const compartida = (await publico.get("/api/publico/sitios/centro-de-dia/publicaciones")).datos.find((p) => p.titulo === "Noticia compartida");
    assert.deepEqual(compartida.sitios, ["mama-antula", "centro-de-dia"]);
  });

  it("la ficha también se pide por sitio: lo de otro sitio responde 404", async () => {
    const enSuSitio = await publico.get(`/api/publico/sitios/adultos-mayores/publicaciones/${noticiaAdultos.slug}`);
    assert.equal(enSuSitio.estado, 200);
    assert.equal(enSuSitio.datos.titulo, "Noticia de Adultos");
    assert.equal((await publico.get(`/api/publico/sitios/mama-antula/publicaciones/${noticiaAdultos.slug}`)).estado, 404);
    assert.equal((await publico.get(`/api/publico/sitios/inventado/publicaciones/${noticiaAdultos.slug}`)).estado, 404);
  });

  it("no hay consultas públicas sin sitio", async () => {
    assert.equal((await publico.get("/api/publico/publicaciones")).estado, 400);
    assert.equal((await publico.get(`/api/publico/publicaciones/${noticiaAdultos.slug}`)).estado, 400);
  });

  it("filtra por tipo", async () => {
    const proyectos = (await publico.get("/api/publico/sitios/adultos-mayores/publicaciones?tipo=proyecto")).datos;
    assert.ok(proyectos.every((p) => p.tipo === "proyecto"));
    assert.ok(proyectos.some((p) => p.titulo === "Proyecto de Adultos" && p.seccion === "Cognitivo"));
    assert.equal((await publico.get("/api/publico/sitios/adultos-mayores/publicaciones?tipo=video")).estado, 400);
    assert.equal((await publico.get("/api/publico/sitios/inventado/publicaciones")).estado, 404);
  });

  it("separa imágenes de documentos y da su URL", async () => {
    const noticias = (await publico.get("/api/publico/sitios/adultos-mayores/publicaciones?tipo=noticia")).datos;
    const noticia = noticias.find((p) => p.titulo === "Noticia de Adultos");
    assert.deepEqual(noticia.imagenes.map((i) => i.nombre), ["portada.png"]);
    assert.deepEqual(noticia.documentos.map((i) => i.nombre), ["bases.pdf"]);
    assert.match(noticia.imagenes[0].url, /^\/api\/publico\/adjuntos\/[0-9a-f]{24}$/);

    const [galeria] = (await publico.get("/api/publico/sitios/mama-antula/publicaciones?tipo=galeria")).datos;
    assert.equal(galeria.imagenes.length, 2);
  });

  it("no expone autores, historial ni datos internos", async () => {
    const lista = (await publico.get("/api/publico/sitios/adultos-mayores/publicaciones?tipo=noticia")).datos;
    const texto = JSON.stringify(lista);
    for (const prohibido of ["autor", "historial", "nombreAlmacenado", "@prueba.edu.ar", "versiones", "sitiosDestino", "visibilidad"]) {
      assert.ok(!texto.includes(prohibido), prohibido);
    }
  });

  it("otros sitios (otro dominio o puerto) pueden leer la API y mostrar las imágenes", async () => {
    const r = await publico.pedir("GET", "/api/publico/sitios/adultos-mayores/publicaciones", undefined, { origin: "http://127.0.0.1:5500" });
    assert.equal(r.cabeceras.get("access-control-allow-origin"), "*");

    const noticia = r.datos.find((p) => p.titulo === "Noticia de Adultos");
    const imagen = await publico.get(noticia.imagenes[0].url);
    assert.equal(imagen.estado, 200);
    assert.equal(imagen.cabeceras.get("content-type"), "image/png");
    assert.match(imagen.cabeceras.get("content-disposition"), /^inline/);
    assert.equal(imagen.cabeceras.get("cross-origin-resource-policy"), "cross-origin");
    assert.ok(Buffer.compare(imagen.datos, PNG) === 0, "devuelve exactamente la imagen subida");

    const documento = await publico.get(noticia.documentos[0].url);
    assert.match(documento.cabeceras.get("content-disposition"), /^attachment/);
  });

  it("la API pública no acepta escrituras", async () => {
    const r = await publico.pedir("POST", "/api/publico/sitios/adultos-mayores/publicaciones", {});
    assert.ok([403, 404].includes(r.estado));
  });

  it("al archivar, desaparece del sitio", async () => {
    await autoridad.post(`/api/contenidos/${proyectoAdultos.id}/archivar`, { motivo: "Terminó" });
    const proyectos = (await publico.get("/api/publico/sitios/adultos-mayores/publicaciones?tipo=proyecto")).datos;
    assert.ok(!proyectos.some((p) => p.titulo === "Proyecto de Adultos"));
  });

  it("restaurar del archivo no lo vuelve a mostrar hasta que la autoridad lo publique de nuevo", async () => {
    await autoridad.post(`/api/contenidos/${proyectoAdultos.id}/restaurar`);
    assert.equal((await contenidoDe(colab, proyectoAdultos.id)).visibilidad.codigo, "listo");
    assert.equal(await enAlgunSitio("Proyecto de Adultos"), false);
    assert.equal((await director.post(`/api/contenidos/${proyectoAdultos.id}/publicar`)).estado, 403);
    assert.equal((await autoridad.post(`/api/contenidos/${proyectoAdultos.id}/publicar`)).estado, 200);
    assert.ok((await titulosPorSitio())["adultos-mayores"].includes("Proyecto de Adultos"));
  });
});

describe("migración de contenidos anteriores (bd:iniciar)", () => {
  it("pasa «sitio» a «sitiosDestino», arma el destino publicado y renombra sitio-3", async () => {
    const contenidos = await db.coleccion("contenidos");
    const publicadoViejo = await aprobar(datosContenido({ titulo: "Publicado con el formato viejo" }));
    const enRevisionViejo = (await colab.post("/api/contenidos", datosContenido({ titulo: "En revisión, formato viejo" }))).datos;
    // simula documentos guardados antes del cambio (saltando la validación a propósito)
    await contenidos.updateOne({ _id: db.aId(publicadoViejo.id) },
      { $set: { sitio: "mama-antula" }, $unset: { sitiosDestino: "", destinoPublicado: "" } }, { bypassDocumentValidation: true });
    await contenidos.updateOne({ _id: db.aId(enRevisionViejo.id) },
      { $set: { sitio: "sitio-3" }, $unset: { sitiosDestino: "", destinoPublicado: "" } }, { bypassDocumentValidation: true });

    await iniciarBd();
    await iniciarBd(); // idempotente

    const a = await contenidos.findOne({ _id: db.aId(publicadoViejo.id) });
    assert.equal("sitio" in a, false);
    assert.deepEqual(a.sitiosDestino, ["mama-antula"]);
    assert.deepEqual(a.destinoPublicado, { sitios: ["mama-antula"], tipo: "noticia", seccion: "Becas y beneficios" });
    assert.ok((await titulosPorSitio())["mama-antula"].includes("Publicado con el formato viejo"));

    const b = await contenidos.findOne({ _id: db.aId(enRevisionViejo.id) });
    assert.deepEqual(b.sitiosDestino, ["centro-de-dia"]);
    assert.equal(b.destinoPublicado, null);
  });

  it("los anteriores a los sitios quedan sin destino (no se ven) y una versión nueva lo asigna", async () => {
    const c = await aprobar(datosContenido({ titulo: "Contenido viejo" }));
    const contenidos = await db.coleccion("contenidos");
    await contenidos.updateOne({ _id: db.aId(c.id) },
      { $unset: { sitiosDestino: "", destinoPublicado: "", tipo: "" } }, { bypassDocumentValidation: true });

    await iniciarBd();
    const migrado = await contenidos.findOne({ _id: db.aId(c.id) });
    assert.deepEqual(migrado.sitiosDestino, []);
    assert.equal(migrado.tipo, null);
    assert.equal(migrado.destinoPublicado, null);
    assert.equal(await enAlgunSitio("Contenido viejo"), false, "sin sitio no aparece en ningún sitio");
    assert.equal((await contenidoDe(colab, c.id)).visibilidad.codigo, "sin_destino");

    const r = await colab.post(`/api/contenidos/${c.id}/versiones`, { ...datosContenido({ sitio: "mama-antula", tipo: "noticia" }), slug: undefined });
    assert.equal(r.estado, 201);
    assert.deepEqual(r.datos.sitiosDestino, ["mama-antula"]);
  });
});
