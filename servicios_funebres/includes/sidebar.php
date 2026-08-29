<?php
// includes/sidebar.php
$current_page = basename($_SERVER['PHP_SELF']);
?>
<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container-fluid">
        <a class="navbar-brand" href="../dashboard/index.php">
            <i class="bi bi-house"></i> Servicios Funebres
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav me-auto">
                <li class="nav-item">
                    <a class="nav-link <?= $current_page == 'index.php' ? 'active' : '' ?>" href="../dashboard/index.php">
                        <i class="bi bi-speedometer2"></i> Dashboard
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="../modules/solicitudes/index.php">
                        <i class="bi bi-list-ul"></i> Solicitudes
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="../modules/stock/index.php">
                        <i class="bi bi-box-seam"></i> Stock
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="../modules/vehiculos/index.php">
                        <i class="bi bi-truck"></i> Vehículos
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="../modules/empleados/index.php">
                        <i class="bi bi-people"></i> Empleados
                    </a>
                </li>
            </ul>
            <span class="navbar-text text-white me-3">
                <i class="bi bi-person-circle"></i>
                <?= $_SESSION['empleado_nombre'] ?? 'Usuario' ?>
            </span>
            <a href="../auth/logout.php" class="btn btn-outline-light btn-sm">
                <i class="bi bi-box-arrow-right"></i> Salir
            </a>
        </div>
    </div>
</nav>