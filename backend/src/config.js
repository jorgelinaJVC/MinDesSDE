"use strict";

const path = require("node:path");

// Lee el archivo .env de la raíz del proyecto si existe (Node 20.12+ / 21.7+).
try {
  process.loadEnvFile(path.join(__dirname, "..", "..", ".env"));
} catch (e) {
  /* sin .env: se usan las variables del entorno y los valores por defecto */
}

const env = process.env;

module.exports = {
  produccion: env.NODE_ENV === "production",
  puerto: Number(env.PORT || 3000),
  mongo: {
    uri: env.MONGODB_URI || "mongodb://127.0.0.1:27017",
    base: env.DB_NAME || "nexo_institucional",
  },
  sesionHoras: Number(env.SESION_HORAS || 8),
  costoBcrypt: Number(env.BCRYPT_COSTO || 12),
  carpetaAdjuntos: path.resolve(env.CARPETA_ADJUNTOS || path.join(__dirname, "..", "..", "almacen")),
  carpetaFrontend: path.join(__dirname, "..", "..", "frontend"),
  maxAdjuntoBytes: 10 * 1024 * 1024,
  maxAdjuntos: 8,
  intentosLogin: { maximo: 5, ventanaMs: 15 * 60 * 1000 },
  // Detrás de un proxy (nginx, Cloudflare): cuántos saltos creerle a X-Forwarded-For para obtener la IP real.
  confiarProxy: env.CONFIAR_PROXY ? Number(env.CONFIAR_PROXY) || env.CONFIAR_PROXY : false,
  auditoria: {
    // "10.0.1.0/24=Sede Central;10.0.2.0/24=Residencia Mama Antula": nombra la sede según la IP
    sedes: String(env.AUDITORIA_SEDES || "").split(";").map((par) => par.split("="))
      .filter(([rango, nombre]) => rango && nombre)
      .map(([rango, nombre]) => ({ rango: rango.trim(), nombre: nombre.trim().slice(0, 80) })),
    // cabecera con el país que agrega un proxy de confianza (ej. cf-ipcountry en Cloudflare)
    cabeceraPais: env.AUDITORIA_CABECERA_PAIS || null,
    // días que se conserva cada registro (0 = para siempre); lo aplica un índice TTL al correr bd:iniciar
    dias: Number(env.AUDITORIA_DIAS || 0),
    zonaHoraria: "-03:00", // Argentina: los filtros por día ("desde 2026-10-01") se interpretan en hora local
  },
};
