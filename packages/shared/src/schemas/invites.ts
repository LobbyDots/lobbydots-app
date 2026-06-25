import { z } from "zod";
import { isoDateSchema } from "./common";
import { memberSchema } from "./members";

export const createInviteResponseSchema = z.object({
  inviteUrl: z.string().url(),
  expiresAt: isoDateSchema,
});
export type CreateInviteResponse = z.infer<typeof createInviteResponseSchema>;

/** Público (sin auth de miembro): alimenta "Marcos responde por ti". */
export const voucherInfoSchema = z.object({
  valid: z.boolean(),
  voucherName: z.string().nullable(),
});
export type VoucherInfo = z.infer<typeof voucherInfoSchema>;

/** Consumir invitación = crear Member (mini-perfil) + Vouch. */
export const consumeInviteSchema = z.object({
  displayName: z.string().min(1).max(80),
  bio: z.string().max(280).optional(),
});
export type ConsumeInviteInput = z.infer<typeof consumeInviteSchema>;

export const consumeInviteResponseSchema = z.object({
  member: memberSchema,
});
export type ConsumeInviteResponse = z.infer<typeof consumeInviteResponseSchema>;
