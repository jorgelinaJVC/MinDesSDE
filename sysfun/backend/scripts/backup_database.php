<?php
/**
 * Script de Backup Automático de Base de Datos
 * Ejecutar vía cron: 0 2 * * * php /ruta/al/backup_database.php
 */

require_once __DIR__ . '/../config/db_connection.php';

// Configuración
$backupDir = __DIR__ . '/../../backups/';
$dbHost = defined('DB_HOST') ? DB_HOST : 'localhost';
$dbName = defined('DB_NAME') ? DB_NAME : 'servicios_funebres';
$dbUser = defined('DB_USER') ? DB_USER : 'root';
$dbPass = defined('DB_PASS') ? DB_PASS : 'root';

// Crear directorio si no existe
if (!file_exists($backupDir)) {
    mkdir($backupDir, 0750, true);
}

$fecha = date('Y-m-d_H-i-s');
$backupFile = $backupDir . "backup_{$dbName}_{$fecha}.sql";

// Comando mysqldump
$command = "mysqldump --user={$dbUser} --password={$dbPass} --host={$dbHost} "
         . "--add-drop-table --routines --triggers {$dbName} > {$backupFile}";

// Ejecutar backup
exec($command, $output, $returnVar);

if ($returnVar === 0) {
    // Comprimir el backup
    $compressedFile = $backupFile . '.gz';
    $gzFile = gzopen($compressedFile, 'wb9');
    $sqlFile = fopen($backupFile, 'rb');
    
    while (!feof($sqlFile)) {
        gzwrite($gzFile, fread($sqlFile, 1024 * 512));
    }
    
    fclose($sqlFile);
    gzclose($gzFile);
    unlink($backupFile); // Eliminar SQL sin comprimir
    
    // Eliminar backups antiguos (mantener últimos 7 días)
    $backups = glob($backupDir . 'backup_*.sql.gz');
    foreach ($backups as $backup) {
        if (filemtime($backup) < strtotime('-7 days')) {
            unlink($backup);
        }
    }
    
    echo "Backup exitoso: {$compressedFile}\n";
    exit(0);
} else {
    echo "Error en backup\n";
    exit(1);
}
?>