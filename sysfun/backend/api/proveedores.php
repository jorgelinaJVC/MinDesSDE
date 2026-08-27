<?php
/**
 * API REST para Proveedores
 * CRUD completo
 */
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
            $stmt = $db->prepare('SELECT * FROM proveedores WHERE id_proveedor = ?');
            $stmt->execute([$_GET['id']]);
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        } else {
            $stmt = $db->query('SELECT * FROM proveedores ORDER BY id_proveedor DESC');
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare('
            INSERT INTO proveedores (razon_social, nombre_comercial, cuit, direccion,
            telefono, email, contacto_nombre, contacto_telefono, condicion_iva, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $data['razon_social'],
            $data['nombre_comercial'] ?? null,
            $data['cuit'] ?? null,
            $data['direccion'] ?? null,
            $data['telefono'] ?? null,
            $data['email'] ?? null,
            $data['contacto_nombre'] ?? null,
            $data['contacto_telefono'] ?? null,
            $data['condicion_iva'] ?? null,
            $data['activo'] ?? 1
        ]);
        echo json_encode(['message' => 'Proveedor creado exitosamente', 'id' => $db->lastInsertId()]);
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
            UPDATE proveedores SET
            razon_social=?, nombre_comercial=?, cuit=?, direccion=?,
            telefono=?, email=?, contacto_nombre=?, contacto_telefono=?,
            condicion_iva=?, activo=?
            WHERE id_proveedor=?
        ');
        $stmt->execute([
            $data['razon_social'],
            $data['nombre_comercial'] ?? null,
            $data['cuit'] ?? null,
            $data['direccion'] ?? null,
            $data['telefono'] ?? null,
            $data['email'] ?? null,
            $data['contacto_nombre'] ?? null,
            $data['contacto_telefono'] ?? null,
            $data['condicion_iva'] ?? null,
            $data['activo'] ?? 1,
            $id
        ]);
        echo json_encode(['message' => 'Proveedor actualizado exitosamente']);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['message' => 'ID requerido']);
            exit;
        }
        $stmt = $db->prepare('DELETE FROM proveedores WHERE id_proveedor = ?');
        $stmt->execute([$id]);
        echo json_encode(['message' => 'Proveedor eliminado exitosamente']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['message' => 'Método no permitido']);
}
?>