<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require_once __DIR__ . '/../config/db_connection.php';

$method = $_SERVER['REQUEST_METHOD'];
/** @var PDO $db */
$db = Database::getInstance()->getConnection();

// Obtener parámetros
$tipo = $_GET['tipo'] ?? 'solicitudes';
$fecha_inicio = $_GET['fecha_inicio'] ?? null;
$fecha_fin = $_GET['fecha_fin'] ?? null;

try {
    $data = [];
    
    switch($tipo) {
        case 'solicitudes':
            $sql = '
                SELECT
                    s.nro_pedido,
                    s.fecha_solicitud,
                    s.estado,
                    s.tipo_servicio,
                    CONCAT(f.nombre, " ", f.apellido) as fallecido,
                    CONCAT(r.nombre, " ", r.apellido) as responsable,
                    c.nombre as ataud,
                    v.patente as vehiculo
                FROM solicitudes s
                LEFT JOIN fallecidos f ON s.id_fallecido = f.id_fallecido
                LEFT JOIN responsables r ON s.id_responsable = r.id_responsable
                LEFT JOIN catalogo_ataudes c ON s.id_ataud_asignado = c.id_ataud
                LEFT JOIN vehiculos v ON s.id_vehiculo_asignado = v.id_vehiculo
            ';
            if ($fecha_inicio && $fecha_fin) {
                $sql .= ' WHERE s.fecha_solicitud BETWEEN ? AND ?';
                $params = [$fecha_inicio, $fecha_fin];
            } else {
                $params = [];
            }
            $sql .= ' ORDER BY s.fecha_solicitud DESC';
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;
            
        case 'stock':
            $stmt = $db->query('
                SELECT id_ataud, codigo_renglon, nombre, stock_actual, stock_minimo
                FROM catalogo_ataudes
                WHERE activo = 1
                ORDER BY codigo_renglon
            ');
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;
            
        case 'empleados':
            $stmt = $db->query('
                SELECT e.id_empleado, e.nombre, e.apellido, e.usuario, e.email, e.telefono, e.activo, r.nombre_rol
                FROM empleados e
                LEFT JOIN roles r ON e.id_rol = r.id_rol
                ORDER BY e.id_empleado DESC
            ');
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;
            
        case 'vehiculos':
            $stmt = $db->query('
                SELECT id_vehiculo, patente, marca, modelo, tipo, estado, activo
                FROM vehiculos
                ORDER BY id_vehiculo DESC
            ');
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['message' => 'Tipo de reporte no válido']);
            exit;
    }
    
    echo json_encode($data);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error en la base de datos: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>