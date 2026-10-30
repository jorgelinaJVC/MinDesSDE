<?php
require __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

function input()
{
    return json_decode(file_get_contents('php://input'), true) ?: [];
}
function out($data, $status = 200)
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function mapTipo($t)
{
    $m = ['noticias' => 'noticia', 'carrusel' => 'carrusel', 'galeria' => 'galeria', 'videos' => 'video', 'areas' => 'area'];
    return $m[$t] ?? $t;
}
function esUrlYoutubeSegura(string $url): bool
{
    $url = trim($url);

    if ($url === '') {
        return false;
    }

    if (
        filter_var(
            $url,
            FILTER_VALIDATE_URL
        ) === false
    ) {
        return false;
    }

    $partes = parse_url($url);

    if (
        !is_array($partes) ||
        strtolower($partes['scheme'] ?? '') !== 'https'
    ) {
        return false;
    }

    $host =
        strtolower(
            $partes['host'] ?? ''
        );

    $ruta =
        $partes['path'] ?? '';

    /*
       youtube.com/watch?v=XXXXXXXXXXX
    */

    if (
        $host === 'youtube.com' ||
        $host === 'www.youtube.com'
    ) {

        if ($ruta === '/watch') {

            parse_str(
                $partes['query'] ?? '',
                $parametros
            );

            $id =
                $parametros['v'] ?? '';

            return preg_match(
                '/^[A-Za-z0-9_-]{11}$/',
                $id
            ) === 1;
        }

        /*
           youtube.com/embed/XXXXXXXXXXX
        */

        if (
            preg_match(
                '#^/embed/([A-Za-z0-9_-]{11})/?$#',
                $ruta
            ) === 1
        ) {
            return true;
        }

        return false;
    }

    /*
       youtu.be/XXXXXXXXXXX
    */

    if (
        $host === 'youtu.be' ||
        $host === 'www.youtu.be'
    ) {

        return preg_match(
            '#^/([A-Za-z0-9_-]{11})/?$#',
            $ruta
        ) === 1;
    }

    return false;
}


function esRutaVideoPropioSegura(string $url): bool
{
    return preg_match(
        '#^\.\./uploads/videos/[a-f0-9]{32}\.(mp4|webm)$#i',
        trim($url)
    ) === 1;
}
/* =========================================
   ROLES Y PERMISOS
========================================= */

function esSuperAdmin(): bool
{
    return isset($_SESSION['admin_rol'])
        && $_SESSION['admin_rol'] === 'superadmin';
}

function usuarioActualId(): ?int
{
    return isset($_SESSION['admin_id'])
        ? (int)$_SESSION['admin_id']
        : null;
}

function areaActualId(): ?int
{
    return isset($_SESSION['admin_area_id'])
        && $_SESSION['admin_area_id'] !== null
        ? (int)$_SESSION['admin_area_id']
        : null;
}
function areasPermitidasActuales(): array
{
    $areaId = areaActualId();

    if ($areaId === null) {
        return [];
    }

    /*
       Regla jerárquica:

       Área 6:
       Subsecretaría de Promoción Humana

       También administra:
       Área 8: Viviendas
    */

    if ($areaId === 6) {
        return [6, 8];
    }

    return [$areaId];
}


function puedeGestionarArea(?int $areaContenidoId): bool
{
    if (esSuperAdmin()) {
        return true;
    }

    if ($areaContenidoId === null) {
        return false;
    }

    return in_array(
        $areaContenidoId,
        areasPermitidasActuales(),
        true
    );
}
/* =========================================
   AUDITORÍA
========================================= */

function registrarAuditoria(
    PDO $pdo,
    string $accion,
    string $descripcion,
    ?string $entidad = null,
    ?int $entidadId = null
): void {
    /*
       El usuario se obtiene directamente
       desde la sesión.

       Nunca recibimos usuario_id desde
       JavaScript.
    */

    $usuarioId =
        usuarioActualId();


    /*
       Si no existe un usuario autenticado,
       esta función no registra la acción.

       Más adelante el login tendrá un
       tratamiento específico.
    */

    if ($usuarioId === null) {
        return;
    }


    /*
       Limitar los tamaños para que coincidan
       con las columnas de MySQL.
    */

    $accion =
        substr(
            trim($accion),
            0,
            80
        );

    $descripcion =
        substr(
            trim($descripcion),
            0,
            255
        );

    if ($entidad !== null) {

        $entidad =
            substr(
                trim($entidad),
                0,
                50
            );
    }


    /*
       No registrar datos incompletos.
    */

    if (
        $accion === '' ||
        $descripcion === ''
    ) {
        return;
    }


    /*
       Insertar registro de auditoría.
    */

    $stAuditoria =
        $pdo->prepare(
            "INSERT INTO auditoria
            (
                usuario_id,
                accion,
                descripcion,
                entidad,
                entidad_id
            )
            VALUES (?, ?, ?, ?, ?)"
        );


    $stAuditoria->execute([
        $usuarioId,
        $accion,
        $descripcion,
        $entidad,
        $entidadId
    ]);
}
function obtenerContenido(int $id, PDO $pdo)
{
    $st = $pdo->prepare(
        "SELECT *
         FROM contenidos
         WHERE id = ?
         LIMIT 1"
    );

    $st->execute([$id]);

    return $st->fetch();
}


function puedeGestionarContenido(array $contenido): bool
{
    /*
       El SuperAdministrador puede gestionar
       cualquier contenido.
    */

    if (esSuperAdmin()) {
        return true;
    }


    /*
       Por ahora la restricción estricta
       por área se aplica a:

       - Noticias
       - Carrusel
       - Videos
    */

    if (
        !in_array(
            $contenido['tipo'],
            ['noticia', 'carrusel', 'video'],
            true
        )
    ) {
        return true;
    }


    /*
       Noticias y Carrusel deben pertenecer
       a un área permitida para el usuario.
    */

    $areaContenidoId =
        isset($contenido['area_id']) &&
        $contenido['area_id'] !== null
        ? (int)$contenido['area_id']
        : null;

    return puedeGestionarArea(
        $areaContenidoId
    );
}
$action = $_GET['action'] ?? 'list';
/* =========================================
   SEGURIDAD DE LA API
========================================= */

$accionesPublicas = [
    'ping',
    'public-list'
];

if (!in_array($action, $accionesPublicas, true)) {

    if (!usuarioAutenticado()) {

        out([
            'ok' => false,
            'message' => 'No autorizado'
        ], 401);
    }
}
/* =========================================
   PROTECCIÓN CSRF
   SOLO OPERACIONES QUE MODIFICAN DATOS
========================================= */

if (
    $_SERVER['REQUEST_METHOD'] === 'POST' &&
    !in_array($action, $accionesPublicas, true)
) {

    $tokenCsrf =
        $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;

    if (!validarTokenCsrf($tokenCsrf)) {

        out([
            'ok' => false,
            'message' =>
            'Token CSRF inválido o ausente'
        ], 403);
    }
}

try {
    if ($action === 'ping') out(['ok' => true, 'message' => 'API funcionando']);
    /* =========================================
   ÁREAS PARA USUARIOS
   SOLO SUPERADMIN
========================================= */

    if ($action === 'areas-users-list') {

        if (!esSuperAdmin()) {
            out([
                'ok' => false,
                'message' =>
                'Solo el SuperAdministrador puede consultar las áreas'
            ], 403);
        }

        $st = $pdo->prepare(
            "SELECT
            id,
            nombre,
            codigo,
            area_padre_id,
            activo
         FROM areas
         WHERE activo = 1
         ORDER BY id ASC"
        );

        $st->execute();


        out([
            'ok' => true,
            'data' => $st->fetchAll()
        ]);
    }
    /* =========================================
   ÁREAS - LISTAR
   USUARIOS AUTENTICADOS
========================================= */

    if ($action === 'areas-list') {

        $st = $pdo->prepare(
            "SELECT
            id,
            nombre,
            codigo,
            area_padre_id,
            activo
         FROM areas
         WHERE activo = 1
         ORDER BY id ASC"
        );

        $st->execute();

        out([
            'ok' => true,
            'data' => $st->fetchAll()
        ]);
    }
    /* =========================================
   AUDITORÍA - LISTAR
   SOLO SUPERADMIN
========================================= */

    if ($action === 'audit-list') {

        /*
       Seguridad:
       solamente el SuperAdministrador
       puede consultar el historial.
    */

        if (!esSuperAdmin()) {

            out([
                'ok' => false,
                'message' =>
                'Solo el SuperAdministrador puede consultar la auditoría'
            ], 403);
        }


        /*
       Obtener los registros junto con
       los datos del usuario responsable.
    */

        $st = $pdo->prepare(
            "SELECT
            au.id,
            au.usuario_id,
            au.accion,
            au.descripcion,
            au.entidad,
            au.entidad_id,
            au.fecha,

            u.usuario,
            u.nombre AS usuario_nombre,

            ar.nombre AS area_nombre

         FROM auditoria au

         LEFT JOIN usuarios_admin u
            ON u.id = au.usuario_id

         LEFT JOIN areas ar
            ON ar.id = u.area_id

         ORDER BY
            au.fecha DESC,
            au.id DESC

         LIMIT 500"
        );


        $st->execute();


        out([
            'ok' => true,
            'data' => $st->fetchAll()
        ]);
    }
    /* =========================================
   USUARIOS - LISTAR
   SOLO SUPERADMIN
========================================= */

    if ($action === 'users-list') {

        if (!esSuperAdmin()) {

            out([
                'ok' => false,
                'message' =>
                'Solo el SuperAdministrador puede administrar usuarios'
            ], 403);
        }


        $st = $pdo->prepare(
            "SELECT
            u.id,
            u.usuario,
            u.nombre,
            u.rol,
            u.area_id,
            u.activo,
            u.ultimo_acceso,
            u.fecha_creacion,
            u.fecha_modificacion,
            a.nombre AS area_nombre
         FROM usuarios_admin u
         LEFT JOIN areas a
            ON a.id = u.area_id
         ORDER BY
            CASE
                WHEN u.rol = 'superadmin' THEN 0
                ELSE 1
            END,
            u.nombre ASC"
        );

        $st->execute();

        out([
            'ok' => true,
            'data' => $st->fetchAll()
        ]);
    }
    /* =========================================
   USUARIOS - CREAR
   SOLO SUPERADMIN
========================================= */

    if ($action === 'user-create') {

        if (!esSuperAdmin()) {

            out([
                'ok' => false,
                'message' =>
                'Solo el SuperAdministrador puede crear usuarios'
            ], 403);
        }


        $d = input();


        $nombre =
            trim($d['nombre'] ?? '');

        $usuario =
            trim($d['usuario'] ?? '');

        $password =
            $d['password'] ?? '';

        $areaId =
            isset($d['area_id'])
            ? (int)$d['area_id']
            : 0;


        /* -------------------------
       VALIDACIONES
    ------------------------- */

        if ($nombre === '') {

            out([
                'ok' => false,
                'message' =>
                'El nombre es obligatorio'
            ], 400);
        }


        if ($usuario === '') {

            out([
                'ok' => false,
                'message' =>
                'El usuario es obligatorio'
            ], 400);
        }


        /*
       Solo letras, números,
       punto, guion y guion bajo.
    */

        if (
            !preg_match(
                '/^[a-zA-Z0-9._-]{4,40}$/',
                $usuario
            )
        ) {

            out([
                'ok' => false,
                'message' =>
                'El usuario debe tener entre 4 y 40 caracteres y no contener espacios'
            ], 400);
        }


        if (strlen($password) < 8) {

            out([
                'ok' => false,
                'message' =>
                'La contraseña debe tener al menos 8 caracteres'
            ], 400);
        }


        if ($areaId <= 0) {

            out([
                'ok' => false,
                'message' =>
                'Debés seleccionar un área'
            ], 400);
        }


        /*
       Verificar que el área exista
       y esté activa.
    */

        $stArea = $pdo->prepare(
            "SELECT id
         FROM areas
         WHERE id = ?
         AND activo = 1
         LIMIT 1"
        );

        $stArea->execute([
            $areaId
        ]);


        if (!$stArea->fetch()) {

            out([
                'ok' => false,
                'message' =>
                'El área seleccionada no existe o está inactiva'
            ], 400);
        }


        /*
       Usuario duplicado
    */

        $stUsuario = $pdo->prepare(
            "SELECT id
         FROM usuarios_admin
         WHERE usuario = ?
         LIMIT 1"
        );

        $stUsuario->execute([
            $usuario
        ]);


        if ($stUsuario->fetch()) {

            out([
                'ok' => false,
                'message' =>
                'Ese nombre de usuario ya está registrado'
            ], 409);
        }


        /*
       Hashear contraseña
    */

        $passwordHash =
            password_hash(
                $password,
                PASSWORD_DEFAULT
            );


        if ($passwordHash === false) {

            out([
                'ok' => false,
                'message' =>
                'No se pudo proteger la contraseña'
            ], 500);
        }


        /*
       CREAR

       Desde este formulario solamente
       creamos administradores de área.

       Nadie puede convertirse en
       SuperAdmin enviando "rol" desde JS.
    */

        $st = $pdo->prepare(
            "INSERT INTO usuarios_admin
        (
            usuario,
            password,
            nombre,
            rol,
            area_id,
            activo
        )
        VALUES
        (
            ?,
            ?,
            ?,
            'admin_area',
            ?,
            1
        )"
        );


        $st->execute([
            $usuario,
            $passwordHash,
            $nombre,
            $areaId
        ]);
        /* -------------------------
     AUDITORÍA
    ------------------------- */
        $nuevoUsuarioId =
            (int)$pdo->lastInsertId();
        registrarAuditoria(
            $pdo,
            'CREAR_USUARIO',
            'Creó el administrador ' . $usuario,
            'usuario',
            $nuevoUsuarioId
        );


        out([
            'ok' => true,
            'message' =>
            'Administrador creado correctamente',

            'id' =>
            (int)$pdo->lastInsertId()
        ]);
    }
    /* =========================================
   USUARIOS - EDITAR
   SOLO SUPERADMIN
========================================= */

    if ($action === 'user-update') {

        if (!esSuperAdmin()) {

            out([
                'ok' => false,
                'message' =>
                'Solo el SuperAdministrador puede editar usuarios'
            ], 403);
        }


        $d = input();

        $id =
            isset($d['id'])
            ? (int)$d['id']
            : 0;

        $nombre =
            trim($d['nombre'] ?? '');

        $usuario =
            trim($d['usuario'] ?? '');

        $areaId =
            isset($d['area_id'])
            ? (int)$d['area_id']
            : 0;


        if ($id <= 0) {

            out([
                'ok' => false,
                'message' => 'Usuario inválido'
            ], 400);
        }


        if ($nombre === '') {

            out([
                'ok' => false,
                'message' =>
                'El nombre es obligatorio'
            ], 400);
        }


        if (
            !preg_match(
                '/^[a-zA-Z0-9._-]{4,40}$/',
                $usuario
            )
        ) {

            out([
                'ok' => false,
                'message' =>
                'El nombre de usuario no es válido'
            ], 400);
        }


        /*
       Buscar usuario actual.
    */

        $stActual = $pdo->prepare(
            "SELECT id, rol
         FROM usuarios_admin
         WHERE id = ?
         LIMIT 1"
        );

        $stActual->execute([$id]);

        $usuarioActual =
            $stActual->fetch();


        if (!$usuarioActual) {

            out([
                'ok' => false,
                'message' =>
                'El usuario no existe'
            ], 404);
        }


        /*
       En este formulario NO permitimos
       modificar al SuperAdministrador.
    */

        if (
            $usuarioActual['rol']
            === 'superadmin'
        ) {

            out([
                'ok' => false,
                'message' =>
                'El SuperAdministrador no puede modificarse desde esta opción'
            ], 403);
        }


        if ($areaId <= 0) {

            out([
                'ok' => false,
                'message' =>
                'Debés seleccionar un área'
            ], 400);
        }


        /*
       Verificar área.
    */

        $stArea = $pdo->prepare(
            "SELECT id
         FROM areas
         WHERE id = ?
         AND activo = 1
         LIMIT 1"
        );

        $stArea->execute([$areaId]);


        if (!$stArea->fetch()) {

            out([
                'ok' => false,
                'message' =>
                'El área seleccionada no existe o está inactiva'
            ], 400);
        }


        /*
       Evitar usuarios duplicados,
       ignorando el usuario que estamos editando.
    */

        $stDuplicado = $pdo->prepare(
            "SELECT id
         FROM usuarios_admin
         WHERE usuario = ?
         AND id <> ?
         LIMIT 1"
        );

        $stDuplicado->execute([
            $usuario,
            $id
        ]);


        if ($stDuplicado->fetch()) {

            out([
                'ok' => false,
                'message' =>
                'Ese nombre de usuario ya está registrado'
            ], 409);
        }


        /*
       Actualizar solamente los datos permitidos.

       NO modificamos:
       - contraseña
       - rol
       - activo
    */

        $st = $pdo->prepare(
            "UPDATE usuarios_admin
         SET nombre = ?,
             usuario = ?,
             area_id = ?
         WHERE id = ?
         AND rol = 'admin_area'"
        );

        $st->execute([
            $nombre,
            $usuario,
            $areaId,
            $id
        ]);
        /* -------------------------
          AUDITORÍA
     ------------------------- */
        registrarAuditoria(
            $pdo,
            'EDITAR_USUARIO',
            'Editó el administrador ' . $usuario,
            'usuario',
            $id
        );


        out([
            'ok' => true,
            'message' =>
            'Administrador actualizado correctamente'
        ]);
    }
    /* =========================================
   USUARIOS - ACTIVAR / DESACTIVAR
   SOLO SUPERADMIN
========================================= */

    if ($action === 'user-toggle-active') {

        if (!esSuperAdmin()) {

            out([
                'ok' => false,
                'message' =>
                'Solo el SuperAdministrador puede cambiar el estado de usuarios'
            ], 403);
        }


        $d = input();

        $id =
            isset($d['id'])
            ? (int)$d['id']
            : 0;


        if ($id <= 0) {

            out([
                'ok' => false,
                'message' =>
                'Usuario inválido'
            ], 400);
        }


        /*
       Buscar usuario.
    */

        $stUsuario = $pdo->prepare(
            "SELECT
            id,
            nombre,
            usuario,
            rol,
            activo
         FROM usuarios_admin
         WHERE id = ?
         LIMIT 1"
        );

        $stUsuario->execute([$id]);

        $usuario =
            $stUsuario->fetch();


        if (!$usuario) {

            out([
                'ok' => false,
                'message' =>
                'El usuario no existe'
            ], 404);
        }


        /*
       Nunca permitimos desactivar
       al SuperAdministrador.
    */

        if (
            $usuario['rol']
            === 'superadmin'
        ) {

            out([
                'ok' => false,
                'message' =>
                'No se puede desactivar al SuperAdministrador'
            ], 403);
        }


        /*
       Cambiar:
       1 -> 0
       0 -> 1
    */

        $nuevoEstado =
            (int)$usuario['activo'] === 1
            ? 0
            : 1;


        $st = $pdo->prepare(
            "UPDATE usuarios_admin
         SET activo = ?
         WHERE id = ?
         AND rol = 'admin_area'"
        );

        $st->execute([
            $nuevoEstado,
            $id
        ]);
        /* -------------------------
        AUDITORÍA
     ------------------------- */

        $accionAuditoria =
            $nuevoEstado === 1
            ? 'ACTIVAR_USUARIO'
            : 'DESACTIVAR_USUARIO';


        $descripcionAuditoria =
            $nuevoEstado === 1
            ? 'Activó el administrador ' . $usuario['usuario']
            : 'Desactivó el administrador ' . $usuario['usuario'];


        registrarAuditoria(
            $pdo,
            $accionAuditoria,
            $descripcionAuditoria,
            'usuario',
            $id
        );


        out([
            'ok' => true,

            'message' =>
            $nuevoEstado === 1
                ? 'Administrador activado correctamente'
                : 'Administrador desactivado correctamente',

            'activo' =>
            $nuevoEstado
        ]);
    }
    /* =========================================
   USUARIOS - RESTABLECER CONTRASEÑA
   SOLO SUPERADMIN
========================================= */

    if ($action === 'user-reset-password') {

        /*
       Seguridad:
       solamente el SuperAdministrador
       puede restablecer contraseñas.
    */

        if (!esSuperAdmin()) {

            out([
                'ok' => false,
                'message' =>
                'Solo el SuperAdministrador puede restablecer contraseñas'
            ], 403);
        }


        $d = input();


        $id =
            isset($d['id'])
            ? (int)$d['id']
            : 0;


        $password =
            $d['password'] ?? '';


        /* -------------------------
       VALIDACIONES
    ------------------------- */

        if ($id <= 0) {

            out([
                'ok' => false,
                'message' =>
                'Usuario inválido'
            ], 400);
        }


        if (strlen($password) < 8) {

            out([
                'ok' => false,
                'message' =>
                'La contraseña debe tener al menos 8 caracteres'
            ], 400);
        }


        /*
       Buscar el usuario.
    */

        $stUsuario = $pdo->prepare(
            "SELECT
            id,
            usuario,
            nombre,
            rol
         FROM usuarios_admin
         WHERE id = ?
         LIMIT 1"
        );


        $stUsuario->execute([
            $id
        ]);


        $usuario =
            $stUsuario->fetch();


        if (!$usuario) {

            out([
                'ok' => false,
                'message' =>
                'El usuario no existe'
            ], 404);
        }


        /*
       No modificamos la contraseña del
       SuperAdministrador desde esta opción.
    */

        if ($usuario['rol'] === 'superadmin') {

            out([
                'ok' => false,
                'message' =>
                'No se puede restablecer la contraseña del SuperAdministrador desde esta opción'
            ], 403);
        }


        /*
       Generar hash seguro.
       Nunca guardamos la contraseña
       escrita directamente en MySQL.
    */

        $passwordHash =
            password_hash(
                $password,
                PASSWORD_DEFAULT
            );


        if ($passwordHash === false) {

            out([
                'ok' => false,
                'message' =>
                'No se pudo proteger la contraseña'
            ], 500);
        }


        /*
       Actualizar contraseña.
    */

        $st = $pdo->prepare(
            "UPDATE usuarios_admin
         SET password = ?
         WHERE id = ?
         AND rol = 'admin_area'"
        );


        $st->execute([
            $passwordHash,
            $id
        ]);


        if ($st->rowCount() !== 1) {

            out([
                'ok' => false,
                'message' =>
                'No se pudo restablecer la contraseña'
            ], 500);
        }
        /* -------------------------
          AUDITORÍA
      ------------------------- */

        registrarAuditoria(
            $pdo,
            'RESET_PASSWORD',
            'Restableció la contraseña del administrador ' . $usuario['usuario'],
            'usuario',
            $id
        );



        out([
            'ok' => true,
            'message' =>
            'Contraseña restablecida correctamente'
        ]);
    }
    /* =========================================
   USUARIOS - CAMBIAR MI CONTRASEÑA
   USUARIO AUTENTICADO
========================================= */

    if ($action === 'change-own-password') {

        $d = input();


        $passwordActual =
            $d['password_actual'] ?? '';

        $passwordNueva =
            $d['password_nueva'] ?? '';


        /* -------------------------
       USUARIO ACTUAL
    ------------------------- */

        $usuarioId =
            usuarioActualId();


        if ($usuarioId === null) {

            out([
                'ok' => false,
                'message' =>
                'No hay una sesión válida'
            ], 401);
        }


        /* -------------------------
       VALIDACIONES
    ------------------------- */

        if ($passwordActual === '') {

            out([
                'ok' => false,
                'message' =>
                'Debés ingresar tu contraseña actual'
            ], 400);
        }


        if (strlen($passwordNueva) < 8) {

            out([
                'ok' => false,
                'message' =>
                'La nueva contraseña debe tener al menos 8 caracteres'
            ], 400);
        }


        if ($passwordActual === $passwordNueva) {

            out([
                'ok' => false,
                'message' =>
                'La nueva contraseña debe ser diferente de la actual'
            ], 400);
        }


        /* -------------------------
       BUSCAR USUARIO
    ------------------------- */

        $stUsuario = $pdo->prepare(
            "SELECT
            id,
            usuario,
            password,
            activo
         FROM usuarios_admin
         WHERE id = ?
         LIMIT 1"
        );


        $stUsuario->execute([
            $usuarioId
        ]);


        $usuario =
            $stUsuario->fetch();


        if (!$usuario) {

            out([
                'ok' => false,
                'message' =>
                'El usuario no existe'
            ], 404);
        }


        /*
       La cuenta debe continuar activa.
    */

        if ((int)$usuario['activo'] !== 1) {

            out([
                'ok' => false,
                'message' =>
                'La cuenta se encuentra inactiva'
            ], 403);
        }


        /* -------------------------
       VERIFICAR CONTRASEÑA ACTUAL
    ------------------------- */

        if (
            !password_verify(
                $passwordActual,
                $usuario['password']
            )
        ) {

            out([
                'ok' => false,
                'message' =>
                'La contraseña actual es incorrecta'
            ], 403);
        }


        /* -------------------------
       GENERAR NUEVO HASH
    ------------------------- */

        $passwordHash =
            password_hash(
                $passwordNueva,
                PASSWORD_DEFAULT
            );


        if ($passwordHash === false) {

            out([
                'ok' => false,
                'message' =>
                'No se pudo proteger la nueva contraseña'
            ], 500);
        }


        /* -------------------------
       ACTUALIZAR
    ------------------------- */

        $st = $pdo->prepare(
            "UPDATE usuarios_admin
         SET password = ?
         WHERE id = ?
         AND activo = 1"
        );


        $st->execute([
            $passwordHash,
            $usuarioId
        ]);


        if ($st->rowCount() !== 1) {

            out([
                'ok' => false,
                'message' =>
                'No se pudo cambiar la contraseña'
            ], 500);
        }
        /* -------------------------
         AUDITORÍA
      ------------------------- */

        registrarAuditoria(
            $pdo,
            'CAMBIAR_PASSWORD',
            'Cambió su propia contraseña',
            'usuario',
            $usuarioId
        );


        out([
            'ok' => true,
            'message' =>
            'Contraseña cambiada correctamente'
        ]);
    }
    /*
   LISTADO PÚBLICO
   Este endpoint se utiliza exclusivamente
   desde el sitio web público.

   Aunque exista una sesión administrativa,
   solamente devuelve contenido publicado,
   activo y no eliminado.
*/

    if ($action === 'public-list') {

        $tipo = mapTipo($_GET['tipo'] ?? '');

        if (!in_array($tipo, ['noticia', 'carrusel', 'video'], true)) {
            out([
                'ok' => false,
                'message' => 'Tipo de contenido público no válido'
            ], 400);
        }

        $st = $pdo->prepare(
            "SELECT *
         FROM contenidos
         WHERE tipo = ?
         AND estado = 'Publicada'
         AND activo = 1
         AND eliminado = 0
         ORDER BY orden ASC, fecha_creacion DESC"
        );

        $st->execute([
            $tipo
        ]);

        out([
            'ok' => true,
            'data' => $st->fetchAll()
        ]);
    }
    if ($action === 'list') {

        $tipo = mapTipo($_GET['tipo'] ?? '');

        if (!$tipo) {
            out([
                'ok' => false,
                'message' => 'Falta tipo'
            ], 400);
        }


        /*
       NOTICIAS
    */

        if ($tipo === 'noticia') {

            /*
           SUPERADMIN:
           puede consultar todas las noticias.

           IMPORTANTE:
           list sigue siendo usado por la página pública,
           por eso si NO hay usuario autenticado
           solamente devolvemos Publicadas.
        */

            if (usuarioAutenticado()) {

                if (esSuperAdmin()) {

                    $st = $pdo->prepare(
                        "SELECT *
                     FROM contenidos
                     WHERE tipo = 'noticia'
                     AND eliminado = 0
                     ORDER BY orden ASC,
                              fecha_creacion DESC"
                    );

                    $st->execute();
                } else {
                    $areasPermitidas = areasPermitidasActuales();
                    if (empty($areasPermitidas)) {
                        out([
                            'ok' => false,
                            'message' =>
                            'El usuario no tiene un área asignada'
                        ], 403);
                    }
                    $marcadores =
                        implode(
                            ',',
                            array_fill(
                                0,
                                count($areasPermitidas),
                                '?'
                            )
                        );
                    $st = $pdo->prepare(
                        "SELECT *
                                    FROM contenidos
                                    WHERE tipo = 'noticia'
                                    AND area_id IN ($marcadores)
                                    AND eliminado = 0
                                    ORDER BY orden ASC,
                                    fecha_creacion DESC"
                    );
                    $st->execute(
                        $areasPermitidas
                    );
                }
            } else {

                /*
               VISITANTE / WEB PÚBLICA
            */

                $st = $pdo->prepare(
                    "SELECT *
                 FROM contenidos
                 WHERE tipo = 'noticia'
                 AND estado = 'Publicada'
                 AND activo = 1
                 AND eliminado = 0
                 ORDER BY orden ASC,
                          fecha_creacion DESC"
                );

                $st->execute();
            }


            out([
                'ok' => true,
                'data' => $st->fetchAll()
            ]);
        }
        /*
   =========================================
   CARRUSEL - FILTRO POR ÁREA
   =========================================

   SUPERADMIN:
   puede consultar todos los slides.

   ADMIN DE ÁREA:
   solamente puede consultar los slides
   pertenecientes a su propia área.

   WEB PÚBLICA:
   solamente recibe slides publicados,
   activos y no eliminados.
*/

        if ($tipo === 'carrusel') {

            /*
       PANEL ADMINISTRATIVO
    */

            if (usuarioAutenticado()) {

                /*
           SUPERADMIN
        */

                if (esSuperAdmin()) {

                    $st = $pdo->prepare(
                        "SELECT *
                 FROM contenidos
                 WHERE tipo = 'carrusel'
                 AND eliminado = 0
                 ORDER BY orden ASC,
                          fecha_creacion DESC"
                    );

                    $st->execute();
                } else {

                    /*
               ADMINISTRADOR DE ÁREA
            */
                    $areasPermitidas =
                        areasPermitidasActuales();

                    if (empty($areasPermitidas)) {

                        out([
                            'ok' => false,
                            'message' =>
                            'El usuario no tiene un área asignada'
                        ], 403);
                    }


                    /*
   Áreas que puede consultar el administrador.

   Admin6:
   Área 6 - Promoción Humana
   Área 8 - Viviendas
*/

                    $marcadores =
                        implode(
                            ',',
                            array_fill(
                                0,
                                count($areasPermitidas),
                                '?'
                            )
                        );


                    $st = $pdo->prepare(
                        "SELECT *
     FROM contenidos
     WHERE tipo = 'carrusel'
     AND area_id IN ($marcadores)
     AND eliminado = 0
     ORDER BY orden ASC,
              fecha_creacion DESC"
                    );

                    $st->execute(
                        $areasPermitidas
                    );
                }
            } else {

                /*
           PÁGINA WEB PÚBLICA
        */

                $st = $pdo->prepare(
                    "SELECT *
             FROM contenidos
             WHERE tipo = 'carrusel'
             AND estado = 'Publicada'
             AND activo = 1
             AND eliminado = 0
             ORDER BY orden ASC,
                      fecha_creacion DESC"
                );

                $st->execute();
            }


            out([
                'ok' => true,
                'data' => $st->fetchAll()
            ]);
        }
        /*
        =========================================
        VIDEOS - FILTRO POR ÁREA
        =========================================

        SUPERADMIN:
        puede consultar todos los videos.

        ADMIN DE ÁREA:
        solamente puede consultar videos
        pertenecientes a sus áreas permitidas.
        */

        if ($tipo === 'video') {

            /*
               SUPERADMIN
            */

            if (esSuperAdmin()) {

                $st = $pdo->prepare(
                    "SELECT *
                     FROM contenidos
                     WHERE tipo = 'video'
                     AND eliminado = 0
                     ORDER BY orden ASC,
                              fecha_creacion DESC"
                );

                $st->execute();
            } else {

                /*
                   ADMINISTRADOR DE ÁREA
                */

                $areasPermitidas =
                    areasPermitidasActuales();

                if (empty($areasPermitidas)) {

                    out([
                        'ok' => false,
                        'message' =>
                        'El usuario no tiene un área asignada'
                    ], 403);
                }

                /*
                   Crear ?,?,... según las áreas
                   permitidas.

                   Admin6 tendrá:
                   6 y 8.
                */

                $marcadores =
                    implode(
                        ',',
                        array_fill(
                            0,
                            count($areasPermitidas),
                            '?'
                        )
                    );

                $st = $pdo->prepare(
                    "SELECT *
                     FROM contenidos
                     WHERE tipo = 'video'
                     AND area_id IN ($marcadores)
                     AND eliminado = 0
                     ORDER BY orden ASC,
                              fecha_creacion DESC"
                );

                $st->execute(
                    $areasPermitidas
                );
            }

            out([
                'ok' => true,
                'data' => $st->fetchAll()
            ]);
        }


        /*
       OTROS CONTENIDOS

       Por ahora conservamos su comportamiento
       actual para no romper Carrusel/Videos.
    */

        $st = $pdo->prepare(
            "SELECT *
         FROM contenidos
         WHERE tipo = ?
         AND eliminado = 0
         ORDER BY orden ASC,
                  fecha_creacion DESC"
        );

        $st->execute([
            $tipo
        ]);

        out([
            'ok' => true,
            'data' => $st->fetchAll()
        ]);
    }

    if ($action === 'create') {

        $d = input();

        if (
            empty($d['tipo']) ||
            empty($d['titulo'])
        ) {
            out([
                'ok' => false,
                'message' => 'Faltan datos'
            ], 400);
        }

        $tipo = mapTipo($d['tipo']);
        $usuarioId = usuarioActualId();
        /*
   Área donde se guardará el contenido.
*/

        $areaId = areaActualId();


        /*
   Para Noticias y Carrusel permitimos
   recibir area_id desde el formulario,
   pero SIEMPRE lo validamos en PHP.
*/

        if (
            in_array(
                $tipo,
                ['noticia', 'carrusel', 'video'],
                true
            )
        ) {

            /*
       SuperAdmin:
       por ahora mantenemos su comportamiento
       actual. No recibe un área automáticamente.
    */

            if (!esSuperAdmin()) {

                $areaSolicitada =
                    isset($d['area_id']) &&
                    $d['area_id'] !== ''
                    ? (int)$d['area_id']
                    : $areaId;
                /*
           Seguridad:

           El área solicitada debe pertenecer
           a las áreas permitidas del usuario.

           Ejemplo Admin6:
           6 -> permitido
           8 -> permitido
           3 -> rechazado
        */

                if (
                    !puedeGestionarArea(
                        $areaSolicitada
                    )
                ) {

                    out([
                        'ok' => false,
                        'message' =>
                        'No tenés permiso para crear contenido en esta área'
                    ], 403);
                }


                /*
           Una vez validada, usamos
           el área solicitada.
        */

                $areaId = $areaSolicitada;
            }
        }

        $estado = $d['estado'] ?? 'Borrador';
        $activo = $d['activo'] ?? 1;
        /*
   REGLA DE SEGURIDAD PARA CARRUSEL

   Cada administrador de área solamente
   puede crear slides asociados a su área.
*/
        if ($tipo === 'carrusel' && !esSuperAdmin()) {

            if ($areaId === null) {

                out([
                    'ok' => false,
                    'message' => 'El usuario no tiene un área asignada'
                ], 403);
            }
            /*
       Un administrador de área nunca puede
       crear directamente un slide publicado.

       Aunque manipule JavaScript o la petición,
       PHP fuerza estos valores.
    */

            $estado = 'Borrador';
            $activo = 0;
        }

        /*
   REGLA DE SEGURIDAD PARA NOTICIAS

   Un administrador de área nunca puede
   crear directamente una noticia Publicada.
*/
        if ($tipo === 'noticia' && !esSuperAdmin()) {

            if ($areaId === null) {
                out([
                    'ok' => false,
                    'message' => 'El usuario no tiene un área asignada'
                ], 403);
            }

            $estado = 'Borrador';
        }
        /*
   REGLA DE SEGURIDAD PARA VIDEOS

   Un administrador de área nunca puede
   crear directamente un video publicado.

   El video debe comenzar como Borrador
   y luego ser enviado a aprobación.
*/
        if ($tipo === 'video') {

            $urlVideo =
                trim($d['url'] ?? '');

            if ($urlVideo === '') {

                out([
                    'ok' => false,
                    'message' =>
                    'El video es obligatorio'
                ], 400);
            }
            $esVideoPropio =
                esRutaVideoPropioSegura(
                    $urlVideo
                );
            $esYoutube =
                esUrlYoutubeSegura(
                    $urlVideo
                );

            if (
                !$esYoutube &&
                !$esVideoPropio
            ) {
                out([
                    'ok' => false,
                    'message' =>
                    'Solo se permiten URLs HTTPS válidas de YouTube o videos propios MP4/WEBM'
                ], 400);
            }
        }

        if ($tipo === 'video' && !esSuperAdmin()) {

            if ($areaId === null) {

                out([
                    'ok' => false,
                    'message' =>
                    'El usuario no tiene un área asignada'
                ], 403);
            }

            $estado = 'Borrador';
            $activo = 0;
        }

        $st = $pdo->prepare(
            "INSERT INTO contenidos(
        usuario_id,
        area_id,
        tipo,
        titulo,
        categoria,
        resumen,
        descripcion,
        imagen,
        url,
        estado,
        orden,
        activo
    )
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)"
        );

        $st->execute([
            $usuarioId,
            in_array($tipo, ['noticia', 'carrusel', 'video'], true) ? $areaId : null,
            $tipo,
            $d['titulo'],
            $d['categoria'] ?? null,
            $d['resumen'] ?? null,
            $d['descripcion'] ?? null,
            $d['imagen'] ?? null,
            $d['url'] ?? null,
            $estado,
            $d['orden'] ?? 1,
            $activo
        ]);
        /* -------------------------
       AUDITORÍA
      ------------------------- */

        $nuevoContenidoId =
            (int)$pdo->lastInsertId();
        if ($tipo === 'noticia') {
            registrarAuditoria(
                $pdo,
                'CREAR_NOTICIA',
                'Creó una noticia',
                'noticia',
                $nuevoContenidoId
            );
        }
        if ($tipo === 'carrusel') {
            registrarAuditoria(
                $pdo,
                'CREAR_CARRUSEL',
                'Creó un slide del carrusel',
                'carrusel',
                $nuevoContenidoId
            );
        }
        if ($tipo === 'video') {
            registrarAuditoria(
                $pdo,
                'CREAR_VIDEO',
                'Creó un video',
                'video',
                $nuevoContenidoId
            );
        }

        out([
            'ok' => true,
            'id' => $pdo->lastInsertId()
        ]);
    }
    /* =========================================
   ENVIAR NOTICIA A APROBACIÓN
========================================= */

    if ($action === 'submit-news') {

        $d = input();

        $id = (int)($d['id'] ?? 0);

        if ($id <= 0) {
            out([
                'ok' => false,
                'message' => 'Falta id de la noticia'
            ], 400);
        }

        if (esSuperAdmin()) {
            out([
                'ok' => false,
                'message' => 'Esta acción corresponde a administradores de área'
            ], 403);
        }

        $areasPermitidas =
            areasPermitidasActuales();

        if (empty($areasPermitidas)) {

            out([
                'ok' => false,
                'message' =>
                'El usuario no tiene un área asignada'
            ], 403);
        }


        /*
   Crear los marcadores SQL según
   las áreas permitidas.

   Admin6:
   [6, 8] -> ?,?
*/

        $marcadores =
            implode(
                ',',
                array_fill(
                    0,
                    count($areasPermitidas),
                    '?'
                )
            );


        $st = $pdo->prepare(
            "UPDATE contenidos
     SET estado = 'Pendiente',
         motivo_rechazo = NULL
     WHERE id = ?
     AND tipo = 'noticia'
     AND area_id IN ($marcadores)
     AND eliminado = 0
     AND estado IN ('Borrador', 'Rechazada')"
        );


        /*
   El primer ? corresponde al ID.
   Los siguientes corresponden
   a las áreas permitidas.
*/

        $parametros = array_merge(
            [$id],
            $areasPermitidas
        );

        $st->execute(
            $parametros
        );

        if ($st->rowCount() !== 1) {
            out([
                'ok' => false,
                'message' => 'No se pudo enviar la noticia a aprobación'
            ], 403);
        }
        /* -------------------------
       AUDITORÍA
     ------------------------- */

        registrarAuditoria(
            $pdo,
            'ENVIAR_APROBACION',
            'Envió una noticia a aprobación',
            'noticia',
            $id
        );

        out([
            'ok' => true,
            'message' => 'Noticia enviada a aprobación'
        ]);
    }
    /* =========================================
   ENVIAR SLIDE DE CARRUSEL A APROBACIÓN
========================================= */

    if ($action === 'submit-carousel') {

        $d = input();

        $id = (int)($d['id'] ?? 0);

        if ($id <= 0) {
            out([
                'ok' => false,
                'message' => 'Falta id del slide'
            ], 400);
        }

        /*
       Esta acción corresponde únicamente
       a administradores de área.
    */

        if (esSuperAdmin()) {
            out([
                'ok' => false,
                'message' =>
                'Esta acción corresponde a administradores de área'
            ], 403);
        }

        /*
       Obtener el área directamente
       desde la sesión.
    */

        $areasPermitidas =
            areasPermitidasActuales();

        if (empty($areasPermitidas)) {

            out([
                'ok' => false,
                'message' =>
                'El usuario no tiene un área asignada'
            ], 403);
        }


        /*
   Crear los marcadores SQL según
   las áreas permitidas.

   Admin6:
   [6, 8] -> ?,?
*/

        $marcadores =
            implode(
                ',',
                array_fill(
                    0,
                    count($areasPermitidas),
                    '?'
                )
            );


        $st = $pdo->prepare(
            "UPDATE contenidos
     SET estado = 'Pendiente',
         motivo_rechazo = NULL,
         aprobado_por = NULL,
         fecha_aprobacion = NULL
     WHERE id = ?
     AND tipo = 'carrusel'
     AND area_id IN ($marcadores)
     AND eliminado = 0
     AND estado IN ('Borrador', 'Rechazada')"
        );


        /*
   Primer parámetro:
   ID del slide.

   Siguientes parámetros:
   áreas permitidas.
*/

        $parametros = array_merge(
            [$id],
            $areasPermitidas
        );

        $st->execute(
            $parametros
        );

        if ($st->rowCount() !== 1) {
            out([
                'ok' => false,
                'message' =>
                'No se pudo enviar el slide a aprobación'
            ], 403);
        }

        /*
       AUDITORÍA
    */

        registrarAuditoria(
            $pdo,
            'ENVIAR_CARRUSEL_APROBACION',
            'Envió un slide del carrusel a aprobación',
            'carrusel',
            $id
        );

        out([
            'ok' => true,
            'message' =>
            'Slide enviado a aprobación'
        ]);
    }
    /* =========================================
   ENVIAR VIDEO A APROBACIÓN
========================================= */

    if ($action === 'submit-video') {

        $d = input();

        $id = (int)($d['id'] ?? 0);

        if ($id <= 0) {
            out([
                'ok' => false,
                'message' => 'Falta id del video'
            ], 400);
        }

        /*
       Esta acción corresponde únicamente
       a administradores de área.
    */

        if (esSuperAdmin()) {
            out([
                'ok' => false,
                'message' =>
                'Esta acción corresponde a administradores de área'
            ], 403);
        }

        /*
       Obtener las áreas permitidas
       para el administrador actual.
    */

        $areasPermitidas =
            areasPermitidasActuales();

        if (empty($areasPermitidas)) {

            out([
                'ok' => false,
                'message' =>
                'El usuario no tiene un área asignada'
            ], 403);
        }

        /*
       Crear ?,?,... según las áreas
       que pueda administrar.

       Admin6 tendrá:
       6 y 8.
    */

        $marcadores =
            implode(
                ',',
                array_fill(
                    0,
                    count($areasPermitidas),
                    '?'
                )
            );

        /*
       Solamente Borrador o Rechazada
       pueden volver a enviarse.
    */

        $st = $pdo->prepare(
            "UPDATE contenidos
         SET estado = 'Pendiente',
             motivo_rechazo = NULL,
             aprobado_por = NULL,
             fecha_aprobacion = NULL,
             activo = 0
         WHERE id = ?
         AND tipo = 'video'
         AND area_id IN ($marcadores)
         AND eliminado = 0
         AND estado IN ('Borrador', 'Rechazada')"
        );

        $parametros = array_merge(
            [$id],
            $areasPermitidas
        );

        $st->execute(
            $parametros
        );

        if ($st->rowCount() !== 1) {

            out([
                'ok' => false,
                'message' =>
                'No se pudo enviar el video a aprobación'
            ], 403);
        }

        /*
       AUDITORÍA
    */

        registrarAuditoria(
            $pdo,
            'ENVIAR_VIDEO_APROBACION',
            'Envió un video a aprobación',
            'video',
            $id
        );

        out([
            'ok' => true,
            'message' =>
            'Video enviado a aprobación'
        ]);
    }
    /* =========================================
   APROBAR NOTICIA - SOLO SUPERADMIN
========================================= */

    if ($action === 'approve-news') {

        if (!esSuperAdmin()) {
            out([
                'ok' => false,
                'message' => 'Solo el SuperAdministrador puede aprobar noticias'
            ], 403);
        }

        $d = input();

        $id = (int)($d['id'] ?? 0);

        if ($id <= 0) {
            out([
                'ok' => false,
                'message' => 'Falta id'
            ], 400);
        }

        $st = $pdo->prepare(
            "UPDATE contenidos
         SET estado = 'Publicada',
             aprobado_por = ?,
             fecha_aprobacion = NOW(),
             motivo_rechazo = NULL,
             activo = 1
         WHERE id = ?
         AND tipo = 'noticia'
         AND estado = 'Pendiente'
         AND eliminado = 0"
        );

        $st->execute([
            usuarioActualId(),
            $id
        ]);

        if ($st->rowCount() !== 1) {
            out([
                'ok' => false,
                'message' => 'La noticia no está pendiente de aprobación'
            ], 400);
        }
        /* -------------------------
           AUDITORÍA
    ------------------------- */

        registrarAuditoria(
            $pdo,
            'APROBAR_NOTICIA',
            'Aprobó y publicó una noticia',
            'noticia',
            $id
        );

        out([
            'ok' => true,
            'message' => 'Noticia aprobada y publicada'
        ]);
    }
    /* =========================================
   APROBAR CARRUSEL - SOLO SUPERADMIN
========================================= */

    if ($action === 'approve-carousel') {

        /*
       SEGURIDAD

       Solamente Sosa / SuperAdministrador
       puede aprobar publicaciones.
    */

        if (!esSuperAdmin()) {

            out([
                'ok' => false,
                'message' =>
                'Solo el SuperAdministrador puede aprobar publicaciones del carrusel'
            ], 403);
        }


        /*
       RECIBIR ID
    */

        $d = input();

        $id = (int)($d['id'] ?? 0);


        if ($id <= 0) {

            out([
                'ok' => false,
                'message' =>
                'Falta id del slide'
            ], 400);
        }


        /*
       APROBAR Y PUBLICAR

       Solo puede aprobarse si:
       - es Carrusel
       - está Pendiente
       - no está eliminado
    */

        $st = $pdo->prepare(
            "UPDATE contenidos
         SET estado = 'Publicada',
             aprobado_por = ?,
             fecha_aprobacion = NOW(),
             motivo_rechazo = NULL,
             activo = 1
         WHERE id = ?
         AND tipo = 'carrusel'
         AND estado = 'Pendiente'
         AND eliminado = 0"
        );


        $st->execute([
            usuarioActualId(),
            $id
        ]);


        /*
       Verificar que realmente
       se haya aprobado.
    */

        if ($st->rowCount() !== 1) {

            out([
                'ok' => false,
                'message' =>
                'El slide no está pendiente de aprobación'
            ], 400);
        }


        /*
       AUDITORÍA
    */

        registrarAuditoria(
            $pdo,
            'APROBAR_CARRUSEL',
            'Aprobó y publicó un slide del carrusel',
            'carrusel',
            $id
        );


        /*
       RESPUESTA
    */

        out([
            'ok' => true,
            'message' =>
            'Slide del carrusel aprobado y publicado'
        ]);
    }
    /* =========================================
   APROBAR VIDEO - SOLO SUPERADMIN
========================================= */

    if ($action === 'approve-video') {

        /*
       Solamente Sosa / SuperAdministrador
       puede aprobar videos.
    */

        if (!esSuperAdmin()) {

            out([
                'ok' => false,
                'message' =>
                'Solo el SuperAdministrador puede aprobar videos'
            ], 403);
        }

        $d = input();

        $id = (int)($d['id'] ?? 0);

        if ($id <= 0) {

            out([
                'ok' => false,
                'message' =>
                'Falta id del video'
            ], 400);
        }

        /*
       Solamente puede aprobarse un video
       que esté Pendiente y no eliminado.
    */

        $st = $pdo->prepare(
            "UPDATE contenidos
         SET estado = 'Publicada',
             aprobado_por = ?,
             fecha_aprobacion = NOW(),
             motivo_rechazo = NULL,
             activo = 1
         WHERE id = ?
         AND tipo = 'video'
         AND estado = 'Pendiente'
         AND eliminado = 0"
        );

        $st->execute([
            usuarioActualId(),
            $id
        ]);

        if ($st->rowCount() !== 1) {

            out([
                'ok' => false,
                'message' =>
                'El video no está pendiente de aprobación'
            ], 400);
        }

        /*
       AUDITORÍA
    */

        registrarAuditoria(
            $pdo,
            'APROBAR_VIDEO',
            'Aprobó y publicó un video',
            'video',
            $id
        );

        out([
            'ok' => true,
            'message' =>
            'Video aprobado y publicado'
        ]);
    }

    /* =========================================
   RECHAZAR NOTICIA - SOLO SUPERADMIN
========================================= */

    if ($action === 'reject-news') {

        if (!esSuperAdmin()) {
            out([
                'ok' => false,
                'message' => 'Solo el SuperAdministrador puede rechazar noticias'
            ], 403);
        }

        $d = input();

        $id = (int)($d['id'] ?? 0);

        $motivo = trim($d['motivo'] ?? '');

        if ($id <= 0) {
            out([
                'ok' => false,
                'message' => 'Falta id'
            ], 400);
        }

        if ($motivo === '') {
            out([
                'ok' => false,
                'message' => 'Debe indicar el motivo del rechazo'
            ], 400);
        }

        $st = $pdo->prepare(
            "UPDATE contenidos
         SET estado = 'Rechazada',
             motivo_rechazo = ?,
             aprobado_por = NULL,
             fecha_aprobacion = NULL
         WHERE id = ?
         AND tipo = 'noticia'
         AND estado = 'Pendiente'
         AND eliminado = 0"
        );

        $st->execute([
            $motivo,
            $id
        ]);

        if ($st->rowCount() !== 1) {
            out([
                'ok' => false,
                'message' => 'La noticia no está pendiente de aprobación'
            ], 400);
        }

        /* -------------------------
           AUDITORÍA
    ------------------------- */

        registrarAuditoria(
            $pdo,
            'RECHAZAR_NOTICIA',
            'Rechazó una noticia',
            'noticia',
            $id
        );

        out([
            'ok' => true,
            'message' => 'Noticia rechazada'
        ]);
    }
    /* =========================================
   RECHAZAR CARRUSEL - SOLO SUPERADMIN
========================================= */

    if ($action === 'reject-carousel') {

        /*
       SEGURIDAD

       Solamente Sosa / SuperAdministrador
       puede rechazar publicaciones.
    */

        if (!esSuperAdmin()) {

            out([
                'ok' => false,
                'message' =>
                'Solo el SuperAdministrador puede rechazar publicaciones del carrusel'
            ], 403);
        }


        /*
       RECIBIR DATOS
    */

        $d = input();

        $id = (int)($d['id'] ?? 0);

        $motivo = trim(
            $d['motivo'] ?? ''
        );


        /*
       VALIDAR ID
    */

        if ($id <= 0) {

            out([
                'ok' => false,
                'message' =>
                'Falta id del slide'
            ], 400);
        }


        /*
       EL MOTIVO ES OBLIGATORIO
    */

        if ($motivo === '') {

            out([
                'ok' => false,
                'message' =>
                'Debe indicar el motivo del rechazo'
            ], 400);
        }


        /*
       RECHAZAR

       Solamente se puede rechazar:
       - contenido de tipo carrusel
       - que esté Pendiente
       - que no esté eliminado
    */

        $st = $pdo->prepare(
            "UPDATE contenidos
         SET estado = 'Rechazada',
             motivo_rechazo = ?,
             aprobado_por = NULL,
             fecha_aprobacion = NULL,
             activo = 0
         WHERE id = ?
         AND tipo = 'carrusel'
         AND estado = 'Pendiente'
         AND eliminado = 0"
        );


        $st->execute([
            $motivo,
            $id
        ]);


        /*
       COMPROBAR QUE SE RECHAZÓ
    */

        if ($st->rowCount() !== 1) {

            out([
                'ok' => false,
                'message' =>
                'El slide no está pendiente de aprobación'
            ], 400);
        }


        /*
       AUDITORÍA
    */

        registrarAuditoria(
            $pdo,
            'RECHAZAR_CARRUSEL',
            'Rechazó un slide del carrusel',
            'carrusel',
            $id
        );


        /*
       RESPUESTA
    */

        out([
            'ok' => true,
            'message' =>
            'Slide del carrusel rechazado'
        ]);
    }
    /* =========================================
   RECHAZAR VIDEO - SOLO SUPERADMIN
========================================= */

    if ($action === 'reject-video') {

        /*
       Solamente Sosa / SuperAdministrador
       puede rechazar videos.
    */

        if (!esSuperAdmin()) {

            out([
                'ok' => false,
                'message' =>
                'Solo el SuperAdministrador puede rechazar videos'
            ], 403);
        }

        $d = input();

        $id = (int)($d['id'] ?? 0);

        $motivo = trim(
            $d['motivo'] ?? ''
        );

        /*
       Validar ID.
    */

        if ($id <= 0) {

            out([
                'ok' => false,
                'message' =>
                'Falta id del video'
            ], 400);
        }

        /*
       El motivo del rechazo es obligatorio.
    */

        if ($motivo === '') {

            out([
                'ok' => false,
                'message' =>
                'Debe indicar el motivo del rechazo'
            ], 400);
        }

        /*
       Solamente puede rechazarse un video
       que esté Pendiente y no eliminado.
    */

        $st = $pdo->prepare(
            "UPDATE contenidos
         SET estado = 'Rechazada',
             motivo_rechazo = ?,
             aprobado_por = NULL,
             fecha_aprobacion = NULL,
             activo = 0
         WHERE id = ?
         AND tipo = 'video'
         AND estado = 'Pendiente'
         AND eliminado = 0"
        );

        $st->execute([
            $motivo,
            $id
        ]);

        if ($st->rowCount() !== 1) {

            out([
                'ok' => false,
                'message' =>
                'El video no está pendiente de aprobación'
            ], 400);
        }

        /*
       AUDITORÍA
    */

        registrarAuditoria(
            $pdo,
            'RECHAZAR_VIDEO',
            'Rechazó un video',
            'video',
            $id
        );

        out([
            'ok' => true,
            'message' =>
            'Video rechazado'
        ]);
    }
    if ($action === 'update') {
        $d = input();

        if (empty($d['id'])) {
            out([
                'ok' => false,
                'message' => 'Falta id'
            ], 400);
        }
        $id = (int)$d['id'];
        /*
   SEGURIDAD PARA EDICIÓN DE NOTICIAS
*/

        $tipoActual = null;

        $consultaContenido = $pdo->prepare(
            "SELECT tipo, area_id, estado, imagen, activo
            FROM contenidos
            WHERE id = ?
            AND eliminado = 0
            LIMIT 1"
        );

        $consultaContenido->execute([$id]);

        $contenidoActual =
            $consultaContenido->fetch();

        if (!$contenidoActual) {

            out([
                'ok' => false,
                'message' => 'Contenido no encontrado'
            ], 404);
        }

        $tipoActual =
            $contenidoActual['tipo'];

        $imagenAnterior =
            $contenidoActual['imagen'] ?? null;

        $imagenNueva =
            $d['imagen'] ?? $imagenAnterior;

        /*
   SEGURIDAD GENERAL PARA CONTENIDOS
   ORGANIZADOS POR ÁREA

   Actualmente se aplica a:
   - Noticias
   - Carrusel
*/

        if (!puedeGestionarContenido($contenidoActual)) {

            out([
                'ok' => false,
                'message' =>
                'No tenés permiso para editar este contenido'
            ], 403);
        }


        /*
   Si es una noticia y NO es SuperAdmin,
   comprobamos área y estado.
*/

        if (
            $tipoActual === 'noticia' &&
            !esSuperAdmin()
        ) {

            /*
       Solo puede modificar noticias
       Borrador o Rechazadas.
    */

            if (
                !in_array(
                    $contenidoActual['estado'],
                    ['Borrador', 'Rechazada'],
                    true
                )
            ) {

                out([
                    'ok' => false,
                    'message' =>
                    'La noticia no puede editarse mientras está pendiente o publicada'
                ], 403);
            }
        }
        /*
   SEGURIDAD DE EDICIÓN DEL CARRUSEL

   Un administrador de área solamente puede
   editar slides que estén:

   - Borrador
   - Rechazada

   No puede modificar contenido que esté
   Pendiente de aprobación o Publicado.
*/

        if (
            $tipoActual === 'carrusel' &&
            !esSuperAdmin()
        ) {

            if (
                !in_array(
                    $contenidoActual['estado'],
                    ['Borrador', 'Rechazada'],
                    true
                )
            ) {

                out([
                    'ok' => false,
                    'message' =>
                    'El carrusel no puede editarse mientras está pendiente o publicado'
                ], 403);
            }
        }
        /*
           SEGURIDAD DE EDICIÓN DE VIDEOS

           Un administrador de área solamente puede
           editar videos en estado:

           - Borrador
           - Rechazada

           No puede editar videos Pendientes
           ni Publicados.
        */

        if (
            $tipoActual === 'video' &&
            !esSuperAdmin()
        ) {

            if (
                !in_array(
                    $contenidoActual['estado'],
                    ['Borrador', 'Rechazada'],
                    true
                )
            ) {

                out([
                    'ok' => false,
                    'message' =>
                    'El video no puede editarse mientras está pendiente o publicado'
                ], 403);
            }
        }
        /*
   ÁREA DURANTE LA EDICIÓN

   Por defecto conservamos el área
   que ya tiene el contenido.
*/

        $areaNueva =
            $contenidoActual['area_id'] !== null
            ? (int)$contenidoActual['area_id']
            : null;


        /*
   Noticias y Carrusel:

   Un administrador de área puede cambiar
   el contenido únicamente hacia otra área
   que tenga permitido administrar.
*/

        if (
            in_array(
                $tipoActual,
                ['noticia', 'carrusel', 'video'],
                true
            ) &&
            !esSuperAdmin()
        ) {

            $areaSolicitada =
                isset($d['area_id']) &&
                $d['area_id'] !== ''
                ? (int)$d['area_id']
                : $areaNueva;


            if (
                !puedeGestionarArea(
                    $areaSolicitada
                )
            ) {

                out([
                    'ok' => false,
                    'message' =>
                    'No tenés permiso para mover este contenido a esa área'
                ], 403);
            }


            $areaNueva =
                $areaSolicitada;
        }
        $estadoNuevo =
            $d['estado'] ??
            $contenidoActual['estado'];

        /*
   CARRUSEL RECHAZADO

   Si un administrador de área está corrigiendo
   un slide rechazado por Sosa, la edición NO
   cambia su estado.

   Debe continuar como Rechazada y conservar
   el motivo hasta que el administrador pulse
   "Enviar a aprobación".
*/

        if (
            $tipoActual === 'carrusel' &&
            !esSuperAdmin() &&
            $contenidoActual['estado'] === 'Rechazada'
        ) {
            $estadoNuevo = 'Rechazada';
        }
        /*
   SEGURIDAD DEL ESTADO DEL CARRUSEL

   Un administrador de área nunca puede
   publicar ni enviar a Pendiente mediante UPDATE.

   La publicación solamente puede realizarla
   el SuperAdministrador mediante el flujo
   de aprobación.
*/

        if (
            $tipoActual === 'carrusel' &&
            !esSuperAdmin()
        ) {

            if (
                !in_array(
                    $estadoNuevo,
                    ['Borrador', 'Rechazada'],
                    true
                )
            ) {
                $estadoNuevo =
                    $contenidoActual['estado'];
            }
        }
        /*
   Un administrador de área nunca
   puede publicar mediante UPDATE.
*/

        if (
            $tipoActual === 'noticia' &&
            !esSuperAdmin()
        ) {

            /*
       Si está corrigiendo una noticia rechazada,
       vuelve a Borrador.
    */

            if (
                $contenidoActual['estado']
                === 'Rechazada'
            ) {

                $estadoNuevo = 'Borrador';
            }

            /*
       Nunca aceptamos Publicada
       desde un administrador de área.
    */

            if ($estadoNuevo === 'Publicada') {
                $estadoNuevo = 'Borrador';
            }
        }
        /*
           SEGURIDAD DEL ESTADO DE VIDEOS

           Un administrador de área nunca puede
           publicar directamente un video.

           Si está corrigiendo un video rechazado,
           debe continuar como Rechazada hasta que
           vuelva a enviarlo a aprobación.
        */

        if (
            $tipoActual === 'video' &&
            !esSuperAdmin()
        ) {

            if (
                $contenidoActual['estado']
                === 'Rechazada'
            ) {
                $estadoNuevo = 'Rechazada';
            }

            /*
               Nunca permitimos que un administrador
               cambie directamente el video a Publicada
               o Pendiente mediante UPDATE.
            */

            if (
                !in_array(
                    $estadoNuevo,
                    ['Borrador', 'Rechazada'],
                    true
                )
            ) {
                $estadoNuevo =
                    $contenidoActual['estado'];
            }
        }
        /*
   SEGURIDAD DEL CAMPO ACTIVO

   Un administrador de área no puede activar
   contenido mediante una petición UPDATE.

   Carrusel y Video solamente quedan activos
   cuando el SuperAdministrador los aprueba.
*/

        $activoNuevo =
            isset($d['activo'])
            ? (int)$d['activo']
            : (int)$contenidoActual['activo'];

        if (
            !esSuperAdmin() &&
            in_array(
                $tipoActual,
                ['carrusel', 'video'],
                true
            )
        ) {
            $activoNuevo = 0;
        }

        $st = $pdo->prepare(
            "UPDATE contenidos
            SET area_id=?,
            titulo=?,
            categoria=?,
            resumen=?,
            descripcion=?,
            imagen=?,
            url=?,
            estado=?,
            orden=?,
            activo=?
            WHERE id=?"
        );
        if ($tipoActual === 'video') {

            $urlVideo =
                trim($d['url'] ?? '');

            if ($urlVideo === '') {

                out([
                    'ok' => false,
                    'message' =>
                    'El video es obligatorio'
                ], 400);
            }


            /* VIDEO PROPIO */

            $esVideoPropio =
                preg_match(
                    '#^\.\./uploads/videos/[a-f0-9]{32}\.(mp4|webm)$#i',
                    $urlVideo
                ) === 1;


            /* VIDEO DE YOUTUBE */

            $esYoutube = false;

            if (
                filter_var(
                    $urlVideo,
                    FILTER_VALIDATE_URL
                ) !== false
            ) {

                $hostVideo =
                    strtolower(
                        parse_url(
                            $urlVideo,
                            PHP_URL_HOST
                        ) ?? ''
                    );

                $esYoutube =
                    in_array(
                        $hostVideo,
                        [
                            'youtube.com',
                            'www.youtube.com',
                            'youtu.be'
                        ],
                        true
                    );
            }


            /* VALIDACIÓN FINAL */

            if (
                !$esYoutube &&
                !$esVideoPropio
            ) {

                out([
                    'ok' => false,
                    'message' =>
                    'Solo se permiten videos de YouTube o videos propios MP4/WEBM'
                ], 400);
            }
        }
        $st->execute([
            $areaNueva,
            $d['titulo'] ?? '',
            $d['categoria'] ?? null,
            $d['resumen'] ?? null,
            $d['descripcion'] ?? null,
            $imagenNueva,
            $d['url'] ?? null,
            $estadoNuevo,
            $d['orden'] ?? 1,
            $activoNuevo,
            $id
        ]);
        /* =====================================
   LIMPIAR IMAGEN ANTERIOR
   NOTICIA / CARRUSEL
===================================== */

        if (
            in_array(
                $tipoActual,
                ['noticia', 'carrusel', 'video'],
                true
            ) &&
            !empty($imagenAnterior) &&
            !empty($imagenNueva) &&
            $imagenAnterior !== $imagenNueva
        ) {

            /*
       Determinar qué carpeta puede utilizarse
       según el tipo real del contenido.
    */

            $carpetaImagen =
                $tipoActual === 'noticia'
                ? 'noticias'
                : 'carrusel';

            $prefijoPermitido =
                '../uploads/' .
                $carpetaImagen .
                '/';

            $rutaAnterior =
                str_replace(
                    '\\',
                    '/',
                    $imagenAnterior
                );

            /*
       La imagen anterior debe pertenecer
       obligatoriamente a la carpeta permitida.
    */

            if (
                strpos(
                    $rutaAnterior,
                    $prefijoPermitido
                ) === 0
            ) {

                /*
           Antes de borrar físicamente,
           comprobar que ningún otro contenido
           siga utilizando la misma imagen.
        */

                $consultaUsoImagen =
                    $pdo->prepare(
                        "SELECT COUNT(*)
                 FROM contenidos
                 WHERE imagen = ?"
                    );

                $consultaUsoImagen->execute([
                    $imagenAnterior
                ]);

                $cantidadUsos =
                    (int)$consultaUsoImagen->fetchColumn();

                if ($cantidadUsos === 0) {

                    $carpetaFisica =
                        realpath(
                            dirname(__DIR__)
                                . DIRECTORY_SEPARATOR
                                . 'uploads'
                                . DIRECTORY_SEPARATOR
                                . $carpetaImagen
                        );

                    if ($carpetaFisica !== false) {

                        $nombreArchivo =
                            basename($rutaAnterior);

                        $archivo =
                            $carpetaFisica
                            . DIRECTORY_SEPARATOR
                            . $nombreArchivo;

                        $archivoReal =
                            realpath($archivo);

                        /*
                   Comprobación final:
                   el archivo debe existir realmente
                   dentro de la carpeta autorizada.
                */

                        if (
                            $archivoReal !== false &&
                            dirname($archivoReal)
                            === $carpetaFisica &&
                            is_file($archivoReal)
                        ) {
                            @unlink($archivoReal);
                        }
                    }
                }
            }
        }
        if (
            $tipoActual === 'noticia' &&
            !esSuperAdmin() &&
            $contenidoActual['estado'] === 'Rechazada'
        ) {

            $limpiarRechazo = $pdo->prepare(
                "UPDATE contenidos
         SET motivo_rechazo = NULL,
             aprobado_por = NULL,
             fecha_aprobacion = NULL
         WHERE id = ?"
            );

            $limpiarRechazo->execute([$id]);
        }
        /* -------------------------
       AUDITORÍA
    ------------------------- */

        if ($tipoActual === 'noticia') {
            registrarAuditoria(
                $pdo,
                'EDITAR_NOTICIA',
                'Editó una noticia',
                'noticia',
                $id
            );
        }
        if ($tipoActual === 'carrusel') {
            registrarAuditoria(
                $pdo,
                'EDITAR_CARRUSEL',
                'Editó un slide del carrusel',
                'carrusel',
                $id
            );
        }
        if ($tipoActual === 'video') {
            registrarAuditoria(
                $pdo,
                'EDITAR_VIDEO',
                'Editó un video',
                'video',
                $id
            );
        }

        out([
            'ok' => true
        ]);
    }
    if ($action === 'trash') {

        $d = input();

        $id = (int)($d['id'] ?? 0);

        if ($id <= 0) {
            out([
                'ok' => false,
                'message' => 'Falta id'
            ], 400);
        }


        $contenido =
            obtenerContenido($id, $pdo);


        if (!$contenido) {
            out([
                'ok' => false,
                'message' => 'Contenido no encontrado'
            ], 404);
        }


        if (!puedeGestionarContenido($contenido)) {
            out([
                'ok' => false,
                'message' =>
                'No tenés permiso para enviar este contenido a la papelera'
            ], 403);
        }


        /*
       Un Admin de área no debería retirar
       una noticia que está esperando a Sosa.
    */

        if (
            $contenido['tipo'] === 'noticia' &&
            !esSuperAdmin() &&
            $contenido['estado'] === 'Pendiente'
        ) {

            out([
                'ok' => false,
                'message' =>
                'No podés eliminar una noticia mientras está pendiente de aprobación'
            ], 403);
        }
        /*
   CARRUSEL PENDIENTE

   Un administrador de área no puede enviar
   a la papelera un slide mientras está
   esperando la aprobación del SuperAdmin.
*/

        if (
            $contenido['tipo'] === 'carrusel' &&
            !esSuperAdmin() &&
            $contenido['estado'] === 'Pendiente'
        ) {

            out([
                'ok' => false,
                'message' =>
                'No podés eliminar un slide del carrusel mientras está pendiente de aprobación'
            ], 403);
        }
        /*
           VIDEO PENDIENTE

           Un administrador de área no puede enviar
           a la papelera un video mientras está
           esperando la aprobación del SuperAdmin.
        */

        if (
            $contenido['tipo'] === 'video' &&
            !esSuperAdmin() &&
            $contenido['estado'] === 'Pendiente'
        ) {

            out([
                'ok' => false,
                'message' =>
                'No podés eliminar un video mientras está pendiente de aprobación'
            ], 403);
        }


        $st = $pdo->prepare(
            "UPDATE contenidos
         SET eliminado = 1
         WHERE id = ?"
        );

        $st->execute([$id]);
        /* -------------------------
        AUDITORÍA
     ------------------------- */
        if ($contenido['tipo'] === 'noticia') {
            registrarAuditoria(
                $pdo,
                'ENVIAR_PAPELERA',
                'Envió una noticia a la papelera',
                'noticia',
                $id
            );
        }

        if ($contenido['tipo'] === 'carrusel') {
            registrarAuditoria(
                $pdo,
                'ENVIAR_CARRUSEL_PAPELERA',
                'Envió un slide del carrusel a la papelera',
                'carrusel',
                $id
            );
        }
        if ($contenido['tipo'] === 'video') {
            registrarAuditoria(
                $pdo,
                'ENVIAR_VIDEO_PAPELERA',
                'Envió un video a la papelera',
                'video',
                $id
            );
        }

        out([
            'ok' => true
        ]);
    }

    if ($action === 'trash-list') {
        /*
       SUPERADMIN:
       ve toda la papelera.
    */

        if (esSuperAdmin()) {

            $st = $pdo->prepare(
                "SELECT *
             FROM contenidos
             WHERE eliminado = 1
             ORDER BY fecha_modificacion DESC,
                      fecha_creacion DESC"
            );

            $st->execute();
        } else {

            /*
           ADMIN DE ÁREA:

           - sus noticias
           - mantenemos otros contenidos para no
             romper Carrusel/Videos en esta etapa
        */

            $areasPermitidas =
                areasPermitidasActuales();

            if (empty($areasPermitidas)) {
                out([
                    'ok' => false,
                    'message' =>
                    'El usuario no tiene un área asignada'
                ], 403);
            }


            /*
   Crear los signos ? necesarios
   según la cantidad de áreas permitidas.

   Ejemplo Admin6:
   [6, 8] -> ?,?
*/

            $placeholders =
                implode(
                    ',',
                    array_fill(
                        0,
                        count($areasPermitidas),
                        '?'
                    )
                );


            $st = $pdo->prepare(
                "SELECT *
    FROM contenidos
    WHERE eliminado = 1
    AND (
          (
             tipo IN ('noticia', 'carrusel','video')
             AND area_id IN ($placeholders)
          )
         OR
         tipo NOT IN ('noticia', 'carrusel','video')
        )
    ORDER BY fecha_modificacion DESC,
             fecha_creacion DESC"
            );

            $st->execute(
                $areasPermitidas
            );
        }


        out([
            'ok' => true,
            'data' => $st->fetchAll()
        ]);
    }
    if ($action === 'restore') {

        $d = input();

        $id = (int)($d['id'] ?? 0);

        if ($id <= 0) {
            out([
                'ok' => false,
                'message' => 'Falta id'
            ], 400);
        }


        $contenido =
            obtenerContenido($id, $pdo);


        if (!$contenido) {
            out([
                'ok' => false,
                'message' => 'Contenido no encontrado'
            ], 404);
        }


        if (!puedeGestionarContenido($contenido)) {
            out([
                'ok' => false,
                'message' =>
                'No tenés permiso para restaurar este contenido'
            ], 403);
        }


        if ((int)$contenido['eliminado'] !== 1) {
            out([
                'ok' => false,
                'message' =>
                'El contenido no se encuentra en la papelera'
            ], 400);
        }


        $st = $pdo->prepare(
            "UPDATE contenidos
         SET eliminado = 0
         WHERE id = ?"
        );

        $st->execute([$id]);
        /* -------------------------
        AUDITORÍA
     ------------------------- */

        if ($contenido['tipo'] === 'noticia') {
            registrarAuditoria(
                $pdo,
                'RESTAURAR_NOTICIA',
                'Restauró una noticia desde la papelera',
                'noticia',
                $id
            );
        }
        if ($contenido['tipo'] === 'carrusel') {
            registrarAuditoria(
                $pdo,
                'RESTAURAR_CARRUSEL',
                'Restauró un slide del carrusel desde la papelera',
                'carrusel',
                $id
            );
        }
        if ($contenido['tipo'] === 'video') {
            registrarAuditoria(
                $pdo,
                'RESTAURAR_VIDEO',
                'Restauró un video desde la papelera',
                'video',
                $id
            );
        }
        out([
            'ok' => true
        ]);
    }
    /* =========================================
   ELIMINAR DEFINITIVAMENTE
========================================= */

    if ($action === 'delete-forever') {

        $d = input();

        if (empty($d['id'])) {
            out([
                'ok' => false,
                'message' => 'Falta id'
            ], 400);
        }

        $id = (int)$d['id'];


        /* Buscar primero el registro */

        $st = $pdo->prepare(
            "SELECT
        id,
        tipo,
        imagen,
        url,
        eliminado,
        area_id
     FROM contenidos
     WHERE id = ?"
        );

        $st->execute([$id]);

        $contenido = $st->fetch();


        if (!$contenido) {
            out([
                'ok' => false,
                'message' => 'Contenido no encontrado'
            ], 404);
        }
        if (!puedeGestionarContenido($contenido)) {

            out([
                'ok' => false,
                'message' =>
                'No tenés permiso para eliminar definitivamente este contenido'
            ], 403);
        }


        /*
       Seguridad:
       solamente permitimos eliminación definitiva
       si ya está en la papelera.
    */

        if ((int)$contenido['eliminado'] !== 1) {
            out([
                'ok' => false,
                'message' =>
                'El contenido debe estar en la papelera antes de eliminarlo'
            ], 400);
        }

        $tiposPermitidos = [
            'noticia',
            'carrusel',
            'video'
        ];

        if (
            !in_array(
                $contenido['tipo'],
                $tiposPermitidos,
                true
            )
        ) {

            out([
                'ok' => false,
                'message' =>
                'Tipo de contenido no permitido para eliminación definitiva'
            ], 400);
        }


        /* =====================================
   ELIMINAR REGISTRO
===================================== */

        $st = $pdo->prepare(
            "DELETE FROM contenidos
     WHERE id = ?
     AND eliminado = 1"
        );

        $st->execute([
            $id
        ]);


        if ($st->rowCount() !== 1) {

            out([
                'ok' => false,
                'message' =>
                'No se pudo eliminar el registro'
            ], 500);
        }
        /* -------------------------
   AUDITORÍA
------------------------- */

        if ($contenido['tipo'] === 'noticia') {

            registrarAuditoria(
                $pdo,
                'ELIMINAR_DEFINITIVAMENTE',
                'Eliminó definitivamente una noticia',
                'noticia',
                $id
            );
        }
        if ($contenido['tipo'] === 'carrusel') {
            registrarAuditoria(
                $pdo,
                'ELIMINAR_CARRUSEL_DEFINITIVAMENTE',
                'Eliminó definitivamente un slide del carrusel',
                'carrusel',
                $id
            );
        }
        if ($contenido['tipo'] === 'video') {
            registrarAuditoria(
                $pdo,
                'ELIMINAR_VIDEO_DEFINITIVAMENTE',
                'Eliminó definitivamente un video',
                'video',
                $id
            );
        }

        /* =====================================
       ELIMINAR IMAGEN FÍSICA
    ===================================== */

        $imagenEliminada = false;


        /* =====================================
   DETERMINAR CARPETA DE LA IMAGEN
===================================== */

        $carpetasPorTipo = [

            'noticia' =>
            'noticias',

            'carrusel' =>
            'carrusel'
        ];


        $tipoContenido =
            $contenido['tipo'];


        $carpetaContenido =
            $carpetasPorTipo[$tipoContenido] ?? null;


        /* =====================================
   ELIMINAR IMAGEN FÍSICA
===================================== */

        if (
            !empty($contenido['imagen']) &&
            $carpetaContenido
        ) {

            $nombreArchivo =
                basename(
                    $contenido['imagen']
                );


            $carpetaPermitida =
                realpath(
                    dirname(__DIR__)
                        . DIRECTORY_SEPARATOR
                        . 'uploads'
                        . DIRECTORY_SEPARATOR
                        . $carpetaContenido
                );


            if (
                $carpetaPermitida !== false
            ) {

                $archivo =
                    $carpetaPermitida
                    . DIRECTORY_SEPARATOR
                    . $nombreArchivo;


                $archivoReal =
                    realpath($archivo);


                if (
                    $archivoReal !== false &&
                    dirname($archivoReal) ===
                    $carpetaPermitida &&
                    is_file($archivoReal)
                ) {

                    $imagenEliminada =
                        unlink(
                            $archivoReal
                        );
                }
            }
        }
        /* =====================================
   ELIMINAR VIDEO PROPIO FÍSICO
===================================== */

        $videoEliminado = false;

        if (
            $contenido['tipo'] === 'video' &&
            !empty($contenido['url']) &&
            esRutaVideoPropioSegura(
                $contenido['url']
            )
        ) {

            $carpetaVideos =
                realpath(
                    dirname(__DIR__)
                        . DIRECTORY_SEPARATOR
                        . 'uploads'
                        . DIRECTORY_SEPARATOR
                        . 'videos'
                );

            if ($carpetaVideos !== false) {

                $nombreVideo =
                    basename(
                        $contenido['url']
                    );

                $archivoVideo =
                    $carpetaVideos
                    . DIRECTORY_SEPARATOR
                    . $nombreVideo;

                $archivoVideoReal =
                    realpath(
                        $archivoVideo
                    );

                if (
                    $archivoVideoReal !== false &&
                    dirname($archivoVideoReal) ===
                    $carpetaVideos &&
                    is_file($archivoVideoReal)
                ) {

                    $videoEliminado =
                        unlink(
                            $archivoVideoReal
                        );
                }
            }
        }


        out([
            'ok' => true,
            'message' =>
            'Contenido eliminado definitivamente',
            'imagen_eliminada' =>
            $imagenEliminada,
            'video_eliminado' =>
            $videoEliminado
        ]);
    }
    out(['ok' => false, 'message' => 'Acción no reconocida'], 404);
} catch (Throwable $e) {
    out(['ok' => false, 'message' => 'Error interno'], 500);
}
