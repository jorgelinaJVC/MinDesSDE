"use strict";

/* Control y auditoría: registro automático, campos obligatorios, filtros, exportación, directorio y RBAC. */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { iniciar, cliente, ingresarComo, datosContenido, db } = require("./ayudas");
const { esperarPendientes } = require("../backend/src/auditoria/registro");
const config = require("../backend/src/config");

let entorno;
let admin, director, autoridad, colab, obs;

const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

before(async () => {
  entorno = await iniciar();
  [admin, director, autoridad, colab, obs] = await Promise.all(
    ["admin", "director", "autoridad", "colab", "obs"].map((c) => ingresarComo(entorno.url, c))
  );
});

after(() => entorno.cerrar());

/** Consulta la auditoría como administrador (después de que se escriban los registros pendientes). */
async function auditoria(consulta = {}) {
  await esperarPendientes();
  const r = await admin.get(`/api/auditoria?${new URLSearchParams({ porPagina: "100", ...consulta })}`);
  assert.equal(r.estado, 200, JSON.stringify(r.datos));
  return r.datos;
}
const ultimo = async (consulta) => (await auditoria(consulta)).registros[0];

function formulario(datos, archivos = []) {
  const envio = new FormData();
  envio.append("datos", JSON.stringify(datos));
  for (const [contenido, nombre, tipo] of archivos) envio.append("adjuntos", new Blob([contenido], { type: tipo }), nombre);
  return envio;
}

describe("solo el administrador consulta (RBAC)", () => {
  it("el resto de los roles recibe 403 en todas las rutas; sin sesión, 401", async () => {
    for (const quien of [director, autoridad, colab, obs]) {
      for (const ruta of ["/api/auditoria", "/api/auditoria/resumen", "/api/auditoria/exportar", "/api/auditoria/catalogo", "/api/directorio"]) {
        assert.equal((await quien.get(ruta)).estado, 403, ruta);
      }
    }
    assert.equal((await cliente(entorno.url).get("/api/auditoria")).estado, 401);
    assert.equal((await admin.get("/api/auditoria")).estado, 200);
  });
});

describe("registro automático con los campos obligatorios", () => {
  it("inicio de sesión: quién, cuándo, desde dónde y qué", async () => {
    const antes = Date.now();
    await ingresarComo(entorno.url, "director");
    const r = await ultimo({ accion: "sesion.inicio", usuario: entorno.usuarios.director.id });
    assert.deepEqual(
      [r.usuario.nombre, r.usuario.email, r.usuario.rol],
      ["Persona director", "director@prueba.edu.ar", "director"]
    );
    assert.ok(Date.parse(r.fecha) >= antes - 5 && Date.parse(r.fecha) <= Date.now(), "marca de tiempo exacta");
    assert.match(r.fecha, /\.\d{3}Z$/, "con milisegundos");
    assert.equal(r.modulo, "Acceso");
    assert.equal(r.detalle, "Inició sesión");
    assert.equal(r.resultado, "ok");
    assert.ok(r.ubicacion.ip && r.ubicacion.red === "Equipo local");
    assert.deepEqual([r.peticion.metodo, r.peticion.ruta, r.peticion.estado], ["POST", "/api/auth/login", 200]);
  });

  it("ingreso fallido: con una cuenta existente identifica a quién pertenece; con un correo inexistente guarda el intentado", async () => {
    await cliente(entorno.url).ingresar("colab", "contraseña-equivocada");
    const conCuenta = await ultimo({ accion: "sesion.fallida" });
    assert.equal(conCuenta.usuario.email, "colab@prueba.edu.ar");
    assert.equal(conCuenta.usuario.rol, "colaborador");
    assert.equal(conCuenta.resultado, "rechazado");
    assert.match(conCuenta.motivo, /incorrectos/);

    await cliente(entorno.url).post("/api/auth/login", { email: "Intruso@Afuera.com", password: "x" });
    const sinCuenta = await ultimo({ accion: "sesion.fallida" });
    assert.deepEqual(sinCuenta.usuario, { id: null, nombre: null, email: "intruso@afuera.com", rol: null });
  });

  it("todo el ciclo de un contenido, con el detalle de cada movimiento y el objeto sobre el que se actuó", async () => {
    const b = (await colab.post("/api/borradores", formulario({ titulo: "Becas de transporte" }))).datos;
    await colab.post(`/api/contenidos/${b.id}/borrador/adjuntos`, formulario({}, [[PDF, "bases.pdf", "application/pdf"], [PNG, "afiche.png", "image/png"]]));
    const { slug, ...resto } = datosContenido({ titulo: "Becas de transporte 2027" });
    await colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { ...resto, slug });
    await colab.post(`/api/contenidos/${b.id}/borrador/enviar`);
    await director.post(`/api/contenidos/${b.id}/revision`, { decision: "elevar", comentario: "Listo." });
    await director.post(`/api/contenidos/${b.id}/publicar`); // rechazado: no le corresponde
    await autoridad.post(`/api/contenidos/${b.id}/decision`, { decision: "aprobar" }); // aprueba y publica

    const { registros } = await auditoria();
    const delContenido = registros.filter((r) => r.objeto && r.objeto.id === b.id).reverse();
    assert.deepEqual(delContenido.map((r) => [r.usuario.rol, r.modulo, r.resultado, r.detalle]), [
      ["colaborador", "Borradores", "ok", "Creó el borrador «Becas de transporte»"],
      ["colaborador", "Borradores", "ok", "Adjuntó bases.pdf y afiche.png al borrador «Becas de transporte»"],
      ["colaborador", "Borradores", "ok", "Editó título, resumen, texto, sitios, tipo, categoría e identificador web del borrador «Becas de transporte 2027»"],
      ["colaborador", "Borradores", "ok", "Envió a revisión «Becas de transporte 2027» (versión 1)"],
      ["director", "Revisión editorial", "ok", "Elevó «Becas de transporte 2027» a la autoridad superior: “Listo.”"],
      ["director", "Publicaciones", "rechazado", "Intentó publicar «Becas de transporte 2027»"],
      ["autoridad", "Revisión editorial", "ok", "Aprobó «Becas de transporte 2027» y lo publicó en Adultos Mayores"],
    ]);
    const rechazo = delContenido.find((r) => r.resultado === "rechazado");
    assert.match(rechazo.motivo, /autoridad superior/);
    assert.equal(rechazo.peticion.estado, 403);
  });

  it("editar solo el título dice exactamente eso", async () => {
    const b = (await colab.post("/api/borradores", { titulo: "Primer título", cuerpo: "Texto" })).datos;
    await colab.pedir("PUT", `/api/contenidos/${b.id}/borrador`, { titulo: "Título corregido", cuerpo: "Texto" });
    assert.equal((await ultimo({ accion: "borrador.editar" })).detalle, "Editó título del borrador «Título corregido»");
  });

  it("abrir y descargar archivos queda registrado; las miniaturas no", async () => {
    const c = (await colab.post("/api/contenidos", formulario(datosContenido({ titulo: "Con archivo" }), [[PDF, "reglamento.pdf", "application/pdf"]]))).datos;
    const id = c.versiones[0].adjuntos[0].id;
    await director.get(`/api/adjuntos/${id}?ver=1`);
    await director.get(`/api/adjuntos/${id}`);
    await director.get(`/api/adjuntos/${id}?ver=1&miniatura=1`);
    await obs.get(`/api/adjuntos/${id}`); // rechazado: no publicado
    const { registros } = await auditoria({ modulo: "Archivos adjuntos" });
    const deEste = registros.filter((r) => r.objeto.id === id).reverse();
    assert.deepEqual(deEste.map((r) => [r.usuario.rol, r.accion, r.resultado]), [
      ["director", "adjunto.ver", "ok"], ["director", "adjunto.descargar", "ok"], ["observador", "adjunto.descargar", "rechazado"],
    ]);
    assert.equal(deEste[0].detalle, "Abrió reglamento.pdf de «Con archivo»");
    assert.equal(deEste[2].detalle, "Intentó descargar reglamento.pdf de «Con archivo»");
  });

  it("gobernanza: cambio de rol con el rol anterior; el registro conserva el rol que tenía al actuar", async () => {
    const idObs = entorno.usuarios.obs.id;
    await obs.post("/api/auth/logout");
    await admin.patch(`/api/usuarios/${idObs}/rol`, { rol: "colaborador" });
    const r = await ultimo({ accion: "equipo.cambiar_rol" });
    assert.equal(r.detalle, "Cambió el rol de Persona obs de Observador a Colaborador");
    assert.equal(r.modulo, "Gobernanza");
    assert.equal(r.objeto.id, idObs);
    const salida = await ultimo({ accion: "sesion.cierre", usuario: idObs });
    assert.equal(salida.usuario.rol, "observador", "el movimiento anterior sigue con el rol de ese momento");
    await admin.patch(`/api/usuarios/${idObs}/rol`, { rol: "observador" });
    obs = await ingresarComo(entorno.url, "obs");
  });

  it("editar datos de contacto de un integrante detalla qué cambió", async () => {
    const idColab = entorno.usuarios.colab.id;
    await admin.patch(`/api/usuarios/${idColab}`, { nombre: "Persona colab", email: "colab@prueba.edu.ar", telefono: "+54 385 422-1100", area: "Prensa" });
    assert.equal((await ultimo({ accion: "equipo.editar" })).detalle, "Editó teléfono y área de Persona colab");
  });
});

describe("lugar: sede por rango de IP y país informado por un proxy de confianza", () => {
  it("nombra la sede y toma el país solo de la cabecera configurada", async () => {
    const original = { ...config.auditoria };
    config.auditoria.sedes = [{ rango: "127.0.0.0/8", nombre: "Sede Central" }];
    config.auditoria.cabeceraPais = "x-pais";
    try {
      await cliente(entorno.url).post("/api/auth/login", { email: "autoridad@prueba.edu.ar", password: "x" }, { "x-pais": "ar" });
      const r = await ultimo({ accion: "sesion.fallida" });
      assert.equal(r.ubicacion.sede, "Sede Central");
      assert.equal(r.ubicacion.pais, "AR");
    } finally {
      Object.assign(config.auditoria, original);
    }
  });
});

describe("filtros y paginación", () => {
  it("por integrante, por varias acciones, por módulo, por resultado y por texto", async () => {
    const idColab = entorno.usuarios.colab.id;
    const deColab = await auditoria({ usuario: idColab });
    assert.ok(deColab.total > 0 && deColab.registros.every((r) => r.usuario.id === idColab));

    const dos = await auditoria({ accion: "decision.aprobar,contenido.publicar" });
    assert.ok(dos.registros.length && dos.registros.every((r) => ["decision.aprobar", "contenido.publicar"].includes(r.accion)));

    const gob = await auditoria({ modulo: "Gobernanza" });
    assert.ok(gob.registros.every((r) => r.modulo === "Gobernanza"));
    const rechazados = await auditoria({ resultado: "rechazado" });
    assert.ok(rechazados.total >= 3 && rechazados.registros.every((r) => r.resultado === "rechazado"));

    const texto = await auditoria({ q: "becas de TRANSPORTE" });
    assert.ok(texto.total >= 5 && texto.registros.every((r) => /becas de transporte/i.test(r.detalle)));
    assert.equal((await auditoria({ q: "(.*)" })).total, 0, "el texto se busca literal, no como expresión regular");
  });

  it("por rango de fechas (día completo en hora argentina)", async () => {
    const hoy = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
    assert.ok((await auditoria({ desde: hoy, hasta: hoy })).total > 0);
    assert.equal((await auditoria({ desde: "2030-01-01" })).total, 0);
    assert.equal((await auditoria({ hasta: "2020-01-01" })).total, 0);
  });

  it("pagina del más reciente al más antiguo, sin repetir", async () => {
    await esperarPendientes();
    const p1 = (await admin.get("/api/auditoria?porPagina=10&pagina=1")).datos;
    const p2 = (await admin.get("/api/auditoria?porPagina=10&pagina=2")).datos;
    assert.equal(p1.registros.length, 10);
    assert.equal(p1.paginas, Math.ceil(p1.total / 10));
    assert.ok(Date.parse(p1.registros[9].fecha) >= Date.parse(p2.registros[0].fecha));
    assert.ok(!p2.registros.some((r) => p1.registros.some((x) => x.id === r.id)));
    assert.equal((await admin.get("/api/auditoria?porPagina=7")).datos.porPagina, 25, "solo tamaños permitidos");
  });

  it("rechaza filtros inválidos", async () => {
    for (const q of ["desde=ayer", "usuario=abc", "accion=borrar.todo", "modulo=Cocina", "resultado=quizas", "desde=2026-10-05&hasta=2026-10-01"]) {
      assert.equal((await admin.get(`/api/auditoria?${q}`)).estado, 400, q);
    }
    const inyeccion = await admin.get("/api/auditoria?usuario[$ne]=x");
    assert.equal(inyeccion.estado, 200, "un operador en la URL no llega a la consulta");
  });
});

describe("resumen, exportación y directorio", () => {
  it("resumen de la cabecera", async () => {
    await esperarPendientes();
    const r = (await admin.get("/api/auditoria/resumen")).datos;
    assert.ok(r.movimientosHoy > 0);
    assert.ok(r.integrantesActivosHoy >= 4);
    assert.ok(r.ingresosFallidos24h >= 3);
    assert.ok(r.accionesRechazadas7d >= 2);
  });

  it("exporta CSV con los mismos filtros, sin fórmulas peligrosas, y la exportación queda registrada", async () => {
    await colab.post("/api/borradores", { titulo: "=HYPERLINK(\"http://malo\")" });
    await esperarPendientes();
    const r = await admin.get("/api/auditoria/exportar?modulo=Borradores");
    assert.equal(r.estado, 200);
    assert.match(r.cabeceras.get("content-type"), /text\/csv/);
    assert.match(r.cabeceras.get("content-disposition"), /attachment; filename="auditoria-nexo-/);
    const csv = r.datos.toString("utf8");
    assert.ok(csv.startsWith("\uFEFF\"Fecha y hora (Argentina)\";\"Nombre\";\"Correo\";\"Rol\";\"Módulo\""));
    assert.ok(csv.includes("Creó el borrador «=HYPERLINK"), "el detalle no empieza con = (va dentro de una frase)");
    assert.ok(!/\n"=/.test(csv), "ninguna celda empieza con =");
    const filas = csv.trim().split("\r\n").length - 1;
    assert.equal(Number(r.cabeceras.get("x-total-registros")), filas);
    const exportacion = await ultimo({ accion: "auditoria.exportar" });
    assert.equal(exportacion.detalle, `Exportó la auditoría (${filas} registros, CSV)`);
  });

  it("directorio completo: activos y dados de baja, con contacto y actividad; nunca el hash", async () => {
    const baja = (await admin.post("/api/usuarios", { nombre: "Ex integrante", email: "ex@prueba.edu.ar", rol: "colaborador", password: "Clave-provisoria-1", telefono: "385 400-0000", area: "Archivo" })).datos;
    await admin.delete(`/api/usuarios/${baja.id}`);
    await esperarPendientes();
    const r = await admin.get("/api/directorio");
    assert.equal(r.estado, 200);
    const ex = r.datos.find((p) => p.email === "ex@prueba.edu.ar");
    assert.deepEqual([ex.estado, ex.telefono, ex.area, ex.rol], ["baja", "385 400-0000", "Archivo", "colaborador"]);
    const colabDir = r.datos.find((p) => p.email === "colab@prueba.edu.ar");
    assert.equal(colabDir.estado, "activo");
    assert.ok(colabDir.movimientos30d > 3 && colabDir.ultimoMovimiento);
    assert.ok(!JSON.stringify(r.datos).includes("passwordHash") && !JSON.stringify(r.datos).includes("$2"));
    assert.equal((await admin.get("/api/usuarios")).datos.length, r.datos.length - 1, "Equipo y roles sigue mostrando solo activos");
  });
});

describe("base de datos", () => {
  it("el esquema rechaza registros incompletos o con acciones fuera del catálogo", async () => {
    const col = await db.coleccion("auditoria");
    const valido = await col.findOne({ accion: "sesion.inicio" });
    await assert.rejects(col.insertOne({ ...valido, _id: new db.ObjectId(), accion: "borrar.todo" }), { code: 121 });
    const { ubicacion, ...sinUbicacion } = valido;
    await assert.rejects(col.insertOne({ ...sinUbicacion, _id: new db.ObjectId() }), { code: 121 });
  });

  it("está en una colección propia: los documentos de usuarios no crecen", async () => {
    const persona = await (await db.coleccion("usuarios")).findOne({ email: "colab@prueba.edu.ar" });
    assert.deepEqual(Object.keys(persona).sort(), ["_id", "activo", "area", "creadoEn", "email", "nombre", "passwordHash", "rol", "telefono", "ultimoAcceso"]);
  });
});
