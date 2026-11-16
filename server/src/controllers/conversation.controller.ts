import type { RequestHandler } from "express";

import {
  createDirectConversation,
  getConversationById,
  getUserConversations,
} from "../services/conversation.service";
import { asyncHandler } from "../utils/async-handler";
import type { CreateDirectConversationInput } from "../validations/conversation.validation";
import { conversationParamsSchema } from "../validations/message.validation";

export const createDirect: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = request.auth?.userId;

    if (!currentUserId) {
      throw new Error("Authenticated request is missing its user ID");
    }

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
    const currentUserId = request.auth?.userId;

    if (!currentUserId) {
      throw new Error("Authenticated request is missing its user ID");
    }

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
    const currentUserId = request.auth?.userId;

    if (!currentUserId) {
      throw new Error("Authenticated request is missing its user ID");
    }

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
