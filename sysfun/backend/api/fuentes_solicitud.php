<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $db_file = __DIR__ . '/../config/database.php';
    if (!file_exists($db_file)) {
        throw new Exception("Archivo database.php no encontrado");
    }
    require_once $db_file;
    
    $db = getDBConnection();
    if (!$db) {
        throw new Exception("No se pudo conectar a la base de datos");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
    exit;
}

function getEmpleadoId() {
    if (session_status() === PHP_SESSION_NONE) session_start();
    return isset($_SESSION['empleado_id']) ? intval($_SESSION['empleado_id']) : 1;
}

// ============================================
// GET - Listar fuentes o buscar por ID
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Si se pide una fuente específica por ID
        if (isset($_GET['id'])) {
            $stmt = $db->prepare("SELECT * FROM fuentes_solicitud WHERE id_fuente = ?");
            $stmt->execute([$_GET['id']]);
            $fuente = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($fuente) {
                echo json_encode($fuente);
            } else {
                http_response_code(404);
                echo json_encode(['error' => true, 'message' => 'Fuente no encontrada']);
            }
            exit;
        }

        // Listar todas las fuentes
        $sql = "SELECT * FROM fuentes_solicitud WHERE 1=1";
        $params = [];
        
        if (isset($_GET['activas']) && $_GET['activas'] === '1') {
            $sql .= " AND activo = 1";
        }
        
        $sql .= " ORDER BY orden ASC, nombre ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => true, 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// ============================================
// POST - Crear nueva fuente
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['nombre']) || !isset($input['tipo'])) {
            http_response_code(400);
            echo json_encode(['error' => true, 'message' => 'Nombre y tipo son requeridos']);
            exit;
        }
        
        $stmt = $db->prepare("
            INSERT INTO fuentes_solicitud (nombre, tipo, direccion, telefono, orden, activo, creado_por)
            VALUES (?, ?, ?, ?, ?, 1, ?)
        ");
        
        $stmt->execute([
            $input['nombre'],
            $input['tipo'],
            $input['direccion'] ?? null,
            $input['telefono'] ?? null,
            intval($input['orden'] ?? 0),
            getEmpleadoId()
        ]);
        
        echo json_encode([
            'success' => true, 
            'message' => 'Fuente creada exitosamente',
            'id' => $db->lastInsertId()
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => true, 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// ============================================
// PUT - Actualizar fuente
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => true, 'message' => 'ID requerido']);
            exit;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['nombre']) || !isset($input['tipo'])) {
            http_response_code(400);
            echo json_encode(['error' => true, 'message' => 'Nombre y tipo son requeridos']);
            exit;
        }
        
        $stmt = $db->prepare("
            UPDATE fuentes_solicitud SET
                nombre = ?,
                tipo = ?,
                direccion = ?,
                telefono = ?,
                orden = ?
            WHERE id_fuente = ?
        ");
        
        $stmt->execute([
            $input['nombre'],
            $input['tipo'],
            $input['direccion'] ?? null,
            $input['telefono'] ?? null,
            intval($input['orden'] ?? 0),
            $id
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Fuente actualizada exitosamente']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => true, 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// ============================================
// DELETE - Desactivar fuente (soft delete)
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => true, 'message' => 'ID requerido']);
            exit;
        }
        
        $stmt = $db->prepare("UPDATE fuentes_solicitud SET activo = 0 WHERE id_fuente = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true, 'message' => 'Fuente desactivada exitosamente']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => true, 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// Método no permitido
http_response_code(405);
echo json_encode(['error' => true, 'message' => 'Método no permitido']);
?>