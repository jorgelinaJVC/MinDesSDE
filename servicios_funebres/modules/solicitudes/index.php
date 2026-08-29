<?php
require_once '../../config/config.php';
require_once '../../includes/functions.php';
require_login();

$db = (new Database())->getConnection();
$page_title = 'Solicitudes';

// Filtros
$filtro_estado = $_GET['estado'] ?? '';
$filtro_tipo = $_GET['tipo'] ?? '';
$filtro_fecha = $_GET['fecha'] ?? '';
$buscar = $_GET['buscar'] ?? '';

$sql = "SELECT s.*, f.nombre as fnombre, f.apellido as fapellido, r.nombre as rnombre, r.apellido as rapellido 
        FROM solicitudes s
        JOIN fallecidos f ON s.id_fallecido = f.id_fallecido
        JOIN responsables r ON s.id_responsable = r.id_responsable
        WHERE 1=1";
$params = [];

if ($filtro_estado) { $sql .= " AND s.estado = ?"; $params[] = $filtro_estado; }
if ($filtro_tipo) { $sql .= " AND s.tipo_servicio = ?"; $params[] = $filtro_tipo; }
if ($filtro_fecha) { $sql .= " AND s.fecha_solicitud = ?"; $params[] = $filtro_fecha; }
if ($buscar) { 
    $sql .= " AND (f.nombre LIKE ? OR f.apellido LIKE ? OR s.nro_pedido LIKE ?)"; 
    $params[] = "%$buscar%"; $params[] = "%$buscar%"; $params[] = "%$buscar%";
}
$sql .= " ORDER BY s.fecha_registro DESC";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$solicitudes = $stmt->fetchAll();

include '../../includes/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h2><i class="bi bi-clipboard-check"></i> Solicitudes</h2>
    <a href="create.php" class="btn btn-primary"><i class="bi bi-plus-circle"></i> Nueva Solicitud</a>
</div>

<div class="card mb-3">
    <div class="card-body">
        <form method="GET" class="row g-2">
            <div class="col-md-3">
                <input type="text" name="buscar" class="form-control" placeholder="Buscar..." value="<?= sanitize($buscar) ?>">
            </div>
            <div class="col-md-2">
                <select name="estado" class="form-select">
                    <option value="">Todos los estados</option>
                    <?php foreach (['PENDIENTE','EN_REVISION','ASIGNADO','EN_EJECUCION','COMPLETADO','ANULADO'] as $e): ?>
                        <option value="<?= $e ?>" <?= $filtro_estado==$e?'selected':'' ?>><?= $e ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <select name="tipo" class="form-select">
                    <option value="">Todos los tipos</option>
                    <?php foreach (['ATAUD','TRASLADO','ATAUD_Y_TRASLADO','CREMACION','REPATRIACION','SERVICIO_CALLE'] as $t): ?>
                        <option value="<?= $t ?>" <?= $filtro_tipo==$t?'selected':'' ?>><?= $t ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <input type="date" name="fecha" class="form-control" value="<?= sanitize($filtro_fecha) ?>">
            </div>
            <div class="col-md-3">
                <button class="btn btn-primary"><i class="bi bi-search"></i> Filtrar</button>
                <a href="index.php" class="btn btn-secondary">Limpiar</a>
            </div>
        </form>
    </div>
</div>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead class="table-light">
                    <tr>
                        <th>N° Pedido</th>
                        <th>Fecha</th>
                        <th>Fallecido</th>
                        <th>Responsable</th>
                        <th>Tipo</th>
                        <th>Origen</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                <?php if (empty($solicitudes)): ?>
                    <tr><td colspan="8" class="text-center text-muted py-4">No hay solicitudes</td></tr>
                <?php else: ?>
                    <?php foreach ($solicitudes as $s): ?>
                        <tr>
                            <td><strong>#<?= $s['nro_pedido'] ?></strong></td>
                            <td><?= format_date($s['fecha_solicitud']) ?></td>
                            <td><?= sanitize($s['fapellido'] . ', ' . $s['fnombre']) ?></td>
                            <td><?= sanitize($s['rapellido'] . ', ' . $s['rnombre']) ?></td>
                            <td><small><?= $s['tipo_servicio'] ?></small></td>
                            <td><span class="badge bg-<?= $s['origen']=='WEB'?'info':'secondary' ?>"><?= $s['origen'] ?></span></td>
                            <td>
                                <?php
                                $colors = ['PENDIENTE'=>'secondary','EN_REVISION'=>'info','ASIGNADO'=>'primary','EN_EJECUCION'=>'warning','COMPLETADO'=>'success','ANULADO'=>'danger'];
                                ?>
                                <span class="badge bg-<?= $colors[$s['estado']] ?>"><?= $s['estado'] ?></span>
                            </td>
                            <td>
                                <a href="view.php?id=<?= $s['id_solicitud'] ?>" class="btn btn-sm btn-outline-primary" title="Ver"><i class="bi bi-eye"></i></a>
                                <a href="edit.php?id=<?= $s['id_solicitud'] ?>" class="btn btn-sm btn-outline-warning" title="Editar"><i class="bi bi-pencil"></i></a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php include '../../includes/footer.php'; ?>