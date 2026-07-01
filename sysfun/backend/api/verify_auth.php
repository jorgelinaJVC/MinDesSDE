<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:8000');
header('Access-Control-Allow-Credentials: true');

require_once __DIR__ . '/../config/db_connection.php';

define('COOKIE_SECURE', true);
define('COOKIE_HTTPONLY', true);
define('COOKIE_SAMESITE', 'Strict');
define('COOKIE_PATH', '/');

function verifyToken($token) {
    $secret_key = 'tu_clave_secreta_muy_segura_cambiar_en_produccion';
    try {
        $decoded = base64_decode($token);
        if ($decoded === false) return null;
        
        $parts = explode('|', $decoded);
        if (count($parts) !== 2) return null;
        
        $token_data = $parts[0];
        $signature = $parts[1];
        
        $expected_signature = hash_hmac('sha256', $token_data, $secret_key);
        if (!hash_equals($expected_signature, $signature)) return null;
        
        $payload = json_decode($token_data, true);
        if ($payload === null) return null;
        
        // Verificar expiración
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null;
        }
        
        return $payload;
    } catch (Exception $e) {
        return null;
    }
}

// Verificar si la cookie existe
if (isset($_COOKIE['auth_token'])) {
    $token = $_COOKIE['auth_token'];
    $payload = verifyToken($token);
    
    if ($payload) {
        // Token válido, obtener datos del usuario
        try {
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare('SELECT id_empleado, nombre, apellido, usuario, email, id_rol FROM empleados WHERE id_empleado = ? AND activo = 1');
            $stmt->execute([$payload['id']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                echo json_encode([
                    'authenticated' => true,
                    'user' => $user
                ]);
                exit;
            }
        } catch (PDOException $e) {
            // Error de base de datos
        }
    }
}

// No autenticado
echo json_encode(['authenticated' => false]);
?>