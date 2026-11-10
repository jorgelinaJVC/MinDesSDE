CREATE DATABASE IF NOT EXISTS mds_contenidos CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci;

USE mds_contenidos;

CREATE TABLE
    IF NOT EXISTS areas (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        area_padre_id INT UNSIGNED NULL,
        activo TINYINT (1) NOT NULL DEFAULT 1,
        fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_area_padre (area_padre_id),
        CONSTRAINT fk_area_padre FOREIGN KEY (area_padre_id) REFERENCES areas (id) ON UPDATE CASCADE ON DELETE SET NULL
    );

CREATE TABLE
    IF NOT EXISTS usuarios_admin (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        usuario VARCHAR(80) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        nombre VARCHAR(120) NOT NULL,
        rol ENUM ('superadmin', 'admin_area') NOT NULL DEFAULT 'admin_area',
        area_id INT UNSIGNED NULL,
        activo TINYINT (1) NOT NULL DEFAULT 1,
        ultimo_acceso DATETIME NULL,
        fecha_creacion DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_usuario_area (area_id),
        CONSTRAINT fk_usuario_admin_area FOREIGN KEY (area_id) REFERENCES areas (id) ON UPDATE CASCADE ON DELETE SET NULL
    );

CREATE TABLE
    IF NOT EXISTS contenidos (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT UNSIGNED NULL,
        area_id INT UNSIGNED NULL,
        tipo ENUM ('noticia', 'carrusel', 'galeria', 'video', 'area') NOT NULL,
        titulo VARCHAR(180) NOT NULL,
        categoria VARCHAR(120) NULL,
        resumen TEXT NULL,
        descripcion LONGTEXT NULL,
        imagen LONGTEXT NULL,
        url VARCHAR(500) NULL,
        estado VARCHAR(30) NULL DEFAULT 'Publicada',
        motivo_rechazo TEXT NULL,
        aprobado_por INT UNSIGNED NULL,
        fecha_aprobacion DATETIME NULL,
        orden INT NULL DEFAULT 1,
        activo TINYINT (1) NULL DEFAULT 1,
        fecha_creacion DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        eliminado TINYINT (1) NULL DEFAULT 0,
        INDEX idx_usuario_id (usuario_id),
        INDEX idx_area_id (area_id),
        INDEX idx_tipo (tipo),
        INDEX idx_aprobado_por (aprobado_por),
        INDEX idx_activo (activo),
        INDEX idx_eliminado (eliminado),
        CONSTRAINT fk_contenido_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios_admin (id) ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT fk_contenido_area FOREIGN KEY (area_id) REFERENCES areas (id) ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT fk_contenido_aprobado FOREIGN KEY (aprobado_por) REFERENCES usuarios_admin (id) ON UPDATE CASCADE ON DELETE SET NULL
    );

CREATE TABLE
    IF NOT EXISTS auditoria (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT UNSIGNED NULL,
        accion VARCHAR(80) NOT NULL,
        descripcion VARCHAR(255) NOT NULL,
        entidad VARCHAR(50) NULL,
        entidad_id INT UNSIGNED NULL,
        fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_auditoria_usuario (usuario_id),
        CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios_admin (id) ON UPDATE CASCADE ON DELETE SET NULL
    );

CREATE TABLE
    IF NOT EXISTS actividad (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        descripcion VARCHAR(255) NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    );