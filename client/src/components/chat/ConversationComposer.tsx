"use client";

import { Check, LoaderCircle, SendHorizontal, X } from "lucide-react";
import {
  useLayoutEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type RefObject,
} from "react";

import MessageAttachmentUploader from "@/components/chat/MessageAttachmentUploader";
import VoiceNoteRecorder, {
  type VoiceNoteStatus,
} from "@/components/chat/VoiceNoteRecorder";
import type { ChatMessage } from "@/types/message";

interface ConversationComposerProps {
  conversationId: string;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  messageText: string;
  replyingToMessage: ChatMessage | null;
  replySenderName: string;
  editingMessageId: string | null;
  isSending: boolean;
  isEditingMessage: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMessageChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onCancelReplying: () => void;
  onCancelEditing: () => void;
  onAttachmentSent: (message: ChatMessage) => void;
}

export default function ConversationComposer({
  conversationId,
  messageInputRef,
  messageText,
  replyingToMessage,
  replySenderName,
  editingMessageId,
  isSending,
  isEditingMessage,
  onSubmit,
  onMessageChange,
  onCancelReplying,
  onCancelEditing,
  onAttachmentSent,
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

  return (
    <form
      onSubmit={onSubmit}
      className="shrink-0 border-t border-slate-200 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:p-4"
    >
      {replyingToMessage && (
        <div className="mb-3 flex items-center justify-between rounded-xl border-l-4 border-cyan-600 bg-cyan-50 px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-cyan-700">
              Replying to {replySenderName}
            </p>

            <p className="mt-0.5 truncate text-xs text-slate-500">
              {replyPreview}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancelReplying}
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
            onClick={onCancelEditing}
            disabled={isEditingMessage}
            aria-label="Cancel editing"
            title="Cancel editing"
            className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-cyan-100 hover:text-slate-800 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex min-w-0 items-end gap-1 sm:gap-2">
        {!editingMessageId && (
          <VoiceNoteRecorder
            conversationId={conversationId}
            replyToMessageId={replyingToMessage?._id ?? null}
            disabled={isSending || isEditingMessage}
            onMessageSent={onAttachmentSent}
            onStatusChange={setVoiceNoteStatus}
          />
        )}

        {!isRecordingVoiceNote && (
          <MessageAttachmentUploader
            conversationId={conversationId}
            replyToMessageId={replyingToMessage?._id ?? null}
            disabled={isSending || isEditingMessage || editingMessageId !== null}
            onMessageSent={onAttachmentSent}
          />
        )}

        {!isRecordingVoiceNote && (
          <textarea
            ref={messageInputRef}
            value={messageText}
            onChange={onMessageChange}
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
            className="scrollbar-hidden block min-h-10 max-h-32 min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border border-slate-300 bg-slate-100 px-3 py-2 text-base leading-5 text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100 sm:px-4 sm:text-sm"
          />
        )}

        {!isRecordingVoiceNote && (
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
        )}
      </div>
    </form>
  );
}
