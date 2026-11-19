import type { Conversation } from "@/types/conversation";
import type { ChatMessage } from "@/types/message";

export interface ConversationCacheEntry {
  conversation: Conversation;
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

const conversationCache = new Map<string, ConversationCacheEntry>();

export const getCachedConversation = (
  key: string | null,
): ConversationCacheEntry | null => {
  if (!key) {
    return null;
  }

  return conversationCache.get(key) ?? null;
};

export const saveConversationCache = (
  key: string,
  entry: ConversationCacheEntry,
): void => {
  if (!conversationCache.has(key) && conversationCache.size >= 20) {
    const oldestKey = conversationCache.keys().next().value;

    if (oldestKey) {
      conversationCache.delete(oldestKey);
    }
  }

  conversationCache.set(key, entry);
};

export const updateCachedConversationMessage = (
  key: string,
  message: ChatMessage,
  options: {
    isLatestMessage?: boolean;
  } = {},
): void => {
  const cachedConversation = conversationCache.get(key);

  if (!cachedConversation) {
    return;
  }

  const matchingMessage = cachedConversation.messages.find(
    (currentMessage) =>
      currentMessage._id === message._id ||
      Boolean(
        message.clientMessageId &&
          currentMessage.clientMessageId === message.clientMessageId,
      ),
  );
  const hasMessage = Boolean(matchingMessage);
  const shouldUpdateLastMessage =
    options.isLatestMessage ||
    cachedConversation.conversation.lastMessage?._id === message._id ||
    Boolean(
      message.clientMessageId &&
        cachedConversation.conversation.lastMessage?.clientMessageId ===
          message.clientMessageId,
    );

  conversationCache.set(key, {
    ...cachedConversation,
    conversation: {
      ...cachedConversation.conversation,
      ...(shouldUpdateLastMessage && {
        lastMessage: message,
        updatedAt: message.updatedAt || message.createdAt,
      }),
    },
    messages: hasMessage
      ? cachedConversation.messages.map((currentMessage) =>
          currentMessage._id === matchingMessage?._id
            ? message
            : currentMessage,
        )
      : [...cachedConversation.messages, message],
  });
};

export const invalidateConversationCache = (key: string): void => {
  conversationCache.delete(key);
};
