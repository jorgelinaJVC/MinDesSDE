<?php
require_once '../../config/config.php';
require_once '../../includes/functions.php';
require_login();

$db = (new Database())->getConnection();
$page_title = 'Nueva Solicitud';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $db->beginTransaction();
        
        // Crear fallecido
        $stmt = $db->prepare("INSERT INTO fallecidos (tipo_doc, nro_documento, nombre, apellido, fecha_fallecimiento, 
                              departamento, localidad, barrio, domicilio, es_rnf, progenitor_nombre, progenitor_nro_doc, progenitor_tipo_doc,
                              origen, edad, observaciones, creado_por)
                              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([
            $_POST['f_tipo_doc'], $_POST['f_nro_doc'] ?: null, $_POST['f_nombre'], $_POST['f_apellido'],
            $_POST['f_fecha'], $_POST['f_departamento'] ?: null, $_POST['f_localidad'] ?: null,
            $_POST['f_barrio'] ?: null, $_POST['f_domicilio'] ?: null,
            isset($_POST['f_es_rnf']) ? 1 : 0,
            $_POST['f_progenitor_nombre'] ?: null, $_POST['f_progenitor_doc'] ?: null, $_POST['f_progenitor_tipo'] ?: null,
            'INTERNA', $_POST['f_edad'] ?: null, $_POST['f_observaciones'] ?: null, $_SESSION['user_id']
        ]);
        $id_fallecido = $db->lastInsertId();
        
        // Crear responsable
        $stmt = $db->prepare("INSERT INTO responsables (tipo_doc, nro_documento, nombre, apellido, telefono_1, telefono_2, email, whatsapp,
                              departamento, localidad, barrio, domicilio, relacion_fallecido, creado_por)
                              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([
            $_POST['r_tipo_doc'], $_POST['r_nro_doc'], $_POST['r_nombre'], $_POST['r_apellido'],
            $_POST['r_telefono1'], $_POST['r_telefono2'] ?: null, $_POST['r_email'] ?: null,
            isset($_POST['r_whatsapp']) ? 1 : 0,
            $_POST['r_departamento'] ?: null, $_POST['r_localidad'] ?: null,
            $_POST['r_barrio'] ?: null, $_POST['r_domicilio'] ?: null,
            $_POST['r_relacion'] ?: null, $_SESSION['user_id']
        ]);
        $id_responsable = $db->lastInsertId();
        
        // Crear solicitud
        $stmt = $db->prepare("INSERT INTO solicitudes (fecha_solicitud, id_responsable, id_fallecido, origen, tipo_servicio, solicitud_texto,
                              requiere_traslado, lugar_origen, lugar_destino, distancia_km, observaciones, creado_por)
                              VALUES (CURDATE(),?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([
            $id_responsable, $id_fallecido, 'INTERNA', $_POST['tipo_servicio'], $_POST['solicitud_texto'],
            isset($_POST['requiere_traslado']) ? 1 : 0,
            $_POST['lugar_origen'] ?: null, $_POST['lugar_destino'] ?: null,
            $_POST['distancia_km'] ?: null, $_POST['observaciones'] ?: null, $_SESSION['user_id']
        ]);
        $id_solicitud = $db->lastInsertId();
        
        $db->commit();
        log_audit($db, $_SESSION['user_id'], 'CREAR_SOLICITUD', 'solicitudes', $id_solicitud, null, ['nro_pedido' => get_next_nro_pedido($db)-1]);
        flash_message('success', 'Solicitud creada exitosamente');
        redirect('modules/solicitudes/view.php?id=' . $id_solicitud);
    } catch (Exception $e) {
        $db->rollBack();
        $error = "Error al crear: " . $e->getMessage();
    }
}

$departamentos = get_departamentos($db);
include '../../includes/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h2><i class="bi bi-plus-circle"></i> Nueva Solicitud</h2>
    <a href="index.php" class="btn btn-secondary"><i class="bi bi-arrow-left"></i> Volver</a>
</div>

<?php if ($error): ?><div class="alert alert-danger"><?= $error ?></div><?php endif; ?>

<form method="POST" id="formSolicitud">
    <div class="card mb-3">
        <div class="card-header bg-primary text-white"><i class="bi bi-person-x"></i> Datos del Fallecido</div>
        <div class="card-body">
            <div class="row g-3">
                <div class="col-md-2">
                    <label class="form-label">Tipo Doc *</label>
                    <select name="f_tipo_doc" class="form-select" required>
                        <option value="DNI">DNI</option>
                        <option value="RNF">RNF</option>
                        <option value="S/D">S/D</option>
                        <option value="PASAPORTE">PASAPORTE</option>
                        <option value="OTRO">OTRO</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Nro Documento</label>
                    <input type="text" name="f_nro_doc" class="form-control">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Nombre *</label>
                    <input type="text" name="f_nombre" class="form-control" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Apellido *</label>
                    <input type="text" name="f_apellido" class="form-control" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Fecha Fallecimiento *</label>
                    <input type="date" name="f_fecha" class="form-control" required>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Edad</label>
                    <input type="number" name="f_edad" class="form-control" min="0">
                </div>
                <div class="col-md-7">
                    <label class="form-label">Observaciones</label>
                    <input type="text" name="f_observaciones" class="form-control">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Departamento</label>
                    <select name="f_departamento" class="form-select dep-select" data-target="f_localidad">
                        <option value="">--</option>
                        <?php foreach ($departamentos as $d): ?>
                            <option value="<?= $d['id_departamento'] ?>"><?= sanitize($d['nombre']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Localidad</label>
                    <select name="f_localidad" id="f_localidad" class="form-select loc-select"></select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Barrio</label>
                    <input type="text" name="f_barrio" class="form-control">
                </div>
                <div class="col-md-12">
                    <label class="form-label">Domicilio</label>
                    <input type="text" name="f_domicilio" class="form-control">
                </div>
                <div class="col-md-12">
                    <div class="form-check">
                        <input type="checkbox" name="f_es_rnf" class="form-check-input" id="esRnf">
                        <label class="form-check-label" for="esRnf">Es Recién Nacido Fallecido (RNF)</label>
                    </div>
                </div>
                <div class="rnf-data" style="display:none">
                    <div class="col-md-4">
                        <label class="form-label">Nombre Progenitor</label>
                        <input type="text" name="f_progenitor_nombre" class="form-control">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Tipo Doc Progenitor</label>
                        <select name="f_progenitor_tipo" class="form-select">
                            <option value="DNI">DNI</option><option value="PASAPORTE">PASAPORTE</option><option value="OTRO">OTRO</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Nro Doc Progenitor</label>
                        <input type="text" name="f_progenitor_doc" class="form-control">
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="card mb-3">
        <div class="card-header bg-info text-white"><i class="bi bi-people"></i> Responsable</div>
        <div class="card-body">
            <div class="row g-3">
                <div class="col-md-2">
                    <label class="form-label">Tipo Doc *</label>
                    <select name="r_tipo_doc" class="form-select" required>
                        <option value="DNI">DNI</option><option value="PASAPORTE">PASAPORTE</option><option value="OTRO">OTRO</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Nro Documento *</label>
                    <input type="text" name="r_nro_doc" class="form-control" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Nombre *</label>
                    <input type="text" name="r_nombre" class="form-control" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Apellido *</label>
                    <input type="text" name="r_apellido" class="form-control" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Teléfono 1 *</label>
                    <input type="text" name="r_telefono1" class="form-control" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Teléfono 2</label>
                    <input type="text" name="r_telefono2" class="form-control">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Email</label>
                    <input type="email" name="r_email" class="form-control">
                </div>
                <div class="col-md-2">
                    <label class="form-label">Relación</label>
                    <select name="r_relacion" class="form-select">
                        <option value="">--</option>
                        <option value="hijo/a">Hijo/a</option>
                        <option value="conyugue">Cónyuge</option>
                        <option value="padre/madre">Padre/Madre</option>
                        <option value="hermano/a">Hermano/a</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Departamento</label>
                    <select name="r_departamento" class="form-select dep-select" data-target="r_localidad">
                        <option value="">--</option>
                        <?php foreach ($departamentos as $d): ?>
                            <option value="<?= $d['id_departamento'] ?>"><?= sanitize($d['nombre']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Localidad</label>
                    <select name="r_localidad" id="r_localidad" class="form-select loc-select"></select>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Barrio</label>
                    <input type="text" name="r_barrio" class="form-control">
                </div>
                <div class="col-md-12">
                    <label class="form-label">Domicilio</label>
                    <input type="text" name="r_domicilio" class="form-control">
                </div>
                <div class="col-md-12">
                    <div class="form-check">
                        <input type="checkbox" name="r_whatsapp" class="form-check-input" id="rWhatsapp" checked>
                        <label class="form-check-label" for="rWhatsapp">Tiene WhatsApp</label>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="card mb-3">
        <div class="card-header bg-success text-white"><i class="bi bi-clipboard"></i> Detalles del Servicio</div>
        <div class="card-body">
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label">Tipo de Servicio *</label>
                    <select name="tipo_servicio" class="form-select" required>
                        <option value="ATAUD">Ataúd</option>
                        <option value="TRASLADO">Traslado</option>
                        <option value="ATAUD_Y_TRASLADO">Ataúd y Traslado</option>
                        <option value="CREMACION">Cremación</option>
                        <option value="REPATRIACION">Repatriación</option>
                        <option value="SERVICIO_CALLE">Servicio en Calle</option>
                    </select>
                </div>
                <div class="col-md-8">
                    <label class="form-label">Observaciones del Pedido *</label>
                    <textarea name="solicitud_texto" class="form-control" rows="2" required></textarea>
                </div>
                <div class="col-md-12">
                    <div class="form-check">
                        <input type="checkbox" name="requiere_traslado" class="form-check-input" id="reqTraslado">
                        <label class="form-check-label" for="reqTraslado">Requiere Traslado</label>
                    </div>
                </div>
                <div class="traslado-data" style="display:none">
                    <div class="col-md-5">
                        <label class="form-label">Lugar Origen</label>
                        <input type="text" name="lugar_origen" class="form-control">
                    </div>
                    <div class="col-md-5">
                        <label class="form-label">Lugar Destino</label>
                        <input type="text" name="lugar_destino" class="form-control">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Distancia (km)</label>
                        <input type="number" name="distancia_km" class="form-control">
                    </div>
                </div>
                <div class="col-md-12">
                    <label class="form-label">Observaciones Internas</label>
                    <textarea name="observaciones" class="form-control" rows="2"></textarea>
                </div>
            </div>
        </div>
    </div>

    <div class="d-flex gap-2">
        <button type="submit" class="btn btn-primary"><i class="bi bi-save"></i> Guardar Solicitud</button>
        <a href="index.php" class="btn btn-secondary">Cancelar</a>
    </div>
</form>

<script>
document.getElementById('esRnf').addEventListener('change', function() {
    document.querySelector('.rnf-data').style.display = this.checked ? 'flex' : 'none';
});
document.getElementById('reqTraslado').addEventListener('change', function() {
    document.querySelector('.traslado-data').style.display = this.checked ? 'flex' : 'none';
});
</script>

<?php include '../../includes/footer.php'; ?>