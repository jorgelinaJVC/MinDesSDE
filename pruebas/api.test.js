"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { iniciar, cliente, ingresarComo, datosContenido, db, PASSWORD } = require("./ayudas");
const auth = require("../backend/src/auth");

let entorno;
let admin, director, director2, autoridad, colab, obs;

before(async () => {
  entorno = await iniciar();
  [admin, director, director2, autoridad, colab, obs] = await Promise.all(
    ["admin", "director", "director2", "autoridad", "colab", "obs"].map((clave) => ingresarComo(entorno.url, clave))
  );
});

after(() => entorno.cerrar());

/** El colaborador carga un contenido y devuelve lo que responde la API. */
async function cargar(extra) {
  const r = await colab.post("/api/contenidos", datosContenido(extra));
  assert.equal(r.estado, 201, JSON.stringify(r.datos));
  return r.datos;
}

/** Nivel 2: el director lo eleva a la autoridad superior. */
async function elevar(contenido) {
  const r = await director.post(`/api/contenidos/${contenido.id}/revision`, { decision: "elevar" });
  assert.equal(r.estado, 200, JSON.stringify(r.datos));
  return r.datos;
}

/** Niveles 2 y 3: el director lo eleva y la autoridad superior lo aprueba (sin publicar). */
async function aprobar(contenido) {
  await elevar(contenido);
  const r = await autoridad.post(`/api/contenidos/${contenido.id}/decision`, { decision: "aprobar" });
  assert.equal(r.estado, 200, JSON.stringify(r.datos));
  return r.datos;
}

describe("autenticación", () => {
  it("rechaza contraseña incorrecta con un mensaje genérico", async () => {
    const r = await cliente(entorno.url).ingresar("admin", "otra-clave-larga");
    assert.equal(r.estado, 401);
    assert.equal(r.datos.error.codigo, "credenciales");
    assert.equal(r.datos.error.mensaje, "Correo o contraseña incorrectos.");
  });

  it("no revela si un correo existe", async () => {
    const r = await cliente(entorno.url).pedir("POST", "/api/auth/login", { email: "nadie@prueba.edu.ar", password: PASSWORD });
    assert.equal(r.estado, 401);
    assert.equal(r.datos.error.mensaje, "Correo o contraseña incorrectos.");
  });

  it("inicia sesión con una cookie HttpOnly y SameSite", async () => {
    const c = cliente(entorno.url);
    const r = await c.ingresar("colab");
    assert.equal(r.estado, 200);
    assert.equal(r.datos.usuario.rol, "colaborador");
    assert.equal(r.datos.usuario.password_hash, undefined);
    const cookie = r.cabeceras.getSetCookie()[0];
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
  });

  it("GET /auth/sesion devuelve el usuario o null", async () => {
    const anonimo = await cliente(entorno.url).get("/api/auth/sesion");
    assert.equal(anonimo.estado, 200);
    assert.equal(anonimo.datos.usuario, null);
    const propio = await admin.get("/api/auth/sesion");
    assert.equal(propio.datos.usuario.email, "admin@prueba.edu.ar");
  });

  it("exige sesión para todo lo interno", async () => {
    const anonimo = cliente(entorno.url);
    for (const ruta of ["/api/contenidos", "/api/usuarios", "/api/adjuntos/1"]) {
      const r = await anonimo.get(ruta);
      assert.equal(r.estado, 401, ruta);
      assert.equal(r.datos.error.codigo, "sin_sesion");
    }
  });

  it("cerrar sesión invalida la cookie", async () => {
    const c = await ingresarComo(entorno.url, "obs");
    const cookieVieja = c.cookie;
    assert.equal((await c.get("/api/contenidos")).estado, 200);
    await c.post("/api/auth/logout");
    const reutilizada = cliente(entorno.url);
    reutilizada.cookie = cookieVieja;
    assert.equal((await reutilizada.get("/api/contenidos")).estado, 401);
  });

  it("una sesión vencida deja de valer", async () => {
    const c = await ingresarComo(entorno.url, "obs");
    await (await db.coleccion("sesiones")).updateMany({}, { $set: { expiraEn: new Date(Date.now() - 60 * 1000) } });
    assert.equal((await c.get("/api/contenidos")).estado, 401);
    // las demás sesiones de la prueba también quedaron vencidas: se vuelven a abrir
    [admin, director, director2, autoridad, colab, obs] = await Promise.all(
      ["admin", "director", "director2", "autoridad", "colab", "obs"].map((clave) => ingresarComo(entorno.url, clave))
    );
  });

  it("limita los intentos fallidos de inicio de sesión", async () => {
    auth.reiniciarLimites();
    const c = cliente(entorno.url);
    for (let i = 0; i < 5; i += 1) assert.equal((await c.ingresar("obs", "incorrecta-larga-1")).estado, 401);
    const bloqueado = await c.ingresar("obs");
    assert.equal(bloqueado.estado, 429, "incluso con la clave correcta, mientras dura el bloqueo");
    auth.reiniciarLimites();
  });

  it("rechaza pedidos que modifican datos desde otro origen (CSRF)", async () => {
    const r = await admin.post("/api/contenidos", datosContenido(), { origin: "http://sitio-malicioso.example" });
    assert.equal(r.estado, 403);
    assert.equal(r.datos.error.codigo, "origen_invalido");
  });

  it("no expone hashes de contraseña en el listado de usuarios", async () => {
    const r = await admin.get("/api/usuarios");
    assert.equal(r.estado, 200);
    assert.equal(r.datos.length, 6);
    assert.ok(!JSON.stringify(r.datos).includes("password"));
    assert.ok(r.datos.every((u) => typeof u.id === "string"));
  });
});

describe("roles y permisos", () => {
  it("el observador solo consulta", async () => {
    assert.equal((await obs.get("/api/contenidos")).estado, 200);
    const r = await obs.post("/api/contenidos", datosContenido());
    assert.equal(r.estado, 403);
    assert.equal((await obs.patch("/api/usuarios/1/rol", { rol: "administrador" })).estado, 403);
  });

  it("el colaborador carga pero no revisa, decide, publica ni cambia roles", async () => {
    const c = await cargar();
    assert.equal((await colab.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" })).estado, 403);
    assert.equal((await colab.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" })).estado, 403);
    assert.equal((await colab.post(`/api/contenidos/${c.id}/publicar`)).estado, 403);
    assert.equal((await colab.patch(`/api/usuarios/${c.autorId}/rol`, { rol: "administrador" })).estado, 403);
  });

  it("el director no revisa lo que cargó él mismo: lo revisa otro director o el administrador", async () => {
    const propio = (await director.post("/api/contenidos", datosContenido())).datos;
    const intento = await director.post(`/api/contenidos/${propio.id}/revision`, { decision: "elevar" });
    assert.equal(intento.estado, 403);
    assert.match(intento.datos.error.mensaje, /cargaste o editaste vos/);
    const porAdmin = await admin.post(`/api/contenidos/${propio.id}/revision`, { decision: "elevar" });
    assert.equal(porAdmin.estado, 200);
    assert.equal(porAdmin.datos.estado, "elevado");
    const otro = (await director.post("/api/contenidos", datosContenido())).datos;
    assert.equal((await director2.post(`/api/contenidos/${otro.id}/revision`, { decision: "elevar" })).datos.estado, "elevado");
  });

  it("el administrador aprueba y devuelve, pero no decide sobre lo que él mismo elevó ni revisa lo propio", async () => {
    const c = (await colab.post("/api/contenidos", datosContenido())).datos;
    await admin.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" });
    const propia = await admin.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" });
    assert.equal(propia.estado, 403);
    assert.match(propia.datos.error.mensaje, /Elevaste vos esta versión/);
    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" })).datos.estado, "publicado");

    const d = (await colab.post("/api/contenidos", datosContenido())).datos;
    await director.post(`/api/contenidos/${d.id}/revision`, { decision: "elevar" });
    const aprobado = await admin.post(`/api/contenidos/${d.id}/decision`, { decision: "aprobar" });
    assert.equal(aprobado.estado, 200);
    assert.equal(aprobado.datos.estado, "publicado", "aprobar publica en el acto");

    const e = (await colab.post("/api/contenidos", datosContenido())).datos;
    await director.post(`/api/contenidos/${e.id}/revision`, { decision: "elevar" });
    const devuelto = await admin.post(`/api/contenidos/${e.id}/decision`, { decision: "devolver", comentario: "Falta la fecha." });
    assert.equal(devuelto.datos.estado, "devuelto");
    assert.deepEqual(devuelto.datos.observaciones.map((o) => [o.nivel, o.rol]), [["autoridad", "administrador"]]);

    const propio = (await admin.post("/api/contenidos", datosContenido())).datos;
    assert.equal((await admin.post(`/api/contenidos/${propio.id}/revision`, { decision: "elevar" })).estado, 403, "no revisa lo propio");
  });

  it("solo el administrador cambia roles y siempre queda uno", async () => {
    const usuarios = (await admin.get("/api/usuarios")).datos;
    const idObs = usuarios.find((u) => u.email === "obs@prueba.edu.ar").id;
    const idAdmin = usuarios.find((u) => u.email === "admin@prueba.edu.ar").id;

    assert.equal((await director.patch(`/api/usuarios/${idObs}/rol`, { rol: "colaborador" })).estado, 403);

    const cambio = await admin.patch(`/api/usuarios/${idObs}/rol`, { rol: "colaborador" });
    assert.equal(cambio.estado, 200);
    assert.equal(cambio.datos.rol, "colaborador");
    await admin.patch(`/api/usuarios/${idObs}/rol`, { rol: "observador" });

    const ultimo = await admin.patch(`/api/usuarios/${idAdmin}/rol`, { rol: "observador" });
    assert.equal(ultimo.estado, 409);
    assert.match(ultimo.datos.error.mensaje, /al menos un administrador/);

    assert.equal((await admin.patch(`/api/usuarios/${idObs}/rol`, { rol: "superusuario" })).estado, 400);
    assert.equal((await admin.patch("/api/usuarios/99999/rol", { rol: "director" })).estado, 404);
  });

  it("el cambio de rol se aplica de inmediato en los permisos", async () => {
    const usuarios = (await admin.get("/api/usuarios")).datos;
    const idObs = usuarios.find((u) => u.email === "obs@prueba.edu.ar").id;
    await admin.patch(`/api/usuarios/${idObs}/rol`, { rol: "colaborador" });
    assert.equal((await obs.post("/api/contenidos", datosContenido())).estado, 201);
    await admin.patch(`/api/usuarios/${idObs}/rol`, { rol: "observador" });
    assert.equal((await obs.post("/api/contenidos", datosContenido())).estado, 403);
  });
});

describe("gestión del equipo", () => {
  const nueva = { nombre: "Lucía Paz", email: "Lucia.Paz@Prueba.edu.ar", rol: "colaborador", password: "Clave-provisoria-1" };
  const idPorCorreo = async (correo) => (await admin.get("/api/usuarios")).datos.find((u) => u.email === correo)?.id;

  it("solo el administrador agrega, edita y da de baja", async () => {
    assert.equal((await director.post("/api/usuarios", nueva)).estado, 403);
    const idObs = await idPorCorreo("obs@prueba.edu.ar");
    assert.equal((await colab.patch(`/api/usuarios/${idObs}`, { nombre: "X", email: "x@prueba.edu.ar" })).estado, 403);
    assert.equal((await obs.delete(`/api/usuarios/${idObs}`)).estado, 403);
  });

  it("alta con rol inicial: la persona puede ingresar con su contraseña provisional", async () => {
    const r = await admin.post("/api/usuarios", nueva);
    assert.equal(r.estado, 201);
    assert.equal(r.datos.email, "lucia.paz@prueba.edu.ar");
    assert.equal(r.datos.rol, "colaborador");
    assert.equal(r.datos.ultimoAcceso, null);
    assert.ok(!JSON.stringify(r.datos).includes("password"));
    assert.equal((await admin.post("/api/usuarios", nueva)).estado, 400, "correo repetido");
    assert.equal((await admin.post("/api/usuarios", { ...nueva, email: "otra@prueba.edu.ar", password: "corta" })).estado, 400);
    assert.equal((await admin.post("/api/usuarios", { ...nueva, email: "otra@prueba.edu.ar", rol: "superusuario" })).estado, 400);
    assert.equal((await admin.post("/api/usuarios", { ...nueva, email: { $ne: null } })).estado, 400, "sin operadores de MongoDB");

    assert.equal(r.datos.debeCambiarClave, true, "la contraseña que pone el administrador es provisional");

    const lucia = cliente(entorno.url);
    const ingreso = await lucia.post("/api/auth/login", { email: nueva.email, password: nueva.password });
    assert.equal(ingreso.estado, 200);
    assert.equal(ingreso.datos.usuario.debeCambiarClave, true);
  });

  it("con contraseña provisional no puede usar el panel hasta cambiarla por una propia", async () => {
    const lucia = cliente(entorno.url);
    await lucia.post("/api/auth/login", { email: nueva.email, password: nueva.password });
    const bloqueado = await lucia.get("/api/contenidos");
    assert.equal(bloqueado.estado, 403);
    assert.equal(bloqueado.datos.error.codigo, "clave_provisional");
    assert.equal((await lucia.post("/api/contenidos", datosContenido())).estado, 403);
    assert.equal((await lucia.get("/api/auth/sesion")).estado, 200, "puede ver su sesión");

    const cambio = await lucia.post("/api/auth/cambiar-clave", { actual: nueva.password, nueva: "Clave-propia-de-Lucia" });
    assert.equal(cambio.estado, 200);
    assert.equal(cambio.datos.usuario.debeCambiarClave, false);
    assert.equal((await lucia.get("/api/contenidos")).estado, 200, "ya puede trabajar, sin volver a ingresar");
    nueva.password = "Clave-propia-de-Lucia";
  });

  it("edición de nombre y correo, y restablecer contraseña cierra sus sesiones", async () => {
    const id = await idPorCorreo("lucia.paz@prueba.edu.ar");
    const lucia = cliente(entorno.url);
    await lucia.post("/api/auth/login", { email: nueva.email, password: nueva.password });
    assert.equal((await lucia.get("/api/contenidos")).estado, 200);

    const r = await admin.patch(`/api/usuarios/${id}`, { nombre: "Lucía B. Paz", email: "lbpaz@prueba.edu.ar" });
    assert.equal(r.estado, 200);
    assert.equal(r.datos.nombre, "Lucía B. Paz");
    assert.equal((await admin.patch(`/api/usuarios/${id}`, { nombre: "Lucía", email: "obs@prueba.edu.ar" })).estado, 400, "correo ajeno");
    assert.equal((await lucia.get("/api/contenidos")).estado, 200, "sin cambio de clave, la sesión sigue");

    assert.equal((await admin.patch(`/api/usuarios/${id}`, { nombre: "Lucía B. Paz", email: "lbpaz@prueba.edu.ar", password: "Otra-clave-segura" })).estado, 200);
    assert.equal((await lucia.get("/api/contenidos")).estado, 401, "la sesión anterior se cerró");
    const reingreso = await cliente(entorno.url).post("/api/auth/login", { email: "lbpaz@prueba.edu.ar", password: "Otra-clave-segura" });
    assert.equal(reingreso.estado, 200);
    assert.equal(reingreso.datos.usuario.debeCambiarClave, true, "la contraseña restablecida también es provisional");
  });

  it("baja lógica: no ingresa, sale del listado, se conserva en la base y se puede reactivar", async () => {
    const id = await idPorCorreo("lbpaz@prueba.edu.ar");
    const lucia = cliente(entorno.url);
    await lucia.post("/api/auth/login", { email: "lbpaz@prueba.edu.ar", password: "Otra-clave-segura" });

    assert.equal((await admin.delete(`/api/usuarios/${id}`)).estado, 200);
    assert.equal(await idPorCorreo("lbpaz@prueba.edu.ar"), undefined);
    assert.equal((await lucia.get("/api/contenidos")).estado, 401, "sus sesiones se cierran");
    assert.equal((await cliente(entorno.url).post("/api/auth/login", { email: "lbpaz@prueba.edu.ar", password: "Otra-clave-segura" })).estado, 401);
    const enBd = await (await db.coleccion("usuarios")).findOne({ email: "lbpaz@prueba.edu.ar" });
    assert.equal(enBd.activo, false);
    assert.equal((await admin.delete(`/api/usuarios/${id}`)).estado, 404);

    const r = await admin.post("/api/usuarios", { nombre: "Lucía Paz", email: "lbpaz@prueba.edu.ar", rol: "observador", password: "Clave-de-regreso-1" });
    assert.equal(r.estado, 201);
    assert.equal(r.datos.id, id, "conserva el id");
    assert.equal(r.datos.reactivado, true);
    await admin.delete(`/api/usuarios/${id}`);
  });

  it("no se puede dar de baja a uno mismo ni al último administrador", async () => {
    const idAdmin = await idPorCorreo("admin@prueba.edu.ar");
    const propia = await admin.delete(`/api/usuarios/${idAdmin}`);
    assert.equal(propia.estado, 409);
    assert.match(propia.datos.error.mensaje, /vos mismo/);
    assert.equal((await admin.delete("/api/usuarios/99999")).estado, 404);
  });
});

describe("cambiar la propia contraseña", () => {
  const OTRA = "Clave-nueva-del-director";

  it("requiere sesión, la contraseña actual correcta y una nueva válida y distinta", async () => {
    assert.equal((await cliente(entorno.url).post("/api/auth/cambiar-clave", { actual: PASSWORD, nueva: OTRA })).estado, 401);
    const mal = await director.post("/api/auth/cambiar-clave", { actual: "incorrecta", nueva: OTRA });
    assert.equal(mal.estado, 400);
    assert.match(mal.datos.error.mensaje, /actual no es correcta/);
    assert.equal((await director.post("/api/auth/cambiar-clave", { actual: PASSWORD, nueva: "corta" })).estado, 400);
    assert.equal((await director.post("/api/auth/cambiar-clave", { actual: PASSWORD, nueva: PASSWORD })).estado, 400, "igual a la actual");
    assert.equal((await director.post("/api/auth/cambiar-clave", { actual: { $ne: null }, nueva: OTRA })).estado, 400, "sin operadores");
  });

  it("mantiene la sesión actual, cierra las otras y la contraseña anterior deja de servir", async () => {
    const otraCompu = cliente(entorno.url);
    await otraCompu.post("/api/auth/login", { email: "director@prueba.edu.ar", password: PASSWORD });
    assert.equal((await otraCompu.get("/api/contenidos")).estado, 200);

    assert.equal((await director.post("/api/auth/cambiar-clave", { actual: PASSWORD, nueva: OTRA })).estado, 200);
    assert.equal((await director.get("/api/contenidos")).estado, 200, "esta sesión sigue");
    assert.equal((await otraCompu.get("/api/contenidos")).estado, 401, "la otra sesión se cerró");
    assert.equal((await cliente(entorno.url).post("/api/auth/login", { email: "director@prueba.edu.ar", password: PASSWORD })).estado, 401);
    assert.equal((await cliente(entorno.url).post("/api/auth/login", { email: "director@prueba.edu.ar", password: OTRA })).estado, 200);

    // se deja como estaba para el resto de las pruebas
    assert.equal((await director.post("/api/auth/cambiar-clave", { actual: OTRA, nueva: PASSWORD })).estado, 200);
  });

  it("bloquea después de varios intentos con la contraseña actual equivocada", async () => {
    let ultimo;
    for (let i = 0; i < 6; i += 1) ultimo = await colab.post("/api/auth/cambiar-clave", { actual: "equivocada", nueva: OTRA });
    assert.equal(ultimo.estado, 429);
  });
});

describe("circuito editorial", () => {
  it("un contenido nuevo queda en revisión como versión 1 y registra el envío", async () => {
    const c = await cargar();
    assert.equal(c.estado, "en_revision");
    assert.equal(c.versiones.length, 1);
    assert.equal(c.versiones[0].numero, 1);
    assert.equal(c.historial[0].tipo, "envio");
    assert.equal(c.publicada, null);
  });

  it("valida los datos y rechaza identificadores repetidos", async () => {
    assert.equal((await colab.post("/api/contenidos", datosContenido({ titulo: "" }))).estado, 400);
    assert.equal((await colab.post("/api/contenidos", datosContenido({ slug: "Con Espacios" }))).estado, 400);
    assert.equal((await colab.post("/api/contenidos", datosContenido({ resumen: "x".repeat(281) }))).estado, 400);
    const primero = await cargar();
    const repetido = await colab.post("/api/contenidos", datosContenido({ slug: primero.slug }));
    assert.equal(repetido.estado, 409);
    assert.equal(repetido.datos.error.codigo, "slug_duplicado");
  });

  it("devolver exige un comentario, que queda visible para el autor", async () => {
    const c = await cargar();
    const sin = await director.post(`/api/contenidos/${c.id}/revision`, { decision: "devolver", comentario: "  " });
    assert.equal(sin.estado, 400);

    const r = await director.post(`/api/contenidos/${c.id}/revision`, { decision: "devolver", comentario: "Falta la fecha de cierre." });
    assert.equal(r.estado, 200);
    assert.equal(r.datos.estado, "devuelto");
    assert.equal(r.datos.versiones[0].estado, "devuelta");
    assert.equal(r.datos.versiones[0].revision.comentario, "Falta la fecha de cierre.");
    assert.equal(r.datos.versiones[0].decision, null, "la autoridad superior todavía no intervino");
  });

  it("reenvían el autor, un director o el administrador (no un observador); la versión devuelta queda conservada", async () => {
    const c = await cargar();
    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "devolver", comentario: "Ajustar." });

    const cambio = { ...datosContenido({ cuerpo: "Texto corregido." }), slug: undefined };
    assert.equal((await obs.post(`/api/contenidos/${c.id}/versiones`, cambio)).estado, 403);

    const r = await colab.post(`/api/contenidos/${c.id}/versiones`, cambio);
    assert.equal(r.estado, 201);
    assert.equal(r.datos.estado, "en_revision");
    assert.equal(r.datos.versiones.length, 2);
    assert.equal(r.datos.versiones[0].estado, "conservada");
    assert.equal(r.datos.versiones[0].cuerpo, "Texto completo del contenido.", "la versión anterior no se reescribe");
    assert.equal(r.datos.versiones[1].cuerpo, "Texto corregido.");
  });

  it("aprobar publica en el acto, en los sitios elegidos (sin paso intermedio)", async () => {
    const c = await cargar();
    let publico = await cliente(entorno.url).get("/api/publico/sitios/adultos-mayores/publicaciones");
    assert.ok(!publico.datos.some((p) => p.slug === c.slug), "en revisión no es público");

    const aprobado = await aprobar(c);
    assert.equal(aprobado.estado, "publicado");
    assert.equal(aprobado.publicada.version, 1);
    assert.deepEqual(aprobado.publicada.sitios, ["adultos-mayores"]);

    publico = await cliente(entorno.url).get("/api/publico/sitios/adultos-mayores/publicaciones");
    assert.ok(publico.datos.some((p) => p.slug === c.slug));
    // ya está publicado: no hay nada más que publicar
    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/publicar`)).estado, 409);
  });

  it("no se puede publicar algo que no está aprobado, ni decidir dos veces", async () => {
    const c = await cargar();
    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/publicar`)).estado, 409);
    await aprobar(c);
    const segunda = await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "devolver", comentario: "tarde" });
    assert.equal(segunda.estado, 409);
    assert.equal((await director.post(`/api/contenidos/${c.id}/revision`, { decision: "devolver", comentario: "tarde" })).estado, 409);
  });

  it("dos decisiones simultáneas: solo una gana", async () => {
    const c = await cargar();
    const [a, b] = await Promise.all([
      director2.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" }),
      director.post(`/api/contenidos/${c.id}/revision`, { decision: "devolver", comentario: "Otra opinión." }),
    ]);
    assert.deepEqual([a.estado, b.estado].sort(), [200, 409]);
    const lista = (await admin.get("/api/contenidos")).datos;
    const final = lista.find((x) => x.id === c.id);
    assert.equal(final.historial.filter((e) => ["elevacion", "devolucion"].includes(e.tipo)).length, 1);
  });

  it("una nueva versión de algo publicado no retira la publicada hasta aprobarse", async () => {
    const c = await cargar({ titulo: "Versión uno" });
    await aprobar(c);

    const v2 = await colab.post(`/api/contenidos/${c.id}/versiones`, { ...datosContenido({ titulo: "Versión dos" }), slug: undefined });
    assert.equal(v2.estado, 201);
    assert.equal(v2.datos.estado, "en_revision");

    let publica = (await cliente(entorno.url).get(`/api/publico/sitios/adultos-mayores/publicaciones/${c.slug}`)).datos;
    assert.equal(publica.titulo, "Versión uno", "sigue visible la versión anterior");

    await aprobar(c);
    publica = (await cliente(entorno.url).get(`/api/publico/sitios/adultos-mayores/publicaciones/${c.slug}`)).datos;
    assert.equal(publica.titulo, "Versión dos");

    const completo = (await admin.get("/api/contenidos")).datos.find((x) => x.id === c.id);
    assert.deepEqual(completo.versiones.map((v) => v.estado), ["reemplazada", "publicada"]);
  });

  it("archivar oculta del público sin borrar nada; restaurar no republica solo", async () => {
    const c = await cargar();
    await aprobar(c);

    const archivado = await autoridad.post(`/api/contenidos/${c.id}/archivar`, { motivo: "Convocatoria vencida" });
    assert.equal(archivado.estado, 200);
    assert.equal(archivado.datos.estado, "archivado");
    assert.equal(archivado.datos.versiones.length, 1, "las versiones se conservan");
    assert.equal(archivado.datos.historial.at(-1).comentario, "Convocatoria vencida");
    assert.equal((await cliente(entorno.url).get(`/api/publico/sitios/adultos-mayores/publicaciones/${c.slug}`)).estado, 404);

    const restaurado = await autoridad.post(`/api/contenidos/${c.id}/restaurar`);
    assert.equal(restaurado.estado, 200);
    assert.equal(restaurado.datos.estado, "aprobado");
    assert.equal((await cliente(entorno.url).get(`/api/publico/sitios/adultos-mayores/publicaciones/${c.slug}`)).estado, 404, "hay que publicar de nuevo");
    assert.equal((await director.post(`/api/contenidos/${c.id}/publicar`)).estado, 403, "solo la autoridad superior");
    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/publicar`)).estado, 200);
    assert.equal((await cliente(entorno.url).get(`/api/publico/sitios/adultos-mayores/publicaciones/${c.slug}`)).estado, 200);
  });

  it("el historial completo queda registrado en orden", async () => {
    const c = await cargar();
    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "devolver", comentario: "Ajustar." });
    await colab.post(`/api/contenidos/${c.id}/versiones`, { ...datosContenido(), slug: undefined });
    await aprobar(c);
    const final = (await admin.get("/api/contenidos")).datos.find((x) => x.id === c.id);
    assert.deepEqual(final.historial.map((e) => e.tipo), ["envio", "devolucion", "envio", "elevacion", "aprobacion", "publicacion"]);
    assert.deepEqual(final.historial.map((e) => e.version), [1, 1, 2, 2, 2, 2]);
  });

  it("responde 404 para contenidos inexistentes o ids inválidos", async () => {
    assert.equal((await autoridad.post("/api/contenidos/999999/publicar")).estado, 404);
    assert.equal((await autoridad.post("/api/contenidos/abc/publicar")).estado, 404);
  });

  it("una nueva versión con adjuntos inexistentes falla sin dejar nada a medias", async () => {
    const c = await cargar();
    await director.post(`/api/contenidos/${c.id}/revision`, { decision: "devolver", comentario: "Ajustar." });
    const envio = new FormData();
    envio.append("datos", JSON.stringify({ ...datosContenido(), slug: undefined, conservar: [999999] }));
    const r = await colab.post(`/api/contenidos/${c.id}/versiones`, envio);
    assert.equal(r.estado, 400);
    const final = (await admin.get("/api/contenidos")).datos.find((x) => x.id === c.id);
    assert.equal(final.versiones.length, 1);
    assert.equal(final.versiones[0].estado, "devuelta", "la transacción se revirtió por completo");
  });
});

describe("cadena de aprobación de tres niveles", () => {
  it("solo la autoridad superior y el administrador aprueban y publican (el middleware corta antes de buscar el contenido)", async () => {
    const c = await cargar();
    for (const quien of [director, colab, obs]) {
      for (const [ruta, cuerpo] of [["decision", { decision: "aprobar" }], ["publicar", {}]]) {
        const r = await quien.post(`/api/contenidos/${c.id}/${ruta}`, cuerpo);
        assert.equal(r.estado, 403, `${ruta} debería ser 403`);
      }
    }
    // incluso con un id inexistente responde 403 (no revela si existe)
    assert.equal((await director.post("/api/contenidos/aaaaaaaaaaaaaaaaaaaaaaaa/publicar")).estado, 403);
    const r = await director.post(`/api/contenidos/${c.id}/publicar`);
    assert.match(r.datos.error.mensaje, /autoridad superior o el administrador/);
  });

  it("la autoridad superior no hace la revisión de dirección ni decide lo que no fue elevado", async () => {
    const c = await cargar();
    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/revision`, { decision: "elevar" })).estado, 403);
    const salto = await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" });
    assert.equal(salto.estado, 409);
    assert.match(salto.datos.error.mensaje, /director de área/);
  });

  it("el director solo eleva o devuelve: no existe 'aprobar' en su instancia", async () => {
    const c = await cargar();
    assert.equal((await director.post(`/api/contenidos/${c.id}/revision`, { decision: "aprobar" })).estado, 400);
    const elevado = await elevar(c);
    assert.equal(elevado.estado, "elevado");
    assert.equal(elevado.versiones[0].estado, "elevada");
    assert.equal(elevado.versiones[0].revision.tipo, "elevacion");
    assert.equal(elevado.versiones[0].revision.usuarioId, entorno.usuarios.director.id);
    assert.equal((await cliente(entorno.url).get(`/api/publico/sitios/adultos-mayores/publicaciones/${c.slug}`)).estado, 404, "elevado no es público");
  });

  it("cada versión registra quién revisó y quién decidió", async () => {
    const c = await cargar();
    const final = await aprobar(c);
    const v = final.versiones[0];
    assert.equal(v.revision.usuarioId, entorno.usuarios.director.id);
    assert.equal(v.decision.usuarioId, entorno.usuarios.autoridad.id);
    assert.equal(v.decision.tipo, "aprobacion");
  });

  it("la autoridad devuelve: el autor reenvía y vuelve a empezar por la revisión de dirección", async () => {
    const c = await cargar();
    await elevar(c);
    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "devolver" })).estado, 400, "exige comentario");
    const devuelto = await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "devolver", comentario: "Sumar fechas." });
    assert.equal(devuelto.datos.estado, "devuelto");
    assert.equal(devuelto.datos.versiones[0].decision.tipo, "devolucion");

    const v2 = await colab.post(`/api/contenidos/${c.id}/versiones`, { ...datosContenido(), slug: undefined });
    assert.equal(v2.datos.estado, "en_revision");
    assert.equal(v2.datos.versiones[1].revision, null);
    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "aprobar" })).estado, 409);
  });

  it("rechazar es definitivo: exige motivo, no admite nuevas versiones y se puede archivar", async () => {
    const c = await cargar();
    await elevar(c);
    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "rechazar", comentario: " " })).estado, 400);
    const r = await autoridad.post(`/api/contenidos/${c.id}/decision`, { decision: "rechazar", comentario: "No corresponde." });
    assert.equal(r.estado, 200);
    assert.equal(r.datos.estado, "rechazado");
    assert.equal(r.datos.versiones[0].estado, "rechazada");
    assert.equal(r.datos.historial.at(-1).tipo, "rechazo");

    const insistir = await colab.post(`/api/contenidos/${c.id}/versiones`, { ...datosContenido(), slug: undefined });
    assert.equal(insistir.estado, 409);
    assert.match(insistir.datos.error.mensaje, /rechazado/);
    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/publicar`)).estado, 409);

    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/archivar`, { motivo: "Limpieza" })).datos.estado, "archivado");
    assert.equal((await autoridad.post(`/api/contenidos/${c.id}/restaurar`)).datos.estado, "rechazado", "restaurar no lo reabre");
  });

  it("siempre queda al menos una autoridad superior", async () => {
    const usuarios = (await admin.get("/api/usuarios")).datos;
    const idAutoridad = usuarios.find((u) => u.rol === "autoridad").id;
    const cambio = await admin.patch(`/api/usuarios/${idAutoridad}/rol`, { rol: "director" });
    assert.equal(cambio.estado, 409);
    assert.match(cambio.datos.error.mensaje, /autoridad superior/);
    assert.equal((await admin.delete(`/api/usuarios/${idAutoridad}`)).estado, 409);

    // con una segunda autoridad, sí se puede cambiar a la primera
    const idObs = usuarios.find((u) => u.email === "obs@prueba.edu.ar").id;
    await admin.patch(`/api/usuarios/${idObs}/rol`, { rol: "autoridad" });
    assert.equal((await admin.patch(`/api/usuarios/${idAutoridad}/rol`, { rol: "director" })).estado, 200);
    assert.equal((await admin.patch(`/api/usuarios/${idAutoridad}/rol`, { rol: "autoridad" })).estado, 200);
    await admin.patch(`/api/usuarios/${idObs}/rol`, { rol: "observador" });
  });
});

describe("vista pública", () => {

  it("no expone autores, historial, correos ni contenido sin publicar", async () => {
    const c = await cargar({ titulo: "Sin publicar todavía" });
    const c2 = await cargar({ titulo: "Ya publicado" });
    await aprobar(c2);

    const r = await cliente(entorno.url).get("/api/publico/sitios/adultos-mayores/publicaciones");
    assert.equal(r.estado, 200);
    const texto = JSON.stringify(r.datos);
    assert.ok(texto.includes("Ya publicado"));
    assert.ok(!texto.includes("Sin publicar todavía"));
    for (const prohibido of ["autorId", "historial", "usuarioId", "@prueba.edu.ar", "estado"]) {
      assert.ok(!texto.includes(prohibido), `no debe aparecer "${prohibido}"`);
    }
    assert.deepEqual(Object.keys(r.datos[0]).sort(), ["adjuntos", "cuerpo", "cuerpoHtml", "documentos", "fecha", "imagenes", "resumen", "seccion", "sitios", "slug", "tipo", "titulo", "urgente", "urgenteHasta"]);
    for (const interno of ["motivo", "marcadoPor", "marcadoEn"]) assert.ok(!texto.includes(interno), `no debe aparecer "${interno}"`);
    assert.equal(typeof c.id, "string");
  });

  it("responde 404 si la publicación no existe", async () => {
    const r = await cliente(entorno.url).get("/api/publico/sitios/adultos-mayores/publicaciones/no-existe");
    assert.equal(r.estado, 404);
  });

  it("ordena de la más reciente a la más antigua", async () => {
    const lista = (await cliente(entorno.url).get("/api/publico/sitios/adultos-mayores/publicaciones")).datos;
    const fechas = lista.map((p) => new Date(p.fecha).getTime());
    assert.deepEqual(fechas, [...fechas].sort((a, b) => b - a));
  });
});

describe("servidor", () => {
  it("entrega su propio config.js en modo servidor y el frontend estático", async () => {
    const config = await cliente(entorno.url).get("/js/config.js");
    assert.equal(config.estado, 200);
    assert.match(config.datos.toString(), /modo: "servidor"/);
    const portada = await cliente(entorno.url).get("/");
    assert.equal(portada.estado, 200);
    assert.match(portada.datos.toString(), /Portal interno/);
  });

  it("envía cabeceras de seguridad y no revela el framework", async () => {
    const r = await cliente(entorno.url).get("/api/salud");
    assert.equal(r.cabeceras.get("x-content-type-options"), "nosniff");
    assert.equal(r.cabeceras.get("x-powered-by"), null);
    assert.ok(r.cabeceras.get("content-security-policy").includes("default-src 'self'"));
  });

  it("responde 400 ante JSON mal formado", async () => {
    const respuesta = await fetch(`${entorno.url}/api/auth/login`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "{no es json",
    });
    assert.equal(respuesta.status, 400);
  });
});
