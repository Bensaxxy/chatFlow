"use client";

import { Check, Forward, LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import UserAvatar from "@/components/chat/UserAvatar";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getConversations } from "@/services/conversation.service";
import { forwardConversationMessage } from "@/services/message.service";
import type { Conversation } from "@/types/conversation";
import type { ChatMessage } from "@/types/message";

interface ForwardMessageModalProps {
  message: ChatMessage | null;
  sourceConversationId: string;
  currentUserId: string;
  onClose: () => void;
  onForwarded?: (messages: ChatMessage[]) => void;
}

const getConversationDetails = (
  conversation: Conversation,
  currentUserId: string,
): {
  name: string;
  avatarUrl: string | null;
  subtitle: string;
} => {
  if (conversation.type === "group") {
    return {
      name: conversation.name?.trim() || "Group conversation",
      avatarUrl: conversation.avatarUrl,
      subtitle: `${conversation.participants.length} participants`,
    };
  }

  const otherParticipant = conversation.participants.find(
    (participant) => participant._id !== currentUserId,
  );

  return {
    name: otherParticipant?.name ?? "Unknown user",
    avatarUrl: otherParticipant?.avatarUrl ?? null,
    subtitle: otherParticipant?.email ?? "Direct conversation",
  };
};

export default function ForwardMessageModal({
  message,
  sourceConversationId,
  currentUserId,
  onClose,
  onForwarded,
}: ForwardMessageModalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationIds, setSelectedConversationIds] = useState<
    Set<string>
  >(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOpen = message !== null;

  useEffect(() => {
    if (!isOpen) {
      setConversations([]);
      setSelectedConversationIds(new Set());
      setSearchQuery("");
      setErrorMessage(null);
      return;
    }

    const controller = new AbortController();

    const loadConversations = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const result = await getConversations(controller.signal);

        if (!controller.signal.aborted) {
          setConversations(result);
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

    return () => {
      controller.abort();
    };
  }, [isOpen]);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const details = getConversationDetails(conversation, currentUserId);

      return (
        details.name.toLowerCase().includes(normalizedQuery) ||
        details.subtitle.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [conversations, currentUserId, searchQuery]);

  const toggleConversation = (conversationId: string): void => {
    if (isForwarding) return;

    const conversation = conversations.find(
      (item) => item._id === conversationId,
    );

    if (conversation?.directMessagingAccess?.canMessage === false) {
      return;
    }

    setSelectedConversationIds((current) => {
      const next = new Set(current);

      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }

      return next;
    });
  };

  const handleClose = (): void => {
    if (isForwarding) return;

    onClose();
  };

  const handleForward = async (): Promise<void> => {
    if (!message || selectedConversationIds.size === 0 || isForwarding) {
      return;
    }

    try {
      setIsForwarding(true);

      const result = await forwardConversationMessage(
        sourceConversationId,
        message._id,
        [...selectedConversationIds],
      );

      onForwarded?.(result.messages);

      toast.success(
        result.forwardedCount === 1
          ? "Message forwarded successfully"
          : `Message forwarded to ${result.forwardedCount} conversations`,
      );

      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsForwarding(false);
    }
  };

  if (!message) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close forward message dialog"
        onClick={handleClose}
        className="absolute inset-0 cursor-default"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="forward-message-title"
        className="relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[720px] sm:max-w-lg sm:rounded-3xl"
      >
        <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
            <Forward className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h2
              id="forward-message-title"
              className="font-semibold text-slate-950"
            >
              Forward message
            </h2>

            <p className="text-sm text-slate-500">
              Select one or more conversations
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isForwarding}
            aria-label="Close"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Message
          </p>

          <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <p className="line-clamp-3 text-sm text-slate-700">
              {message.content}
            </p>
          </div>
        </div>

        <div className="border-b border-slate-200 px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
              className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin text-cyan-600" />
              Loading conversations...
            </div>
          ) : errorMessage ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-medium text-slate-700">
                No conversations found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Try a different search.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredConversations.map((conversation) => {
                const details = getConversationDetails(
                  conversation,
                  currentUserId,
                );

                const isSelected = selectedConversationIds.has(
                  conversation._id,
                );
                const isMessagingUnavailable =
                  conversation.directMessagingAccess?.canMessage === false;

                return (
                  <button
                    key={conversation._id}
                    type="button"
                    disabled={isForwarding || isMessagingUnavailable}
                    onClick={() => toggleConversation(conversation._id)}
                    className={`flex w-full items-center gap-3 px-5 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      isSelected ? "bg-cyan-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <UserAvatar
                      name={details.name}
                      avatarUrl={details.avatarUrl}
                      className="h-11 w-11"
                      fallbackClassName="bg-cyan-100 font-semibold text-cyan-800"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-950">
                        {details.name}
                      </p>

                      <p className="truncate text-sm text-slate-500">
                        {isMessagingUnavailable
                          ? "Messaging unavailable"
                          : details.subtitle}
                      </p>
                    </div>

                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        isSelected
                          ? "border-cyan-600 bg-cyan-600 text-white"
                          : "border-slate-300 bg-white text-transparent"
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-4">
          <p className="text-sm text-slate-500">
            {selectedConversationIds.size === 0
              ? "No conversation selected"
              : `${selectedConversationIds.size} selected`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isForwarding}
              onClick={handleClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={
                selectedConversationIds.size === 0 || isForwarding || isLoading
              }
              onClick={() => void handleForward()}
              className="flex min-w-28 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isForwarding ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Forwarding
                </>
              ) : (
                <>
                  <Forward className="h-4 w-4" />
                  Forward
                </>
              )}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
