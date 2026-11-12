/* config.js — dónde está Nexo institucional.
 * Es el único lugar que hay que cambiar al publicar: poné la dirección del servidor de Nexo
 * (por ejemplo "https://nexo.desarrollosocial.gob.ar"), sin barra al final.
 * Cada página indica qué sitio es con <meta name="nexo-sitio" content="...">.
 */
window.NEXO_CONFIG = {
  api: "http://localhost:3000",
  // cuántas muestra cada sección al abrir la página (se puede cambiar por sección con data-nexo-portada en el HTML)
  portada: { noticia: 6, proyecto: 6, galeria: 6 }, // dos filas completas de la cuadrícula de 3 columnas
  // lo mismo en celulares (pantallas de hasta 700px), donde las grillas quedan en una sola columna
  portadaCelular: { noticia: 4, proyecto: 3, galeria: 4 },
  // cuántas más trae cada vez que se toca "Ver todas" / "Cargar más" (1 a 100)
  lote: 24,
};
