<?php
// config/config.php

define('BASE_URL', '/servicios_funebres/');

// Configuración de la base de datos
$host = 'localhost';
$dbname = 'servicios_funebres';
$username = 'root';
$password = 'root';

try {
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
} catch(PDOException $e) {
    die("Error de conexión: " . $e->getMessage());
}

// Clase Database para compatibilidad
class Database {
    private $connection;
    
    public function __construct() {
        global $pdo;
        $this->connection = $pdo;
    }
    
    public function getConnection() {
        return $this->connection;
    }
}
?>