import type { RequestHandler } from "express";

import {
  deleteMessage,
  editMessage,
  getConversationMessages,
  markConversationAsRead,
  sendMessage,
  updateMessageReaction,
} from "../services/message.service";
import { asyncHandler } from "../utils/async-handler";
import {
  conversationParamsSchema,
  EditMessageInput,
  listMessagesQuerySchema,
  messageParamsSchema,
  UpdateMessageReactionInput,
  type DeleteMessageInput,
  type SendMessageInput,
} from "../validations/message.validation";

export const createMessage: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = request.auth?.userId;

    if (!currentUserId) {
      throw new Error("Authenticated request is missing its user ID");
    }

    const { conversationId } = conversationParamsSchema.parse(request.params);

    const input = request.body as SendMessageInput;

    const message = await sendMessage(conversationId, currentUserId, input);

    response.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        message,
      },
    });
  },
);

export const listMessages: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = request.auth?.userId;

    if (!currentUserId) {
      throw new Error("Authenticated request is missing its user ID");
    }

    const { conversationId } = conversationParamsSchema.parse(request.params);

    const input = listMessagesQuerySchema.parse(request.query);

    const result = await getConversationMessages(
      conversationId,
      currentUserId,
      input,
    );

    response.status(200).json({
      success: true,
      message: "Messages retrieved successfully",
      data: result,
    });
  },
);

export const markMessagesRead: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = request.auth?.userId;

    if (!currentUserId) {
      throw new Error("Authenticated request is missing its user ID");
    }

    const { conversationId } = conversationParamsSchema.parse(request.params);

    const result = await markConversationAsRead(conversationId, currentUserId);

    response.status(200).json({
      success: true,
      message: "Conversation marked as read",
      data: result,
    });
  },
);

export const removeMessage: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = request.auth?.userId;

    if (!currentUserId) {
      throw new Error("Authenticated request is missing its user ID");
    }

    const { conversationId, messageId } = messageParamsSchema.parse(
      request.params,
    );

    const input = request.body as DeleteMessageInput;

    const result = await deleteMessage(
      conversationId,
      messageId,
      currentUserId,
      input,
    );

    response.status(200).json({
      success: true,
      message:
        input.scope === "everyone"
          ? "Message deleted for everyone"
          : "Message deleted for you",
      data: result,
    });
  },
);

export const updateMessage: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = request.auth?.userId;

    if (!currentUserId) {
      throw new Error("Authenticated request is missing its user ID");
    }

    const { conversationId, messageId } = messageParamsSchema.parse(
      request.params,
    );

    const input = request.body as EditMessageInput;

    const message = await editMessage(
      conversationId,
      messageId,
      currentUserId,
      input,
    );

    response.status(200).json({
      success: true,
      message: "Message edited successfully",
      data: {
        message,
      },
    });
  },
);

export const reactToMessage: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = request.auth?.userId;

    if (!currentUserId) {
      throw new Error("Authenticated request is missing its user ID");
    }

    const { conversationId, messageId } = messageParamsSchema.parse(
      request.params,
    );

    const input = request.body as UpdateMessageReactionInput;

    const message = await updateMessageReaction(
      conversationId,
      messageId,
      currentUserId,
      input,
    );

    response.status(200).json({
      success: true,

      message: input.emoji
        ? "Message reaction updated"
        : "Message reaction removed",

      data: {
        message,
      },
    });
  },
);
