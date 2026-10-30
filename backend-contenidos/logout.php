<?php

require_once 'auth.php';
require_once 'config.php';


/* =========================================
   AUDITORÍA - CIERRE DE SESIÓN
========================================= */

$usuarioId =
    isset($_SESSION['admin_id'])
        ? (int)$_SESSION['admin_id']
        : null;


if ($usuarioId !== null) {

    $auditoriaLogout = $pdo->prepare(
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

    $auditoriaLogout->execute([
        $usuarioId,
        'LOGOUT',
        'Cerró sesión en el panel administrativo',
        'usuario',
        $usuarioId
    ]);
}


/*
   Después de registrar la auditoría
   recién eliminamos la sesión.
*/

$_SESSION = [];

if (ini_get('session.use_cookies')) {

    $params = session_get_cookie_params();

    setcookie(
        session_name(),
        '',
        [
            'expires' => time() - 42000,
            'path' => $params['path'],
            'domain' => $params['domain'],
            'secure' => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => $params['samesite'] ?? 'Lax'
        ]
    );
}

session_destroy();

header('Location: ../pages/login.php');
exit;