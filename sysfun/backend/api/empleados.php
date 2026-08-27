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
        $stmt = $db->query('
            SELECT e.*, r.nombre_rol
            FROM empleados e
            LEFT JOIN roles r ON e.id_rol = r.id_rol
            ORDER BY e.id_empleado DESC
        ');
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['password'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Contraseña requerida']);
            exit;
        }
        $hash = password_hash($data['password'], PASSWORD_DEFAULT);
        $stmt = $db->prepare('
            INSERT INTO empleados (nombre, apellido, usuario, email, telefono, contraseña_hash, id_rol, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $data['nombre'],
            $data['apellido'],
            $data['usuario'],
            $data['email'],
            $data['telefono'],
            $hash,
            $data['id_rol'],
            $data['activo'] ?? 1
        ]);
        echo json_encode(['message' => 'Empleado creado exitosamente']);
        break;

    case 'PUT':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['message' => 'ID requerido']);
            exit;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        $sql = 'UPDATE empleados SET nombre=?, apellido=?, usuario=?, email=?, telefono=?, id_rol=?, activo=?';
        $params = [
            $data['nombre'],
            $data['apellido'],
            $data['usuario'],
            $data['email'],
            $data['telefono'],
            $data['id_rol'],
            $data['activo'] ?? 1
        ];
        if (!empty($data['password'])) {
            $sql .= ', contraseña_hash=?';
            $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        $sql .= ' WHERE id_empleado=?';
        $params[] = $id;
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['message' => 'Empleado actualizado exitosamente']);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['message' => 'ID requerido']);
            exit;
        }
        $stmt = $db->prepare('DELETE FROM empleados WHERE id_empleado = ?');
        $stmt->execute([$id]);
        echo json_encode(['message' => 'Empleado eliminado']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['message' => 'Método no permitido']);
}
?>