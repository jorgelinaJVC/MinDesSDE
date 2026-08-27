CREATE TABLE `adultosMayores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroLegajo` varchar(50) NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`apellido` varchar(255) NOT NULL,
	`dni` varchar(20) NOT NULL,
	`fechaNacimiento` timestamp NOT NULL,
	`sexo` enum('masculino','femenino','otro') NOT NULL,
	`direccion` text,
	`telefono` varchar(50),
	`contactoEmergencia` varchar(255),
	`telefonoEmergencia` varchar(50),
	`obraSocial` varchar(255),
	`numeroAfiliado` varchar(100),
	`diagnosticoMedico` text,
	`medicacionActual` text,
	`alergias` text,
	`situacionSocial` text,
	`geriatricoId` int,
	`fechaIngreso` timestamp,
	`estadoGeneral` enum('estable','requiere_atencion','critico') NOT NULL DEFAULT 'estable',
	`activo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adultosMayores_id` PRIMARY KEY(`id`),
	CONSTRAINT `adultosMayores_numeroLegajo_unique` UNIQUE(`numeroLegajo`),
	CONSTRAINT `adultosMayores_dni_unique` UNIQUE(`dni`)
);
--> statement-breakpoint
CREATE TABLE `alertas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adultoMayorId` int NOT NULL,
	`tipoAlerta` enum('falta_medicacion','maltrato','habilitacion_vencida','salud_critica','abandono','otro') NOT NULL,
	`prioridad` enum('baja','media','alta','critica') NOT NULL DEFAULT 'media',
	`titulo` varchar(255) NOT NULL,
	`descripcion` text NOT NULL,
	`estado` enum('pendiente','en_atencion','resuelta') NOT NULL DEFAULT 'pendiente',
	`fechaDeteccion` timestamp NOT NULL DEFAULT (now()),
	`fechaResolucion` timestamp,
	`responsableAtencion` varchar(255),
	`observacionesResolucion` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alertas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `derivaciones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adultoMayorId` int NOT NULL,
	`fechaDerivacion` timestamp NOT NULL DEFAULT (now()),
	`motivo` text NOT NULL,
	`juzgado` varchar(255) NOT NULL,
	`numeroExpediente` varchar(100),
	`fiscalia` varchar(255),
	`estadoDerivacion` enum('iniciada','en_tramite','finalizada','archivada') NOT NULL DEFAULT 'iniciada',
	`documentacionAdjunta` text,
	`observaciones` text,
	`responsable` varchar(255) NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `derivaciones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geriatricos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`direccion` text NOT NULL,
	`telefono` varchar(50),
	`email` varchar(320),
	`responsable` varchar(255),
	`capacidad` int NOT NULL,
	`ocupacionActual` int NOT NULL DEFAULT 0,
	`estadoHabilitacion` enum('vigente','vencida','en_tramite','suspendida') NOT NULL DEFAULT 'vigente',
	`fechaHabilitacion` timestamp,
	`fechaVencimientoHabilitacion` timestamp,
	`observaciones` text,
	`activo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `geriatricos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seguimientos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adultoMayorId` int NOT NULL,
	`tipoSeguimiento` enum('visita','reporte_vulnerabilidad','control_medico','entrevista_social','otro') NOT NULL,
	`fecha` timestamp NOT NULL DEFAULT (now()),
	`descripcion` text NOT NULL,
	`observaciones` text,
	`responsable` varchar(255) NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seguimientos_id` PRIMARY KEY(`id`)
);
