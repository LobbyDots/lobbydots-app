import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

/**
 * Normaliza un número crudo a E.164 (p.ej. "+34600111222").
 * Devuelve null si no es parseable o no es válido — NUNCA adivina.
 * Es la clave de unión de todo el sistema; debe comportarse igual en
 * cliente (React Native) y servidor (NestJS).
 */
export function normalizeToE164(
  raw: string | null | undefined,
  defaultRegion?: CountryCode,
): string | null {
  if (!raw) return null;
  try {
    const parsed = parsePhoneNumberFromString(raw, defaultRegion);
    if (!parsed || !parsed.isValid()) return null;
    return parsed.number;
  } catch {
    return null;
  }
}

export function isValidPhone(
  raw: string | null | undefined,
  defaultRegion?: CountryCode,
): boolean {
  return normalizeToE164(raw, defaultRegion) !== null;
}

/** Región ISO (p.ej. "ES") a partir de un E.164; útil como defaultRegion al importar. */
export function regionFromE164(e164: string): CountryCode | undefined {
  try {
    return parsePhoneNumberFromString(e164)?.country;
  } catch {
    return undefined;
  }
}

export type { CountryCode };
