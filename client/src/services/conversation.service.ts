import { apiClient } from "@/lib/api/client";

import type { ApiSuccessResponse } from "@/types/api";

import type {
  Conversation,
  ConversationPreferences,
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

interface ConversationPreferencesData {
  preferences: ConversationPreferences;
}

type ConversationPreferencesResponse = ApiSuccessResponse<
  ConversationPreferencesData
>;

export const setConversationPinned = async (
  conversationId: string,
  isPinned: boolean,
): Promise<ConversationPreferences> => {
  const { data } = await apiClient.patch<ConversationPreferencesResponse>(
    `/conversations/${conversationId}/pin`,
    { isPinned },
  );

  return data.data.preferences;
};

export const markConversationUnread = async (
  conversationId: string,
): Promise<ConversationPreferences> => {
  const { data } = await apiClient.patch<ConversationPreferencesResponse>(
    `/conversations/${conversationId}/unread`,
  );

  return data.data.preferences;
};

export const clearConversation = async (
  conversationId: string,
): Promise<ConversationPreferences> => {
  const { data } = await apiClient.post<ConversationPreferencesResponse>(
    `/conversations/${conversationId}/clear`,
  );

  return data.data.preferences;
};

export const muteConversation = async (conversationId: string, durationHours: 8 | 168 | "always"): Promise<ConversationPreferences> => {
  const { data } = await apiClient.patch<ConversationPreferencesResponse>(`/conversations/${conversationId}/mute`, { durationHours });
  return data.data.preferences;
};

export const unmuteConversation = async (conversationId: string): Promise<ConversationPreferences> => {
  const { data } = await apiClient.patch<ConversationPreferencesResponse>(`/conversations/${conversationId}/unmute`);
  return data.data.preferences;
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
  await apiClient.delete(`/conversations/${conversationId}`);
};
