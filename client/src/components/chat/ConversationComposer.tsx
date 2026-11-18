"use client";

import { Check, LoaderCircle, SendHorizontal, X } from "lucide-react";
import type {
  ChangeEvent,
  FormEvent,
  RefObject,
} from "react";

import MessageAttachmentUploader from "@/components/chat/MessageAttachmentUploader";
import type { ChatMessage } from "@/types/message";

interface ConversationComposerProps {
  conversationId: string;
  messageInputRef: RefObject<HTMLInputElement | null>;
  messageText: string;
  replyingToMessage: ChatMessage | null;
  replySenderName: string;
  editingMessageId: string | null;
  isSending: boolean;
  isEditingMessage: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMessageChange: (event: ChangeEvent<HTMLInputElement>) => void;
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
  const replyPreview =
    replyingToMessage?.content ||
    (replyingToMessage?.type === "image"
      ? "📷 Image"
      : replyingToMessage?.attachment?.fileName || "File");

  return (
    <form
      onSubmit={onSubmit}
      className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4"
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

      <div className="flex items-center gap-3">
        <MessageAttachmentUploader
          conversationId={conversationId}
          replyToMessageId={replyingToMessage?._id ?? null}
          disabled={isSending || isEditingMessage || editingMessageId !== null}
          onMessageSent={onAttachmentSent}
        />

        <input
          ref={messageInputRef}
          type="text"
          value={messageText}
          onChange={onMessageChange}
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
          aria-label={editingMessageId ? "Save edited message" : "Send message"}
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
  );
}
