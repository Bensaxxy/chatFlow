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

export type CreateDirectConversationInput = z.infer<
  typeof createDirectConversationSchema
>;

export type UpdateConversationPinInput = z.infer<
  typeof updateConversationPinSchema
>;
