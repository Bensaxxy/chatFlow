import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  ChatMessage,
  MessagePage,
  MessageReactionEmoji,
} from "@/types/message";

interface MessageData {
  message: ChatMessage;
}

export interface MobileAttachmentInput {
  uri: string;
  fileName: string;
  mimeType: string;
  size?: number;
}

export type MobileMediaCategory = "images" | "videos" | "files" | "voice-notes" | "links";

interface MessageContextData {
  messages: ChatMessage[];
}

interface ForwardMessageData {
  messages: ChatMessage[];
  forwardedCount: number;
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

export const searchMobileMessages = async (
  conversationId: string,
  query: string,
): Promise<ChatMessage[]> => {
  const { data } = await apiClient.get<ApiSuccessResponse<MessagePage>>(
    `/conversations/${conversationId}/messages`,
    { params: { limit: 50, q: query.trim() } },
  );
  return data.data.messages;
};

export const getMobileConversationMedia = async (
  conversationId: string,
  category: MobileMediaCategory,
  cursor?: string | null,
): Promise<MessagePage> => {
  const { data } = await apiClient.get<ApiSuccessResponse<MessagePage>>(
    `/conversations/${conversationId}/media`,
    { params: { category, limit: 36, ...(cursor ? { cursor } : {}) } },
  );
  return data.data;
};

export const getMobileMessageContext = async (
  conversationId: string,
  messageId: string,
): Promise<ChatMessage[]> => {
  const { data } = await apiClient.get<ApiSuccessResponse<MessageContextData>>(
    `/conversations/${conversationId}/messages/${messageId}/context`,
  );
  return data.data.messages;
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

export const sendMobileAttachment = async (
  conversationId: string,
  attachment: MobileAttachmentInput,
  clientMessageId: string,
  content = "",
): Promise<ChatMessage> => {
  const formData = new FormData();

  formData.append(
    "attachment",
    {
      uri: attachment.uri,
      name: attachment.fileName,
      type: attachment.mimeType,
    } as unknown as Blob,
  );
  formData.append("content", content);
  formData.append("clientMessageId", clientMessageId);

  const { data } = await apiClient.post<ApiSuccessResponse<MessageData>>(
    `/conversations/${conversationId}/messages/attachment`,
    formData,
    {
      timeout: 120_000,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return data.data.message;
};

export const updateMobileMessageReaction = async (
  conversationId: string,
  messageId: string,
  emoji: MessageReactionEmoji | null,
): Promise<ChatMessage> => {
  const { data } = await apiClient.patch<ApiSuccessResponse<MessageData>>(
    `/conversations/${conversationId}/messages/${messageId}/reaction`,
    { emoji },
  );

  return data.data.message;
};

export const deleteMobileMessage = async (
  conversationId: string,
  messageId: string,
  scope: "me" | "everyone" = "everyone",
): Promise<void> => {
  await apiClient.delete(`/conversations/${conversationId}/messages/${messageId}`, {
    data: { scope },
  });
};

export const forwardMobileMessage = async (
  conversationId: string,
  messageId: string,
  targetConversationIds: string[],
): Promise<ForwardMessageData> => {
  const { data } = await apiClient.post<ApiSuccessResponse<ForwardMessageData>>(
    `/conversations/${conversationId}/messages/${messageId}/forward`,
    { targetConversationIds },
  );
  return data.data;
};

export const editMobileMessage = async (
  conversationId: string,
  messageId: string,
  content: string,
): Promise<ChatMessage> => {
  const { data } = await apiClient.patch<ApiSuccessResponse<MessageData>>(
    `/conversations/${conversationId}/messages/${messageId}`,
    { content },
  );

  return data.data.message;
};

export const markMobileConversationRead = async (
  conversationId: string,
): Promise<void> => {
  await apiClient.patch(`/conversations/${conversationId}/read`);
};
