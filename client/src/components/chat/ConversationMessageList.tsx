"use client";

import { Fragment, type RefObject } from "react";
import { ArrowDown, LoaderCircle, MessageCircleMore } from "lucide-react";

import ConversationMessageItem from "@/components/chat/ConversationMessageItem";
import type { AuthUser } from "@/types/auth";
import type {
  ChatMessage,
  DeleteMessageScope,
  MessageReactionEmoji,
} from "@/types/message";
import type { RealtimeUserProfile } from "@/types/user";

interface ConversationMessageListProps {
  messages: ChatMessage[];
  currentUser: AuthUser;
  otherParticipantId?: string;
  updatedProfiles: ReadonlyMap<string, RealtimeUserProfile>;
  displayName: string;
  isOtherUserTyping: boolean;
  hasMore: boolean;
  isLoadingOlder: boolean;
  showFloatingDate: boolean;
  floatingDate: string;
  showScrollToBottom: boolean;
  highlightedMessageId: string | null;
  openMessageMenuId: string | null;
  reactionPickerMessageId: string | null;
  deletingMessageId: string | null;
  reactingMessageId: string | null;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onScrollToBottom: () => void;
  onLoadOlder: () => void;
  onToggleMenu: (messageId: string) => void;
  onToggleReactionPicker: (messageId: string) => void;
  onCloseMenu: () => void;
  onCloseReactionPicker: () => void;
  onReply: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (messageId: string, scope: DeleteMessageScope) => void;
  onReaction: (message: ChatMessage, emoji: MessageReactionEmoji) => void;
}

const isSameCalendarDay = (
  firstValue: string,
  secondValue: string,
): boolean => new Date(firstValue).toDateString() === new Date(secondValue).toDateString();

const formatMessageDateLabel = (value: string): string => {
  const messageDate = new Date(value);
  const today = new Date();

  if (Number.isNaN(messageDate.getTime())) {
    return "";
  }

  const isSameDay = (first: Date, second: Date): boolean =>
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(messageDate, today)) {
    return "Today";
  }

  if (isSameDay(messageDate, yesterday)) {
    return "Yesterday";
  }

  return messageDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year:
      messageDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
};

export default function ConversationMessageList({
  messages,
  currentUser,
  otherParticipantId,
  updatedProfiles,
  displayName,
  isOtherUserTyping,
  hasMore,
  isLoadingOlder,
  showFloatingDate,
  floatingDate,
  showScrollToBottom,
  highlightedMessageId,
  openMessageMenuId,
  reactionPickerMessageId,
  deletingMessageId,
  reactingMessageId,
  messagesContainerRef,
  messagesEndRef,
  onScroll,
  onScrollToBottom,
  onLoadOlder,
  onToggleMenu,
  onToggleReactionPicker,
  onCloseMenu,
  onCloseReactionPicker,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onReaction,
}: ConversationMessageListProps) {
  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <div
        ref={messagesContainerRef}
        onScroll={onScroll}
        className="h-full overflow-x-hidden overflow-y-auto bg-slate-50 px-3 py-5 sm:px-6"
      >
        {hasMore && (
          <div className="mb-5 text-center">
            <button
              type="button"
              onClick={onLoadOlder}
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
          <div className="mx-auto flex min-w-0 w-full max-w-7xl flex-col gap-3">
            {messages.map((message, messageIndex) => {
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

                  <ConversationMessageItem
                    message={message}
                    messageIndex={messageIndex}
                    totalMessages={messages.length}
                    currentUser={currentUser}
                    otherParticipantId={otherParticipantId}
                    updatedProfiles={updatedProfiles}
                    highlightedMessageId={highlightedMessageId}
                    isMenuOpen={openMessageMenuId === message._id}
                    isReactionPickerOpen={
                      reactionPickerMessageId === message._id
                    }
                    isDeleting={deletingMessageId === message._id}
                    isReacting={reactingMessageId === message._id}
                    onToggleMenu={() => onToggleMenu(message._id)}
                    onToggleReactionPicker={() =>
                      onToggleReactionPicker(message._id)
                    }
                    onCloseMenu={onCloseMenu}
                    onCloseReactionPicker={onCloseReactionPicker}
                    onReply={onReply}
                    onForward={onForward}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onReaction={onReaction}
                  />
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

      {isOtherUserTyping && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute bottom-4 left-4 z-20 flex max-w-[calc(100%_-_6rem)] items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm"
        >
          <span className="truncate">{displayName} is typing</span>
          <span aria-hidden="true" className="flex shrink-0 items-center gap-0.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-600 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-600 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-600" />
          </span>
        </div>
      )}

      {showScrollToBottom && (
        <button
          type="button"
          onClick={onScrollToBottom}
          aria-label="Jump to latest message"
          title="Jump to latest message"
          className="absolute bottom-5 right-5 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-cyan-600 text-white shadow-lg transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-200"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
