"use client";

import {
  AlertCircle,
  Check,
  CheckCheck,
  Forward,
  ListChecks,
  LoaderCircle,
  Pencil,
  Reply,
  SmilePlus,
  Trash2,
} from "lucide-react";

import MessageAttachmentContent from "@/components/chat/MessageAttachmentContent";
import MessageLinkPreview from "@/components/chat/MessageLinkPreview";
import UserAvatar from "@/components/chat/UserAvatar";
import ActionMenu, { type ActionMenuItem } from "@/components/ui/ActionMenu";
import { MESSAGE_REACTION_EMOJIS } from "@/types/message";
import type { AuthUser } from "@/types/auth";
import type {
  ChatMessage,
  DeleteMessageScope,
  MessageReactionEmoji,
} from "@/types/message";
import type { RealtimeUserProfile } from "@/types/user";

interface ConversationMessageItemProps {
  message: ChatMessage;
  messageIndex: number;
  totalMessages: number;
  currentUser: AuthUser;
  otherParticipantId?: string;
  updatedProfiles: ReadonlyMap<string, RealtimeUserProfile>;
  highlightedMessageId: string | null;
  isMenuOpen: boolean;
  isReactionPickerOpen: boolean;
  isDeleting: boolean;
  isReacting: boolean;
  isSelecting: boolean;
  isSelected: boolean;
  onToggleMenu: () => void;
  onToggleReactionPicker: () => void;
  onCloseMenu: () => void;
  onCloseReactionPicker: () => void;
  onReply: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (messageId: string, scope: DeleteMessageScope) => void;
  onReaction: (message: ChatMessage, emoji: MessageReactionEmoji) => void;
  onRetry: (message: ChatMessage) => void;
  onSelect: (message: ChatMessage) => void;
}

const formatMessageTime = (value: string): string =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const joinClasses = (
  ...classNames: Array<string | false | null | undefined>
): string => classNames.filter(Boolean).join(" ");

const getAttachmentDisplayType = (
  messageType: ChatMessage["type"],
  attachment: ChatMessage["attachment"],
): "image" | "file" | "audio" | "video" => {
  if (messageType === "image") {
    return "image";
  }

  if (messageType === "audio") {
    return "audio";
  }

  return attachment?.mimeType.startsWith("video/") ? "video" : "file";
};

export default function ConversationMessageItem({
  message,
  messageIndex,
  totalMessages,
  currentUser,
  otherParticipantId,
  updatedProfiles,
  highlightedMessageId,
  isMenuOpen,
  isReactionPickerOpen,
  isDeleting,
  isReacting,
  isSelecting,
  isSelected,
  onToggleMenu,
  onToggleReactionPicker,
  onCloseMenu,
  onCloseReactionPicker,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onReaction,
  onRetry,
  onSelect,
}: ConversationMessageItemProps) {
  const isMine = message.sender._id === currentUser._id;
  const updatedSenderProfile = updatedProfiles.get(message.sender._id);
  const senderName = isMine
    ? currentUser.name
    : (updatedSenderProfile?.name ?? message.sender.name ?? "Unknown user");
  const senderAvatarUrl = isMine
    ? currentUser.avatarUrl
    : (updatedSenderProfile?.avatarUrl ?? message.sender.avatarUrl);
  const updatedReplySenderProfile = message.replyTo
    ? updatedProfiles.get(message.replyTo.sender._id)
    : undefined;
  const readBy = Array.isArray(message.readBy) ? message.readBy : [];
  const deliveredTo = Array.isArray(message.deliveredTo)
    ? message.deliveredTo
    : [];
  const isReadByRecipient = otherParticipantId
    ? readBy.includes(otherParticipantId)
    : readBy.length > 1;
  const isDeliveredToRecipient = otherParticipantId
    ? deliveredTo.includes(otherParticipantId)
    : deliveredTo.length > 1;
  const receiptLabel = isReadByRecipient
    ? "Read"
    : isDeliveredToRecipient
      ? "Delivered"
      : "Sent";
  const isDeletedForEveryone = Boolean(message.deletedForEveryoneAt);
  const isSending = message.deliveryStatus === "sending";
  const hasFailed = message.deliveryStatus === "failed";
  const isPendingDelivery = isSending || hasFailed;
  const reactions = Array.isArray(message.reactions) ? message.reactions : [];
  const currentUserReaction = reactions.find(
    (reaction) => reaction.user === currentUser._id,
  );
  const groupedReactions = MESSAGE_REACTION_EMOJIS.map((emoji) => ({
    emoji,
    count: reactions.filter((reaction) => reaction.emoji === emoji).length,
  })).filter(({ count }) => count > 0);
  const menuOpensUpward = messageIndex >= totalMessages - 2;
  const messageMenuItems: ActionMenuItem[] = [
    ...(!isDeletedForEveryone
      ? [
          {
            id: "reply",
            label: "Reply",
            icon: Reply,
            onSelect: () => onReply(message),
          },
          {
            id: "forward",
            label: "Forward",
            icon: Forward,
            onSelect: () => onForward(message),
          },
        ]
      : []),
    ...(isMine && !isDeletedForEveryone
      ? [
          {
            id: "edit",
            label: "Edit message",
            icon: Pencil,
            onSelect: () => onEdit(message),
          },
        ]
      : []),
    ...(!isDeletedForEveryone
      ? [
          {
            id: "select",
            label: "Select messages",
            icon: ListChecks,
            onSelect: () => onSelect(message),
          },
        ]
      : []),
    {
      id: "delete-me",
      label: "Delete for me",
      icon: Trash2,
      onSelect: () => onDelete(message._id, "me"),
    },
    ...(isMine && !isDeletedForEveryone
      ? [
          {
            id: "delete-everyone",
            label: "Delete for everyone",
            icon: Trash2,
            tone: "danger" as const,
            onSelect: () => onDelete(message._id, "everyone"),
          },
        ]
      : []),
  ];

  return (
    <div
      id={"message-" + message._id}
      data-message-date={message.createdAt}
      className={joinClasses(
        "relative scroll-mt-6 flex w-full items-end gap-2",
        isMine ? "justify-end" : "justify-start",
      )}
    >
      {!isMine && (
        <UserAvatar
          name={senderName}
          avatarUrl={senderAvatarUrl}
          className="h-8 w-8 text-xs"
          fallbackClassName="bg-slate-200 font-semibold text-slate-700"
        />
      )}

      {isSelecting && !isPendingDelivery && (
        <button
          type="button"
          role="checkbox"
          aria-checked={isSelected}
          aria-label={isSelected ? "Deselect message" : "Select message"}
          onClick={() => onSelect(message)}
          className={joinClasses(
            "z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition",
            isSelected
              ? "border-[var(--chat-accent)] bg-[var(--chat-accent)] text-white"
              : "border-[var(--chat-border)] bg-[var(--chat-control)] text-transparent hover:border-[var(--chat-accent)]",
            isMine && "order-first",
          )}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>
      )}

      <div
        className={joinClasses(
          "relative min-w-0 max-w-[75%] rounded-2xl px-3 py-2 shadow-sm transition sm:max-w-[60%] lg:max-w-[55%]",
          isMine
            ? "chat-message-sent rounded-br-md bg-[var(--chat-sent)] text-white"
            : "chat-message-received rounded-bl-md border border-[var(--chat-border)] bg-[var(--chat-received)] text-[var(--chat-received-text)]",
          highlightedMessageId === message._id &&
            "ring-2 ring-amber-400 ring-offset-2",
        )}
      >
        {!isPendingDelivery && !isSelecting && (
          <div className="absolute right-1 top-1 z-30">
            <ActionMenu
              open={isMenuOpen}
              onOpenChange={(isOpen) => {
                if (isOpen) {
                  onToggleMenu();
                } else {
                  onCloseMenu();
                }
              }}
              isLoading={isDeleting}
              label="Message options"
              menuLabel="Message options"
              side={menuOpensUpward ? "top" : "bottom"}
              triggerClassName={joinClasses(
                "h-7 w-7",
                isMine
                  ? "text-white/75 hover:bg-white/15 hover:text-white"
                  : "text-[var(--chat-muted)] hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]",
              )}
              items={messageMenuItems}
            />
          </div>
        )}

        {message.isForwarded && !isDeletedForEveryone && (
          <div
            className={joinClasses(
              "mb-1 flex items-center gap-1 text-[11px] font-medium",
              isMine ? "text-white/80" : "text-[var(--chat-muted)]",
            )}
          >
            <Forward className="h-3 w-3" />
            Forwarded
          </div>
        )}

        {message.replyTo && (
          <div
            className={joinClasses(
              "mb-2 rounded-lg border-l-4 px-3 py-2",
              isMine
                ? "border-white/60 bg-white/10"
                : "border-[var(--chat-accent)] bg-[var(--chat-hover)]",
            )}
          >
            {message.replyTo.deletedForEveryoneAt ||
            message.replyTo.deletedFor.includes(currentUser._id) ? (
              <p
                className={joinClasses(
                  "truncate text-xs italic",
                  isMine ? "text-white/80" : "text-[var(--chat-muted)]",
                )}
              >
                Original message is unavailable
              </p>
            ) : (
              <>
                <p
                  className={joinClasses(
                    "truncate text-xs font-semibold",
                    isMine ? "text-white/80" : "text-[var(--chat-accent)]",
                  )}
                >
                  {message.replyTo.sender._id === currentUser._id
                    ? "You"
                    : (updatedReplySenderProfile?.name ??
                      message.replyTo.sender.name)}
                </p>
                {message.replyTo.attachment && (
                  <div className={message.replyTo.content ? "mb-2" : ""}>
                    <MessageAttachmentContent
                      attachment={message.replyTo.attachment}
                      messageType={getAttachmentDisplayType(
                        message.replyTo.type,
                        message.replyTo.attachment,
                      )}
                      isMine={isMine}
                      compact
                    />
                  </div>
                )}
                <p
                  className={joinClasses(
                    "mt-0.5 truncate text-xs",
                    isMine ? "text-white/90" : "text-[var(--chat-muted)]",
                  )}
                >
                  {message.replyTo.content ||
                    (message.replyTo.type === "image"
                      ? "📷 Image"
                      : message.replyTo.type === "audio"
                        ? "🎤 Voice note"
                      : message.replyTo.attachment?.fileName || "File")}
                </p>
              </>
            )}
          </div>
        )}

        {message.attachment && !isDeletedForEveryone && (
          <div className={message.content ? "mb-2" : ""}>
            <MessageAttachmentContent
              attachment={message.attachment}
              messageType={getAttachmentDisplayType(
                message.type,
                message.attachment,
              )}
              isMine={isMine}
            />
          </div>
        )}

        {message.linkPreview && !isDeletedForEveryone && (
          <MessageLinkPreview
            preview={message.linkPreview}
            isMine={isMine}
          />
        )}

        {(isDeletedForEveryone || message.content) && (
          <p
            className={joinClasses(
              "whitespace-pre-wrap break-words pr-14 text-sm leading-5",
              isDeletedForEveryone && "italic opacity-80",
            )}
          >
            {isDeletedForEveryone
              ? "This message was deleted"
              : message.content}
          </p>
        )}

        {groupedReactions.length > 0 &&
          !isDeletedForEveryone &&
          !isPendingDelivery &&
          !isSelecting && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {groupedReactions.map(({ emoji, count }) => (
              <button
                key={emoji}
                type="button"
                disabled={isReacting}
                onClick={() => onReaction(message, emoji)}
                aria-label={emoji + " reaction, " + count}
                className={joinClasses(
                  "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition disabled:opacity-50",
                  currentUserReaction?.emoji === emoji
                    ? "border-[var(--chat-accent)] bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]"
                    : "border-[var(--chat-border)] bg-[var(--chat-control)] text-[var(--chat-muted)] hover:border-[var(--chat-muted)]",
                )}
              >
                <span>{emoji}</span>
                <span className="font-semibold">{count}</span>
              </button>
            ))}
          </div>
        )}

        <div
          className={joinClasses(
            "mt-1 flex items-center justify-end gap-1.5 text-[10px]",
            isMine ? "text-white/75" : "text-[var(--chat-muted)]",
          )}
        >
          {message.editedAt && !isDeletedForEveryone && (
            <span className="italic">Edited</span>
          )}

          {isSending ? (
            <span className="inline-flex items-center gap-1" role="status">
              <LoaderCircle className="h-3 w-3 animate-spin" />
              {message.attachment &&
              typeof message.uploadProgress === "number" &&
              message.uploadProgress < 100
                ? `Uploading ${message.uploadProgress}%`
                : "Sending…"}
            </span>
          ) : hasFailed ? (
            <button
              type="button"
              onClick={() => onRetry(message)}
              title={message.deliveryError || "Message failed to send. Retry."}
              className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              Retry
            </button>
          ) : (
            <span>{formatMessageTime(message.createdAt)}</span>
          )}

          {isMine && !isDeletedForEveryone && !isPendingDelivery && (
            <span
              title={receiptLabel}
              aria-label={receiptLabel}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--chat-control)] shadow-sm ring-1 ring-black/10"
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

      {!isDeletedForEveryone && !isPendingDelivery && !isSelecting && (
        <button
          type="button"
          disabled={isReacting}
          onClick={onToggleReactionPicker}
          aria-label="React to message"
          title="React to message"
          className={joinClasses(
            "z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--chat-border)] bg-[var(--chat-control)] text-[var(--chat-muted)] shadow-sm transition hover:border-[var(--chat-accent)] hover:bg-[var(--chat-accent-soft)] hover:text-[var(--chat-accent)] disabled:opacity-50",
            isMine && "order-first",
          )}
        >
          {isReacting ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <SmilePlus className="h-4 w-4" />
          )}
        </button>
      )}

      {isReactionPickerOpen &&
        !isDeletedForEveryone &&
        !isPendingDelivery &&
        !isSelecting && (
        <>
          <button
            type="button"
            aria-label="Close reaction picker"
            onClick={onCloseReactionPicker}
            className="fixed inset-0 z-40 cursor-default"
          />

          <div
            className={joinClasses(
              "absolute z-50 flex items-center gap-1 whitespace-nowrap rounded-full border border-[var(--chat-border)] bg-[var(--chat-control)] p-1.5 shadow-xl",
              isMine ? "right-10" : "left-10",
              menuOpensUpward ? "bottom-9" : "top-9",
            )}
          >
            {MESSAGE_REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                disabled={isReacting}
                onClick={() => onReaction(message, emoji)}
                aria-label={"React with " + emoji}
                className={joinClasses(
                    "flex h-9 w-9 items-center justify-center rounded-full text-xl transition hover:scale-110 hover:bg-[var(--chat-hover)] disabled:opacity-50",
                  currentUserReaction?.emoji === emoji &&
                    "bg-[var(--chat-accent-soft)] ring-2 ring-[var(--chat-accent)]",
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}

      {isMine && (
        <UserAvatar
          name={senderName}
          avatarUrl={senderAvatarUrl}
          className="h-8 w-8 text-xs"
          fallbackClassName="bg-cyan-100 font-semibold text-cyan-800"
        />
      )}
    </div>
  );
}
