"use client";

import {
  AlertCircle,
  Ban,
  BellOff,
  Eraser,
  Mail,
  MessageCircleMore,
  Pin,
  PinOff,
  ShieldCheck,
  VolumeX,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import UserAvatar from "@/components/chat/UserAvatar";
import ChatFlowLoader from "@/components/shared/ChatFlowLoader";
import ActionMenu from "@/components/ui/ActionMenu";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useStatuses } from "@/contexts/StatusContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  invalidateConversationCache,
  updateCachedConversationMessage,
} from "@/lib/chat/conversation-cache";
import {
  clearConversation,
  getConversationById,
  deleteConversation,
  getConversations,
  markConversationUnread,
  setConversationPinned,
  muteConversation,
  unmuteConversation,
} from "@/services/conversation.service";
import { blockUser, unblockUser } from "@/services/user.service";
import type {
  Conversation,
  ConversationParticipant,
  ConversationPreferences,
} from "@/types/conversation";
import type { ChatMessage, MessageDeletedPayload } from "@/types/message";
import type { StatusGroup } from "@/types/status";
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

const sortConversations = (conversations: Conversation[]): Conversation[] =>
  [...conversations].sort((first, second) => {
    if (Boolean(first.isPinned) !== Boolean(second.isPinned)) {
      return first.isPinned ? -1 : 1;
    }

    return (
      new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
    );
  });

interface ConfirmationRequest {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

interface ConversationListProps {
  onOpenStatusGroup: (group: StatusGroup) => void;
}

export default function ConversationList({
  onOpenStatusGroup,
}: ConversationListProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { statusGroups } = useStatuses();

  const { socket, isConnected, onlineUserIds, updatedProfiles } = useSocket();

  const currentUserId = user?._id;

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [typingConversationIds, setTypingConversationIds] = useState<
    Set<string>
  >(() => new Set());

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const [openMenuConversationId, setOpenMenuConversationId] = useState<
    string | null
  >(null);
  const [menuOpenedAt, setMenuOpenedAt] = useState(0);
  const [actionConversationId, setActionConversationId] = useState<
    string | null
  >(null);
  const [confirmationRequest, setConfirmationRequest] =
    useState<ConfirmationRequest | null>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
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
          setConversations(sortConversations(results));
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
    const now = Date.now();
    const nextExpiry = conversations.reduce<number | null>(
      (nearest, conversation) => {
        if (!conversation.isMuted || !conversation.mutedUntil) return nearest;
        const expiry = new Date(conversation.mutedUntil).getTime();
        if (expiry <= now) return nearest;
        return nearest === null || expiry < nearest ? expiry : nearest;
      },
      null,
    );

    if (nextExpiry === null) return;

    const timer = window.setTimeout(
      () => setMenuOpenedAt(Date.now()),
      Math.max(0, nextExpiry - now),
    );
    return () => window.clearTimeout(timer);
  }, [conversations]);

  useEffect(() => {
    if (!isConnected || !currentUserId) return;

    let isSubscribed = true;

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

        if (!existingConversation) {
          /*
           * A status reply can create the first direct conversation between
           * two people. The socket correctly announces its first message,
           * but there is no list item to update yet. Fetch and insert the
           * conversation so that reply is immediately discoverable.
           */
          void getConversationById(conversationId)
            .then((conversation) => {
              if (!isSubscribed) {
                return;
              }

              const conversationIsOpen =
                pathname === `/chats/${conversationId}`;

              setConversations((latestConversations) => {
                const existingIndex = latestConversations.findIndex(
                  (currentConversation) =>
                    currentConversation._id === conversationId,
                );

                const unreadCount =
                  incrementUnread && !conversationIsOpen
                    ? Math.max(1, conversation.unreadCount ?? 0)
                    : (conversation.unreadCount ?? 0);

                const nextConversation: Conversation = {
                  ...(existingIndex >= 0
                    ? latestConversations[existingIndex]
                    : conversation),
                  lastMessage: normalizeMessage(message),
                  updatedAt,
                  unreadCount,
                };

                return sortConversations([
                  nextConversation,
                  ...latestConversations.filter(
                    (currentConversation) =>
                      currentConversation._id !== conversationId,
                  ),
                ]);
              });
            })
            .catch(() => {
              /* A later refresh will recover if the conversation was removed. */
            });

          return current;
        }

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

        return sortConversations([
          updatedConversation,
          ...current.filter(
            (conversation) => conversation._id !== conversationId,
          ),
        ]);
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
                isMarkedUnread: false,
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

    const handlePreferencesUpdate = (payload: {
      conversationId: string;
      isPinned: boolean;
      isMarkedUnread: boolean;
      clearedAt: string | null;
      mutedUntil: string | null;
      isMuted: boolean;
    }): void => {
      setConversations((current) =>
        sortConversations(
          current.map((conversation) => {
            if (conversation._id !== payload.conversationId) {
              return conversation;
            }

            const lastMessageWasCleared =
              Boolean(payload.clearedAt) &&
              (!conversation.lastMessage ||
                new Date(conversation.lastMessage.createdAt).getTime() <=
                  new Date(payload.clearedAt!).getTime());

            return {
              ...conversation,
              isPinned: payload.isPinned,
              isMarkedUnread: payload.isMarkedUnread,
              clearedAt: payload.clearedAt,
              mutedUntil: payload.mutedUntil,
              isMuted: payload.isMuted,
              unreadCount: payload.clearedAt
                ? 0
                : payload.isMarkedUnread
                  ? Math.max(1, conversation.unreadCount ?? 0)
                  : conversation.unreadCount,
              ...(lastMessageWasCleared && {
                lastMessage: null,
              }),
            };
          }),
        ),
      );
    };

    socket.on("conversation:updated", handleConversationUpdate);

    socket.on("conversation:read", handleConversationRead);

    socket.on("message:updated", handleMessageUpdated);

    socket.on("message:deleted", handleMessageDeleted);

    socket.on("conversation:preferences-updated", handlePreferencesUpdate);

    return () => {
      isSubscribed = false;

      socket.off("conversation:updated", handleConversationUpdate);

      socket.off("conversation:read", handleConversationRead);

      socket.off("message:updated", handleMessageUpdated);

      socket.off("message:deleted", handleMessageDeleted);

      socket.off("conversation:preferences-updated", handlePreferencesUpdate);
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

  const applyConversationPreferences = (
    conversationId: string,
    preferences: ConversationPreferences,
  ): void => {
    setConversations((current) =>
      sortConversations(
        current.map((conversation) => {
          if (conversation._id !== conversationId) {
            return conversation;
          }

          const lastMessageWasCleared =
            Boolean(preferences.clearedAt) &&
            (!conversation.lastMessage ||
              new Date(conversation.lastMessage.createdAt).getTime() <=
                new Date(preferences.clearedAt!).getTime());

          return {
            ...conversation,
            isPinned: preferences.isPinned,
            isMarkedUnread: preferences.isMarkedUnread,
            clearedAt: preferences.clearedAt,
            mutedUntil: preferences.mutedUntil,
            isMuted: preferences.isMuted,
            unreadCount: preferences.clearedAt
              ? 0
              : preferences.isMarkedUnread
                ? Math.max(1, conversation.unreadCount ?? 0)
                : conversation.unreadCount,
            ...(lastMessageWasCleared && {
              lastMessage: null,
            }),
          };
        }),
      ),
    );
  };

  const applyConversationMutePreferences = (
    conversationId: string,
    preferences: ConversationPreferences,
  ): void => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation._id === conversationId
          ? {
              ...conversation,
              mutedUntil: preferences.mutedUntil,
              isMuted: preferences.isMuted,
            }
          : conversation,
      ),
    );
  };

  const handlePinConversation = async (
    conversationId: string,
    isPinned: boolean,
  ): Promise<void> => {
    setOpenMenuConversationId(null);
    setActionConversationId(conversationId);

    try {
      const preferences = await setConversationPinned(
        conversationId,
        !isPinned,
      );
      applyConversationPreferences(conversationId, preferences);
      toast.success(isPinned ? "Chat unpinned" : "Chat pinned");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setActionConversationId(null);
    }
  };

  const handleMarkConversationUnread = async (
    conversationId: string,
  ): Promise<void> => {
    setOpenMenuConversationId(null);
    setActionConversationId(conversationId);

    try {
      const preferences = await markConversationUnread(conversationId);
      applyConversationPreferences(conversationId, preferences);
      toast.success("Chat marked as unread");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setActionConversationId(null);
    }
  };

  const handleClearConversation = async (
    conversationId: string,
  ): Promise<void> => {
    setActionConversationId(conversationId);

    try {
      const preferences = await clearConversation(conversationId);
      applyConversationPreferences(conversationId, preferences);

      if (currentUserId) {
        invalidateConversationCache(`${currentUserId}:${conversationId}`);
      }

      toast.success("Chat cleared for you");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setActionConversationId(null);
    }
  };

  const handleMuteConversation = async (
    conversationId: string,
    duration: 8 | 168 | "always",
  ): Promise<void> => {
    setActionConversationId(conversationId);
    try {
      const preferences = await muteConversation(conversationId, duration);
      applyConversationMutePreferences(conversationId, preferences);
      toast.success(
        `Chat muted${duration === "always" ? "" : ` for ${duration === 168 ? "1 week" : `${duration} hours`}`}`,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setActionConversationId(null);
    }
  };

  const handleUnmuteConversation = async (
    conversationId: string,
  ): Promise<void> => {
    setActionConversationId(conversationId);
    try {
      applyConversationMutePreferences(
        conversationId,
        await unmuteConversation(conversationId),
      );
      toast.success("Chat unmuted");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setActionConversationId(null);
    }
  };

  const handleDeleteConversation = async (
    conversationId: string,
  ): Promise<void> => {
    setActionConversationId(conversationId);
    try {
      await deleteConversation(conversationId);
      setConversations((current) =>
        current.filter((item) => item._id !== conversationId),
      );
      if (pathname === `/chats/${conversationId}`) router.push("/chats");
      toast.success("Chat deleted for you");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setActionConversationId(null);
    }
  };

  const handleBlockConversationUser = async (
    conversationId: string,
    otherUserId: string,
    isBlocked: boolean,
  ): Promise<void> => {
    setActionConversationId(conversationId);

    try {
      const status = isBlocked
        ? await unblockUser(otherUserId)
        : await blockUser(otherUserId);

      setConversations((current) =>
        current.map((conversation) =>
          conversation._id === conversationId
            ? {
                ...conversation,
                directMessagingAccess: status,
              }
            : conversation,
        ),
      );

      if (currentUserId) {
        invalidateConversationCache(`${currentUserId}:${conversationId}`);
      }

      toast.success(isBlocked ? "User unblocked" : "User blocked");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setActionConversationId(null);
    }
  };

  const requestClearConversation = (conversationId: string): void => {
    setConfirmationRequest({
      title: "Clear this chat?",
      description:
        "Messages will be removed from your view only. The other person will keep their copy.",
      confirmLabel: "Clear chat",
      onConfirm: () => handleClearConversation(conversationId),
    });
  };

  const requestDeleteConversation = (conversationId: string): void => {
    setConfirmationRequest({
      title: "Delete conversation?",
      description: "Are you sure you want to delete this chat?",
      confirmLabel: "Delete chat",
      onConfirm: () => handleDeleteConversation(conversationId),
    });
  };

  const requestBlockConversationUser = (
    conversationId: string,
    otherUserId: string,
    isBlocked: boolean,
  ): void => {
    const actionLabel = isBlocked ? "Unblock" : "Block";

    setConfirmationRequest({
      title: `${actionLabel} this user?`,
      description: isBlocked
        ? "They will be able to message you again."
        : "They will no longer be able to message or call you.",
      confirmLabel: actionLabel,
      onConfirm: () =>
        handleBlockConversationUser(conversationId, otherUserId, isBlocked),
    });
  };

  const handleConfirmation = async (): Promise<void> => {
    const request = confirmationRequest;

    if (!request) {
      return;
    }

    setIsConfirmingAction(true);

    try {
      await request.onConfirm();
      setConfirmationRequest(null);
    } finally {
      setIsConfirmingAction(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return <ChatFlowLoader compact message="Loading conversations..." />;
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
    <>
      <div className="conversation-list divide-y divide-slate-100">
        {conversations.map((conversation) => {
          const otherParticipant = getOtherParticipant(conversation, user._id);

          const otherParticipantStatusGroup =
            conversation.type === "direct" && otherParticipant
              ? statusGroups.find(
                  (group) => group.author._id === otherParticipant._id,
                )
              : undefined;

          const hasParticipantStatus = Boolean(otherParticipantStatusGroup);

          const hasUnviewedParticipantStatus = Boolean(
            otherParticipantStatusGroup?.hasUnviewedStatuses,
          );

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

          const isPinned = Boolean(conversation.isPinned);
          const muteIsActive = Boolean(
            conversation.isMuted &&
            (!conversation.mutedUntil ||
              new Date(conversation.mutedUntil).getTime() > menuOpenedAt),
          );
          const mutedUntilLabel = conversation.mutedUntil
            ? `Muted until ${new Date(conversation.mutedUntil).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`
            : "Notifications muted indefinitely";

          const isMenuOpen = openMenuConversationId === conversation._id;

          const isActionWorking = actionConversationId === conversation._id;

          const isOtherUserOnline =
            conversation.type === "direct" &&
            Boolean(
              otherParticipant && onlineUserIds.has(otherParticipant._id),
            );

          const isParticipantTyping = typingConversationIds.has(
            conversation._id,
          );

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

          const hasDraft = Boolean(draftText.trim()) && !isActive;

          const isBlockedByCurrentUser = Boolean(
            conversation.directMessagingAccess?.isBlockedByCurrentUser,
          );

          const isMessagingUnavailable =
            conversation.type === "direct" &&
            conversation.directMessagingAccess?.canMessage === false;

          const messagePreview = isBlockedByCurrentUser
            ? "You blocked this user"
            : isMessagingUnavailable
              ? "Messaging unavailable"
              : hasDraft
                ? draftText.trim()
                : lastMessage
                  ? deletedFor.includes(user._id)
                    ? "Message deleted for you"
                    : lastMessage.deletedForEveryoneAt
                      ? "This message was deleted"
                      : `${senderId === user._id ? "You: " : ""}${content}`
                  : "Start the conversation";

          return (
            <div
              key={conversation._id}
              className="group relative flex items-center gap-3 px-4 py-2.5 pr-12"
            >
              <Link
                href={`/chats/${conversation._id}`}
                onClick={() => setOpenMenuConversationId(null)}
                aria-label={`Open conversation with ${displayName}`}
                className={`absolute inset-0 z-0 transition ${
                  isActive
                    ? "bg-cyan-50"
                    : hasUnread
                      ? "bg-white hover:bg-cyan-50/50"
                      : "hover:bg-slate-50"
                }`}
              />
              {hasParticipantStatus ? (
                <button
                  type="button"
                  onClick={() =>
                    onOpenStatusGroup(otherParticipantStatusGroup!)
                  }
                  aria-label={`View ${displayName}'s status`}
                  title={
                    hasUnviewedParticipantStatus
                      ? `${displayName} has an unviewed status`
                      : `View ${displayName}'s status again`
                  }
                  className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-[3px] transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--chat-accent)] focus:ring-offset-2 focus:ring-offset-[var(--chat-sidebar)] ${
                    hasUnviewedParticipantStatus
                      ? "bg-[var(--chat-accent)] shadow-[0_0_0_2px_var(--chat-accent-soft)]"
                      : "bg-[var(--chat-muted)]/55"
                  }`}
                >
                  <UserAvatar
                    name={displayName}
                    avatarUrl={
                      updatedOtherProfile
                        ? updatedOtherProfile.avatarUrl
                        : otherParticipant?.avatarUrl
                    }
                    className="h-full w-full"
                    fallbackClassName="bg-cyan-100 font-semibold text-cyan-800"
                  />

                  {isOtherUserOnline && (
                    <span
                      title="Online"
                      aria-label="Online"
                      className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--chat-sidebar)] bg-emerald-500 shadow-sm"
                    />
                  )}
                </button>
              ) : (
                <div className="pointer-events-none relative z-10 h-11 w-11 shrink-0">
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
                      className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--chat-sidebar)] bg-emerald-500 shadow-sm"
                    />
                  )}
                </div>
              )}

              <div className="pointer-events-none relative z-10 min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <p
                    className={`min-w-0 flex-1 truncate text-slate-950 ${
                      hasUnread ? "font-bold" : "font-medium"
                    }`}
                  >
                    {displayName}
                  </p>

                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <time
                      className={`text-xs ${
                        hasUnread
                          ? "font-semibold text-cyan-700"
                          : "text-slate-400"
                      }`}
                    >
                      {formatConversationTime(conversation.updatedAt)}
                    </time>

                    {isPinned && (
                      <Pin
                        aria-label="Pinned chat"
                        className="h-3 w-3 fill-cyan-600 text-cyan-600"
                      />
                    )}
                  </div>
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
                        <span className="font-semibold text-red-500">
                          Draft:
                        </span>{" "}
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

              <div className="absolute right-1.5 top-1.5 z-20">
                <ActionMenu
                  open={isMenuOpen}
                  onOpenChange={(isOpen) => {
                    if (isOpen) setMenuOpenedAt(Date.now());
                    setOpenMenuConversationId(isOpen ? conversation._id : null);
                  }}
                  isLoading={isActionWorking}
                  label={`Open actions for ${displayName}`}
                  menuLabel={`Actions for ${displayName}`}
                  menuClassName="w-64"
                  items={[
                    {
                      id: "pin",
                      label: isPinned ? "Unpin chat" : "Pin chat",
                      icon: isPinned ? PinOff : Pin,
                      onSelect: () => {
                        void handlePinConversation(conversation._id, isPinned);
                      },
                    },
                    ...(muteIsActive
                      ? [
                          {
                            id: "unmute",
                            label: "Unmute notifications",
                            description: mutedUntilLabel,
                            icon: VolumeX,
                            onSelect: () =>
                              void handleUnmuteConversation(conversation._id),
                          },
                        ]
                      : [
                          {
                            id: "mute",
                            label: "Mute Notifications",
                            icon: VolumeX,
                            onSelect: () => undefined,
                            submenu: [
                              {
                                id: "mute-8",
                                label: "8 hours",
                                icon: VolumeX,
                                onSelect: () =>
                                  void handleMuteConversation(
                                    conversation._id,
                                    8,
                                  ),
                              },
                              {
                                id: "mute-week",
                                label: "1 week",
                                icon: VolumeX,
                                onSelect: () =>
                                  void handleMuteConversation(
                                    conversation._id,
                                    168,
                                  ),
                              },
                              {
                                id: "mute-always",
                                label: "Always",
                                icon: VolumeX,
                                onSelect: () =>
                                  void handleMuteConversation(
                                    conversation._id,
                                    "always",
                                  ),
                              },
                            ],
                          },
                        ]),
                    {
                      id: "unread",
                      label: "Mark as unread",
                      icon: Mail,
                      onSelect: () => {
                        void handleMarkConversationUnread(conversation._id);
                      },
                    },
                    {
                      id: "clear",
                      label: "Clear chat",
                      icon: Eraser,
                      onSelect: () =>
                        requestClearConversation(conversation._id),
                    },
                    {
                      id: "delete",
                      label: "Delete conversation",
                      icon: Trash2,
                      tone: "danger",
                      dividerBefore: true,
                      onSelect: () =>
                        requestDeleteConversation(conversation._id),
                    },
                    ...(conversation.type === "direct" && otherParticipant
                      ? [
                          {
                            id: "block",
                            label: isBlockedByCurrentUser
                              ? "Unblock user"
                              : "Block user",
                            icon: isBlockedByCurrentUser ? ShieldCheck : Ban,
                            tone: isBlockedByCurrentUser
                              ? ("success" as const)
                              : ("danger" as const),
                            dividerBefore: true,
                            onSelect: () =>
                              requestBlockConversationUser(
                                conversation._id,
                                otherParticipant._id,
                                isBlockedByCurrentUser,
                              ),
                          },
                        ]
                      : []),
                  ]}
                />
                {muteIsActive && (
                  <span
                    title={mutedUntilLabel}
                    aria-label="Notifications muted"
                    className="pointer-events-none absolute right-[13px] top-[34px] text-[var(--chat-muted)]"
                  >
                    <BellOff className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={Boolean(confirmationRequest)}
        title={confirmationRequest?.title ?? "Confirm action"}
        description={confirmationRequest?.description ?? ""}
        confirmLabel={confirmationRequest?.confirmLabel ?? "Continue"}
        isConfirming={isConfirmingAction}
        onConfirm={() => void handleConfirmation()}
        onClose={() => setConfirmationRequest(null)}
      />
    </>
  );
}
