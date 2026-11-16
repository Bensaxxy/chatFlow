import { apiClient } from "@/lib/api/client";

import type { ApiSuccessResponse } from "@/types/api";

import type {
  Conversation,
  CreateDirectConversationData,
} from "@/types/conversation";

type CreateConversationResponse =
  ApiSuccessResponse<CreateDirectConversationData>;

export const createDirectConversation = async (
  participantId: string,
): Promise<Conversation> => {
  const { data } = await apiClient.post<CreateConversationResponse>(
    "/conversations/direct",
    {
      participantId,
    },
  );

  return data.data.conversation;
};

interface ConversationsData {
  conversations: Conversation[];
}

type ConversationsResponse = ApiSuccessResponse<ConversationsData>;

export const getConversations = async (
  signal?: AbortSignal,
): Promise<Conversation[]> => {
  const { data } = await apiClient.get<ConversationsResponse>(
    "/conversations",
    {
      signal,
    },
  );

  return data.data.conversations;
};

interface ConversationData {
  conversation: Conversation;
}

type ConversationResponse = ApiSuccessResponse<ConversationData>;

export const getConversationById = async (
  conversationId: string,
  signal?: AbortSignal,
): Promise<Conversation> => {
  const { data } = await apiClient.get<ConversationResponse>(
    `/conversations/${conversationId}`,
    {
      signal,
    },
  );

  return data.data.conversation;
};
