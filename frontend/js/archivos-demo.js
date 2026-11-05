/*
 * Almacén de archivos del modo demostración (sin servidor).
 *
 * Guarda los adjuntos en IndexedDB del navegador, así en la demo también se pueden ver, descargar y quitar
 * de verdad. Con servidor no se usa: los archivos van al backend y se sirven desde /api/adjuntos.
 * Si el navegador no tiene IndexedDB (o la bloquea), funciona en memoria durante la sesión.
 */
(function () {
  "use strict";

  const BASE = "nexo-archivos-demo";
  const ALMACEN = "archivos";

  /* Archivos de los contenidos de ejemplo (imágenes pequeñas generadas para la demo). */
  const DE_EJEMPLO = {
    "a-logo": { tipo: "image/png", base64: "iVBORw0KGgoAAAANSUhEUgAAAWgAAADcAgMAAAAgp9ORAAAACVBMVEXo8OvW8mwWQDSyRPxSAAAB/ElEQVR42u3bPVLDMBAFYIlRehc5kI7gAnqOx0AKH0H3wYUqmnhGFPxNnODsPm1GifNcGYn5Ij2tFMMk/tVd6npwpEmTJk2aNGnSpEmTJk365umg+N335NzTJeiyc865t01vHsiX7Nx+MKd3Pzf7ZEzv/25HW7oMp+8N6PGfGdTT5TDfwZCeFn+soofFSdTQZd6QzehxoRQr6SRowehy3JSN6HFxc1bRSdimp8upxmxCT+JGNZ3FU1HTSdGqo4tiLkp6UjVfy3NIVuWkopOyXU4X5WyuI+tJ3SGmszqpawgkAT0yugBRtQ9kgrpajzpDy7DiP+4S2Nd01AVc4tUu4wR38p8WWjrDlcms74NOFb3MmjRp0qRnV6zoZdb3QHdLnZ5ZW9IB7lxpIB6uzKaBRPhMXemW6eAjpOWoA7wZW47awzvm/KgjWtZN67pDa+88HdACaRqIRwtEMOoIFoiA7sBVbHuoBrBABLQHV1ESSMRWUUJ32CpK6IBFLaE9FrWo+CIUtYjeHjdtjB4WPJSHbDdGJA8ZvUXykNEeyUN4PPWzl4p2dFDvFzE9G2Zv+aS6VS+imPb96XuLd5nN4uasewN7/H2RaE37b1v+iU+v+H6j8nOqnl+dJE1acx2f6h/P2BhfmDVp0qRJ3ybNpyfSpEmTJk2aNGnSpG+C/gTu5lgOLEms2AAAAABJRU5ErkJggg==" },
    "a-taller": { tipo: "image/png", base64: "iVBORw0KGgoAAAANSUhEUgAAAWgAAADcBAMAAACv5yYxAAAAFVBMVEXs4s7mtDxalm6WblBGgqrOXEY8MiiiDFqNAAAA8klEQVR42u3cMQ6CMBiA0dbIrjcwXMELMHgAF67gudi5gmfhCu5ObA2YaDsRat43tclP8tKUhYEQJEmSJEmSJEmSJGldXG4e+fn3sIPJQ40nDb1Vx/X2lXkDTmk5ZQ7jkpbj78nmnpbPjLVzPaChoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaF32scvjc7FD7bFk33x5M31gJYkSZIkSdK34rVCtM9i0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0ND/jp4BjO8OOl7lVnQAAAAASUVORK5CYII=" },
  };

  const enMemoria = new Map(); // id -> { blob, url }
  let bd = null;

  const puedeCrearUrl = () => typeof URL !== "undefined" && typeof URL.createObjectURL === "function";

  function abrir() {
    return new Promise((resolver) => {
      if (typeof indexedDB === "undefined") return resolver(null);
      try {
        const pedido = indexedDB.open(BASE, 1);
        pedido.onupgradeneeded = () => pedido.result.createObjectStore(ALMACEN);
        pedido.onsuccess = () => resolver(pedido.result);
        pedido.onerror = () => resolver(null);
      } catch (e) {
        resolver(null);
      }
    });
  }

  function operar(modo, fn) {
    return new Promise((resolver, rechazar) => {
      if (!bd) return resolver(null);
      const tx = bd.transaction(ALMACEN, modo);
      const pedido = fn(tx.objectStore(ALMACEN));
      tx.oncomplete = () => resolver(pedido ? pedido.result : null);
      tx.onerror = () => rechazar(tx.error);
    });
  }

  function registrar(id, blob) {
    const previo = enMemoria.get(id);
    if (previo && previo.url) URL.revokeObjectURL(previo.url);
    enMemoria.set(id, { blob, url: puedeCrearUrl() ? URL.createObjectURL(blob) : null });
  }

  function blobDeEjemplo({ base64, tipo }) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return new Blob([bytes], { type: tipo });
  }

  function cargarEjemplos() {
    for (const [id, ejemplo] of Object.entries(DE_EJEMPLO)) {
      if (!enMemoria.has(id)) registrar(id, blobDeEjemplo(ejemplo));
    }
  }

  const archivosDemo = {
    /** Carga lo guardado y los archivos de ejemplo. Se llama una vez al abrir el panel. */
    async iniciar() {
      bd = bd || await abrir();
      try {
        const claves = (await operar("readonly", (s) => s.getAllKeys())) || [];
        const valores = (await operar("readonly", (s) => s.getAll())) || [];
        claves.forEach((id, i) => registrar(id, valores[i]));
      } catch (e) { /* sin base: solo memoria */ }
      cargarEjemplos();
    },

    async guardar(id, archivo) {
      const blob = archivo instanceof Blob ? archivo : new Blob([archivo]);
      registrar(id, blob);
      try { await operar("readwrite", (s) => s.put(blob, id)); } catch (e) { /* queda en memoria */ }
    },

    async borrar(ids) {
      for (const id of [].concat(ids)) {
        const previo = enMemoria.get(id);
        if (previo && previo.url) URL.revokeObjectURL(previo.url);
        enMemoria.delete(id);
        try { await operar("readwrite", (s) => s.delete(id)); } catch (e) { /* nada que borrar */ }
      }
    },

    /** Al restablecer los datos de ejemplo: borra lo subido y vuelve a dejar los archivos de ejemplo. */
    async vaciar() {
      for (const { url } of enMemoria.values()) if (url) URL.revokeObjectURL(url);
      enMemoria.clear();
      try { await operar("readwrite", (s) => s.clear()); } catch (e) { /* sin base */ }
      cargarEjemplos();
    },

    /** URL para mostrar o descargar el archivo, o null si no hay contenido guardado. */
    url: (id) => (enMemoria.get(id) || {}).url || null,
    tiene: (id) => enMemoria.has(id),
  };

  window.Nexo = window.Nexo || {};
  window.Nexo.archivosDemo = archivosDemo;
})();
