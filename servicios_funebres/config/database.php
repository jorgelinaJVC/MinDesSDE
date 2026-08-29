<?php
// config/database.php

$host = 'localhost';
$dbname = 'servicios_funebres';
$username = 'root';
$password = 'root';

try {
    // Configurar la conexión con charset y collation
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ]
    );
    
    // También forzar desde aquí
    $pdo->exec("SET collation_connection = utf8mb4_unicode_ci");
    $pdo->exec("SET collation_database = utf8mb4_unicode_ci");
    
} catch(PDOException $e) {
    die("Error de conexión: " . $e->getMessage());
}
?>