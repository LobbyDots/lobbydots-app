import { defineConfig, env } from "prisma/config";

// Carga .env (Node 21+) para que env() resuelva en local. En producción las
// variables ya están en el entorno y no hay fichero .env → ignorar el error.
try {
  process.loadEnvFile();
} catch {
  /* sin .env: el entorno ya trae las variables */
}

// Prisma 7: las URLs de conexión para Migrate / introspección (`prisma db pull`)
// viven aquí, ya no en schema.prisma. El runtime conecta con un driver adapter
// (@prisma/adapter-pg) en PrismaService, no desde este fichero.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Conexión DIRECTA (puerto 5432) para introspección/migrate.
    url: env("DIRECT_URL"),
  },
});
