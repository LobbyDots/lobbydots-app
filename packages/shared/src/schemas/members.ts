import { z } from "zod";
import { memberStatusSchema } from "../enums";
import { e164Schema, isoDateSchema, uuidSchema } from "./common";

/** El propio miembro (lo que /me devuelve a su dueño). Nunca incluye phone_hash. */
export const memberSchema = z.object({
  id: uuidSchema,
  phoneE164: e164Schema,
  displayName: z.string(),
  bio: z.string().nullable(),
  status: memberStatusSchema,
  invitesRemaining: z.number().int().nonnegative(),
  createdAt: isoDateSchema,
});
export type Member = z.infer<typeof memberSchema>;

export const updateMeSchema = z.object({
  displayName: z.string().min(1).max(80),
  bio: z.string().max(280).optional(),
});
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
