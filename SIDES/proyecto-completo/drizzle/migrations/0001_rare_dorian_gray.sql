CREATE TABLE `ampliaciones` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`adulto_mayor_id` int,
	`expediente` varchar(50),
	`trabajador_social` varchar(100),
	`fecha` date,
	`ocupacion` varchar(100),
	`oficio` varchar(100),
	`benef_programa_social` boolean DEFAULT false,
	`cual_programa` varchar(100),
	`asist_previsional` varchar(50),
	`dia_cobro` varchar(50),
	`medio_cobro` varchar(100),
	`posee_tarjetas` boolean DEFAULT false,
	`extension_a_nombre_de` varchar(100),
	`prestamos` varchar(200),
	`sugerencia` text,
	CONSTRAINT `ampliaciones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ampliaciones` ADD CONSTRAINT `ampliaciones_adulto_mayor_id_adultosMayores_id_fk` FOREIGN KEY (`adulto_mayor_id`) REFERENCES `adultosMayores`(`id`) ON DELETE no action ON UPDATE no action;