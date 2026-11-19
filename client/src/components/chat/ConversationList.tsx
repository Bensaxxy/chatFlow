"use client";

import { AlertCircle, LoaderCircle, MessageCircleMore } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import UserAvatar from "@/components/chat/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  invalidateConversationCache,
  updateCachedConversationMessage,
} from "@/lib/chat/conversation-cache";
import { getConversations } from "@/services/conversation.service";
import type {
  Conversation,
  ConversationParticipant,
} from "@/types/conversation";
import type { ChatMessage, MessageDeletedPayload } from "@/types/message";
import {
  getAllConversationDrafts,
  subscribeToConversationDrafts,
} from "@/lib/chat/draft-storage";

const formatConversationTime = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const getOtherParticipant = (
  conversation: Conversation,
  currentUserId: string,
): ConversationParticipant | undefined =>
  conversation.participants?.find(
    (participant) => participant._id !== currentUserId,
  );

const normalizeMessage = (message: ChatMessage): ChatMessage => ({
  ...message,
  deliveredTo: Array.isArray(message.deliveredTo) ? message.deliveredTo : [],
  readBy: Array.isArray(message.readBy) ? message.readBy : [],
  deletedFor: Array.isArray(message.deletedFor) ? message.deletedFor : [],
});

export default function ConversationList() {
  const pathname = usePathname();
  const { user } = useAuth();

  const { socket, isConnected, onlineUserIds, updatedProfiles } = useSocket();

  const currentUserId = user?._id;

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [typingConversationIds, setTypingConversationIds] = useState<
    Set<string>
  >(() => new Set());

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const [conversationDrafts, setConversationDrafts] = useState<
    Map<string, string>
  >(() => new Map());

  const typingTimeoutsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!user) {
      setConversationDrafts(new Map());
      return;
    }

    setConversationDrafts(getAllConversationDrafts(user._id));

    return subscribeToConversationDrafts(user._id, (conversationId, text) => {
      setConversationDrafts((currentDrafts) => {
        const nextDrafts = new Map(currentDrafts);

        if (text.trim()) {
          nextDrafts.set(conversationId, text);
        } else {
          nextDrafts.delete(conversationId);
        }

        return nextDrafts;
      });
    });
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();

    const loadConversations = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const results = await getConversations(controller.signal);

        if (!controller.signal.aborted) {
          setConversations(results);
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

    void loadConversations();

    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    if (!isConnected || !currentUserId) return;

    const clearTypingConversation = (conversationId: string): void => {
      const timeoutId = typingTimeoutsRef.current.get(conversationId);

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
        typingTimeoutsRef.current.delete(conversationId);
      }

      setTypingConversationIds((current) => {
        if (!current.has(conversationId)) return current;

        const next = new Set(current);
        next.delete(conversationId);

        return next;
      });
    };

    const handleConversationUpdate = ({
      conversationId,
      message,
      updatedAt,
      incrementUnread,
    }: {
      conversationId: string;
      message: ChatMessage;
      updatedAt: string;
      incrementUnread: boolean;
    }): void => {
      clearTypingConversation(conversationId);
      updateCachedConversationMessage(
        `${currentUserId}:${conversationId}`,
        normalizeMessage(message),
        {
          isLatestMessage: true,
        },
      );

      setConversations((current) => {
        const existingConversation = current.find(
          (conversation) => conversation._id === conversationId,
        );

        if (!existingConversation) return current;

        const conversationIsOpen = pathname === `/chats/${conversationId}`;

        const unreadCount =
          incrementUnread && !conversationIsOpen
            ? (existingConversation.unreadCount ?? 0) + 1
            : (existingConversation.unreadCount ?? 0);

        const updatedConversation: Conversation = {
          ...existingConversation,
          lastMessage: normalizeMessage(message),
          updatedAt,
          unreadCount,
        };

        return [
          updatedConversation,
          ...current.filter(
            (conversation) => conversation._id !== conversationId,
          ),
        ];
      });
    };

    const handleConversationRead = (payload: {
      conversationId: string;
      userId: string;
      readAt: string;
    }): void => {
      if (payload.userId !== currentUserId) return;

      setConversations((current) =>
        current.map((conversation) =>
          conversation._id === payload.conversationId
            ? {
                ...conversation,
                unreadCount: 0,
              }
            : conversation,
        ),
      );
    };

    const handleMessageUpdated = (payload: {
      conversationId: string;
      message: ChatMessage;
    }): void => {
      updateCachedConversationMessage(
        `${currentUserId}:${payload.conversationId}`,
        normalizeMessage(payload.message),
      );

      setConversations((current) =>
        current.map((conversation) => {
          const lastMessage = conversation.lastMessage;

          if (
            conversation._id !== payload.conversationId ||
            !lastMessage ||
            lastMessage._id !== payload.message._id
          ) {
            return conversation;
          }

          return {
            ...conversation,
            lastMessage: normalizeMessage(payload.message),
          };
        }),
      );
    };

    const handleMessageDeleted = (payload: MessageDeletedPayload): void => {
      invalidateConversationCache(`${currentUserId}:${payload.conversationId}`);

      setConversations((current) =>
        current.map((conversation) => {
          const lastMessage = conversation.lastMessage;

          if (
            conversation._id !== payload.conversationId ||
            !lastMessage ||
            lastMessage._id !== payload.messageId
          ) {
            return conversation;
          }

          if (payload.scope === "me") {
            if (payload.deletedByUserId !== currentUserId) {
              return conversation;
            }

            const currentDeletedFor = Array.isArray(lastMessage.deletedFor)
              ? lastMessage.deletedFor
              : [];

            const deletedFor = currentDeletedFor.includes(currentUserId)
              ? currentDeletedFor
              : [...currentDeletedFor, currentUserId];

            return {
              ...conversation,
              lastMessage: {
                ...lastMessage,
                deletedFor,
              },
            };
          }

          return {
            ...conversation,
            lastMessage: {
              ...lastMessage,
              content: "This message was deleted",
              deletedFor: Array.isArray(lastMessage.deletedFor)
                ? lastMessage.deletedFor
                : [],
              deletedForEveryoneAt: payload.deletedForEveryoneAt,
            },
          };
        }),
      );
    };

    socket.on("conversation:updated", handleConversationUpdate);

    socket.on("conversation:read", handleConversationRead);

    socket.on("message:updated", handleMessageUpdated);

    socket.on("message:deleted", handleMessageDeleted);

    return () => {
      socket.off("conversation:updated", handleConversationUpdate);

      socket.off("conversation:read", handleConversationRead);

      socket.off("message:updated", handleMessageUpdated);

      socket.off("message:deleted", handleMessageDeleted);
    };
  }, [socket, isConnected, pathname, currentUserId]);

  useEffect(() => {
    if (!isConnected || !currentUserId) return;

    const typingTimeouts = typingTimeoutsRef.current;

    const removeTypingConversation = (conversationId: string): void => {
      const existingTimeout = typingTimeouts.get(conversationId);

      if (existingTimeout !== undefined) {
        window.clearTimeout(existingTimeout);
        typingTimeouts.delete(conversationId);
      }

      setTypingConversationIds((current) => {
        if (!current.has(conversationId)) return current;

        const next = new Set(current);
        next.delete(conversationId);

        return next;
      });
    };

    const handleTypingUpdate = (payload: {
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }): void => {
      if (payload.userId === currentUserId) return;

      if (!payload.isTyping) {
        removeTypingConversation(payload.conversationId);
        return;
      }

      const previousTimeout = typingTimeouts.get(payload.conversationId);

      if (previousTimeout !== undefined) {
        window.clearTimeout(previousTimeout);
      }

      setTypingConversationIds((current) => {
        const next = new Set(current);
        next.add(payload.conversationId);

        return next;
      });

      const timeoutId = window.setTimeout(() => {
        typingTimeouts.delete(payload.conversationId);

        setTypingConversationIds((current) => {
          const next = new Set(current);
          next.delete(payload.conversationId);

          return next;
        });
      }, 3000);

      typingTimeouts.set(payload.conversationId, timeoutId);
    };

    const handleSocketDisconnect = (): void => {
      for (const timeoutId of typingTimeouts.values()) {
        window.clearTimeout(timeoutId);
      }

      typingTimeouts.clear();
      setTypingConversationIds(new Set());
    };

    socket.on("typing:update", handleTypingUpdate);

    socket.on("disconnect", handleSocketDisconnect);

    return () => {
      socket.off("typing:update", handleTypingUpdate);

      socket.off("disconnect", handleSocketDisconnect);

      for (const timeoutId of typingTimeouts.values()) {
        window.clearTimeout(timeoutId);
      }

      typingTimeouts.clear();
      setTypingConversationIds(new Set());
    };
  }, [socket, isConnected, currentUserId]);

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-slate-500">
        <LoaderCircle className="h-5 w-5 animate-spin text-cyan-600" />
        Loading conversations...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="px-6 py-10 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-400" />

        <p className="mt-3 text-sm text-red-600">{errorMessage}</p>

        <button
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10">
        <div className="max-w-xs text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-100">
            <MessageCircleMore className="h-8 w-8 text-cyan-700" />
          </div>

          <h2 className="mt-5 font-semibold text-slate-950">
            No conversations yet
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Search for another ChatFlow user to begin your first conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {conversations.map((conversation) => {
        const otherParticipant = getOtherParticipant(conversation, user._id);

        const updatedOtherProfile = otherParticipant
          ? updatedProfiles.get(otherParticipant._id)
          : undefined;

        const displayName =
          conversation.type === "group"
            ? (conversation.name ?? "Unnamed group")
            : (updatedOtherProfile?.name ??
              otherParticipant?.name ??
              "Unknown user");

        const isActive = pathname === `/chats/${conversation._id}`;

        const unreadCount = isActive ? 0 : (conversation.unreadCount ?? 0);

        const hasUnread = unreadCount > 0;

        const isOtherUserOnline =
          conversation.type === "direct" &&
          Boolean(otherParticipant && onlineUserIds.has(otherParticipant._id));

        const isParticipantTyping = typingConversationIds.has(conversation._id);

        const lastMessage = conversation.lastMessage;

        const deletedFor = Array.isArray(lastMessage?.deletedFor)
          ? lastMessage.deletedFor
          : [];

        const senderId = lastMessage?.sender?._id;

        const content =
          lastMessage?.content ||
          (lastMessage?.type === "image"
            ? "📷 Image"
            : lastMessage?.type === "audio"
              ? "🎤 Voice note"
              : lastMessage?.attachment?.fileName || "File");

        const draftText = conversationDrafts.get(conversation._id) ?? "";

        const hasDraft = Boolean(draftText.trim());

        const messagePreview = hasDraft
          ? draftText.trim()
          : lastMessage
            ? deletedFor.includes(user._id)
              ? "Message deleted for you"
              : lastMessage.deletedForEveryoneAt
                ? "This message was deleted"
                : `${senderId === user._id ? "You: " : ""}${content}`
            : "Start the conversation";

        return (
          <Link
            key={conversation._id}
            href={`/chats/${conversation._id}`}
            className={`flex items-center gap-3 px-4 py-3 transition ${
              isActive
                ? "bg-cyan-50"
                : hasUnread
                  ? "bg-white hover:bg-cyan-50/50"
                  : "hover:bg-slate-50"
            }`}
          >
            <div className="relative h-12 w-12 shrink-0">
              <UserAvatar
                name={displayName}
                avatarUrl={
                  conversation.type === "direct"
                    ? updatedOtherProfile
                      ? updatedOtherProfile.avatarUrl
                      : otherParticipant?.avatarUrl
                    : null
                }
                className="h-full w-full"
                fallbackClassName="bg-cyan-100 font-semibold text-cyan-800"
              />

              {isOtherUserOnline && (
                <span
                  title="Online"
                  aria-label="Online"
                  className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p
                  className={`min-w-0 flex-1 truncate text-slate-950 ${
                    hasUnread ? "font-bold" : "font-medium"
                  }`}
                >
                  {displayName}
                </p>

                <time
                  className={`shrink-0 text-xs ${
                    hasUnread ? "font-semibold text-cyan-700" : "text-slate-400"
                  }`}
                >
                  {formatConversationTime(conversation.updatedAt)}
                </time>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <div
                  className={`min-w-0 flex-1 truncate text-sm ${
                    isParticipantTyping
                      ? "font-semibold text-cyan-600"
                      : hasUnread
                        ? "font-semibold text-slate-800"
                        : "text-slate-500"
                  }`}
                >
                  {isParticipantTyping ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span>Typing</span>

                      <span className="inline-flex items-center gap-0.5">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-600 [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-600 [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-600" />
                      </span>
                    </span>
                  ) : hasDraft ? (
                    <>
                      <span className="font-semibold text-red-500">Draft:</span>{" "}
                      <span>{messagePreview}</span>
                    </>
                  ) : (
                    messagePreview
                  )}
                </div>

                {hasUnread && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600 px-1.5 text-[11px] font-semibold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
