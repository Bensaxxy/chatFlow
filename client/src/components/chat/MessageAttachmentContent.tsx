"use client";

import {
  FileArchive,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Maximize2,
  Pause,
  Play,
  Video,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import AttachmentPreviewDialog from "@/components/chat/AttachmentPreviewDialog";
import type { MessageAttachment } from "@/types/message";

interface MessageAttachmentContentProps {
  attachment: MessageAttachment;
  messageType: "image" | "file" | "audio" | "video";
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
    return "0:00";
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

interface VoiceNotePlayerProps {
  src: string;
  initialDuration: number | null | undefined;
  isMine: boolean;
}

function VoiceNotePlayer({
  src,
  initialDuration,
  isMine,
}: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null);
  const duration = initialDuration ?? loadedDuration ?? 0;
  const maximum = Math.max(duration, 1);

  useEffect(() => {
    const audio = audioRef.current;

    return () => {
      audio?.pause();
    };
  }, []);

  const togglePlayback = async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }

      return;
    }

    audio.pause();
    setIsPlaying(false);
  };

  const seek = (value: number) => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = value;
    setCurrentTime(value);
  };

  return (
    <div className="mt-2 flex min-w-0 items-center gap-2">
      <audio
        ref={audioRef}
        className="hidden"
        preload="metadata"
        src={src}
        onLoadedMetadata={(event) => {
          const durationFromPlayer = event.currentTarget.duration;

          if (Number.isFinite(durationFromPlayer)) {
            setLoadedDuration(durationFromPlayer);
          }
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onEnded={() => {
          setCurrentTime(0);
          setIsPlaying(false);
        }}
      />

      <button
        type="button"
        onClick={() => void togglePlayback()}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        title={isPlaying ? "Pause voice note" : "Play voice note"}
        className={joinClasses(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          isMine
            ? "bg-cyan-500 text-white hover:bg-cyan-400 focus-visible:ring-cyan-200 focus-visible:ring-offset-cyan-700"
            : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200 focus-visible:ring-cyan-500 focus-visible:ring-offset-slate-50",
        )}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current" />
        )}
      </button>

      <input
        type="range"
        min="0"
        max={maximum}
        step="0.1"
        value={Math.min(currentTime, maximum)}
        onChange={(event) => seek(Number(event.target.value))}
        aria-label="Voice note playback position"
        className={joinClasses(
          "h-2 min-w-0 flex-1 cursor-pointer accent-cyan-600",
          isMine && "accent-white",
        )}
      />

      <span
        className={joinClasses(
          "w-9 shrink-0 text-right text-xs tabular-nums",
          isMine ? "text-cyan-100" : "text-slate-500",
        )}
      >
        {formatAudioDuration(duration)}
      </span>
    </div>
  );
}

export default function MessageAttachmentContent({
  attachment,
  messageType,
  isMine = false,
  compact = false,
}: MessageAttachmentContentProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
    return (
      <div
        className={joinClasses(
          "flex min-w-0 overflow-hidden rounded-xl border p-3",
          isMine
            ? "border-cyan-400/70 bg-cyan-700/50"
            : "border-slate-200 bg-slate-50",
          compact ? "max-w-full" : "w-full max-w-sm",
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

        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            Voice note
          </span>

          {!compact && (
            <VoiceNotePlayer
              src={attachment.url}
              initialDuration={attachment.duration}
              isMine={isMine}
            />
          )}

          {compact && (
            <span
              className={joinClasses(
                "mt-1 block text-xs",
                isMine ? "text-cyan-100" : "text-slate-500",
              )}
            >
              {formatAudioDuration(attachment.duration)}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (messageType === "video") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className={joinClasses(
            "group relative block overflow-hidden rounded-xl bg-slate-950 text-left",
            compact ? "max-w-52" : "max-w-sm",
          )}
          aria-label={`Play ${attachment.fileName}`}
        >
          <video
            muted
            playsInline
            preload="metadata"
            src={attachment.url}
            className={joinClasses(
              "block w-full object-cover opacity-85 transition duration-300 group-hover:scale-[1.02] group-hover:opacity-100",
              compact ? "max-h-40" : "max-h-64",
            )}
          />

          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-lg transition group-hover:scale-105">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
          </span>

          <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-slate-950/85 to-transparent px-3 pb-2 pt-8 text-xs font-medium text-white">
            <Video className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{attachment.fileName}</span>
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
          compact ? "max-w-full" : "w-full max-w-sm",
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
