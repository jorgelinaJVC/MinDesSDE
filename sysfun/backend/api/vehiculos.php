<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require_once __DIR__ . '/../config/db_connection.php';

$method = $_SERVER['REQUEST_METHOD'];
/** @var PDO $db */
$db = Database::getInstance()->getConnection();

switch($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $stmt = $db->prepare('SELECT * FROM vehiculos WHERE id_vehiculo = ?');
            $stmt->execute([$_GET['id']]);
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        } else {
            $stmt = $db->query('SELECT * FROM vehiculos ORDER BY id_vehiculo DESC');
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare('
            INSERT INTO vehiculos (patente, numero_interno, marca, modelo, año, tipo,
            capacidad_ataudes, capacidad_acompañantes, estado, seguro_poliza,
            seguro_vencimiento, vtv_vencimiento, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $data['patente'],
            $data['numero_interno'],
            $data['marca'],
            $data['modelo'],
            $data['año'],
            $data['tipo'],
            $data['capacidad_ataudes'] ?? 1,
            $data['capacidad_acompañantes'] ?? 2,
            $data['estado'] ?? 'DISPONIBLE',
            $data['seguro_poliza'] ?? null,
            $data['seguro_vencimiento'] ?? null,
            $data['vtv_vencimiento'] ?? null,
            $data['activo'] ?? 1
        ]);
        echo json_encode(['message' => 'Vehículo creado exitosamente', 'id' => $db->lastInsertId()]);
        break;

    case 'PUT':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['message' => 'ID requerido']);
            exit;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare('
            UPDATE vehiculos SET
            patente=?, numero_interno=?, marca=?, modelo=?, año=?, tipo=?,
            capacidad_ataudes=?, capacidad_acompañantes=?, estado=?,
            seguro_poliza=?, seguro_vencimiento=?, vtv_vencimiento=?, activo=?
            WHERE id_vehiculo=?
        ');
        $stmt->execute([
            $data['patente'],
            $data['numero_interno'],
            $data['marca'],
            $data['modelo'],
            $data['año'],
            $data['tipo'],
            $data['capacidad_ataudes'] ?? 1,
            $data['capacidad_acompañantes'] ?? 2,
            $data['estado'] ?? 'DISPONIBLE',
            $data['seguro_poliza'] ?? null,
            $data['seguro_vencimiento'] ?? null,
            $data['vtv_vencimiento'] ?? null,
            $data['activo'] ?? 1,
            $id
        ]);
        echo json_encode(['message' => 'Vehículo actualizado exitosamente']);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['message' => 'ID requerido']);
            exit;
        }
        $stmt = $db->prepare('DELETE FROM vehiculos WHERE id_vehiculo = ?');
        $stmt->execute([$id]);
        echo json_encode(['message' => 'Vehículo eliminado exitosamente']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['message' => 'Método no permitido']);
}
?>