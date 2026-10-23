<?php

require_once '../backend-contenidos/auth.php';
require_once '../backend-contenidos/config.php';

header('Content-Type: text/html; charset=utf-8');
if (isset($_SESSION['admin_id'])) {
    header('Location: panel-contenidos.php');
    exit;
}
$error = '';
$mensaje = '';
if (!isset($_SESSION['intentos_login'])) {
    $_SESSION['intentos_login'] = 0;
}

if (!isset($_SESSION['bloqueo_login_hasta'])) {
    $_SESSION['bloqueo_login_hasta'] = 0;
}

if (isset($_GET['sesion']) && $_GET['sesion'] === 'expirada') {
    $mensaje = 'La sesión finalizó por inactividad. Iniciá sesión nuevamente.';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if ($_SESSION['bloqueo_login_hasta'] > time()) {
    $segundosRestantes =
        $_SESSION['bloqueo_login_hasta'] - time();

    $error =
        'Demasiados intentos fallidos. Intentá nuevamente en ' .
        $segundosRestantes .
        ' segundos.';
} else {

    $usuario = trim($_POST['usuario'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($usuario === '' || $password === '') {
        $error = 'Completá usuario y contraseña.';
    } else {

        $stmt = $pdo->prepare(
            "SELECT id, usuario, password, nombre, rol, area_id
            FROM usuarios_admin
            WHERE usuario = ?
            AND activo = 1
            LIMIT 1"
            );

        $stmt->execute([$usuario]);

        $admin = $stmt->fetch();

        if ($admin && password_verify($password, $admin['password'])) {

            session_regenerate_id(true);
              $_SESSION['intentos_login'] = 0;
              $_SESSION['bloqueo_login_hasta'] = 0;
              $_SESSION['admin_id'] = (int)$admin['id'];
              $_SESSION['admin_usuario'] = $admin['usuario'];
              $_SESSION['admin_nombre'] = $admin['nombre'];
              $_SESSION['admin_rol'] = $admin['rol'];
              $_SESSION['admin_area_id'] =
              $admin['area_id'] !== null
                 ? (int)$admin['area_id']
                 : null;

           $_SESSION['ultima_actividad'] = time();
           $actualizarAcceso = $pdo->prepare(
            "UPDATE usuarios_admin
             SET ultimo_acceso = NOW()
             WHERE id = ?"
             );

            $actualizarAcceso->execute([
              $admin['id']
            ]);
            /* =========================================
               AUDITORÍA - INICIO DE SESIÓN
            ========================================= */

            $auditoriaLogin = $pdo->prepare(
               "INSERT INTO auditoria(
               usuario_id,
               accion,
               descripcion,
               entidad,
               entidad_id
               )
               VALUES (?, ?, ?, ?, ?)");

            $auditoriaLogin->execute([
                (int)$admin['id'],
                'LOGIN',
                'Inició sesión en el panel administrativo',
                'usuario',
                (int)$admin['id']
                ]);

            header('Location: panel-contenidos.php');
            exit;

        } else {
            $_SESSION['intentos_login']++;
            if ($_SESSION['intentos_login'] >= 5) {
                $_SESSION['bloqueo_login_hasta'] = time() + 300;
                $_SESSION['intentos_login'] = 0;
                $error =
                'Demasiados intentos fallidos. Intentá nuevamente en 5 minutos.';
            } else {
                $intentosRestantes =
                  5 - $_SESSION['intentos_login'];
                $error =
                'Usuario o contraseña incorrectos. Intentos restantes: ' .
                $intentosRestantes .
                '.';
            }
        }
}    }
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>Acceso administrativo</title>

<style>

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Arial, sans-serif;
    background: #f4f6f8;
}

.login {
    width: 100%;
    max-width: 420px;
    background: white;
    padding: 35px;
    border-radius: 14px;
    box-shadow: 0 8px 30px rgba(0,0,0,.12);
}

.login h1 {
    margin-top: 0;
    margin-bottom: 8px;
}

.login p {
    margin-top: 0;
    color: #666;
}

.campo {
    margin-top: 20px;
}

.campo label {
    display: block;
    margin-bottom: 7px;
    font-weight: bold;
}

.campo input {
    width: 100%;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 7px;
}

button {
    width: 100%;
    margin-top: 25px;
    padding: 13px;
    border: 0;
    border-radius: 7px;
    cursor: pointer;
    background: #1677a8;
    color: white;
    font-weight: bold;
}

.mensaje {
    padding: 10px;
    margin-top: 15px;
    border-radius: 6px;
    background: #e8f4ff;
    color: #075985;
}
.error {
    padding: 10px;
    margin-top: 15px;
    border-radius: 6px;
    background: #ffe5e5;
    color: #a40000;
}

</style>
</head>

<body>

<div class="login">

    <h1>Administración</h1>

    <p>
        Ministerio de Desarrollo Social
    </p>
    <?php if ($mensaje !== ''): ?>

    <div class="mensaje">
        <?= htmlspecialchars($mensaje) ?>
    </div>

    <?php endif; ?>

    <?php if ($error !== ''): ?>

        <div class="error">
            <?= htmlspecialchars($error) ?>
        </div>

    <?php endif; ?>

    <form method="POST">

        <div class="campo">

            <label for="usuario">
                Usuario
            </label>

            <input
                id="usuario"
                name="usuario"
                type="text"
                required
                autocomplete="username"
            >

        </div>

        <div class="campo">

            <label for="password">
                Contraseña
            </label>

            <input
                id="password"
                name="password"
                type="password"
                required
                autocomplete="current-password"
            >

        </div>

        <button type="submit">
            Iniciar sesión
        </button>

    </form>

</div>

</body>
</html>