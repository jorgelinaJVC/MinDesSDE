<?php
// Configuración de errores según el entorno
$hostActual =
    strtolower(
        $_SERVER['HTTP_HOST'] ?? ''
    );

$hostSinPuerto =
    preg_replace(
        '/:\d+$/',
        '',
        $hostActual
    );

$esProduccion =
    !in_array(
        $hostSinPuerto,
        [
            'localhost',
            '127.0.0.1',
            '[::1]',
            '::1'
        ],
        true
    );
if ($esProduccion) {
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '1');
    ini_set('log_errors', '1');
    error_reporting(E_ALL);
}
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
$usaHttps =
    (!empty($_SERVER['HTTPS']) &&
     $_SERVER['HTTPS'] !== 'off');
if ($usaHttps) {
    header('Strict-Transport-Security: max-age=31536000');
}
$host =
    getenv('DB_HOST')
    ?: '127.0.0.1';

$db =
    getenv('DB_NAME')
    ?: 'mds_contenidos';

$user =
    getenv('DB_USER')
    ?: 'root';

$pass =
    getenv('DB_PASS');

if ($pass === false) {
    $pass = '';
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'message'=>'No se pudo conectar a la base de datos.']);
    exit;
}