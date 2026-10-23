<?php

require_once '../backend-contenidos/auth.php';
require_once '../backend-contenidos/config.php';

exigirAutenticacion();
header('Content-Type: text/html; charset=utf-8');

$adminNombre = $_SESSION['admin_nombre'] ?? 'Administrador';
$adminRol = $_SESSION['admin_rol'] ?? 'admin_area';
$adminAreaId = $_SESSION['admin_area_id'] ?? null;
$esSuperAdmin = ($adminRol === 'superadmin');
$nombreArea = 'Sin área asignada';

if ($esSuperAdmin) {

    $nombreArea = 'Acceso a todas las áreas';

} elseif ($adminAreaId !== null) {

    $stmtArea = $pdo->prepare(
        "SELECT nombre
         FROM areas
         WHERE id = ?
         AND activo = 1
         LIMIT 1"
    );

    $stmtArea->execute([$adminAreaId]);

    $area = $stmtArea->fetch();

    if ($area) {
        $nombreArea = $area['nombre'];
    }
}

?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Panel de Contenidos - Ministerio de Desarrollo Social</title>
<link rel="stylesheet" href="../css/panel-contenidos.css?v=4">
</head>
<body>
<div class="admin-layout">
<aside class="sidebar">
  <div class="brand"><div class="brand-mark">MDS</div><div><strong>Ministerio</strong><span>Panel de contenidos</span></div></div>
  <nav class="menu">
    <button data-section="dashboard" class="active">📊 <span>Dashboard</span></button>
    <button data-section="noticias">📰 <span>Noticias</span></button>
    <?php if ($esSuperAdmin): ?>

    <button data-section="solicitudes">
    ⏳
    <span>
        Solicitudes pendientes
        <strong
            id="contadorSolicitudes"
            class="contador-solicitudes"
        >
            0
        </strong>
    </span>
    </button>

    <?php endif; ?>
    <button data-section="carrusel">🖼️ <span>Carrusel</span></button>
    <button data-section="videos">▶️ <span>Videos</span></button>
    <button data-section="areas">🏛️ <span>Áreas</span></button>
    <?php if ($esSuperAdmin): ?>
        <button data-section="usuarios">
            👥 <span>Usuarios</span>
        </button>
        <button data-section="auditoria">
            📋 <span>Auditoría</span>
        </button>
    <?php endif; ?>
    <button data-section="papelera">🗑️ <span>Papelera</span></button>
  </nav>
  <div class="sidebar-footer">SIDES</div>
</aside>
<main class="main">
<header class="topbar">

    <div>
        <h1 id="pageTitle">Dashboard</h1>

        <p id="pageDescription">
            Resumen general del contenido institucional.
        </p>
    </div>

    <div class="topbar-actions">
        <div class="admin-info">
            <strong>
                <?= htmlspecialchars($adminNombre) ?>
            </strong>

            <span class="admin-role">
              <?= $esSuperAdmin
                  ? 'SuperAdministrador'
                  : 'Administrador de Área' ?>
            </span>

            <small>
               <?= htmlspecialchars($nombreArea) ?>
            </small>

    </div>
        <button
            id="btnCambiarMiPassword"
            class="btn-secondary"
            type="button"
       >
           🔑 Cambiar contraseña
        </button>

        <a
            href="../backend-contenidos/logout.php"
            class="btn-secondary"
        >
            Cerrar sesión
        </a>
    </div>

</header>

<section id="dashboard" class="section active">
  <div class="stats-grid">
    <article class="stat"><span>Noticias</span><strong id="statNoticias">0</strong></article>
    <article class="stat"><span>Slides activos</span><strong id="statCarrusel">0</strong></article>
    <article class="stat"><span>Videos</span><strong id="statVideos">0</strong></article>
    <article class="stat"><span>Áreas activas</span><strong id="statAreas">0</strong></article>
    <article class="stat warning"><span>Papelera</span><strong id="statPapelera">0</strong></article>
  </div>
  <div class="dashboard-grid"><div class="panel"><div class="panel-head"><h2>Actividad reciente</h2></div><div id="actividadReciente" class="activity-list"></div></div><div class="panel"><div class="panel-head"><h2>Estado del sistema</h2></div><div class="system-status"><p><b>Modo:</b> <span id="modoSistema">Backend</span></p><p><b>API:</b> <span id="estadoApi">Conectada</span></p><p><b>Datos:</b> <span id="estadoDatos">API / MySQL</span></p></div></div></div>
</section>

<section id="noticias" class="section">
    <div class="section-head">
        <div>
            <h2>Noticias</h2>
            <p>Crear y administrar publicaciones institucionales.</p>
        </div>
        <button id="btnNuevaNoticia" class="btn-primary">+ Nueva noticia</button>
    </div>
    <div class="filters">
        <input id="buscarNoticias" placeholder="Buscar noticia...">
        <select id="filtroArea">
            <option value="">Todas las áreas</option>
        </select>
        <select id="filtroEstado">
            <option value="">Todos los estados</option>
            <option value="Borrador">Borrador</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Publicada">Publicada</option>
            <option value="Rechazada">Rechazada</option>
        </select>
    </div>
    <div id="listaNoticias" class="cards-grid"></div>
</section>

<section id="carrusel" class="section">
    <div class="section-head">
        <div>
            <h2>Carrusel principal</h2>
            <p>Administrá las imágenes destacadas de la portada.</p>
        </div>
        <button id="btnNuevoSlide" class="btn-primary">+ Nuevo slide</button>
    </div>
    <div id="listaCarrusel" class="cards-grid"></div>
</section>

<section id="videos" class="section">
    <div class="section-head">
        <div>
            <h2>Videos</h2>
            <p>Publicá videos de YouTube o subí videos propios.</p>
        </div>
        <button id="btnNuevoVideo" class="btn-primary">+ Nuevo video</button>
    </div>
    <div id="listaVideos" class="cards-grid"></div>
</section>

<section id="areas" class="section">
    <div class="section-head">
        <div>
            <h2>Áreas</h2>
            <p>Consultá las áreas institucionales disponibles para la gestión de contenidos.</p>
        </div>
    </div>
    <div id="listaAreas" class="cards-grid"></div>
</section>
<?php if ($esSuperAdmin): ?>

<section id="solicitudes" class="section">

    <div class="section-head">

        <div>
            <h2>Solicitudes pendientes</h2>
            <p>
                Revisá las publicaciones enviadas por
                los administradores de área.
            </p>
        </div>

    </div>

    <div id="listaSolicitudes" class="cards-grid">

        <div class="empty">
            No hay solicitudes pendientes.
        </div>

    </div>

</section>


<section id="usuarios" class="section">

    <div class="section-head">

        <div>
            <h2>Usuarios administrativos</h2>

            <p>
                Administrá los usuarios con acceso al panel.
            </p>
        </div>

        <button
            id="btnNuevoUsuario"
            class="btn-primary"
            type="button"
        >
            + Nuevo administrador
        </button>

    </div>


    <div class="usuarios-resumen">

        <div class="stat-card">

            <span>Total usuarios</span>

            <strong id="totalUsuarios">
                0
            </strong>

        </div>


        <div class="stat-card">

            <span>Usuarios activos</span>

            <strong id="usuariosActivos">
                0
            </strong>

        </div>


        <div class="stat-card">

            <span>Administradores de área</span>

            <strong id="totalAdminsArea">
                0
            </strong>

        </div>

    </div>


    <div id="listaUsuarios" class="usuarios-lista">
        <div class="empty">
            Cargando usuarios...
        </div>

    </div>

</section>
<!-- ========================================
     AUDITORÍA
     SOLO SUPERADMIN
========================================= -->

<section id="auditoria" class="section">

    <div class="section-head">

        <div>
            <h2>Historial de auditoría</h2>

            <p>
                Consultá las acciones realizadas
                por los usuarios administrativos.
            </p>
        </div>

    </div>
    <!-- FILTROS DE AUDITORÍA -->

<div class="auditoria-filtros">

    <div class="auditoria-filtro auditoria-filtro-busqueda">

        <label for="filtroAuditoriaTexto">
            Buscar
        </label>

        <input
            type="search"
            id="filtroAuditoriaTexto"
            placeholder="Usuario, descripción o entidad..."
            autocomplete="off"
        >

    </div>


    <div class="auditoria-filtro">

        <label for="filtroAuditoriaAccion">
            Acción
        </label>

        <select id="filtroAuditoriaAccion">
            <option value="">
                Todas las acciones
            </option>
        </select>

    </div>


    <div class="auditoria-filtro">

        <label for="filtroAuditoriaArea">
            Área
        </label>

        <select id="filtroAuditoriaArea">
            <option value="">
                Todas las áreas
            </option>
        </select>

    </div>


    <button
        type="button"
        id="btnLimpiarAuditoria"
        class="btn-light"
    >
        Limpiar filtros
    </button>

</div>


    <div id="listaAuditoria">

        <div class="empty">
            Cargando historial de auditoría...
        </div>

    </div>

</section>
<?php endif; ?>
<section id="papelera" class="section"><div class="section-head"><div><h2>Papelera</h2><p>Restaurá contenidos o eliminá definitivamente.</p></div></div><div id="listaPapelera" class="cards-grid"></div></section>
</main></div>

<!-- MODAL GENÉRICO -->
<div id="modal" class="modal"><div class="modal-box"><div class="modal-head"><div><h2 id="modalTitle">Nuevo</h2><p id="modalSubtitle"></p></div><button id="modalClose" class="close">×</button></div><form id="modalForm"></form></div></div>
<div id="toast" class="toast"></div>
<!-- ========================================
     MODAL NUEVO ADMINISTRADOR
========================================= -->

<div
    id="modalNuevoUsuario"
    class="modal"
>

    <div class="modal-box">

        <div class="modal-head">

            <div>
                <h2>Nuevo administrador</h2>

                <p>
                    Creá un usuario y asignalo
                    a un área institucional.
                </p>
            </div>

            <button
                type="button"
                id="cerrarModalUsuario"
                class="close"
                aria-label="Cerrar"
            >
                ×
            </button>

        </div>


        <form id="formNuevoUsuario">

            <div class="modal-body">

                <div class="form-grid">

                    <div class="field">

                        <label for="nuevoUsuarioNombre">
                            Nombre completo
                        </label>

                        <input
                            id="nuevoUsuarioNombre"
                            name="nombre"
                            type="text"
                            maxlength="120"
                            required
                            autocomplete="name"
                            placeholder="Ej.: María Pérez"
                        >

                    </div>


                    <div class="field">

                        <label for="nuevoUsuarioLogin">
                            Nombre de usuario
                        </label>

                        <input
                            id="nuevoUsuarioLogin"
                            name="usuario"
                            type="text"
                            minlength="4"
                            maxlength="40"
                            required
                            autocomplete="off"
                            placeholder="Ej.: admin8"
                        >

                        <small>
                            Sin espacios. Podés usar letras,
                            números, punto, guion o guion bajo.
                        </small>

                    </div>


                    <div class="field">

                        <label for="nuevoUsuarioArea">
                            Área
                        </label>

                        <select
                            id="nuevoUsuarioArea"
                            name="area_id"
                            required
                        >

                            <option value="">
                                Seleccionar área
                            </option>

                        </select>

                    </div>


                    <div class="field">

                        <label for="nuevoUsuarioPassword">
                            Contraseña inicial
                        </label>

                        <input
                            id="nuevoUsuarioPassword"
                            name="password"
                            type="password"
                            minlength="8"
                            required
                            autocomplete="new-password"
                            placeholder="Mínimo 8 caracteres"
                        >

                    </div>

                </div>


                <div class="field">

                    <label for="nuevoUsuarioPassword2">
                        Repetir contraseña
                    </label>

                    <input
                        id="nuevoUsuarioPassword2"
                        type="password"
                        minlength="8"
                        required
                        autocomplete="new-password"
                        placeholder="Repetí la contraseña"
                    >

                </div>


                <div
                    id="errorNuevoUsuario"
                    class="form-error"
                    hidden
                ></div>

            </div>


            <div class="modal-footer">

                <button
                    type="button"
                    id="cancelarNuevoUsuario"
                    class="btn-light"
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    id="guardarNuevoUsuario"
                    class="btn-primary"
                >
                    Crear administrador
                </button>

            </div>

        </form>

    </div>

</div>
<!-- ========================================
     MODAL EDITAR ADMINISTRADOR
========================================= -->

<div
    id="modalEditarUsuario"
    class="modal"
>

    <div class="modal-box">

        <div class="modal-head">

            <div>
                <h2>Editar administrador</h2>

                <p>
                    Modificá los datos y el área
                    asignada al administrador.
                </p>
            </div>

            <button
                type="button"
                id="cerrarModalEditarUsuario"
                class="close"
                aria-label="Cerrar"
            >
                ×
            </button>

        </div>


        <form id="formEditarUsuario">

            <div class="modal-body">

                <input
                    type="hidden"
                    id="editarUsuarioId"
                    name="id"
                >


                <div class="form-grid">

                    <div class="field">

                        <label for="editarUsuarioNombre">
                            Nombre completo
                        </label>

                        <input
                            type="text"
                            id="editarUsuarioNombre"
                            name="nombre"
                            maxlength="120"
                            required
                        >

                    </div>


                    <div class="field">

                        <label for="editarUsuarioLogin">
                            Nombre de usuario
                        </label>

                        <input
                            type="text"
                            id="editarUsuarioLogin"
                            name="usuario"
                            minlength="4"
                            maxlength="40"
                            required
                        >

                    </div>


                    <div class="field">

                        <label for="editarUsuarioArea">
                            Área
                        </label>

                        <select
                            id="editarUsuarioArea"
                            name="area_id"
                            required
                        >
                            <option value="">
                                Seleccionar área
                            </option>
                        </select>

                    </div>

                </div>


                <div
                    id="errorEditarUsuario"
                    class="form-error"
                    hidden
                ></div>

            </div>


            <div class="modal-footer">

                <button
                    type="button"
                    id="cancelarEditarUsuario"
                    class="btn-light"
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    id="guardarEditarUsuario"
                    class="btn-primary"
                >
                    Guardar cambios
                </button>

            </div>

        </form>

    </div>

</div>
<!-- ========================================
     MODAL RESTABLECER CONTRASEÑA
========================================= -->

<div
    id="modalResetPassword"
    class="modal"
>

    <div class="modal-box">

        <div class="modal-head">

            <div>
                <h2>Restablecer contraseña</h2>

                <p>
                    Asigná una nueva contraseña
                    al administrador.
                </p>
            </div>

            <button
                type="button"
                id="cerrarModalResetPassword"
                class="close"
                aria-label="Cerrar"
            >
                ×
            </button>

        </div>


        <form id="formResetPassword">

            <div class="modal-body">

                <input
                    type="hidden"
                    id="resetPasswordUsuarioId"
                >


                <div class="field">

                    <label>
                        Administrador
                    </label>

                    <strong
                        id="resetPasswordNombreUsuario"
                    >
                        -
                    </strong>

                </div>


                <div class="field">

                    <label for="resetPasswordNueva">
                        Nueva contraseña
                    </label>

                    <input
                        type="password"
                        id="resetPasswordNueva"
                        minlength="8"
                        required
                        autocomplete="new-password"
                        placeholder="Mínimo 8 caracteres"
                    >

                </div>


                <div class="field">

                    <label for="resetPasswordConfirmar">
                        Confirmar contraseña
                    </label>

                    <input
                        type="password"
                        id="resetPasswordConfirmar"
                        minlength="8"
                        required
                        autocomplete="new-password"
                        placeholder="Repetí la nueva contraseña"
                    >

                </div>


                <div
                    id="errorResetPassword"
                    class="form-error"
                    hidden
                ></div>

            </div>


            <div class="modal-footer">

                <button
                    type="button"
                    id="cancelarResetPassword"
                    class="btn-light"
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    id="guardarResetPassword"
                    class="btn-primary"
                >
                    Guardar contraseña
                </button>

            </div>

        </form>

    </div>

</div>
<!-- ========================================
     MODAL CAMBIAR MI CONTRASEÑA
========================================= -->

<div
    id="modalCambiarMiPassword"
    class="modal"
>

    <div class="modal-box">

        <div class="modal-head">

            <div>
                <h2>Cambiar mi contraseña</h2>

                <p>
                    Ingresá tu contraseña actual
                    y elegí una nueva.
                </p>
            </div>

            <button
                type="button"
                id="cerrarModalCambiarMiPassword"
                class="close"
                aria-label="Cerrar"
            >
                ×
            </button>

        </div>


        <form id="formCambiarMiPassword">

            <div class="modal-body">

                <div class="field">

                    <label for="miPasswordActual">
                        Contraseña actual
                    </label>

                    <input
                        type="password"
                        id="miPasswordActual"
                        required
                        autocomplete="current-password"
                        placeholder="Ingresá tu contraseña actual"
                    >

                </div>


                <div class="field">

                    <label for="miPasswordNueva">
                        Nueva contraseña
                    </label>

                    <input
                        type="password"
                        id="miPasswordNueva"
                        minlength="8"
                        required
                        autocomplete="new-password"
                        placeholder="Mínimo 8 caracteres"
                    >

                </div>


                <div class="field">

                    <label for="miPasswordConfirmar">
                        Confirmar nueva contraseña
                    </label>

                    <input
                        type="password"
                        id="miPasswordConfirmar"
                        minlength="8"
                        required
                        autocomplete="new-password"
                        placeholder="Repetí la nueva contraseña"
                    >

                </div>


                <div
                    id="errorCambiarMiPassword"
                    class="form-error"
                    hidden
                ></div>

            </div>


            <div class="modal-footer">

                <button
                    type="button"
                    id="cancelarCambiarMiPassword"
                    class="btn-light"
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    id="guardarCambiarMiPassword"
                    class="btn-primary"
                >
                    Cambiar contraseña
                </button>

            </div>

        </form>

    </div>

</div>
<script>
window.ADMIN_SESSION = {
    id: <?= json_encode($_SESSION['admin_id'] ?? null) ?>,
    rol: <?= json_encode($_SESSION['admin_rol'] ?? 'admin_area') ?>,
    areaId: <?= json_encode($_SESSION['admin_area_id'] ?? null) ?>,
    nombre: <?= json_encode($_SESSION['admin_nombre'] ?? 'Administrador') ?>,
    csrfToken: <?= json_encode(obtenerTokenCsrf()) ?>
};
</script>
<script src="../js/panel-contenidos.js?v=5"></script>
</body>
</html>