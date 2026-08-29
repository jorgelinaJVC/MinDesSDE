<?php
require_once '../../config/config.php';
require_once '../../includes/functions.php';
require_login();

$db = (new Database())->getConnection();
$id = (int)($_GET['id'] ?? 0);

$stmt = $db->prepare("SELECT s.*, f.*, r.*, 
                      a.nombre as ataud_nombre, v.patente, v.marca, v.modelo,
                      ch.nombre as chofer_nombre, ch.apellido as chofer_apellido,
                      p.nombre as proc_nombre, p.apellido as proc_apellido
                      FROM solicitudes s
                      JOIN fallecidos f ON s.id_fallecido = f.id_fallecido
                      JOIN responsables r ON s.id_responsable = r.id_responsable
                      LEFT JOIN catalogo_ataudes a ON s.id_ataud_asignado = a.id_ataud
                      LEFT JOIN vehiculos v ON s.id_vehiculo_asignado = v.id_vehiculo
                      LEFT JOIN empleados ch ON s.id_chofer_asignado = ch.id_empleado
                      LEFT JOIN empleados p ON s.procesado_por = p.id_empleado
                      WHERE s.id_solicitud = ?");
$stmt->execute([$id]);
$s = $stmt->fetch();

if (!$s) { flash_message('danger', 'Solicitud no encontrada'); redirect('modules/solicitudes/'); }

$page_title = "Solicitud #" . $s['nro_pedido'];

// Procesar asignación
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['accion'])) {
    $accion = $_POST['accion'];
    
    if ($accion === 'asignar') {
        $stmt = $db->prepare("UPDATE solicitudes SET id_ataud_asignado=?, id_vehiculo_asignado=?, id_chofer_asignado=?, 
                              estado='ASIGNADO', procesado_por=?, modificado_por=? WHERE id_solicitud=?");
        $stmt->execute([
            $_POST['ataud'] ?: null, $_POST['vehiculo'] ?: null, $_POST['chofer'] ?: null,
            $_SESSION['user_id'], $_SESSION['user_id'], $id
        ]);
        
        // Descontar stock si hay ataúd
        if (!empty($_POST['ataud'])) {
            $db->prepare("UPDATE catalogo_ataudes SET stock_actual = stock_actual - 1 WHERE id_ataud = ? AND stock_actual > 0")
               ->execute([$_POST['ataud']]);
            $db->prepare("INSERT INTO movimientos_stock (id_ataud, cantidad, tipo_movimiento, solicitud_id, realizado_por) VALUES (?,?, 'SALIDA',?,?)")
               ->execute([$_POST['ataud'], -1, $id, $_SESSION['user_id']]);
        }
        flash_message('success', 'Asignación realizada');
    } elseif ($accion === 'cambiar_estado') {
        $nuevo = $_POST['nuevo_estado'];
        $stmt = $db->prepare("UPDATE solicitudes SET estado=?, modificado_por=? WHERE id_solicitud=?");
        $stmt->execute([$nuevo, $_SESSION['user_id'], $id]);
        
        // Si se completa, devolver stock si fue anulado (lógica opcional)
        if ($nuevo === 'COMPLETADO') {
            $db->prepare("UPDATE vehiculos SET estado='DISPONIBLE' WHERE id_vehiculo = ?")
               ->execute([$s['id_vehiculo_asignado']]);
        }
        flash_message('success', 'Estado actualizado');
    } elseif ($accion === 'subir_archivo') {
        if (!empty($_FILES['archivo']['name'])) {
            $dir = UPLOAD_DIR . 'solicitudes/' . $id . '/';
            if (!is_dir($dir)) mkdir($dir, 0777, true);
            $nombre = time() . '_' . basename($_FILES['archivo']['name']);
            $ruta = $dir . $nombre;
            if (move_uploaded_file($_FILES['archivo']['tmp_name'], $ruta)) {
                $stmt = $db->prepare("INSERT INTO archivos (solicitud_id, nombre_original, nombre_guardado, ruta, tipo_documento, subido_por, tamaño_bytes) VALUES (?,?,?,?,?,?,?)");
                $stmt->execute([$id, $_FILES['archivo']['name'], $nombre, $ruta, $_POST['tipo_doc'] ?? null, $_SESSION['user_id'], filesize($ruta)]);
                flash_message('success', 'Archivo subido');
            }
        }
    }
    redirect("modules/solicitudes/view.php?id=$id");
}

$ataudes = $db->query("SELECT * FROM catalogo_ataudes WHERE activo = 1 AND stock_actual > 0 ORDER BY nombre")->fetchAll();
$vehiculos = $db->query("SELECT * FROM vehiculos WHERE activo = 1 AND estado = 'DISPONIBLE' ORDER BY patente")->fetchAll();
$choferes = $db->query("SELECT id_empleado, nombre, apellido FROM empleados WHERE activo = 1 AND id_rol IN (SELECT id_rol FROM roles WHERE nombre_rol LIKE '%Chofer%')")->fetchAll();
$archivos = $db->prepare("SELECT * FROM archivos WHERE solicitud_id = ? ORDER BY fecha_subida DESC");
$archivos->execute([$id]);
$archivos = $archivos->fetchAll();

include '../../includes/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h2><i class="bi bi-file-earmark-text"></i> Solicitud #<?= $s['nro_pedido'] ?></h2>
    <div>
        <a href="edit.php?id=<?= $id ?>" class="btn btn-warning"><i class="bi bi-pencil"></i> Editar</a>
        <a href="index.php" class="btn btn-secondary"><i class="bi bi-arrow-left"></i> Volver</a>
    </div>
</div>

<div class="row g-3">
    <div class="col-md-8">
        <div class="card mb-3">
            <div class="card-header d-flex justify-content-between">
                <strong>Información General</strong>
                <?php
                $colors = ['PENDIENTE'=>'secondary','EN_REVISION'=>'info','ASIGNADO'=>'primary','EN_EJECUCION'=>'warning','COMPLETADO'=>'success','ANULADO'=>'danger'];
                ?>
                <span class="badge bg-<?= $colors[$s['estado']] ?> fs-6"><?= $s['estado'] ?></span>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6"><strong>Tipo:</strong> <?= $s['tipo_servicio'] ?></div>
                    <div class="col-md-6"><strong>Origen:</strong> <?= $s['origen'] ?></div>
                    <div class="col-md-6"><strong>Fecha Solicitud:</strong> <?= format_date($s['fecha_solicitud']) ?></div>
                    <div class="col-md-6"><strong>Registrado:</strong> <?= format_datetime($s['fecha_registro']) ?></div>
                    <?php if ($s['procesado_por']): ?>
                    <div class="col-md-12"><strong>Procesado por:</strong> <?= sanitize($s['proc_apellido'] . ', ' . $s['proc_nombre']) ?></div>
                    <?php endif; ?>
                    <div class="col-md-12 mt-2"><strong>Detalle:</strong> <?= nl2br(sanitize($s['solicitud_texto'])) ?></div>
                    <?php if ($s['observaciones']): ?>
                    <div class="col-md-12 mt-2"><strong>Observaciones:</strong> <?= nl2br(sanitize($s['observaciones'])) ?></div>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <div class="card mb-3">
            <div class="card-header bg-primary text-white">Fallecido</div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6"><strong>Nombre:</strong> <?= sanitize($s['apellido'] . ', ' . $s['nombre']) ?></div>
                    <div class="col-md-3"><strong>Doc:</strong> <?= $s['tipo_doc'] ?> <?= sanitize($s['nro_documento'] ?: 'S/N') ?></div>
                    <div class="col-md-3"><strong>Edad:</strong> <?= $s['edad'] ?: 'N/A' ?></div>
                    <div class="col-md-6"><strong>Fallecimiento:</strong> <?= format_date($s['fecha_fallecimiento']) ?></div>
                    <div class="col-md-6"><strong>Ubicación:</strong> 
                        <?= sanitize(($s['barrio'] ? $s['barrio'].', ' : '') . ($s['localidad'] ? $s['localidad'].', ' : '') . $s['departamento']) ?>
                    </div>
                    <?php if ($s['es_rnf']): ?>
                    <div class="col-md-12 mt-2 text-danger"><strong>RNF - Progenitor:</strong> <?= sanitize($s['progenitor_nombre']) ?> (<?= $s['progenitor_tipo_doc'] ?> <?= $s['progenitor_nro_doc'] ?>)</div>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <div class="card mb-3">
            <div class="card-header bg-info text-white">Responsable</div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6"><strong>Nombre:</strong> <?= sanitize($s['rapellido'] . ', ' . $s['rnombre']) ?></div>
                    <div class="col-md-3"><strong>Doc:</strong> <?= $s['rtipo_doc'] ?> <?= $s['rnro_documento'] ?></div>
                    <div class="col-md-3"><strong>Relación:</strong> <?= sanitize($s['relacion_fallecido'] ?: 'N/A') ?></div>
                    <div class="col-md-4"><strong>Tel:</strong> <?= sanitize($s['rtelefono_1']) ?> <?= $s['rwhatsapp'] ? '<i class="bi bi-whatsapp text-success"></i>' : '' ?></div>
                    <?php if ($s['rtelefono_2']): ?><div class="col-md-4"><strong>Tel 2:</strong> <?= sanitize($s['rtelefono_2']) ?></div><?php endif; ?>
                    <?php if ($s['remail']): ?><div class="col-md-4"><strong>Email:</strong> <?= sanitize($s['remail']) ?></div><?php endif; ?>
                </div>
            </div>
        </div>

        <?php if ($s['requiere_traslado']): ?>
        <div class="card mb-3">
            <div class="card-header bg-warning">Traslado</div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-5"><strong>Origen:</strong> <?= sanitize($s['lugar_origen']) ?></div>
                    <div class="col-md-5"><strong>Destino:</strong> <?= sanitize($s['lugar_destino']) ?></div>
                    <div class="col-md-2"><strong>Distancia:</strong> <?= $s['distancia_km'] ?> km</div>
                </div>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <div class="col-md-4">
        <div class="card mb-3">
            <div class="card-header bg-success text-white">Asignaciones</div>
            <div class="card-body">
                <?php if ($s['id_ataud_asignado']): ?>
                    <p><strong>Ataúd:</strong> <?= sanitize($s['ataud_nombre']) ?></p>
                <?php endif; ?>
                <?php if ($s['id_vehiculo_asignado']): ?>
                    <p><strong>Vehículo:</strong> <?= sanitize($s['patente']) ?> - <?= sanitize($s['marca'] . ' ' . $s['modelo']) ?></p>
                <?php endif; ?>
                <?php if ($s['id_chofer_asignado']): ?>
                    <p><strong>Chofer:</strong> <?= sanitize($s['chofer_apellido'] . ', ' . $s['chofer_nombre']) ?></p>
                <?php endif; ?>
                
                <?php if (in_array($s['estado'], ['PENDIENTE','EN_REVISION'])): ?>
                <hr>
                <form method="POST">
                    <input type="hidden" name="accion" value="asignar">
                    <div class="mb-2">
                        <label class="form-label">Ataúd</label>
                        <select name="ataud" class="form-select form-select-sm">
                            <option value="">-- Sin asignar --</option>
                            <?php foreach ($ataudes as $a): ?>
                                <option value="<?= $a['id_ataud'] ?>"><?= sanitize($a['nombre']) ?> (Stock: <?= $a['stock_actual'] ?>)</option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Vehículo</label>
                        <select name="vehiculo" class="form-select form-select-sm">
                            <option value="">-- Sin asignar --</option>
                            <?php foreach ($vehiculos as $v): ?>
                                <option value="<?= $v['id_vehiculo'] ?>"><?= sanitize($v['patente']) ?> - <?= sanitize($v['marca']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Chofer</label>
                        <select name="chofer" class="form-select form-select-sm">
                            <option value="">-- Sin asignar --</option>
                            <?php foreach ($choferes as $c): ?>
                                <option value="<?= $c['id_empleado'] ?>"><?= sanitize($c['apellido'] . ', ' . $c['nombre']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-success btn-sm w-100"><i class="bi bi-check-circle"></i> Asignar</button>
                </form>
                <?php endif; ?>
            </div>
        </div>

        <div class="card mb-3">
            <div class="card-header">Cambiar Estado</div>
            <div class="card-body">
                <form method="POST" class="d-grid gap-2">
                    <input type="hidden" name="accion" value="cambiar_estado">
                    <?php
                    $flujos = [
                        'PENDIENTE' => ['EN_REVISION','ANULADO'],
                        'EN_REVISION' => ['ASIGNADO','PENDIENTE','ANULADO'],
                        'ASIGNADO' => ['EN_EJECUCION','ANULADO'],
                        'EN_EJECUCION' => ['COMPLETADO','ANULADO']
                    ];
                    $next = $flujos[$s['estado']] ?? [];
                    foreach ($next as $n): ?>
                        <button type="submit" name="nuevo_estado" value="<?= $n ?>" class="btn btn-outline-<?= $colors[$n] ?> btn-sm">
                            Pasar a <?= str_replace('_',' ',$n) ?>
                        </button>
                    <?php endforeach; ?>
                </form>
            </div>
        </div>

        <div class="card mb-3">
            <div class="card-header">Documentación</div>
            <div class="card-body">
                <ul class="list-unstyled mb-2">
                    <li><?= $s['certificado_defuncion'] ? '✅' : '⬜' ?> Certificado Defunción</li>
                    <li><?= $s['dni_fallecido'] ? '✅' : '⬜' ?> DNI Fallecido</li>
                    <li><?= $s['documentos_extra'] ? '✅' : '⬜' ?> Documentos Extra</li>
                </ul>
                <hr>
                <form method="POST" enctype="multipart/form-data">
                    <input type="hidden" name="accion" value="subir_archivo">
                    <div class="mb-2">
                        <select name="tipo_doc" class="form-select form-select-sm">
                            <option value="CERTIFICADO">Certificado</option>
                            <option value="DNI">DNI</option>
                            <option value="OTRO">Otro</option>
                        </select>
                    </div>
                    <div class="mb-2">
                        <input type="file" name="archivo" class="form-control form-control-sm" required>
                    </div>
                    <button class="btn btn-primary btn-sm w-100"><i class="bi bi-upload"></i> Subir</button>
                </form>
                <?php if (!empty($archivos)): ?>
                <hr>
                <h6>Archivos:</h6>
                <ul class="list-unstyled small">
                    <?php foreach ($archivos as $a): ?>
                        <li><a href="<?= BASE_URL . str_replace(__DIR__ . '/../../','',$a['ruta']) ?>" target="_blank"><i class="bi bi-file-earmark"></i> <?= sanitize($a['nombre_original']) ?></a></li>
                    <?php endforeach; ?>
                </ul>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<?php include '../../includes/footer.php'; ?>