<?php
header('Content-Type: application/json');

echo json_encode([
    'status' => 'ok',
    'message' => 'El servidor PHP funciona correctamente',
    'timestamp' => date('Y-m-d H:i:s')
]);
?>