import { Injectable, Logger } from "@nestjs/common";
import {
  createRemoteJWKSet,
  type JWTPayload,
  type JWTVerifyGetKey,
  jwtVerify,
} from "jose";

export interface SupabaseClaims extends JWTPayload {
  sub: string;
  /** Teléfono verificado (dígitos, sin '+'), si el login fue por teléfono. */
  phone?: string;
  email?: string;
  role?: string;
}

/**
 * Verifica el JWT de Supabase. Soporta claves asimétricas (JWKS, recomendado en
 * proyectos nuevos) y, como fallback, el secreto HS256 legacy.
 */
@Injectable()
export class SupabaseJwtVerifier {
  private readonly logger = new Logger(SupabaseJwtVerifier.name);
  private readonly jwks?: JWTVerifyGetKey;
  private readonly secret?: Uint8Array;
  private readonly issuer?: string;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    this.issuer = url ? `${url}/auth/v1` : undefined;
    if (url) {
      this.jwks = createRemoteJWKSet(
        new URL(`${url}/auth/v1/.well-known/jwks.json`),
      );
    }
    if (jwtSecret) {
      this.secret = new TextEncoder().encode(jwtSecret);
    }
    if (!this.jwks && !this.secret) {
      this.logger.warn(
        "Sin SUPABASE_URL ni SUPABASE_JWT_SECRET: no se podrán verificar JWT.",
      );
    }
  }

  async verify(token: string): Promise<SupabaseClaims> {
    const options = {
      audience: "authenticated",
      ...(this.issuer ? { issuer: this.issuer } : {}),
    };

    if (this.jwks) {
      try {
        const { payload } = await jwtVerify(token, this.jwks, options);
        return payload as SupabaseClaims;
      } catch (err) {
        if (!this.secret) throw err;
      }
    }
    if (this.secret) {
      const { payload } = await jwtVerify(token, this.secret, options);
      return payload as SupabaseClaims;
    }
    throw new Error("Verificación de JWT no configurada");
  }
}
