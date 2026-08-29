<?php
require_once '../../config/config.php';
require_once '../../includes/functions.php';
require_login();

$db = (new Database())->getConnection();
$page_title = 'Stock de Ataúdes';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['accion'])) {
    if ($_POST['accion'] === 'ajustar_stock') {
        $id = $_POST['id_ataud'];
        $cantidad = (int)$_POST['cantidad'];
        $tipo = $_POST['tipo']; // ENTRADA o AJUSTE
        
        $db->prepare("UPDATE catalogo_ataudes SET stock_actual = stock_actual + ? WHERE id_ataud = ?")
           ->execute([$cantidad, $id]);
        $db->prepare("INSERT INTO movimientos_stock (id_ataud, cantidad, tipo_movimiento, remito_nro, observaciones, realizado_por) VALUES (?,?,?,?,?,?)")
           ->execute([$id, $cantidad, $tipo, $_POST['remito'] ?: null, $_POST['obs'] ?: null, $_SESSION['user_id']]);
        flash_message('success', 'Stock actualizado');
        redirect('modules/stock/');
    }
}

$stock = $db->query("SELECT * FROM dashboard_stock ORDER BY codigo_renglon")->fetchAll();
$movimientos = $db->query("SELECT m.*, c.nombre as ataud_nombre, e.nombre as emp_nombre, e.apellido as emp_apellido
                           FROM movimientos_stock m
                           JOIN catalogo_ataudes c ON m.id_ataud = c.id_ataud
                           JOIN empleados e ON m.realizado_por = e.id_empleado
                           ORDER BY m.fecha_movimiento DESC LIMIT 20")->fetchAll();

include '../../includes/header.php';
?>

<h2 class="mb-4"><i class="bi bi-box-seam"></i> Stock de Ataúdes</h2>

<div class="row g-3">
    <div class="col-md-8">
        <div class="card">
            <div class="card-header">Catálogo y Stock</div>
            <div class="card-body p-0">
                <table class="table table-hover mb-0">
                    <thead class="table-light">
                        <tr><th>Cód</th><th>Nombre</th><th>Largo</th><th>Stock</th><th>Mín</th><th>Estado</th><th>Acción</th></tr>
                    </thead>
                    <tbody>
                    <?php foreach ($stock as $s): ?>
                        <tr class="<?= $s['estado_stock']=='SIN_STOCK'?'table-danger':($s['estado_stock']=='BAJO_STOCK'?'table-warning':'') ?>">
                            <td><?= $s['codigo_renglon'] ?></td>
                            <td><?= sanitize($s['nombre']) ?></td>
                            <td><?= $s['largo_mts'] ?> m</td>
                            <td><strong><?= $s['stock_actual'] ?></strong></td>
                            <td><?= $s['stock_minimo'] ?></td>
                            <td>
                                <?php
                                $labels = ['SIN_STOCK'=>['danger','Sin Stock'],'BAJO_STOCK'=>['warning','Bajo'],'NORMAL'=>['success','Normal']];
                                [$color, $label] = $labels[$s['estado_stock']];
                                ?>
                                <span class="badge bg-<?= $color ?>"><?= $label ?></span>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#modalStock" 
                                        data-id="<?= $s['id_ataud'] ?>" data-nombre="<?= sanitize($s['nombre']) ?>">
                                    <i class="bi bi-pencil-square"></i>
                                </button>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card">
            <div class="card-header">Últimos Movimientos</div>
            <div class="card-body p-0" style="max-height:600px; overflow-y:auto">
                <table class="table table-sm mb-0">
                    <tbody>
                    <?php foreach ($movimientos as $m): ?>
                        <tr>
                            <td>
                                <small>
                                    <strong><?= format_datetime($m['fecha_movimiento']) ?></strong><br>
                                    <?= $m['ataud_nombre'] ?><br>
                                    <span class="badge bg-<?= $m['cantidad']>0?'success':'danger' ?>">
                                        <?= $m['cantidad']>0?'+':'' ?><?= $m['cantidad'] ?>
                                    </span>
                                    <?= $m['tipo_movimiento'] ?><br>
                                    <em><?= sanitize($m['emp_apellido']) ?></em>
                                </small>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- Modal Ajuste Stock -->
<div class="modal fade" id="modalStock" tabindex="-1">
    <div class="modal-dialog">
        <form method="POST" class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Ajustar Stock</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" name="accion" value="ajustar_stock">
                <input type="hidden" name="id_ataud" id="modalId">
                <p>Artículo: <strong id="modalNombre"></strong></p>
                <div class="mb-3">
                    <label class="form-label">Tipo de Movimiento</label>
                    <select name="tipo" class="form-select" required>
                        <option value="ENTRADA">Entrada (Compra/Donación)</option>
                        <option value="AJUSTE">Ajuste (Inventario)</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">Cantidad (use - para salida)</label>
                    <input type="number" name="cantidad" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Remito N°</label>
                    <input type="text" name="remito" class="form-control">
                </div>
                <div class="mb-3">
                    <label class="form-label">Observaciones</label>
                    <textarea name="obs" class="form-control"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar</button>
            </div>
        </form>
    </div>
</div>

<script>
document.getElementById('modalStock').addEventListener('show.bs.modal', function(e) {
    document.getElementById('modalId').value = e.relatedTarget.dataset.id;
    document.getElementById('modalNombre').textContent = e.relatedTarget.dataset.nombre;
});
</script>

<?php include '../../includes/footer.php'; ?>