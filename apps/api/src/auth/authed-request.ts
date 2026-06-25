import type { Member as PrismaMember } from "@prisma/client";
import type { Request } from "express";

export interface AuthedRequest extends Request {
  /** `sub` del JWT de Supabase (id del auth user). */
  authUserId?: string;
  /** Teléfono verificado en E.164 (con '+'), o null. */
  authPhoneE164?: string | null;
  /** Member resuelto (null si el teléfono verificado aún no es miembro). */
  member?: PrismaMember | null;
}
