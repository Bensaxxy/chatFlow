"use client";

import { Download, FileText, ImageIcon, Play, X } from "lucide-react";

import type { MessageAttachment } from "@/types/message";

interface AttachmentPreviewDialogProps {
  attachment: MessageAttachment;
  messageType: "image" | "file" | "video";
  onClose: () => void;
}

const mimeTypeByExtension: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const resolveAttachmentMimeType = (attachment: MessageAttachment): string => {
  if (
    attachment.mimeType &&
    attachment.mimeType !== "application/octet-stream"
  ) {
    return attachment.mimeType;
  }

  const extension = attachment.fileName
    .slice(attachment.fileName.lastIndexOf("."))
    .toLowerCase();

  return mimeTypeByExtension[extension] ?? attachment.mimeType;
};

const isPdf = (mimeType: string): boolean => mimeType === "application/pdf";

const isTextDocument = (mimeType: string): boolean =>
  mimeType === "text/plain" || mimeType === "text/csv";

const isOfficeDocument = (mimeType: string): boolean =>
  mimeType.includes("word") ||
  mimeType.includes("spreadsheet") ||
  mimeType.includes("excel") ||
  mimeType.includes("powerpoint") ||
  mimeType.includes("presentation");

export default function AttachmentPreviewDialog({
  attachment,
  messageType,
  onClose,
}: AttachmentPreviewDialogProps) {
  const mimeType = resolveAttachmentMimeType(attachment);
  const documentViewerUrl =
    "https://view.officeapps.live.com/op/embed.aspx?src=" +
    encodeURIComponent(attachment.url);
  const canPreviewDirectly =
    messageType === "image" ||
    messageType === "video" ||
    isPdf(mimeType) ||
    isTextDocument(mimeType) ||
    isOfficeDocument(mimeType);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close attachment preview"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="attachment-preview-title"
        className="relative z-10 flex h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
            {messageType === "image" ? (
              <ImageIcon className="h-5 w-5" />
            ) : messageType === "video" ? (
              <Play className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <h2
              id="attachment-preview-title"
              className="truncate font-semibold text-slate-950"
            >
              {attachment.fileName}
            </h2>
            <p className="truncate text-xs text-slate-500">
              {mimeType || "Document"}
            </p>
          </div>

          <a
            href={attachment.url}
            download={attachment.fileName}
            aria-label="Download attachment"
            title="Download"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Download className="h-5 w-5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close attachment preview"
            title="Close"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 bg-slate-100">
          {messageType === "image" ? (
            <div className="flex h-full items-center justify-center p-4 sm:p-8">
              <img
                src={attachment.url}
                alt={attachment.fileName}
                className="max-h-full max-w-full rounded-xl object-contain shadow-sm"
              />
            </div>
          ) : messageType === "video" ? (
            <div className="flex h-full items-center justify-center bg-slate-950 p-3 sm:p-6">
              <video
                controls
                autoPlay
                playsInline
                src={attachment.url}
                className="max-h-full max-w-full rounded-xl shadow-xl"
              >
                Your browser does not support video playback.
              </video>
            </div>
          ) : isPdf(mimeType) || isTextDocument(mimeType) ? (
            <iframe
              title={"Preview of " + attachment.fileName}
              src={attachment.url}
              className="h-full w-full border-0 bg-white"
            />
          ) : isOfficeDocument(mimeType) ? (
            <iframe
              title={"Preview of " + attachment.fileName}
              src={documentViewerUrl}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <FileText className="h-12 w-12 text-slate-300" />
              <p className="mt-4 font-medium text-slate-800">
                This file cannot be previewed in the browser.
              </p>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                You can still download it without leaving this chat.
              </p>
              <a
                href={attachment.url}
                download={attachment.fileName}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
              >
                <Download className="h-4 w-4" />
                Download file
              </a>
            </div>
          )}
        </div>

        {!canPreviewDirectly && (
          <p className="border-t border-slate-200 bg-white px-5 py-2 text-center text-xs text-slate-500">
            Archive files cannot be displayed safely in chat.
          </p>
        )}
      </section>
    </div>
  );
}
