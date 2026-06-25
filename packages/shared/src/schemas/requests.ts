import { z } from "zod";
import { requestStatusSchema } from "../enums";
import { e164Schema, isoDateSchema, uuidSchema } from "./common";

/** Persona concreta (targetE164) O descripción (targetDesc), exactamente una. */
export const createRequestSchema = z
  .object({
    targetE164: e164Schema.optional(),
    targetDesc: z.string().min(3).max(280).optional(),
  })
  .refine((d) => (d.targetE164 ? 1 : 0) + (d.targetDesc ? 1 : 0) === 1, {
    message:
      "Indica una persona (targetE164) o una descripción (targetDesc), no ambas.",
  });
export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const requestSchema = z.object({
  id: uuidSchema,
  status: requestStatusSchema,
  byDescription: z.boolean(),
  targetDesc: z.string().nullable(),
  createdAt: isoDateSchema,
});
export type RequestDto = z.infer<typeof requestSchema>;

/**
 * PRIVACIDAD (promesa central): un "camino" jamás incluye filas de contacto
 * ni phone_hash ni la agenda de nadie. Solo el broker, su nombre y la calidez.
 */
export const pathStubSchema = z.object({
  brokerId: uuidSchema,
  brokerDisplayName: z.string(),
  warmth: z.number().min(0).max(1),
  reasons: z.array(z.string()),
});
export type PathStub = z.infer<typeof pathStubSchema>;

export const pathsResponseSchema = z.object({
  direct: z.boolean(),
  paths: z.array(pathStubSchema),
});
export type PathsResponse = z.infer<typeof pathsResponseSchema>;

/** Petición por descripción abierta que otro miembro podría ayudar a resolver (pull). */
export const openRequestSchema = z.object({
  id: uuidSchema,
  targetDesc: z.string(),
  requesterName: z.string(),
  createdAt: isoDateSchema,
});
export type OpenRequest = z.infer<typeof openRequestSchema>;
