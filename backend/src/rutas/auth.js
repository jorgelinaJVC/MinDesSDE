"use strict";

const { Router } = require("express");
const auth = require("../auth");

const router = Router();

// Devuelve la sesión actual; sin sesión responde { usuario: null } (no es un error).
router.get("/sesion", (req, res) => {
  res.json({ usuario: req.usuario });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const { usuario, token } = await auth.iniciarSesion(
    typeof email === "string" ? email : "",
    typeof password === "string" ? password : "",
    req.ip
  );
  res.setHeader("Set-Cookie", auth.cookieSesion(token));
  res.json({ usuario });
});

// La persona cambia su propia contraseña: { actual, nueva }. Mantiene esta sesión y cierra las demás.
router.post("/cambiar-clave", auth.requerirSesion, async (req, res) => {
  const { actual, nueva } = req.body || {};
  res.json({ usuario: await auth.cambiarClave(req.usuario, req.token, actual, nueva, req.ip) });
});

router.post("/logout", async (req, res) => {
  await auth.cerrarSesion(req.token);
  res.setHeader("Set-Cookie", auth.cookieVencida());
  res.json({ ok: true });
});

module.exports = router;
