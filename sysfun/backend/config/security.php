<?php
/**
 * Funciones de Seguridad para el Sistema Fúnebre
 */

// Iniciar sesión segura si no está iniciada
function iniciarSesionSegura() {
    if (session_status() === PHP_SESSION_NONE) {
        ini_set('session.cookie_httponly', 1);
        ini_set('session.cookie_secure', defined('COOKIE_SECURE') ? COOKIE_SECURE : 0);
        ini_set('session.cookie_samesite', 'Lax');
        ini_set('session.use_strict_mode', 1);
        session_start();
    }
}

// Generar token CSRF
function generarTokenCSRF() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

// Verificar token CSRF
function verificarTokenCSRF($token) {
    if (!isset($_SESSION['csrf_token']) || empty($token)) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

// Sanitizar entrada de texto
function sanitizarInput($data, $tipo = 'string') {
    if (is_array($data)) {
        return array_map(function($value) use ($tipo) {
            return sanitizarInput($value, $tipo);
        }, $data);
    }
    
    $data = trim($data);
    $data = stripslashes($data);
    
    switch($tipo) {
        case 'email':
            return filter_var($data, FILTER_SANITIZE_EMAIL);
        case 'int':
            return filter_var($data, FILTER_SANITIZE_NUMBER_INT);
        case 'float':
            return filter_var($data, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
        case 'url':
            return filter_var($data, FILTER_SANITIZE_URL);
        default:
            return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    }
}

// Validar y sanitar archivo subido
function validarArchivoSubido($file, $allowedTypes = [], $maxSize = 5242880) {
    $errors = [];
    
    if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
        $errors[] = 'Error en la subida del archivo';
        return ['valido' => false, 'errores' => $errors];
    }
    
    // Validar tamaño
    if ($file['size'] > $maxSize) {
        $errors[] = 'El archivo excede el tamaño máximo permitido (' . ($maxSize / 1024 / 1024) . 'MB)';
    }
    
    // Validar tipo MIME real (no confiar en el declarado)
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $realMimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($realMimeType, $allowedTypes)) {
        $errors[] = 'Tipo de archivo no permitido. Tipos permitidos: ' . implode(', ', $allowedTypes);
    }
    
    // Validar extensión
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowedExtensions = array_map(function($type) {
        $extMap = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'application/pdf' => 'pdf',
            'application/msword' => 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx'
        ];
        return $extMap[$type] ?? '';
    }, $allowedTypes);
    
    if (!in_array($extension, $allowedExtensions)) {
        $errors[] = 'Extensión de archivo no permitida';
    }
    
    // Verificar que no sea un archivo vacío
    if ($file['size'] === 0) {
        $errors[] = 'El archivo está vacío';
    }
    
    return [
        'valido' => empty($errors),
        'errores' => $errors,
        'extension' => $extension,
        'mime_type' => $realMimeType
    ];
}

// Generar nombre seguro para archivo
function generarNombreArchivoSeguro($originalName, $prefix = '') {
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $nombreUnico = bin2hex(random_bytes(16));
    $timestamp = time();
    
    return $prefix . $nombreUnico . '_' . $timestamp . '.' . $extension;
}

// Limpiar nombre de archivo (eliminar caracteres peligrosos)
function limpiarNombreArchivo($filename) {
    $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
    $filename = preg_replace('/_+/', '_', $filename);
    return substr($filename, 0, 100);
}

// Registrar log de error
function registrarLog($mensaje, $nivel = 'error', $archivo = null) {
    $logFile = $archivo ?? (defined('LOG_FILE') ? LOG_FILE : '../logs/error.log');
    $logDir = dirname($logFile);
    
    if (!file_exists($logDir)) {
        mkdir($logDir, 0750, true);
    }
    
    $fecha = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $usuario = isset($_SESSION['empleado_id']) ? 'ID:' . $_SESSION['empleado_id'] : 'anonimo';
    
    $logEntry = "[$fecha] [$nivel] [IP:$ip] [User:$usuario] $mensaje" . PHP_EOL;
    
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

// Configurar cabeceras de seguridad
function setCabecerasSeguridad() {
    // Prevenir clickjacking
    header('X-Frame-Options: DENY');
    header('X-Content-Type-Options: nosniff');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    
    // Content Security Policy (ajustar según necesidades)
    $csp = "default-src 'self'; "
         . "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
         . "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
         . "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
         . "img-src 'self' data: https:; "
         . "connect-src 'self'; "
         . "frame-ancestors 'none';";
    
    header("Content-Security-Policy: $csp");
}

// Verificar si es petición AJAX
function esPeticionAJAX() {
    return !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
           strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
}

// Rate limiting básico
function verificarRateLimit($accion, $limite = 5, $tiempo = 300) {
    $key = 'ratelimit_' . $accion . '_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $ahora = time();
    
    if (!isset($_SESSION[$key])) {
        $_SESSION[$key] = ['intentos' => 0, 'tiempo' => $ahora];
    }
    
    // Resetear si pasó el tiempo
    if ($ahora - $_SESSION[$key]['tiempo'] > $tiempo) {
        $_SESSION[$key] = ['intentos' => 0, 'tiempo' => $ahora];
    }
    
    $_SESSION[$key]['intentos']++;
    
    if ($_SESSION[$key]['intentos'] > $limite) {
        return false;
    }
    
    return true;
}
?>