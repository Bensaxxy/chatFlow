"use client";

import { Mic, SendHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

interface VoiceNoteRecorderProps {
  replyToMessageId?: string | null;
  disabled?: boolean;
  onVoiceNoteQueued: (
    file: File,
    replyToMessageId: string | null,
    waveform: number[],
  ) => void;
  onStatusChange?: (status: VoiceNoteStatus) => void;
}

export type VoiceNoteStatus = "idle" | "recording";
type StopAction = "cancel" | "send" | null;

const MAX_VOICE_NOTE_SIZE = 15 * 1024 * 1024;
// The server accepts up to 96 samples per voice note. We always store the full
// 96 so the player can resample to whatever width it renders at.
const WAVEFORM_SAMPLE_COUNT = 96;

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const createAudioWaveform = async (file: File): Promise<number[]> => {
  const AudioContextConstructor =
    window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext;

  if (!AudioContextConstructor) {
    return [];
  }

  const context = new AudioContextConstructor();

  try {
    const audioBuffer = await context.decodeAudioData(await file.arrayBuffer());
    const totalFrames = audioBuffer.length;

    if (totalFrames === 0) {
      return [];
    }

    const channels = Array.from(
      { length: audioBuffer.numberOfChannels },
      (_, channel) => audioBuffer.getChannelData(channel),
    );
    const bucketCount = Math.min(WAVEFORM_SAMPLE_COUNT, totalFrames);

    // RMS (loudness) per time slice, which is what the ear perceives. Raw
    // peaks make the waveform spiky and let one click flatten everything.
    const levels = Array.from({ length: bucketCount }, (_, index) => {
      const start = Math.floor((index * totalFrames) / bucketCount);
      const end = Math.max(
        start + 1,
        Math.floor(((index + 1) * totalFrames) / bucketCount),
      );
      let sumOfSquares = 0;
      let counted = 0;

      for (const samples of channels) {
        const limit = Math.min(end, samples.length);

        for (let frame = start; frame < limit; frame += 1) {
          sumOfSquares += samples[frame] * samples[frame];
          counted += 1;
        }
      }

      return counted > 0 ? Math.sqrt(sumOfSquares / counted) : 0;
    });

    // Scale against the 95th percentile instead of the single loudest slice,
    // so quiet and loud recordings both use the full height. The small floor
    // stops a silent recording from having its noise blown up.
    const sorted = [...levels].sort((a, b) => a - b);
    const reference = Math.max(
      sorted[Math.floor((sorted.length - 1) * 0.95)],
      0.01,
    );

    return levels.map(
      (level) =>
        Math.round(Math.min(1, Math.pow(level / reference, 0.7)) * 100) / 100,
    );
  } finally {
    await context.close().catch(() => undefined);
  }
};

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

  return {
    audioBitsPerSecond: 64_000,
    ...(mimeType ? { mimeType } : {}),
  };
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
  replyToMessageId,
  disabled = false,
  onVoiceNoteQueued,
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

  const queueRecording = (file: File): void => {
    void createAudioWaveform(file)
      .catch(() => [])
      .then((waveform) => {
        onVoiceNoteQueued(file, replyToMessageId ?? null, waveform);

        if (isMountedRef.current) {
          resetRecording();
        }
      });
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

    queueRecording(file);
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
        audio: {
          channelCount: { ideal: 1 },
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
        },
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
