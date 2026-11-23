import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type { Conversation } from "@/types/conversation";

interface ConversationsData {
  conversations: Conversation[];
}

interface ConversationData {
  conversation: Conversation;
}

export const getMobileConversations = async (): Promise<Conversation[]> => {
  const { data } = await apiClient.get<ApiSuccessResponse<ConversationsData>>(
    "/conversations",
  );

  return data.data.conversations;
};

export const getMobileConversation = async (
  conversationId: string,
): Promise<Conversation> => {
  const { data } = await apiClient.get<ApiSuccessResponse<ConversationData>>(
    `/conversations/${conversationId}`,
  );

  return data.data.conversation;
};

export const createMobileDirectConversation = async (
  participantId: string,
): Promise<Conversation> => {
  const { data } = await apiClient.post<ApiSuccessResponse<ConversationData>>(
    "/conversations/direct",
    { participantId },
  );

  return data.data.conversation;
};
