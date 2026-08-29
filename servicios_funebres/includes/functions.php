<?php
// includes/functions.php

function require_login() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (!isset($_SESSION['empleado_id'])) {
        header('Location: ../auth/login.php');
        exit;
    }
}

function sanitize($input) {
    return htmlspecialchars($input ?? '', ENT_QUOTES, 'UTF-8');
}

function get_estado_color($estado) {
    $colors = [
        'PENDIENTE' => 'secondary',
        'EN_REVISION' => 'info',
        'ASIGNADO' => 'primary',
        'EN_EJECUCION' => 'warning',
        'COMPLETADO' => 'success',
        'ANULADO' => 'danger'
    ];
    return $colors[$estado] ?? 'secondary';
}

// ✅ FUNCIÓN AGREGADA: Formatear fecha
function format_date($fecha, $formato = 'd/m/Y') {
    if (empty($fecha)) {
        return '-';
    }
    $timestamp = strtotime($fecha);
    if ($timestamp === false) {
        return $fecha;
    }
    return date($formato, $timestamp);
}

// ✅ FUNCIÓN AGREGADA: Formatear fecha y hora
function format_datetime($fecha, $formato = 'd/m/Y H:i') {
    if (empty($fecha)) {
        return '-';
    }
    $timestamp = strtotime($fecha);
    if ($timestamp === false) {
        return $fecha;
    }
    return date($formato, $timestamp);
}

// ✅ FUNCIÓN AGREGADA: Truncar texto
function truncate_text($texto, $limite = 50) {
    if (strlen($texto) <= $limite) {
        return $texto;
    }
    return substr($texto, 0, $limite) . '...';
}
?>