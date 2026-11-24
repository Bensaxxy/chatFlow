import type { Conversation } from "@/types/conversation";
import type { ChatMessage } from "@/types/message";

export interface ConversationCacheEntry {
  conversation: Conversation;
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const updateConversationMessageCache = (
  cached: ConversationCacheEntry | undefined,
  message: ChatMessage,
  options: { isLatestMessage?: boolean } = {},
): ConversationCacheEntry | undefined => {
  if (!cached) return cached;

  const matchingMessage = cached.messages.find(
    (current) =>
      current._id === message._id ||
      Boolean(message.clientMessageId && current.clientMessageId === message.clientMessageId),
  );
  const shouldUpdateLastMessage =
    options.isLatestMessage ||
    cached.conversation.lastMessage?._id === message._id ||
    Boolean(
      message.clientMessageId &&
        cached.conversation.lastMessage?.clientMessageId === message.clientMessageId,
    );

  return {
    ...cached,
    conversation: {
      ...cached.conversation,
      ...(shouldUpdateLastMessage && {
        lastMessage: message,
        updatedAt: message.updatedAt || message.createdAt,
      }),
    },
    messages: matchingMessage
      ? cached.messages.map((current) =>
          current._id === matchingMessage._id ? message : current,
        )
      : [...cached.messages, message],
  };
};
