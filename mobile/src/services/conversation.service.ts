import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type { Conversation, ConversationPreferences } from "@/types/conversation";

interface ConversationsData {
  conversations: Conversation[];
}

interface ConversationData {
  conversation: Conversation;
}

interface ConversationPreferencesData {
  preferences: ConversationPreferences;
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

export const setMobileConversationPinned = async (
  conversationId: string,
  isPinned: boolean,
): Promise<ConversationPreferences> => {
  const { data } = await apiClient.patch<
    ApiSuccessResponse<ConversationPreferencesData>
  >(`/conversations/${conversationId}/pin`, { isPinned });
  return data.data.preferences;
};

export const markMobileConversationUnread = async (
  conversationId: string,
): Promise<ConversationPreferences> => {
  const { data } = await apiClient.patch<
    ApiSuccessResponse<ConversationPreferencesData>
  >(`/conversations/${conversationId}/unread`);
  return data.data.preferences;
};

export const clearMobileConversation = async (
  conversationId: string,
): Promise<ConversationPreferences> => {
  const { data } = await apiClient.post<
    ApiSuccessResponse<ConversationPreferencesData>
  >(`/conversations/${conversationId}/clear`);
  return data.data.preferences;
};
