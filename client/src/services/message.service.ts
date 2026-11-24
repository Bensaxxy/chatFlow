import type { AxiosProgressEvent } from "axios";

import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  ChatMessage,
  DeleteMessageScope,
  MessageDeletedPayload,
  MediaGalleryCategory,
  MessageReactionEmoji,
  MessagesPage,
} from "@/types/message";

type MessagesResponse = ApiSuccessResponse<MessagesPage>;

interface MessageContextData {
  messages: ChatMessage[];
}

type MessageContextResponse = ApiSuccessResponse<MessageContextData>;

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

export type AttachmentUploadProgressHandler = (
  progressPercentage: number,
) => void;

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

export const getConversationMedia = async (
  conversationId: string,
  category: MediaGalleryCategory,
  cursor?: string | null,
  signal?: AbortSignal,
): Promise<MessagesPage> => {
  const { data } = await apiClient.get<MessagesResponse>(
    `/conversations/${conversationId}/media`,
    {
      params: {
        category,
        limit: 36,
        ...(cursor && {
          cursor,
        }),
      },
      signal,
    },
  );

  return data.data;
};

export const searchConversationMessages = async (
  conversationId: string,
  query: string,
  signal?: AbortSignal,
): Promise<ChatMessage[]> => {
  const { data } = await apiClient.get<MessagesResponse>(
    `/conversations/${conversationId}/messages`,
    {
      params: {
        limit: 50,
        q: query,
      },
      signal,
    },
  );

  return data.data.messages;
};

export const getConversationMessageContext = async (
  conversationId: string,
  messageId: string,
): Promise<ChatMessage[]> => {
  const { data } = await apiClient.get<MessageContextResponse>(
    `/conversations/${conversationId}/messages/${messageId}/context`,
  );

  return data.data.messages;
};

export const sendConversationMessage = async (
  conversationId: string,
  content: string,
  replyToMessageId?: string | null,
  clientMessageId?: string,
): Promise<ChatMessage> => {
  const { data } = await apiClient.post<MessageResponse>(
    `/conversations/${conversationId}/messages`,
    {
      content,
      replyToMessageId: replyToMessageId ?? null,
      ...(clientMessageId && {
        clientMessageId,
      }),
    },
  );

  return data.data.message;
};

export const sendConversationAttachment = async (
  conversationId: string,
  file: File,
  content = "",
  replyToMessageId?: string | null,
  clientMessageId?: string,
  onUploadProgress?: AttachmentUploadProgressHandler,
  waveform?: number[],
): Promise<ChatMessage> => {
  const formData = new FormData();

  formData.append("attachment", file);
  formData.append("content", content);

  if (waveform?.length) {
    formData.append("waveform", JSON.stringify(waveform));
  }

  if (replyToMessageId) {
    formData.append("replyToMessageId", replyToMessageId);
  }

  if (clientMessageId) {
    formData.append("clientMessageId", clientMessageId);
  }

  const { data } = await apiClient.post<MessageResponse>(
    `/conversations/${conversationId}/messages/attachment`,
    formData,
    {
      // Attachments are allowed to be 15 MB and can take longer than ordinary
      // API calls on slower connections or while Cloudinary processes a file.
      timeout: 120_000,
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onUploadProgress) {
          return;
        }

        if (!event.total) {
          onUploadProgress(0);
          return;
        }

        const percentage = Math.min(
          100,
          Math.round((event.loaded / event.total) * 100),
        );

        onUploadProgress(percentage);
      },
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
