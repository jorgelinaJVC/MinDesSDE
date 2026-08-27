<?php
require_once __DIR__ . '/config/db_connection.php';

try {
    $db = Database::getInstance()->getConnection();
    echo "✅ Conexión exitosa a la base de datos 'servicios_funebres'";
    
    // Probar una consulta simple
    $stmt = $db->query("SELECT COUNT(*) as total FROM solicitudes");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "<br>Total de solicitudes: " . $result['total'];
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage();
}
?>