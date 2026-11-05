"use strict";

/* Devolución con observaciones y reenvío: versionado, transiciones de estado, registro de observaciones y RBAC. */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { iniciar, cliente, ingresarComo, datosContenido, db } = require("./ayudas");
const { migrarObservaciones } = require("../backend/scripts/iniciar-bd");

let entorno, admin, director, director2, autoridad, colab, obs, publico;

before(async () => {
  entorno = await iniciar();
  [admin, director, director2, autoridad, colab, obs] = await Promise.all(
    ["admin", "director", "director2", "autoridad", "colab", "obs"].map((c) => ingresarComo(entorno.url, c)));
  publico = cliente(entorno.url);
});

after(() => entorno.cerrar());

const enviar = async (quien = colab, extra = {}) => {
  const r = await quien.post("/api/contenidos", datosContenido(extra));
  assert.equal(r.estado, 201, JSON.stringify(r.datos));
  return r.datos;
};
const revisar = (quien, id, decision, comentario) => quien.post(`/api/contenidos/${id}/revision`, { decision, comentario });
const decidir = (quien, id, decision, comentario) => quien.post(`/api/contenidos/${id}/decision`, { decision, comentario });
const verComo = async (quien, id) => (await quien.get("/api/contenidos")).datos.find((c) => c.id === id);
const enSitio = async (slug) => (await publico.get("/api/publico/sitios/adultos-mayores/publicaciones?limite=100")).datos.find((p) => p.slug === slug);

/** El autor corrige: abre la edición, cambia el texto y la envía. */
async function corregir(quien, id, cambios) {
  const b = await quien.post(`/api/contenidos/${id}/borrador`);
  assert.equal(b.estado, 201, b.datos.error && b.datos.error.mensaje);
  const g = await quien.pedir("PUT", `/api/contenidos/${id}/borrador`, { ...datosContenido(cambios), slug: undefined });
  assert.equal(g.estado, 200, JSON.stringify(g.datos));
  const e = await quien.post(`/api/contenidos/${id}/borrador/enviar`);
  assert.equal(e.estado, 200, JSON.stringify(e.datos));
  return e.datos;
}

describe("devolver con observaciones", () => {
  it("el director devuelve: queda observado y la observación registra quién, rol, nivel, versión y mensaje", async () => {
    const c = await enviar();
    const r = await revisar(director, c.id, "devolver", "Falta la fecha de cierre.\nCorregir el horario.");
    assert.equal(r.estado, 200);
    assert.equal(r.datos.estado, "devuelto");
    assert.equal(r.datos.observaciones.length, 1);
    const o = r.datos.observaciones[0];
    assert.equal(o.nivel, "direccion");
    assert.equal(o.rol, "director");
    assert.equal(o.version, 1);
    assert.equal(o.mensaje, "Falta la fecha de cierre.\nCorregir el horario.");
    assert.equal(o.atendida, false);
    assert.equal(o.usuarioId, (await director.get("/api/auth/sesion")).datos.usuario.id);
    assert.match(o.fecha, /^\d{4}-\d{2}-\d{2}T/);
  });

  it("la autoridad superior también devuelve (nivel autoridad)", async () => {
    const c = await enviar();
    await revisar(director, c.id, "elevar");
    const r = await decidir(autoridad, c.id, "devolver", "Ajustar el título al tono institucional.");
    assert.equal(r.datos.estado, "devuelto");
    assert.deepEqual(r.datos.observaciones.map((o) => [o.nivel, o.rol]), [["autoridad", "autoridad"]]);
  });

  it("las observaciones son obligatorias y admiten texto detallado (hasta 2000 caracteres)", async () => {
    const c = await enviar();
    assert.equal((await revisar(director, c.id, "devolver", "  ")).estado, 400);
    assert.equal((await revisar(director, c.id, "devolver", "x".repeat(2000))).estado, 200);
    const largo = await enviar();
    const r = await revisar(director, largo.id, "devolver", "y".repeat(2500));
    assert.equal(r.datos.observaciones[0].mensaje.length, 2000, "se recorta al máximo, no se pierde el envío");
  });

  it("aprueban o devuelven el director de área, la autoridad superior y el administrador (nadie más)", async () => {
    const c = await enviar();
    for (const quien of [colab, obs, autoridad]) {
      assert.equal((await revisar(quien, c.id, "devolver", "No corresponde")).estado, 403, "revisión de dirección");
    }
    await revisar(director, c.id, "elevar");
    for (const quien of [colab, obs, director]) {
      assert.equal((await decidir(quien, c.id, "devolver", "No corresponde")).estado, 403, "decisión final");
    }
    // el administrador puede en las dos instancias
    const r = await decidir(admin, c.id, "devolver", "Revisar el título.");
    assert.equal(r.estado, 200);
    assert.equal(r.datos.observaciones.at(-1).rol, "administrador");
    const otro = await enviar();
    const rev = await revisar(admin, otro.id, "devolver", "Falta la foto.");
    assert.equal(rev.estado, 200);
    assert.deepEqual([rev.datos.observaciones[0].nivel, rev.datos.observaciones[0].rol], ["direccion", "administrador"]);
  });

  it("las observaciones no salen nunca en la API pública", async () => {
    const c = await enviar(colab, { titulo: "Con observaciones" });
    await revisar(director, c.id, "devolver", "Dato interno: revisar el presupuesto");
    await corregir(colab, c.id, { titulo: "Con observaciones" });
    await revisar(director, c.id, "elevar");
    await decidir(autoridad, c.id, "aprobar");
    const p = await enSitio(c.slug);
    assert.ok(p);
    assert.ok(!JSON.stringify(p).includes("presupuesto"));
    assert.ok(!("observaciones" in p));
  });
});

describe("corregir y reenviar", () => {
  it("solo el autor modifica lo observado (ni otro director ni el administrador)", async () => {
    const c = await enviar();
    await revisar(director, c.id, "devolver", "Cambiar la foto.");
    for (const quien of [director, director2, admin, autoridad, obs]) {
      const r = await quien.post(`/api/contenidos/${c.id}/borrador`);
      assert.equal(r.estado, 403, `${r.datos.error && r.datos.error.mensaje}`);
    }
    const directo = await admin.post(`/api/contenidos/${c.id}/versiones`, { ...datosContenido(), slug: undefined });
    assert.equal(directo.estado, 403);
    assert.match(directo.datos.error.mensaje, /solo su autor/);
    assert.equal((await colab.post(`/api/contenidos/${c.id}/borrador`)).estado, 201);
  });

  it("al reenviar vuelve a en_revision, las observaciones quedan atendidas y la cadena empieza de nuevo", async () => {
    const c = await enviar();
    await revisar(director, c.id, "devolver", "Falta la fecha.");
    const v2 = await corregir(colab, c.id, { cuerpo: "Con la fecha: 30 de octubre." });
    assert.equal(v2.estado, "en_revision");
    assert.equal(v2.versiones.length, 2);
    assert.equal(v2.versiones[0].estado, "conservada", "la versión observada se conserva tal cual");
    assert.deepEqual(v2.observaciones.map((o) => [o.atendida, o.atendidaEnVersion]), [[true, 2]]);

    // otra vuelta: ahora observa la autoridad
    await revisar(director, c.id, "elevar");
    assert.equal((await decidir(autoridad, c.id, "devolver", "Sumá el lugar.")).datos.estado, "devuelto");
    const v3 = await corregir(colab, c.id, { cuerpo: "Con la fecha y el lugar." });
    assert.deepEqual(v3.observaciones.map((o) => [o.nivel, o.atendidaEnVersion]), [["direccion", 2], ["autoridad", 3]]);
    // tiene que pasar de nuevo por dirección: la autoridad no puede decidir antes
    assert.equal((await decidir(autoridad, c.id, "aprobar")).estado, 409);
    await revisar(director, c.id, "elevar");
    assert.equal((await decidir(autoridad, c.id, "aprobar")).datos.estado, "publicado");
  });

  it("editar algo publicado: nueva versión en revisión; lo publicado sigue visible aunque la observen", async () => {
    const c = await enviar(colab, { titulo: "Feria de salud" });
    await revisar(director, c.id, "elevar");
    await decidir(autoridad, c.id, "aprobar");

    const editado = await corregir(colab, c.id, { titulo: "Feria de salud (nueva fecha)" });
    assert.equal(editado.estado, "en_revision");
    assert.equal((await enSitio(c.slug)).titulo, "Feria de salud", "mientras se revisa, se ve lo aprobado");

    await revisar(director, c.id, "elevar");
    await decidir(autoridad, c.id, "devolver", "Confirmá la nueva fecha con la sede.");
    const visto = await verComo(colab, c.id);
    assert.equal(visto.estado, "devuelto");
    assert.equal(visto.visibilidad.codigo, "visible_con_cambios", "la versión publicada sigue en la web");
    assert.equal((await enSitio(c.slug)).titulo, "Feria de salud");

    await corregir(colab, c.id, { titulo: "Feria de salud (5 de noviembre)" });
    await revisar(director, c.id, "elevar");
    await decidir(autoridad, c.id, "aprobar");
    assert.equal((await enSitio(c.slug)).titulo, "Feria de salud (5 de noviembre)", "recién al aprobarse cambia la web");
  });

  it("si un director editó algo publicado y se lo observan, corrige él (y el autor original también puede)", async () => {
    const c = await enviar(colab, { titulo: "Taller de huerta" });
    await revisar(director, c.id, "elevar");
    await decidir(autoridad, c.id, "aprobar");
    await corregir(director, c.id, { titulo: "Taller de huerta (sábados)" });
    // la edición del director la revisa otro director
    assert.equal((await revisar(director, c.id, "elevar")).estado, 403);
    await revisar(director2, c.id, "devolver", "El horario no coincide.");
    assert.equal((await director2.post(`/api/contenidos/${c.id}/borrador`)).estado, 403, "quien observó no corrige");
    assert.equal((await director.post(`/api/contenidos/${c.id}/borrador`)).estado, 201, "el autor de la versión corrige");
  });
});

describe("migración de observaciones anteriores", () => {
  it("arma observaciones desde las devoluciones guardadas y marca atendidas las que tuvieron versión siguiente", async () => {
    const c = await enviar();
    await revisar(director, c.id, "devolver", "Primera observación.");
    await corregir(colab, c.id, {});
    await revisar(director, c.id, "elevar");
    await decidir(autoridad, c.id, "devolver", "Segunda observación.");
    const contenidos = await db.coleccion("contenidos");
    const { ObjectId } = db;
    // simula un documento de antes: sin el campo
    await contenidos.updateOne({ _id: new ObjectId(c.id) }, { $unset: { observaciones: "" } });
    const bd = await db.obtenerBd();
    assert.equal(await migrarObservaciones(bd), 1);
    const visto = await verComo(colab, c.id);
    assert.deepEqual(
      visto.observaciones.map((o) => [o.version, o.nivel, o.rol, o.mensaje, o.atendidaEnVersion]),
      [[1, "direccion", "director", "Primera observación.", 2], [2, "autoridad", "autoridad", "Segunda observación.", null]]
    );
    assert.equal(await migrarObservaciones(bd), 0, "idempotente");
  });
});
