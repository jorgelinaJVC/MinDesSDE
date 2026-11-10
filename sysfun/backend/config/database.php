<?php
// database.php - Configuración de la base de datos (Protegida y lista para producción)

// 0. Función auxiliar para leer el archivo .env (si no está ya definida)
if (!function_exists('cargarVariablesEntorno')) {
    function cargarVariablesEntorno($file) {
        $vars = [];
        if (file_exists($file)) {
            $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue; // Ignorar comentarios
                $parts = explode('=', $line, 2);
                if (count($parts) === 2) {
                    $vars[trim($parts[0])] = trim($parts[1]);
                }
            }
        }
        return $vars;
    }
}

// 1. Intentar cargar variables desde el archivo .env
$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile)) {
    $envVars = cargarVariablesEntorno($envFile);
    foreach ($envVars as $key => $value) {
        if (!defined($key)) {
            define($key, $value);
        }
    }
}

// 2. Proteger constantes con valores por defecto (Fallback para desarrollo local)
// Si el .env existe, estos no se ejecutarán. Si no existe, el sistema sigue funcionando localmente.
if (!defined('DB_HOST')) define('DB_HOST', 'localhost');
if (!defined('DB_NAME')) define('DB_NAME', 'servicios_funebres');
if (!defined('DB_USER')) define('DB_USER', 'root');
if (!defined('DB_PASS')) define('DB_PASS', 'root');

// Constantes de archivos y seguridad
if (!defined('UPLOAD_DIR')) define('UPLOAD_DIR', __DIR__ . '/../../uploads/solicitudes/');
if (!defined('MAX_FILE_SIZE')) define('MAX_FILE_SIZE', 5242880); // 5MB
if (!defined('ALLOWED_EXTENSIONS')) define('ALLOWED_EXTENSIONS', 'pdf,jpg,jpeg,png,doc,docx');

// 3. Función para obtener conexión PDO
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
        error_log("Error de conexión a BD: " . $e->getMessage());
        return null;
    }
}

// 4. Función para obtener el siguiente número de pedido
function getNextNroPedido($pdo) {
    $stmt = $pdo->query("SELECT MAX(nro_pedido) as max_nro FROM solicitudes");
    $result = $stmt->fetch();
    $nro = $result['max_nro'] ?? 19393;
    return $nro + 1;
}

// 5. Crear directorio de uploads si no existe
function createUploadDirectory() {
    if (!defined('UPLOAD_DIR')) return;
    if (!file_exists(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0750, true); // 0750 es seguro (solo propietario y grupo)
    }
}
createUploadDirectory();
?>