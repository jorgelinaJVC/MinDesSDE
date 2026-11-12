"use strict";

/* Control y auditoría: solo el administrador. Cada ruta exige el permiso "auditoria" con el middleware antes de
 * leer nada; el servicio lo vuelve a exigir. Los filtros llegan por query string y se validan en el servicio. */

const { Router } = require("express");
const { requerirSesion } = require("../auth");
const { requerirPermiso } = require("../permisos-http");
const auditoria = require("../servicios/auditoria");

const router = Router();
// por ruta y no con router.use: este router se monta en /api y no debe afectar a otros pedidos
const soloAdmin = [requerirSesion, requerirPermiso("auditoria")];

// GET /api/auditoria?desde=2026-10-01&hasta=2026-10-05&usuario=<id>&accion=decision.aprobar,contenido.publicar
//     &modulo=Gobernanza&resultado=rechazado&q=becas&pagina=2&porPagina=25
router.get("/auditoria", soloAdmin, async (req, res) => {
  res.json(await auditoria.consultar(req.usuario, req.query));
});

router.get("/auditoria/resumen", soloAdmin, async (req, res) => {
  res.json(await auditoria.resumen(req.usuario));
});

router.get("/auditoria/catalogo", soloAdmin, (req, res) => {
  res.json(auditoria.catalogo());
});

// mismos filtros que el listado; descarga un CSV (máximo 10.000 filas). La exportación también queda auditada.
router.get("/auditoria/exportar", soloAdmin, async (req, res) => {
  const { csv, total, recortado } = await auditoria.exportar(req.usuario, req.query);
  const hoy = new Date().toISOString().slice(0, 10);
  res.set("X-Total-Registros", String(total));
  if (recortado) res.set("X-Recortado", "1");
  res.set("Cache-Control", "no-store");
  res.attachment(`auditoria-nexo-${hoy}.csv`);
  res.type("text/csv; charset=utf-8").send(csv);
});

// directorio completo: activos y dados de baja, con contacto y actividad de los últimos 30 días
router.get("/directorio", soloAdmin, async (req, res) => {
  res.json(await auditoria.directorioConActividad(req.usuario));
});

module.exports = router;
