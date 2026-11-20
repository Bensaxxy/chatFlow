import type { RequestHandler } from "express";
import { z } from "zod";
import { isValidObjectId } from "mongoose";

import { getConversationCallHistory } from "../services/call-history.service";
import { asyncHandler } from "../utils/async-handler";

const callHistoryQuerySchema = z.object({
  conversationId: z
    .string()
    .refine((value) => isValidObjectId(value), "Conversation ID is invalid"),
});

export const listCallHistory: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = request.auth?.userId;

    if (!currentUserId) {
      throw new Error("Authenticated request is missing its user ID");
    }

    const { conversationId } = callHistoryQuerySchema.parse(request.query);
    const calls = await getConversationCallHistory(conversationId, currentUserId);

    response.status(200).json({
      success: true,
      message: "Call history retrieved successfully",
      data: {
        calls,
      },
    });
  },
);
