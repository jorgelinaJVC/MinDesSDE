# Nexo institucional

Portal de gestión editorial: el equipo carga información, un director de área la revisa, la autoridad superior
tiene la decisión final y, al aprobar, el contenido se publica en los sitios que se eligieron al cargarlo. Nada se ve
en ningún sitio antes de esa aprobación, y todo cambio queda registrado en un historial de versiones que no se puede
reescribir.

## Estructura

```
frontend/   HTML, CSS y JS separados (index = login, panel, publico)
backend/    API (Express) + base de datos (MongoDB)
  bd/         esquema: validación $jsonSchema, índices, vista pública y usuario con permisos mínimos
  src/        config, auth, permisos, servicios y rutas
  scripts/    iniciar-bd, sembrar, crear-usuario
pruebas/    pruebas automatizadas (API, base de datos, adjuntos y frontend)
```

## Puesta en marcha

Requisitos: Node.js 20.12 o superior y MongoDB 6.0 o superior (local o Atlas). No hace falta replica set.

1. Configurar y preparar la base:

   ```bash
   npm install
   cp .env.example .env        # completá MONGODB_URI si no usás el MongoDB local sin clave
   npm run bd:iniciar          # crea colecciones con validación, índices y la vista pública
                               # (volvé a correrlo después de actualizar el proyecto: no borra datos)
   npm run bd:sembrar          # (opcional) 4 personas y contenidos de ejemplo
   npm start                   # http://localhost:3000
   ```

2. Crear personas reales:

   ```bash
   NEXO_PASSWORD='una-clave-larga' npm run usuario:crear -- "Nombre Apellido" correo@institucion.edu.ar administrador
   ```

3. (Recomendado en producción) Usuario de base con permisos mínimos, que no puede borrar contenidos ni personas:

   ```bash
   mongosh "mongodb://admin:clave@127.0.0.1:27017/admin" --file backend/bd/usuario-app.mongosh.js
   ```

   Después usá `nexo_app` en `MONGODB_URI` para la aplicación, y el usuario administrador solo para `bd:iniciar`.

Con `bd:sembrar` podés ingresar con `jorgelina.campos@ejemplo.edu.ar` (administradora), `marcos.ledesma@…` (director),
`elena.suarez@…` (autoridad superior), `analia.rojas@…` (colaboradora) o `tomas.herrera@…` (observador), todos en
`ejemplo.edu.ar`, con la contraseña `Nexo-demo-2026`.

## Modelo de datos

| Colección | Contenido |
|---|---|
| `usuarios` | nombre, correo (único), hash bcrypt, rol, activo |
| `sesiones` | hash del token, vencimiento (índice TTL: las vencidas se borran solas) |
| `contenidos` | un documento por contenido, con sus `versiones`, `adjuntos` e `historial` adentro |
| `vista_publicaciones` | vista de solo lectura: únicamente la versión aprobada, en sus sitios aprobados, sin autores ni historial |

Como cada contenido es un solo documento, cada paso del circuito es una escritura atómica. El campo `rev` evita que dos
personas decidan a la vez sobre lo mismo: la escritura solo se aplica si nadie modificó el contenido desde que se leyó.

## Sitios de destino y publicación condicionada

Al cargar un contenido se eligen, con casillas, **en qué sitios se publica** (uno o varios) y **qué tipo de contenido es**:

| Sitio (id) | Página |
|---|---|
| `adultos-mayores` | Portal de la Dirección General de Adultos Mayores (`indexAdultos.html`) |
| `mama-antula` | Residencia de Larga Estadía Mama Antula (`mama-antula.html`) |
| `centro-de-dia` | Centro de Día (antes `sitio-3`; `bd:iniciar` renombra el id en los contenidos guardados) |

| Tipo (id) | Cómo se ve en el sitio |
|---|---|
| `noticia` | Tarjeta con foto (la primera imagen adjunta), categoría, fecha y resumen; al abrirla, el texto completo |
| `proyecto` | Tarjeta con la categoría como etiqueta y el resumen; al abrirla, el texto completo |
| `galeria` | Álbum: las imágenes adjuntas (al menos una); la primera es la portada |

### Qué se guarda

| Campo (`contenidos`) | Qué es |
|---|---|
| `sitiosDestino` | Los sitios elegidos para la versión que está en el circuito (equivale al `targetSites` del requerimiento). Arreglo sin repetidos de ids del catálogo; la base lo valida con `$jsonSchema` (`uniqueItems`, `enum`). |
| `destinoPublicado` | `{ sitios, tipo, seccion }` aprobados con la versión visible. **Solo** lo escribe la aprobación de la autoridad superior; `null` mientras no haya nada publicado. |
| `versionPublicada` | Número de la versión visible (también lo escribe solo la aprobación). |

Que sean dos campos es lo que impide que una corrección se adelante: si alguien envía una versión nueva de algo
publicado eligiendo otros sitios, `sitiosDestino` cambia pero lo publicado sigue en `destinoPublicado` hasta que la
autoridad superior apruebe esa versión.

### Reglas

1. **Nada es visible hasta la aprobación final.** Borrador, revisión de dirección, elevado, devuelto y rechazado no
   tienen `versionPublicada`, así que no entran en `vista_publicaciones`.
2. **Aprobar publica.** Cuando la autoridad superior aprueba (`POST /api/contenidos/:id/decision { decision: "aprobar" }`)
   el contenido pasa a `publicado` y queda visible en todos sus sitios a la vez. No hay un segundo paso.
3. **Solo la autoridad superior o el administrador.** La ruta exige el permiso `decidir` (middleware) y el servicio lo
   vuelve a comprobar, además de exigir que el contenido esté `elevado` (ya pasó por dirección) y que quien decide no
   sea quien lo elevó. Director, autor y observador reciben 403.
4. **Una corrección no reemplaza lo publicado** hasta que se aprueba. Si se rechaza, lo anterior sigue visible donde estaba.
5. **Dar de baja** (archivar) lo retira de todos sus sitios. **Restaurar** lo deja `aprobado` sin publicar: la autoridad superior lo
   vuelve a publicar con `POST /api/contenidos/:id/publicar` (es el único uso que le queda a ese endpoint).

### Consultas de los sitios

Toda consulta pública es **por sitio** (sin sesión, solo lectura, CORS abierto):

```
GET /api/publico/sitios                                         sitios y tipos disponibles
GET /api/publico/sitios/centro-de-dia/publicaciones             lo aprobado para ese sitio
GET /api/publico/sitios/mama-antula/publicaciones?tipo=noticia
GET /api/publico/sitios/mama-antula/publicaciones?tipo=noticia&limite=24&desde=8   la página siguiente
GET /api/publico/sitios/mama-antula/publicaciones/<slug>        una ficha (404 si se publicó en otro sitio)
GET /api/publico/adjuntos/<id>                                  imágenes (se muestran) y documentos (se descargan)
```

`/api/publico/publicaciones` (sin sitio) responde 400. Por dentro, la consulta es sobre la vista:

```js
// backend/src/repositorio.js
db.vista_publicaciones.find({ sitios: "centro-de-dia" }).sort({ fecha: -1 })   // { sitios: x } busca dentro del arreglo
```

y la vista ya trae solo lo aprobado:

```js
// backend/bd/esquema.js (VISTA_PUBLICACIONES)
{ $match: { versionPublicada: { $ne: null }, "destinoPublicado.sitios.0": { $exists: true } } },
{ $project: { sitios: "$destinoPublicado.sitios", tipo: "$destinoPublicado.tipo", seccion: "$destinoPublicado.seccion", ... } }
```

Por qué no se filtra `{ estado: "aprobado" }`: un contenido publicado al que le envían una corrección pasa a
`en_revision`, y la versión aprobada tiene que seguir viéndose. El dato que dice "esto lo aprobó la autoridad
superior" es `versionPublicada`; el estado describe la versión en curso. Índice para estas consultas:
`ix_contenidos_publicado_sitio { "destinoPublicado.sitios": 1, publicadoEn: -1 }` (multikey).

### Indicador para quien crea

Cada contenido trae un campo calculado `visibilidad` con los mismos datos que lee la vista pública:

| `codigo` | Texto en el panel |
|---|---|
| `borrador` | Borrador: no es visible en ningún sitio |
| `pendiente` | Pendiente de la revisión de dirección / de aprobación de la Autoridad Superior: todavía no es visible |
| `devuelto`, `rechazado` | Observada (el autor tiene que corregirla) / Rechazada |
| `visible` | Aprobada y visible en Mama Antula y Centro de Día |
| `visible_con_cambios` | Lo anterior, más "Versión 2 pendiente…; al aprobarse se verá en …" |
| `listo` | Aprobada, falta publicarla (restaurada del archivo) |
| `retirado` | Retirado: ya no se ve en ningún sitio |

El panel lo muestra como etiqueta en los listados y, en el detalle y el historial, con un renglón por sitio
(Visible / Pendiente de aprobación) y un enlace a la página del sitio. La vista pública de Nexo (`publico.html`) tiene
una barra con los tres sitios (`publico.html?sitio=centro-de-dia`) y pide cada uno por separado, como los portales.

Para **agregar o renombrar un sitio**: editá `backend/src/sitios.js` y `SITIOS` en `frontend/js/api.js`, y corré
`npm run bd:iniciar`. El `nombre` se puede cambiar siempre; si cambia el `id`, agregalo a `SITIOS_RENOMBRADOS`.

Los contenidos cargados antes de que existieran los sitios quedan **sin sitio asignado** y no se muestran en ningún
sitio (la autoridad superior no puede aprobarlos sin destino): se les asigna con una nueva versión.

## Conectar un sitio satélite

Cada sitio (Adultos Mayores, Mama Antula, Centro de Día) muestra lo que le corresponde con dos archivos que sirve Nexo,
`frontend/sitios/nexo-sitio.js` y `nexo-sitio.css`, y un contenedor en su HTML:

```html
<link rel="stylesheet" href="https://<nexo>/sitios/nexo-sitio.css">

<section data-nexo-sitio="mama-antula"></section>

<script src="https://<nexo>/sitios/nexo-sitio.js" defer></script>
```

El script pide `GET https://<nexo>/api/publico/sitios/mama-antula/publicaciones` y dibuja:

- una **banda de avisos prioritarios** arriba (los urgentes vigentes), y
- las secciones **Noticias** (tarjeta con foto), **Proyectos institucionales** (tarjeta con etiqueta) y **Galerías de
  fotos** (portada y cantidad de fotos). Los prioritarios también aparecen en su sección, primeros, con borde de alerta
  y la marca «Prioritario» (no solo un color).

Al hacer clic se abre el detalle, centrado en la pantalla (texto completo, álbum y documentos). Las fotos del álbum
son una cuadrícula de miniaturas: al tocar una se amplía en un visor sobre fondo oscuro, con flechas, que se cierra
con la X, Escape o tocando el fondo. Opciones del contenedor:

| Atributo | Para qué | Por defecto |
|---|---|---|
| `data-nexo-sitio` | Id del sitio en Nexo (obligatorio) | — |
| `data-nexo-api` | Dirección de Nexo, si no es la misma de donde se cargó el script | origen del script |
| `data-nexo-tipos` | Secciones y orden, ej. `noticia,galeria` | `noticia,proyecto,galeria` |
| `data-nexo-limite` | Cuántas publicaciones pedir (1 a 100) | 50 |
| `data-nexo-actualizar` | Volver a consultar cada N segundos (mínimo 60) | no |
| `data-nexo-titulo` | Título del bloque (vacío para ocultarlo) | Novedades |

Los colores se adaptan a cada sitio redefiniendo las variables `--nexo-acento`, `--nexo-acento-suave`,
`--nexo-fuente-titulo`, etc. (ver el comienzo de `nexo-sitio.css` y `frontend/sitios/ejemplo.css`). Hay una página de
ejemplo por sitio en `frontend/sitios/` (`/sitios/adultos-mayores.html`, `/sitios/mama-antula.html`,
`/sitios/centro-de-dia.html`).

Detalles técnicos:
- **Otro dominio:** la API pública responde con CORS abierto, y la carpeta `/sitios` y los adjuntos públicos se sirven con
  `Cross-Origin-Resource-Policy: cross-origin` para que otro dominio pueda cargar el script, la hoja de estilos y las
  imágenes. El resto de Nexo sigue en `same-origin`. El script pide sin cookies: un sitio nunca actúa con la sesión de nadie.
- **Seguridad del dibujo:** todo lo que llega de la API se escribe como texto (nunca como HTML), y solo se usan URL de
  archivos con la forma `/api/publico/adjuntos/<id>` de Nexo.
- **Al aprobar, aparece en la próxima carga:** las listas se sirven con `Cache-Control: public, no-cache` y `ETag`. El
  navegador revalida en cada carga y, si nada cambió, recibe un 304 vacío.
- **Consulta** (`backend/src/repositorio.js`, `listarPublicaciones`). Son dos `find` sobre `vista_publicaciones`, para que
  el límite se aplique en MongoDB sin que un urgente quede afuera por ser más viejo:

  ```js
  const base = { sitios: sitio, ...(tipo ? { tipo } : {}) };
  const destacadas = { "prioridad.nivel": "urgente", $or: [{ "prioridad.vence": null }, { "prioridad.vence": { $gte: ahora } }] };
  vista.find({ ...base, ...destacadas }).sort({ fecha: -1 }).limit(limite);              // 1. urgentes vigentes
  vista.find({ ...base, $nor: [destacadas] }).sort({ fecha: -1 }).limit(limite - n1);    // 2. el resto
  ```

  La vista ya exige las dos condiciones de visibilidad: un **estado autorizado** (`publicado`, o una corrección en curso
  o rechazada de algo publicado; nunca borrador, archivado ni aprobado sin publicar) y una **versión aprobada por la
  autoridad superior** con sitios aprobados (`versionPublicada`, `destinoPublicado`).

## Roles y cadena de aprobación

Cada contenido pasa por tres escalones:

```
1. Colaborador ──envía──▶ 2. Director de área ──eleva──▶ 3. Autoridad superior ──aprueba──▶ publica
                               │ devuelve                      │ devuelve / rechaza
                               ▼                               ▼
                            al autor                    al autor / cerrado
```

| Rol | Nivel | Puede |
|---|---|---|
| Observador | — | Consultar |
| Colaborador | 1 | Cargar contenido, enviarlo a revisión y mandar nuevas versiones de lo suyo |
| Director de área | 2 | Revisión de dirección: **elevar** a la autoridad superior o **devolver** con observaciones. No aprueba ni publica, y no revisa lo que cargó él mismo |
| Autoridad superior | 3 | **Decisión final** sobre lo elevado (aprobar —publica en los sitios elegidos—, devolver o rechazar); dar de baja y reactivar cualquier contenido |
| Administrador | — | Gestionar el equipo y los roles. **Interviene en las dos instancias**: revisión de dirección (elevar o devolver) y decisión final (aprobar —publica—, devolver o rechazar). Nunca revisa lo que cargó o editó, ni decide lo que él mismo elevó |

Siempre queda al menos un administrador y al menos una autoridad superior: no se puede quitar el rol ni dar de baja a
la última persona que lo tiene.

| Permiso | Observador | Colaborador | Director | Autoridad | Administrador |
|---|:-:|:-:|:-:|:-:|:-:|
| `crear` | | ✓ | ✓ | ✓ | ✓ |
| `revisar` (nivel 2) | | | ✓ | | ✓ |
| `decidir` (nivel 3) | | | | ✓ | ✓ |
| `publicar` | | | | ✓ | ✓ |
| `roles` | | | | | ✓ |

Editar y dar de baja dependen además del contenido (ver «Editar y dar de baja contenidos publicados»).

La matriz vive en `backend/src/permisos.js` (y su espejo para la interfaz en `frontend/js/api.js`). Cada ruta la
controla dos veces: el middleware `requerirPermiso` (`backend/src/permisos-http.js`) corta con 403 antes de tocar la
base, y el servicio vuelve a exigir el permiso y valida el estado del contenido.

### Editar y dar de baja contenidos publicados

En **Historial y archivo**, cada contenido tiene un menú **⋯** con las acciones que la persona puede hacer:

- **Editar** abre el formulario de carga precargado con lo que hoy está publicado: título, bajada, texto con formato,
  sitios de destino, categoría, prioridad y archivos (se pueden quitar y agregar). Lo editado es una **versión nueva**:
  pasa por la revisión de dirección y la decisión de la autoridad superior, y mientras tanto **los sitios siguen
  mostrando la versión aprobada**. Al aprobarse, reemplaza a la anterior en el acto. La versión anterior queda intacta
  en el historial (con sus archivos).
- **Dar de baja** pide confirmación en un diálogo que dice en qué sitios deja de verse y exige el **motivo** (queda en
  el historial y en la auditoría). Es un **borrado lógico**: el contenido pasa a `archivado` y se le quita el destino
  publicado; `vista_publicaciones` ya no lo incluye, así que desaparece **en el acto** de los tres sitios, de su
  detalle y de `/api/publico/adjuntos` (las listas públicas se sirven con `Cache-Control: no-cache` + ETag, así que no
  queda una copia vieja en el navegador). No se borra nada de la base: versiones, archivos e historial se conservan.
- **Reactivar** (lo dado de baja) lo devuelve al circuito; si estaba publicado queda `aprobado` y la autoridad superior
  lo vuelve a publicar. Nunca vuelve a la web sin una decisión.

| Quién | Editar lo publicado | Corregir lo observado | Dar de baja / reactivar |
|---|:-:|:-:|:-:|
| Autor del contenido (mientras tenga permiso de cargar) | ✓ | ✓ | ✓ |
| Director de área | ✓ | solo si escribió la versión observada | ✓ |
| Administrador | ✓ | solo si escribió la versión observada | ✓ |
| Autoridad superior | solo lo propio | solo lo propio | ✓ (cualquiera) |
| Otro colaborador / observador | — | — | — |

Quien edita algo ajeno firma esa versión: no puede hacer la revisión de dirección de su propia edición (la hace otro
director de área). Si alguien ya está editando un contenido, otra persona no puede abrir una segunda edición
hasta que esa se envíe o se descarte.

```
DELETE /api/contenidos/:id              { "motivo": "…" }  dar de baja (borrado lógico)
POST   /api/contenidos/:id/archivar     { "motivo": "…" }  lo mismo (nombre anterior, se mantiene)
POST   /api/contenidos/:id/restaurar                       reactivar
POST   /api/contenidos/:id/borrador                        editar: abre la edición con los datos actuales
PUT    /api/contenidos/:id/borrador                        guarda textos, título, sitios, categoría, prioridad
POST   /api/contenidos/:id/borrador/adjuntos               agrega archivos (multipart)
DELETE /api/contenidos/:id/borrador/adjuntos/:adjuntoId    quita un archivo
POST   /api/contenidos/:id/borrador/enviar                 manda la edición a revisión
```

El control de acceso está en `backend/src/permisos.js` (`puedeEditarContenido`, `puedeDarDeBaja`) y se aplica dos
veces: la ruta corta a los observadores antes de tocar la base y el servicio decide con el documento en la mano
(autoría). No hay borrado físico a propósito: una institución tiene que poder mostrar qué se publicó, cuándo, quién lo
aprobó y por qué se retiró.

### Devoluciones con observaciones

El **director de área** (revisión de dirección), la **autoridad superior** (decisión final) y el **administrador** (en
cualquiera de las dos instancias) pueden **devolver al autor** con observaciones. Nadie más aprueba ni devuelve.
Para que siempre intervengan al menos dos personas: nadie revisa lo que cargó o editó, y nadie toma la decisión final
sobre una versión que él mismo elevó.

```
borrador → en_revision → elevado → publicado            (aprobar publica en el acto)
               │             │
               └─ devolver ──┴─ devolver → devuelto («observado») → el autor corrige → en_revision → …
```

- **Revisor:** en el detalle de la solicitud, el campo «Observaciones para el autor» (hasta 2000 caracteres, con
  contador). Cada línea se le muestra al autor como un punto a corregir. Son obligatorias para devolver (y para
  rechazar).
- **Autor:** en el **Panel de control** aparece un aviso «Te devolvieron … con observaciones» con lo que piden; la
  pestaña de revisión muestra la insignia «para corregir» y el contenido aparece marcado «Para corregir». El detalle
  muestra el bloque «Observado: requiere cambios» con cada observación (quién, rol, instancia, versión y fecha) y el
  botón **Corregir y reenviar**, que abre el formulario con los datos actuales y las observaciones a la vista arriba.
- **Solo el autor** corrige lo observado (quien cargó el contenido, o quien escribió la versión observada si fue una
  edición de otra persona). Directores, administrador y autoridad lo ven, pero no lo modifican.
- Al **reenviar**, nace una versión nueva (la observada se conserva tal cual), el contenido vuelve a `en_revision` y
  las observaciones quedan **atendidas** (con la versión en que se atendieron). Pasa otra vez por toda la cadena:
  dirección y después la autoridad superior.
- Si lo observado es una **edición de algo publicado**, los sitios siguen mostrando la versión aprobada mientras tanto.

Cada devolución queda en `contenidos.observaciones` (además del historial y de la auditoría):

```json
{
  "_id": "…", "version": 2, "nivel": "direccion | autoridad",
  "usuarioId": "…", "rol": "director", "mensaje": "Falta la fecha.\nAgregá una foto.",
  "fecha": "2026-10-17T21:30:00Z", "atendidaEn": null, "atendidaEnVersion": null
}
```

Las observaciones son internas: no salen nunca en la API pública. Se ven en el detalle de cada contenido (revisión e
historial) en un historial plegable con su estado (pendiente / atendida en la versión N).

### Gestión del equipo (solo administrador)

Desde **Equipo y roles** el administrador puede:

- **Agregar integrante**: nombre, correo, rol inicial y una contraseña provisional (se genera sola; compartila por un canal
  seguro). Si el correo es de alguien dado de baja, se lo reactiva conservando su id y su autoría.
- **Cambiar el rol** con el selector de cada fila (se aplica al instante).
- **Editar** nombre y correo, y opcionalmente **restablecer la contraseña** (cierra las sesiones abiertas de esa persona).
- **Dar de baja** con confirmación previa. Es una baja lógica (`activo: false`): la persona no puede ingresar ni figura en el
  directorio, pero sus contenidos y decisiones se conservan en el historial. Nadie puede darse de baja a sí mismo y siempre
  queda al menos un administrador.

```
POST   /api/usuarios            { nombre, email, rol, password }
PATCH  /api/usuarios/:id        { nombre, email, password? }
PATCH  /api/usuarios/:id/rol    { rol }
DELETE /api/usuarios/:id        baja lógica
```

## Borradores (trabajo previo al envío)

Todo rol que carga contenido (colaborador, director, autoridad superior, administrador) trabaja primero sobre un
**borrador privado**: solo lo ve, edita, envía o descarta quien lo creó. Se puede guardar incompleto, adjuntar
archivos (se suben al elegirlos), verlos, descargarlos y quitarlos. Al **confirmar el envío**, el contenido pasa de
`borrador` a `en_revision` y entra a la cadena: director de área → autoridad superior.

```
POST   /api/borradores                                   crea un borrador (JSON o multipart con archivos)
POST   /api/contenidos/:id/borrador                      borrador de nueva versión (copia la última)
PUT    /api/contenidos/:id/borrador                      guarda los campos
POST   /api/contenidos/:id/borrador/adjuntos             suma archivos (multipart)
DELETE /api/contenidos/:id/borrador/adjuntos/:adjuntoId  quita un archivo
POST   /api/contenidos/:id/borrador/enviar               valida todo y lo manda a revisión de dirección
DELETE /api/contenidos/:id/borrador                      descarta
GET    /api/adjuntos/:id[?ver=1]                         descarga (o muestra imágenes, PDF y texto)
```

**Control de acceso.** Las rutas de borradores exigen el permiso `crear` y pasan por `soloAutorDelBorrador`, que
verifica la autoría **antes** de que multer escriba archivos en disco. Un borrador ajeno que nunca se envió responde
404 (no se revela que existe). El servicio vuelve a verificar todo dentro de la escritura atómica.

| Adjunto en… | Quién lo puede ver y descargar |
|---|---|
| un borrador | solo quien escribe el borrador |
| una versión enviada | el autor, y quienes revisan o deciden: director de área, administrador y autoridad superior |
| la versión publicada | cualquiera (y la parte pública) |

**Modelo de datos.** `contenidos.estado` suma `borrador` y `descartado`. El campo `borrador` guarda la copia de
trabajo (textos, sitio, tipo, categoría, ids de adjuntos, fechas y autor). Un borrador nuevo no tiene versiones: la
versión 1 nace al enviarlo. El `$jsonSchema` lo garantiza con `anyOf` (sin enviar: `versiones` vacío; en el circuito:
al menos una versión, categoría e identificador). El índice único de `slug` pasó a ser parcial, para que varios
borradores puedan no tener identificador todavía (`bd:iniciar` reemplaza el índice viejo). El historial registra
`borrador_creado`, `adjunto_agregado`, `adjunto_quitado`, `borrador_descartado` y `envio`; la actividad de un
borrador en curso solo la ve su autor.

Se usa el driver oficial con validación `$jsonSchema` en la base (no Mongoose): la regla vale aunque alguien escriba
por fuera de la aplicación. Los archivos se guardan en disco (`CARPETA_ADJUNTOS`) con su metadata dentro del
contenido; con un máximo de 10 MB por archivo, GridFS no hace falta (conviene a partir de los 16 MB o si se quiere
todo dentro de MongoDB).

**En modo demo** los archivos se guardan en el navegador (IndexedDB, `frontend/js/archivos-demo.js`): también se
pueden ver, descargar y quitar, y siguen ahí después de recargar. «Restablecer datos de ejemplo» los borra.

## Contenidos prioritarios (urgentes)

**Quién lo marca.** Al redactar, quien carga el contenido activa el interruptor **Prioritario / urgente** del editor,
con un motivo opcional (lo ven solo quienes revisan) y una fecha opcional hasta la que se destaca en el sitio (máximo
90 días). Se guarda con el borrador y pasa al contenido al enviarlo. Una vez enviado, el autor ya no la cambia: la
ajustan los revisores (director de área o administrador en revisión de dirección; autoridad superior en lo elevado,
lo aprobado y lo publicado). Cada cambio queda en el historial del contenido y en la auditoría.

**Dónde se ve en el panel.**

- Resumen: banner con los urgentes que esperan una acción de quien mira y un botón para atender el más antiguo.
- Pestaña Revisión: la insignia cambia de color y muestra un ícono de alerta cuando hay urgentes pendientes.
- Bandeja: grupo fijo **Urgentes** arriba de la lista (primero lo que le toca a quien mira y, dentro, lo que más espera).
  Se abre primero el urgente más antiguo.
- Detalle: franja con el motivo, quién lo marcó, hasta cuándo se destaca y cuánto lleva esperando, con el botón
  **Cambiar prioridad**.
- Etiqueta **Urgente** (color, ícono y texto) en actividad, historial y borradores. Filtro **Solo urgentes** y orden
  **Urgentes primero**.

**En el sitio público.** Los avisos urgentes vigentes van en una banda fija arriba de las novedades (el más reciente
grande, el resto en una línea cada uno), y la página del aviso lleva una franja de **Aviso urgente**. Cuando pasa la
fecha elegida, deja de destacarse solo. El motivo interno nunca sale de Nexo.

**Modelo de datos.** En `contenidos`:

| Campo | Para qué |
|---|---|
| `prioridad` | `{ nivel: "normal" \| "urgente", motivo, vence, marcadoPor, marcadoEn }`: la vigente en el circuito (ordena las bandejas) |
| `prioridadPublicada` | La que se aprobó con la versión visible: la web la usa aunque después se prepare otra versión |
| `borrador.prioridad` | `{ nivel, motivo, vence }`: lo que elige quien escribe |

Los tres son opcionales para el `$jsonSchema`: un contenido anterior sin el campo es de prioridad normal, así que no
hace falta migrar datos. La vista `vista_publicaciones` expone solo `nivel` y `vence`. El índice
`ix_contenidos_bandeja` (`estado`, `prioridad.nivel` descendente, `actualizadoEn`) sirve a las bandejas: "urgente"
queda antes que "normal" al ordenar el texto de forma descendente.

```
GET   /api/contenidos?prioridad=urgente|normal&orden=prioridad   listado con filtro y orden de bandeja
GET   /api/contenidos/bandeja?prioridad=urgente                  lo que espera una acción de quien pide, urgente primero
PATCH /api/contenidos/:id/prioridad                              { nivel, motivo, vence: "2026-10-20" | null } (revisores)
GET   /api/publico/sitios/:sitio/publicaciones?urgentes=1        urgentes vigentes primero, con "urgente" y "urgenteHasta"
```

La bandeja devuelve `{ contenidos, total, urgentes }`. Para el director de área (y el administrador): lo que está en
revisión de dirección, sin lo propio. Para la autoridad superior: lo elevado y lo aprobado. Colaborador y observador
reciben 403. En los envíos (`POST /api/borradores`, `PUT /api/contenidos/:id/borrador`, `POST /api/contenidos`) la
prioridad va en el campo `prioridad` con el mismo formato.

**Sitios externos.** Para mostrar un banner de urgencia en el portal de Adultos Mayores o en el de Mama Antula, alcanza
con pedir `GET /api/publico/sitios/<sitio>/publicaciones?urgentes=1` y, si la lista no está vacía, dibujar el primero
como aviso destacado (`titulo`, `resumen`, `urgenteHasta`).

**Instalaciones existentes:** correr `npm run bd:iniciar` (actualiza la validación, crea el índice de bandeja y la vista
con la prioridad). No borra datos.

## Control y auditoría (solo administrador)

Vista **Control y auditoría** del panel, con dos pestañas:

- **Log de movimientos**: quién (nombre, correo y rol), cuándo (fecha y hora exactas), dónde (módulo del portal,
  IP, red, sede y país si se conocen) y qué hizo, con el resultado. Búsqueda, períodos rápidos, rango de fechas,
  filtros por integrante, módulo, acción y resultado, paginación, detalle técnico de cada registro y exportación CSV.
- **Directorio de integrantes**: todas las personas registradas, también las dadas de baja, con rol, estado,
  contacto (correo, teléfono y área), alta, último acceso y actividad de los últimos 30 días.

**Registro automático.** El middleware `backend/src/auditoria/registro.js`, montado en `/api`, reconoce cada
movimiento según el catálogo `backend/src/auditoria/catalogo.js` (método + ruta → acción, módulo y cómo redactar el
detalle) y lo guarda al terminar la respuesta. Registra también lo **rechazado** (un pedido sin permiso, un ingreso
fallido) con su motivo. Si la escritura falla, el pedido se atiende igual. No se registran las lecturas comunes ni las
miniaturas de imágenes (`?miniatura=1`): sí abrir un archivo en el visor y descargarlo.

**Colección `auditoria`.** Un documento por movimiento, aparte de `usuarios`, con `$jsonSchema` e índices por fecha,
persona, acción, módulo y resultado. La identidad se guarda como era en ese momento. La cuenta de la aplicación
(`nexo_app`) solo puede **agregar y leer** registros: no los puede editar ni borrar.

```
GET /api/auditoria?desde=2026-10-01&hasta=2026-10-05&usuario=<id>&accion=decision.aprobar,contenido.publicar
                  &modulo=Gobernanza&resultado=rechazado&q=becas&pagina=1&porPagina=25
GET /api/auditoria/resumen     indicadores (hoy, integrantes activos, ingresos fallidos, rechazados)
GET /api/auditoria/catalogo    módulos y acciones para los filtros
GET /api/auditoria/exportar    CSV con los mismos filtros (máx. 10.000 filas; también queda auditado)
GET /api/directorio            todas las personas, con contacto y actividad
```

Todas exigen el permiso `auditoria` (solo el rol administrador) con `requerirPermiso` y en el servicio.

| Variable | Para qué |
|---|---|
| `AUDITORIA_SEDES` | Nombra la sede según la IP: `10.0.1.0/24=Sede Central;10.0.2.0/24=Residencia Mama Antula` |
| `AUDITORIA_CABECERA_PAIS` | Cabecera con el país que agrega un proxy de confianza (ej. `cf-ipcountry`) |
| `CONFIAR_PROXY` | Detrás de nginx o Cloudflare: saltos a creerle a `X-Forwarded-For` (ej. `1`), para obtener la IP real |
| `AUDITORIA_DIAS` | Retención: con un número mayor a 0, un índice TTL borra lo más viejo. Por defecto se conserva todo |

La IP no se geolocaliza con servicios externos. Para ubicar por ciudad haría falta una base GeoIP (ej. MaxMind
GeoLite2). La semilla (`bd:sembrar`) no genera registros: la auditoría solo guarda movimientos reales hechos a
través de la API. En modo demo la actividad se guarda en el navegador e incluye registros de ejemplo.

**Instalaciones existentes:** correr `npm run bd:iniciar` (crea la colección y sus índices) y volver a correr
`backend/bd/usuario-app.mongosh.js` para sumarle a `nexo_app` el permiso de agregar y leer la auditoría.

## Circuito

| Estado | Qué significa | Quién actúa |
|---|---|---|
| `borrador` | Trabajo en curso, privado de su autor | El autor: edita, adjunta, envía o descarta |
| `en_revision` | Revisión de dirección | Director de área (no el autor de esa versión): eleva o devuelve con observaciones |
| `elevado` | Pendiente de la decisión final | Autoridad superior: aprueba (y se publica), devuelve o rechaza |
| `devuelto` | **Observado**: volvió al autor con observaciones (obligatorias) del director o de la autoridad | Solo el autor corrige y reenvía; la nueva versión vuelve a empezar por `en_revision` |
| `aprobado` | Aprobado sin publicar: solo lo restaurado del archivo | Autoridad superior: publica |
| `rechazado` | Cerrado por la autoridad superior (motivo obligatorio). No admite nuevas versiones | Se puede archivar |
| `publicado` | Visible en sus sitios (`destinoPublicado`) | Autor, director o administrador: **editar** (versión nueva). Ellos y la autoridad: **dar de baja** |
| `archivado` | Dado de baja: oculto del público, con todo su registro | Autor, director, administrador o autoridad: reactivar (vuelve al estado que tenía; no republica) |

```
POST /api/contenidos/:id/revision   { decision: "elevar" | "devolver", comentario }               nivel 2
POST /api/contenidos/:id/decision   { decision: "aprobar" | "devolver" | "rechazar", comentario } nivel 3
POST /api/contenidos/:id/publicar   (solo para volver a publicar lo restaurado del archivo)       nivel 3
```

Cada versión guarda las dos instancias por separado: `revision` (quién elevó o devolvió en dirección) y `decision`
(qué resolvió la autoridad superior). Aprobar publica en el mismo paso: el historial registra `aprobacion` y
`publicacion` ("Publicación automática al aprobar"). Una versión nueva de algo publicado no retira la anterior hasta
que la nueva recorra la cadena y se apruebe.

### Actualizar una base existente

Corré `npm run bd:iniciar` (no borra datos; también actualiza el esquema para el campo opcional `cuerpoHtml` y arma
`observaciones` en los contenidos anteriores a partir de sus devoluciones guardadas). El esquema nuevo agrega estados, eventos y el campo `revision`, que es
opcional para que las versiones anteriores sigan siendo válidas. Después:

- Asigná el rol **Autoridad superior** desde Equipo y roles: hasta que exista una, lo elevado queda en espera (la
  bandeja de revisión lo avisa).
- Lo que había quedado `en_revision` sigue ahí y ahora pasa por la revisión de dirección.
- Lo que había quedado `aprobado` sin publicar queda así: lo publica la autoridad superior desde su bandeja.
- `sitio` (un texto) pasa a `sitiosDestino` (arreglo), lo publicado recibe `destinoPublicado` y `sitio-3` pasa a
  `centro-de-dia`. La migración es idempotente: se puede correr varias veces.

## Contenido completo con formato y formatos de imagen

### Editor de "Contenido completo"

El campo usa **Quill 2** (servido desde `frontend/vendor/quill/`, sin CDN: la CSP `script-src 'self'` sigue igual). La barra
ofrece solo lo que admiten los sitios: **título H2, subtítulo H3, negrita, cursiva, lista con viñetas, lista numerada,
enlace y alineación** (izquierda, centro, derecha, justificado), más "quitar formato". Atajos: Ctrl+B, Ctrl+I, Ctrl+K.

- Lo pegado desde Word o la web se reduce a esos formatos (H1 pasa a H2; H4–H6 a H3; colores, fuentes, imágenes y tablas
  se descartan).
- Los enlaces aceptan `https://`, `http://`, `mailto:` y `tel:`; `www.sitio.gob.ar` se completa con `https://`.
- Si Quill no carga, queda el cuadro de texto simple de antes (el contenido se guarda sin formato).

Cada versión y cada borrador guardan dos campos:

| Campo | Qué es |
|---|---|
| `cuerpoHtml` | el HTML del editor, **limpio** (`backend/src/texto-enriquecido.js`, lista blanca con sanitize-html) |
| `cuerpo` | el mismo contenido como texto, derivado por el servidor (búsquedas, auditoría, validación de "obligatorio") |

Los contenidos anteriores solo tienen `cuerpo` (`cuerpoHtml: null`) y se siguen mostrando como párrafos. La API pública
devuelve ambos campos. Antes de mostrarlo, el panel, la vista pública, el widget `nexo-sitio.js` y `nexo-cliente.js` de los
sitios **vuelven a filtrar** el HTML con la misma lista blanca (se reconstruye nodo por nodo en un `<template>`); nunca se
inserta HTML recibido sin filtrar. La auditoría distingue "Editó texto" de "Editó formato del texto".

Sobre `npm audit`: Quill 2.0.3 tiene un aviso de severidad baja (GHSA-v3m3-f69x-jf25) sobre el HTML que exporta
`getSemanticHTML`. En Nexo ese HTML nunca se muestra tal cual: lo limpia el servidor al guardarlo y cada sitio otra vez al
mostrarlo.

### Imágenes: JPG, PNG, WEBP y AVIF

Además de JPG, JPEG y PNG se aceptan **`.webp`** y **`.avif`** (fotos de galerías, portadas de noticias, adjuntos). Igual que
el resto, se validan en el navegador (extensión) y en el servidor (`backend/src/servicios/adjuntos.js`):

1. la extensión tiene que estar en la lista;
2. el tipo MIME que informa el navegador tiene que corresponder (`image/webp` / `image/avif`; algunos sistemas los
   informan como `application/octet-stream`, que se acepta solo para estas extensiones);
3. la **firma real** del archivo: WEBP = contenedor `RIFF....WEBP`; AVIF = caja `ftyp` con la marca `avif` o `avis`.

Se guardan siempre con su tipo real (`image/webp`, `image/avif`), así cuentan como fotos de la galería y se sirven con el
`Content-Type` correcto. Los navegadores actuales (Chrome, Edge, Firefox y Safari 16+) muestran ambos formatos.

## Modo demo vs. modo servidor

Abriendo `frontend/index.html` directamente el sitio funciona en **modo demo** (datos en el navegador, con un selector
para ver el panel como cada rol). Servido por el backend pasa solo a **modo servidor**: `/js/config.js` lo entrega el
servidor y `js/api-servidor.js` reemplaza la demo por llamadas a la API.

## Pruebas

```bash
DB_NAME_PRUEBAS=nexo_pruebas npm test
```

Necesitan un MongoDB real (local o Atlas) y recrean la base de pruebas en cada archivo (se niegan a correr si el nombre no
contiene "prueba" o "test"). Cubren permisos por rol, circuito completo, concurrencia, validación del esquema, índices,
vista pública, inyección NoSQL, CSRF, límite de intentos de login, validación de archivos y el frontend real conectado al
backend real.

## Seguridad incluida

Contraseñas con bcrypt · sesiones en base con token guardado como hash y cookie HttpOnly/SameSite · límite de intentos de
login · verificación de Origin (CSRF) · los datos del usuario siempre llegan como texto o como ObjectId válido, nunca como
operadores de MongoDB · validación `$jsonSchema` en la base · cabeceras de seguridad (helmet + CSP) · adjuntos validados por
extensión, tipo y firma real (también WEBP y AVIF), guardados con nombre generado por el servidor · HTML del editor filtrado con lista blanca en el servidor y otra vez al mostrarlo · la API pública solo lee `vista_publicaciones`.

## Pendiente antes de producción

- HTTPS y `NODE_ENV=production` (cookies `Secure`, HSTS).
- Backups de la base (`mongodump`) y de la carpeta `almacen/`.
- Usar el usuario `nexo_app` con permisos mínimos (ver puesta en marcha, paso 3).
- El límite de intentos de login vive en memoria: con varias instancias hay que moverlo a la base o a un caché compartido.
- Que cada persona pueda cambiar su propia contraseña (hoy la restablece el administrador desde Equipo y roles).
- Envío de invitaciones por correo en lugar de contraseña provisional, si se configura un servidor de correo.
- Login con proveedor institucional (SSO) si la institución lo usa.
- Paginación del listado de contenidos si el volumen crece. Cada documento de MongoDB admite hasta 16 MB: alcanza para
  cientos de versiones de un mismo contenido (los archivos adjuntos van a disco, no a la base).
- Sin triggers en MongoDB, que el texto de una versión anterior no se reescriba lo garantiza la aplicación (y el usuario
  `nexo_app` impide borrar). Si se necesita una garantía a nivel base, se puede mover el historial a una colección aparte
  con permiso de solo inserción.
