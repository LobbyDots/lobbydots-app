import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const e164Schema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, "Debe estar en formato E.164 (+...)");
export const isoDateSchema = z.string().datetime();
