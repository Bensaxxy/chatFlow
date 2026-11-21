import { z } from "zod";

const subscriptionKeysSchema = z.object({
  p256dh: z.string().trim().min(1).max(1024),
  auth: z.string().trim().min(1).max(1024),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  expirationTime: z.number().finite().nullable().optional(),
  keys: subscriptionKeysSchema,
});

export const removePushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export type RemovePushSubscriptionInput = z.infer<
  typeof removePushSubscriptionSchema
>;
