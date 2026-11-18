"use client";

import {
  FileText,
  ImageIcon,
  LoaderCircle,
  Paperclip,
  SendHorizontal,
  X,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "react-toastify";

import { getApiErrorMessage } from "@/lib/api/errors";
import { sendConversationAttachment } from "@/services/message.service";
import type { ChatMessage } from "@/types/message";

interface MessageAttachmentUploaderProps {
  conversationId: string;
  replyToMessageId?: string | null;
  disabled?: boolean;
  onMessageSent: (message: ChatMessage) => void;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/aac",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
]);

const ALLOWED_FILE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".aac",
  ".m4a",
  ".mp3",
  ".ogg",
  ".opus",
  ".wav",
  ".webm",
  ".pdf",
  ".txt",
  ".csv",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
]);

const ACCEPTED_FILE_TYPES = [...ALLOWED_FILE_TYPES].join(",");

const isSupportedAttachment = (file: File): boolean => {
  const mimeType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";

  if (ALLOWED_FILE_TYPES.has(mimeType)) {
    return true;
  }

  /*
   * Some browsers report desktop documents as an empty MIME type or
   * application/octet-stream. Allow those only when their extension is one
   * the server accepts too.
   */
  if (mimeType && mimeType !== "application/octet-stream") {
    return false;
  }

  const extension = file.name
    .slice(file.name.lastIndexOf("."))
    .toLowerCase();

  return ALLOWED_FILE_EXTENSIONS.has(extension);
};

const isImageAttachment = (file: File): boolean => {
  if (file.type.startsWith("image/")) {
    return true;
  }

  const extension = file.name
    .slice(file.name.lastIndexOf("."))
    .toLowerCase();

  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension);
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(kilobytes >= 100 ? 0 : 1)} KB`;
  }

  const megabytes = kilobytes / 1024;

  return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
};

export default function MessageAttachmentUploader({
  conversationId,
  replyToMessageId,
  disabled = false,
  onMessageSent,
}: MessageAttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const isImage = selectedFile ? isImageAttachment(selectedFile) : false;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const clearSelection = (): void => {
    if (isUploading) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setUploadProgress(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("The attachment cannot exceed 15 MB");
      event.target.value = "";
      return;
    }

    if (!isSupportedAttachment(file)) {
      toast.error(
        "Choose an image, audio file, PDF, document, spreadsheet, presentation, text file, or ZIP file",
      );
      event.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setCaption("");
    setUploadProgress(0);

    if (isImageAttachment(file)) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async (): Promise<void> => {
    if (!selectedFile || isUploading) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const message = await sendConversationAttachment(
        conversationId,
        selectedFile,
        caption.trim(),
        replyToMessageId,
        setUploadProgress,
      );

      onMessageSent(message);

      toast.success(
        message.type === "image"
          ? "Image sent successfully"
          : "File sent successfully",
      );

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption("");
      setUploadProgress(0);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Fragment>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      <button
        type="button"
        disabled={disabled || isUploading}
        onClick={() => fileInputRef.current?.click()}
        aria-label="Attach an image or file"
        title="Attach image or file"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Paperclip className="h-5 w-5" />
      </button>

      {selectedFile && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4">
          <button
            type="button"
            disabled={isUploading}
            onClick={clearSelection}
            aria-label="Close attachment preview"
            className="absolute inset-0 cursor-default disabled:cursor-wait"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="attachment-preview-title"
            className="relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
          >
            <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                {isImage ? (
                  <ImageIcon className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2
                  id="attachment-preview-title"
                  className="font-semibold text-slate-950"
                >
                  {isImage ? "Send image" : "Send file"}
                </h2>

                <p className="truncate text-sm text-slate-500">
                  {selectedFile.name}
                </p>
              </div>

              <button
                type="button"
                disabled={isUploading}
                onClick={clearSelection}
                aria-label="Cancel attachment"
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-5">
              {isImage && previewUrl ? (
                <div className="flex justify-center">
                  <img
                    src={previewUrl}
                    alt={selectedFile.name}
                    className="max-h-[50dvh] max-w-full rounded-2xl object-contain shadow-sm"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                    <FileText className="h-8 w-8" />
                  </span>

                  <p className="mt-4 max-w-full break-words font-medium text-slate-800">
                    {selectedFile.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              )}

              <label
                htmlFor="attachment-caption"
                className="mt-5 block text-sm font-medium text-slate-700"
              >
                Caption
                <span className="ml-1 font-normal text-slate-400">
                  (optional)
                </span>
              </label>

              <textarea
                id="attachment-caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                disabled={isUploading}
                maxLength={5000}
                rows={3}
                placeholder="Add a caption"
                className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:opacity-60"
              />

              {isUploading && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Uploading attachment</span>
                    <span>{uploadProgress}%</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-cyan-600 transition-[width] duration-200"
                      style={{
                        width: `${uploadProgress}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">
                  {selectedFile.name}
                </p>

                <p className="text-xs text-slate-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>

              <button
                type="button"
                disabled={isUploading}
                onClick={() => void handleUpload()}
                className="flex min-w-28 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isUploading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Sending
                  </>
                ) : (
                  <>
                    <SendHorizontal className="h-4 w-4" />
                    Send
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      )}
    </Fragment>
  );
}
