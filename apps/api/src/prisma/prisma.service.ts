import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma 7 (Query Compiler, sin engine binario) conecta vía driver adapter.
// La conexión es perezosa (en la primera query), así que la app arranca aunque
// la DB no esté disponible todavía; los endpoints que la usan fallarán al usarla.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL no está definida");
    }
    // Supabase (pooler) exige SSL; su cadena de certificado no siempre valida
    // contra la CA por defecto de Node → no forzamos verificación estricta.
    const ssl = /supabase\.com/.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined;
    super({ adapter: new PrismaPg({ connectionString, ssl }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
