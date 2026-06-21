import { eq, desc, and, lt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  geriatricos, 
  InsertGeriatrico, 
  Geriatrico,
  adultosMayores,
  InsertAdultoMayor,
  AdultoMayor,
  seguimientos,
  InsertSeguimiento,
  Seguimiento,
  alertas,
  InsertAlerta,
  Alerta,
  derivaciones,
  InsertDerivacion,
  Derivacion,
  ampliaciones 
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS ============

// 👑 CORREGIDO: Se tipa con InsertUser en lugar de 'any' para robustez total
export async function createUser(data: Omit<InsertUser, "loginMethod" | "createdAt" | "updatedAt" | "lastSignedIn"> & { passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "local",
    role: data.role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  });
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(users);
}

// ✏️ CORREGIDO: data ya no usa 'any'
export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(users).set(data).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(users).where(eq(users.id, id));
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by email: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}


// ============ GERIATRICOS FUNCTIONS ============

export async function createGeriatrico(data: InsertGeriatrico): Promise<Geriatrico> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(geriatricos).values(data);
  const inserted = await db.select().from(geriatricos).where(eq(geriatricos.id, Number(result[0].insertId))).limit(1);
  return inserted[0]!;
}

export async function getAllGeriatricos(): Promise<Geriatrico[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(geriatricos).where(eq(geriatricos.activo, true)).orderBy(desc(geriatricos.createdAt));
}

export async function getGeriatricoById(id: number): Promise<Geriatrico | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(geriatricos).where(eq(geriatricos.id, id)).limit(1);
  return result[0];
}

export async function updateGeriatrico(id: number, data: Partial<InsertGeriatrico>): Promise<Geriatrico | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(geriatricos).set(data).where(eq(geriatricos.id, id));
  return await getGeriatricoById(id);
}

export async function deleteGeriatrico(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(geriatricos).set({ activo: false }).where(eq(geriatricos.id, id));
}

export async function checkHabilitacionVencida(id: number): Promise<boolean> {
  const geriatrico = await getGeriatricoById(id);
  if (!geriatrico || !geriatrico.fechaVencimientoHabilitacion) return true;
  
  return new Date() > new Date(geriatrico.fechaVencimientoHabilitacion);
}

// ============ ADULTOS MAYORES FUNCTIONS ============

export async function createAdultoMayor(data: InsertAdultoMayor): Promise<AdultoMayor> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.geriatricoId) {
    const isVencida = await checkHabilitacionVencida(data.geriatricoId);
    if (isVencida) {
      throw new Error("No se puede asignar al geriátrico: habilitación vencida");
    }
  }

  const result = await db.insert(adultosMayores).values(data);
  const inserted = await db.select().from(adultosMayores).where(eq(adultosMayores.id, Number(result[0].insertId))).limit(1);
  
  if (data.geriatricoId) {
    const geriatrico = await getGeriatricoById(data.geriatricoId);
    if (geriatrico) {
      await db.update(geriatricos).set({ 
        ocupacionActual: geriatrico.ocupacionActual + 1 
      }).where(eq(geriatricos.id, data.geriatricoId));
    }
  }
  
  return inserted[0]!;
}

export async function getAllAdultosMayores(): Promise<AdultoMayor[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(adultosMayores).where(eq(adultosMayores.activo, true)).orderBy(desc(adultosMayores.createdAt));
}

export async function getAdultoMayorById(id: number): Promise<AdultoMayor | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(adultosMayores).where(eq(adultosMayores.id, id)).limit(1);
  return result[0];
}

export async function updateAdultoMayor(id: number, data: Partial<InsertAdultoMayor>): Promise<AdultoMayor | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.geriatricoId) {
    const isVencida = await checkHabilitacionVencida(data.geriatricoId);
    if (isVencida) {
      throw new Error("No se puede asignar al geriátrico: habilitación vencida");
    }
    
    const adultoActual = await getAdultoMayorById(id);
    if (adultoActual && adultoActual.geriatricoId !== data.geriatricoId) {
      if (adultoActual.geriatricoId) {
        const geriatricoAnterior = await getGeriatricoById(adultoActual.geriatricoId);
        if (geriatricoAnterior) {
          await db.update(geriatricos).set({ 
            ocupacionActual: Math.max(0, geriatricoAnterior.ocupacionActual - 1)
          }).where(eq(geriatricos.id, adultoActual.geriatricoId));
        }
      }
      
      const geriatricoNuevo = await getGeriatricoById(data.geriatricoId);
      if (geriatricoNuevo) {
        await db.update(geriatricos).set({ 
          ocupacionActual: geriatricoNuevo.ocupacionActual + 1 
        }).where(eq(geriatricos.id, data.geriatricoId));
      }
    }
  }

  await db.update(adultosMayores).set(data).where(eq(adultosMayores.id, id));
  return await getAdultoMayorById(id);
}

export async function deleteAdultoMayor(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const adulto = await getAdultoMayorById(id);
  if (adulto && adulto.geriatricoId) {
    const geriatrico = await getGeriatricoById(adulto.geriatricoId);
    if (geriatrico) {
      await db.update(geriatricos).set({ 
        ocupacionActual: Math.max(0, geriatrico.ocupacionActual - 1)
      }).where(eq(geriatricos.id, adulto.geriatricoId));
    }
  }

  await db.update(adultosMayores).set({ activo: false }).where(eq(adultosMayores.id, id));
}

// ============ HISTORIAL DE AMPLIACIONES ============

export async function getAmpliacionesByAdultoMayor(adultoMayorId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(ampliaciones)
    .where(eq(ampliaciones.adultoMayorId, adultoMayorId))
    .orderBy(desc(ampliaciones.fecha));
}

export async function createAmpliacion(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(ampliaciones).values(data);
}

export async function updateAmpliacion(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(ampliaciones).set(data).where(eq(ampliaciones.id, id));
}

export async function deleteAmpliacion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(ampliaciones).where(eq(ampliaciones.id, id));
}

// ============ SEGUIMIENTOS FUNCTIONS ============

export async function createSeguimiento(data: InsertSeguimiento): Promise<Seguimiento> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(seguimientos).values(data);
  const inserted = await db.select().from(seguimientos).where(eq(seguimientos.id, Number(result[0].insertId))).limit(1);
  return inserted[0]!;
}

export async function getSeguimientosByAdultoMayor(adultoMayorId: number): Promise<Seguimiento[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(seguimientos)
    .where(eq(seguimientos.adultoMayorId, adultoMayorId))
    .orderBy(desc(seguimientos.fecha));
}

export async function getAllSeguimientos(): Promise<Seguimiento[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(seguimientos).orderBy(desc(seguimientos.fecha));
}

// ============ ALERTAS FUNCTIONS ============

export async function createAlerta(data: InsertAlerta): Promise<Alerta> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(alertas).values(data);
  const inserted = await db.select().from(alertas).where(eq(alertas.id, Number(result[0].insertId))).limit(1);
  return inserted[0]!;
}

export async function getAllAlertas(): Promise<Alerta[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(alertas).orderBy(desc(alertas.fechaDeteccion));
}

export async function getAlertasPendientes(): Promise<Alerta[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(alertas)
    .where(or(eq(alertas.estado, "pendiente"), eq(alertas.estado, "en_atencion")))
    .orderBy(desc(alertas.prioridad), desc(alertas.fechaDeteccion));
}

export async function getAlertasByAdultoMayor(adultoMayorId: number): Promise<Alerta[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(alertas)
    .where(eq(alertas.adultoMayorId, adultoMayorId))
    .orderBy(desc(alertas.fechaDeteccion));
}

export async function updateAlerta(id: number, data: Partial<InsertAlerta>): Promise<Alerta | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(alertas).set(data).where(eq(alertas.id, id));
  const result = await db.select().from(alertas).where(eq(alertas.id, id)).limit(1);
  return result[0];
}

export async function deleteAlerta(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(alertas).where(eq(alertas.id, id));
}

// ============ DERIVACIONES FUNCTIONS ============

export async function createDerivacion(data: InsertDerivacion): Promise<Derivacion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(derivaciones).values(data);
  const inserted = await db.select().from(derivaciones).where(eq(derivaciones.id, Number(result[0].insertId))).limit(1);
  return inserted[0]!;
}

export async function getAllDerivaciones(): Promise<Derivacion[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(derivaciones).orderBy(desc(derivaciones.fechaDerivacion));
}

export async function getDerivacionesByAdultoMayor(adultoMayorId: number): Promise<Derivacion[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(derivaciones)
    .where(eq(derivaciones.adultoMayorId, adultoMayorId))
    .orderBy(desc(derivaciones.fechaDerivacion));
}

export async function updateDerivacion(id: number, data: Partial<InsertDerivacion>): Promise<Derivacion | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(derivaciones).set(data).where(eq(derivaciones.id, id));
  const result = await db.select().from(derivaciones).where(eq(derivaciones.id, id)).limit(1);
  return result[0];
}

// ============ DASHBOARD STATS ============

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const totalAdultos = await db.select().from(adultosMayores).where(eq(adultosMayores.activo, true));
  const totalGeriatricos = await db.select().from(geriatricos).where(eq(geriatricos.activo, true));
  const alertasPendientes = await getAlertasPendientes();
  const alertasCriticas = alertasPendientes.filter(a => a.prioridad === "critica" || a.prioridad === "alta");

  return {
    totalAdultosMayores: totalAdultos.length,
    totalGeriatricos: totalGeriatricos.length,
    alertasPendientes: alertasPendientes.length,
    alertasCriticas: alertasCriticas.length,
  };
}