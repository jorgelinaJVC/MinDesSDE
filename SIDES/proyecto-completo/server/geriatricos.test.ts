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

describe("geriatricos procedures", () => {
  it("should list geriatricos", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.geriatricos.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should create geriatrico with valid data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const newGeriatrico = {
      nombre: "Geriátrico Test",
      direccion: "Calle Falsa 123",
      telefono: "385-1234567",
      email: "test@geriatrico.com",
      responsable: "Juan Pérez",
      capacidad: 50,
      estadoHabilitacion: "vigente" as const,
      fechaHabilitacion: new Date(),
      fechaVencimientoHabilitacion: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      observaciones: "Test",
    };

    const result = await caller.geriatricos.create(newGeriatrico);

    expect(result).toBeDefined();
    expect(result.nombre).toBe(newGeriatrico.nombre);
    expect(result.capacidad).toBe(newGeriatrico.capacidad);
    expect(result.estadoHabilitacion).toBe("vigente");
  });
});
