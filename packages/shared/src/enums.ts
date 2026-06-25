import { z } from "zod";

export const memberStatusSchema = z.enum(["active", "suspended"]);
export type MemberStatus = z.infer<typeof memberStatusSchema>;

export const requestStatusSchema = z.enum([
  "open",
  "matched",
  "completed",
  "closed",
]);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

export const introStatusSchema = z.enum([
  "proposed",
  "approved",
  "rejected",
  "completed",
]);
export type IntroStatus = z.infer<typeof introStatusSchema>;

/** Cercanía: 1 = círculo íntimo, 2 = conoce bien, 3 = conocido. */
export const tierSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
export type Tier = z.infer<typeof tierSchema>;
