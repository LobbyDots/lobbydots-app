import { z } from "zod";
import { introStatusSchema } from "../enums";
import { isoDateSchema, uuidSchema } from "./common";

/** Por teléfono: el requester propone un camino (elige broker). */
export const proposeIntroSchema = z.object({
  requestId: uuidSchema,
  brokerId: uuidSchema,
});
export type ProposeIntroInput = z.infer<typeof proposeIntroSchema>;

/** Por descripción: un miembro se ofrece como intermediario de una petición. */
export const volunteerSchema = z.object({
  requestId: uuidSchema,
});
export type VolunteerInput = z.infer<typeof volunteerSchema>;

export const introSchema = z.object({
  id: uuidSchema,
  requestId: uuidSchema,
  brokerId: uuidSchema,
  status: introStatusSchema,
  createdAt: isoDateSchema,
});
export type IntroDto = z.infer<typeof introSchema>;

export const channelSchema = z.object({
  type: z.enum(["whatsapp", "email"]),
  url: z.string().url(),
});
export type Channel = z.infer<typeof channelSchema>;

export const introRoleSchema = z.enum(["requester", "broker"]);
export type IntroRole = z.infer<typeof introRoleSchema>;

/**
 * Detalle role-aware de una intro. El que decide (gatekeeper) depende del tipo:
 *  - Por teléfono → decide el BROKER (protege al intermediario).
 *  - Por descripción → decide el REQUESTER (elige entre quienes se ofrecen).
 * `context` da lo necesario para decidir; `reveal` (otra parte + canal) solo
 * aparece cuando la intro está aprobada/completada, y a AMBAS partes.
 */
export const introDetailSchema = z.object({
  intro: introSchema,
  role: introRoleSchema,
  byDescription: z.boolean(),
  /** 'proposed' y te toca a ti decidir. */
  canDecide: z.boolean(),
  context: z
    .object({
      counterpartName: z.string(),
      targetDesc: z.string().nullable(),
    })
    .nullable(),
  reveal: z
    .object({
      counterpartName: z.string(),
      draft: z.string(),
      channel: channelSchema,
    })
    .nullable(),
});
export type IntroDetail = z.infer<typeof introDetailSchema>;
