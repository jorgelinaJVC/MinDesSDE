<?php
require_once '../config/config.php';
require_once '../includes/functions.php';
require_login();

$error = $success = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nueva = $_POST['nueva'] ?? '';
    $confirmar = $_POST['confirmar'] ?? '';
    
    if (strlen($nueva) < 6) {
        $error = "La contraseña debe tener al menos 6 caracteres";
    } elseif ($nueva !== $confirmar) {
        $error = "Las contraseñas no coinciden";
    } else {
        $db = (new Database())->getConnection();
        $hash = password_hash($nueva, PASSWORD_DEFAULT);
        $stmt = $db->prepare("UPDATE empleados SET contraseña_hash = ?, primer_ingreso = 0 WHERE id_empleado = ?");
        $stmt->execute([$hash, $_SESSION['user_id']]);
        
        $_SESSION['primer_ingreso'] = 0;
        redirect('dashboard/');
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Cambiar Contraseña</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
<div class="container">
    <div class="row justify-content-center align-items-center min-vh-100">
        <div class="col-md-5">
            <div class="card shadow">
                <div class="card-body p-4">
                    <h4 class="text-center mb-3">Cambiar Contraseña</h4>
                    <p class="text-muted text-center">Es su primer ingreso, debe cambiar su contraseña</p>
                    <?php if ($error): ?><div class="alert alert-danger"><?= $error ?></div><?php endif; ?>
                    <form method="POST">
                        <div class="mb-3">
                            <label class="form-label">Nueva Contraseña</label>
                            <input type="password" name="nueva" class="form-control" required minlength="6">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Confirmar Contraseña</label>
                            <input type="password" name="confirmar" class="form-control" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">Guardar</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>
</body>
</html>