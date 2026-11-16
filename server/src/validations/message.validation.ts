import { isValidObjectId } from "mongoose";
import { z } from "zod";

export const conversationParamsSchema = z.object({
  conversationId: z
    .string()
    .refine((value) => isValidObjectId(value), "Conversation ID is invalid"),
});

export const messageParamsSchema = z.object({
  conversationId: z
    .string()
    .refine((value) => isValidObjectId(value), "Conversation ID is invalid"),

  messageId: z
    .string()
    .refine((value) => isValidObjectId(value), "Message ID is invalid"),
});

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(5000, "Message cannot exceed 5000 characters"),

  replyToMessageId: z
    .string()
    .refine((value) => isValidObjectId(value), "Reply message ID is invalid")
    .nullable()
    .optional(),
});

export const editMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(5000, "Message cannot exceed 5000 characters"),
});

export const deleteMessageSchema = z.object({
  scope: z.enum(["me", "everyone"]),
});

export const listMessagesQuerySchema = z.object({
  cursor: z
    .string()
    .refine((value) => isValidObjectId(value), "Message cursor is invalid")
    .optional(),

  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export type EditMessageInput = z.infer<typeof editMessageSchema>;

export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;

export type ListMessagesInput = z.infer<typeof listMessagesQuerySchema>;

export const messageReactionEmojis = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🙏",
] as const;

export const updateMessageReactionSchema = z.object({
  emoji: z.enum(messageReactionEmojis).nullable(),
});

export type MessageReactionEmoji = (typeof messageReactionEmojis)[number];

export type UpdateMessageReactionInput = z.infer<
  typeof updateMessageReactionSchema
>;
