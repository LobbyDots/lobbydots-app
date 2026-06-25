import { z } from "zod";

export const registerPushTokenSchema = z.object({
  expoPushToken: z.string().min(1),
});
export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;
