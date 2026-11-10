<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db_connection.php';

// Verificar autenticación
function verificarAuth() {
    if (session_status() === PHP_SESSION_NONE) session_start();
    
    if (!isset($_SESSION['empleado_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'No autenticado']);
        exit;
    }
    
    return $_SESSION['empleado_id'];
}

function verificarSuperAdmin($db, $empleado_id) {
    $stmt = $db->prepare('SELECT id_rol FROM empleados WHERE id_empleado = ?');
    $stmt->execute([$empleado_id]);
    $empleado = $stmt->fetch(PDO::FETCH_ASSOC);
    return $empleado && $empleado['id_rol'] == 1; // 1 = SUPERADMIN
}

// ============================================
// GET - Obtener perfil del usuario
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $empleado_id = verificarAuth();
        $db = Database::getInstance()->getConnection();
        
        $stmt = $db->prepare('
            SELECT e.*, r.nombre_rol
            FROM empleados e
            LEFT JOIN roles r ON e.id_rol = r.id_rol
            WHERE e.id_empleado = ?
        ');
        $stmt->execute([$empleado_id]);
        $perfil = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($perfil) {
            // No devolver el hash de contraseña
            unset($perfil['contraseña_hash']);
            echo json_encode(['success' => true, 'perfil' => $perfil]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// ============================================
// PUT - Actualizar perfil (datos personales)
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $empleado_id = verificarAuth();
        $db = Database::getInstance()->getConnection();
        $input = json_decode(file_get_contents('php://input'), true);
        
        $campos_permitidos = ['nombre', 'apellido', 'telefono', 'telefono_secundario', 'email', 'email_notificaciones'];
        $campos = [];
        $params = [];
        
        foreach ($campos_permitidos as $campo) {
            if (isset($input[$campo])) {
                $campos[] = "$campo = ?";
                $params[] = htmlspecialchars(trim($input[$campo]), ENT_QUOTES, 'UTF-8');
            }
        }
        
        if (empty($campos)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No hay campos para actualizar']);
            exit;
        }
        
        $params[] = $empleado_id;
        $sql = "UPDATE empleados SET " . implode(', ', $campos) . " WHERE id_empleado = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(['success' => true, 'message' => 'Perfil actualizado exitosamente']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// ============================================
// POST - Cambiar contraseña
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $empleado_id = verificarAuth();
        $db = Database::getInstance()->getConnection();
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['password_actual']) || !isset($input['password_nueva'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Contraseñas requeridas']);
            exit;
        }
        
        // Verificar contraseña actual
        $stmt = $db->prepare('SELECT contraseña_hash FROM empleados WHERE id_empleado = ?');
        $stmt->execute([$empleado_id]);
        $empleado = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$empleado || !password_verify($input['password_actual'], $empleado['contraseña_hash'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Contraseña actual incorrecta']);
            exit;
        }
        
        // Validar nueva contraseña (mínimo 8 caracteres)
        if (strlen($input['password_nueva']) < 8) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'La nueva contraseña debe tener al menos 8 caracteres']);
            exit;
        }
        
        // Actualizar contraseña
        $nuevo_hash = password_hash($input['password_nueva'], PASSWORD_BCRYPT);
        $stmt = $db->prepare('
            UPDATE empleados 
            SET contraseña_hash = ?, 
                primer_ingreso = 0,
                ultimo_cambio_password = CURRENT_TIMESTAMP
            WHERE id_empleado = ?
        ');
        $stmt->execute([$nuevo_hash, $empleado_id]);
        
        // Registrar en historial
        $stmt = $db->prepare('
            INSERT INTO historial_password (empleado_id, ip, user_agent)
            VALUES (?, ?, ?)
        ');
        $stmt->execute([
            $empleado_id,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Contraseña actualizada exitosamente']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// ============================================
// POST - Subir foto de perfil
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['foto_perfil'])) {
    try {
        $empleado_id = verificarAuth();
        $db = Database::getInstance()->getConnection();
        
        $file = $_FILES['foto_perfil'];
        
        // Validar tipo de archivo
        $allowed_types = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!in_array($file['type'], $allowed_types)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Solo se permiten imágenes JPG o PNG']);
            exit;
        }
        
        // Validar tamaño (máximo 2MB)
        if ($file['size'] > 2 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'La imagen no debe superar los 2MB']);
            exit;
        }
        
        // Crear directorio si no existe
        $upload_dir = __DIR__ . '/../../uploads/perfiles/';
        if (!file_exists($upload_dir)) {
            mkdir($upload_dir, 0750, true);
        }
        
        // Generar nombre único
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $nombre_unico = bin2hex(random_bytes(16)) . '.' . $extension;
        $ruta_completa = $upload_dir . $nombre_unico;
        
        if (move_uploaded_file($file['tmp_name'], $ruta_completa)) {
            // Eliminar foto anterior si existe
            $stmt = $db->prepare('SELECT foto_perfil FROM empleados WHERE id_empleado = ?');
            $stmt->execute([$empleado_id]);
            $empleado = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($empleado['foto_perfil'] && file_exists($upload_dir . $empleado['foto_perfil'])) {
                unlink($upload_dir . $empleado['foto_perfil']);
            }
            
            // Actualizar en BD
            $stmt = $db->prepare('UPDATE empleados SET foto_perfil = ? WHERE id_empleado = ?');
            $stmt->execute([$nombre_unico, $empleado_id]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Foto de perfil actualizada',
                'ruta' => $nombre_unico
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al subir la imagen']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Método no permitido']);
?>