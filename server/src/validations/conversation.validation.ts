import { isValidObjectId } from "mongoose";
import { z } from "zod";

export const createDirectConversationSchema = z.object({
  participantId: z
    .string()
    .refine((value) => isValidObjectId(value), "Participant ID is invalid"),
});

export type CreateDirectConversationInput = z.infer<
  typeof createDirectConversationSchema
>;
