import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("adultosMayores procedures", () => {
  it("should list adultos mayores", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.adultosMayores.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should create adulto mayor with valid data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const newAdultoMayor = {
      numeroLegajo: `AM-${Date.now()}-001`,
      nombre: "María",
      apellido: "González",
      dni: `${Math.floor(Math.random() * 100000000)}`,
      fechaNacimiento: new Date("1980-01-15"),
      sexo: "femenino" as const,
      direccion: "Av. Principal 456",
      telefono: "385-7654321",
      contactoEmergencia: "Pedro González",
      telefonoEmergencia: "385-9876543",
      obraSocial: "PAMI",
      numeroAfiliado: "123456789",
      diagnosticoMedico: "Hipertensión arterial",
      medicacionActual: "Enalapril 10mg",
      alergias: "Ninguna conocida",
      situacionSocial: "Vive sola, tiene familia cercana",
      estadoGeneral: "estable" as const,
    };

    const result = await caller.adultosMayores.create(newAdultoMayor);

    expect(result).toBeDefined();
    expect(result.nombre).toBe(newAdultoMayor.nombre);
    expect(result.apellido).toBe(newAdultoMayor.apellido);
    expect(result.dni).toBe(newAdultoMayor.dni);
    expect(result.estadoGeneral).toBe("estable");
  });
});
