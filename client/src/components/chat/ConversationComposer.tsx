"use client";

import { Check, LoaderCircle, SendHorizontal, X } from "lucide-react";
import {
  useLayoutEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";

import MessageAttachmentUploader from "@/components/chat/MessageAttachmentUploader";
import VoiceNoteRecorder, {
  type VoiceNoteStatus,
} from "@/components/chat/VoiceNoteRecorder";
import type { ChatMessage } from "@/types/message";

interface ConversationComposerProps {
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  messageText: string;
  replyingToMessage: ChatMessage | null;
  replySenderName: string;
  editingMessageId: string | null;
  isEditingMessage: boolean;
  isMessagingDisabled?: boolean;
  messagingDisabledMessage?: string;
  onManageMessaging?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMessageChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onCancelReplying: () => void;
  onCancelEditing: () => void;
  onAttachmentQueued: (
    file: File,
    content: string,
    replyToMessageId: string | null,
  ) => void;
  onVoiceNoteQueued: (file: File, replyToMessageId: string | null) => void;
}

export default function ConversationComposer({
  messageInputRef,
  messageText,
  replyingToMessage,
  replySenderName,
  editingMessageId,
  isEditingMessage,
  isMessagingDisabled = false,
  messagingDisabledMessage = "Messaging is unavailable in this conversation.",
  onManageMessaging,
  onSubmit,
  onMessageChange,
  onCancelReplying,
  onCancelEditing,
  onAttachmentQueued,
  onVoiceNoteQueued,
}: ConversationComposerProps) {
  const [voiceNoteStatus, setVoiceNoteStatus] =
    useState<VoiceNoteStatus>("idle");
  const isRecordingVoiceNote = voiceNoteStatus === "recording";

  useLayoutEffect(() => {
    const input = messageInputRef.current;

    if (!input || isRecordingVoiceNote) {
      return;
    }

    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 128) + "px";
  }, [isRecordingVoiceNote, messageInputRef, messageText]);

  const replyPreview =
    replyingToMessage?.content ||
    (replyingToMessage?.type === "image"
      ? "📷 Image"
      : replyingToMessage?.type === "audio"
        ? "🎤 Voice note"
      : replyingToMessage?.attachment?.fileName || "File");

  const handleMessageKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();

    if (!messageText.trim() || isEditingMessage) {
      return;
    }

    event.currentTarget.form?.requestSubmit();
  };

  return (
    <form
      onSubmit={onSubmit}
      className="shrink-0 border-t border-[var(--chat-border)] bg-[var(--chat-surface)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 text-[var(--chat-text)] sm:p-4"
    >
      {replyingToMessage && (
        <div className="mb-3 flex items-center justify-between rounded-xl border-l-4 border-[var(--chat-accent)] bg-[var(--chat-accent-soft)] px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--chat-accent)]">
              Replying to {replySenderName}
            </p>

            <p className="mt-0.5 truncate text-xs text-[var(--chat-muted)]">
              {replyPreview}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancelReplying}
            aria-label="Cancel reply"
            title="Cancel reply"
            className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-control)] hover:text-[var(--chat-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {editingMessageId && (
        <div className="mb-3 flex items-center justify-between rounded-xl border-l-4 border-[var(--chat-accent)] bg-[var(--chat-accent-soft)] px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--chat-accent)]">
              Editing message
            </p>

            <p className="truncate text-xs text-[var(--chat-muted)]">
              Update the message and press the check button.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancelEditing}
            disabled={isEditingMessage}
            aria-label="Cancel editing"
            title="Cancel editing"
            className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-control)] hover:text-[var(--chat-text)] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isMessagingDisabled ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-[var(--chat-border)] bg-[var(--chat-hover)] px-3 py-2.5 text-sm text-[var(--chat-muted)]"
        >
          <p>{messagingDisabledMessage}</p>

          {onManageMessaging && (
            <button
              type="button"
              onClick={onManageMessaging}
              className="shrink-0 rounded-lg bg-[var(--chat-control)] px-3 py-1.5 text-xs font-semibold text-[var(--chat-accent)] shadow-sm ring-1 ring-[var(--chat-border)] transition hover:bg-[var(--chat-accent-soft)]"
            >
              Manage
            </button>
          )}
        </div>
      ) : (
        <div className="flex min-w-0 items-end gap-1 sm:gap-2">
          {!editingMessageId && (
            <VoiceNoteRecorder
              replyToMessageId={replyingToMessage?._id ?? null}
              disabled={isEditingMessage}
              onVoiceNoteQueued={onVoiceNoteQueued}
              onStatusChange={setVoiceNoteStatus}
            />
          )}

          {!isRecordingVoiceNote && (
            <MessageAttachmentUploader
              replyToMessageId={replyingToMessage?._id ?? null}
              disabled={
                isEditingMessage || editingMessageId !== null
              }
              onAttachmentQueued={onAttachmentQueued}
            />
          )}

          {!isRecordingVoiceNote && (
            <textarea
              ref={messageInputRef}
              value={messageText}
              onChange={onMessageChange}
              onKeyDown={handleMessageKeyDown}
              maxLength={5000}
              rows={1}
              placeholder={
                editingMessageId
                  ? "Edit your message"
                  : replyingToMessage
                    ? "Write a reply"
                    : "Type a message"
              }
              aria-label={editingMessageId ? "Edit message" : "Message"}
              className="scrollbar-hidden block min-h-10 max-h-32 min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-input)] px-3 py-2 text-base leading-5 text-[var(--chat-text)] outline-none transition placeholder:text-[var(--chat-muted)] focus:border-[var(--chat-accent)] focus:bg-[var(--chat-control)] focus:ring-4 focus:ring-[var(--chat-accent-soft)] sm:px-4 sm:text-sm"
            />
          )}

          {!isRecordingVoiceNote && (
            <button
              type="submit"
              disabled={!messageText.trim() || isEditingMessage}
              aria-label={
                editingMessageId ? "Save edited message" : "Send message"
              }
              title={editingMessageId ? "Save changes" : "Send message"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--chat-sent)] text-white transition hover:bg-[var(--chat-sent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEditingMessage ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : editingMessageId ? (
                <Check className="h-5 w-5" />
              ) : (
                <SendHorizontal className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
