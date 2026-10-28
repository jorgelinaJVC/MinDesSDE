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

