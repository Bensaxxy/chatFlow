import type { RequestHandler } from "express";

import {
  deleteMessage,
  editMessage,
  forwardMessage,
  getConversationMedia,
  getConversationMessages,
  getMessageContext as getMessageContextService,
  markConversationAsRead,
  sendMessage,
  sendMessageAttachment,
  updateMessageReaction,
} from "../services/message.service";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import {
  conversationParamsSchema,
  listConversationMediaQuerySchema,
  listMessagesQuerySchema,
  messageParamsSchema,
  sendAttachmentMessageSchema,
  type DeleteMessageInput,
  type EditMessageInput,
  type ForwardMessageInput,
  type SendMessageInput,
  type UpdateMessageReactionInput,
} from "../validations/message.validation";

const getAuthenticatedUserId = (userId?: string): string => {
  if (!userId) {
    throw new Error("Authenticated request is missing its user ID");
  }

  return userId;
};

export const createMessage: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

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

export const createAttachmentMessage: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { conversationId } = conversationParamsSchema.parse(request.params);

    if (!request.file) {
      throw new AppError(
        "Select an image or file to send",
        400,
        "ATTACHMENT_REQUIRED",
      );
    }

    const input = sendAttachmentMessageSchema.parse(request.body);

    const message = await sendMessageAttachment(
      conversationId,
      currentUserId,
      input,
      request.file,
    );

    response.status(201).json({
      success: true,
      message:
        message.type === "image"
          ? "Image sent successfully"
          : message.type === "audio"
            ? "Voice note sent successfully"
          : "File sent successfully",
      data: {
        message,
      },
    });
  },
);

export const forwardExistingMessage: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { conversationId, messageId } = messageParamsSchema.parse(
      request.params,
    );

    const input = request.body as ForwardMessageInput;

    const result = await forwardMessage(
      conversationId,
      messageId,
      currentUserId,
      input,
    );

    response.status(201).json({
      success: true,
      message:
        result.forwardedCount === 1
          ? "Message forwarded successfully"
          : `Message forwarded to ${result.forwardedCount} conversations`,
      data: result,
    });
  },
);

export const listMessages: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

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

export const listConversationMedia: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { conversationId } = conversationParamsSchema.parse(request.params);

    const input = listConversationMediaQuerySchema.parse(request.query);

    const result = await getConversationMedia(
      conversationId,
      currentUserId,
      input,
    );

    response.status(200).json({
      success: true,
      message: "Conversation media retrieved successfully",
      data: result,
    });
  },
);

export const getMessageContext: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { conversationId, messageId } = messageParamsSchema.parse(
      request.params,
    );

    const result = await getMessageContextService(
      conversationId,
      messageId,
      currentUserId,
    );

    response.status(200).json({
      success: true,
      message: "Message context retrieved successfully",
      data: result,
    });
  },
);

export const markMessagesRead: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

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
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

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
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

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
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

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
