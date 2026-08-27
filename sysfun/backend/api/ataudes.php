<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require_once __DIR__ . '/../config/db_connection.php';

/** @var PDO $db */
$db = Database::getInstance()->getConnection();
$stmt = $db->query('
    SELECT id_ataud, codigo_renglon, nombre, largo_mts, tiene_chapa,
           stock_actual, stock_minimo, activo
    FROM catalogo_ataudes
    WHERE activo = 1
    ORDER BY codigo_renglon
');
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>