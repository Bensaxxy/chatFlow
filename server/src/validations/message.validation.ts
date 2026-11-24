import { isValidObjectId } from "mongoose";
import { z } from "zod";

const objectIdSchema = (message: string) =>
  z.string().refine((value) => isValidObjectId(value), message);

const optionalMultipartObjectId = (message: string) =>
  z.preprocess((value) => {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === "null"
    ) {
      return null;
    }

    return value;
  }, objectIdSchema(message).nullable());

const optionalClientMessageId = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().uuid("Client message ID is invalid").optional(),
);

export const conversationParamsSchema = z.object({
  conversationId: objectIdSchema("Conversation ID is invalid"),
});

export const messageParamsSchema = z.object({
  conversationId: objectIdSchema("Conversation ID is invalid"),
  messageId: objectIdSchema("Message ID is invalid"),
});

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(5000, "Message cannot exceed 5000 characters"),

  replyToMessageId: objectIdSchema("Reply message ID is invalid")
    .nullable()
    .optional(),

  clientMessageId: z
    .string()
    .uuid("Client message ID is invalid")
    .optional(),
});

export const sendAttachmentMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .max(5000, "Message caption cannot exceed 5000 characters")
    .optional()
    .default(""),

  replyToMessageId: optionalMultipartObjectId(
    "Reply message ID is invalid",
  ).optional(),

  clientMessageId: optionalClientMessageId,

  waveform: z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.length === 0) return undefined;

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    },
    z.array(z.number().finite().min(0).max(1)).max(96).optional(),
  ),
});

export const forwardMessageSchema = z.object({
  targetConversationIds: z
    .array(objectIdSchema("A target conversation ID is invalid"))
    .min(1, "Select at least one conversation")
    .max(20, "You can forward to a maximum of 20 conversations")
    .transform((conversationIds) => [...new Set(conversationIds)]),
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
  cursor: objectIdSchema("Message cursor is invalid").optional(),

  limit: z.coerce.number().int().min(1).max(50).default(30),

  q: z
    .string()
    .trim()
    .min(1, "Search query cannot be empty")
    .max(100, "Search query cannot exceed 100 characters")
    .optional(),
});

export const mediaGalleryCategoryValues = [
  "images",
  "videos",
  "files",
  "voice-notes",
  "links",
] as const;

export const listConversationMediaQuerySchema = z.object({
  category: z.enum(mediaGalleryCategoryValues).default("images"),

  cursor: objectIdSchema("Media cursor is invalid").optional(),

  limit: z.coerce.number().int().min(1).max(50).default(36),
});

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

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export type SendAttachmentMessageInput = z.infer<
  typeof sendAttachmentMessageSchema
>;

export type ForwardMessageInput = z.infer<typeof forwardMessageSchema>;

export type EditMessageInput = z.infer<typeof editMessageSchema>;

export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;

export type ListMessagesInput = z.infer<typeof listMessagesQuerySchema>;

export type ListConversationMediaInput = z.infer<
  typeof listConversationMediaQuerySchema
>;

export type MessageReactionEmoji = (typeof messageReactionEmojis)[number];

export type UpdateMessageReactionInput = z.infer<
  typeof updateMessageReactionSchema
>;
