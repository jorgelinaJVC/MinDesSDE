-- ============================================================
-- BASE DE DATOS UNIFICADA Y DEFINITIVA: servicios_funebres
-- Combina estructura completa + datos de producción + fuentes
-- ============================================================

CREATE DATABASE IF NOT EXISTS `servicios_funebres`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `servicios_funebres`;

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. ROLES
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id_rol` int NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `nombre_rol` (`nombre_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` VALUES
(1,'SUPERADMIN','Acceso total al sistema',NULL,'2026-06-17 12:37:31'),
(2,'ADMIN','Gestiona empleados, reportes, asignaciones',NULL,'2026-06-17 12:37:31'),
(3,'EMPLEADO','Carga solicitudes y asigna servicios',NULL,'2026-06-17 12:37:31');

-- ------------------------------------------------------------
-- 2. EMPLEADOS
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `empleados`;
CREATE TABLE `empleados` (
  `id_empleado` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contraseña_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_rol` int NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `primer_ingreso` tinyint(1) DEFAULT '1',
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ultimo_acceso` timestamp NULL DEFAULT NULL,
  `ultimo_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_empleado`),
  UNIQUE KEY `usuario` (`usuario`),
  KEY `id_rol` (`id_rol`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `empleados_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON DELETE RESTRICT,
  CONSTRAINT `empleados_ibfk_2` FOREIGN KEY (`creado_por`) REFERENCES `empleados` (`id_empleado`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `empleados` VALUES
(1,'Admin','Sistema','superadmin','admin@sistemafunebre.com','3850000000','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',1,1,0,NULL,'2026-07-02 13:34:41',NULL,NULL),
(2,'Belen','Banegas','Belu','belen.banegas@orangedcx.com','3518631883','$2y$10$P3wjhkbO3cRJ91h2gPCMpuJogB1GE1pLrQTKfsmmvUn.ZGfskZR5G',1,1,1,NULL,'2026-07-02 14:28:29',NULL,NULL);

-- ------------------------------------------------------------
-- 3. DEPARTAMENTOS
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `departamentos`;
CREATE TABLE `departamentos` (
  `id_departamento` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_departamento`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `departamentos` VALUES
(1,'Aguirre',1),(2,'Alberdi',1),(3,'Atamisqui',1),(4,'Avellaneda',1),
(5,'Banda',1),(6,'Belgrano',1),(7,'Capital',1),(8,'Choya',1),(9,'Copo',1),
(10,'Figueroa',1),(11,'General Taboada',1),(12,'Guasayán',1),(13,'Jiménez',1),
(14,'Juan F. Ibarra',1),(15,'Loreto',1),(16,'Mitre',1),(17,'Moreno',1),
(18,'Ojo de Agua',1),(19,'Pellegrini',1),(20,'Quebrachos',1),(21,'Río Hondo',1),
(22,'Rivadavia',1),(23,'Robles',1),(24,'Salavina',1),(25,'San Martín',1),
(26,'Sarmiento',1),(27,'Silípica',1);

-- ------------------------------------------------------------
-- 4. LOCALIDADES
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `localidades`;
CREATE TABLE `localidades` (
  `id_localidad` int NOT NULL AUTO_INCREMENT,
  `id_departamento` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_postal` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_localidad`),
  UNIQUE KEY `uk_localidad_departamento` (`id_departamento`,`nombre`),
  CONSTRAINT `localidades_ibfk_1` FOREIGN KEY (`id_departamento`) REFERENCES `departamentos` (`id_departamento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. CATÁLOGO DE ATAÚDES
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `catalogo_ataudes`;
CREATE TABLE `catalogo_ataudes` (
  `id_ataud` int NOT NULL AUTO_INCREMENT,
  `codigo_renglon` int DEFAULT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
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
  UNIQUE KEY `codigo_renglon` (`codigo_renglon`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `catalogo_ataudes_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `empleados` (`id_empleado`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `catalogo_ataudes`
(`id_ataud`,`codigo_renglon`,`nombre`,`descripcion`,`largo_mts`,`tiene_chapa`,`es_especial`,`es_boveda`,`es_metalica`,`stock_actual`,`stock_minimo`,`activo`,`creado_por`,`fecha_creacion`) VALUES
(1,0,'RENGLON PARA SERV. SIN CTRL STOCK',NULL,0.00,0,0,0,0,10,5,1,NULL,'2026-07-02 13:34:41'),
(2,1,'ATAUDES DE 0.60 MTS SIN CHAPA',NULL,0.60,0,0,0,0,8,5,1,NULL,'2026-07-02 13:34:41'),
(3,2,'ATAUDES DE 0.60 MTS CON CHAPA',NULL,0.60,1,0,0,0,5,5,1,NULL,'2026-07-02 13:34:41'),
(4,3,'ATAUDES DE 1.90 MTS SIN CHAPA',NULL,1.90,0,0,0,0,12,5,1,NULL,'2026-07-02 13:34:41'),
(5,4,'ATAUDES DE 1.90 MTS CON CHAPA',NULL,1.90,1,0,0,0,7,5,1,NULL,'2026-07-02 13:34:41'),
(6,5,'ATAUDES ESPECIALES',NULL,1.90,0,1,0,0,3,5,1,NULL,'2026-07-02 13:34:41'),
(7,6,'ATAUDES DE 0.90 MTS SIN CHAPA',NULL,0.90,0,0,0,0,6,5,1,NULL,'2026-07-02 13:34:41'),
(8,7,'ATAUDES DE 1.20 MTS SIN CHAPA',NULL,1.20,0,0,0,0,4,5,1,NULL,'2026-07-02 13:34:41'),
(9,8,'ATAUDES ESPECIALES: EXTRAORDINARIO CHAPA',NULL,1.90,1,1,0,0,2,5,1,NULL,'2026-07-02 13:34:41'),
(10,9,'ATAUDES BOVEDA LUSTRADO DE 1.90 MTS C/CHAPA',NULL,1.90,1,0,1,0,3,5,1,NULL,'2026-07-02 13:34:41'),
(11,10,'ATAUDES DE 2.10 SIN CHAPA',NULL,2.10,0,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),
(12,11,'ATAUDES DE 2.10 CON CHAPA',NULL,2.10,1,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),
(13,12,'ATAUDES DE 1.20 CON CHAPA',NULL,1.20,1,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),
(14,13,'ATAUDES DE 0.90 MTS CON CHAPA',NULL,0.90,1,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),
(15,14,'ATAUDES DE 1.50 MTS CON CHAPA',NULL,1.50,1,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),
(16,15,'CAJA METALICA PLANA 0.60 MTS',NULL,0.60,0,0,0,1,0,5,1,NULL,'2026-06-17 12:02:25'),
(17,16,'ATAUDES ESPECIALES: EXTRAORDINARIO SIN CHAPA',NULL,1.90,0,1,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),
(18,17,'ATAUDES BORLA VACA DE 2.10 MTS CON CAJA METALICA',NULL,2.10,0,1,0,1,0,5,1,NULL,'2026-06-17 12:02:25');

-- ------------------------------------------------------------
-- 6. CONFIGURACIÓN (Contador corregido a 19394)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `configuracion`;
CREATE TABLE `configuracion` (
  `id_config` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `modificado_por` int DEFAULT NULL,
  `fecha_modificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_config`),
  UNIQUE KEY `clave` (`clave`),
  KEY `modificado_por` (`modificado_por`),
  CONSTRAINT `configuracion_ibfk_1` FOREIGN KEY (`modificado_por`) REFERENCES `empleados` (`id_empleado`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `configuracion` VALUES
(1,'ultimo_nro_pedido','19394','Último número de pedido utilizado en el sistema viejo',NULL,'2026-07-02 13:34:41'),
(2,'stock_alerta_minimo','5','Stock mínimo para mostrar alerta en dashboard',NULL,'2026-07-02 13:34:41'),
(3,'email_contacto','Serviciosfunebressgo@gmail.com','Email de contacto del ministerio',NULL,'2026-07-02 13:34:41'),
(4,'whatsapp_numero','3854892389','Número de WhatsApp del ministerio para comunicación',NULL,'2026-07-02 13:34:41');

-- ------------------------------------------------------------
-- 7. RESPONSABLES
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `responsables`;
CREATE TABLE `responsables` (
  `id_responsable` int NOT NULL AUTO_INCREMENT,
  `tipo_doc` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nro_documento` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono_1` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono_2` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsapp` tinyint(1) DEFAULT '1',
  `departamento` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `localidad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `barrio` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `domicilio` text COLLATE utf8mb4_unicode_ci,
  `relacion_fallecido` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_responsable`),
  KEY `idx_responsables_nro_doc` (`nro_documento`),
  KEY `idx_responsables_nombre` (`nombre`,`apellido`),
  KEY `idx_responsables_creado_por` (`creado_por`),
  CONSTRAINT `responsables_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `empleados` (`id_empleado`) ON DELETE SET NULL,
  CONSTRAINT `responsables_chk_1` CHECK (`tipo_doc` IN ('DNI','RNF','S/D','PASAPORTE','OTRO'))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `responsables` VALUES
(1,'DNI','12345678','ROJAS','NATALIA LILIANA','3851234567',NULL,NULL,1,NULL,NULL,NULL,'LUIS FRIAS 8 Bº AUTONOMIA',NULL,NULL,'2026-06-17 12:37:33');

-- ------------------------------------------------------------
-- 8. FALLECIDOS
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `fallecidos`;
CREATE TABLE `fallecidos` (
  `id_fallecido` int NOT NULL AUTO_INCREMENT,
  `tipo_doc` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nro_documento` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_fallecimiento` date NOT NULL,
  `departamento` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `localidad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `barrio` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `domicilio` text COLLATE utf8mb4_unicode_ci,
  `es_rnf` tinyint(1) DEFAULT '0',
  `progenitor_nombre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `progenitor_nro_doc` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `progenitor_tipo_doc` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origen` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WEB',
  `edad` int DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_fallecido`),
  KEY `idx_fallecidos_nro_doc` (`nro_documento`),
  KEY `idx_fallecidos_nombre_apellido` (`nombre`,`apellido`),
  KEY `idx_fallecidos_fecha_fallecimiento` (`fecha_fallecimiento`),
  KEY `idx_fallecidos_origen` (`origen`),
  KEY `idx_fallecidos_creado_por` (`creado_por`),
  CONSTRAINT `fallecidos_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `empleados` (`id_empleado`) ON DELETE SET NULL,
  CONSTRAINT `fallecidos_chk_1` CHECK (`tipo_doc` IN ('DNI','RNF','S/D','PASAPORTE','OTRO')),
  CONSTRAINT `fallecidos_chk_2` CHECK (`origen` IN ('WEB','INTERNA'))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `fallecidos` VALUES
(1,'DNI','7793979','GARCIA','GUILLERMO ALBERTO','2025-10-23',NULL,NULL,'AUTONOMIA','LUIS FRIAS 8',0,NULL,NULL,NULL,'INTERNA',NULL,NULL,1,'2026-06-17 12:37:34');

-- ------------------------------------------------------------
-- 9. FUENTES DE SOLICITUD
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `fuentes_solicitud`;
CREATE TABLE `fuentes_solicitud` (
  `id_fuente` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('HOSPITAL','CENTRO_SALUD','UPA','MORGUE','FAMILIAR','OTRO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'FAMILIAR',
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `orden` int DEFAULT '0',
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_fuente`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_activo` (`activo`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `fuentes_solicitud_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `empleados` (`id_empleado`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `fuentes_solicitud` (`nombre`, `tipo`, `direccion`, `telefono`, `orden`) VALUES
('Familiar directo', 'FAMILIAR', NULL, NULL, 1),
('Hospital Regional de Santiago del Estero', 'HOSPITAL', 'Av. Belgrano 550', '385-4211222', 10),
('Hospital Infantil', 'HOSPITAL', 'Av. Belgrano 550', '385-4211333', 11),
('Morgue Judicial', 'MORGUE', 'Calle Catamarca 450', '385-4211444', 20),
('UPA Barrio Centro', 'UPA', 'Av. Independencia 1200', '385-4211555', 30);

-- ------------------------------------------------------------
-- 10. VEHÍCULOS
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `vehiculos`;
CREATE TABLE `vehiculos` (
  `id_vehiculo` int NOT NULL AUTO_INCREMENT,
  `patente` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_interno` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marca` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modelo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `año` int DEFAULT NULL,
  `tipo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacidad_ataudes` int DEFAULT '1',
  `capacidad_acompañantes` int DEFAULT '2',
  `estado` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'DISPONIBLE',
  `seguro_poliza` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `seguro_vencimiento` date DEFAULT NULL,
  `vtv_vencimiento` date DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_vehiculo`),
  UNIQUE KEY `patente` (`patente`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `vehiculos_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `empleados` (`id_empleado`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `vehiculos` VALUES
(1,'AB123CD','001','Ford','Ranger',2020,'CAMIONETA',1,2,'DISPONIBLE',NULL,NULL,NULL,1,NULL,'2026-07-02 13:34:41');

-- ------------------------------------------------------------
-- 11. SOLICITUDES (Incluye columna fuente_id directamente)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `solicitudes`;
CREATE TABLE `solicitudes` (
  `id_solicitud` int NOT NULL AUTO_INCREMENT,
  `nro_pedido` int NOT NULL,
  `fecha_solicitud` date NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `id_responsable` int NOT NULL,
  `id_fallecido` int NOT NULL,
  `fuente_id` int DEFAULT NULL,
  `origen` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WEB',
  `procesado_por` int DEFAULT NULL,
  `tipo_servicio` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `solicitud_texto` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `requiere_traslado` tinyint(1) DEFAULT '0',
  `lugar_origen` text COLLATE utf8mb4_unicode_ci,
  `lugar_destino` text COLLATE utf8mb4_unicode_ci,
  `distancia_km` int DEFAULT NULL,
  `id_ataud_asignado` int DEFAULT NULL,
  `id_vehiculo_asignado` int DEFAULT NULL,
  `id_chofer_asignado` int DEFAULT NULL,
  `estado` enum('PENDIENTE','EN_REVISION','ASIGNADO','EN_EJECUCION','COMPLETADO','ANULADO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDIENTE',
  `certificado_defuncion` tinyint(1) DEFAULT '0',
  `dni_fallecido` tinyint(1) DEFAULT '0',
  `documentos_extra` tinyint(1) DEFAULT '0',
  `fecha_documentos_recibidos` timestamp NULL DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modificado_por` int DEFAULT NULL,
  `fecha_modificacion` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_solicitud`),
  UNIQUE KEY `nro_pedido` (`nro_pedido`),
  KEY `idx_solicitudes_nro_pedido` (`nro_pedido`),
  KEY `idx_solicitudes_estado` (`estado`),
  KEY `idx_solicitudes_fecha` (`fecha_solicitud`),
  KEY `idx_solicitudes_origen` (`origen`),
  KEY `idx_solicitudes_responsable` (`id_responsable`),
  KEY `idx_solicitudes_fallecido` (`id_fallecido`),
  KEY `idx_solicitudes_procesado_por` (`procesado_por`),
  KEY `idx_fuente` (`fuente_id`),
  KEY `id_ataud_asignado` (`id_ataud_asignado`),
  KEY `id_vehiculo_asignado` (`id_vehiculo_asignado`),
  KEY `id_chofer_asignado` (`id_chofer_asignado`),
  KEY `creado_por` (`creado_por`),
  KEY `modificado_por` (`modificado_por`),
  KEY `idx_solicitudes_fecha_estado` (`fecha_solicitud`,`estado`),
  CONSTRAINT `solicitudes_ibfk_1` FOREIGN KEY (`id_responsable`) REFERENCES `responsables` (`id_responsable`),
  CONSTRAINT `solicitudes_ibfk_2` FOREIGN KEY (`id_fallecido`) REFERENCES `fallecidos` (`id_fallecido`),
  CONSTRAINT `solicitudes_ibfk_fuente` FOREIGN KEY (`fuente_id`) REFERENCES `fuentes_solicitud` (`id_fuente`) ON DELETE SET NULL,
  CONSTRAINT `solicitudes_ibfk_3` FOREIGN KEY (`procesado_por`) REFERENCES `empleados` (`id_empleado`),
  CONSTRAINT `solicitudes_ibfk_4` FOREIGN KEY (`id_ataud_asignado`) REFERENCES `catalogo_ataudes` (`id_ataud`),
  CONSTRAINT `solicitudes_ibfk_5` FOREIGN KEY (`id_vehiculo_asignado`) REFERENCES `vehiculos` (`id_vehiculo`),
  CONSTRAINT `solicitudes_ibfk_6` FOREIGN KEY (`id_chofer_asignado`) REFERENCES `empleados` (`id_empleado`),
  CONSTRAINT `solicitudes_ibfk_7` FOREIGN KEY (`creado_por`) REFERENCES `empleados` (`id_empleado`),
  CONSTRAINT `solicitudes_ibfk_8` FOREIGN KEY (`modificado_por`) REFERENCES `empleados` (`id_empleado`),
  CONSTRAINT `solicitudes_chk_1` CHECK (`origen` IN ('WEB','INTERNA')),
  CONSTRAINT `solicitudes_chk_2` CHECK (`tipo_servicio` IN ('ATAUD','TRASLADO','ATAUD_Y_TRASLADO','CREMACION','REPATRIACION','SERVICIO_CALLE'))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `solicitudes` VALUES
(1,19394,'2025-10-23','2026-06-17 12:37:34',1,1,NULL,'INTERNA',NULL,'ATAUD','UN ATAUD CON CHAPA ESPECIAL EXT PERSONAS',0,NULL,NULL,NULL,NULL,NULL,NULL,'ASIGNADO',0,0,0,NULL,NULL,1,'2026-06-17 12:37:34',NULL,NULL);

-- ------------------------------------------------------------
-- 12. ARCHIVOS
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `archivos`;
CREATE TABLE `archivos` (
  `id_archivo` int NOT NULL AUTO_INCREMENT,
  `solicitud_id` int NOT NULL,
  `nombre_original` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_guardado` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruta` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_documento` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subido_por` int DEFAULT NULL,
  `fecha_subida` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `tamaño_bytes` int DEFAULT NULL,
  PRIMARY KEY (`id_archivo`),
  KEY `solicitud_id` (`solicitud_id`),
  KEY `subido_por` (`subido_por`),
  CONSTRAINT `archivos_ibfk_1` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes` (`id_solicitud`) ON DELETE CASCADE,
  CONSTRAINT `archivos_ibfk_2` FOREIGN KEY (`subido_por`) REFERENCES `empleados` (`id_empleado`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 13. AUDITORÍA
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `auditoria`;
CREATE TABLE `auditoria` (
  `id_auditoria` int NOT NULL AUTO_INCREMENT,
  `empleado_id` int DEFAULT NULL,
  `accion` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tabla_afectada` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registro_id` int DEFAULT NULL,
  `datos_antes` json DEFAULT NULL,
  `datos_despues` json DEFAULT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `fecha_hora` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_auditoria`),
  KEY `empleado_id` (`empleado_id`),
  CONSTRAINT `auditoria_ibfk_1` FOREIGN KEY (`empleado_id`) REFERENCES `empleados` (`id_empleado`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 14. PROVEEDORES
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `proveedores`;
CREATE TABLE `proveedores` (
  `id_proveedor` int NOT NULL AUTO_INCREMENT,
  `razon_social` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_comercial` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cuit` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` text COLLATE utf8mb4_unicode_ci,
  `telefono` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contacto_nombre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contacto_telefono` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condicion_iva` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_proveedor`),
  UNIQUE KEY `cuit` (`cuit`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `proveedores_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `empleados` (`id_empleado`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 15. MOVIMIENTOS DE STOCK
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `movimientos_stock`;
CREATE TABLE `movimientos_stock` (
  `id_movimiento` int NOT NULL AUTO_INCREMENT,
  `id_ataud` int NOT NULL,
  `cantidad` int NOT NULL,
  `tipo_movimiento` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `solicitud_id` int DEFAULT NULL,
  `proveedor_id` int DEFAULT NULL,
  `remito_nro` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `factura_nro` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `fecha_movimiento` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `realizado_por` int NOT NULL,
  PRIMARY KEY (`id_movimiento`),
  KEY `solicitud_id` (`solicitud_id`),
  KEY `id_ataud` (`id_ataud`),
  KEY `proveedor_id` (`proveedor_id`),
  KEY `realizado_por` (`realizado_por`),
  KEY `idx_movimientos_fecha` (`fecha_movimiento`),
  KEY `idx_movimientos_tipo` (`tipo_movimiento`),
  CONSTRAINT `movimientos_stock_ibfk_1` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes` (`id_solicitud`) ON DELETE SET NULL,
  CONSTRAINT `movimientos_stock_ibfk_2` FOREIGN KEY (`id_ataud`) REFERENCES `catalogo_ataudes` (`id_ataud`),
  CONSTRAINT `movimientos_stock_ibfk_3` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id_proveedor`),
  CONSTRAINT `movimientos_stock_ibfk_4` FOREIGN KEY (`realizado_por`) REFERENCES `empleados` (`id_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 16. MANTENIMIENTOS
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `mantenimientos`;
CREATE TABLE `mantenimientos` (
  `id_mantenimiento` int NOT NULL AUTO_INCREMENT,
  `id_vehiculo` int NOT NULL,
  `tipo_mantenimiento` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `fecha_programada` date DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `taller_nombre` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `costo` decimal(12,2) DEFAULT NULL,
  `comprobante_nro` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `solicito_empleado_id` int NOT NULL,
  `autorizo_empleado_id` int DEFAULT NULL,
  `estado` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'PENDIENTE',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_mantenimiento`),
  KEY `id_vehiculo` (`id_vehiculo`),
  KEY `solicito_empleado_id` (`solicito_empleado_id`),
  KEY `autorizo_empleado_id` (`autorizo_empleado_id`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `mantenimientos_ibfk_1` FOREIGN KEY (`id_vehiculo`) REFERENCES `vehiculos` (`id_vehiculo`),
  CONSTRAINT `mantenimientos_ibfk_2` FOREIGN KEY (`solicito_empleado_id`) REFERENCES `empleados` (`id_empleado`),
  CONSTRAINT `mantenimientos_ibfk_3` FOREIGN KEY (`autorizo_empleado_id`) REFERENCES `empleados` (`id_empleado`),
  CONSTRAINT `mantenimientos_ibfk_4` FOREIGN KEY (`creado_por`) REFERENCES `empleados` (`id_empleado`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 17. VEHÍCULO ESTADO HISTORIAL
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `vehiculo_estado_historial`;
CREATE TABLE `vehiculo_estado_historial` (
  `id_historial` int NOT NULL AUTO_INCREMENT,
  `id_vehiculo` int NOT NULL,
  `estado_anterior` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado_nuevo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `motivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mantenimiento_id` int DEFAULT NULL,
  `cambio_realizado_por` int NOT NULL,
  `fecha_cambio` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_historial`),
  KEY `id_vehiculo` (`id_vehiculo`),
  KEY `mantenimiento_id` (`mantenimiento_id`),
  KEY `cambio_realizado_por` (`cambio_realizado_por`),
  CONSTRAINT `vehiculo_estado_historial_ibfk_1` FOREIGN KEY (`id_vehiculo`) REFERENCES `vehiculos` (`id_vehiculo`),
  CONSTRAINT `vehiculo_estado_historial_ibfk_2` FOREIGN KEY (`mantenimiento_id`) REFERENCES `mantenimientos` (`id_mantenimiento`),
  CONSTRAINT `vehiculo_estado_historial_ibfk_3` FOREIGN KEY (`cambio_realizado_por`) REFERENCES `empleados` (`id_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 18. TABLAS LEGACY
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `servicios`;
CREATE TABLE `servicios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(200) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `stock_actual` int DEFAULT 0,
  `stock_minimo` int DEFAULT 5,
  `precio` decimal(10,2) DEFAULT 0.00,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `servicios` VALUES
(1,'ATAUD BORLA VACA DE 2.10 MTS CON CAJA METALICA',NULL,10,3,0.00,1,'2026-06-11 00:10:01'),
(2,'ATAUD CON CHAPA 1.20 MTS',NULL,8,3,0.00,1,'2026-06-11 00:10:01'),
(3,'ATAUD CON CHAPA 1.50 MTS',NULL,5,3,0.00,1,'2026-06-11 00:10:01'),
(4,'ATAUD CON CHAPA 1.70 MTS',NULL,12,3,0.00,1,'2026-06-11 00:10:01'),
(5,'ATAUD CON CHAPA 1.90 MTS',NULL,6,3,0.00,1,'2026-06-11 00:10:01'),
(6,'ATAUD CON CHAPA 2.10 MTS',NULL,4,3,0.00,1,'2026-06-11 00:10:01'),
(7,'ATAUD CON CHAPA ESPECIAL EXT. PERSONAS OBESAS',NULL,2,3,0.00,1,'2026-06-11 00:10:01'),
(8,'ATAUD SIN CHAPA 0.60 MTS',NULL,7,3,0.00,1,'2026-06-11 00:10:01'),
(9,'ATAUD SIN CHAPA 0.80 MTS',NULL,5,3,0.00,1,'2026-06-11 00:10:01'),
(10,'ATAUD SIN CHAPA 0.90 MTS',NULL,4,3,0.00,1,'2026-06-11 00:10:01'),
(11,'ATAUD SIN CHAPA 1.00 MTS',NULL,6,3,0.00,1,'2026-06-11 00:10:01'),
(12,'ATAUD SIN CHAPA 1.20 MTS',NULL,8,3,0.00,1,'2026-06-11 00:10:01'),
(13,'ATAUD SIN CHAPA 1.50 MTS',NULL,5,3,0.00,1,'2026-06-11 00:10:01');

DROP TABLE IF EXISTS `solicitantes`;
CREATE TABLE `solicitantes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dni` varchar(20) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `domicilio` varchar(200) DEFAULT NULL,
  `localidad` varchar(100) DEFAULT NULL,
  `parentesco` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dni` (`dni`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `tipos_servicio`;
CREATE TABLE `tipos_servicio` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `requiere_ataud` tinyint(1) DEFAULT 0,
  `activo` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tipos_servicio` VALUES
(1,'ATAUD',1,1),
(2,'DE CALLE',0,1),
(3,'SERVICIO DE CALLE SIN ATAUD',0,1),
(4,'TRASLADO',0,1),
(5,'CAJA',1,1),
(6,'ATAUD Y SOLDADURA',1,1),
(7,'CREMACION',0,1);

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('admin','empleado') DEFAULT 'empleado',
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `usuarios` VALUES
(1,'Admin','Sistema','admin@funeraria.gov.ar','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin',1,'2026-06-11 00:10:01');

-- ------------------------------------------------------------
-- 19. VISTAS
-- ------------------------------------------------------------
DROP VIEW IF EXISTS `dashboard_solicitudes_mensual`;
CREATE VIEW `dashboard_solicitudes_mensual` AS
SELECT
  YEAR(`fecha_solicitud`) AS `año`,
  MONTH(`fecha_solicitud`) AS `mes`,
  MONTHNAME(`fecha_solicitud`) AS `nombre_mes`,
  COUNT(*) AS `total`,
  SUM(CASE WHEN `estado` = 'PENDIENTE' THEN 1 ELSE 0 END) AS `pendientes`,
  SUM(CASE WHEN `estado` = 'EN_REVISION' THEN 1 ELSE 0 END) AS `en_revision`,
  SUM(CASE WHEN `estado` = 'ASIGNADO' THEN 1 ELSE 0 END) AS `asignados`,
  SUM(CASE WHEN `estado` = 'EN_EJECUCION' THEN 1 ELSE 0 END) AS `en_ejecucion`,
  SUM(CASE WHEN `estado` = 'COMPLETADO' THEN 1 ELSE 0 END) AS `completados`,
  SUM(CASE WHEN `estado` = 'ANULADO' THEN 1 ELSE 0 END) AS `anulados`
FROM `solicitudes`
GROUP BY YEAR(`fecha_solicitud`), MONTH(`fecha_solicitud`), MONTHNAME(`fecha_solicitud`)
ORDER BY `año` DESC, `mes` DESC;

DROP VIEW IF EXISTS `dashboard_stock`;
CREATE VIEW `dashboard_stock` AS
SELECT
  `id_ataud`,
  `codigo_renglon`,
  `nombre`,
  `stock_actual`,
  `stock_minimo`,
  (CASE
    WHEN `stock_actual` <= 0 THEN 'SIN_STOCK'
    WHEN `stock_actual` < `stock_minimo` THEN 'BAJO_STOCK'
    ELSE 'NORMAL'
  END) AS `estado_stock`
FROM `catalogo_ataudes`
WHERE `activo` = TRUE;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;