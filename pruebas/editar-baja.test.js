"use strict";

/* Editar y dar de baja contenidos ya publicados: control de acceso, efecto en los sitios y trazabilidad. */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { iniciar, cliente, ingresarComo, datosContenido } = require("./ayudas");
const { esperarPendientes } = require("../backend/src/auditoria/registro");

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const PDF = Buffer.from("%PDF-1.4\n%prueba\n");
const SITIOS = ["adultos-mayores", "mama-antula", "centro-de-dia"];

let entorno, admin, director, director2, autoridad, colab, obs, publico;

before(async () => {
  entorno = await iniciar();
  [admin, director, director2, autoridad, colab, obs] = await Promise.all(
    ["admin", "director", "director2", "autoridad", "colab", "obs"].map((c) => ingresarComo(entorno.url, c)));
  publico = cliente(entorno.url);
});

after(() => entorno.cerrar());

function formulario(datos, archivos = []) {
  const envio = new FormData();
  envio.append("datos", JSON.stringify(datos));
  for (const [contenido, nombre, tipo] of archivos) envio.append("adjuntos", new Blob([contenido], { type: tipo }), nombre);
  return envio;
}
const soloArchivos = (archivos) => {
  const envio = new FormData();
  for (const [contenido, nombre, tipo] of archivos) envio.append("adjuntos", new Blob([contenido], { type: tipo }), nombre);
  return envio;
};

/** Carga (como `autor`), pasa por dirección (un director que no sea el autor) y la autoridad aprueba: queda publicado. */
async function publicado(autor = colab, extra = {}, archivos = [[PNG, "portada.png", "image/png"]]) {
  const c = await autor.post("/api/contenidos", formulario(datosContenido({ sitiosDestino: SITIOS, ...extra }), archivos));
  assert.equal(c.estado, 201, JSON.stringify(c.datos));
  const revisor = autor === director ? director2 : director;
  assert.equal((await revisor.post(`/api/contenidos/${c.datos.id}/revision`, { decision: "elevar" })).estado, 200);
  const r = await autoridad.post(`/api/contenidos/${c.datos.id}/decision`, { decision: "aprobar" });
  assert.equal(r.datos.estado, "publicado");
  return r.datos;
}

const lista = async (sitio) => (await publico.get(`/api/publico/sitios/${sitio}/publicaciones?limite=100`)).datos;
const enSitios = async (slug) => {
  const r = {};
  for (const s of SITIOS) r[s] = (await lista(s)).some((p) => p.slug === slug);
  return r;
};
const darDeBaja = (quien, id, motivo = "Convocatoria vencida") => quien.pedir("DELETE", `/api/contenidos/${id}`, { motivo });

describe("dar de baja (borrado lógico)", () => {
  it("DELETE lo saca en el acto de los tres sitios, del detalle y de los archivos públicos", async () => {
    const c = await publicado();
    assert.deepEqual(await enSitios(c.slug), { "adultos-mayores": true, "mama-antula": true, "centro-de-dia": true });
    const foto = (await publico.get(`/api/publico/sitios/adultos-mayores/publicaciones/${c.slug}`)).datos.imagenes[0].url;
    assert.equal((await publico.get(foto)).estado, 200);

    const r = await darDeBaja(colab, c.id);
    assert.equal(r.estado, 200, JSON.stringify(r.datos));
    assert.equal(r.datos.estado, "archivado");

    assert.deepEqual(await enSitios(c.slug), { "adultos-mayores": false, "mama-antula": false, "centro-de-dia": false });
    assert.equal((await publico.get(`/api/publico/sitios/mama-antula/publicaciones/${c.slug}`)).estado, 404);
    assert.equal((await publico.get(foto)).estado, 404, "su foto deja de servirse al público");
  });

  it("no borra nada: versiones, archivos e historial quedan, con el motivo de la baja", async () => {
    const c = await publicado();
    await darDeBaja(director, c.id, "Se suspendió la actividad");
    const visto = (await admin.get("/api/contenidos")).datos.find((x) => x.id === c.id);
    assert.equal(visto.versiones.length, 1);
    assert.equal(visto.versiones[0].adjuntos.length, 1);
    assert.equal(visto.versiones[0].estado, "archivada");
    const evento = visto.historial.at(-1);
    assert.equal(evento.tipo, "archivo");
    assert.equal(evento.comentario, "Se suspendió la actividad");
    assert.equal(visto.visibilidad.codigo, "retirado");
    // el archivo sigue disponible dentro del panel
    assert.equal((await director.get(`/api/adjuntos/${visto.versiones[0].adjuntos[0].id}`)).estado, 200);
  });

  it("exige el motivo y avisa si ya estaba dado de baja", async () => {
    const c = await publicado();
    const sinMotivo = await colab.pedir("DELETE", `/api/contenidos/${c.id}`, {});
    assert.equal(sinMotivo.estado, 400);
    assert.match(sinMotivo.datos.error.mensaje, /motivo/);
    assert.equal((await darDeBaja(colab, c.id)).estado, 200);
    assert.equal((await darDeBaja(colab, c.id)).estado, 409);
  });

  it("también funciona con el nombre anterior (POST …/archivar)", async () => {
    const c = await publicado();
    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/archivar`, { motivo: "Terminó" })).datos.estado, "archivado");
  });

  it("reactivar no lo vuelve a mostrar: queda aprobado hasta que la autoridad lo publique", async () => {
    const c = await publicado();
    await darDeBaja(colab, c.id);
    const r = await colab.post(`/api/contenidos/${c.id}/restaurar`);
    assert.equal(r.estado, 200, JSON.stringify(r.datos));
    assert.equal(r.datos.estado, "aprobado");
    assert.equal((await enSitios(c.slug))["adultos-mayores"], false);
    assert.equal((await colab.post(`/api/contenidos/${c.id}/publicar`)).estado, 403, "publicar sigue siendo de la autoridad");
    await autoridad.post(`/api/contenidos/${c.id}/publicar`);
    assert.equal((await enSitios(c.slug))["adultos-mayores"], true);
  });

  it("queda en la auditoría como «Dio de baja», con el motivo", async () => {
    const c = await publicado(colab, { titulo: "Taller de memoria" });
    await darDeBaja(admin, c.id, "Cambió la sede");
    await esperarPendientes();
    const reg = (await admin.get("/api/auditoria?accion=contenido.archivar&porPagina=1")).datos.registros[0];
    assert.equal(reg.detalle, "Dio de baja «Taller de memoria»: “Cambió la sede”");
  });
});

describe("control de acceso (RBAC)", () => {
  it("dar de baja: autor, director de área, administrador y autoridad superior", async () => {
    for (const quien of [colab, director, admin, autoridad]) {
      const c = await publicado();
      const r = await darDeBaja(quien, c.id);
      assert.equal(r.estado, 200, JSON.stringify(r.datos));
    }
  });

  it("dar de baja: no un colaborador que no es el autor ni un observador", async () => {
    const delDirector = await publicado(director);
    const ajeno = await darDeBaja(colab, delDirector.id);
    assert.equal(ajeno.estado, 403);
    assert.match(ajeno.datos.error.mensaje, /autor, un director de área, el administrador o la autoridad superior/);
    assert.equal((await darDeBaja(obs, delDirector.id)).estado, 403);
    assert.equal((await obs.pedir("DELETE", "/api/contenidos/aaaaaaaaaaaaaaaaaaaaaaaa", { motivo: "x x x" })).estado, 403,
      "al observador se lo corta antes de buscar el contenido");
    assert.equal((await enSitios(delDirector.slug))["adultos-mayores"], true, "sigue publicado");
  });

  it("reactivar: las mismas personas que pueden dar de baja", async () => {
    const delDirector = await publicado(director);
    await darDeBaja(director, delDirector.id);
    assert.equal((await colab.post(`/api/contenidos/${delDirector.id}/restaurar`)).estado, 403);
    assert.equal((await obs.post(`/api/contenidos/${delDirector.id}/restaurar`)).estado, 403);
    assert.equal((await admin.post(`/api/contenidos/${delDirector.id}/restaurar`)).estado, 200);
  });

  it("editar: autor, director de área y administrador; la autoridad solo lo propio; no observadores ni otros colaboradores", async () => {
    for (const quien of [colab, director, admin]) {
      const c = await publicado();
      const r = await quien.post(`/api/contenidos/${c.id}/borrador`);
      assert.equal(r.estado, 201, r.datos.error && r.datos.error.mensaje);
    }
    const c = await publicado();
    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/borrador`)).estado, 403);
    assert.equal((await obs.post(`/api/contenidos/${c.id}/borrador`)).estado, 403);
    const delDirector = await publicado(director);
    const ajeno = await colab.post(`/api/contenidos/${delDirector.id}/borrador`);
    assert.equal(ajeno.estado, 403);
    assert.match(ajeno.datos.error.mensaje, /autor, un director de área o el administrador/);
  });

  it("si alguien ya está editando, otra persona no abre una segunda edición", async () => {
    const c = await publicado();
    await colab.post(`/api/contenidos/${c.id}/borrador`);
    const r = await director.post(`/api/contenidos/${c.id}/borrador`);
    assert.equal(r.estado, 409);
    assert.match(r.datos.error.mensaje, /ya está editando/);
  });
});

describe("editar lo publicado", () => {
  it("el formulario arranca con los datos actuales: textos, sitios, categoría y archivos", async () => {
    const c = await publicado(colab, { titulo: "Feria de salud", cuerpo: undefined, cuerpoHtml: "<p><strong>Gratis</strong></p>" });
    const b = (await director.post(`/api/contenidos/${c.id}/borrador`)).datos.borrador;
    assert.equal(b.titulo, "Feria de salud");
    assert.equal(b.cuerpoHtml, "<p><strong>Gratis</strong></p>");
    assert.deepEqual(b.sitiosDestino, SITIOS);
    assert.equal(b.seccion, c.seccion);
    assert.deepEqual(b.adjuntos.map((a) => a.nombre), ["portada.png"]);
  });

  it("cambia título, texto, sitios y archivos; la web muestra lo anterior hasta que la autoridad aprueba", async () => {
    const c = await publicado(colab, { titulo: "Horario de invierno" });
    // edita un director (no es el autor)
    const b = (await director.post(`/api/contenidos/${c.id}/borrador`)).datos;
    const portada = b.borrador.adjuntos[0];
    assert.equal((await director.pedir("DELETE", `/api/contenidos/${c.id}/borrador/adjuntos/${portada.id}`)).estado, 200);
    assert.equal((await director.post(`/api/contenidos/${c.id}/borrador/adjuntos`,
      soloArchivos([[PNG, "nueva-portada.png", "image/png"], [PDF, "cronograma.pdf", "application/pdf"]]))).estado, 201);
    const guardado = await director.pedir("PUT", `/api/contenidos/${c.id}/borrador`, {
      ...datosContenido({ titulo: "Horario de verano", sitiosDestino: ["adultos-mayores", "centro-de-dia"] }), slug: undefined,
    });
    assert.equal(guardado.estado, 200, JSON.stringify(guardado.datos));
    const enviado = await director.post(`/api/contenidos/${c.id}/borrador/enviar`);
    assert.equal(enviado.estado, 200, JSON.stringify(enviado.datos));
    assert.equal(enviado.datos.estado, "en_revision");

    // mientras se revisa, los sitios siguen mostrando la versión aprobada (en los tres)
    const antes = (await lista("mama-antula")).find((p) => p.slug === c.slug);
    assert.equal(antes.titulo, "Horario de invierno");

    // la versión del director la revisa otro director (nadie revisa lo propio) y decide la autoridad
    assert.equal((await director.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" })).estado, 403);
    assert.equal((await director2.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" })).estado, 200);
    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" })).estado, 200);

    const ahora = (await lista("adultos-mayores")).find((p) => p.slug === c.slug);
    assert.equal(ahora.titulo, "Horario de verano");
    assert.deepEqual(ahora.imagenes.map((i) => i.nombre), ["nueva-portada.png"]);
    assert.deepEqual(ahora.documentos.map((i) => i.nombre), ["cronograma.pdf"]);
    assert.equal((await lista("mama-antula")).some((p) => p.slug === c.slug), false, "se quitó Mama Antula de los sitios");

    // integridad: la versión 1 quedó intacta, con su portada
    const todo = (await admin.get("/api/contenidos")).datos.find((x) => x.id === c.id);
    assert.equal(todo.versiones.length, 2);
    assert.equal(todo.versiones[0].titulo, "Horario de invierno");
    assert.deepEqual(todo.versiones[0].adjuntos.map((a) => a.nombre), ["portada.png"]);
    assert.equal(todo.versiones[1].autorId, todo.historial.find((e) => e.tipo === "envio" && e.version === 2).usuarioId);
    assert.equal(todo.autorId, c.autorId, "el autor del contenido no cambia");
  });

  it("lo dado de baja no se edita (primero hay que reactivarlo)", async () => {
    const c = await publicado();
    await darDeBaja(colab, c.id);
    assert.equal((await colab.post(`/api/contenidos/${c.id}/borrador`)).estado, 409);
  });
});
