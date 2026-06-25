import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { SupabaseAuthGuard } from "./supabase-auth.guard";
import { SupabaseJwtVerifier } from "./supabase-jwt.verifier";

@Module({
  providers: [
    SupabaseJwtVerifier,
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
  ],
  exports: [SupabaseJwtVerifier],
})
export class AuthModule {}
