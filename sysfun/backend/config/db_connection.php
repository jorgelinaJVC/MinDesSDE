<?php
/**
 * Clase para manejar la conexión a la base de datos
 * usando el patrón Singleton
 */
class Database {
    /**
     * @var Database|null Instancia única de la clase
     */
    private static $instance = null;
    
    /**
     * @var PDO Conexión a la base de datos
     */
    private $conn;
    
    /**
     * Constructor privado para evitar instancias múltiples
     */
    private function __construct() {
        // Cargar configuración
        require_once __DIR__ . '/database.php';
        
        try {
            $this->conn = new PDO(
                'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                DB_USER,
                DB_PASS
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            die('Error de conexión: ' . $e->getMessage());
        }
    }
    
    /**
     * Obtiene la instancia única de la clase
     * 
     * @return Database
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }
    
    /**
     * Obtiene la conexión PDO
     * 
     * @return PDO
     */
    public function getConnection() {
        return $this->conn;
    }
}
?>