"use client";

import {
  ArrowUpRight,
  Download,
  ExternalLink,
  FileArchive,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Link2,
  LoaderCircle,
  Play,
  Video,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import AttachmentPreviewDialog from "@/components/chat/AttachmentPreviewDialog";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getConversationMedia } from "@/services/message.service";
import type {
  ChatMessage,
  MediaGalleryCategory,
} from "@/types/message";

interface MediaGalleryDrawerProps {
  isOpen: boolean;
  conversationId: string;
  currentUserId: string;
  refreshKey: string;
  onClose: () => void;
}

type PreviewableAttachment = {
  attachment: NonNullable<ChatMessage["attachment"]>;
  messageType: "image" | "file" | "video";
};

const gallerySections: Array<{
  id: MediaGalleryCategory;
  label: string;
  icon: typeof ImageIcon;
  emptyTitle: string;
  emptyDescription: string;
}> = [
  {
    id: "images",
    label: "Images",
    icon: ImageIcon,
    emptyTitle: "No shared images yet",
    emptyDescription: "Photos shared in this conversation will appear here.",
  },
  {
    id: "videos",
    label: "Videos",
    icon: Video,
    emptyTitle: "No shared videos yet",
    emptyDescription: "Videos shared in this conversation will appear here.",
  },
  {
    id: "files",
    label: "Files",
    icon: FileText,
    emptyTitle: "No shared files yet",
    emptyDescription: "Documents and other files will appear here.",
  },
  {
    id: "voice-notes",
    label: "Voice",
    icon: Volume2,
    emptyTitle: "No voice notes yet",
    emptyDescription: "Voice notes shared in this conversation will appear here.",
  },
  {
    id: "links",
    label: "Links",
    icon: Link2,
    emptyTitle: "No shared links yet",
    emptyDescription: "Link previews shared in this conversation will appear here.",
  },
];

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Unknown size";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(kilobytes >= 100 ? 0 : 1)} KB`;
  }

  const megabytes = kilobytes / 1024;

  return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
};

const formatGalleryDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
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

export default function MediaGalleryDrawer({
  isOpen,
  conversationId,
  currentUserId,
  refreshKey,
  onClose,
}: MediaGalleryDrawerProps) {
  const [activeSection, setActiveSection] =
    useState<MediaGalleryCategory>("images");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewableAttachment | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const activeSectionDetails = gallerySections.find(
    (section) => section.id === activeSection,
  )!;
  const EmptySectionIcon = activeSectionDetails.icon;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const controller = new AbortController();

    const loadMedia = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setPreview(null);

        const result = await getConversationMedia(
          conversationId,
          activeSection,
          null,
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setMessages(result.messages);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (error) {
        if (!controller.signal.aborted) {
          setMessages([]);
          setNextCursor(null);
          setHasMore(false);
          setErrorMessage(getApiErrorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadMedia();

    return () => {
      controller.abort();
    };
  }, [activeSection, conversationId, isOpen, refreshKey, reloadKey]);

  const loadMore = async (): Promise<void> => {
    if (!nextCursor || isLoadingMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      setErrorMessage(null);

      const result = await getConversationMedia(
        conversationId,
        activeSection,
        nextCursor,
      );

      setMessages((current) => {
        const knownMessageIds = new Set(current.map((message) => message._id));

        return [
          ...current,
          ...result.messages.filter(
            (message) => !knownMessageIds.has(message._id),
          ),
        ];
      });
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const senderLabel = (message: ChatMessage): string =>
    message.sender._id === currentUserId ? "You" : message.sender.name;

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        aria-label="Close shared media"
        className={[
          "absolute inset-0 z-40 bg-slate-950/25 backdrop-blur-[1px] transition-opacity duration-300",
          isOpen
            ? "visible opacity-100"
            : "invisible pointer-events-none opacity-0",
        ].join(" ")}
      />

      <aside
        aria-label="Shared media gallery"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={[
          "chat-themed-drawer absolute inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-[var(--chat-border)] bg-[var(--chat-canvas)] text-[var(--chat-text)] shadow-2xl transition-transform duration-300 ease-out",
          isOpen
            ? "visible translate-x-0"
            : "invisible pointer-events-none translate-x-full",
        ].join(" ")}
      >
        <header className="border-b border-slate-200 bg-white px-4 pb-3 pt-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                <ImageIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-slate-950">
                  Shared media
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Photos, files, voice notes and links
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close shared media"
              title="Close"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav
            aria-label="Shared media categories"
            className="mt-4 flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {gallerySections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  aria-pressed={isActive}
                  className={[
                    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition",
                    isActive
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </header>

        <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <LoaderCircle className="h-7 w-7 animate-spin text-cyan-600" />
              <p className="text-sm font-medium text-slate-600">
                Loading shared {activeSectionDetails.label.toLowerCase()}...
              </p>
            </div>
          ) : errorMessage && messages.length === 0 ? (
            <div className="mx-auto mt-12 max-w-sm rounded-2xl border border-red-100 bg-white p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-red-700">
                Could not load shared media
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => setReloadKey((current) => current + 1)}
                className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Try again
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-cyan-600 shadow-sm ring-1 ring-slate-200">
                <EmptySectionIcon className="h-7 w-7" />
              </span>
              <h3 className="mt-5 text-sm font-semibold text-slate-800">
                {activeSectionDetails.emptyTitle}
              </h3>
              <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
                {activeSectionDetails.emptyDescription}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 px-1 text-xs font-medium text-slate-500">
                Latest shared {activeSectionDetails.label.toLowerCase()}
              </p>

              {activeSection === "images" && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {messages.map((message) => {
                    const attachment = message.attachment;

                    if (!attachment) {
                      return null;
                    }

                    return (
                      <button
                        key={message._id}
                        type="button"
                        onClick={() =>
                          setPreview({
                            attachment,
                            messageType: "image",
                          })
                        }
                        className="group relative aspect-square overflow-hidden rounded-xl bg-slate-200 text-left shadow-sm ring-1 ring-slate-200 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                      >
                        <img
                          src={attachment.url}
                          alt={attachment.fileName}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent px-2 pb-2 pt-6 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                          {formatGalleryDate(message.createdAt)} · {senderLabel(message)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeSection === "videos" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {messages.map((message) => {
                    const attachment = message.attachment;

                    if (!attachment) {
                      return null;
                    }

                    return (
                      <button
                        key={message._id}
                        type="button"
                        onClick={() =>
                          setPreview({
                            attachment,
                            messageType: "video",
                          })
                        }
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                      >
                        <div className="relative aspect-video overflow-hidden bg-slate-950">
                          <video
                            muted
                            playsInline
                            preload="metadata"
                            src={attachment.url}
                            className="h-full w-full object-cover opacity-85 transition group-hover:scale-[1.02] group-hover:opacity-100"
                          />
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition group-hover:scale-105">
                              <Play className="ml-0.5 h-5 w-5 fill-current" />
                            </span>
                          </span>
                        </div>
                        <span className="block min-w-0 p-3">
                          <span className="block truncate text-sm font-semibold text-slate-800">
                            {attachment.fileName}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {formatGalleryDate(message.createdAt)} · {senderLabel(message)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeSection === "files" && (
                <div className="space-y-2">
                  {messages.map((message) => {
                    const attachment = message.attachment;

                    if (!attachment) {
                      return null;
                    }

                    return (
                      <button
                        key={message._id}
                        type="button"
                        onClick={() =>
                          setPreview({
                            attachment,
                            messageType: "file",
                          })
                        }
                        className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                          <AttachmentFileIcon mimeType={attachment.mimeType} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800">
                            {attachment.fileName}
                          </span>
                          <span className="mt-1 block truncate text-xs text-slate-500">
                            {formatFileSize(attachment.size)} · {formatGalleryDate(message.createdAt)} · {senderLabel(message)}
                          </span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              )}

              {activeSection === "voice-notes" && (
                <div className="space-y-2">
                  {messages.map((message) => {
                    const attachment = message.attachment;

                    if (!attachment) {
                      return null;
                    }

                    return (
                      <article
                        key={message._id}
                        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                            <Volume2 className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800">
                              Voice note
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {formatGalleryDate(message.createdAt)} · {senderLabel(message)}
                            </p>
                          </div>
                          <a
                            href={attachment.url}
                            download={attachment.fileName}
                            aria-label={`Download ${attachment.fileName}`}
                            title="Download voice note"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                        <audio
                          controls
                          preload="metadata"
                          src={attachment.url}
                          className="mt-3 h-10 w-full"
                        >
                          Your browser does not support audio playback.
                        </audio>
                      </article>
                    );
                  })}
                </div>
              )}

              {activeSection === "links" && (
                <div className="space-y-3">
                  {messages.map((message) => {
                    const preview = message.linkPreview;

                    if (!preview) {
                      return null;
                    }

                    return (
                      <a
                        key={message._id}
                        href={preview.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                      >
                        {preview.imageUrl && (
                          <img
                            src={preview.imageUrl}
                            alt=""
                            loading="lazy"
                            className="h-36 w-full bg-slate-100 object-cover sm:h-40"
                          />
                        )}
                        <span className="block p-4">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700">
                            <Link2 className="h-3.5 w-3.5" />
                            <span className="truncate">{preview.domain}</span>
                            <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0" />
                          </span>
                          <span className="mt-2 block break-words text-sm font-semibold leading-5 text-slate-900">
                            {preview.title ?? preview.domain}
                          </span>
                          {preview.description && (
                            <span className="mt-1 block line-clamp-2 text-sm leading-5 text-slate-600">
                              {preview.description}
                            </span>
                          )}
                          <span className="mt-3 block text-xs text-slate-400">
                            {formatGalleryDate(message.createdAt)} · {senderLabel(message)}
                          </span>
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}

              {hasMore && (
                <div className="flex justify-center py-5">
                  <button
                    type="button"
                    disabled={isLoadingMore}
                    onClick={() => void loadMore()}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isLoadingMore && (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    )}
                    {isLoadingMore ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {preview && (
        <AttachmentPreviewDialog
          attachment={preview.attachment}
          messageType={preview.messageType}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
