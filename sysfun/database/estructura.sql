CREATE DATABASE  IF NOT EXISTS `servicios_funebres` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `servicios_funebres`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: servicios_funebres
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `archivos`
--

DROP TABLE IF EXISTS `archivos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `archivos`
--

LOCK TABLES `archivos` WRITE;
/*!40000 ALTER TABLE `archivos` DISABLE KEYS */;
/*!40000 ALTER TABLE `archivos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auditoria`
--

DROP TABLE IF EXISTS `auditoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditoria`
--

LOCK TABLES `auditoria` WRITE;
/*!40000 ALTER TABLE `auditoria` DISABLE KEYS */;
/*!40000 ALTER TABLE `auditoria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `catalogo_ataudes`
--

DROP TABLE IF EXISTS `catalogo_ataudes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catalogo_ataudes`
--

LOCK TABLES `catalogo_ataudes` WRITE;
/*!40000 ALTER TABLE `catalogo_ataudes` DISABLE KEYS */;
INSERT INTO `catalogo_ataudes` VALUES (1,0,'RENGLON PARA SERV. SIN CTRL STOCK',NULL,0.00,0,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(2,1,'ATAUDES DE 0.60 MTS SIN CHAPA',NULL,0.60,0,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(3,2,'ATAUDES DE 0.60 MTS CON CHAPA',NULL,0.60,1,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(4,3,'ATAUDES DE 1.90 MTS SIN CHAPA',NULL,1.90,0,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(5,4,'ATAUDES DE 1.90 MTS CON CHAPA',NULL,1.90,1,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(6,5,'ATAUDES ESPECIALES',NULL,1.90,0,1,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(7,6,'ATAUDES DE 0.90 MTS SIN CHAPA',NULL,0.90,0,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(8,7,'ATAUDES DE 1.20 MTS SIN CHAPA',NULL,1.20,0,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(9,8,'ATAUDES ESPECIALES: EXTRAORDINARIO CHAPA',NULL,1.90,1,1,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(10,9,'ATAUDES BOVEDA LUSTRADO DE 1.90 MTS C/CHAPA',NULL,1.90,1,0,1,0,0,5,1,NULL,'2026-06-17 12:02:25'),(11,10,'ATAUDES DE 2.10 SIN CHAPA',NULL,2.10,0,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(12,11,'ATAUDES DE 2.10 CON CHAPA',NULL,2.10,1,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(13,12,'ATAUDES DE 1.20 CON CHAPA',NULL,1.20,1,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(14,13,'ATAUDES DE 0.90 MTS CON CHAPA',NULL,0.90,1,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(15,14,'ATAUDES DE 1.50 MTS CON CHAPA',NULL,1.50,1,0,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(16,15,'CAJA METALICA PLANA 0.60 MTS',NULL,0.60,0,0,0,1,0,5,1,NULL,'2026-06-17 12:02:25'),(17,16,'ATAUDES ESPECIALES: EXTRAORDINARIO SIN CHAPA',NULL,1.90,0,1,0,0,0,5,1,NULL,'2026-06-17 12:02:25'),(18,17,'ATAUDES BORLA VACA DE 2.10 MTS CON CAJA METALICA',NULL,2.10,0,1,0,1,0,5,1,NULL,'2026-06-17 12:02:25');
/*!40000 ALTER TABLE `catalogo_ataudes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion`
--

DROP TABLE IF EXISTS `configuracion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion`
--

LOCK TABLES `configuracion` WRITE;
/*!40000 ALTER TABLE `configuracion` DISABLE KEYS */;
INSERT INTO `configuracion` VALUES (1,'ultimo_nro_pedido','19393','Último número de pedido utilizado en el sistema viejo',NULL,'2026-06-17 12:02:35'),(2,'stock_alerta_minimo','5','Stock mínimo para mostrar alerta en dashboard',NULL,'2026-06-17 12:02:35'),(3,'email_contacto','Serviciosfunebressgo@gmail.com','Email de contacto del ministerio',NULL,'2026-06-17 12:02:35'),(4,'whatsapp_numero','3854892389','Número de WhatsApp del ministerio para comunicación',NULL,'2026-06-17 12:02:35');
/*!40000 ALTER TABLE `configuracion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `dashboard_solicitudes_mensual`
--

DROP TABLE IF EXISTS `dashboard_solicitudes_mensual`;
/*!50001 DROP VIEW IF EXISTS `dashboard_solicitudes_mensual`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `dashboard_solicitudes_mensual` AS SELECT 
 1 AS `año`,
 1 AS `mes`,
 1 AS `nombre_mes`,
 1 AS `total`,
 1 AS `pendientes`,
 1 AS `en_revision`,
 1 AS `asignados`,
 1 AS `en_ejecucion`,
 1 AS `completados`,
 1 AS `anulados`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `dashboard_stock`
--

DROP TABLE IF EXISTS `dashboard_stock`;
/*!50001 DROP VIEW IF EXISTS `dashboard_stock`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `dashboard_stock` AS SELECT 
 1 AS `id_ataud`,
 1 AS `codigo_renglon`,
 1 AS `nombre`,
 1 AS `stock_actual`,
 1 AS `stock_minimo`,
 1 AS `estado_stock`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `departamentos`
--

DROP TABLE IF EXISTS `departamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departamentos` (
  `id_departamento` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_departamento`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departamentos`
--

LOCK TABLES `departamentos` WRITE;
/*!40000 ALTER TABLE `departamentos` DISABLE KEYS */;
INSERT INTO `departamentos` VALUES (1,'Aguirre',1),(2,'Alberdi',1),(3,'Atamisqui',1),(4,'Avellaneda',1),(5,'Banda',1),(6,'Belgrano',1),(7,'Capital',1),(8,'Choya',1),(9,'Copo',1),(10,'Figueroa',1),(11,'General Taboada',1),(12,'Guasayán',1),(13,'Jiménez',1),(14,'Juan F. Ibarra',1),(15,'Loreto',1),(16,'Mitre',1),(17,'Moreno',1),(18,'Ojo de Agua',1),(19,'Pellegrini',1),(20,'Quebrachos',1),(21,'Río Hondo',1),(22,'Rivadavia',1),(23,'Robles',1),(24,'Salavina',1),(25,'San Martín',1),(26,'Sarmiento',1),(27,'Silípica',1);
/*!40000 ALTER TABLE `departamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empleados`
--

DROP TABLE IF EXISTS `empleados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empleados` (
  `id_empleado` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contraseña_hash` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empleados`
--

LOCK TABLES `empleados` WRITE;
/*!40000 ALTER TABLE `empleados` DISABLE KEYS */;
INSERT INTO `empleados` VALUES (1,'Admin','Sistema','superadmin','admin@sistemafunebre.com','3850000000','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',1,1,1,NULL,'2026-06-17 12:37:32',NULL,NULL);
/*!40000 ALTER TABLE `empleados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fallecidos`
--

DROP TABLE IF EXISTS `fallecidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `fallecidos_chk_1` CHECK ((`tipo_doc` in (_utf8mb4'DNI',_utf8mb4'RNF',_utf8mb4'S/D',_utf8mb4'PASAPORTE',_utf8mb4'OTRO'))),
  CONSTRAINT `fallecidos_chk_2` CHECK ((`origen` in (_utf8mb4'WEB',_utf8mb4'INTERNA')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fallecidos`
--

LOCK TABLES `fallecidos` WRITE;
/*!40000 ALTER TABLE `fallecidos` DISABLE KEYS */;
INSERT INTO `fallecidos` VALUES (1,'DNI','7793979','GARCIA','GUILLERMO ALBERTO','2025-10-23',NULL,NULL,'AUTONOMIA','LUIS FRIAS 8',0,NULL,NULL,NULL,'INTERNA',NULL,NULL,1,'2026-06-17 12:37:34');
/*!40000 ALTER TABLE `fallecidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localidades`
--

DROP TABLE IF EXISTS `localidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localidades`
--

LOCK TABLES `localidades` WRITE;
/*!40000 ALTER TABLE `localidades` DISABLE KEYS */;
/*!40000 ALTER TABLE `localidades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mantenimientos`
--

DROP TABLE IF EXISTS `mantenimientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mantenimientos`
--

LOCK TABLES `mantenimientos` WRITE;
/*!40000 ALTER TABLE `mantenimientos` DISABLE KEYS */;
/*!40000 ALTER TABLE `mantenimientos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimientos_stock`
--

DROP TABLE IF EXISTS `movimientos_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos_stock`
--

LOCK TABLES `movimientos_stock` WRITE;
/*!40000 ALTER TABLE `movimientos_stock` DISABLE KEYS */;
/*!40000 ALTER TABLE `movimientos_stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proveedores`
--

DROP TABLE IF EXISTS `proveedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proveedores`
--

LOCK TABLES `proveedores` WRITE;
/*!40000 ALTER TABLE `proveedores` DISABLE KEYS */;
/*!40000 ALTER TABLE `proveedores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `responsables`
--

DROP TABLE IF EXISTS `responsables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `responsables_chk_1` CHECK ((`tipo_doc` in (_utf8mb4'DNI',_utf8mb4'RNF',_utf8mb4'S/D',_utf8mb4'PASAPORTE',_utf8mb4'OTRO')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `responsables`
--

LOCK TABLES `responsables` WRITE;
/*!40000 ALTER TABLE `responsables` DISABLE KEYS */;
INSERT INTO `responsables` VALUES (1,'DNI','12345678','ROJAS','NATALIA LILIANA','3851234567',NULL,NULL,1,NULL,NULL,NULL,'LUIS FRIAS 8 Bº AUTONOMIA',NULL,NULL,'2026-06-17 12:37:33');
/*!40000 ALTER TABLE `responsables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id_rol` int NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `creado_por` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `nombre_rol` (`nombre_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'SUPERADMIN','Acceso total al sistema',NULL,'2026-06-17 12:37:31'),(2,'ADMIN','Gestiona empleados, reportes, asignaciones',NULL,'2026-06-17 12:37:31'),(3,'EMPLEADO','Carga solicitudes y asigna servicios',NULL,'2026-06-17 12:37:31');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes`
--

DROP TABLE IF EXISTS `solicitudes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes` (
  `id_solicitud` int NOT NULL AUTO_INCREMENT,
  `nro_pedido` int NOT NULL,
  `fecha_solicitud` date NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `id_responsable` int NOT NULL,
  `id_fallecido` int NOT NULL,
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
  KEY `id_ataud_asignado` (`id_ataud_asignado`),
  KEY `id_vehiculo_asignado` (`id_vehiculo_asignado`),
  KEY `id_chofer_asignado` (`id_chofer_asignado`),
  KEY `creado_por` (`creado_por`),
  KEY `modificado_por` (`modificado_por`),
  KEY `idx_solicitudes_fecha_estado` (`fecha_solicitud`,`estado`),
  CONSTRAINT `solicitudes_ibfk_1` FOREIGN KEY (`id_responsable`) REFERENCES `responsables` (`id_responsable`),
  CONSTRAINT `solicitudes_ibfk_2` FOREIGN KEY (`id_fallecido`) REFERENCES `fallecidos` (`id_fallecido`),
  CONSTRAINT `solicitudes_ibfk_3` FOREIGN KEY (`procesado_por`) REFERENCES `empleados` (`id_empleado`),
  CONSTRAINT `solicitudes_ibfk_4` FOREIGN KEY (`id_ataud_asignado`) REFERENCES `catalogo_ataudes` (`id_ataud`),
  CONSTRAINT `solicitudes_ibfk_5` FOREIGN KEY (`id_vehiculo_asignado`) REFERENCES `vehiculos` (`id_vehiculo`),
  CONSTRAINT `solicitudes_ibfk_6` FOREIGN KEY (`id_chofer_asignado`) REFERENCES `empleados` (`id_empleado`),
  CONSTRAINT `solicitudes_ibfk_7` FOREIGN KEY (`creado_por`) REFERENCES `empleados` (`id_empleado`),
  CONSTRAINT `solicitudes_ibfk_8` FOREIGN KEY (`modificado_por`) REFERENCES `empleados` (`id_empleado`),
  CONSTRAINT `solicitudes_chk_1` CHECK ((`origen` in (_utf8mb4'WEB',_utf8mb4'INTERNA'))),
  CONSTRAINT `solicitudes_chk_2` CHECK ((`tipo_servicio` in (_utf8mb4'ATAUD',_utf8mb4'TRASLADO',_utf8mb4'ATAUD_Y_TRASLADO',_utf8mb4'CREMACION',_utf8mb4'REPATRIACION',_utf8mb4'SERVICIO_CALLE')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes`
--

LOCK TABLES `solicitudes` WRITE;
/*!40000 ALTER TABLE `solicitudes` DISABLE KEYS */;
INSERT INTO `solicitudes` VALUES (1,19394,'2025-10-23','2026-06-17 12:37:34',1,1,'INTERNA',NULL,'ATAUD','UN ATAUD CON CHAPA ESPECIAL EXT PERSONAS',0,NULL,NULL,NULL,NULL,NULL,NULL,'ASIGNADO',0,0,0,NULL,NULL,1,'2026-06-17 12:37:34',NULL,NULL);
/*!40000 ALTER TABLE `solicitudes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehiculo_estado_historial`
--

DROP TABLE IF EXISTS `vehiculo_estado_historial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehiculo_estado_historial`
--

LOCK TABLES `vehiculo_estado_historial` WRITE;
/*!40000 ALTER TABLE `vehiculo_estado_historial` DISABLE KEYS */;
/*!40000 ALTER TABLE `vehiculo_estado_historial` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehiculos`
--

DROP TABLE IF EXISTS `vehiculos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehiculos`
--

LOCK TABLES `vehiculos` WRITE;
/*!40000 ALTER TABLE `vehiculos` DISABLE KEYS */;
INSERT INTO `vehiculos` VALUES (1,'AB123CD','001','Ford','Ranger',2020,'CAMIONETA',1,2,'DISPONIBLE',NULL,NULL,NULL,1,1,'2026-06-17 12:37:33');
/*!40000 ALTER TABLE `vehiculos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `dashboard_solicitudes_mensual`
--

/*!50001 DROP VIEW IF EXISTS `dashboard_solicitudes_mensual`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `dashboard_solicitudes_mensual` AS select year(`solicitudes`.`fecha_solicitud`) AS `año`,month(`solicitudes`.`fecha_solicitud`) AS `mes`,monthname(`solicitudes`.`fecha_solicitud`) AS `nombre_mes`,count(0) AS `total`,sum((case when (`solicitudes`.`estado` = 'PENDIENTE') then 1 else 0 end)) AS `pendientes`,sum((case when (`solicitudes`.`estado` = 'EN_REVISION') then 1 else 0 end)) AS `en_revision`,sum((case when (`solicitudes`.`estado` = 'ASIGNADO') then 1 else 0 end)) AS `asignados`,sum((case when (`solicitudes`.`estado` = 'EN_EJECUCION') then 1 else 0 end)) AS `en_ejecucion`,sum((case when (`solicitudes`.`estado` = 'COMPLETADO') then 1 else 0 end)) AS `completados`,sum((case when (`solicitudes`.`estado` = 'ANULADO') then 1 else 0 end)) AS `anulados` from `solicitudes` group by year(`solicitudes`.`fecha_solicitud`),month(`solicitudes`.`fecha_solicitud`),monthname(`solicitudes`.`fecha_solicitud`) order by `año` desc,`mes` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `dashboard_stock`
--

/*!50001 DROP VIEW IF EXISTS `dashboard_stock`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `dashboard_stock` AS select `catalogo_ataudes`.`id_ataud` AS `id_ataud`,`catalogo_ataudes`.`codigo_renglon` AS `codigo_renglon`,`catalogo_ataudes`.`nombre` AS `nombre`,`catalogo_ataudes`.`stock_actual` AS `stock_actual`,`catalogo_ataudes`.`stock_minimo` AS `stock_minimo`,(case when (`catalogo_ataudes`.`stock_actual` <= 0) then 'SIN_STOCK' when (`catalogo_ataudes`.`stock_actual` < `catalogo_ataudes`.`stock_minimo`) then 'BAJO_STOCK' else 'NORMAL' end) AS `estado_stock` from `catalogo_ataudes` where (`catalogo_ataudes`.`activo` = true) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-19 17:52:12
