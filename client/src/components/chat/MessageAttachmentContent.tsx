"use client";

import {
  FileArchive,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Maximize2,
  Mic,
  Pause,
  Play,
  Video,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import AttachmentPreviewDialog from "@/components/chat/AttachmentPreviewDialog";
import UserAvatar from "@/components/chat/UserAvatar";
import type { MessageAttachment } from "@/types/message";

interface MessageAttachmentContentProps {
  attachment: MessageAttachment;
  messageType: "image" | "file" | "audio" | "video";
  isMine?: boolean;
  compact?: boolean;
  senderName?: string;
  senderAvatarUrl?: string | null;
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

const MIN_WAVEFORM_WIDTH = 120;
const MAX_WAVEFORM_WIDTH = 240;
const WAVEFORM_BAR_WIDTH = 2;
const WAVEFORM_BAR_GAP = 2;
const WAVEFORM_TRACK_INSET = 5;

// Only one voice note plays at a time (same as WhatsApp / Telegram).
let activeVoiceNote: HTMLAudioElement | null = null;

// Longer notes get a longer waveform, up to a cap. It shrinks to fit the
// bubble on narrow screens (see the ResizeObserver below).
const getWaveformWidth = (duration: number): number =>
  Math.min(
    MAX_WAVEFORM_WIDTH,
    Math.max(MIN_WAVEFORM_WIDTH, 100 + duration * 5),
  );

// The stored waveform has up to 96 real samples. Fit it to however many bars
// the bubble can actually show, averaging when there are fewer bars than
// samples and picking the nearest sample when there are more.
const resampleWaveform = (samples: number[], count: number): number[] => {
  if (!samples.length || count <= 0) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => {
    const start = (index * samples.length) / count;
    const end = ((index + 1) * samples.length) / count;

    if (end - start <= 1) {
      return samples[
        Math.min(samples.length - 1, Math.floor((start + end) / 2))
      ];
    }

    let sum = 0;
    let weight = 0;

    for (let s = Math.floor(start); s < Math.ceil(end); s += 1) {
      const overlap = Math.min(end, s + 1) - Math.max(start, s);

      sum += samples[s] * overlap;
      weight += overlap;
    }

    return weight > 0 ? sum / weight : 0;
  });
};

interface VoiceNotePlayerProps {
  src: string;
  initialDuration: number | null | undefined;
  isMine: boolean;
  waveform?: number[];
}

function VoiceNotePlayer({
  src,
  initialDuration,
  isMine,
  waveform,
}: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const isProbingDurationRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

  const duration =
    loadedDuration ??
    (initialDuration && initialDuration > 0 ? initialDuration : 0);
  const maximum = Math.max(duration, 1);
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const waveformWidth = getWaveformWidth(duration);

  const trackWidth = Math.max(
    0,
    (measuredWidth ?? waveformWidth) - WAVEFORM_TRACK_INSET * 2,
  );
  const barCount = Math.max(
    8,
    Math.floor(
      (trackWidth + WAVEFORM_BAR_GAP) / (WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP),
    ),
  );
  const bars = useMemo(
    () => (waveform?.length ? resampleWaveform(waveform, barCount) : []),
    [waveform, barCount],
  );

  // Keep the bar count in sync with the real rendered width.
  useEffect(() => {
    const element = waveformRef.current;

    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setMeasuredWidth(entry.contentRect.width);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  // `timeupdate` only fires ~4 times a second, which makes the progress dot
  // jump. While playing, read the clock every frame instead.
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let frame = 0;

    const tick = () => {
      const audio = audioRef.current;

      if (audio && !isProbingDurationRef.current) {
        setCurrentTime(audio.currentTime);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;

    return () => {
      audio?.pause();

      if (activeVoiceNote === audio) {
        activeVoiceNote = null;
      }
    };
  }, []);

  const handleDurationChange = (audio: HTMLAudioElement) => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setLoadedDuration(audio.duration);
    }
  };

  const handleLoadedMetadata = (audio: HTMLAudioElement) => {
    handleDurationChange(audio);

    // Browser-recorded WebM files have no duration header, so the element
    // reports Infinity. If the server did not give us a duration either,
    // seek to the end once so the browser works out the real length.
    if (
      audio.duration === Infinity &&
      !(initialDuration && initialDuration > 0)
    ) {
      isProbingDurationRef.current = true;

      const restore = () => {
        audio.removeEventListener("timeupdate", restore);
        isProbingDurationRef.current = false;
        audio.currentTime = 0;
        setCurrentTime(0);
      };

      audio.addEventListener("timeupdate", restore);
      audio.currentTime = Number.MAX_SAFE_INTEGER;
    }
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      if (activeVoiceNote && activeVoiceNote !== audio) {
        activeVoiceNote.pause();
      }

      activeVoiceNote = audio;

      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
      }

      return;
    }

    audio.pause();
  };

  const seek = (value: number) => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = value;
    setCurrentTime(value);
  };

  // Like WhatsApp: show the total length until playback starts, then show the
  // elapsed time (and keep it when paused).
  const timeLabel = formatAudioDuration(
    currentTime > 0 ? Math.floor(currentTime) : duration,
  );

  return (
    <div className="flex h-10 min-w-0 items-center gap-2.5">
      <audio
        ref={audioRef}
        className="hidden"
        preload="metadata"
        src={src}
        onLoadedMetadata={(event) => handleLoadedMetadata(event.currentTarget)}
        onDurationChange={(event) => handleDurationChange(event.currentTarget)}
        onTimeUpdate={(event) => {
          if (!isProbingDurationRef.current) {
            setCurrentTime(event.currentTarget.currentTime);
          }
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onEnded={() => {
          const audio = audioRef.current;

          if (audio) {
            audio.currentTime = 0;
          }

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
          "group flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          isMine
            ? "focus-visible:ring-cyan-200 focus-visible:ring-offset-cyan-700"
            : "focus-visible:ring-cyan-500 focus-visible:ring-offset-slate-50",
        )}
      >
        <span
          className={joinClasses(
            "flex h-8 w-8 items-center justify-center rounded-full transition",
            isMine
              ? "bg-cyan-500 text-white group-hover:bg-cyan-400"
              : "bg-cyan-100 text-cyan-700 group-hover:bg-cyan-200",
          )}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          )}
        </span>
      </button>

      <div
        className="relative h-10 min-w-0 max-w-full"
        style={{ width: `${waveformWidth}px` }}
      >
        <div
          ref={waveformRef}
          className="absolute inset-x-0 top-1/2 flex h-8 -translate-y-1/2 items-center rounded focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-500/70"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 flex items-center"
            style={{
              left: WAVEFORM_TRACK_INSET,
              right: WAVEFORM_TRACK_INSET,
            }}
          >
            {bars.length ? (
              <div className="flex h-full w-full items-center justify-between">
                {bars.map((sample, index) => (
                  <span
                    key={index}
                    className={joinClasses(
                      "shrink-0 rounded-full transition-colors duration-100",
                      (index + 0.5) / bars.length <= progress
                        ? isMine
                          ? "bg-cyan-100"
                          : "bg-cyan-600"
                        : isMine
                          ? "bg-cyan-900/45"
                          : "bg-slate-300",
                    )}
                    style={{
                      width: WAVEFORM_BAR_WIDTH,
                      height: `${Math.max(3, 3 + Math.min(1, sample) * 24)}px`,
                    }}
                  />
                ))}
              </div>
            ) : (
              // Fallback when the waveform could not be generated.
              <div
                className={joinClasses(
                  "h-1 w-full rounded-full",
                  isMine ? "bg-cyan-900/45" : "bg-slate-300",
                )}
              >
                <div
                  className={joinClasses(
                    "h-full rounded-full",
                    isMine ? "bg-cyan-100" : "bg-cyan-600",
                  )}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            )}

            <span
              className={joinClasses(
                "absolute top-1/2 z-[1] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm",
                isMine ? "bg-cyan-100" : "bg-cyan-500",
              )}
              style={{ left: `${progress * 100}%` }}
            />
          </div>

          <input
            type="range"
            min="0"
            max={maximum}
            step="0.05"
            value={Math.min(currentTime, maximum)}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Voice note playback position"
            aria-valuetext={`${formatAudioDuration(currentTime)} of ${formatAudioDuration(duration)}`}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <span
          className={joinClasses(
            "absolute left-0 top-full z-10 mt-0.5 block text-[11px] leading-3 tabular-nums",
            isMine ? "text-cyan-100" : "text-slate-500",
          )}
        >
          {timeLabel}
        </span>
      </div>
    </div>
  );
}

export default function MessageAttachmentContent({
  attachment,
  messageType,
  isMine = false,
  compact = false,
  senderName,
  senderAvatarUrl,
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
          "flex w-fit min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-xl border px-3 py-4",
          isMine
            ? "border-cyan-400/70 bg-cyan-700/50"
            : "border-slate-200 bg-slate-50",
          compact ? "max-w-full" : "max-w-sm",
        )}
      >
        {!compact && senderName ? (
          <span className="relative shrink-0">
            <UserAvatar
              name={senderName}
              avatarUrl={senderAvatarUrl}
              className="h-11 w-11 border-2 border-white/80"
            />

            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-white ring-2 ring-white"
            >
              <Mic className="h-3 w-3" />
            </span>
          </span>
        ) : (
          <span
            className={joinClasses(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
              isMine ? "bg-cyan-500 text-white" : "bg-cyan-100 text-cyan-700",
            )}
          >
            <Volume2 className="h-5 w-5" />
          </span>
        )}

        <div className="min-w-0">
          {!compact && (
            <VoiceNotePlayer
              src={attachment.url}
              initialDuration={attachment.duration}
              isMine={isMine}
              waveform={attachment.waveform}
            />
          )}

          {compact && (
            <span className="block truncate text-sm font-semibold">
              Voice note · {formatAudioDuration(attachment.duration)}
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
