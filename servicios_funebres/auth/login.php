<?php
// auth/login.php
session_start();
require_once '../config/config.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuario = $_POST['usuario'] ?? '';
    $password = $_POST['password'] ?? '';
    
    $stmt = $pdo->prepare("SELECT * FROM empleados WHERE usuario = ? AND activo = 1");
    $stmt->execute([$usuario]);
    $empleado = $stmt->fetch();
    
    if ($empleado && password_verify($password, $empleado['contraseña_hash'])) {
        $_SESSION['empleado_id'] = $empleado['id_empleado'];
        $_SESSION['empleado_nombre'] = $empleado['nombre'] . ' ' . $empleado['apellido'];
        $_SESSION['empleado_rol'] = $empleado['id_rol'];
        
        header('Location: ../dashboard/index.php');
        exit;
    } else {
        $error = 'Usuario o contraseña incorrectos';
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Servicios Funebres</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .login-card {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 400px;
        }
        .login-card h1 {
            font-size: 22px;
            text-align: center;
            margin-bottom: 5px;
        }
        .login-card .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 25px;
            font-size: 14px;
        }
        .login-card .info {
            margin-top: 20px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
            font-size: 12px;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="login-card">
        <h1>Ministerio de Desarrollo Social</h1>
        <p class="subtitle">Servicios Funebres</p>
        
        <?php if ($error): ?>
            <div class="alert alert-danger"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        
        <form method="POST">
            <div class="mb-3">
                <label class="form-label">Usuario</label>
                <input type="text" name="usuario" class="form-control" placeholder="Ingrese su usuario" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Contraseña</label>
                <input type="password" name="password" class="form-control" placeholder="Ingrese su contraseña" required>
            </div>
            <button type="submit" class="btn btn-primary w-100">Ingresar</button>
        </form>
        
        <div class="info">
            <strong>Usuario:</strong> superadmin<br>
            <strong>Contraseña:</strong> admin123
        </div>
    </div>
</body>
</html>