<?php
// database.php - Configuración de la base de datos

define('DB_HOST', 'localhost');
define('DB_NAME', 'servicios_funebres');
define('DB_USER', 'root');
define('DB_PASS', 'root');

// Directorio para subir archivos
define('UPLOAD_DIR', __DIR__ . '/../../uploads/solicitudes/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_EXTENSIONS', ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']);

// Función para obtener conexión PDO
function getDBConnection() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        error_log("Error de conexión: " . $e->getMessage());
        return null;
    }
}

// Función para obtener el siguiente número de pedido
function getNextNroPedido($pdo) {
    $stmt = $pdo->query("SELECT MAX(nro_pedido) as max_nro FROM solicitudes");
    $result = $stmt->fetch();
    $nro = $result['max_nro'] ?? 19393;
    return $nro + 1;
}

// Crear directorio de uploads
function createUploadDirectory() {
    if (!file_exists(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0777, true);
    }
}
createUploadDirectory();
?>