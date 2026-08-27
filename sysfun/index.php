<?php
// Configuración de sesión segura
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_only_cookies', 1);
ini_set('session.use_strict_mode', 1);

// Si quieres usar sesiones PHP además de cookies
session_start();

// Redirigir a login si no está autenticado
if (!isset($_SESSION['user_id'])) {
    header('Location: frontend/login.html');
    exit;
}

// Resto de tu código...
?>