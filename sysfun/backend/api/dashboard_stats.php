<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require_once __DIR__ . '/../config/db_connection.php';

try {
    /** @var PDO $db */
    $db = Database::getInstance()->getConnection();
    $data = [];

    // 1. Total de solicitudes por estado
    $stmt = $db->query('
        SELECT estado, COUNT(*) as total
        FROM solicitudes
        GROUP BY estado
    ');
    $data['estados'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Solicitudes por mes (últimos 6 meses)
    $stmt = $db->query('
        SELECT
            DATE_FORMAT(fecha_solicitud, "%Y-%m") as mes,
            COUNT(*) as total
        FROM solicitudes
        WHERE fecha_solicitud >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(fecha_solicitud, "%Y-%m")
        ORDER BY mes
    ');
    $data['mensual'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Estado del stock de ataúdes
    $stmt = $db->query('
        SELECT
            CASE
                WHEN stock_actual <= 0 THEN "Sin Stock"
                WHEN stock_actual < stock_minimo THEN "Bajo Stock"
                ELSE "Normal"
            END as estado_stock,
            COUNT(*) as total
        FROM catalogo_ataudes
        WHERE activo = 1
        GROUP BY estado_stock
    ');
    $data['stock'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Top 5 ataúdes más usados
    $stmt = $db->query('
        SELECT
            c.nombre,
            COUNT(s.id_solicitud) as total
        FROM catalogo_ataudes c
        LEFT JOIN solicitudes s ON c.id_ataud = s.id_ataud_asignado
        GROUP BY c.id_ataud
        ORDER BY total DESC
        LIMIT 5
    ');
    $data['top_ataudes'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Tipos de servicio más usados (NUEVO)
    $stmt = $db->query("
        SELECT 
            tipo_servicio, 
            COUNT(*) as total 
        FROM solicitudes 
        WHERE tipo_servicio IS NOT NULL AND tipo_servicio != ''
        GROUP BY tipo_servicio
        ORDER BY total DESC
    ");
    $data['tipos_servicio'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 6. Total de empleados activos
    $stmt = $db->query('
        SELECT COUNT(*) as total
        FROM empleados
        WHERE activo = 1
    ');
    $empleados = $stmt->fetch(PDO::FETCH_ASSOC);
    $data['empleados_activos'] = $empleados['total'] ?? 0;

    // 7. Total de vehículos disponibles
    $stmt = $db->query('
        SELECT COUNT(*) as total
        FROM vehiculos
        WHERE estado = "DISPONIBLE" AND activo = 1
    ');
    $vehiculos = $stmt->fetch(PDO::FETCH_ASSOC);
    $data['vehiculos_disponibles'] = $vehiculos['total'] ?? 0;

    // 8. Total de proveedores activos
    $stmt = $db->query('
        SELECT COUNT(*) as total
        FROM proveedores
        WHERE activo = 1
    ');
    $proveedores = $stmt->fetch(PDO::FETCH_ASSOC);
    $data['proveedores_activos'] = $proveedores['total'] ?? 0;

    // 9. Stock total de ataúdes
    $stmt = $db->query('
        SELECT SUM(stock_actual) as total
        FROM catalogo_ataudes
        WHERE activo = 1
    ');
    $stockTotal = $stmt->fetch(PDO::FETCH_ASSOC);
    $data['stock_total'] = $stockTotal['total'] ?? 0;

    // Enviar UNA SOLA respuesta JSON con todos los datos
    echo json_encode($data);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error de base de datos: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>