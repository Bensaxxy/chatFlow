"use client";

import { AlertCircle, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { toast } from "react-toastify";

import ConversationComposer from "@/components/chat/ConversationComposer";
import ConversationHeader from "@/components/chat/ConversationHeader";
import ConversationMessageList from "@/components/chat/ConversationMessageList";
import MediaGalleryDrawer from "@/components/chat/MediaGalleryDrawer";
import MessageBulkActionBar from "@/components/chat/MessageBulkActionBar";
import MessageSearchDrawer from "@/components/chat/MessageSearchDrawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  getCachedConversation,
  invalidateConversationCache,
  saveConversationCache,
  type ConversationCacheEntry,
} from "@/lib/chat/conversation-cache";
import { getConversationById } from "@/services/conversation.service";
import {
  deleteConversationMessage,
  editConversationMessage,
  getConversationMessageContext,
  getConversationMessages,
  markConversationRead,
  sendConversationAttachment,
  sendConversationMessage,
  searchConversationMessages,
  updateConversationMessageReaction,
} from "@/services/message.service";
import type {
  Conversation,
  ConversationParticipant,
} from "@/types/conversation";
import {
  type ChatMessage,
  type DeleteMessageScope,
  type MessageAttachment,
  type MessageDeletedPayload,
  type MessageReactionEmoji,
  type RepliedMessage,
} from "@/types/message";
import ForwardMessageModal from "@/components/chat/ForwardMessageModal";
import {
  clearConversationDraft,
  getConversationDraft,
  saveConversationDraft,
} from "@/lib/chat/draft-storage";
import { createClientMessageId } from "@/lib/chat/client-message-id";

interface ConversationViewProps {
  conversationId: string;
}

interface PendingDelivery {
  send: () => Promise<ChatMessage>;
  releasePreviewUrl?: () => void;
  isInFlight?: boolean;
}

interface MessageDeletionRequest {
  messageIds: string[];
  scope: DeleteMessageScope;
}

const getAttachmentMessageType = (
  file: File,
): "image" | "file" | "audio" => {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  return "file";
};

const createLocalAttachment = (
  file: File,
  url: string,
): MessageAttachment => ({
  url,
  resourceType: file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("audio/") || file.type.startsWith("video/")
      ? "video"
      : "raw",
  fileName: file.name,
  mimeType: file.type || "application/octet-stream",
  size: file.size,
  width: null,
  height: null,
  duration: null,
});

const formatMessageDateLabel = (value: string): string => {
  const messageDate = new Date(value);
  const today = new Date();

  if (Number.isNaN(messageDate.getTime())) return "";

  const isSameDay = (first: Date, second: Date): boolean =>
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(messageDate, today)) return "Today";
  if (isSameDay(messageDate, yesterday)) return "Yesterday";

  return messageDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year:
      messageDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
};

const formatLastSeen = (value?: string | null): string => {
  if (!value) return "Offline";

  const lastSeenDate = new Date(value);

  if (Number.isNaN(lastSeenDate.getTime())) {
    return "Offline";
  }

  const now = new Date();
  const yesterday = new Date(now);

  yesterday.setDate(now.getDate() - 1);

  const time = lastSeenDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (lastSeenDate.toDateString() === now.toDateString()) {
    return `Last seen today at ${time}`;
  }

  if (lastSeenDate.toDateString() === yesterday.toDateString()) {
    return `Last seen yesterday at ${time}`;
  }

  const date = lastSeenDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      lastSeenDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });

  return `Last seen ${date} at ${time}`;
};

const getOtherParticipant = (
  conversation: Conversation,
  currentUserId: string,
): ConversationParticipant | undefined =>
  conversation.participants.find(
    (participant) => participant._id !== currentUserId,
  );

const normalizeReplyPreview = (
  replyTo: RepliedMessage | null | undefined,
): RepliedMessage | null =>
  replyTo
    ? {
        ...replyTo,
        type: replyTo.type ?? "text",
        attachment: replyTo.attachment ?? null,
        isForwarded: replyTo.isForwarded ?? false,
        deletedFor: Array.isArray(replyTo.deletedFor) ? replyTo.deletedFor : [],
      }
    : null;

const normalizeMessage = (message: ChatMessage): ChatMessage => ({
  ...message,
  clientMessageId: message.clientMessageId ?? null,
  type: message.type ?? "text",
  attachment: message.attachment ?? null,
  isForwarded: message.isForwarded ?? false,
  replyTo: normalizeReplyPreview(message.replyTo),
  deliveredTo: Array.isArray(message.deliveredTo) ? message.deliveredTo : [],
  readBy: Array.isArray(message.readBy) ? message.readBy : [],
  deletedFor: Array.isArray(message.deletedFor) ? message.deletedFor : [],
  reactions: Array.isArray(message.reactions) ? message.reactions : [],
});

const addMessageIfMissing = (
  currentMessages: ChatMessage[],
  incomingMessage: ChatMessage,
): ChatMessage[] => {
  const normalizedMessage = normalizeMessage(incomingMessage);

  const matchingMessage = currentMessages.find(
    (message) =>
      message._id === normalizedMessage._id ||
      Boolean(
        normalizedMessage.clientMessageId &&
          message.clientMessageId === normalizedMessage.clientMessageId,
      ),
  );

  if (!matchingMessage) {
    return [...currentMessages, normalizedMessage];
  }

  return currentMessages.map((message) =>
    message._id === matchingMessage._id ? normalizedMessage : message,
  );
};

const createReplyPreview = (message: ChatMessage): RepliedMessage => ({
  _id: message._id,
  content: message.content,
  type: message.type,
  attachment: message.attachment,
  linkPreview: message.linkPreview ?? null,
  sender: message.sender,
  isForwarded: message.isForwarded,
  deletedFor: Array.isArray(message.deletedFor) ? message.deletedFor : [],
  deletedForEveryoneAt: message.deletedForEveryoneAt,
  editedAt: message.editedAt,
  createdAt: message.createdAt,
});

const replaceMessage = (
  currentMessages: ChatMessage[],
  updatedMessage: ChatMessage,
): ChatMessage[] => {
  const normalizedMessage = normalizeMessage(updatedMessage);

  const replyPreview = createReplyPreview(normalizedMessage);

  return currentMessages.map((message) => {
    if (
      message._id === normalizedMessage._id ||
      Boolean(
        normalizedMessage.clientMessageId &&
          message.clientMessageId === normalizedMessage.clientMessageId,
      )
    ) {
      return normalizedMessage;
    }

    if (message.replyTo?._id === normalizedMessage._id) {
      return {
        ...message,
        replyTo: replyPreview,
      };
    }

    return message;
  });
};

const applyMessageDeletion = (
  currentMessages: ChatMessage[],
  payload: MessageDeletedPayload,
  currentUserId: string,
): ChatMessage[] => {
  if (payload.scope === "me") {
    if (payload.deletedByUserId !== currentUserId) {
      return currentMessages;
    }

    return currentMessages
      .filter((message) => message._id !== payload.messageId)
      .map((message) => {
        if (message.replyTo?._id !== payload.messageId) {
          return message;
        }

        const deletedFor = Array.isArray(message.replyTo.deletedFor)
          ? message.replyTo.deletedFor
          : [];

        return {
          ...message,
          replyTo: {
            ...message.replyTo,
            deletedFor: deletedFor.includes(currentUserId)
              ? deletedFor
              : [...deletedFor, currentUserId],
          },
        };
      });
  }

  return currentMessages.map((message) => {
    let nextMessage = message;

    if (message._id === payload.messageId) {
      nextMessage = {
        ...message,
        content: "This message was deleted",
        reactions: [],
        deletedForEveryoneAt: payload.deletedForEveryoneAt,
      };
    }

    if (nextMessage.replyTo?._id === payload.messageId) {
      nextMessage = {
        ...nextMessage,
        replyTo: {
          ...nextMessage.replyTo,
          content: "This message was deleted",
          deletedForEveryoneAt: payload.deletedForEveryoneAt,
        },
      };
    }

    return nextMessage;
  });
};

export default function ConversationView({
  conversationId,
}: ConversationViewProps) {
  const { user } = useAuth();
  const router = useRouter();

  const {
    socket,
    isConnected,
    onlineUserIds,
    lastSeenByUser,
    updatedProfiles,
  } = useSocket();

  const currentUserId = user?._id;

  const conversationCacheKey = currentUserId
    ? `${currentUserId}:${conversationId}`
    : null;

  const [initialCache] = useState<ConversationCacheEntry | null>(() =>
    getCachedConversation(conversationCacheKey),
  );

  const [conversation, setConversation] = useState<Conversation | null>(
    () => initialCache?.conversation ?? null,
  );

  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialCache?.messages ?? [],
  );

  const [messageText, setMessageText] = useState("");

  const restoreCurrentDraft = useCallback((): void => {
    if (!currentUserId) {
      setMessageText("");
      return;
    }

    setMessageText(getConversationDraft(currentUserId, conversationId));
  }, [currentUserId, conversationId]);

  useEffect(() => {
    restoreCurrentDraft();
  }, [restoreCurrentDraft]);

  const [nextCursor, setNextCursor] = useState<string | null>(
    () => initialCache?.nextCursor ?? null,
  );

  const [hasMore, setHasMore] = useState(() => initialCache?.hasMore ?? false);

  const [isLoading, setIsLoading] = useState(() => initialCache === null);

  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);

  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(
    null,
  );

  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(
    null,
  );

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const [isEditingMessage, setIsEditingMessage] = useState(false);

  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<
    string | null
  >(null);

  const [reactingMessageId, setReactingMessageId] = useState<string | null>(
    null,
  );

  const [replyingToMessage, setReplyingToMessage] =
    useState<ChatMessage | null>(null);

  const [forwardingMessages, setForwardingMessages] = useState<ChatMessage[]>(
    [],
  );

  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [isBulkActionWorking, setIsBulkActionWorking] = useState(false);

  const [messageDeletionRequest, setMessageDeletionRequest] =
    useState<MessageDeletionRequest | null>(null);

  const [showFloatingDate, setShowFloatingDate] = useState(false);

  const [floatingDate, setFloatingDate] = useState("");

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);

  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);

  const [messageSearchQuery, setMessageSearchQuery] = useState("");

  const [messageSearchResults, setMessageSearchResults] = useState<
    ChatMessage[]
  >([]);

  const [isSearchingMessages, setIsSearchingMessages] = useState(false);

  const [hasMessageSearchRun, setHasMessageSearchRun] = useState(false);

  const [messageSearchError, setMessageSearchError] = useState<string | null>(
    null,
  );

  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  const messageSearchInputRef = useRef<HTMLInputElement | null>(null);

  const typingTimeoutRef = useRef<number | null>(null);

  const remoteTypingTimeoutRef = useRef<number | null>(null);

  const floatingDateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const messageSearchResetTimeoutRef = useRef<number | null>(null);

  const editingMessageIdRef = useRef<string | null>(null);

  const lastTypingEmitAtRef = useRef(0);
  const isTypingRef = useRef(false);
  const pendingDeliveriesRef = useRef<Map<string, PendingDelivery>>(new Map());

  const handleMessagesScroll = useCallback((): void => {
    const container = messagesContainerRef.current;

    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    setShowScrollToBottom(distanceFromBottom > 160);

    const containerTop = container.getBoundingClientRect().top;

    const messageElements = container.querySelectorAll<HTMLElement>(
      "[data-message-date]",
    );

    let currentDate = "";

    for (const element of messageElements) {
      const rect = element.getBoundingClientRect();

      if (rect.bottom >= containerTop + 12) {
        currentDate = element.dataset.messageDate ?? "";

        break;
      }
    }

    if (currentDate) {
      setFloatingDate(formatMessageDateLabel(currentDate));

      setShowFloatingDate(true);
    }

    if (floatingDateTimeoutRef.current) {
      clearTimeout(floatingDateTimeoutRef.current);
    }

    floatingDateTimeoutRef.current = setTimeout(() => {
      setShowFloatingDate(false);
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (floatingDateTimeoutRef.current) {
        clearTimeout(floatingDateTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadConversation = async (): Promise<void> => {
      if (initialCache) {
        void getConversationById(conversationId)
          .then((latestConversation) => {
            if (!controller.signal.aborted) {
              setConversation(latestConversation);
            }
          })
          .catch((loadError) => {
            if (!controller.signal.aborted) {
              console.error("Could not refresh conversation details:", loadError);
            }
          });

        void markConversationRead(conversationId).catch((readError) => {
          console.error("Could not mark conversation as read:", readError);
        });

        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [conversationResult, messageResult] = await Promise.all([
          getConversationById(conversationId, controller.signal),
          getConversationMessages(conversationId, null, controller.signal),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        setConversation(conversationResult);

        setMessages(messageResult.messages.map(normalizeMessage));

        setNextCursor(messageResult.nextCursor);

        setHasMore(messageResult.hasMore);

        try {
          await markConversationRead(conversationId);
        } catch (readError) {
          console.error("Could not mark conversation as read:", readError);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(getApiErrorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadConversation();

    return () => controller.abort();
  }, [conversationId, initialCache]);

  useEffect(() => {
    if (!conversationCacheKey || !conversation || isLoading) {
      return;
    }

    saveConversationCache(conversationCacheKey, {
      conversation,
      messages,
      nextCursor,
      hasMore,
    });
  }, [
    conversationCacheKey,
    conversation,
    messages,
    nextCursor,
    hasMore,
    isLoading,
  ]);

  const stopTyping = useCallback((): void => {
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = null;
    }

    if (isTypingRef.current && socket.connected) {
      socket.emit("typing:stop", conversationId);
    }

    isTypingRef.current = false;
    lastTypingEmitAtRef.current = 0;
  }, [socket, conversationId]);

  useEffect(() => {
    if (!isConnected || !currentUserId) {
      return;
    }

    let isActive = true;

    const clearRemoteTypingTimeout = (): void => {
      if (remoteTypingTimeoutRef.current !== null) {
        window.clearTimeout(remoteTypingTimeoutRef.current);

        remoteTypingTimeoutRef.current = null;
      }
    };

    const handleNewMessage = ({ message }: { message: ChatMessage }): void => {
      if (message.conversation !== conversationId) {
        return;
      }

      if (message.sender._id === currentUserId && message.clientMessageId) {
        const pendingDelivery = pendingDeliveriesRef.current.get(
          message.clientMessageId,
        );

        if (pendingDelivery) {
          pendingDeliveriesRef.current.delete(message.clientMessageId);
          pendingDelivery.releasePreviewUrl?.();
        }
      }

      setMessages((current) => addMessageIfMissing(current, message));

      if (message.sender._id !== currentUserId) {
        clearRemoteTypingTimeout();
        setIsOtherUserTyping(false);

        void markConversationRead(conversationId).catch((readError) => {
          console.error("Could not mark new message as read:", readError);
        });
      }
    };

    const handleMessageUpdated = (payload: {
      conversationId: string;
      message: ChatMessage;
    }): void => {
      if (payload.conversationId !== conversationId) {
        return;
      }

      setMessages((current) => replaceMessage(current, payload.message));

      setReplyingToMessage((current) =>
        current?._id === payload.message._id
          ? normalizeMessage(payload.message)
          : current,
      );
    };

    const handleConversationRead = (payload: {
      conversationId: string;
      userId: string;
      readAt: string;
    }): void => {
      if (payload.conversationId !== conversationId) {
        return;
      }

      setMessages((current) =>
        current.map((message) => {
          const readBy = Array.isArray(message.readBy) ? message.readBy : [];

          return readBy.includes(payload.userId)
            ? message
            : {
                ...message,
                readBy: [...readBy, payload.userId],
              };
        }),
      );
    };

    const handleTypingUpdate = (payload: {
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }): void => {
      if (
        payload.conversationId !== conversationId ||
        payload.userId === currentUserId
      ) {
        return;
      }

      clearRemoteTypingTimeout();

      setIsOtherUserTyping(payload.isTyping);

      if (payload.isTyping) {
        remoteTypingTimeoutRef.current = window.setTimeout(() => {
          setIsOtherUserTyping(false);

          remoteTypingTimeoutRef.current = null;
        }, 3000);
      }
    };

    const handleMessageDeleted = (payload: MessageDeletedPayload): void => {
      if (payload.conversationId !== conversationId) {
        return;
      }

      setMessages((current) =>
        applyMessageDeletion(current, payload, currentUserId),
      );

      if (editingMessageIdRef.current === payload.messageId) {
        editingMessageIdRef.current = null;

        setEditingMessageId(null);
        setMessageText("");
      }

      setReactionPickerMessageId((current) =>
        current === payload.messageId ? null : current,
      );

      setReplyingToMessage((current) =>
        current?._id === payload.messageId ? null : current,
      );

      setOpenMessageMenuId(null);
    };

    const handlePreferencesUpdate = (payload: {
      conversationId: string;
      isPinned: boolean;
      isMarkedUnread: boolean;
      clearedAt: string | null;
    }): void => {
      if (payload.conversationId !== conversationId || !payload.clearedAt) {
        return;
      }

      invalidateConversationCache(`${currentUserId}:${conversationId}`);
      setMessages([]);
      setNextCursor(null);
      setHasMore(false);
      setReplyingToMessage(null);
      setOpenMessageMenuId(null);
      setReactionPickerMessageId(null);
      setSelectedMessageIds(new Set());
      setIsOtherUserTyping(false);
    };

    socket.on("message:new", handleNewMessage);

    socket.on("message:updated", handleMessageUpdated);

    socket.on("conversation:read", handleConversationRead);

    socket.on("typing:update", handleTypingUpdate);

    socket.on("message:deleted", handleMessageDeleted);

    socket.on("conversation:preferences-updated", handlePreferencesUpdate);

    socket.emit("conversation:join", conversationId, (result) => {
      if (isActive && !result.success) {
        toast.error(result.message);
      }
    });

    return () => {
      isActive = false;

      stopTyping();
      clearRemoteTypingTimeout();

      socket.off("message:new", handleNewMessage);

      socket.off("message:updated", handleMessageUpdated);

      socket.off("conversation:read", handleConversationRead);

      socket.off("typing:update", handleTypingUpdate);

      socket.off("message:deleted", handleMessageDeleted);

      socket.off("conversation:preferences-updated", handlePreferencesUpdate);

      setIsOtherUserTyping(false);

      if (socket.connected) {
        socket.emit("conversation:leave", conversationId);
      }
    };
  }, [socket, isConnected, conversationId, currentUserId, stopTyping]);

  useEffect(() => {
    if (!isLoading) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [isLoading, messages.length]);

  useEffect(() => {
    if (!highlightedMessageId) {
      return;
    }

    document.getElementById(`message-${highlightedMessageId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    const timeoutId = window.setTimeout(() => {
      setHighlightedMessageId(null);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [highlightedMessageId, messages]);

  useEffect(() => {
    if (!isMessageSearchOpen) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      messageSearchInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isMessageSearchOpen]);

  useEffect(() => {
    if (!isMessageSearchOpen) {
      return;
    }

    const query = messageSearchQuery.trim();

    if (!query) {
      return;
    }

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      setIsSearchingMessages(true);
      setMessageSearchError(null);

      void searchConversationMessages(conversationId, query, controller.signal)
        .then((results) => {
          if (controller.signal.aborted) {
            return;
          }

          setMessageSearchResults(results.map(normalizeMessage));
          setHasMessageSearchRun(true);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            return;
          }

          setMessageSearchResults([]);
          setMessageSearchError(getApiErrorMessage(error));
          setHasMessageSearchRun(false);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearchingMessages(false);
          }
        });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [conversationId, isMessageSearchOpen, messageSearchQuery]);

  useEffect(
    () => () => {
      if (messageSearchResetTimeoutRef.current !== null) {
        window.clearTimeout(messageSearchResetTimeoutRef.current);
      }
    },
    [],
  );

  const handleLoadOlder = async (): Promise<void> => {
    if (!nextCursor || isLoadingOlder) {
      return;
    }

    try {
      setIsLoadingOlder(true);

      const result = await getConversationMessages(conversationId, nextCursor);

      setMessages((current) => [
        ...result.messages.map(normalizeMessage),
        ...current,
      ]);

      setNextCursor(result.nextCursor);

      setHasMore(result.hasMore);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleScrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });

    setShowScrollToBottom(false);
  };

  const closeMessageSearch = (): void => {
    setIsMessageSearchOpen(false);
    if (messageSearchResetTimeoutRef.current !== null) {
      window.clearTimeout(messageSearchResetTimeoutRef.current);
    }

    messageSearchResetTimeoutRef.current = window.setTimeout(() => {
      setMessageSearchQuery("");
      setMessageSearchResults([]);
      setMessageSearchError(null);
      setHasMessageSearchRun(false);
      messageSearchResetTimeoutRef.current = null;
    }, 250);
  };

  const openMessageSearch = (): void => {
    if (messageSearchResetTimeoutRef.current !== null) {
      window.clearTimeout(messageSearchResetTimeoutRef.current);
      messageSearchResetTimeoutRef.current = null;
    }

    setIsMessageSearchOpen(true);
  };

  const handleMessageSearchResult = async (
    message: ChatMessage,
  ): Promise<void> => {
    if (isSearchingMessages) {
      return;
    }

    try {
      setIsSearchingMessages(true);
      setMessageSearchError(null);

      const context = await getConversationMessageContext(
        conversationId,
        message._id,
      );

      setMessages((currentMessages) => {
        const messagesById = new Map(
          currentMessages.map((currentMessage) => [
            currentMessage._id,
            currentMessage,
          ]),
        );

        for (const contextMessage of context) {
          const normalizedMessage = normalizeMessage(contextMessage);

          messagesById.set(normalizedMessage._id, normalizedMessage);
        }

        return [...messagesById.values()].sort(
          (firstMessage, secondMessage) =>
            new Date(firstMessage.createdAt).getTime() -
            new Date(secondMessage.createdAt).getTime(),
        );
      });

      setHighlightedMessageId(message._id);
      closeMessageSearch();
    } catch (error) {
      setMessageSearchError(getApiErrorMessage(error));
    } finally {
      setIsSearchingMessages(false);
    }
  };

  const handleMessageChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ): void => {
    const value = event.target.value;

    setMessageText(value);

    if (editingMessageId) {
      stopTyping();
      return;
    }

    if (currentUserId) {
      saveConversationDraft(currentUserId, conversationId, value);
    }

    if (!socket.connected || !value.trim()) {
      stopTyping();
      return;
    }

    const now = Date.now();

    if (!isTypingRef.current || now - lastTypingEmitAtRef.current >= 1000) {
      socket.emit("typing:start", conversationId);

      isTypingRef.current = true;
      lastTypingEmitAtRef.current = now;
    }

    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(stopTyping, 1200);
  };

  const handleStartReplying = (message: ChatMessage): void => {
    if (message.deletedForEveryoneAt) {
      return;
    }

    editingMessageIdRef.current = null;

    setEditingMessageId(null);
    setReplyingToMessage(message);
    setOpenMessageMenuId(null);
    setReactionPickerMessageId(null);
    // setMessageText("");

    stopTyping();

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  };

  const handleCancelReplying = (): void => {
    setReplyingToMessage(null);

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  };

  const handleStartEditing = (message: ChatMessage): void => {
    if (message.sender._id !== currentUserId || message.deletedForEveryoneAt) {
      return;
    }

    stopTyping();

    editingMessageIdRef.current = message._id;

    setEditingMessageId(message._id);
    setMessageText(message.content);
    setOpenMessageMenuId(null);
    setReactionPickerMessageId(null);
    setReplyingToMessage(null);

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();

      messageInputRef.current?.setSelectionRange(
        message.content.length,
        message.content.length,
      );
    });
  };

  const handleCancelEditing = (): void => {
    if (isEditingMessage) return;

    editingMessageIdRef.current = null;

    setEditingMessageId(null);
    restoreCurrentDraft();

    stopTyping();

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  };

  const deliverPendingMessage = (clientMessageId: string): void => {
    const pendingDelivery = pendingDeliveriesRef.current.get(clientMessageId);

    if (!pendingDelivery || pendingDelivery.isInFlight) {
      return;
    }

    pendingDelivery.isInFlight = true;

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.clientMessageId === clientMessageId
          ? {
              ...message,
              deliveryStatus: "sending",
              deliveryError: null,
            }
          : message,
      ),
    );

    void pendingDelivery
      .send()
      .then((sentMessage) => {
        if (
          pendingDeliveriesRef.current.get(clientMessageId) ===
          pendingDelivery
        ) {
          pendingDeliveriesRef.current.delete(clientMessageId);
          pendingDelivery.releasePreviewUrl?.();
        }

        setMessages((currentMessages) =>
          replaceMessage(currentMessages, sentMessage),
        );
      })
      .catch((error: unknown) => {
        if (
          pendingDeliveriesRef.current.get(clientMessageId) !==
          pendingDelivery
        ) {
          return;
        }

        pendingDelivery.isInFlight = false;
        const deliveryError = getApiErrorMessage(error);

        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.clientMessageId === clientMessageId
              ? {
                  ...message,
                  deliveryStatus: "failed",
                  deliveryError,
                  uploadProgress: null,
                }
              : message,
          ),
        );
      });
  };

  const queueOptimisticMessage = (
    message: ChatMessage,
    pendingDelivery: PendingDelivery,
  ): void => {
    const clientMessageId = message.clientMessageId;

    if (!clientMessageId) {
      return;
    }

    pendingDeliveriesRef.current.set(clientMessageId, pendingDelivery);

    setMessages((currentMessages) =>
      addMessageIfMissing(currentMessages, message),
    );

    window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    });

    deliverPendingMessage(clientMessageId);
  };

  const createOptimisticMessage = ({
    clientMessageId,
    content,
    replyToMessageId,
    attachment,
    type = "text",
    uploadProgress = null,
  }: {
    clientMessageId: string;
    content: string;
    replyToMessageId: string | null;
    attachment?: MessageAttachment | null;
    type?: "text" | "image" | "file" | "audio";
    uploadProgress?: number | null;
  }): ChatMessage | null => {
    if (!user || !currentUserId) {
      return null;
    }

    const replyTo =
      replyingToMessage?._id === replyToMessageId
        ? createReplyPreview(replyingToMessage)
        : (messages.find((message) => message._id === replyToMessageId)
            ? createReplyPreview(
                messages.find((message) => message._id === replyToMessageId)!,
              )
            : null);
    const now = new Date().toISOString();

    return {
      _id: "temporary-" + clientMessageId,
      conversation: conversationId,
      sender: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      clientMessageId,
      type,
      content,
      attachment: attachment ?? null,
      linkPreview: null,
      replyTo,
      isForwarded: false,
      deliveredTo: [user._id],
      readBy: [user._id],
      reactions: [],
      editedAt: null,
      deletedFor: [],
      deletedForEveryoneAt: null,
      createdAt: now,
      updatedAt: now,
      deliveryStatus: "sending",
      deliveryError: null,
      uploadProgress,
    };
  };

  const handleRetryMessage = (message: ChatMessage): void => {
    if (!message.clientMessageId || message.deliveryStatus !== "failed") {
      return;
    }

    if (!pendingDeliveriesRef.current.has(message.clientMessageId)) {
      toast.error("This message can no longer be retried. Please send it again.");
      return;
    }

    deliverPendingMessage(message.clientMessageId);
  };

  const handleAttachmentQueued = (
    file: File,
    content: string,
    replyToMessageId: string | null,
  ): void => {
    const clientMessageId = createClientMessageId();
    const previewUrl = URL.createObjectURL(file);
    const optimisticMessage = createOptimisticMessage({
      clientMessageId,
      content,
      replyToMessageId,
      attachment: createLocalAttachment(file, previewUrl),
      type: getAttachmentMessageType(file),
      uploadProgress: 0,
    });

    if (!optimisticMessage) {
      URL.revokeObjectURL(previewUrl);
      return;
    }

    queueOptimisticMessage(optimisticMessage, {
      send: () =>
        sendConversationAttachment(
          conversationId,
          file,
          content,
          replyToMessageId,
          clientMessageId,
          (progressPercentage) => {
            setMessages((currentMessages) =>
              currentMessages.map((message) =>
                message.clientMessageId === clientMessageId
                  ? {
                      ...message,
                      uploadProgress: progressPercentage,
                    }
                  : message,
              ),
            );
          },
        ),
      releasePreviewUrl: () => URL.revokeObjectURL(previewUrl),
    });

    setReplyingToMessage(null);
  };

  const handleVoiceNoteQueued = (
    file: File,
    replyToMessageId: string | null,
  ): void => {
    handleAttachmentQueued(file, "", replyToMessageId);
  };

  const handleSendMessage = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (
      conversation?.type === "direct" &&
      conversation.directMessagingAccess?.canMessage === false
    ) {
      toast.error("Messaging is unavailable in this conversation.");
      return;
    }

    const content = messageText.trim();

    if (!content || isEditingMessage) {
      return;
    }

    stopTyping();

    if (editingMessageId) {
      try {
        setIsEditingMessage(true);

        const updatedMessage = await editConversationMessage(
          conversationId,
          editingMessageId,
          content,
        );

        setMessages((current) => replaceMessage(current, updatedMessage));

        editingMessageIdRef.current = null;

        setEditingMessageId(null);
        restoreCurrentDraft();

        toast.success("Message edited successfully");
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setIsEditingMessage(false);
      }

      return;
    }

    const clientMessageId = createClientMessageId();
    const replyToMessageId = replyingToMessage?._id ?? null;
    const optimisticMessage = createOptimisticMessage({
      clientMessageId,
      content,
      replyToMessageId,
    });

    if (!optimisticMessage) {
      return;
    }

    queueOptimisticMessage(optimisticMessage, {
      send: () =>
        sendConversationMessage(
          conversationId,
          content,
          replyToMessageId,
          clientMessageId,
        ),
    });

    if (currentUserId) {
      clearConversationDraft(currentUserId, conversationId);
    }

    setMessageText("");
    setReplyingToMessage(null);
  };

  const handleMessageReaction = async (
    message: ChatMessage,
    emoji: MessageReactionEmoji,
  ): Promise<void> => {
    if (
      !currentUserId ||
      reactingMessageId !== null ||
      message.deletedForEveryoneAt
    ) {
      return;
    }

    const reactions = Array.isArray(message.reactions) ? message.reactions : [];

    const currentUserReaction = reactions.find(
      (reaction) => reaction.user === currentUserId,
    );

    const nextEmoji = currentUserReaction?.emoji === emoji ? null : emoji;

    setReactionPickerMessageId(null);
    setOpenMessageMenuId(null);

    try {
      setReactingMessageId(message._id);

      const updatedMessage = await updateConversationMessageReaction(
        conversationId,
        message._id,
        nextEmoji,
      );

      setMessages((current) => replaceMessage(current, updatedMessage));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setReactingMessageId(null);
    }
  };

  const handleStartForwarding = (message: ChatMessage): void => {
    if (message.deletedForEveryoneAt) {
      return;
    }

    setOpenMessageMenuId(null);
    setReactionPickerMessageId(null);
    setForwardingMessages([message]);
  };

  const handleSelectMessage = (message: ChatMessage): void => {
    if (message.deliveryStatus || message.deletedForEveryoneAt) {
      return;
    }

    setOpenMessageMenuId(null);
    setReactionPickerMessageId(null);

    setSelectedMessageIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      if (nextSelection.has(message._id)) {
        nextSelection.delete(message._id);
      } else {
        nextSelection.add(message._id);
      }

      return nextSelection;
    });
  };

  const handleCancelMessageSelection = (): void => {
    if (isBulkActionWorking) {
      return;
    }

    setSelectedMessageIds(new Set());
  };

  const handleForwardSelectedMessages = (): void => {
    const selectedMessages = messages.filter((message) =>
      selectedMessageIds.has(message._id),
    );

    if (selectedMessages.length === 0) {
      return;
    }

    setForwardingMessages(selectedMessages);
    setSelectedMessageIds(new Set());
  };

  const executeDeleteSelectedMessages = async (
    scope: DeleteMessageScope,
    messageIds: string[],
  ): Promise<void> => {
    if (!currentUserId || isBulkActionWorking) {
      return;
    }

    const selectedMessages = messages.filter((message) =>
      messageIds.includes(message._id),
    );

    if (selectedMessages.length === 0) {
      return;
    }

    try {
      setIsBulkActionWorking(true);

      const results = await Promise.allSettled(
        selectedMessages.map((message) =>
          deleteConversationMessage(conversationId, message._id, scope),
        ),
      );
      const deletionPayloads = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );

      if (deletionPayloads.length === 0) {
        const firstFailure = results.find(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        );

        throw firstFailure?.reason ?? new Error("Could not delete messages");
      }

      setMessages((currentMessages) =>
        deletionPayloads.reduce(
          (nextMessages, deletionPayload) =>
            applyMessageDeletion(
              nextMessages,
              deletionPayload,
              currentUserId,
            ),
          currentMessages,
        ),
      );

      setSelectedMessageIds(new Set());
      toast.success(
        deletionPayloads.length === selectedMessages.length
          ? `${deletionPayloads.length} messages deleted`
          : `${deletionPayloads.length} messages deleted; some could not be changed`,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsBulkActionWorking(false);
    }
  };

  const handleMessagesForwarded = (forwardedMessages: ChatMessage[]): void => {
    const messagesForCurrentConversation = forwardedMessages.filter(
      (forwardedMessage) => forwardedMessage.conversation === conversationId,
    );

    if (messagesForCurrentConversation.length === 0) {
      return;
    }

    setMessages((currentMessages) =>
      messagesForCurrentConversation.reduce(
        (nextMessages, forwardedMessage) =>
          addMessageIfMissing(nextMessages, forwardedMessage),
        currentMessages,
      ),
    );

    window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    });
  };

  const executeDeleteMessage = async (
    messageId: string,
    scope: DeleteMessageScope,
  ): Promise<void> => {
    if (deletingMessageId || !currentUserId) {
      return;
    }

    setOpenMessageMenuId(null);

    try {
      setDeletingMessageId(messageId);

      const result = await deleteConversationMessage(
        conversationId,
        messageId,
        scope,
      );

      setMessages((current) =>
        applyMessageDeletion(current, result, currentUserId),
      );

      if (editingMessageIdRef.current === messageId) {
        editingMessageIdRef.current = null;

        setEditingMessageId(null);
        restoreCurrentDraft();
      }

      setReactionPickerMessageId((current) =>
        current === messageId ? null : current,
      );

      setReplyingToMessage((current) =>
        current?._id === messageId ? null : current,
      );

      toast.success(
        scope === "everyone"
          ? "Message deleted for everyone"
          : "Message deleted for you",
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setDeletingMessageId(null);
    }
  };

  const requestDeleteMessage = (
    messageId: string,
    scope: DeleteMessageScope,
  ): void => {
    setOpenMessageMenuId(null);
    setMessageDeletionRequest({
      messageIds: [messageId],
      scope,
    });
  };

  const requestDeleteSelectedMessages = (scope: DeleteMessageScope): void => {
    const messageIds = messages
      .filter((message) => selectedMessageIds.has(message._id))
      .map((message) => message._id);

    if (messageIds.length > 0) {
      setMessageDeletionRequest({ messageIds, scope });
    }
  };

  const confirmMessageDeletion = async (): Promise<void> => {
    const request = messageDeletionRequest;

    if (!request) {
      return;
    }

    if (request.messageIds.length === 1) {
      await executeDeleteMessage(request.messageIds[0]!, request.scope);
    } else {
      await executeDeleteSelectedMessages(request.scope, request.messageIds);
    }

    setMessageDeletionRequest(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center gap-3 bg-slate-50 text-slate-500">
        <LoaderCircle className="h-6 w-6 animate-spin text-cyan-600" />
        Loading conversation...
      </div>
    );
  }

  if (errorMessage || !conversation || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 p-6 text-center">
        <div>
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />

          <p className="mt-4 font-medium text-red-700">
            {errorMessage ?? "Conversation could not be loaded"}
          </p>

          <Link
            href="/chats"
            className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          >
            Return to chats
          </Link>
        </div>
      </div>
    );
  }

  const otherParticipant = getOtherParticipant(conversation, user._id);

  const updatedOtherProfile = otherParticipant
    ? updatedProfiles.get(otherParticipant._id)
    : undefined;

  const displayName =
    conversation.type === "group"
      ? (conversation.name ?? "Unnamed group")
      : (updatedOtherProfile?.name ?? otherParticipant?.name ?? "Unknown user");

  const isDirectConversation = conversation.type === "direct";

  const directMessagingAccess = conversation.directMessagingAccess;

  const isMessagingDisabled =
    isDirectConversation && directMessagingAccess?.canMessage === false;

  const messagingDisabledMessage = directMessagingAccess?.isBlockedByCurrentUser
    ? "You blocked this user. Unblock them to send a message."
    : "Messaging is unavailable in this conversation.";

  const otherParticipantId = otherParticipant?._id;

  const isOtherUserOnline =
    isDirectConversation &&
    Boolean(otherParticipantId && onlineUserIds.has(otherParticipantId));

  const otherUserLastSeenAt = otherParticipantId
    ? (lastSeenByUser.get(otherParticipantId) ?? otherParticipant?.lastSeenAt)
    : null;

  const selectedMessages = messages.filter((message) =>
    selectedMessageIds.has(message._id),
  );
  const canDeleteSelectedForEveryone =
    selectedMessages.length > 0 &&
    selectedMessages.every(
      (message) =>
        message.sender._id === currentUserId && !message.deletedForEveryoneAt,
    );

  const mediaGalleryRefreshKey = messages
    .map(
      (message) =>
        `${message._id}:${message.updatedAt}:${message.deletedForEveryoneAt ?? ""}`,
    )
    .join("|");

  return (
    <section className="relative flex h-full min-w-0 w-full flex-col overflow-hidden bg-[var(--chat-surface)]">
      <ConversationHeader
        displayName={displayName}
        avatarUrl={
          conversation.type === "direct"
            ? (updatedOtherProfile?.avatarUrl ??
              otherParticipant?.avatarUrl ??
              null)
            : null
        }
        canViewProfile={Boolean(otherParticipantId)}
        isOtherUserOnline={isOtherUserOnline}
        statusText={
          isDirectConversation
            ? formatLastSeen(otherUserLastSeenAt)
            : "Group conversation"
        }
        isMessageSearchOpen={isMessageSearchOpen}
        onViewProfile={() => {
          if (otherParticipantId) {
            router.push(`/users/${otherParticipantId}`);
          }
        }}
        onOpenSearch={openMessageSearch}
        onOpenMediaGallery={() => setIsMediaGalleryOpen(true)}
        onStartAudioCall={
          isDirectConversation
            ? () => toast.info("Audio calling is coming soon.")
            : undefined
        }
      />

      {selectedMessageIds.size > 0 && (
        <MessageBulkActionBar
          selectedCount={selectedMessages.length}
          canDeleteForEveryone={canDeleteSelectedForEveryone}
          isWorking={isBulkActionWorking}
          onCancel={handleCancelMessageSelection}
          onForward={handleForwardSelectedMessages}
          onDeleteForMe={() => {
            requestDeleteSelectedMessages("me");
          }}
          onDeleteForEveryone={() => {
            requestDeleteSelectedMessages("everyone");
          }}
        />
      )}

      <ConversationMessageList
        messages={messages}
        currentUser={user}
        otherParticipantId={otherParticipantId}
        updatedProfiles={updatedProfiles}
        displayName={displayName}
        isOtherUserTyping={isOtherUserTyping}
        hasMore={hasMore}
        isLoadingOlder={isLoadingOlder}
        showFloatingDate={showFloatingDate}
        floatingDate={floatingDate}
        showScrollToBottom={showScrollToBottom}
        highlightedMessageId={highlightedMessageId}
        openMessageMenuId={openMessageMenuId}
        reactionPickerMessageId={reactionPickerMessageId}
        deletingMessageId={deletingMessageId}
        reactingMessageId={reactingMessageId}
        selectedMessageIds={selectedMessageIds}
        messagesContainerRef={messagesContainerRef}
        messagesEndRef={messagesEndRef}
        onScroll={handleMessagesScroll}
        onScrollToBottom={handleScrollToBottom}
        onLoadOlder={() => {
          void handleLoadOlder();
        }}
        onToggleMenu={(messageId) => {
          setReactionPickerMessageId(null);
          setOpenMessageMenuId((current) =>
            current === messageId ? null : messageId,
          );
        }}
        onToggleReactionPicker={(messageId) => {
          setOpenMessageMenuId(null);
          setReactionPickerMessageId((current) =>
            current === messageId ? null : messageId,
          );
        }}
        onCloseMenu={() => setOpenMessageMenuId(null)}
        onCloseReactionPicker={() => setReactionPickerMessageId(null)}
        onReply={handleStartReplying}
        onForward={handleStartForwarding}
        onEdit={handleStartEditing}
        onDelete={(messageId, scope) => {
          requestDeleteMessage(messageId, scope);
        }}
        onReaction={(message, emoji) => {
          void handleMessageReaction(message, emoji);
        }}
        onRetry={handleRetryMessage}
        onSelect={handleSelectMessage}
      />
      <ConversationComposer
        messageInputRef={messageInputRef}
        messageText={messageText}
        replyingToMessage={replyingToMessage}
        replySenderName={
          replyingToMessage?.sender._id === user._id
            ? "yourself"
            : replyingToMessage
              ? (updatedProfiles.get(replyingToMessage.sender._id)?.name ??
                replyingToMessage.sender.name)
              : ""
        }
        editingMessageId={editingMessageId}
        isEditingMessage={isEditingMessage}
        isMessagingDisabled={isMessagingDisabled}
        messagingDisabledMessage={messagingDisabledMessage}
        onManageMessaging={
          directMessagingAccess?.isBlockedByCurrentUser && otherParticipantId
            ? () => router.push("/users/" + otherParticipantId)
            : undefined
        }
        onSubmit={handleSendMessage}
        onMessageChange={handleMessageChange}
        onCancelReplying={handleCancelReplying}
        onCancelEditing={handleCancelEditing}
        onAttachmentQueued={handleAttachmentQueued}
        onVoiceNoteQueued={handleVoiceNoteQueued}
      />

      {currentUserId && (
        <ForwardMessageModal
          messages={forwardingMessages}
          sourceConversationId={conversationId}
          currentUserId={currentUserId}
          onClose={() => setForwardingMessages([])}
          onForwarded={handleMessagesForwarded}
        />
      )}

      <MessageSearchDrawer
        isOpen={isMessageSearchOpen}
        inputRef={messageSearchInputRef}
        query={messageSearchQuery}
        results={messageSearchResults}
        isSearching={isSearchingMessages}
        hasSearchRun={hasMessageSearchRun}
        errorMessage={messageSearchError}
        currentUserId={user._id}
        onClose={closeMessageSearch}
        onQueryChange={(event) => {
          setMessageSearchQuery(event.target.value);
          setMessageSearchError(null);
          setMessageSearchResults([]);
          setHasMessageSearchRun(false);
        }}
        onSelectResult={(message) => {
          void handleMessageSearchResult(message);
        }}
      />

      <MediaGalleryDrawer
        isOpen={isMediaGalleryOpen}
        conversationId={conversationId}
        currentUserId={user._id}
        refreshKey={mediaGalleryRefreshKey}
        onClose={() => setIsMediaGalleryOpen(false)}
      />

      <ConfirmModal
        isOpen={Boolean(messageDeletionRequest)}
        title={
          messageDeletionRequest?.scope === "everyone"
            ? "Delete message for everyone?"
            : "Delete message for you?"
        }
        description={
          messageDeletionRequest?.scope === "everyone"
            ? "This will remove the selected message from the chat for every participant."
            : "This will remove the selected message from your chat only."
        }
        confirmLabel={
          messageDeletionRequest && messageDeletionRequest.messageIds.length > 1
            ? `Delete ${messageDeletionRequest.messageIds.length} messages`
            : "Delete message"
        }
        isConfirming={Boolean(deletingMessageId || isBulkActionWorking)}
        onConfirm={() => void confirmMessageDeletion()}
        onClose={() => setMessageDeletionRequest(null)}
      />

      {/* Call history is temporarily hidden while audio calling is unavailable. */}
    </section>
  );
}
