import { isValidObjectId } from "mongoose";
import { z } from "zod";

export const createDirectConversationSchema = z.object({
  participantId: z
    .string()
    .refine((value) => isValidObjectId(value), "Participant ID is invalid"),
});

export const updateConversationPinSchema = z.object({
  isPinned: z.boolean(),
});
export const muteConversationSchema = z.object({ durationHours: z.union([z.literal(8), z.literal(168), z.literal("always")]) });

export type CreateDirectConversationInput = z.infer<
  typeof createDirectConversationSchema
>;

export type UpdateConversationPinInput = z.infer<
  typeof updateConversationPinSchema
>;
