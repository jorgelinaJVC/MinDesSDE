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

Proyecto web desarrollado como práctica de diseño y desarrollo front-end.
Representa una página institucional del Ministerio de Desarrollo Social.

---

📌 Descripción

Este proyecto consiste en una página web estática creada con tecnologías básicas de desarrollo web.
Incluye estructura HTML, estilos en CSS y funcionalidades con JavaScript.

---

🚀 Tecnologías utilizadas

- HTML5
- CSS3
- JavaScript
- React
- Node.Js
- MySQL

---

📁 Estructura del proyecto

MinDesSDE/
├── index.html
├── styles.css
├── script.js
└── imagenes/

---

🖼️ Contenido

El sitio incluye:

- Encabezado con logo institucional
- Secciones informativas
- Imágenes representativas
- Estilos personalizados

---

▶️ Cómo ejecutar el proyecto

1. Descargar o clonar el repositorio
2. Abrir el archivo "index.html" en un navegador

---

👩‍💻 Autores
Belen Banegas
Jorgelina Campos
Aldana Maguna
Milagros Ortiz
Fabricio Pavon

---

📄 Estado del proyecto

En desarrollo 🚧

---

🔗 Conexión con Nexo institucional

Las secciones de Noticias, Galería y Proyectos de los tres sitios muestran lo que la Autoridad Superior
aprobó en Nexo para cada sitio:

| Página | Sitio en Nexo |
|---|---|
| indexAdultos.html | adultos-mayores |
| mama-antula.html | mama-antula |
| centro-dia.html | centro-de-dia |

Las tres secciones (Noticias, Galería y Proyectos) tienen la misma estructura HTML, las mismas clases y la misma
maquetación en los tres sitios, tomadas del Centro de Día:

    section#novedades.section-block.seccion-contenido
      .container > .section-header (.section-kicker, .section-title, .section-description)
      .cards-grid.grid-3[data-nexo="noticia"]  > article.news-item
    section#galeria.section-block.bg-soft.seccion-contenido
      .container > .section-header + .gallery-layout[data-nexo="galeria"] > figure.gallery-cell
    section#proyectos.section-block.bg-soft.seccion-contenido
      .container > .section-header + .cards-grid.grid-3[data-nexo="proyecto"] > .project-card

Cuadrículas: 3 columnas en escritorio, 2 en tablet (hasta 991px) y 1 en celular (hasta 599px). Cada sitio conserva
sus colores y la fuente de sus títulos (Montserrat en Adultos Mayores, Lora en las residencias); medidas,
espacios y tarjetas son iguales en los tres.

Archivos:

- css/adultos/secciones-contenido.css — la maquetación compartida de las tres secciones (única fuente de estilo).
- js/nexo/config.js — dirección de Nexo. Es lo único que hay que cambiar al publicar.
- js/nexo/nexo-cliente.js — pide las publicaciones a Nexo, botón «Ver todas», álbum y visor de fotos.
- js/nexo/secciones.js — dibuja las tarjetas (el mismo archivo en los tres sitios).
- css/adultos/nexo.css — marca de prioritario, franja de avisos, detalle, álbum, visor y estados.

En el HTML, cada página tiene <meta name="nexo-sitio" content="...">, <body data-sitio="..."> y los contenedores marcados con
data-nexo="noticia", data-nexo="galeria" y data-nexo="proyecto". Las tarjetas escritas en el HTML quedan como
respaldo: si Nexo no responde, el sitio las sigue mostrando.

Los avisos prioritarios aparecen primero, con la marca «Prioritario», y además en una franja arriba de las noticias.
Lo que se aprueba en Nexo aparece al recargar la página.

Cada sección muestra primero las últimas 6 publicaciones (dos filas completas; 4, 3 y 4 en celulares). Si hay más, debajo aparece el botón «Ver todas las
noticias» (o «Ver todos los proyectos / álbumes»): trae las siguientes de a 24 desde Nexo, «Cargar más» sigue
trayendo mientras queden, y al final «Mostrar solo las últimas» vuelve a la portada. Las cantidades se cambian en
js/nexo/config.js, o por sección con data-nexo-portada (y data-nexo-portada-celular) en el HTML.

Las noticias y los proyectos se abren en un detalle centrado en la pantalla. Las galerías se ven como álbum: una
cuadrícula de miniaturas del mismo tamaño; al tocar una, la foto se amplía en un visor centrado sobre fondo oscuro,
con flechas para pasar de foto (también con el teclado o deslizando en el celular) y se cierra con la X, con Escape
o tocando el fondo. La foto principal de una noticia también se amplía al tocarla.

El texto completo llega con el formato que se le dio en el editor de Nexo: títulos, subtítulos, negrita, cursiva,
listas con viñetas o numeradas, enlaces (se abren en otra pestaña) y alineación. Antes de mostrarlo, nexo-cliente.js
lo vuelve a filtrar y descarta cualquier otra cosa (scripts, imágenes incrustadas, estilos). Las publicaciones
anteriores, sin formato, se siguen viendo como párrafos. Las fotos pueden ser JPG, PNG, WEBP o AVIF.

♿ Accesibilidad (igual en los tres sitios)

El botón flotante de accesibilidad es el mismo en indexAdultos.html, habilitacion.html, mama-antula.html y centro-dia.html:
mismo HTML, mismos IDs y clases, y un único script.

- js/comun/accesibilidad.js — tamaño del texto (80 % a 150 %, de a 10), alto contraste y resaltar enlaces. Va como primer
  elemento de <body> para aplicar la preferencia antes de dibujar la página (sin parpadeo).
- css/comun/accesibilidad.css — abrir/cerrar el panel, estados (+ y − en el límite, botones activos), foco con teclado y
  posición en el celular. Se enlaza después de la hoja de cada sitio: cada sitio conserva sus colores.

El tamaño se aplica en el font-size de <html> y todas las tipografías de los sitios están en rem, así que el texto
escala completo y parejo (los títulos fluidos con vw usan la variable --escala-texto). El widget en sí queda en px
para que los botones no se muevan mientras se usan.

La preferencia se guarda en localStorage (clave "red-adultos-mayores.accesibilidad") y vale para los tres sitios
mientras se sirvan desde el mismo dominio; si hay otra pestaña de la red abierta, se actualiza sola. Si en producción
cada sitio tiene un dominio distinto, cada uno recuerda su propia preferencia (el navegador no comparte localStorage
entre dominios).

IDs que el script reconoce: accessibility-toggle, accessibility-panel, btn-desc-font, font-size-indicator,
btn-inc-font, btn-toggle-contrast, btn-toggle-links, btn-reset-accessibility.

Ya no se usan (se pueden borrar): js/adultos/accessibility.js, js/adultos/style-mamaantula.js y js/adultos/centro-dia.js.

