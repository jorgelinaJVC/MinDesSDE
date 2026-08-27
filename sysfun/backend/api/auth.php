<?php
// Configurar cabeceras CORS seguras
header('Content-Type: application/json');
// En producción, reemplaza * por tu dominio específico
header('Access-Control-Allow-Origin: http://localhost:8000');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require_once __DIR__ . '/../config/db_connection.php';

// Configuración de seguridad para cookies
define('COOKIE_SECURE', true);  // Solo HTTPS en producción
define('COOKIE_HTTPONLY', true); // No accesible desde JS
define('COOKIE_SAMESITE', 'Strict'); // Protección CSRF
define('COOKIE_DOMAIN', ''); // Deja vacío para localhost, en producción usa tu dominio
define('COOKIE_PATH', '/');
define('COOKIE_LIFETIME', 86400); // 24 horas en segundos

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    $usuario = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($usuario) || empty($password)) {
        http_response_code(400);
        echo json_encode(['message' => 'Usuario y contraseña son requeridos']);
        exit;
    }

    try {
        /** @var PDO $db */
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare('SELECT id_empleado, nombre, apellido, usuario, email, contraseña_hash, id_rol, activo FROM empleados WHERE usuario = ?');
        $stmt->execute([$usuario]);
        $empleado = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$empleado) {
            http_response_code(401);
            echo json_encode(['message' => 'Usuario no encontrado']);
            exit;
        }

        if ($empleado['activo'] != 1) {
            http_response_code(401);
            echo json_encode(['message' => 'Usuario inactivo']);
            exit;
        }

        if (!password_verify($password, $empleado['contraseña_hash'])) {
            http_response_code(401);
            echo json_encode(['message' => 'Contraseña incorrecta']);
            exit;
        }

        // Generar token seguro con expiración
        $token_payload = [
            'id' => $empleado['id_empleado'],
            'usuario' => $empleado['usuario'],
            'rol' => $empleado['id_rol'],
            'exp' => time() + COOKIE_LIFETIME,
            'iat' => time()
        ];
        
        // Firma simple del token (en producción usa JWT con clave secreta)
        $secret_key = 'tu_clave_secreta_muy_segura_cambiar_en_produccion';
        $token_data = json_encode($token_payload);
        $signature = hash_hmac('sha256', $token_data, $secret_key);
        $token = base64_encode($token_data . '|' . $signature);

        // Configurar cookie segura
        $cookie_options = [
            'expires' => time() + COOKIE_LIFETIME,
            'path' => COOKIE_PATH,
            'domain' => COOKIE_DOMAIN,
            'secure' => COOKIE_SECURE,
            'httponly' => COOKIE_HTTPONLY,
            'samesite' => COOKIE_SAMESITE
        ];

        // Establecer cookie
        setcookie('auth_token', $token, $cookie_options);
        
        // También establecer una cookie de sesión para el estado
        setcookie('user_logged_in', '1', $cookie_options);

        // No devolver el token en la respuesta para mayor seguridad
        // Solo devolvemos los datos del usuario
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $empleado['id_empleado'],
                'nombre' => $empleado['nombre'],
                'apellido' => $empleado['apellido'],
                'usuario' => $empleado['usuario'],
                'email' => $empleado['email'],
                'rol' => $empleado['id_rol']
            ]
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Error del servidor: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido. Use POST']);
}
?>