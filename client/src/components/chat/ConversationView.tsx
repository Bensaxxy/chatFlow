"use client";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  LoaderCircle,
  MessageCircleMore,
  MoreVertical,
  Pencil,
  Reply,
  SendHorizontal,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { toast } from "react-toastify";

import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getConversationById } from "@/services/conversation.service";
import {
  deleteConversationMessage,
  editConversationMessage,
  getConversationMessages,
  markConversationRead,
  sendConversationMessage,
  updateConversationMessageReaction,
} from "@/services/message.service";
import type {
  Conversation,
  ConversationParticipant,
} from "@/types/conversation";
import {
  MESSAGE_REACTION_EMOJIS,
  type ChatMessage,
  type DeleteMessageScope,
  type MessageDeletedPayload,
  type MessageReactionEmoji,
  type RepliedMessage,
} from "@/types/message";
import UserAvatar from "./UserAvatar";
import { useRouter } from "next/navigation";

interface ConversationViewProps {
  conversationId: string;
}

const formatMessageTime = (value: string): string =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const isSameCalendarDay = (
  firstValue: string,
  secondValue: string,
): boolean => {
  const firstDate = new Date(firstValue);
  const secondDate = new Date(secondValue);

  return firstDate.toDateString() === secondDate.toDateString();
};

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
        deletedFor: Array.isArray(replyTo.deletedFor) ? replyTo.deletedFor : [],
      }
    : null;

const normalizeMessage = (message: ChatMessage): ChatMessage => ({
  ...message,
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

  const messageAlreadyExists = currentMessages.some(
    (message) => message._id === normalizedMessage._id,
  );

  if (messageAlreadyExists) {
    return currentMessages;
  }

  return [...currentMessages, normalizedMessage];
};

const createReplyPreview = (message: ChatMessage): RepliedMessage => ({
  _id: message._id,
  content: message.content,
  sender: message.sender,
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
    if (message._id === normalizedMessage._id) {
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

  const { socket, isConnected, onlineUserIds, lastSeenByUser } = useSocket();

  const currentUserId = user?._id;

  const [conversation, setConversation] = useState<Conversation | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [messageText, setMessageText] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const [isSending, setIsSending] = useState(false);

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

  const [showFloatingDate, setShowFloatingDate] = useState(false);

  const [floatingDate, setFloatingDate] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const messageInputRef = useRef<HTMLInputElement | null>(null);

  const typingTimeoutRef = useRef<number | null>(null);

  const remoteTypingTimeoutRef = useRef<number | null>(null);

  const floatingDateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const editingMessageIdRef = useRef<string | null>(null);

  const lastTypingEmitAtRef = useRef(0);
  const isTypingRef = useRef(false);

  const handleMessagesScroll = useCallback((): void => {
    const container = messagesContainerRef.current;

    if (!container) return;

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

    editingMessageIdRef.current = null;
    setEditingMessageId(null);
    setMessageText("");
    setReactionPickerMessageId(null);
    setReactingMessageId(null);
    setReplyingToMessage(null);

    const loadConversation = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [conversationResult, messageResult] = await Promise.all([
          getConversationById(conversationId, controller.signal),
          getConversationMessages(conversationId, null, controller.signal),
        ]);

        if (controller.signal.aborted) return;

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
  }, [conversationId]);

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
    if (!isConnected || !currentUserId) return;

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

          if (readBy.includes(payload.userId)) {
            return message;
          }

          return {
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

    socket.on("message:new", handleNewMessage);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("conversation:read", handleConversationRead);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("message:deleted", handleMessageDeleted);

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

  const handleLoadOlder = async (): Promise<void> => {
    if (!nextCursor || isLoadingOlder) return;

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

  const handleMessageChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;

    setMessageText(value);

    if (editingMessageId) {
      stopTyping();
      return;
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
    if (message.deletedForEveryoneAt) return;

    editingMessageIdRef.current = null;

    setEditingMessageId(null);
    setReplyingToMessage(message);
    setOpenMessageMenuId(null);
    setReactionPickerMessageId(null);
    setMessageText("");

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
    setMessageText("");

    stopTyping();

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  };

  const handleSendMessage = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    const content = messageText.trim();

    if (!content || isSending || isEditingMessage) {
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
        setMessageText("");

        toast.success("Message edited successfully");
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setIsEditingMessage(false);
      }

      return;
    }

    try {
      setIsSending(true);

      const newMessage = await sendConversationMessage(
        conversationId,
        content,
        replyingToMessage?._id ?? null,
      );

      setMessages((current) => addMessageIfMissing(current, newMessage));

      setMessageText("");
      setReplyingToMessage(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSending(false);
    }
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

  const handleDeleteMessage = async (
    messageId: string,
    scope: DeleteMessageScope,
  ): Promise<void> => {
    if (deletingMessageId || !currentUserId) return;

    setOpenMessageMenuId(null);

    const confirmed = window.confirm(
      scope === "everyone"
        ? "Delete this message for everyone?"
        : "Delete this message for you?",
    );

    if (!confirmed) return;

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
        setMessageText("");
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

  const displayName =
    conversation.type === "group"
      ? (conversation.name ?? "Unnamed group")
      : (otherParticipant?.name ?? "Unknown user");

  const isDirectConversation = conversation.type === "direct";

  const otherParticipantId = otherParticipant?._id;

  const isOtherUserOnline =
    isDirectConversation &&
    Boolean(otherParticipantId && onlineUserIds.has(otherParticipantId));

  const otherUserLastSeenAt = otherParticipantId
    ? (lastSeenByUser.get(otherParticipantId) ?? otherParticipant?.lastSeenAt)
    : null;

  return (
    <section className="flex h-full w-full flex-col bg-white">
      <header className="flex h-20 shrink-0 items-center gap-3 border-b border-slate-200 px-4 sm:px-6">
        <Link
          href="/chats"
          aria-label="Back to conversations"
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100 md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <button
          type="button"
          disabled={!otherParticipantId}
          onClick={() => {
            if (otherParticipantId) {
              router.push(`/users/${otherParticipantId}`);
            }
          }}
          aria-label={`View ${displayName}'s profile`}
          title={`View ${displayName}'s profile`}
          className="relative shrink-0 rounded-full disabled:cursor-default"
        >
          <UserAvatar
            name={displayName}
            avatarUrl={
              conversation.type === "direct"
                ? otherParticipant?.avatarUrl
                : null
            }
            className="h-11 w-11"
            fallbackClassName="bg-cyan-100 font-semibold text-cyan-800"
          />

          {isOtherUserOnline && (
            <span
              title="Online"
              aria-label="Online"
              className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm"
            />
          )}
        </button>

        <div className="min-w-0">
          <h1 className="truncate font-semibold text-slate-950">
            {displayName}
          </h1>

          {isOtherUserTyping ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-cyan-600">
              <span>Typing</span>

              <span className="flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-600 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-600 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-600" />
              </span>
            </div>
          ) : isOtherUserOnline ? (
            <p className="truncate text-xs font-medium text-emerald-600">
              Online
            </p>
          ) : isDirectConversation ? (
            <p className="truncate text-xs text-slate-500">
              {formatLastSeen(otherUserLastSeenAt)}
            </p>
          ) : (
            <p className="truncate text-xs text-slate-500">
              Group conversation
            </p>
          )}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="h-full overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6"
        >
          {hasMore && (
            <div className="mb-5 text-center">
              <button
                type="button"
                onClick={handleLoadOlder}
                disabled={isLoadingOlder}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                {isLoadingOlder && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Load older messages
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <MessageCircleMore className="mx-auto h-12 w-12 text-slate-300" />

                <p className="mt-4 font-medium text-slate-700">
                  No messages yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Send the first message to {displayName}.
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
              {messages.map((message, messageIndex) => {
                const isMine = message.sender._id === user._id;

                const senderName = message.sender.name || "Unknown user";

                const recipientId = otherParticipant?._id;

                const readBy = Array.isArray(message.readBy)
                  ? message.readBy
                  : [];

                const deliveredTo = Array.isArray(message.deliveredTo)
                  ? message.deliveredTo
                  : [];

                const isReadByRecipient = recipientId
                  ? readBy.includes(recipientId)
                  : readBy.length > 1;

                const isDeliveredToRecipient = recipientId
                  ? deliveredTo.includes(recipientId)
                  : deliveredTo.length > 1;

                const receiptLabel = isReadByRecipient
                  ? "Read"
                  : isDeliveredToRecipient
                    ? "Delivered"
                    : "Sent";

                const isDeletedForEveryone = Boolean(
                  message.deletedForEveryoneAt,
                );

                const isDeleting = deletingMessageId === message._id;

                const isMenuOpen = openMessageMenuId === message._id;

                const isReactionPickerOpen =
                  reactionPickerMessageId === message._id;

                const isReacting = reactingMessageId === message._id;

                const reactions = Array.isArray(message.reactions)
                  ? message.reactions
                  : [];

                const currentUserReaction = reactions.find(
                  (reaction) => reaction.user === user._id,
                );

                const groupedReactions = MESSAGE_REACTION_EMOJIS.map(
                  (emoji) => ({
                    emoji,
                    count: reactions.filter(
                      (reaction) => reaction.emoji === emoji,
                    ).length,
                  }),
                ).filter(({ count }) => count > 0);

                const reactionButton = !isDeletedForEveryone ? (
                  <button
                    type="button"
                    disabled={isReacting}
                    onClick={() => {
                      setOpenMessageMenuId(null);
                      setReactionPickerMessageId(
                        isReactionPickerOpen ? null : message._id,
                      );
                    }}
                    aria-label="React to message"
                    title="React to message"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isMine
                        ? "border-cyan-200 bg-white text-cyan-700 hover:bg-cyan-50"
                        : "border-slate-200 bg-white text-slate-500 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
                    }`}
                  >
                    {isReacting ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <SmilePlus className="h-4 w-4" />
                    )}
                  </button>
                ) : null;

                const previousMessage = messages[messageIndex - 1];

                const showDateSeparator =
                  !previousMessage ||
                  !isSameCalendarDay(
                    previousMessage.createdAt,
                    message.createdAt,
                  );

                return (
                  <Fragment key={message._id}>
                    {showDateSeparator && (
                      <div className="my-2 flex justify-center">
                        <span className="rounded-full bg-slate-200/80 px-3 py-1 text-[11px] font-medium text-slate-600">
                          {formatMessageDateLabel(message.createdAt)}
                        </span>
                      </div>
                    )}

                    <div
                      data-message-date={message.createdAt}
                      className={`flex w-full items-end gap-2 ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isMine && (
                        <UserAvatar
                          name={senderName}
                          avatarUrl={message.sender.avatarUrl}
                          className="h-8 w-8 text-xs"
                          fallbackClassName="bg-slate-200 font-semibold text-slate-700"
                        />
                      )}

                      {isMine && reactionButton}

                      <div
                        className={`relative min-w-0 max-w-[75%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[60%] lg:max-w-[55%] ${
                          isMine
                            ? "rounded-br-md bg-cyan-600 text-white"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-900"
                        }`}
                      >
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => {
                            setReactionPickerMessageId(null);

                            setOpenMessageMenuId(
                              isMenuOpen ? null : message._id,
                            );
                          }}
                          aria-label="Message options"
                          title="Message options"
                          className={`absolute right-1 top-1 z-30 flex h-7 w-7 items-center justify-center rounded-full transition disabled:opacity-50 ${
                            isMine
                              ? "text-cyan-100 hover:bg-cyan-500 hover:text-white"
                              : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          }`}
                        >
                          {isDeleting ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </button>

                        {isReactionPickerOpen && !isDeletedForEveryone && (
                          <>
                            <button
                              type="button"
                              aria-label="Close reaction picker"
                              onClick={() => setReactionPickerMessageId(null)}
                              className="fixed inset-0 z-40 cursor-default"
                            />

                            <div
                              className={`absolute z-50 flex items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-white p-1.5 shadow-xl ${
                                isMine ? "right-1" : "left-1"
                              } ${
                                messageIndex >= messages.length - 2
                                  ? "bottom-9"
                                  : "top-9"
                              }`}
                            >
                              {MESSAGE_REACTION_EMOJIS.map((emoji) => {
                                const isSelected =
                                  currentUserReaction?.emoji === emoji;

                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    disabled={isReacting}
                                    onClick={() =>
                                      void handleMessageReaction(message, emoji)
                                    }
                                    aria-label={`React with ${emoji}`}
                                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xl transition hover:scale-110 hover:bg-slate-100 disabled:opacity-50 ${
                                      isSelected
                                        ? "bg-cyan-100 ring-2 ring-cyan-500"
                                        : ""
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {isMenuOpen && (
                          <>
                            <button
                              type="button"
                              aria-label="Close message menu"
                              onClick={() => setOpenMessageMenuId(null)}
                              className="fixed inset-0 z-40 cursor-default"
                            />

                            <div
                              className={`absolute right-1 z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left text-sm text-slate-700 shadow-xl ${
                                messageIndex >= messages.length - 2
                                  ? "bottom-9"
                                  : "top-9"
                              }`}
                            >
                              {!isDeletedForEveryone && (
                                <button
                                  type="button"
                                  onClick={() => handleStartReplying(message)}
                                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-slate-50"
                                >
                                  <Reply className="h-4 w-4 text-slate-500" />
                                  Reply
                                </button>
                              )}

                              {isMine && !isDeletedForEveryone && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditing(message)}
                                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-slate-50"
                                >
                                  <Pencil className="h-4 w-4 text-slate-500" />
                                  Edit message
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteMessage(message._id, "me")
                                }
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-slate-50"
                              >
                                <Trash2 className="h-4 w-4 text-slate-500" />
                                Delete for me
                              </button>

                              {isMine && !isDeletedForEveryone && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleDeleteMessage(
                                      message._id,
                                      "everyone",
                                    )
                                  }
                                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-red-600 transition hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete for everyone
                                </button>
                              )}
                            </div>
                          </>
                        )}

                        {message.replyTo && (
                          <div
                            className={`mb-2 rounded-lg border-l-4 px-3 py-2 ${
                              isMine
                                ? "border-cyan-200 bg-cyan-700/40"
                                : "border-cyan-500 bg-slate-100"
                            }`}
                          >
                            {message.replyTo.deletedForEveryoneAt ||
                            (Array.isArray(message.replyTo.deletedFor)
                              ? message.replyTo.deletedFor
                              : []
                            ).includes(user._id) ? (
                              <p
                                className={`truncate text-xs italic ${
                                  isMine ? "text-cyan-100" : "text-slate-500"
                                }`}
                              >
                                Original message is unavailable
                              </p>
                            ) : (
                              <>
                                <p
                                  className={`truncate text-xs font-semibold ${
                                    isMine ? "text-cyan-100" : "text-cyan-700"
                                  }`}
                                >
                                  {message.replyTo.sender._id === user._id
                                    ? "You"
                                    : message.replyTo.sender.name}
                                </p>

                                <p
                                  className={`mt-0.5 truncate text-xs ${
                                    isMine ? "text-cyan-50" : "text-slate-600"
                                  }`}
                                >
                                  {message.replyTo.content}
                                </p>
                              </>
                            )}
                          </div>
                        )}

                        <p
                          className={`whitespace-pre-wrap break-words pr-10 text-sm leading-5 ${
                            isDeletedForEveryone ? "italic opacity-80" : ""
                          }`}
                        >
                          {isDeletedForEveryone
                            ? "This message was deleted"
                            : message.content}
                        </p>

                        {groupedReactions.length > 0 &&
                          !isDeletedForEveryone && (
                            <div className="mt-2 flex flex-wrap items-center gap-1">
                              {groupedReactions.map(({ emoji, count }) => {
                                const isSelected =
                                  currentUserReaction?.emoji === emoji;

                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    disabled={isReacting}
                                    onClick={() =>
                                      void handleMessageReaction(message, emoji)
                                    }
                                    aria-label={`${emoji} reaction, ${count}`}
                                    className={`inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition disabled:opacity-50 ${
                                      isSelected
                                        ? "border-cyan-500 bg-cyan-50 text-cyan-800"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                    }`}
                                  >
                                    <span>{emoji}</span>

                                    <span className="font-semibold">
                                      {count}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                        <div
                          className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                            isMine ? "text-cyan-100" : "text-slate-400"
                          }`}
                        >
                          {message.editedAt && !isDeletedForEveryone && (
                            <span className="italic">Edited</span>
                          )}

                          <span>{formatMessageTime(message.createdAt)}</span>

                          {isMine && !isDeletedForEveryone && (
                            <span
                              title={receiptLabel}
                              aria-label={receiptLabel}
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/10"
                            >
                              {isReadByRecipient ? (
                                <CheckCheck
                                  strokeWidth={2.75}
                                  className="h-3.5 w-3.5 text-emerald-600"
                                />
                              ) : isDeliveredToRecipient ? (
                                <CheckCheck
                                  strokeWidth={2.75}
                                  className="h-3.5 w-3.5 text-blue-600"
                                />
                              ) : (
                                <Check
                                  strokeWidth={2.75}
                                  className="h-3.5 w-3.5 text-slate-600"
                                />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {!isMine && reactionButton}

                      {isMine && (
                        <UserAvatar
                          name={senderName}
                          avatarUrl={
                            isMine ? user.avatarUrl : message.sender.avatarUrl
                          }
                          className="h-8 w-8 text-xs"
                          fallbackClassName="bg-cyan-100 font-semibold text-cyan-800"
                        />
                      )}
                    </div>
                  </Fragment>
                );
              })}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {showFloatingDate && floatingDate && (
          <div className="pointer-events-none absolute left-0 right-0 top-2 z-30 flex justify-center">
            <span className="rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur">
              {floatingDate}
            </span>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSendMessage}
        className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4"
      >
        {replyingToMessage && (
          <div className="mb-3 flex items-center justify-between rounded-xl border-l-4 border-cyan-600 bg-cyan-50 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-cyan-700">
                Replying to{" "}
                {replyingToMessage.sender._id === user._id
                  ? "yourself"
                  : replyingToMessage.sender.name}
              </p>

              <p className="mt-0.5 truncate text-xs text-slate-500">
                {replyingToMessage.content}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCancelReplying}
              aria-label="Cancel reply"
              title="Cancel reply"
              className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-cyan-100 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {editingMessageId && (
          <div className="mb-3 flex items-center justify-between rounded-xl border-l-4 border-cyan-600 bg-cyan-50 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-cyan-700">
                Editing message
              </p>

              <p className="truncate text-xs text-slate-500">
                Update the message and press the check button.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCancelEditing}
              disabled={isEditingMessage}
              aria-label="Cancel editing"
              title="Cancel editing"
              className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-cyan-100 hover:text-slate-800 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            ref={messageInputRef}
            type="text"
            value={messageText}
            onChange={handleMessageChange}
            maxLength={5000}
            placeholder={
              editingMessageId
                ? "Edit your message"
                : replyingToMessage
                  ? "Write a reply"
                  : "Type a message"
            }
            aria-label={editingMessageId ? "Edit message" : "Message"}
            className="min-w-0 flex-1 rounded-full border border-slate-300 bg-slate-100 px-5 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
          />

          <button
            type="submit"
            disabled={!messageText.trim() || isSending || isEditingMessage}
            aria-label={
              editingMessageId ? "Save edited message" : "Send message"
            }
            title={editingMessageId ? "Save changes" : "Send message"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending || isEditingMessage ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : editingMessageId ? (
              <Check className="h-5 w-5" />
            ) : (
              <SendHorizontal className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
