"use strict";

const express = require("express");
const helmet = require("helmet");
const multer = require("multer");
const config = require("./config");
const auth = require("./auth");
const { ErrorApp } = require("./errores");

const rutasAuth = require("./rutas/auth");
const rutasPublico = require("./rutas/publico");
const rutasContenidos = require("./rutas/contenidos");
const rutasBorradores = require("./rutas/borradores");
const rutasAuditoria = require("./rutas/auditoria");
const { auditar } = require("./auditoria/registro");

const MENSAJES_MULTER = {
  LIMIT_FILE_SIZE: "Un archivo supera el máximo de 10 MB.",
  LIMIT_FILE_COUNT: "Se permiten hasta 8 adjuntos por versión.",
  LIMIT_UNEXPECTED_FILE: "Los archivos deben enviarse en el campo «adjuntos».",
};

function manejarErrores(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof ErrorApp) {
    return res.status(error.estado).json({ error: { codigo: error.codigo, mensaje: error.message } });
  }
  if (error instanceof multer.MulterError) {
    const mensaje = MENSAJES_MULTER[error.code] || "No se pudieron procesar los archivos.";
    return res.status(400).json({ error: { codigo: "datos_invalidos", mensaje } });
  }
  if (error.type === "entity.parse.failed" || error.type === "entity.too.large") {
    return res.status(400).json({ error: { codigo: "datos_invalidos", mensaje: "El pedido no tiene un formato válido." } });
  }

  console.error(error);
  return res.status(500).json({ error: { codigo: "error_interno", mensaje: "Ocurrió un error inesperado. Probá de nuevo." } });
}

function crearApp() {
  const app = express();
  app.disable("x-powered-by");
  if (config.confiarProxy) app.set("trust proxy", config.confiarProxy); // así req.ip es la del cliente real

  // Cabeceras de seguridad. Se permiten las fuentes de Google que usa el diseño.
  const directivas = helmet.contentSecurityPolicy.getDefaultDirectives();
  delete directivas["upgrade-insecure-requests"]; // el sitio también corre en http://localhost
  app.use(helmet({
    contentSecurityPolicy: { directives: directivas },
    strictTransportSecurity: config.produccion,
  }));

  // API
  app.use("/api", auth.verificarOrigen, express.json({ limit: "400kb" }), auth.cargarUsuario, auth.exigirClaveDefinitiva);
  app.use("/api", auditar); // registra automáticamente cada movimiento relevante (ver auditoria/catalogo.js)
  app.get("/api/salud", (req, res) => res.json({ ok: true }));
  app.use("/api/auth", rutasAuth);
  app.use("/api/publico", rutasPublico);
  app.use("/api", rutasAuditoria);
  app.use("/api", rutasBorradores); // antes que contenidos: /contenidos/:id/borrador es más específico
  app.use("/api", rutasContenidos);

  // El frontend usa este archivo para saber que debe hablar con el servidor y no con la demo.
  app.get("/js/config.js", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.type("application/javascript").send(
      'window.Nexo = window.Nexo || {};\nwindow.Nexo.config = { modo: "servidor", urlApi: "/api" };\n'
    );
  });

  // Cliente para los sitios satélite (frontend/sitios/): cada sitio lo carga desde su propio dominio con
  // <script src="https://<nexo>/sitios/nexo-sitio.js">. Helmet marca todo como "same-origin", lo que el navegador
  // aplica también a scripts y hojas de estilo de otro origen: acá se habilita solo para esta carpeta.
  app.use("/sitios", (req, res, next) => {
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    res.set("Access-Control-Allow-Origin", "*");
    next();
  });
    app.use(express.static(config.carpetaFrontend, { dotfiles: "ignore" }));
  app.use(manejarErrores);
  return app;
}

module.exports = { crearApp };
