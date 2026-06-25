import { createHmac } from "node:crypto";
import { Injectable } from "@nestjs/common";

/**
 * HMAC-SHA256(E.164, pepper). El pepper es un secreto de servidor (env), nunca
 * viaja al cliente. Mismo número → mismo hash en todos los miembros (clave de
 * unión del grafo). Limitación conocida: el espacio de números es pequeño y el
 * hash es brute-forceable; aceptable solo para una beta cerrada (ver spec §9).
 */
@Injectable()
export class HashingService {
  private readonly pepper: string;
  /** Versión del pepper, para futura rotación dual-pepper. */
  readonly pepperVersion = 1;

  constructor() {
    const pepper = process.env.HASH_PEPPER;
    if (!pepper) {
      throw new Error("HASH_PEPPER no está definida");
    }
    this.pepper = pepper;
  }

  hash(e164: string): string {
    return createHmac("sha256", this.pepper).update(e164).digest("hex");
  }
}
