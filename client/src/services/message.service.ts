import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  ChatMessage,
  DeleteMessageScope,
  MessageDeletedPayload,
  MessageReactionEmoji,
  MessagesPage,
} from "@/types/message";

type MessagesResponse = ApiSuccessResponse<MessagesPage>;

interface MessageData {
  message: ChatMessage;
}

interface ForwardMessageData {
  messages: ChatMessage[];
  forwardedCount: number;
}

type MessageResponse = ApiSuccessResponse<MessageData>;

type DeleteMessageResponse = ApiSuccessResponse<MessageDeletedPayload>;

type ForwardMessageResponse = ApiSuccessResponse<ForwardMessageData>;

export const getConversationMessages = async (
  conversationId: string,
  cursor?: string | null,
  signal?: AbortSignal,
): Promise<MessagesPage> => {
  const { data } = await apiClient.get<MessagesResponse>(
    `/conversations/${conversationId}/messages`,
    {
      params: {
        limit: 30,
        ...(cursor && {
          cursor,
        }),
      },
      signal,
    },
  );

  return data.data;
};

export const sendConversationMessage = async (
  conversationId: string,
  content: string,
  replyToMessageId?: string | null,
): Promise<ChatMessage> => {
  const { data } = await apiClient.post<MessageResponse>(
    `/conversations/${conversationId}/messages`,
    {
      content,
      replyToMessageId: replyToMessageId ?? null,
    },
  );

  return data.data.message;
};

export const forwardConversationMessage = async (
  sourceConversationId: string,
  messageId: string,
  targetConversationIds: string[],
): Promise<ForwardMessageData> => {
  const { data } = await apiClient.post<ForwardMessageResponse>(
    `/conversations/${sourceConversationId}/messages/${messageId}/forward`,
    {
      targetConversationIds,
    },
  );

  return data.data;
};

export const deleteConversationMessage = async (
  conversationId: string,
  messageId: string,
  scope: DeleteMessageScope,
): Promise<MessageDeletedPayload> => {
  const { data } = await apiClient.delete<DeleteMessageResponse>(
    `/conversations/${conversationId}/messages/${messageId}`,
    {
      data: {
        scope,
      },
    },
  );

  return data.data;
};

interface MarkReadData {
  markedCount: number;
  readAt: string;
}

type MarkReadResponse = ApiSuccessResponse<MarkReadData>;

export const markConversationRead = async (
  conversationId: string,
): Promise<MarkReadData> => {
  const { data } = await apiClient.patch<MarkReadResponse>(
    `/conversations/${conversationId}/read`,
  );

  return data.data;
};

export const editConversationMessage = async (
  conversationId: string,
  messageId: string,
  content: string,
): Promise<ChatMessage> => {
  const { data } = await apiClient.patch<MessageResponse>(
    `/conversations/${conversationId}/messages/${messageId}`,
    {
      content,
    },
  );

  return data.data.message;
};

export const updateConversationMessageReaction = async (
  conversationId: string,
  messageId: string,
  emoji: MessageReactionEmoji | null,
): Promise<ChatMessage> => {
  const { data } = await apiClient.patch<MessageResponse>(
    `/conversations/${conversationId}/messages/${messageId}/reaction`,
    {
      emoji,
    },
  );

  return data.data.message;
};
