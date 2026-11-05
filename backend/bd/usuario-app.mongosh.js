// Usuario de MongoDB con permisos mínimos para la aplicación (recomendado en producción).
// Reemplaza a los triggers de MySQL: con este usuario la app NO PUEDE borrar contenidos, versiones,
// adjuntos, historial ni personas, aunque tuviera un error o alguien le inyectara una orden.
//
// Correrlo UNA vez con un usuario administrador de MongoDB:
//   mongosh "mongodb://admin:clave@127.0.0.1:27017/admin" --file backend/bd/usuario-app.mongosh.js
// y después usar en el .env:
//   MONGODB_URI=mongodb://nexo_app:LA-CLAVE@127.0.0.1:27017/?authSource=nexo_institucional
// (bd:iniciar crea colecciones e índices: corrélo con el usuario administrador, no con nexo_app)

const BASE = "nexo_institucional";
const CLAVE = "cambia-esta-clave-larga"; // cambiala antes de correr el script

const bd = db.getSiblingDB(BASE);
const en = (coleccion, acciones) => ({ resource: { db: BASE, collection: coleccion }, actions: acciones });

if (!bd.getRole("nexo_aplicacion")) {
  bd.createRole({
    role: "nexo_aplicacion",
    privileges: [
      en("contenidos", ["find", "insert", "update"]),       // sin "remove": los contenidos se archivan
      en("usuarios", ["find", "insert", "update"]),         // sin "remove": las personas se desactivan
      en("sesiones", ["find", "insert", "update", "remove"]),
      en("vista_publicaciones", ["find"]),
      en("auditoria", ["find", "insert"]),                // solo agregar: la bitácora no se edita ni se borra
    ],
    roles: [],
  });
} else {
  // instalaciones anteriores al módulo de auditoría: se suma el permiso sin tocar los demás
  bd.grantPrivilegesToRole("nexo_aplicacion", [en("auditoria", ["find", "insert"])]);
}

if (!bd.getUser("nexo_app")) {
  bd.createUser({ user: "nexo_app", pwd: CLAVE, roles: [{ role: "nexo_aplicacion", db: BASE }] });
}

print(`Listo: usuario nexo_app con el rol nexo_aplicacion en ${BASE}.`);
