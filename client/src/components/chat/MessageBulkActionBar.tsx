"use client";

import { Forward, LoaderCircle, Trash2, X } from "lucide-react";

interface MessageBulkActionBarProps {
  selectedCount: number;
  canDeleteForEveryone: boolean;
  isWorking?: boolean;
  onCancel: () => void;
  onForward: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
}

export default function MessageBulkActionBar({
  selectedCount,
  canDeleteForEveryone,
  isWorking = false,
  onCancel,
  onForward,
  onDeleteForMe,
  onDeleteForEveryone,
}: MessageBulkActionBarProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-cyan-100 bg-cyan-50 px-3 py-2 sm:px-6">
      <button
        type="button"
        disabled={isWorking}
        onClick={onCancel}
        aria-label="Cancel message selection"
        title="Cancel selection"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-white disabled:opacity-50"
      >
        <X className="h-5 w-5" />
      </button>

      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
        {selectedCount} {selectedCount === 1 ? "message" : "messages"} selected
      </p>

      <button
        type="button"
        disabled={isWorking}
        onClick={onForward}
        aria-label="Forward selected messages"
        title="Forward selected messages"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-cyan-700 transition hover:bg-white disabled:opacity-50"
      >
        <Forward className="h-5 w-5" />
      </button>

      <button
        type="button"
        disabled={isWorking}
        onClick={onDeleteForMe}
        aria-label="Delete selected messages for you"
        title="Delete for me"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-white disabled:opacity-50"
      >
        {isWorking ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          <Trash2 className="h-5 w-5" />
        )}
      </button>

      {canDeleteForEveryone && (
        <button
          type="button"
          disabled={isWorking}
          onClick={onDeleteForEveryone}
          aria-label="Delete selected messages for everyone"
          title="Delete for everyone"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-red-600 transition hover:bg-white disabled:opacity-50"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
