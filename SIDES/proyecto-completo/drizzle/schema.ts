import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, serial, date } from "drizzle-orm/mysql-core";


/**
 * tablas
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }), // 🔐 AGREGÁ SOLO ESTA LÍNEA
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "superadmin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Residencias de larga estadia
 */
export const geriatricos = mysqlTable("geriatricos", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  direccion: text("direccion").notNull(),
  telefono: varchar("telefono", { length: 50 }),
  email: varchar("email", { length: 320 }),
  responsable: varchar("responsable", { length: 255 }),
  nombreSolicitante: varchar("nombreSolicitante", { length: 255 }),
  dniSolicitante: varchar("dniSolicitante", { length: 50 }),
  nombreApoderado: varchar("nombreApoderado", { length: 255 }),
  dniApoderado: varchar("dniApoderado", { length: 50 }),
  capacidad: int("capacidad").notNull(),
  ocupacionActual: int("ocupacionActual").default(0).notNull(),
  estadoHabilitacion: mysqlEnum("estadoHabilitacion", ["vigente", "vencida", "en_tramite", "suspendida"]).default("vigente").notNull(),
  
   fechaHabilitacion: date("fechaHabilitacion", { mode: "date" }),
  fechaVencimientoHabilitacion: date("fechaVencimientoHabilitacion", { mode: "date" }),
  
  observaciones: text("observaciones"),
  reqNota: boolean("reqNota").default(false),
  reqProyecto: boolean("reqProyecto").default(false),
  reqDniSolicitante: boolean("reqDniSolicitante").default(false),
  reqDniApoderado: boolean("reqDniApoderado").default(false),
  reqPlanos: boolean("reqPlanos").default(false),
  reqEvacuacion: boolean("reqEvacuacion").default(false),
  reqSeguro: boolean("reqSeguro").default(false),
  reqComidaAfip: boolean("reqComidaAfip").default(false),
  reqFotos: boolean("reqFotos").default(false),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Geriatrico = typeof geriatricos.$inferSelect;
export type InsertGeriatrico = typeof geriatricos.$inferInsert;

/**
 * Adultos Mayores 
 */
export const adultosMayores = mysqlTable("adultosMayores", {
  id: int("id").autoincrement().primaryKey(),
  
  // --- Datos Solicitante (Pestaña 1) ---
  numeroLegajo: varchar("numeroLegajo", { length: 50 }).notNull().unique(),
  expediente: varchar("expediente", { length: 100 }),
  trabajadorSocial: varchar("trabajadorSocial", { length: 150 }),
  
 
  fechaFicha: date("fechaFicha", { mode: "date" }),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  apellido: varchar("apellido", { length: 255 }).notNull(),
  dni: varchar("dni", { length: 20 }).notNull().unique(),
  fechaNacimiento: date("fechaNacimiento", { mode: "date" }).notNull(),
  
  telefono: varchar("telefono", { length: 50 }),
  estadoCivil: varchar("estadoCivil", { length: 50 }),
  domicilio: text("domicilio"),
  barrio: varchar("barrio", { length: 100 }),
  localidad: varchar("localidad", { length: 100 }),
  
  // --- Socioeconómico (Pestaña 2) ---
  ocupacion: varchar("ocupacion", { length: 100 }),
  oficio: varchar("oficio", { length: 100 }),
  monto: varchar("monto", { length: 50 }),
  beneficioSocial: varchar("beneficioSocial", { length: 10 }),
  cualBeneficio: varchar("cualBeneficio", { length: 150 }),
  asistenciaPrevisional: varchar("asistenciaPrevisional", { length: 50 }),
  diaCobro: varchar("diaCobro", { length: 50 }),
  medioCobro: varchar("medioCobro", { length: 100 }),
  tarjetas: text("tarjetas"),
  prestamos: text("prestamos"),
  
  // --- Apoderado Legal ---
  apoderadoNombre: varchar("apoderadoNombre", { length: 150 }),
  apoderadoEdad: varchar("apoderadoEdad", { length: 10 }),
  apoderadoDni: varchar("apoderadoDni", { length: 20 }),
  apoderadoDomicilio: text("apoderadoDomicilio"),
  apoderadoBarrio: varchar("apoderadoBarrio", { length: 100 }),
  apoderadoVinculo: varchar("apoderadoVinculo", { length: 50 }),
  
  
  apoderadoFechaNacimiento: date("apoderadoFechaNacimiento", { mode: "date" }),
  
  // --- Red Familiar y Hijos (Pestaña 3 - JSON) ---
  redFamiliar: text("redFamiliar"),
  residenciaHijos: text("residenciaHijos"),
  
  // --- Vivienda (Pestaña 4) ---
  ubicacionVivienda: varchar("ubicacionVivienda", { length: 50 }),
  tenenciaVivienda: varchar("tenenciaVivienda", { length: 100 }),
  tipoVivienda: varchar("tipoVivienda", { length: 100 }),
  situacionHabitacionalPersonas: int("situacionHabitacionalPersonas"),
  situacionHabitacionalHabitaciones: int("situacionHabitacionalHabitaciones"),
  materialParedes: varchar("materialParedes", { length: 255 }),
  materialPisos: varchar("materialPisos", { length: 255 }),
  materialTechos: varchar("materialTechos", { length: 255 }),
  bano: varchar("bano", { length: 255 }),
  cocina: varchar("cocina", { length: 255 }),
  servicioLuz: boolean("servicioLuz").default(false),
  servicioAgua: boolean("servicioAgua").default(false),
  servicioGas: boolean("servicioGas").default(false),
  
  // --- Salud y Cierre (Pestaña 5) ---
  obraSocial: varchar("obraSocial", { length: 255 }),
  numeroAfiliado: varchar("numeroAfiliado", { length: 100 }),
  enfermedad: varchar("enfermedad", { length: 255 }),
  medicoCabecera: varchar("medicoCabecera", { length: 150 }),
  
  // 🚨 CORRECCIÓN: Pasado a date
  ultimaConsulta: date("ultimaConsulta", { mode: "date" }),
  sugerencia: text("sugerencia"),
  estadoGeneral: mysqlEnum("estadoGeneral", ["estable", "requiere_atencion", "critico"]).default("estable").notNull(),

  geriatricoId: int("geriatricoId"),
  fechaIngreso: date("fechaIngreso", { mode: "date" }),
  
  // --- Metadatos del Sistema (Siguen siendo timestamp porque son eventos del sistema actuales) ---
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdultoMayor = typeof adultosMayores.$inferSelect;
export type InsertAdultoMayor = typeof adultosMayores.$inferInsert;

/**
 * Seguimientos, Alertas y Derivaciones
 */
export const seguimientos = mysqlTable("seguimientos", {
  id: int("id").autoincrement().primaryKey(),
  adultoMayorId: int("adultoMayorId").notNull(),
  tipoSeguimiento: mysqlEnum("tipoSeguimiento", ["visita", "reporte_vulnerabilidad", "control_medico", "entrevista_social", "otro"]).notNull(),
  fecha: timestamp("fecha").defaultNow().notNull(),
  descripcion: text("descripcion").notNull(),
  observaciones: text("observaciones"),
  responsable: varchar("responsable", { length: 255 }).notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Seguimiento = typeof seguimientos.$inferSelect;
export type InsertSeguimiento = typeof seguimientos.$inferInsert;

export const alertas = mysqlTable("alertas", {
  id: int("id").autoincrement().primaryKey(),
  adultoMayorId: int("adultoMayorId").notNull(),
 tipoAlerta: mysqlEnum("tipoAlerta", ["falta_medicacion", "salud_critica", "abandono", "abuso_economico", "abuso_psicologico", "abuso_fisico", "otro"]).notNull(),
  prioridad: mysqlEnum("prioridad", ["baja", "media", "alta", "critica"]).default("media").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descripcion: text("descripcion").notNull(),
  estado: mysqlEnum("estado", ["pendiente", "en_atencion", "resuelta"]).default("pendiente").notNull(),
  fechaDeteccion: timestamp("fechaDeteccion").defaultNow().notNull(),
  fechaResolucion: timestamp("fechaResolucion"),
  responsableAtencion: varchar("responsableAtencion", { length: 255 }),
  observacionesResolucion: text("observacionesResolucion"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Alerta = typeof alertas.$inferSelect;
export type InsertAlerta = typeof alertas.$inferInsert;

export const derivaciones = mysqlTable("derivaciones", {
  id: int("id").autoincrement().primaryKey(),
  adultoMayorId: int("adultoMayorId").notNull(),
  fechaDerivacion: timestamp("fechaDerivacion").defaultNow().notNull(),
  motivo: text("motivo").notNull(),
  juzgado: varchar("juzgado", { length: 255 }).notNull(),
  numeroExpediente: varchar("numeroExpediente", { length: 100 }),
  fiscalia: varchar("fiscalia", { length: 255 }),
  estadoDerivacion: mysqlEnum("estadoDerivacion", ["iniciada", "en_tramite", "finalizada", "archivada"]).default("iniciada").notNull(),
  documentacionAdjunta: text("documentacionAdjunta"),
  observaciones: text("observaciones"),
  responsable: varchar("responsable", { length: 255 }).notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Derivacion = typeof derivaciones.$inferSelect;
export type InsertDerivacion = typeof derivaciones.$inferInsert;

export const ampliaciones = mysqlTable("ampliaciones", {
  id: serial("id").primaryKey(),
  adultoMayorId: int("adulto_mayor_id").references(() => adultosMayores.id),
  expediente: varchar("expediente", { length: 50 }),
  trabajadorSocial: varchar("trabajador_social", { length: 100 }),
  
  // CORRECCIÓN: Para que sincronice perfecto con el router
  fecha: date("fecha", { mode: "date" }),
  
  ocupacion: varchar("ocupacion", { length: 100 }),
  oficio: varchar("oficio", { length: 100 }),
  benefProgramaSocial: boolean("benef_programa_social").default(false),
  cualPrograma: varchar("cual_programa", { length: 100 }),
  asistPrevisional: varchar("asist_previsional", { length: 50 }),
  diaCobro: varchar("dia_cobro", { length: 50 }),
  medioCobro: varchar("medio_cobro", { length: 100 }),
  poseeTarjetas: boolean("posee_tarjetas").default(false),
  extensionANombreDe: varchar("extension_a_nombre_de", { length: 100 }),
  prestamos: varchar("prestamos", { length: 200 }),
  sugerencia: text("sugerencia"),
});