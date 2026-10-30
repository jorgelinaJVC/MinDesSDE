<?php

/* =========================================
   CONFIGURACIÓN DE SESIÓN
========================================= */

if (session_status() === PHP_SESSION_NONE) {
    $usaHttps =
        (!empty($_SERVER['HTTPS']) &&
            $_SERVER['HTTPS'] !== 'off');
    ini_set('session.use_strict_mode', '1');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $usaHttps,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);

    session_start();
}

/*
   Tiempo máximo de inactividad:
   30 minutos = 1800 segundos
*/
define('TIEMPO_INACTIVIDAD', 1800);


/* =========================================
   COMPROBAR SI EXISTE SESIÓN ADMIN
========================================= */

function usuarioAutenticado(): bool
{
    if (
        !isset(
            $_SESSION['admin_id'],
            $_SESSION['admin_usuario']
        )
    ) {
        return false;
    }


    /* =====================================
       COMPROBAR INACTIVIDAD
    ===================================== */

    if (isset($_SESSION['ultima_actividad'])) {

        $tiempoInactivo =
            time() - $_SESSION['ultima_actividad'];

        if ($tiempoInactivo > TIEMPO_INACTIVIDAD) {

            $_SESSION = [];

            if (ini_get('session.use_cookies')) {

                $params = session_get_cookie_params();

                setcookie(
                    session_name(),
                    '',
                    time() - 42000,
                    $params['path'],
                    $params['domain'],
                    $params['secure'],
                    $params['httponly']
                );
            }

            session_destroy();

            return false;
        }
    }


    /* =====================================
       RENOVAR ÚLTIMA ACTIVIDAD
    ===================================== */

    $_SESSION['ultima_actividad'] = time();

    return true;
}


/* =========================================
   PROTEGER PÁGINAS
========================================= */

function exigirAutenticacion(): void
{
    if (!usuarioAutenticado()) {

        header(
            'Location: ../pages/login.php?sesion=expirada'
        );

        exit;
    }
}
/* =========================================
   PROTECCIÓN CSRF
========================================= */

function obtenerTokenCsrf(): string
{
    if (
        !isset($_SESSION['csrf_token']) ||
        !is_string($_SESSION['csrf_token']) ||
        $_SESSION['csrf_token'] === ''
    ) {
        $_SESSION['csrf_token'] =
            bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function validarTokenCsrf(?string $token): bool
{
    if (
        $token === null ||
        $token === '' ||
        !isset($_SESSION['csrf_token']) ||
        !is_string($_SESSION['csrf_token'])
    ) {
        return false;
    }

    return hash_equals(
        $_SESSION['csrf_token'],
        $token
    );
}
