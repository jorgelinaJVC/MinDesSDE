<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require_once __DIR__ . '/../config/db_connection.php';

/** @var PDO $db */
$db = Database::getInstance()->getConnection();
$stmt = $db->query('SELECT id_rol, nombre_rol FROM roles ORDER BY id_rol');
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>