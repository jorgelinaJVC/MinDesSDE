<?php
require_once '../config/config.php';
require_login();
header('Content-Type: application/json');

$db = (new Database())->getConnection();
$id = (int)($_GET['id_departamento'] ?? 0);
$stmt = $db->prepare("SELECT id_localidad, nombre FROM localidades WHERE id_departamento = ? AND activo = 1 ORDER BY nombre");
$stmt->execute([$id]);
echo json_encode($stmt->fetchAll());
?>