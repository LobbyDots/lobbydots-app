import { z } from "zod";
import { tierSchema } from "../enums";
import { e164Schema, uuidSchema } from "./common";

/** El cliente normaliza a E.164 antes de enviar; el servidor hashea. */
export const importContactItemSchema = z.object({
  e164: e164Schema,
  displayName: z.string().max(120).optional(),
});
export const importContactsSchema = z.object({
  contacts: z.array(importContactItemSchema).min(1).max(5000),
});
export type ImportContactsInput = z.infer<typeof importContactsSchema>;

export const importContactsResponseSchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});
export type ImportContactsResponse = z.infer<
  typeof importContactsResponseSchema
>;

/** Contacto propio (para el paso de tiers). Nunca expone phone_hash. */
export const ownContactSchema = z.object({
  id: uuidSchema,
  displayName: z.string().nullable(),
  tier: tierSchema.nullable(),
  tags: z.array(z.string()),
});
export type OwnContact = z.infer<typeof ownContactSchema>;

export const tierAssignmentSchema = z.object({
  contactId: uuidSchema,
  tier: tierSchema,
});
export const setTiersSchema = z.object({
  assignments: z.array(tierAssignmentSchema).min(1).max(200),
});
export type SetTiersInput = z.infer<typeof setTiersSchema>;

export const setTiersResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
});
export type SetTiersResponse = z.infer<typeof setTiersResponseSchema>;
