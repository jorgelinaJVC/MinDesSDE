"use strict";

/* Los datos de ejemplo (npm run bd:sembrar) se cargan con las mismas reglas que la aplicación:
 * si una regla cambia (por ejemplo, quién puede revisar), esta prueba avisa que el script quedó desactualizado. */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { iniciar, db } = require("./ayudas");
const { sembrar } = require("../backend/scripts/sembrar");

let entorno;
before(async () => { entorno = await iniciar(); });
after(() => entorno.cerrar());

describe("datos de ejemplo", () => {
  it("se cargan sin errores e incluyen un contenido observado con sus observaciones", async () => {
    const r = await sembrar();
    assert.equal(r.contenidosCreados, true);
    const observado = await (await db.coleccion("contenidos")).findOne({ slug: "jornada-salud-visual" });
    assert.equal(observado.estado, "devuelto");
    assert.equal(observado.observaciones.length, 1);
    assert.equal(observado.observaciones[0].nivel, "direccion");
    assert.match(observado.observaciones[0].mensaje, /fecha y el horario/);
  });
});
