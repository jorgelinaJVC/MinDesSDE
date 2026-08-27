ALTER TABLE `adultosMayores` MODIFY COLUMN `fechaFicha` date;--> statement-breakpoint
ALTER TABLE `adultosMayores` MODIFY COLUMN `fechaNacimiento` date NOT NULL;--> statement-breakpoint
ALTER TABLE `adultosMayores` MODIFY COLUMN `ultimaConsulta` date;--> statement-breakpoint
ALTER TABLE `geriatricos` MODIFY COLUMN `fechaHabilitacion` date;--> statement-breakpoint
ALTER TABLE `geriatricos` MODIFY COLUMN `fechaVencimientoHabilitacion` date;--> statement-breakpoint
ALTER TABLE `adultosMayores` ADD `apoderadoFechaNacimiento` date;--> statement-breakpoint
ALTER TABLE `adultosMayores` ADD `geriatricoId` int;--> statement-breakpoint
ALTER TABLE `adultosMayores` ADD `fechaIngreso` date;