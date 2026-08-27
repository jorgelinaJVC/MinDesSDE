<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:8000');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
    http_response_code(200);
    exit; 
}

require_once __DIR__ . '/../config/db_connection.php';

// ============================================
// MÉTODO GET - Obtener detalle
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $db = Database::getInstance()->getConnection();
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(['message' => 'ID de solicitud requerido']);
            exit;
        }
        
        $stmt = $db->prepare("
            SELECT 
                s.*,
                f.nombre as fallecido_nombre,
                f.apellido as fallecido_apellido,
                f.nro_documento as fallecido_dni,
                f.tipo_doc as fallecido_tipo_doc,
                f.departamento as fallecido_departamento,
                f.localidad as fallecido_localidad,
                f.barrio as fallecido_barrio,
                f.domicilio as fallecido_domicilio,
                f.fecha_fallecimiento,
                f.progenitor_nombre,
                f.progenitor_nro_doc as progenitor_dni,
                f.observaciones as fallecido_observaciones,
                r.nombre as responsable_nombre,
                r.apellido as responsable_apellido,
                r.nro_documento as responsable_dni,
                r.tipo_doc as responsable_tipo_doc,
                r.departamento as responsable_departamento,
                r.localidad as responsable_localidad,
                r.barrio as responsable_barrio,
                r.domicilio as responsable_domicilio,
                r.telefono_1 as responsable_telefono,
                r.email as responsable_email,
                c.nombre as ataud_nombre,
                c.codigo_renglon as ataud_codigo,
                v.patente as vehiculo_patente,
                v.marca as vehiculo_marca,
                v.modelo as vehiculo_modelo,
                e.nombre as chofer_nombre
            FROM solicitudes s
            LEFT JOIN fallecidos f ON s.id_fallecido = f.id_fallecido
            LEFT JOIN responsables r ON s.id_responsable = r.id_responsable
            LEFT JOIN catalogo_ataudes c ON s.id_ataud_asignado = c.id_ataud
            LEFT JOIN vehiculos v ON s.id_vehiculo_asignado = v.id_vehiculo
            LEFT JOIN empleados e ON s.id_chofer_asignado = e.id_empleado
            WHERE s.id_solicitud = ?
        ");
        $stmt->execute([$id]);
        $solicitud = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($solicitud) {
            echo json_encode($solicitud);
        } else {
            http_response_code(404);
            echo json_encode(['message' => 'Solicitud no encontrada']);
        }
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// ============================================
// MÉTODO PUT - Actualizar detalle
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $db = Database::getInstance()->getConnection();
        $id = $_GET['id'] ?? null;
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(['message' => 'ID de solicitud requerido']);
            exit;
        }
        
        $stmt = $db->prepare("
            UPDATE solicitudes SET
                estado = ?,
                id_ataud_asignado = ?,
                id_vehiculo_asignado = ?,
                id_chofer_asignado = ?,
                observaciones = ?,
                modificado_por = ?
            WHERE id_solicitud = ?
        ");
        $stmt->execute([
            $input['estado'] ?? 'PENDIENTE',
            $input['id_ataud_asignado'] ?? null,
            $input['id_vehiculo_asignado'] ?? null,
            $input['id_chofer_asignado'] ?? null,
            $input['observaciones'] ?? '',
            1,
            $id
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Solicitud actualizada'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['message' => 'Método no permitido']);
?>