-- ============================================
-- USAR LA BASE DE DATOS EXISTENTE
-- ============================================
USE `if0_42152454_funeraria_db`;

-- ============================================
-- ELIMINAR TABLAS SI EXISTEN (ORDEN CORRECTO)
-- ============================================
DROP TABLE IF EXISTS `archivos`;
DROP TABLE IF EXISTS `auditoria`;
DROP TABLE IF EXISTS `vehiculo_estado_historial`;
DROP TABLE IF EXISTS `mantenimientos`;
DROP TABLE IF EXISTS `movimientos_stock`;
DROP TABLE IF EXISTS `solicitudes`;
DROP TABLE IF EXISTS `fallecidos`;
DROP TABLE IF EXISTS `responsables`;
DROP TABLE IF EXISTS `empleados`;
DROP TABLE IF EXISTS `vehiculos`;
DROP TABLE IF EXISTS `proveedores`;
DROP TABLE IF EXISTS `catalogo_ataudes`;
DROP TABLE IF EXISTS `configuracion`;
DROP TABLE IF EXISTS `departamentos`;
DROP TABLE IF EXISTS `localidades`;
DROP TABLE IF EXISTS `roles`;

-- ============================================
-- CREAR TABLAS
-- ============================================

-- Tabla: roles
CREATE TABLE `roles` (
  `id_rol` int NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(50) NOT NULL,
  `descripcion` text,
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `nombre_rol` (`nombre_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`id_rol`, `nombre_rol`, `descripcion`, `creado_por`, `fecha_creacion`) VALUES
(1, 'SUPERADMIN', 'Acceso total al sistema', NULL, NOW()),
(2, 'ADMIN', 'Gestiona empleados, reportes, asignaciones', NULL, NOW()),
(3, 'EMPLEADO', 'Carga solicitudes y asigna servicios', NULL, NOW());

-- Tabla: empleados
CREATE TABLE `empleados` (
  `id_empleado` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `usuario` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `telefono` varchar(50) NOT NULL,
  `contraseña_hash` varchar(255) NOT NULL,
  `id_rol` int NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `primer_ingreso` tinyint(1) DEFAULT '1',
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ultimo_acceso` timestamp NULL DEFAULT NULL,
  `ultimo_ip` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id_empleado`),
  UNIQUE KEY `usuario` (`usuario`),
  KEY `id_rol` (`id_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USUARIO: superadmin / CONTRASEÑA: admin123
INSERT INTO `empleados` (`id_empleado`, `nombre`, `apellido`, `usuario`, `email`, `telefono`, `contraseña_hash`, `id_rol`, `activo`, `primer_ingreso`, `creado_por`, `fecha_creacion`) VALUES
(1, 'Admin', 'Sistema', 'superadmin', 'admin@sistemafunebre.com', '3850000000', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 1, 0, NULL, NOW());

-- Tabla: catalogo_ataudes
CREATE TABLE `catalogo_ataudes` (
  `id_ataud` int NOT NULL AUTO_INCREMENT,
  `codigo_renglon` int DEFAULT NULL,
  `nombre` varchar(255) NOT NULL,
  `descripcion` text,
  `largo_mts` decimal(4,2) NOT NULL,
  `tiene_chapa` tinyint(1) DEFAULT '0',
  `es_especial` tinyint(1) DEFAULT '0',
  `es_boveda` tinyint(1) DEFAULT '0',
  `es_metalica` tinyint(1) DEFAULT '0',
  `stock_actual` int NOT NULL DEFAULT '0',
  `stock_minimo` int DEFAULT '5',
  `activo` tinyint(1) DEFAULT '1',
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_ataud`),
  UNIQUE KEY `codigo_renglon` (`codigo_renglon`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `catalogo_ataudes` (`id_ataud`, `codigo_renglon`, `nombre`, `descripcion`, `largo_mts`, `tiene_chapa`, `es_especial`, `es_boveda`, `es_metalica`, `stock_actual`, `stock_minimo`, `activo`) VALUES
(1, 0, 'RENGLON PARA SERV. SIN CTRL STOCK', NULL, 0.00, 0, 0, 0, 0, 10, 5, 1),
(2, 1, 'ATAUDES DE 0.60 MTS SIN CHAPA', NULL, 0.60, 0, 0, 0, 0, 8, 5, 1),
(3, 2, 'ATAUDES DE 0.60 MTS CON CHAPA', NULL, 0.60, 1, 0, 0, 0, 5, 5, 1),
(4, 3, 'ATAUDES DE 1.90 MTS SIN CHAPA', NULL, 1.90, 0, 0, 0, 0, 12, 5, 1),
(5, 4, 'ATAUDES DE 1.90 MTS CON CHAPA', NULL, 1.90, 1, 0, 0, 0, 7, 5, 1),
(6, 5, 'ATAUDES ESPECIALES', NULL, 1.90, 0, 1, 0, 0, 3, 5, 1),
(7, 6, 'ATAUDES DE 0.90 MTS SIN CHAPA', NULL, 0.90, 0, 0, 0, 0, 6, 5, 1),
(8, 7, 'ATAUDES DE 1.20 MTS SIN CHAPA', NULL, 1.20, 0, 0, 0, 0, 4, 5, 1),
(9, 8, 'ATAUDES ESPECIALES: EXTRAORDINARIO CHAPA', NULL, 1.90, 1, 1, 0, 0, 2, 5, 1),
(10, 9, 'ATAUDES BOVEDA LUSTRADO DE 1.90 MTS C/CHAPA', NULL, 1.90, 1, 0, 1, 0, 3, 5, 1);

-- Tabla: configuracion
CREATE TABLE `configuracion` (
  `id_config` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(100) NOT NULL,
  `valor` text NOT NULL,
  `descripcion` text,
  `modificado_por` int DEFAULT NULL,
  `fecha_modificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_config`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `configuracion` (`id_config`, `clave`, `valor`, `descripcion`) VALUES
(1, 'ultimo_nro_pedido', '19393', 'Último número de pedido utilizado'),
(2, 'stock_alerta_minimo', '5', 'Stock mínimo para mostrar alerta'),
(3, 'email_contacto', 'Serviciosfunebressgo@gmail.com', 'Email de contacto del ministerio'),
(4, 'whatsapp_numero', '3854892389', 'Número de WhatsApp del ministerio');

-- Tabla: departamentos
CREATE TABLE `departamentos` (
  `id_departamento` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_departamento`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `departamentos` (`id_departamento`, `nombre`, `activo`) VALUES
(1, 'Aguirre', 1),(2, 'Alberdi', 1),(3, 'Atamisqui', 1),(4, 'Avellaneda', 1),
(5, 'Banda', 1),(6, 'Belgrano', 1),(7, 'Capital', 1),(8, 'Choya', 1),
(9, 'Copo', 1),(10, 'Figueroa', 1),(11, 'General Taboada', 1),(12, 'Guasayán', 1),
(13, 'Jiménez', 1),(14, 'Juan F. Ibarra', 1),(15, 'Loreto', 1),(16, 'Mitre', 1),
(17, 'Moreno', 1),(18, 'Ojo de Agua', 1),(19, 'Pellegrini', 1),(20, 'Quebrachos', 1),
(21, 'Río Hondo', 1),(22, 'Rivadavia', 1),(23, 'Robles', 1),(24, 'Salavina', 1),
(25, 'San Martín', 1),(26, 'Sarmiento', 1),(27, 'Silípica', 1);

-- Tabla: localidades
CREATE TABLE `localidades` (
  `id_localidad` int NOT NULL AUTO_INCREMENT,
  `id_departamento` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `codigo_postal` varchar(10) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_localidad`),
  UNIQUE KEY `uk_localidad_departamento` (`id_departamento`,`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: responsables
CREATE TABLE `responsables` (
  `id_responsable` int NOT NULL AUTO_INCREMENT,
  `tipo_doc` varchar(10) NOT NULL,
  `nro_documento` varchar(50) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `apellido` varchar(255) NOT NULL,
  `telefono_1` varchar(50) NOT NULL,
  `telefono_2` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `whatsapp` tinyint(1) DEFAULT '1',
  `departamento` varchar(100) DEFAULT NULL,
  `localidad` varchar(100) DEFAULT NULL,
  `barrio` varchar(100) DEFAULT NULL,
  `domicilio` text,
  `relacion_fallecido` varchar(50) DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_responsable`),
  KEY `idx_responsables_nro_doc` (`nro_documento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: fallecidos
CREATE TABLE `fallecidos` (
  `id_fallecido` int NOT NULL AUTO_INCREMENT,
  `tipo_doc` varchar(10) NOT NULL,
  `nro_documento` varchar(50) DEFAULT NULL,
  `nombre` varchar(255) NOT NULL,
  `apellido` varchar(255) NOT NULL,
  `fecha_fallecimiento` date NOT NULL,
  `departamento` varchar(100) DEFAULT NULL,
  `localidad` varchar(100) DEFAULT NULL,
  `barrio` varchar(100) DEFAULT NULL,
  `domicilio` text,
  `es_rnf` tinyint(1) DEFAULT '0',
  `progenitor_nombre` varchar(255) DEFAULT NULL,
  `progenitor_nro_doc` varchar(50) DEFAULT NULL,
  `progenitor_tipo_doc` varchar(10) DEFAULT NULL,
  `origen` varchar(10) NOT NULL DEFAULT 'WEB',
  `edad` int DEFAULT NULL,
  `observaciones` text,
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_fallecido`),
  KEY `idx_fallecidos_nro_doc` (`nro_documento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: proveedores
CREATE TABLE `proveedores` (
  `id_proveedor` int NOT NULL AUTO_INCREMENT,
  `razon_social` varchar(255) NOT NULL,
  `nombre_comercial` varchar(255) DEFAULT NULL,
  `cuit` varchar(15) DEFAULT NULL,
  `direccion` text,
  `telefono` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `contacto_nombre` varchar(255) DEFAULT NULL,
  `contacto_telefono` varchar(50) DEFAULT NULL,
  `condicion_iva` varchar(30) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_proveedor`),
  UNIQUE KEY `cuit` (`cuit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: vehiculos
CREATE TABLE `vehiculos` (
  `id_vehiculo` int NOT NULL AUTO_INCREMENT,
  `patente` varchar(20) NOT NULL,
  `numero_interno` varchar(20) DEFAULT NULL,
  `marca` varchar(50) NOT NULL,
  `modelo` varchar(50) NOT NULL,
  `año` int DEFAULT NULL,
  `tipo` varchar(30) NOT NULL,
  `capacidad_ataudes` int DEFAULT '1',
  `capacidad_acompañantes` int DEFAULT '2',
  `estado` varchar(20) DEFAULT 'DISPONIBLE',
  `seguro_poliza` varchar(100) DEFAULT NULL,
  `seguro_vencimiento` date DEFAULT NULL,
  `vtv_vencimiento` date DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_vehiculo`),
  UNIQUE KEY `patente` (`patente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `vehiculos` (`id_vehiculo`, `patente`, `numero_interno`, `marca`, `modelo`, `año`, `tipo`, `capacidad_ataudes`, `capacidad_acompañantes`, `estado`, `activo`) VALUES
(1, 'AB123CD', '001', 'Ford', 'Ranger', 2020, 'CAMIONETA', 1, 2, 'DISPONIBLE', 1);

-- Tabla: solicitudes
CREATE TABLE `solicitudes` (
  `id_solicitud` int NOT NULL AUTO_INCREMENT,
  `nro_pedido` int NOT NULL,
  `fecha_solicitud` date NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `id_responsable` int NOT NULL,
  `id_fallecido` int NOT NULL,
  `origen` varchar(10) NOT NULL DEFAULT 'WEB',
  `procesado_por` int DEFAULT NULL,
  `tipo_servicio` varchar(30) NOT NULL,
  `solicitud_texto` text NOT NULL,
  `requiere_traslado` tinyint(1) DEFAULT '0',
  `lugar_origen` text,
  `lugar_destino` text,
  `distancia_km` int DEFAULT NULL,
  `id_ataud_asignado` int DEFAULT NULL,
  `id_vehiculo_asignado` int DEFAULT NULL,
  `id_chofer_asignado` int DEFAULT NULL,
  `estado` enum('PENDIENTE','EN_REVISION','ASIGNADO','EN_EJECUCION','COMPLETADO','ANULADO') NOT NULL DEFAULT 'PENDIENTE',
  `certificado_defuncion` tinyint(1) DEFAULT '0',
  `dni_fallecido` tinyint(1) DEFAULT '0',
  `documentos_extra` tinyint(1) DEFAULT '0',
  `fecha_documentos_recibidos` timestamp NULL DEFAULT NULL,
  `observaciones` text,
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modificado_por` int DEFAULT NULL,
  `fecha_modificacion` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_solicitud`),
  UNIQUE KEY `nro_pedido` (`nro_pedido`),
  KEY `idx_solicitudes_nro_pedido` (`nro_pedido`),
  KEY `idx_solicitudes_estado` (`estado`),
  KEY `id_ataud_asignado` (`id_ataud_asignado`),
  KEY `id_vehiculo_asignado` (`id_vehiculo_asignado`),
  KEY `id_chofer_asignado` (`id_chofer_asignado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: archivos
CREATE TABLE `archivos` (
  `id_archivo` int NOT NULL AUTO_INCREMENT,
  `solicitud_id` int NOT NULL,
  `nombre_original` varchar(255) NOT NULL,
  `nombre_guardado` varchar(255) NOT NULL,
  `ruta` varchar(500) NOT NULL,
  `tipo_documento` varchar(50) DEFAULT NULL,
  `subido_por` int DEFAULT NULL,
  `fecha_subida` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `tamaño_bytes` int DEFAULT NULL,
  PRIMARY KEY (`id_archivo`),
  KEY `solicitud_id` (`solicitud_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: auditoria
CREATE TABLE `auditoria` (
  `id_auditoria` int NOT NULL AUTO_INCREMENT,
  `empleado_id` int DEFAULT NULL,
  `accion` varchar(100) NOT NULL,
  `tabla_afectada` varchar(50) DEFAULT NULL,
  `registro_id` int DEFAULT NULL,
  `datos_antes` json DEFAULT NULL,
  `datos_despues` json DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `fecha_hora` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_auditoria`),
  KEY `empleado_id` (`empleado_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: mantenimientos
CREATE TABLE `mantenimientos` (
  `id_mantenimiento` int NOT NULL AUTO_INCREMENT,
  `id_vehiculo` int NOT NULL,
  `tipo_mantenimiento` varchar(30) NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `fecha_programada` date DEFAULT NULL,
  `descripcion` text NOT NULL,
  `taller_nombre` varchar(200) DEFAULT NULL,
  `costo` decimal(12,2) DEFAULT NULL,
  `comprobante_nro` varchar(100) DEFAULT NULL,
  `solicito_empleado_id` int NOT NULL,
  `autorizo_empleado_id` int DEFAULT NULL,
  `estado` varchar(20) DEFAULT 'PENDIENTE',
  `observaciones` text,
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_mantenimiento`),
  KEY `id_vehiculo` (`id_vehiculo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: movimientos_stock
CREATE TABLE `movimientos_stock` (
  `id_movimiento` int NOT NULL AUTO_INCREMENT,
  `id_ataud` int NOT NULL,
  `cantidad` int NOT NULL,
  `tipo_movimiento` varchar(30) NOT NULL,
  `solicitud_id` int DEFAULT NULL,
  `proveedor_id` int DEFAULT NULL,
  `remito_nro` varchar(100) DEFAULT NULL,
  `factura_nro` varchar(100) DEFAULT NULL,
  `observaciones` text,
  `fecha_movimiento` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `realizado_por` int NOT NULL,
  PRIMARY KEY (`id_movimiento`),
  KEY `id_ataud` (`id_ataud`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: vehiculo_estado_historial
CREATE TABLE `vehiculo_estado_historial` (
  `id_historial` int NOT NULL AUTO_INCREMENT,
  `id_vehiculo` int NOT NULL,
  `estado_anterior` varchar(20) NOT NULL,
  `estado_nuevo` varchar(20) NOT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `mantenimiento_id` int DEFAULT NULL,
  `cambio_realizado_por` int NOT NULL,
  `fecha_cambio` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_historial`),
  KEY `id_vehiculo` (`id_vehiculo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VISTAS
-- ============================================
CREATE OR REPLACE VIEW `dashboard_stock` AS
SELECT 
    `catalogo_ataudes`.`id_ataud`,
    `catalogo_ataudes`.`codigo_renglon`,
    `catalogo_ataudes`.`nombre`,
    `catalogo_ataudes`.`stock_actual`,
    `catalogo_ataudes`.`stock_minimo`,
    CASE 
        WHEN `catalogo_ataudes`.`stock_actual` <= 0 THEN 'SIN_STOCK'
        WHEN `catalogo_ataudes`.`stock_actual` < `catalogo_ataudes`.`stock_minimo` THEN 'BAJO_STOCK'
        ELSE 'NORMAL'
    END AS `estado_stock`
FROM `catalogo_ataudes`
WHERE `catalogo_ataudes`.`activo` = 1;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================