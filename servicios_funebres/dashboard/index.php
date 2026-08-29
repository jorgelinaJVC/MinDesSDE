<?php
// dashboard/index.php
require_once '../includes/functions.php';
require_login();

$page_title = 'Dashboard';

// Incluir config para $pdo
require_once '../config/config.php';

$db = (new Database())->getConnection();

// Estadísticas
$stats = [];
try {
    $stats['solicitudes_pendientes'] = $db->query("SELECT COUNT(*) FROM solicitudes WHERE estado = 'PENDIENTE'")->fetchColumn();
    $stats['solicitudes_hoy'] = $db->query("SELECT COUNT(*) FROM solicitudes WHERE fecha_solicitud = CURDATE()")->fetchColumn();
    $stats['stock_bajo'] = $db->query("SELECT COUNT(*) FROM catalogo_ataudes WHERE stock_actual < stock_minimo AND activo = 1")->fetchColumn();
    $stats['vehiculos_disp'] = $db->query("SELECT COUNT(*) FROM vehiculos WHERE estado = 'DISPONIBLE' AND activo = 1")->fetchColumn();
} catch(PDOException $e) {
    die("Error en consulta: " . $e->getMessage());
}

// Stock bajo
$stock_bajo = $db->query("SELECT id_ataud, nombre, stock_actual, stock_minimo FROM catalogo_ataudes WHERE stock_actual < stock_minimo AND activo = 1 ORDER BY stock_actual ASC LIMIT 5")->fetchAll();

// Últimas solicitudes
$ultimas = $db->query("SELECT s.*, f.nombre as fnombre, f.apellido as fapellido, r.nombre as rnombre, r.apellido as rapellido 
                       FROM solicitudes s
                       JOIN fallecidos f ON s.id_fallecido = f.id_fallecido
                       JOIN responsables r ON s.id_responsable = r.id_responsable
                       ORDER BY s.fecha_registro DESC LIMIT 10")->fetchAll();

include '../includes/header.php';
include '../includes/sidebar.php';
?>

<div class="container-fluid mt-3">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h2><i class="bi bi-speedometer2"></i> Dashboard</h2>
        <a href="../modules/solicitudes/create.php" class="btn btn-primary">
            <i class="bi bi-plus-circle"></i> Nueva Solicitud
        </a>
    </div>

    <div class="row g-3 mb-4">
        <div class="col-md-3">
            <div class="card bg-warning text-dark">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <div>
                            <h6 class="text-uppercase">Pendientes</h6>
                            <h2><?= $stats['solicitudes_pendientes'] ?></h2>
                        </div>
                        <i class="bi bi-clock-history fs-1 opacity-50"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-primary text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <div>
                            <h6 class="text-uppercase">Hoy</h6>
                            <h2><?= $stats['solicitudes_hoy'] ?></h2>
                        </div>
                        <i class="bi bi-calendar-check fs-1 opacity-50"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-danger text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <div>
                            <h6 class="text-uppercase">Stock Bajo</h6>
                            <h2><?= $stats['stock_bajo'] ?></h2>
                        </div>
                        <i class="bi bi-box-seam fs-1 opacity-50"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-success text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <div>
                            <h6 class="text-uppercase">Vehículos Disp.</h6>
                            <h2><?= $stats['vehiculos_disp'] ?></h2>
                        </div>
                        <i class="bi bi-truck fs-1 opacity-50"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="row g-3">
        <div class="col-md-5">
            <div class="card">
                <div class="card-header"><i class="bi bi-exclamation-triangle"></i> Alertas de Stock</div>
                <div class="card-body">
                    <?php if (empty($stock_bajo)): ?>
                        <p class="text-muted text-center">Sin alertas</p>
                    <?php else: ?>
                        <table class="table table-sm">
                            <thead><tr><th>Artículo</th><th>Stock</th><th>Mínimo</th><th>Estado</th></tr></thead>
                            <tbody>
                            <?php foreach ($stock_bajo as $s): ?>
                                <tr>
                                    <td><?= sanitize($s['nombre']) ?></td>
                                    <td><strong><?= $s['stock_actual'] ?></strong></td>
                                    <td><?= $s['stock_minimo'] ?></td>
                                    <td>
                                        <?php if ($s['stock_actual'] <= 0): ?>
                                            <span class="badge bg-danger">Sin Stock</span>
                                        <?php else: ?>
                                            <span class="badge bg-warning text-dark">Bajo</span>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <div class="col-md-7">
            <div class="card">
                <div class="card-header"><i class="bi bi-list-ul"></i> Últimas Solicitudes</div>
                <div class="card-body p-0">
                    <table class="table table-hover mb-0">
                        <thead><tr><th>N°</th><th>Fallecido</th><th>Responsable</th><th>Tipo</th><th>Estado</th></tr></thead>
                        <tbody>
                        <?php foreach ($ultimas as $s): ?>
                            <tr>
                                <td><a href="../modules/solicitudes/view.php?id=<?= $s['id_solicitud'] ?>">#<?= $s['nro_pedido'] ?></a></td>
                                <td><?= sanitize($s['fapellido'] . ', ' . $s['fnombre']) ?></td>
                                <td><?= sanitize($s['rapellido'] . ', ' . $s['rnombre']) ?></td>
                                <td><small><?= sanitize($s['tipo_servicio']) ?></small></td>
                                <td>
                                    <span class="badge bg-<?= get_estado_color($s['estado']) ?>"><?= $s['estado'] ?></span>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<?php include '../includes/footer.php'; ?>