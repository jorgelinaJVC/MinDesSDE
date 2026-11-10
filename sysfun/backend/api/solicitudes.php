<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
    http_response_code(200);
    exit; 
}

// 1. Incluir seguridad y BD al inicio
require_once __DIR__ . '/../config/security.php';
require_once __DIR__ . '/../config/db_connection.php';

// ============================================
// FUNCIÓN DE VALIDACIÓN DE DOCUMENTOS
// ============================================
function validarDocumento($tipo_doc, $nro_documento) {
    $tipo_doc = strtoupper(trim($tipo_doc));
    $nro_documento = trim($nro_documento);
    
    if (empty($nro_documento)) {
        return ['valido' => false, 'mensaje' => 'El número de documento es obligatorio'];
    }
    
    switch ($tipo_doc) {
        case 'DNI':
            if (!preg_match('/^[0-9]{1,8}$/', $nro_documento)) {
                return ['valido' => false, 'mensaje' => 'El DNI debe contener solo números (1-8 dígitos)'];
            }
            break;
        case 'PASAPORTE':
            if (!preg_match('/^[A-Za-z0-9]{1,20}$/', $nro_documento)) {
                return ['valido' => false, 'mensaje' => 'El pasaporte solo puede contener letras y números'];
            }
            break;
        case 'RNF':
            if (!preg_match('/^[A-Za-z0-9\-]{1,20}$/', $nro_documento)) {
                return ['valido' => false, 'mensaje' => 'El RNF contiene caracteres no válidos'];
            }
            break;
        case 'S/D':
            break;
        default:
            return ['valido' => false, 'mensaje' => 'Tipo de documento no válido'];
    }
    
    return ['valido' => true, 'mensaje' => 'Documento válido'];
}

// ============================================
// FUNCIÓN PARA OBTENER ID DEL EMPLEADO
// ============================================
function getEmpleadoId($db) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (isset($_SESSION['empleado_id'])) {
        return intval($_SESSION['empleado_id']);
    }
    
    return 1; 
}

// ============================================
// FUNCIÓN PARA GENERAR NÚMERO DE PEDIDO
// ============================================
function generarNroPedido($db) {
    $stmt = $db->prepare("SELECT valor FROM configuracion WHERE clave = 'ultimo_nro_pedido' FOR UPDATE");
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
// FUNCIÓN PARA PROCESAR ARCHIVOS
// ============================================
function procesarArchivos($db, $solicitud_id) {
    $archivos_subidos = 0;
    $upload_dir = __DIR__ . '/../../uploads/solicitudes/';
    
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0750, true);
    }
    
    if (!isset($_FILES['archivos']) || empty($_FILES['archivos']['name'][0])) {
        return 0;
    }
    
    $allowed_types = [
        'pdf'  => 'application/pdf',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'doc'  => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    $total_archivos = count($_FILES['archivos']['name']);
    
    for ($i = 0; $i < $total_archivos; $i++) {
        if ($_FILES['archivos']['error'][$i] === UPLOAD_ERR_OK) {
            $nombre_original = $_FILES['archivos']['name'][$i];
            $tmp_name = $_FILES['archivos']['tmp_name'][$i];
            $file_size = $_FILES['archivos']['size'][$i];
            
            if ($file_size > 5 * 1024 * 1024) {
                continue; 
            }
            
            $extension = strtolower(pathinfo($nombre_original, PATHINFO_EXTENSION));
            
            if (array_key_exists($extension, $allowed_types)) {
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $real_mime = finfo_file($finfo, $tmp_name);
                
                if ($real_mime === $allowed_types[$extension]) {
                    $nombre_unico = bin2hex(random_bytes(16)) . '_' . time() . '.' . $extension;
                    $ruta_completa = $upload_dir . $nombre_unico;
                    
                    if (move_uploaded_file($tmp_name, $ruta_completa)) {
                        $stmt = $db->prepare("
                            INSERT INTO archivos (
                                solicitud_id, nombre_original, nombre_guardado,
                                ruta, tipo_documento, tamaño_bytes, subido_por
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        ");
                        $stmt->execute([
                            $solicitud_id,
                            $nombre_original,
                            $nombre_unico,
                            $ruta_completa,
                            $real_mime,
                            $file_size,
                            getEmpleadoId($db)
                        ]);
                        $archivos_subidos++;
                    }
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
                SELECT s.*, f.nombre as fallecido_nombre, f.apellido as fallecido_apellido, 
                f.nro_documento as fallecido_dni, f.departamento as fallecido_departamento, 
                f.localidad as fallecido_localidad, f.barrio as fallecido_barrio,
                f.domicilio as fallecido_domicilio, f.fecha_fallecimiento, 
                f.progenitor_nombre, f.progenitor_nro_doc as progenitor_dni,
                f.observaciones as fallecido_observaciones, r.nombre as responsable_nombre, 
                r.apellido as responsable_apellido, r.nro_documento as responsable_dni, 
                r.departamento as responsable_departamento, r.localidad as responsable_localidad,
                r.barrio as responsable_barrio, r.domicilio as responsable_domicilio, 
                r.telefono_1 as responsable_telefono, r.telefono_2 as responsable_telefono_2, 
                r.email as responsable_email, c.nombre as ataud_nombre,
                c.codigo_renglon as ataud_codigo, v.patente as vehiculo_patente, 
                v.marca as vehiculo_marca, v.modelo as vehiculo_modelo, e.nombre as chofer_nombre
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
        
        $estado = isset($_GET['estado']) ? $_GET['estado'] : null;
        $fecha_desde = isset($_GET['fecha_desde']) ? $_GET['fecha_desde'] : null;
        $fecha_hasta = isset($_GET['fecha_hasta']) ? $_GET['fecha_hasta'] : null;
        
        $sql = "
            SELECT s.id_solicitud, s.nro_pedido, s.estado, s.fecha_solicitud, s.tipo_servicio, s.origen,
                CONCAT(f.nombre, ' ', f.apellido) as fallecido_nombre,
                CONCAT(r.nombre, ' ', r.apellido) as responsable_nombre,
                r.telefono_1 as responsable_telefono
            FROM solicitudes s
            LEFT JOIN fallecidos f ON s.id_fallecido = f.id_fallecido
            LEFT JOIN responsables r ON s.id_responsable = r.id_responsable
            WHERE 1=1
        ";
        $params = [];
        
        if ($estado) { $sql .= " AND s.estado = ?"; $params[] = $estado; }
        if ($fecha_desde) { $sql .= " AND s.fecha_solicitud >= ?"; $params[] = $fecha_desde; }
        if ($fecha_hasta) { $sql .= " AND s.fecha_solicitud <= ?"; $params[] = $fecha_hasta; }
        
        $sql .= " ORDER BY s.fecha_solicitud DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// ============================================
// MÉTODO POST - Crear nueva solicitud
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // ==========================================
    // 🔒 VALIDACIÓN CSRF
    // ==========================================
    $csrf_token = '';
    
    if (!empty($_POST['csrf_token'])) {
        $csrf_token = $_POST['csrf_token'];
    } else {
        $input = json_decode(file_get_contents('php://input'), true);
        $csrf_token = $input['csrf_token'] ?? '';
    }

    if (!verificarTokenCSRF($csrf_token)) {
        registrarLog('Intento de creación de solicitud con token CSRF inválido', 'warning');
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'message' => 'Token de seguridad inválido o expirado. Recarga la página.'
        ]);
        exit;
    }

    try {
        $db = Database::getInstance()->getConnection();
        $db->beginTransaction();
        
        $empleado_id = getEmpleadoId($db);
        $isFormData = !empty($_POST) || !empty($_FILES);
        
        // 0. CAPTURAR Y VALIDAR DOCUMENTOS
        $tipo_doc_fallecido = strtoupper(trim($_POST['tipoDocFallecido'] ?? 'DNI'));
        $nro_doc_fallecido = trim($_POST['nroDocFallecido'] ?? '');
        
        $tipo_doc_responsable = strtoupper(trim($_POST['tipoDocResponsable'] ?? 'DNI'));
        $nro_doc_responsable = trim($_POST['nroDocResponsable'] ?? '');

        // Validar fallecido
        $validacion_fallecido = validarDocumento($tipo_doc_fallecido, $nro_doc_fallecido);
        if (!$validacion_fallecido['valido']) {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Error en documento del fallecido: ' . $validacion_fallecido['mensaje']]);
            exit;
        }

        // Validar responsable
        $validacion_responsable = validarDocumento($tipo_doc_responsable, $nro_doc_responsable);
        if (!$validacion_responsable['valido']) {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Error en documento del responsable: ' . $validacion_responsable['mensaje']]);
            exit;
        }

        if ($isFormData) {
            $origen = 'WEB';
            $nombre_fallecido = htmlspecialchars(trim($_POST['nombreFallecido'] ?? ''), ENT_QUOTES, 'UTF-8');
            $apellido_fallecido = htmlspecialchars(trim($_POST['apellidoFallecido'] ?? ''), ENT_QUOTES, 'UTF-8');
            $nombre_responsable = htmlspecialchars(trim($_POST['nombreResponsable'] ?? ''), ENT_QUOTES, 'UTF-8');
            $apellido_responsable = htmlspecialchars(trim($_POST['apellidoResponsable'] ?? ''), ENT_QUOTES, 'UTF-8');
            
            $tipo_servicio_input = $_POST['tipoServicio'] ?? 'ATAUD';
            $tipo_servicio_map = [
                'ATAUD' => 'ATAUD', 
                'TRASLADO' => 'TRASLADO', 
                'ATAUD_TRASLADO' => 'ATAUD_Y_TRASLADO'
            ];
            $tipo_servicio = $tipo_servicio_map[$tipo_servicio_input] ?? 'ATAUD';
        } else {
            $origen = 'INTERNA';
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                $db->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
                exit;
            }
        }

        // 1. GUARDAR FALLECIDO
        $es_rnf = ($tipo_doc_fallecido === 'RNF') ? 1 : 0;
        
        $stmt = $db->prepare("
            INSERT INTO fallecidos (
                tipo_doc, nro_documento, nombre, apellido, departamento, localidad, barrio, domicilio,
                fecha_fallecimiento, progenitor_nombre, progenitor_nro_doc, progenitor_tipo_doc,
                es_rnf, observaciones, origen, creado_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $tipo_doc_fallecido,
            $nro_doc_fallecido,
            $nombre_fallecido,
            $apellido_fallecido,
            htmlspecialchars($_POST['deptoFallecido'] ?? '', ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($_POST['localidadFallecido'] ?? '', ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($_POST['barrioFallecido'] ?? '', ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($_POST['domicilioFallecido'] ?? '', ENT_QUOTES, 'UTF-8'),
            $_POST['fechaFallecimiento'] ?? null,
            htmlspecialchars($_POST['nombreProgenitor'] ?? '', ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($_POST['nroDocProgenitor'] ?? '', ENT_QUOTES, 'UTF-8'),
            ($es_rnf ? 'DNI' : null),
            $es_rnf,
            htmlspecialchars($_POST['observaciones'] ?? '', ENT_QUOTES, 'UTF-8'),
            $origen,
            $empleado_id
        ]);
        $id_fallecido = $db->lastInsertId();

        // 2. GUARDAR RESPONSABLE
        $stmt = $db->prepare("
            INSERT INTO responsables (
                tipo_doc, nro_documento, nombre, apellido, telefono_1, telefono_2, email,
                departamento, localidad, barrio, domicilio, creado_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $tipo_doc_responsable,
            $nro_doc_responsable,
            $nombre_responsable,
            $apellido_responsable,
            htmlspecialchars($_POST['telefonoResponsable'] ?? '', ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($_POST['telefonoSecundario'] ?? '', ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($_POST['emailResponsable'] ?? '', ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($_POST['deptoResponsable'] ?? '', ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($_POST['localidadResponsable'] ?? '', ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($_POST['barrioResponsable'] ?? '', ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($_POST['domicilioResponsable'] ?? '', ENT_QUOTES, 'UTF-8'),
            $empleado_id
        ]);
        $id_responsable = $db->lastInsertId();

        // 3. GUARDAR SOLICITUD
        $nro_pedido = generarNroPedido($db);
        $requiere_traslado = ($tipo_servicio === 'TRASLADO' || $tipo_servicio === 'ATAUD_Y_TRASLADO') ? 1 : 0;
        $id_ataud = null;
        
        $solicitud_texto = "Servicio: " . $tipo_servicio . "\nFallecido: " . $nombre_fallecido . " " . $apellido_fallecido;
        
        $stmt = $db->prepare("
            INSERT INTO solicitudes (
                nro_pedido, fecha_solicitud, id_responsable, id_fallecido, tipo_servicio, 
                solicitud_texto, requiere_traslado, lugar_origen, lugar_destino, id_ataud_asignado,
                estado, observaciones, creado_por, origen
            ) VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?, ?, ?)
        ");
        
        $stmt->execute([
            $nro_pedido, $id_responsable, $id_fallecido, $tipo_servicio, $solicitud_texto,
            $requiere_traslado,
            htmlspecialchars($_POST['lugarOrigen'] ?? '', ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($_POST['lugarDestino'] ?? '', ENT_QUOTES, 'UTF-8'),
            $id_ataud,
            htmlspecialchars($_POST['observaciones'] ?? '', ENT_QUOTES, 'UTF-8'),
            $empleado_id,
            $origen
        ]);
        $id_solicitud = $db->lastInsertId();

        // 4. PROCESAR ARCHIVOS
        $archivos_subidos = 0;
        if ($isFormData) {
            $archivos_subidos = procesarArchivos($db, $id_solicitud);
        }

        $db->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Solicitud creada exitosamente',
            'id_solicitud' => $id_solicitud,
            'nro_pedido' => $nro_pedido,
            'origen' => $origen,
            'archivos_subidos' => $archivos_subidos
        ]);
        
    } catch (PDOException $e) {
        if (isset($db)) $db->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error de base de datos: ' . $e->getMessage()]);
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
        
        $stmt = $db->prepare("SELECT id_solicitud FROM solicitudes WHERE id_solicitud = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['message' => 'Solicitud no encontrada']);
            exit;
        }
        
        $campos = [];
        $params = [];
        $campos_permitidos = ['estado', 'id_ataud_asignado', 'id_vehiculo_asignado', 'id_chofer_asignado', 'observaciones'];
        
        foreach ($campos_permitidos as $campo) {
            if (array_key_exists($campo, $input)) {
                $campos[] = "$campo = ?";
                $valor = ($campo === 'observaciones') ? htmlspecialchars($input[$campo], ENT_QUOTES, 'UTF-8') : $input[$campo];
                $params[] = $valor;
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
        
        echo json_encode(['success' => true, 'message' => 'Solicitud actualizada exitosamente']);
        
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
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(['message' => 'ID de solicitud requerido']);
            exit;
        }
        
        $stmt = $db->prepare("SELECT id_solicitud, estado FROM solicitudes WHERE id_solicitud = ?");
        $stmt->execute([$id]);
        $solicitud = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$solicitud) {
            http_response_code(404);
            echo json_encode(['message' => 'Solicitud no encontrada']);
            exit;
        }
        
        if ($solicitud['estado'] !== 'PENDIENTE') {
            http_response_code(400);
            echo json_encode(['message' => 'Solo se pueden eliminar solicitudes en estado PENDIENTE']);
            exit;
        }
        
        // Eliminar archivos físicos
        $stmt = $db->prepare("SELECT ruta FROM archivos WHERE solicitud_id = ?");
        $stmt->execute([$id]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $archivo) {
            if (file_exists($archivo['ruta'])) {
                unlink($archivo['ruta']);
            }
        }
        
        $db->prepare("DELETE FROM archivos WHERE solicitud_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM solicitudes WHERE id_solicitud = ?")->execute([$id]);
        
        echo json_encode(['success' => true, 'message' => 'Solicitud eliminada exitosamente']);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['message' => 'Método no permitido']);
?>