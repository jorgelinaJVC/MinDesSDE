import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Cargar variables de entorno desde el archivo .env
dotenv.config();

export default defineConfig({
  schema: "./drizzle/schema.ts", // Ruta a tu archivo schema.ts
  out: "./drizzle/migrations",   // Carpeta donde se guardarán las migraciones
  dialect: "mysql",              // Tu base de datos es MySQL
  dbCredentials: {
    url: process.env.DATABASE_URL || "", // URL de conexión a tu BD
  },
  verbose: true,
  strict: true,
});