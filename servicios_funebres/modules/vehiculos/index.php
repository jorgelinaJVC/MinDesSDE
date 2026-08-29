<?php
require_once '../../config/config.php';
require_once '../../includes/functions.php';
require_login();

$db = (new Database())->getConnection();
$page_title = 'Vehículos';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $accion = $_POST['accion'] ?? '';
    
    if ($accion === 'crear') {
        $stmt = $db->prepare("INSERT INTO vehiculos (patente, numero_interno, marca, modelo, año, tipo, capacidad_ataudes, capacidad_acompañantes, estado, creado_por)
                              VALUES (?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([
            $_POST['patente'], $_POST['num_int'] ?: null, $_POST['marca'], $_POST['modelo'],
            $_POST['año'] ?: null, $_POST['tipo'], $_POST['cap_ataudes'] ?: 1, $_POST['cap_acomp'] ?: 2,
            'DISPONIBLE', $_SESSION['user_id']
        ]);
        flash_message('success', 'Vehículo creado');
    } elseif ($accion === 'cambiar_estado') {
        $id = $_POST['id'];
        $nuevo = $_POST['nuevo_estado'];
        $stmt = $db->prepare("SELECT estado FROM vehiculos WHERE id_vehiculo = ?");
        $stmt->execute([$id]);
        $anterior = $stmt->fetchColumn();
        
        $db->prepare("UPDATE vehiculos SET estado = ? WHERE id_vehiculo = ?")->execute([$nuevo, $id]);
        $db->prepare("INSERT INTO vehiculo_estado_historial (id_vehiculo, estado_anterior, estado_nuevo, motivo, cambio_realizado_por) VALUES (?,?,?,?,?)")
           ->execute([$id, $anterior, $nuevo, $_POST['motivo'] ?: null, $_SESSION['user_id']]);
        flash_message('success', 'Estado actualizado');
    }
    redirect('modules/vehiculos/');
}

$vehiculos = $db->query("SELECT * FROM vehiculos WHERE activo = 1 ORDER BY patente")->fetchAll();

include '../../includes/header.php';
?>

<div class="d-flex justify-content-between mb-4">
    <h2><i class="bi bi-truck"></i> Vehículos</h2>
    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalNuevo"><i class="bi bi-plus"></i> Nuevo</button>
</div>

<div class="row g-3">
<?php foreach ($vehiculos as $v): ?>
    <div class="col-md-4">
        <div class="card h-100">
            <div class="card-header d-flex justify-content-between">
                <strong><?= sanitize($v['patente']) ?></strong>
                <?php
                $colores = ['DISPONIBLE'=>'success','EN_SERVICIO'=>'primary','MANTENIMIENTO'=>'warning','FUERA_SERVICIO'=>'danger'];
                ?>
                <span class="badge bg-<?= $colores[$v['estado']] ?? 'secondary' ?>"><?= $v['estado'] ?></span>
            </div>
            <div class="card-body">
                <p class="mb-1"><strong><?= sanitize($v['marca'] . ' ' . $v['modelo']) ?></strong></p>
                <p class="mb-1 small">Tipo: <?= sanitize($v['tipo']) ?> | Año: <?= $v['año'] ?: 'N/A' ?></p>
                <p class="mb-1 small">Cap: <?= $v['capacidad_ataudes'] ?> ataúd(es), <?= $v['capacidad_acompañantes'] ?> acomp.</p>
                <?php if ($v['numero_interno']): ?>
                    <p class="mb-1 small">N° Interno: <?= sanitize($v['numero_interno']) ?></p>
                <?php endif; ?>
            </div>
            <div class="card-footer">
                <button class="btn btn-sm btn-outline-primary w-100" data-bs-toggle="modal" data-bs-target="#modalEstado" 
                        data-id="<?= $v['id_vehiculo'] ?>" data-actual="<?= $v['estado'] ?>">
                    <i class="bi bi-arrow-repeat"></i> Cambiar Estado
                </button>
            </div>
        </div>
    </div>
<?php endforeach; ?>
</div>

<!-- Modal Nuevo -->
<div class="modal fade" id="modalNuevo" tabindex="-1">
    <div class="modal-dialog">
        <form method="POST" class="modal-content">
            <div class="modal-header"><h5>Nuevo Vehículo</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <input type="hidden" name="accion" value="crear">
                <div class="row g-2">
                    <div class="col-md-6"><label>Patente *</label><input type="text" name="patente" class="form-control" required></div>
                    <div class="col-md-6"><label>N° Interno</label><input type="text" name="num_int" class="form-control"></div>
                    <div class="col-md-6"><label>Marca *</label><input type="text" name="marca" class="form-control" required></div>
                    <div class="col-md-6"><label>Modelo *</label><input type="text" name="modelo" class="form-control" required></div>
                    <div class="col-md-4"><label>Año</label><input type="number" name="año" class="form-control" min="1900" max="2099"></div>
                    <div class="col-md-4"><label>Cap. Ataúdes</label><input type="number" name="cap_ataudes" class="form-control" value="1"></div>
                    <div class="col-md-4"><label>Cap. Acomp.</label><input type="number" name="cap_acomp" class="form-control" value="2"></div>
                    <div class="col-md-12"><label>Tipo *</label>
                        <select name="tipo" class="form-select" required>
                            <option>AMBULANCIA</option><option>CASA RODANTE</option><option>CAMIONETA</option><option>AUTO</option><option>OTRO</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-primary">Guardar</button></div>
        </form>
    </div>
</div>

<!-- Modal Estado -->
<div class="modal fade" id="modalEstado" tabindex="-1">
    <div class="modal-dialog">
        <form method="POST" class="modal-content">
            <div class="modal-header"><h5>Cambiar Estado</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <input type="hidden" name="accion" value="cambiar_estado">
                <input type="hidden" name="id" id="estId">
                <p>Estado actual: <strong id="estActual"></strong></p>
                <div class="mb-3">
                    <label>Nuevo Estado</label>
                    <select name="nuevo_estado" class="form-select" required>
                        <option value="DISPONIBLE">DISPONIBLE</option>
                        <option value="EN_SERVICIO">EN SERVICIO</option>
                        <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                        <option value="FUERA_SERVICIO">FUERA DE SERVICIO</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label>Motivo</label>
                    <textarea name="motivo" class="form-control"></textarea>
                </div>
            </div>
            <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-primary">Guardar</button></div>
        </form>
    </div>
</div>

<script>
document.getElementById('modalEstado').addEventListener('show.bs.modal', function(e) {
    document.getElementById('estId').value = e.relatedTarget.dataset.id;
    document.getElementById('estActual').textContent = e.relatedTarget.dataset.actual;
});
</script>

<?php include '../../includes/footer.php'; ?>