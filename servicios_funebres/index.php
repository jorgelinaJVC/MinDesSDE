<?php
// index.php (raíz del proyecto)
session_start();

if (isset($_SESSION['empleado_id'])) {
    header('Location: dashboard/index.php');
} else {
    header('Location: auth/login.php');
}
exit;
?>