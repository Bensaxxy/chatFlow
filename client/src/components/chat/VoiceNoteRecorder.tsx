"use client";

import { LoaderCircle, Mic, SendHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import { getApiErrorMessage } from "@/lib/api/errors";
import { sendConversationAttachment } from "@/services/message.service";
import type { ChatMessage } from "@/types/message";

interface VoiceNoteRecorderProps {
  conversationId: string;
  replyToMessageId?: string | null;
  disabled?: boolean;
  onMessageSent: (message: ChatMessage) => void;
  onStatusChange?: (status: VoiceNoteStatus) => void;
}

export type VoiceNoteStatus = "idle" | "recording" | "uploading";
type StopAction = "cancel" | "send" | null;

const MAX_VOICE_NOTE_SIZE = 15 * 1024 * 1024;

const preferredAudioMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const getRecorderOptions = (): MediaRecorderOptions | undefined => {
  const mimeType = preferredAudioMimeTypes.find((candidate) =>
    MediaRecorder.isTypeSupported(candidate),
  );

  return mimeType ? { mimeType } : undefined;
};

const extensionForMimeType = (mimeType: string): string => {
  const type = mimeType.split(";")[0]?.toLowerCase();

  if (type === "audio/mp4") return "m4a";
  if (type === "audio/ogg") return "ogg";

  return "webm";
};

const getRecordingErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Allow microphone access to record a voice note.";
    }

    if (error.name === "NotFoundError") {
      return "No microphone was found on this device.";
    }

    if (error.name === "NotReadableError") {
      return "Your microphone is being used by another app.";
    }
  }

  return "Voice recording could not start. Please try again.";
};

export default function VoiceNoteRecorder({
  conversationId,
  replyToMessageId,
  disabled = false,
  onMessageSent,
  onStatusChange,
}: VoiceNoteRecorderProps) {
  const [status, setStatus] = useState<VoiceNoteStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const stopActionRef = useRef<StopAction>(null);
  const isMountedRef = useRef(true);

  const clearTimer = (): void => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopMicrophone = (): void => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const resetRecording = (): void => {
    clearTimer();
    stopMicrophone();
    recorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = null;
    stopActionRef.current = null;
    setElapsedSeconds(0);
    setStatus("idle");
  };

  const uploadRecording = async (file: File): Promise<void> => {
    try {
      setStatus("uploading");

      const message = await sendConversationAttachment(
        conversationId,
        file,
        "",
        replyToMessageId,
      );

      onMessageSent(message);
      toast.success("Voice note sent successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      if (isMountedRef.current) {
        resetRecording();
      }
    }
  };

  const handleRecordingStopped = (): void => {
    const action = stopActionRef.current;
    const recorder = recorderRef.current;
    const mimeType = recorder?.mimeType || "audio/webm";
    const recordedBlob = new Blob(chunksRef.current, {
      type: mimeType,
    });

    clearTimer();
    stopMicrophone();
    recorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = null;

    if (!isMountedRef.current) {
      stopActionRef.current = null;
      return;
    }

    if (action !== "send") {
      resetRecording();
      return;
    }

    if (recordedBlob.size === 0) {
      toast.error("No audio was captured. Please try recording again.");
      resetRecording();
      return;
    }

    if (recordedBlob.size > MAX_VOICE_NOTE_SIZE) {
      toast.error("The voice note cannot exceed 15 MB.");
      resetRecording();
      return;
    }

    const extension = extensionForMimeType(mimeType);
    const file = new File(
      [recordedBlob],
      `voice-note-${Date.now()}.${extension}`,
      {
        type: mimeType,
      },
    );

    void uploadRecording(file);
  };

  const startRecording = async (): Promise<void> => {
    if (disabled || status !== "idle") {
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      toast.error("Voice notes are not supported by this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const recorder = new MediaRecorder(stream, getRecorderOptions());

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      stopActionRef.current = null;
      startedAtRef.current = Date.now();

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", handleRecordingStopped, {
        once: true,
      });

      recorder.start();
      setElapsedSeconds(0);
      setStatus("recording");

      timerRef.current = window.setInterval(() => {
        if (!startedAtRef.current) {
          return;
        }

        setElapsedSeconds(
          Math.floor((Date.now() - startedAtRef.current) / 1000),
        );
      }, 250);
    } catch (error) {
      stopMicrophone();
      recorderRef.current = null;
      toast.error(getRecordingErrorMessage(error));
    }
  };

  const stopRecording = (action: Exclude<StopAction, null>): void => {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      return;
    }

    stopActionRef.current = action;
    clearTimer();
    recorder.stop();
  };

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      stopActionRef.current = "cancel";
      clearTimer();

      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }

      stopMicrophone();
    };
  }, []);

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  if (status === "recording") {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1.5 sm:gap-2 sm:px-3">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>

        <span className="min-w-0 flex-1 truncate text-sm font-semibold tabular-nums text-red-700">
          Recording {formatDuration(elapsedSeconds)}
        </span>

        <button
          type="button"
          onClick={() => stopRecording("cancel")}
          aria-label="Cancel voice recording"
          title="Cancel recording"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-red-600 transition hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => stopRecording("send")}
          aria-label="Send voice recording"
          title="Send voice note"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (status === "uploading") {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-cyan-700">
        <LoaderCircle className="h-5 w-5 animate-spin" aria-label="Uploading voice note" />
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void startRecording()}
      aria-label="Record a voice note"
      title="Record a voice note"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Mic className="h-5 w-5" />
    </button>
  );
}
