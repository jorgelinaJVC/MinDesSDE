<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
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

// GET - Obtener configuración
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Si se pide una sección específica
        if (isset($_GET['seccion'])) {
            $stmt = $db->prepare("SELECT * FROM configuracion_sitio WHERE seccion = ? ORDER BY id_config");
            $stmt->execute([$_GET['seccion']]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Convertir a objeto clave-valor
            $config = [];
            foreach ($result as $row) {
                $config[$row['clave']] = $row['valor'];
            }
            echo json_encode($config);
            exit;
        }
        
        // Si se pide un campo específico
        if (isset($_GET['clave']) && isset($_GET['seccion'])) {
            $stmt = $db->prepare("SELECT valor FROM configuracion_sitio WHERE seccion = ? AND clave = ?");
            $stmt->execute([$_GET['seccion'], $_GET['clave']]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($result ? $result['valor'] : null);
            exit;
        }
        
        // Obtener toda la configuración agrupada por sección
        $stmt = $db->query("SELECT * FROM configuracion_sitio ORDER BY seccion, id_config");
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $config = [];
        foreach ($result as $row) {
            if (!isset($config[$row['seccion']])) {
                $config[$row['seccion']] = [];
            }
            $config[$row['seccion']][$row['clave']] = $row['valor'];
        }
        
        echo json_encode($config);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => true, 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// POST - Crear o actualizar configuración
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['seccion']) || !isset($input['clave']) || !isset($input['valor'])) {
            http_response_code(400);
            echo json_encode(['error' => true, 'message' => 'Faltan campos requeridos: seccion, clave, valor']);
            exit;
        }
        
        $empleado_id = getEmpleadoId();
        
        // Verificar si ya existe
        $stmt = $db->prepare("SELECT id_config FROM configuracion_sitio WHERE seccion = ? AND clave = ?");
        $stmt->execute([$input['seccion'], $input['clave']]);
        $existe = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existe) {
            // Actualizar
            $stmt = $db->prepare("
                UPDATE configuracion_sitio 
                SET valor = ?, modificado_por = ?
                WHERE seccion = ? AND clave = ?
            ");
            $stmt->execute([
                $input['valor'],
                $empleado_id,
                $input['seccion'],
                $input['clave']
            ]);
        } else {
            // Insertar
            $stmt = $db->prepare("
                INSERT INTO configuracion_sitio (seccion, clave, valor, tipo, descripcion, modificado_por)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $input['seccion'],
                $input['clave'],
                $input['valor'],
                $input['tipo'] ?? 'texto',
                $input['descripcion'] ?? null,
                $empleado_id
            ]);
        }
        
        echo json_encode(['success' => true, 'message' => 'Configuración guardada']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => true, 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// PUT - Actualizar múltiples valores
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['seccion']) || !isset($input['config'])) {
            http_response_code(400);
            echo json_encode(['error' => true, 'message' => 'Faltan campos requeridos']);
            exit;
        }
        
        $empleado_id = getEmpleadoId();
        $seccion = $input['seccion'];
        $config = $input['config'];
        
        $db->beginTransaction();
        
        foreach ($config as $clave => $valor) {
            $stmt = $db->prepare("SELECT id_config FROM configuracion_sitio WHERE seccion = ? AND clave = ?");
            $stmt->execute([$seccion, $clave]);
            $existe = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existe) {
                $stmt = $db->prepare("UPDATE configuracion_sitio SET valor = ?, modificado_por = ? WHERE seccion = ? AND clave = ?");
                $stmt->execute([$valor, $empleado_id, $seccion, $clave]);
            } else {
                $stmt = $db->prepare("INSERT INTO configuracion_sitio (seccion, clave, valor, modificado_por) VALUES (?, ?, ?, ?)");
                $stmt->execute([$seccion, $clave, $valor, $empleado_id]);
            }
        }
        
        $db->commit();
        echo json_encode(['success' => true, 'message' => 'Configuración actualizada']);
    } catch (PDOException $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => true, 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// GET - Campos del formulario
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['campos'])) {
    try {
        $seccion = $_GET['seccion'] ?? null;
        
        if ($seccion) {
            $stmt = $db->prepare("SELECT * FROM campos_formulario WHERE seccion = ? AND activo = 1 ORDER BY orden");
            $stmt->execute([$seccion]);
        } else {
            $stmt = $db->query("SELECT * FROM campos_formulario WHERE activo = 1 ORDER BY seccion, orden");
        }
        
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => true, 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => true, 'message' => 'Método no permitido']);
?>