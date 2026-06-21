ALTER TABLE `geriatricos` ADD `nombreSolicitante` varchar(255);--> statement-breakpoint
ALTER TABLE `geriatricos` ADD `dniSolicitante` varchar(50);--> statement-breakpoint
ALTER TABLE `geriatricos` ADD `nombreApoderado` varchar(255);--> statement-breakpoint
ALTER TABLE `geriatricos` ADD `dniApoderado` varchar(50);--> statement-breakpoint
ALTER TABLE `geriatricos` ADD `reqNota` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `geriatricos` ADD `reqProyecto` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `geriatricos` ADD `reqDniSolicitante` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `geriatricos` ADD `reqDniApoderado` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `geriatricos` ADD `reqPlanos` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `geriatricos` ADD `reqEvacuacion` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `geriatricos` ADD `reqSeguro` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `geriatricos` ADD `reqComidaAfip` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `geriatricos` ADD `reqFotos` boolean DEFAULT false;