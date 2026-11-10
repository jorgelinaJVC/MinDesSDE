<?php
require_once __DIR__ . '/../config/security.php';
require_once __DIR__ . '/../config/db_connection.php';

// Configurar cabeceras de seguridad
setCabecerasSeguridad();
header('Content-Type: application/json');

// Configuración desde .env
// Configuración de seguridad para cookies (Protegida contra redefinición)
if (!defined('COOKIE_SECURE')) define('COOKIE_SECURE', false);  // ✅ Cambiar a true en producción (HTTPS)
if (!defined('COOKIE_HTTPONLY')) define('COOKIE_HTTPONLY', true); 
if (!defined('COOKIE_SAMESITE')) define('COOKIE_SAMESITE', 'Lax'); 
if (!defined('COOKIE_DOMAIN')) define('COOKIE_DOMAIN', ''); 
if (!defined('COOKIE_PATH')) define('COOKIE_PATH', '/');
if (!defined('COOKIE_LIFETIME')) define('COOKIE_LIFETIME', 86400); 

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

// Rate limiting para login
if (!verificarRateLimit('login', 5, 300)) {
    registrarLog('Múltiples intentos de login fallidos desde IP: ' . $_SERVER['REMOTE_ADDR'], 'warning');
    http_response_code(429);
    echo json_encode(['success' => false, 'message' => 'Demasiados intentos. Intente en 5 minutos.']);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

$usuario = sanitizarInput($data['username'] ?? '', 'string');
$password = $data['password'] ?? '';

if (empty($usuario) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Usuario y contraseña son requeridos']);
    exit;
}

try {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare('SELECT id_empleado, nombre, apellido, usuario, email, contraseña_hash, id_rol, activo, primer_ingreso FROM empleados WHERE usuario = ?');
    $stmt->execute([$usuario]);
    $empleado = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$empleado) {
        registrarLog("Intento de login con usuario inexistente: $usuario", 'warning');
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Credenciales incorrectas']);
        exit;
    }

    if ($empleado['activo'] != 1) {
        registrarLog("Intento de login con usuario inactivo: $usuario", 'warning');
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Usuario inactivo']);
        exit;
    }

    if (!password_verify($password, $empleado['contraseña_hash'])) {
        registrarLog("Contraseña incorrecta para usuario: $usuario", 'warning');
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Credenciales incorrectas']);
        exit;
    }

    // Iniciar sesión segura
    iniciarSesionSegura();
    session_regenerate_id(true);
    
    $_SESSION['empleado_id'] = $empleado['id_empleado'];
    $_SESSION['usuario'] = $empleado['usuario'];
    $_SESSION['rol'] = $empleado['id_rol'];
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

    // Generar token JWT
    $token_payload = [
        'id' => $empleado['id_empleado'],
        'usuario' => $empleado['usuario'],
        'rol' => $empleado['id_rol'],
        'exp' => time() + COOKIE_LIFETIME,
        'iat' => time()
    ];
    
    $secret_key = defined('SECRET_KEY') ? SECRET_KEY : 'cambia_esto_en_produccion';
    $token_data = json_encode($token_payload);
    $signature = hash_hmac('sha256', $token_data, $secret_key);
    $token = base64_encode($token_data . '|' . $signature);

    $cookie_options = [
        'expires' => time() + COOKIE_LIFETIME,
        'path' => '/',
        'domain' => '',
        'secure' => COOKIE_SECURE,
        'httponly' => COOKIE_HTTPONLY,
        'samesite' => COOKIE_SAMESITE
    ];

    setcookie('auth_token', $token, $cookie_options);
    setcookie('user_logged_in', '1', $cookie_options);
    setcookie('csrf_token', $_SESSION['csrf_token'], $cookie_options);

    $es_primer_ingreso = ($empleado['primer_ingreso'] == 1);
    
    registrarLog("Login exitoso: {$empleado['usuario']} (ID: {$empleado['id_empleado']})", 'info');

    echo json_encode([
        'success' => true,
        'message' => 'Inicio de sesión exitoso',
        'user' => [
            'id' => $empleado['id_empleado'],
            'nombre' => $empleado['nombre'],
            'apellido' => $empleado['apellido'],
            'usuario' => $empleado['usuario'],
            'email' => $empleado['email'],
            'rol' => $empleado['id_rol'],
            'primer_ingreso' => $es_primer_ingreso
        ],
        'csrf_token' => $_SESSION['csrf_token']
    ]);
    exit;

} catch (PDOException $e) {
    registrarLog("Error en login: " . $e->getMessage(), 'error');
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
    exit;
}
?>