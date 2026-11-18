"use client";

import {
  FileArchive,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Maximize2,
  Volume2,
} from "lucide-react";
import { useState } from "react";

import AttachmentPreviewDialog from "@/components/chat/AttachmentPreviewDialog";
import type { MessageAttachment } from "@/types/message";

interface MessageAttachmentContentProps {
  attachment: MessageAttachment;
  messageType: "image" | "file" | "audio";
  isMine?: boolean;
  compact?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Unknown size";
  }

  if (bytes < 1024) {
    return bytes + " B";
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return kilobytes.toFixed(kilobytes >= 100 ? 0 : 1) + " KB";
  }

  const megabytes = kilobytes / 1024;

  return megabytes.toFixed(megabytes >= 100 ? 0 : 1) + " MB";
};

const formatAudioDuration = (seconds: number | null | undefined): string => {
  if (!Number.isFinite(seconds) || !seconds || seconds < 0) {
    return "Voice note";
  }

  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

function AttachmentFileIcon({ mimeType }: { mimeType: string }) {
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-zip-compressed"
  ) {
    return <FileArchive className="h-5 w-5" />;
  }

  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  ) {
    return <FileSpreadsheet className="h-5 w-5" />;
  }

  return <FileText className="h-5 w-5" />;
}

const joinClasses = (
  ...classNames: Array<string | false | null | undefined>
): string => classNames.filter(Boolean).join(" ");

export default function MessageAttachmentContent({
  attachment,
  messageType,
  isMine = false,
  compact = false,
}: MessageAttachmentContentProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loadedAudioDuration, setLoadedAudioDuration] = useState<
    number | null
  >(null);

  if (messageType === "image") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className={joinClasses(
            "group relative block overflow-hidden rounded-xl text-left",
            compact ? "max-w-52" : "max-w-sm",
          )}
          aria-label={"Preview " + attachment.fileName}
        >
          <img
            src={attachment.url}
            alt={attachment.fileName}
            width={attachment.width ?? undefined}
            height={attachment.height ?? undefined}
            loading="lazy"
            className={joinClasses(
              "block w-full bg-slate-100 object-cover transition duration-300 group-hover:scale-[1.02]",
              compact ? "max-h-40" : "max-h-80",
            )}
          />

          <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/60 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
            <Maximize2 className="h-4 w-4" />
          </span>

          <span className="sr-only">
            <ImageIcon className="h-4 w-4" />
            Preview image attachment
          </span>
        </button>

        {isPreviewOpen && (
          <AttachmentPreviewDialog
            attachment={attachment}
            messageType={messageType}
            onClose={() => setIsPreviewOpen(false)}
          />
        )}
      </>
    );
  }

  if (messageType === "audio") {
    const duration = attachment.duration ?? loadedAudioDuration;

    return (
      <div
        className={joinClasses(
          "flex min-w-0 items-center gap-3 rounded-xl border p-3",
          isMine
            ? "border-cyan-400/70 bg-cyan-700/50"
            : "border-slate-200 bg-slate-50",
          compact ? "max-w-64" : "min-w-64 max-w-sm",
        )}
      >
        <span
          className={joinClasses(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            isMine ? "bg-cyan-500 text-white" : "bg-cyan-100 text-cyan-700",
          )}
        >
          <Volume2 className="h-5 w-5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Voice note</span>

          {!compact && (
            <audio
              controls
              preload="metadata"
              src={attachment.url}
              onLoadedMetadata={(event) => {
                const durationFromPlayer = event.currentTarget.duration;

                if (Number.isFinite(durationFromPlayer)) {
                  setLoadedAudioDuration(durationFromPlayer);
                }
              }}
              className="mt-2 h-9 w-full min-w-0 accent-cyan-600"
            >
              Your browser cannot play this voice note.
            </audio>
          )}

          <span
            className={joinClasses(
              "mt-1 block text-xs",
              isMine ? "text-cyan-100" : "text-slate-500",
            )}
          >
            {formatAudioDuration(duration)}
          </span>
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsPreviewOpen(true)}
        className={joinClasses(
          "flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition",
          isMine
            ? "border-cyan-400/70 bg-cyan-700/50 hover:bg-cyan-700/70"
            : "border-slate-200 bg-slate-50 hover:bg-slate-100",
          compact ? "max-w-64" : "min-w-64 max-w-sm",
        )}
        aria-label={"Preview " + attachment.fileName}
      >
        <span
          className={joinClasses(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            isMine ? "bg-cyan-500 text-white" : "bg-cyan-100 text-cyan-700",
          )}
        >
          <AttachmentFileIcon mimeType={attachment.mimeType} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {attachment.fileName}
          </span>

          <span
            className={joinClasses(
              "mt-0.5 block text-xs",
              isMine ? "text-cyan-100" : "text-slate-500",
            )}
          >
            {formatFileSize(attachment.size)}
          </span>
        </span>

        <Maximize2
          className={joinClasses(
            "h-5 w-5 shrink-0",
            isMine ? "text-cyan-100" : "text-slate-500",
          )}
        />
      </button>

      {isPreviewOpen && (
        <AttachmentPreviewDialog
          attachment={attachment}
          messageType={messageType}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  );
}
