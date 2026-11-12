"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { iniciar, ingresarComo, cliente, datosContenido, db } = require("./ayudas");

let entorno;
let colab, director, autoridad;
let contenido;

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const col = (nombre) => db.coleccion(nombre);
const buscar = async (id) => (await col("contenidos")).findOne({ _id: db.aId(id) });

before(async () => {
  entorno = await iniciar();
  colab = await ingresarComo(entorno.url, "colab");
  director = await ingresarComo(entorno.url, "director");
  autoridad = await ingresarComo(entorno.url, "autoridad");
  contenido = (await colab.post("/api/contenidos", datosContenido())).datos;
  await director.post(`/api/contenidos/${contenido.id}/revision`, { decision: "elevar", comentario: "ok" });
  await autoridad.post(`/api/contenidos/${contenido.id}/decision`, { decision: "aprobar", comentario: "ok" }); // publica

  const envio = new FormData();
  envio.append("datos", JSON.stringify(datosContenido()));
  envio.append("adjuntos", new Blob([PNG], { type: "image/png" }), "logo.png");
  const conAdjunto = await colab.post("/api/contenidos", envio);
  assert.equal(conAdjunto.estado, 201);
});

after(() => entorno.cerrar());

/** El validador $jsonSchema de MongoDB responde con el código 121 (DocumentValidationFailure). */
const rechazaValidacion = (promesa) => assert.rejects(promesa, (error) => {
  assert.equal(error.code, 121, error.message);
  return true;
});
const rechazaDuplicado = (promesa) => assert.rejects(promesa, (error) => {
  assert.equal(error.code, 11000, error.message);
  return true;
});

describe("validación del esquema ($jsonSchema): la base rechaza datos inválidos aunque se salteen la app", () => {
  it("no acepta roles ni estados fuera de los permitidos", async () => {
    await rechazaValidacion((await col("usuarios")).updateOne({ email: "obs@prueba.edu.ar" }, { $set: { rol: "superusuario" } }));
    await rechazaValidacion((await col("contenidos")).updateOne({ _id: db.aId(contenido.id) }, { $set: { estado: "inventado" } }));
    await rechazaValidacion((await col("contenidos")).updateOne({ _id: db.aId(contenido.id) }, { $set: { "versiones.0.estado": "inventada" } }));
  });

  it("no acepta documentos incompletos, campos de más ni tipos equivocados", async () => {
    const contenidos = await col("contenidos");
    await rechazaValidacion(contenidos.insertOne({ seccion: "x", slug: "huerfano" }));
    await rechazaValidacion(contenidos.updateOne({ _id: db.aId(contenido.id) }, { $set: { campoInventado: 1 } }));
    await rechazaValidacion(contenidos.updateOne({ _id: db.aId(contenido.id) }, { $set: { autorId: "1" } }));
    await rechazaValidacion(contenidos.updateOne({ _id: db.aId(contenido.id) }, { $set: { "versiones.0.titulo": "" } }));
  });

  it("no acepta un identificador web con mayúsculas o espacios", async () => {
    await rechazaValidacion((await col("contenidos")).updateOne({ _id: db.aId(contenido.id) }, { $set: { slug: "Con Espacios" } }));
  });

  it("no acepta contraseñas en claro ni tokens de sesión sin hashear", async () => {
    await rechazaValidacion((await col("usuarios")).updateOne({ email: "obs@prueba.edu.ar" }, { $set: { passwordHash: "Clave-en-claro-123" } }));
    await rechazaValidacion((await col("sesiones")).insertOne({
      usuarioId: db.aId(contenido.autorId), tokenHash: "token-en-claro", expiraEn: new Date(), creadoEn: new Date(),
    }));
  });
});

describe("índices", () => {
  it("el identificador web es único", async () => {
    const original = await buscar(contenido.id);
    const { _id, ...copia } = original;
    await rechazaDuplicado((await col("contenidos")).insertOne(copia));
  });

  it("el correo es único", async () => {
    const original = await (await col("usuarios")).findOne({ email: "obs@prueba.edu.ar" });
    const { _id, ...copia } = original;
    await rechazaDuplicado((await col("usuarios")).insertOne(copia));
  });

  it("las sesiones vencidas se borran solas (índice TTL)", async () => {
    const indices = await (await col("sesiones")).indexes();
    const ttl = indices.find((i) => i.name === "ttl_sesiones_expira");
    assert.ok(ttl, "existe el índice TTL");
    assert.equal(ttl.expireAfterSeconds, 0);
  });
});

describe("historial: nada se pierde", () => {
  it("una versión nueva no modifica el texto de la anterior", async () => {
    const c = (await colab.post("/api/contenidos", datosContenido({ titulo: "Primera redacción" }))).datos;
    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "devolver", comentario: "Ajustar." });
    await colab.post(`/api/contenidos/${c.id}/versiones`, { ...datosContenido({ titulo: "Segunda redacción" }), slug: undefined });

    const doc = await buscar(c.id);
    assert.deepEqual(doc.versiones.map((v) => [v.numero, v.titulo, v.estado]), [
      [1, "Primera redacción", "conservada"],
      [2, "Segunda redacción", "en_revision"],
    ]);
    assert.equal(doc.versiones[0].revision.comentario, "Ajustar.");
    assert.equal(doc.versiones[0].decision, null);
  });

  it("archivar conserva versiones, adjuntos e historial", async () => {
    await autoridad.post(`/api/contenidos/${contenido.id}/archivar`, { motivo: "Vencido" });
    const doc = await buscar(contenido.id);
    assert.equal(doc.estado, "archivado");
    assert.equal(doc.versiones.length, 1);
    assert.equal(doc.versiones[0].titulo, "Convocatoria de becas");
    assert.deepEqual(doc.historial.map((e) => e.tipo), ["envio", "elevacion", "aprobacion", "publicacion", "archivo"]);
    await autoridad.post(`/api/contenidos/${contenido.id}/restaurar`);
    await autoridad.post(`/api/contenidos/${contenido.id}/publicar`);
  });

  it("los adjuntos quedan guardados dentro del contenido, con nombre generado por el servidor", async () => {
    const doc = await (await col("contenidos")).findOne({ "adjuntos.nombreOriginal": "logo.png" });
    assert.ok(doc);
    assert.match(doc.adjuntos[0].nombreAlmacenado, /^[0-9a-f-]{36}$/);
    assert.ok(doc.versiones[0].adjuntos[0].equals(doc.adjuntos[0]._id));
  });

  it("las contraseñas se guardan con bcrypt y los tokens como hash", async () => {
    const u = await (await col("usuarios")).findOne({ email: "admin@prueba.edu.ar" });
    assert.match(u.passwordHash, /^\$2[aby]\$/);
    assert.ok(!u.passwordHash.includes("Clave-de-prueba"));
    const s = await (await col("sesiones")).findOne({});
    assert.match(s.tokenHash, /^[0-9a-f]{64}$/);
  });
});

describe("vista_publicaciones", () => {
  it("muestra únicamente lo que tiene versión publicada", async () => {
    const pendiente = (await colab.post("/api/contenidos", datosContenido({ titulo: "Todavía en revisión" }))).datos;
    const filas = await (await col("vista_publicaciones")).find({}).toArray();
    assert.ok(filas.some((f) => f.slug === contenido.slug));
    assert.ok(!filas.some((f) => f.slug === pendiente.slug));
  });

  it("no expone autores, historial ni versiones anteriores", async () => {
    const [fila] = await (await col("vista_publicaciones")).find({ slug: contenido.slug }).toArray();
    assert.deepEqual(Object.keys(fila).sort(), ["adjuntos", "contenidoId", "cuerpo", "cuerpoHtml", "fecha", "numero", "prioridad", "resumen", "seccion", "sitios", "slug", "tipo", "titulo"]);
    // de la prioridad solo el nivel y hasta cuándo se destaca: ni el motivo interno ni quién la marcó
    assert.deepEqual(Object.keys(fila.prioridad).sort(), ["nivel", "vence"]);
  });

  it("toma el destino aprobado (destinoPublicado), no el de una versión en revisión", async () => {
    const doc = await buscar(contenido.id);
    assert.deepEqual(doc.sitiosDestino, ["adultos-mayores"]);
    assert.deepEqual(doc.destinoPublicado.sitios, ["adultos-mayores"]);
    const [fila] = await (await col("vista_publicaciones")).find({ sitios: "adultos-mayores", slug: contenido.slug }).toArray();
    assert.ok(fila, "la consulta por sitio de cada portal: { sitios: \"<id>\" }");
    assert.equal((await (await col("vista_publicaciones")).find({ sitios: "mama-antula", slug: contenido.slug }).toArray()).length, 0);
  });

  it("la base rechaza sitios inexistentes o repetidos aunque se escriba sin pasar por la aplicación", async () => {
    const contenidos = await col("contenidos");
    await assert.rejects(contenidos.updateOne({ _id: db.aId(contenido.id) }, { $set: { sitiosDestino: ["no-existe"] } }));
    await assert.rejects(contenidos.updateOne({ _id: db.aId(contenido.id) }, { $set: { sitiosDestino: ["mama-antula", "mama-antula"] } }));
    await assert.rejects(contenidos.updateOne({ _id: db.aId(contenido.id) }, { $set: { "destinoPublicado.sitios": [] } }));
  });

  it("el pipeline real filtra lo aprobado y proyecta el destino aprobado, nunca el de la versión en circuito", () => {
    const { VISTA_PUBLICACIONES } = require("../backend/bd/esquema");
    const [match, proyeccion] = VISTA_PUBLICACIONES.pipeline;
    assert.deepEqual(match.$match.versionPublicada, { $ne: null });
    // estado autorizado: nunca borrador, descartado, archivado ni aprobado sin publicar
    const autorizados = match.$match.estado.$in;
    for (const nunca of ["borrador", "descartado", "archivado", "aprobado"]) assert.ok(!autorizados.includes(nunca), nunca);
    assert.ok(autorizados.includes("publicado"));
    assert.deepEqual(match.$match["destinoPublicado.sitios.0"], { $exists: true });
    assert.equal(proyeccion.$project.sitios, "$destinoPublicado.sitios");
    assert.equal(proyeccion.$project.tipo, "$destinoPublicado.tipo");
    assert.equal(proyeccion.$project.seccion, "$destinoPublicado.seccion");
    assert.ok(!JSON.stringify(VISTA_PUBLICACIONES.pipeline).includes("sitiosDestino"));
  });

  it("es de solo lectura", async () => {
    await assert.rejects((await col("vista_publicaciones")).insertOne({ slug: "colado" }));
  });
});

describe("seguridad de los datos", () => {
  it("un operador de MongoDB en el login no se ejecuta (inyección NoSQL)", async () => {
    const anonimo = cliente(entorno.url);
    for (const email of [{ $ne: null }, { $gt: "" }, { $regex: ".*" }]) {
      const r = await anonimo.pedir("POST", "/api/auth/login", { email, password: { $ne: null } });
      assert.equal(r.estado, 401);
    }
  });

  it("los ids que no son ObjectId no llegan a la base", async () => {
    const r = await autoridad.pedir("POST", "/api/contenidos/%7B%22%24ne%22%3Anull%7D/publicar");
    assert.equal(r.estado, 404);
  });

  it("guarda tal cual un texto con apariencia de consulta, sin ejecutarlo", async () => {
    const malicioso = "{ \"$where\": \"sleep(5000)\" } '; db.usuarios.drop(); //";
    const r = await colab.post("/api/contenidos", datosContenido({ titulo: malicioso.slice(0, 120), seccion: "{ \"$gt\": \"\" }" }));
    assert.equal(r.estado, 201);
    assert.equal(r.datos.versiones[0].titulo, malicioso.slice(0, 120));
    assert.equal(await (await col("usuarios")).countDocuments(), 6, "la colección de usuarios sigue intacta (las seis personas de prueba)");
  });

  it("guarda acentos, eñes y emojis", async () => {
    const titulo = "Ñandú y sus crías 🌱 — año 2027";
    const r = await colab.post("/api/contenidos", datosContenido({ titulo }));
    assert.equal(r.datos.versiones[0].titulo, titulo);
    assert.equal((await buscar(r.datos.id)).versiones[0].titulo, titulo);
  });

  it("guarda el HTML como texto plano (el frontend lo escapa al mostrarlo)", async () => {
    const titulo = "<img src=x onerror=alert(1)>";
    const r = await colab.post("/api/contenidos", datosContenido({ titulo }));
    assert.equal(r.datos.versiones[0].titulo, titulo);
  });
});
