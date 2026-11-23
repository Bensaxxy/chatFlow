import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type { ChatMessage, MessagePage } from "@/types/message";

interface MessageData {
  message: ChatMessage;
}

export const getMobileMessages = async (
  conversationId: string,
): Promise<MessagePage> => {
  const { data } = await apiClient.get<ApiSuccessResponse<MessagePage>>(
    `/conversations/${conversationId}/messages`,
    { params: { limit: 40 } },
  );

  return data.data;
};

export const sendMobileMessage = async (
  conversationId: string,
  content: string,
  clientMessageId: string,
): Promise<ChatMessage> => {
  const { data } = await apiClient.post<ApiSuccessResponse<MessageData>>(
    `/conversations/${conversationId}/messages`,
    { content, clientMessageId },
  );

  return data.data.message;
};

export const markMobileConversationRead = async (
  conversationId: string,
): Promise<void> => {
  await apiClient.patch(`/conversations/${conversationId}/read`);
};
