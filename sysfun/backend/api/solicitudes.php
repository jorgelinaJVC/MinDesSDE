<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:8000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
    http_response_code(200);
    exit; 
}

require_once __DIR__ . '/../config/db_connection.php';

// ============================================
// FUNCIÓN PARA OBTENER ID DEL EMPLEADO LOGUEADO
// ============================================
function getEmpleadoId($db) {
    // Verificar si hay sesión activa
    session_start();
    
    // Si el empleado está logueado en el panel interno
    if (isset($_SESSION['empleado_id'])) {
        return intval($_SESSION['empleado_id']);
    }
    
    // Verificar token en Authorization header
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        $token = str_replace('Bearer ', '', $headers['Authorization']);
        // Decodificar token JWT o buscar en base de datos
        // Por ahora, usamos el superadmin por defecto para solicitudes web
        // (en producción, validar el token correctamente)
    }
    
    // Si viene desde formulario web sin autenticación, usar usuario por defecto
    // (se puede configurar un empleado específico para solicitudes web)
    return 1; // ID del superadmin por defecto
}

// ============================================
// FUNCIÓN PARA GENERAR NÚMERO DE PEDIDO
// ============================================
function generarNroPedido($db) {
    $stmt = $db->prepare("SELECT valor FROM configuracion WHERE clave = 'ultimo_nro_pedido'");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        $ultimo = intval($result['valor']) + 1;
        $stmt = $db->prepare("UPDATE configuracion SET valor = ? WHERE clave = 'ultimo_nro_pedido'");
        $stmt->execute([$ultimo]);
        return $ultimo;
    } else {
        $stmt = $db->prepare("INSERT INTO configuracion (clave, valor) VALUES ('ultimo_nro_pedido', '19394')");
        $stmt->execute();
        return 19395;
    }
}

// ============================================
// FUNCIÓN PARA PROCESAR ARCHIVOS SUBIDOS
// ============================================
function procesarArchivos($db, $solicitud_id) {
    $archivos_subidos = 0;
    $upload_dir = __DIR__ . '/../../uploads/solicitudes/';
    
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }
    
    if (!isset($_FILES['archivos']) || empty($_FILES['archivos']['name'][0])) {
        return 0;
    }
    
    $allowed = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
    $total_archivos = count($_FILES['archivos']['name']);
    
    for ($i = 0; $i < $total_archivos; $i++) {
        if ($_FILES['archivos']['error'][$i] === UPLOAD_ERR_OK) {
            $nombre_original = $_FILES['archivos']['name'][$i];
            $extension = strtolower(pathinfo($nombre_original, PATHINFO_EXTENSION));
            
            if (in_array($extension, $allowed)) {
                $nombre_unico = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $nombre_original);
                $ruta_completa = $upload_dir . $nombre_unico;
                
                if (move_uploaded_file($_FILES['archivos']['tmp_name'][$i], $ruta_completa)) {
                    $stmt = $db->prepare("
                        INSERT INTO archivos (
                            solicitud_id, nombre_original, nombre_guardado,
                            ruta, tipo_documento, tamaño_bytes
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    ");
                    $stmt->execute([
                        $solicitud_id,
                        $nombre_original,
                        $nombre_unico,
                        $ruta_completa,
                        $_FILES['archivos']['type'][$i],
                        $_FILES['archivos']['size'][$i]
                    ]);
                    $archivos_subidos++;
                }
            }
        }
    }
    
    return $archivos_subidos;
}

// ============================================
// MÉTODO GET - Listar solicitudes
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $db = Database::getInstance()->getConnection();
        
        if (isset($_GET['id'])) {
            $stmt = $db->prepare("
                SELECT 
                    s.*,
                    f.nombre as fallecido_nombre,
                    f.apellido as fallecido_apellido,
                    f.nro_documento as fallecido_dni,
                    f.departamento as fallecido_departamento,
                    f.localidad as fallecido_localidad,
                    f.barrio as fallecido_barrio,
                    f.domicilio as fallecido_domicilio,
                    f.fecha_fallecimiento,
                    f.progenitor_nombre,
                    f.progenitor_nro_doc as progenitor_dni,
                    f.observaciones as fallecido_observaciones,
                    r.nombre as responsable_nombre,
                    r.apellido as responsable_apellido,
                    r.nro_documento as responsable_dni,
                    r.departamento as responsable_departamento,
                    r.localidad as responsable_localidad,
                    r.barrio as responsable_barrio,
                    r.domicilio as responsable_domicilio,
                    r.telefono_1 as responsable_telefono,
                    r.telefono_2 as responsable_telefono_2,
                    r.email as responsable_email,
                    c.nombre as ataud_nombre,
                    c.codigo_renglon as ataud_codigo,
                    v.patente as vehiculo_patente,
                    v.marca as vehiculo_marca,
                    v.modelo as vehiculo_modelo,
                    e.nombre as chofer_nombre
                FROM solicitudes s
                LEFT JOIN fallecidos f ON s.id_fallecido = f.id_fallecido
                LEFT JOIN responsables r ON s.id_responsable = r.id_responsable
                LEFT JOIN catalogo_ataudes c ON s.id_ataud_asignado = c.id_ataud
                LEFT JOIN vehiculos v ON s.id_vehiculo_asignado = v.id_vehiculo
                LEFT JOIN empleados e ON s.id_chofer_asignado = e.id_empleado
                WHERE s.id_solicitud = ?
            ");
            $stmt->execute([$_GET['id']]);
            $solicitud = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($solicitud) {
                echo json_encode($solicitud);
            } else {
                http_response_code(404);
                echo json_encode(['message' => 'Solicitud no encontrada']);
            }
            exit;
        }
        
        // Filtros opcionales
        $estado = isset($_GET['estado']) ? $_GET['estado'] : null;
        $fecha_desde = isset($_GET['fecha_desde']) ? $_GET['fecha_desde'] : null;
        $fecha_hasta = isset($_GET['fecha_hasta']) ? $_GET['fecha_hasta'] : null;
        
        $sql = "
            SELECT 
                s.id_solicitud,
                s.nro_pedido,
                s.estado,
                s.fecha_solicitud,
                s.tipo_servicio,
                s.origen,
                CONCAT(f.nombre, ' ', f.apellido) as fallecido_nombre,
                CONCAT(r.nombre, ' ', r.apellido) as responsable_nombre,
                r.telefono_1 as responsable_telefono
            FROM solicitudes s
            LEFT JOIN fallecidos f ON s.id_fallecido = f.id_fallecido
            LEFT JOIN responsables r ON s.id_responsable = r.id_responsable
            WHERE 1=1
        ";
        $params = [];
        
        if ($estado) {
            $sql .= " AND s.estado = ?";
            $params[] = $estado;
        }
        if ($fecha_desde) {
            $sql .= " AND s.fecha_solicitud >= ?";
            $params[] = $fecha_desde;
        }
        if ($fecha_hasta) {
            $sql .= " AND s.fecha_solicitud <= ?";
            $params[] = $fecha_hasta;
        }
        
        $sql .= " ORDER BY s.fecha_solicitud DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $solicitudes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($solicitudes);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// ============================================
// MÉTODO POST - Crear nueva solicitud (WEB y INTERNA)
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $db = Database::getInstance()->getConnection();
        $db->beginTransaction();
        
        $empleado_id = getEmpleadoId($db);
        $origen = 'WEB';
        
        // ============================================================
        // DETECTAR ORIGEN: FORMULARIO WEB vs JSON (PANEL INTERNO)
        // ============================================================
        $isFormData = !empty($_POST) || !empty($_FILES);
        
        if ($isFormData) {
            // ============================================================
            // ORIGEN: FORMULARIO WEB (multipart/form-data)
            // ============================================================
            $origen = 'WEB';
            
            // --- Datos del Fallecido ---
            $tipo_doc_fallecido = $_POST['tipoDocFallecido'] ?? 'DNI';
            $nro_doc_fallecido = $_POST['nroDocFallecido'] ?? '';
            $nombre_completo_f = $_POST['nombreFallecido'] ?? '';
            $fecha_fallecimiento = $_POST['fechaFallecimiento'] ?? null;
            $depto_fallecido = $_POST['deptoFallecido'] ?? '';
            $localidad_fallecido = $_POST['localidadFallecido'] ?? '';
            $barrio_fallecido = $_POST['barrioFallecido'] ?? '';
            $domicilio_fallecido = $_POST['domicilioFallecido'] ?? '';
            $nro_doc_progenitor = $_POST['nroDocProgenitor'] ?? null;
            $nombre_progenitor = $_POST['nombreProgenitor'] ?? null;
            $lugar_origen = $_POST['lugarOrigen'] ?? null;
            $lugar_destino = $_POST['lugarDestino'] ?? null;
            $tipo_servicio_input = $_POST['tipoServicio'] ?? 'ATAUD';
            $observaciones = $_POST['observaciones'] ?? '';
            
            // --- Datos del Responsable ---
            $tipo_doc_responsable = $_POST['tipoDocResponsable'] ?? 'DNI';
            $nro_doc_responsable = $_POST['nroDocResponsable'] ?? '';
            $nombre_completo_r = $_POST['nombreResponsable'] ?? '';
            $fecha_registro = $_POST['fechaRegistro'] ?? date('Y-m-d');
            $provincia_responsable = $_POST['provinciaResponsable'] ?? '';
            $localidad_responsable = $_POST['localidadResponsable'] ?? '';
            $barrio_responsable = $_POST['barrioResponsable'] ?? '';
            $domicilio_responsable = $_POST['domicilioResponsable'] ?? '';
            $telefono_responsable = $_POST['telefonoResponsable'] ?? '';
            $telefono_secundario = $_POST['telefonoSecundario'] ?? null;
            $email_responsable = $_POST['emailResponsable'] ?? null;
            
            // Mapear tipo de servicio
            $tipo_servicio_map = [
                'ATAUD' => 'ATAUD',
                'TRASLADO' => 'TRASLADO',
                'ATAUD_TRASLADO' => 'ATAUD_Y_TRASLADO'
            ];
            $tipo_servicio = $tipo_servicio_map[$tipo_servicio_input] ?? 'ATAUD';
            $requiere_traslado = ($tipo_servicio === 'TRASLADO' || $tipo_servicio === 'ATAUD_Y_TRASLADO') ? 1 : 0;
            $id_ataud = null; // En formulario web no se asigna ataúd automáticamente
            
        } else {
            // ============================================================
            // ORIGEN: PANEL INTERNO (JSON)
            // ============================================================
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                http_response_code(400);
                echo json_encode(['message' => 'Datos inválidos']);
                exit;
            }
            
            $origen = $input['origen'] ?? 'INTERNA';
            $f = $input['fallecido'] ?? [];
            $r = $input['responsable'] ?? [];
            $s = $input['servicio'] ?? [];
            
            $tipo_doc_fallecido = $f['tipo_doc'] ?? 'DNI';
            $nro_doc_fallecido = $f['nro_doc'] ?? '';
            $nombre_completo_f = $f['nombre'] ?? '';
            $fecha_fallecimiento = $f['fecha_fallecimiento'] ?? null;
            $depto_fallecido = $f['departamento'] ?? '';
            $localidad_fallecido = $f['localidad'] ?? '';
            $barrio_fallecido = $f['barrio'] ?? '';
            $domicilio_fallecido = $f['domicilio'] ?? '';
            $nro_doc_progenitor = $f['progenitor_doc'] ?? null;
            $nombre_progenitor = $f['progenitor_nombre'] ?? null;
            $lugar_origen = $s['lugar_origen'] ?? null;
            $lugar_destino = $s['lugar_destino'] ?? null;
            $tipo_servicio = $s['tipo'] ?? 'ATAUD';
            $observaciones = $f['observaciones'] ?? $s['observaciones'] ?? '';
            $id_ataud = !empty($s['ataud_id']) ? intval($s['ataud_id']) : null;
            $requiere_traslado = $s['requiere_traslado'] ?? 0;
            
            $tipo_doc_responsable = $r['tipo_doc'] ?? 'DNI';
            $nro_doc_responsable = $r['nro_doc'] ?? '';
            $nombre_completo_r = $r['nombre'] ?? '';
            $fecha_registro = date('Y-m-d');
            $provincia_responsable = $r['provincia'] ?? '';
            $localidad_responsable = $r['localidad'] ?? '';
            $barrio_responsable = $r['barrio'] ?? '';
            $domicilio_responsable = $r['domicilio'] ?? '';
            $telefono_responsable = $r['telefono'] ?? '';
            $telefono_secundario = $r['telefono_2'] ?? null;
            $email_responsable = $r['email'] ?? null;
        }

        // ============================================================
        // 1. GUARDAR FALLECIDO
        // ============================================================
        $partes = explode(' ', trim($nombre_completo_f), 2);
        $nombre = $partes[0] ?? '';
        $apellido = $partes[1] ?? '';
        $es_rnf = ($tipo_doc_fallecido === 'RNF') ? 1 : 0;
        
        $stmt = $db->prepare("
            INSERT INTO fallecidos (
                tipo_doc, nro_documento, nombre, apellido,
                departamento, localidad, barrio, domicilio,
                fecha_fallecimiento, 
                progenitor_nombre, progenitor_nro_doc, progenitor_tipo_doc,
                es_rnf, observaciones, origen, creado_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $tipo_doc_fallecido,
            $nro_doc_fallecido,
            $nombre,
            $apellido,
            $depto_fallecido,
            $localidad_fallecido,
            $barrio_fallecido,
            $domicilio_fallecido,
            $fecha_fallecimiento,
            $nombre_progenitor,
            $nro_doc_progenitor,
            ($es_rnf ? 'DNI' : null),
            $es_rnf,
            $observaciones,
            $origen,
            $empleado_id
        ]);
        $id_fallecido = $db->lastInsertId();

        // ============================================================
        // 2. GUARDAR RESPONSABLE
        // ============================================================
        $partes_r = explode(' ', trim($nombre_completo_r), 2);
        $nombre_r = $partes_r[0] ?? '';
        $apellido_r = $partes_r[1] ?? '';
        
        $stmt = $db->prepare("
            INSERT INTO responsables (
                tipo_doc, nro_documento, nombre, apellido,
                telefono_1, telefono_2, email,
                departamento, localidad, barrio, domicilio,
                creado_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $tipo_doc_responsable,
            $nro_doc_responsable,
            $nombre_r,
            $apellido_r,
            $telefono_responsable,
            $telefono_secundario,
            $email_responsable,
            $provincia_responsable,
            $localidad_responsable,
            $barrio_responsable,
            $domicilio_responsable,
            $empleado_id
        ]);
        $id_responsable = $db->lastInsertId();

        // ============================================================
        // 3. GUARDAR SOLICITUD
        // ============================================================
        $nro_pedido = generarNroPedido($db);
        
        $solicitud_texto = "Servicio: " . $tipo_servicio;
        $solicitud_texto .= "\nFallecido: " . $nombre_completo_f;
        $solicitud_texto .= "\nResponsable: " . $nombre_completo_r;
        if ($lugar_origen) $solicitud_texto .= "\nOrigen: " . $lugar_origen;
        if ($lugar_destino) $solicitud_texto .= "\nDestino: " . $lugar_destino;
        if ($observaciones) $solicitud_texto .= "\nObservaciones: " . $observaciones;
        if ($id_ataud) {
            $stmt = $db->prepare("SELECT nombre FROM catalogo_ataudes WHERE id_ataud = ?");
            $stmt->execute([$id_ataud]);
            $ataud = $stmt->fetch(PDO::FETCH_ASSOC);
            $solicitud_texto .= "\nAtaúd asignado: " . ($ataud['nombre'] ?? 'Sin nombre');
        }
        
        $stmt = $db->prepare("
            INSERT INTO solicitudes (
                nro_pedido, fecha_solicitud, 
                id_responsable, id_fallecido,
                tipo_servicio, solicitud_texto,
                requiere_traslado, lugar_origen, lugar_destino,
                id_ataud_asignado,
                estado, observaciones, creado_por, origen
            ) VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?, ?, ?)
        ");
        $stmt->execute([
            $nro_pedido,
            $id_responsable,
            $id_fallecido,
            $tipo_servicio,
            $solicitud_texto,
            $requiere_traslado,
            $lugar_origen,
            $lugar_destino,
            $id_ataud,
            $observaciones,
            $empleado_id,
            $origen
        ]);
        $id_solicitud = $db->lastInsertId();

        // ============================================================
        // 4. PROCESAR ARCHIVOS (SOLO DESDE FORMULARIO WEB)
        // ============================================================
        $archivos_subidos = 0;
        if ($isFormData) {
            $archivos_subidos = procesarArchivos($db, $id_solicitud);
        }

        // ============================================================
        // 5. ACTUALIZAR STOCK (SOLO DESDE PANEL INTERNO)
        // ============================================================
        if (!$isFormData && $id_ataud) {
            $stmt = $db->prepare("
                UPDATE catalogo_ataudes 
                SET stock_actual = stock_actual - 1 
                WHERE id_ataud = ? AND stock_actual > 0
            ");
            $stmt->execute([$id_ataud]);
        }

        // ============================================================
        // 6. CONFIRMAR TRANSACCIÓN
        // ============================================================
        $db->commit();
        
        $response = [
            'success' => true,
            'message' => 'Solicitud creada exitosamente',
            'id_solicitud' => $id_solicitud,
            'nro_pedido' => $nro_pedido,
            'origen' => $origen,
            'archivos_subidos' => $archivos_subidos
        ];
        
        echo json_encode($response);
        
    } catch (PDOException $e) {
        if (isset($db)) $db->rollBack();
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error: ' . $e->getMessage()
        ]);
    }
    exit;
}

// ============================================
// MÉTODO PUT - Actualizar solicitud
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $db = Database::getInstance()->getConnection();
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $_GET['id'] ?? null;
        $empleado_id = getEmpleadoId($db);
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(['message' => 'ID de solicitud requerido']);
            exit;
        }
        
        // Verificar que la solicitud existe
        $stmt = $db->prepare("SELECT id_solicitud FROM solicitudes WHERE id_solicitud = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['message' => 'Solicitud no encontrada']);
            exit;
        }
        
        // Actualizar solo los campos permitidos
        $campos = [];
        $params = [];
        
        $campos_permitidos = ['estado', 'id_ataud_asignado', 'id_vehiculo_asignado', 'id_chofer_asignado', 'observaciones'];
        foreach ($campos_permitidos as $campo) {
            if (array_key_exists($campo, $input)) {
                $campos[] = "$campo = ?";
                $params[] = $input[$campo] ?? null;
            }
        }
        
        if (empty($campos)) {
            http_response_code(400);
            echo json_encode(['message' => 'No hay campos para actualizar']);
            exit;
        }
        
        $params[] = $empleado_id;
        $params[] = $id;
        
        $sql = "UPDATE solicitudes SET " . implode(', ', $campos) . ", modificado_por = ? WHERE id_solicitud = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode([
            'success' => true,
            'message' => 'Solicitud actualizada exitosamente'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// ============================================
// MÉTODO DELETE - Eliminar solicitud
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $db = Database::getInstance()->getConnection();
        $id = $_GET['id'] ?? null;
        $empleado_id = getEmpleadoId($db);
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(['message' => 'ID de solicitud requerido']);
            exit;
        }
        
        // Verificar que la solicitud existe
        $stmt = $db->prepare("SELECT id_solicitud, estado FROM solicitudes WHERE id_solicitud = ?");
        $stmt->execute([$id]);
        $solicitud = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$solicitud) {
            http_response_code(404);
            echo json_encode(['message' => 'Solicitud no encontrada']);
            exit;
        }
        
        // Solo permitir eliminar solicitudes PENDIENTES
        if ($solicitud['estado'] !== 'PENDIENTE') {
            http_response_code(400);
            echo json_encode(['message' => 'Solo se pueden eliminar solicitudes en estado PENDIENTE']);
            exit;
        }
        
        // Eliminar archivos asociados primero
        $stmt = $db->prepare("SELECT ruta FROM archivos WHERE solicitud_id = ?");
        $stmt->execute([$id]);
        $archivos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($archivos as $archivo) {
            if (file_exists($archivo['ruta'])) {
                unlink($archivo['ruta']);
            }
        }
        
        $stmt = $db->prepare("DELETE FROM archivos WHERE solicitud_id = ?");
        $stmt->execute([$id]);
        
        $stmt = $db->prepare("DELETE FROM solicitudes WHERE id_solicitud = ?");
        $stmt->execute([$id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Solicitud eliminada exitosamente'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['message' => 'Método no permitido']);
?>