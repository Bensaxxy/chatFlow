import type { RequestHandler } from "express";

import {
  clearConversationHistory,
  createDirectConversation,
  getConversationById,
  getUserConversations,
  markConversationAsUnread,
  updateConversationPinnedState,
} from "../services/conversation.service";
import type { ConversationPreferences } from "../services/conversation-preference.service";
import { getSocketServer } from "../socket/socket.server";
import { asyncHandler } from "../utils/async-handler";
import type {
  CreateDirectConversationInput,
  UpdateConversationPinInput,
} from "../validations/conversation.validation";
import { conversationParamsSchema } from "../validations/message.validation";

const getAuthenticatedUserId = (userId?: string): string => {
  if (!userId) {
    throw new Error("Authenticated request is missing its user ID");
  }

  return userId;
};

const emitPreferencesUpdate = (
  userId: string,
  conversationId: string,
  preferences: ConversationPreferences,
): void => {
  getSocketServer().to(`user:${userId}`).emit("conversation:preferences-updated", {
    conversationId,
    isPinned: preferences.isPinned,
    isMarkedUnread: preferences.isMarkedUnread,
    clearedAt: preferences.clearedAt?.toISOString() ?? null,
  });
};

export const createDirect: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const input = request.body as CreateDirectConversationInput;

    const result = await createDirectConversation(
      currentUserId,
      input.participantId,
    );

    response.status(result.created ? 201 : 200).json({
      success: true,
      message: result.created
        ? "Conversation created successfully"
        : "Existing conversation retrieved successfully",
      data: result,
    });
  },
);

export const listConversations: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const conversations = await getUserConversations(currentUserId);

    response.status(200).json({
      success: true,
      message: "Conversations retrieved successfully",
      data: {
        conversations,
      },
    });
  },
);

export const getConversation: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { conversationId } = conversationParamsSchema.parse(request.params);

    const conversation = await getConversationById(
      conversationId,
      currentUserId,
    );

    response.status(200).json({
      success: true,
      message: "Conversation retrieved successfully",
      data: {
        conversation,
      },
    });
  },
);

export const updateConversationPin: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);
    const { conversationId } = conversationParamsSchema.parse(request.params);
    const input = request.body as UpdateConversationPinInput;
    const preferences = await updateConversationPinnedState(
      conversationId,
      currentUserId,
      input.isPinned,
    );

    emitPreferencesUpdate(currentUserId, conversationId, preferences);

    response.status(200).json({
      success: true,
      message: input.isPinned ? "Chat pinned" : "Chat unpinned",
      data: {
        preferences,
      },
    });
  },
);

export const markConversationUnread: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);
    const { conversationId } = conversationParamsSchema.parse(request.params);
    const preferences = await markConversationAsUnread(
      conversationId,
      currentUserId,
    );

    emitPreferencesUpdate(currentUserId, conversationId, preferences);

    response.status(200).json({
      success: true,
      message: "Chat marked as unread",
      data: {
        preferences,
      },
    });
  },
);

export const clearConversation: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);
    const { conversationId } = conversationParamsSchema.parse(request.params);
    const preferences = await clearConversationHistory(
      conversationId,
      currentUserId,
    );

    emitPreferencesUpdate(currentUserId, conversationId, preferences);

    response.status(200).json({
      success: true,
      message: "Chat cleared for you",
      data: {
        preferences,
      },
    });
  },
);
