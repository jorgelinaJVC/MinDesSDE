"use strict";

/* Contenidos prioritarios: marca en el borrador, bandejas ordenadas, cambio por revisores, web y auditoría. */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { iniciar, cliente, ingresarComo, datosContenido, db } = require("./ayudas");
const { esperarPendientes } = require("../backend/src/auditoria/registro");

let entorno;
let admin, director, autoridad, colab, obs;

before(async () => {
  entorno = await iniciar();
  [admin, director, autoridad, colab, obs] = await Promise.all(
    ["admin", "director", "autoridad", "colab", "obs"].map((c) => ingresarComo(entorno.url, c))
  );
});

after(() => entorno.cerrar());

const enBd = async (id) => (await db.coleccion("contenidos")).findOne({ _id: db.aId(id) });
const URGENTE = { nivel: "urgente", motivo: "Corte de agua el jueves", vence: null };
const enDias = (n) => new Date(Date.now() - 3 * 3600 * 1000 + n * 86400000).toISOString().slice(0, 10);

/** Borrador completo de la colaboradora, enviado a revisión, con la prioridad indicada. */
async function enviado(titulo, pri = null) {
  const { slug, ...resto } = datosContenido({ titulo });
  const b = (await colab.post("/api/borradores", { ...resto, slug, ...(pri && { prioridad: pri }) })).datos;
  const r = await colab.post(`/api/contenidos/${b.id}/borrador/enviar`);
  assert.equal(r.estado, 200, JSON.stringify(r.datos));
  return r.datos;
}
const elevar = (c) => director.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" });
const aprobar = async (c) => { await elevar(c); return autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" }); };
// la aprobación de la autoridad superior publica en el mismo paso
const publicar = aprobar;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

describe("marca de prioridad en el borrador", () => {
  it("se marca al redactar, se guarda con el borrador y se puede quitar", async () => {
    const b = (await colab.post("/api/borradores", { titulo: "Aviso", prioridad: { ...URGENTE, vence: enDias(3) } })).datos;
    assert.equal(b.borrador.prioridad.nivel, "urgente");
    assert.equal(b.borrador.prioridad.motivo, "Corte de agua el jueves");
    assert.equal(b.borrador.prioridad.vence, `${enDias(4)}T02:59:59.999Z`, "hasta el final de ese día, hora argentina");

    const sinCambio = await colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { titulo: "Aviso corregido" });
    assert.equal(sinCambio.datos.borrador.prioridad.nivel, "urgente", "guardar sin «prioridad» no la toca");

    const normal = await colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { titulo: "Aviso", prioridad: { nivel: "normal", motivo: "x" } });
    assert.deepEqual(normal.datos.borrador.prioridad, { nivel: "normal", motivo: "", vence: null }, "al quitar la urgencia se limpian motivo y fecha");
  });

  it("valida nivel, motivo y fecha", async () => {
    const b = (await colab.post("/api/borradores", { titulo: "x" })).datos;
    const pedir = (prioridad) => colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { titulo: "x", prioridad });
    assert.equal((await pedir({ nivel: "altisima" })).estado, 400);
    assert.equal((await pedir({ nivel: "urgente", motivo: "x".repeat(201) })).estado, 400);
    assert.equal((await pedir({ nivel: "urgente", vence: "mañana" })).estado, 400);
    assert.equal((await pedir({ nivel: "urgente", vence: enDias(120) })).estado, 400, "máximo 90 días destacado");
    assert.equal((await pedir("urgente")).estado, 400);
    assert.equal((await pedir({ nivel: { $ne: "x" } })).estado, 400);
  });

  it("un borrador puede guardar una fecha vencida, pero no se envía así", async () => {
    const { slug, ...resto } = datosContenido({ titulo: "Vencido" });
    const b = (await colab.post("/api/borradores", { ...resto, slug })).datos;
    const guardado = await colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { ...resto, slug, prioridad: { nivel: "urgente", vence: enDias(-2) } });
    assert.equal(guardado.estado, 200, "como borrador se guarda igual");
    const r = await colab.post(`/api/contenidos/${b.id}/borrador/enviar`);
    assert.equal(r.estado, 400);
    assert.match(r.datos.error.mensaje, /ya pasó/);
  });

  it("al enviar queda en el contenido, con quién la marcó, y en el historial", async () => {
    const c = await enviado("Corte programado", URGENTE);
    assert.equal(c.estado, "en_revision");
    assert.equal(c.prioridad.nivel, "urgente");
    assert.equal(c.prioridad.marcadoPor, entorno.usuarios.colab.id);
    assert.ok(c.prioridad.marcadoEn);
    assert.equal(c.historial.at(-1).comentario, "Enviado como urgente: Corte de agua el jueves");
    const sinMarca = await enviado("Común");
    assert.equal(sinMarca.prioridad.nivel, "normal");
  });
});

describe("bandejas: lo urgente primero, después lo que más espera", () => {
  let viejoNormal, nuevoNormal, urgente, propioDirector;

  before(async () => {
    viejoNormal = await enviado("Normal viejo");
    await espera(15);
    nuevoNormal = await enviado("Normal nuevo");
    await espera(15);
    urgente = await enviado("Urgente reciente", URGENTE);
    const { slug, ...resto } = datosContenido({ titulo: "Del director" });
    const b = (await director.post("/api/borradores", { ...resto, slug, prioridad: URGENTE })).datos;
    propioDirector = (await director.post(`/api/contenidos/${b.id}/borrador/enviar`)).datos;
  });

  it("dirección: lo urgente primero aunque sea lo más reciente; sin lo propio", async () => {
    const r = await director.get("/api/contenidos/bandeja");
    assert.equal(r.estado, 200);
    const ids = r.datos.contenidos.map((c) => c.id);
    assert.ok(!ids.includes(propioDirector.id), "no revisa lo que cargó");
    const pos = (c) => ids.indexOf(c.id);
    assert.ok(pos(urgente) < pos(viejoNormal) && pos(viejoNormal) < pos(nuevoNormal), "urgente → normal más viejo → normal más nuevo");
    assert.ok(r.datos.contenidos.every((c) => c.estado === "en_revision"));
    assert.ok(r.datos.urgentes >= 1 && r.datos.total === ids.length);
    const urgentes = r.datos.contenidos.filter((c) => c.prioridad.nivel === "urgente").length;
    assert.ok(r.datos.contenidos.slice(0, urgentes).every((c) => c.prioridad.nivel === "urgente"), "todos los urgentes arriba");
  });

  it("?prioridad=urgente deja solo los urgentes", async () => {
    const r = await director.get("/api/contenidos/bandeja?prioridad=urgente");
    assert.ok(r.datos.contenidos.length && r.datos.contenidos.every((c) => c.prioridad.nivel === "urgente"));
    assert.equal((await director.get("/api/contenidos/bandeja?prioridad=maxima")).estado, 400);
  });

  it("autoridad superior: lo elevado y lo aprobado, también ordenado por urgencia", async () => {
    await elevar(nuevoNormal);
    await elevar(urgente);
    const r = await autoridad.get("/api/contenidos/bandeja");
    const estados = new Set(r.datos.contenidos.map((c) => c.estado));
    assert.ok([...estados].every((e) => ["elevado", "aprobado"].includes(e)));
    assert.equal(r.datos.contenidos[0].prioridad.nivel, "urgente");
  });

  it("colaborador y observador no tienen bandeja", async () => {
    assert.equal((await colab.get("/api/contenidos/bandeja")).estado, 403);
    assert.equal((await obs.get("/api/contenidos/bandeja")).estado, 403);
    assert.equal((await cliente(entorno.url).get("/api/contenidos/bandeja")).estado, 401);
  });

  it("el listado general acepta el mismo orden y filtro", async () => {
    const r = await obs.get("/api/contenidos?orden=prioridad");
    const niveles = r.datos.map((c) => c.prioridad.nivel);
    assert.ok(niveles.indexOf("normal") > niveles.lastIndexOf("urgente"), "urgentes antes que normales");
    const normales = (await obs.get("/api/contenidos?prioridad=normal")).datos;
    assert.ok(normales.length && normales.every((c) => c.prioridad.nivel === "normal"));
    assert.equal((await obs.get("/api/contenidos?orden=alfabetico")).estado, 400);
  });
});

describe("los revisores ajustan la prioridad", () => {
  it("dirección la baja; queda en el historial y no reinicia el tiempo de espera", async () => {
    const c = await enviado("Marcado de más", URGENTE);
    const antes = (await enBd(c.id)).actualizadoEn;
    await espera(10);
    assert.equal((await colab.patch(`/api/contenidos/${c.id}/prioridad`, { nivel: "normal" })).estado, 403, "el autor no la cambia una vez enviado");
    assert.equal((await obs.patch(`/api/contenidos/${c.id}/prioridad`, { nivel: "normal" })).estado, 403);

    const r = await director.patch(`/api/contenidos/${c.id}/prioridad`, { nivel: "normal" });
    assert.equal(r.estado, 200, JSON.stringify(r.datos));
    assert.equal(r.datos.prioridad.nivel, "normal");
    assert.equal(r.datos.prioridad.marcadoPor, entorno.usuarios.director.id);
    const evento = r.datos.historial.at(-1);
    assert.equal(evento.tipo, "prioridad");
    assert.equal(evento.comentario, "De urgente (motivo: Corte de agua el jueves) a normal");
    assert.equal((await enBd(c.id)).actualizadoEn.getTime(), antes.getTime());

    const otra = await director.patch(`/api/contenidos/${c.id}/prioridad`, { nivel: "normal" });
    assert.equal(otra.datos.historial.length, r.datos.historial.length, "sin cambios no escribe nada");
  });

  it("la autoridad la sube sobre algo elevado", async () => {
    const c = await enviado("Pasó a ser urgente");
    await elevar(c);
    const r = await autoridad.patch(`/api/contenidos/${c.id}/prioridad`, { nivel: "urgente", motivo: "Lo pidió el ministerio", vence: enDias(5) });
    assert.equal(r.estado, 200);
    assert.equal(r.datos.prioridad.motivo, "Lo pidió el ministerio");
  });

  it("devuelto o rechazado no se toca; publicado solo la autoridad", async () => {
    const devuelto = await enviado("Devuelto");
    await director.post(`/api/contenidos/${devuelto.id}/revision`, { decision: "devolver", comentario: "Ajustar." });
    const r = await director.patch(`/api/contenidos/${devuelto.id}/prioridad`, URGENTE);
    assert.equal(r.estado, 409);
    assert.match(r.datos.error.mensaje, /autor/);

    const pub = await enviado("Ya publicado", URGENTE);
    await publicar(pub);
    assert.equal((await director.patch(`/api/contenidos/${pub.id}/prioridad`, { nivel: "normal" })).estado, 403);
    const ok = await autoridad.patch(`/api/contenidos/${pub.id}/prioridad`, { nivel: "normal" });
    assert.equal(ok.estado, 200);
    assert.equal((await enBd(pub.id)).prioridadPublicada.nivel, "normal", "cambia lo que se destaca en la web");
  });
});

describe("sitio público", () => {
  it("al publicar se copia; los urgentes vigentes van primero; el motivo no sale", async () => {
    const normal = await enviado("Noticia normal publicada");
    await publicar(normal);
    const u = await enviado("Aviso urgente publicado", { ...URGENTE, vence: enDias(3) });
    await publicar(u);
    await publicar(await enviado("Otra normal más nueva"));

    const lista = (await cliente(entorno.url).get("/api/publico/sitios/adultos-mayores/publicaciones")).datos;
    assert.equal(lista[0].slug, u.slug, "el urgente va primero aunque no sea el más reciente");
    assert.equal(lista[0].urgente, true);
    assert.match(lista[0].urgenteHasta, /^\d{4}-\d{2}-\d{2}T/);
    assert.ok(lista.slice(1).every((p) => p.urgente === false && p.urgenteHasta === null));
    assert.ok(!JSON.stringify(lista).includes("Corte de agua"), "el motivo es interno");

    const soloUrgentes = (await cliente(entorno.url).get("/api/publico/sitios/adultos-mayores/publicaciones?urgentes=1")).datos;
    assert.ok(soloUrgentes.length >= 1 && soloUrgentes.every((p) => p.urgente));
    assert.equal((await cliente(entorno.url).get(`/api/publico/sitios/adultos-mayores/publicaciones/${u.slug}`)).datos.urgente, true);
  });

  it("cuando pasa su fecha deja de destacarse solo", async () => {
    const u = await enviado("Aviso que vence", { ...URGENTE, vence: enDias(2) });
    await publicar(u);
    // simula que pasó el tiempo: la fecha queda en el pasado
    const col = await db.coleccion("contenidos");
    const ayer = new Date(Date.now() - 86400000);
    await col.updateOne({ _id: db.aId(u.id) }, { $set: { "prioridadPublicada.vence": ayer, "prioridad.vence": ayer } });
    const p = (await cliente(entorno.url).get(`/api/publico/sitios/adultos-mayores/publicaciones/${u.slug}`)).datos;
    assert.equal(p.urgente, false);
    assert.equal(p.urgenteHasta, null);
    const soloUrgentes = (await cliente(entorno.url).get("/api/publico/sitios/adultos-mayores/publicaciones?urgentes=1")).datos;
    assert.ok(!soloUrgentes.some((x) => x.slug === u.slug));
  });

  it("una versión nueva hereda la urgencia, y la web sigue con la aprobada hasta aprobar la nueva", async () => {
    const u = await enviado("Urgente con segunda versión", URGENTE);
    await publicar(u);
    const b = (await colab.post(`/api/contenidos/${u.id}/borrador`)).datos;
    assert.equal(b.borrador.prioridad.nivel, "urgente", "hereda la prioridad");
    const { slug, ...resto } = datosContenido({ titulo: "Urgente con segunda versión" });
    await colab.pedir("PUT", `/api/contenidos/${u.id}/borrador`, { ...resto, prioridad: { nivel: "normal" } });
    await colab.post(`/api/contenidos/${u.id}/borrador/enviar`);
    assert.equal((await enBd(u.id)).prioridad.nivel, "normal");
    assert.equal((await cliente(entorno.url).get(`/api/publico/sitios/adultos-mayores/publicaciones/${u.slug}`)).datos.urgente, true, "lo visible sigue como se aprobó");
    await aprobar(u);
    assert.equal((await cliente(entorno.url).get(`/api/publico/sitios/adultos-mayores/publicaciones/${u.slug}`)).datos.urgente, false);
  });
});

describe("auditoría y base de datos", () => {
  it("el envío urgente y el cambio de prioridad quedan auditados con su detalle", async () => {
    const c = await enviado("Para auditar prioridad", URGENTE);
    await director.patch(`/api/contenidos/${c.id}/prioridad`, { nivel: "normal" });
    await obs.patch(`/api/contenidos/${c.id}/prioridad`, { nivel: "urgente" });
    await esperarPendientes();
    const { registros } = (await admin.get("/api/auditoria?q=Para%20auditar%20prioridad&porPagina=100")).datos;
    const detalles = registros.map((r) => [r.accion, r.resultado, r.detalle]);
    assert.ok(detalles.some(([a, , d]) => a === "borrador.enviar" && d.endsWith("(versión 1) como urgente")));
    assert.ok(detalles.some(([a, res, d]) => a === "contenido.prioridad" && res === "ok"
      && d === "Cambió la prioridad de «Para auditar prioridad»: de urgente (motivo: Corte de agua el jueves) a normal"));
    assert.ok(detalles.some(([a, res]) => a === "contenido.prioridad" && res === "rechazado"));
  });

  it("el esquema rechaza un nivel inexistente; los contenidos sin el campo son normales", async () => {
    const col = await db.coleccion("contenidos");
    const c = await enviado("Para el esquema");
    await assert.rejects(col.updateOne({ _id: db.aId(c.id) }, { $set: { "prioridad.nivel": "altisima" } }), { code: 121 });
    await col.updateOne({ _id: db.aId(c.id) }, { $unset: { prioridad: "" } });
    const viejo = (await obs.get("/api/contenidos")).datos.find((x) => x.id === c.id);
    assert.equal(viejo.prioridad.nivel, "normal");
    assert.ok((await director.get("/api/contenidos/bandeja")).datos.contenidos.some((x) => x.id === c.id));
  });
});
