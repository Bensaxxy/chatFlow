"use client";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  Pause,
  Play,
  SendHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";

import UserAvatar from "@/components/chat/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useChatTheme } from "@/contexts/ChatThemeContext";
import { useStatuses } from "@/contexts/StatusContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import { createDirectConversation } from "@/services/conversation.service";
import { sendConversationMessage } from "@/services/message.service";
import { getStatusViewers } from "@/services/status.service";
import {
  STATUS_REACTION_EMOJIS,
  type ChatStatus,
  type StatusBackground,
  type StatusGroup,
  type StatusReactionEmoji,
  type StatusViewer as StatusViewerRecord,
} from "@/types/status";

interface StatusViewerProps {
  isOpen: boolean;
  initialGroup: StatusGroup | null;
  onClose: () => void;
}

const STATUS_DURATION: Record<ChatStatus["type"], number> = {
  text: 6000,
  photo: 8000,
};

const backgroundClasses: Record<StatusBackground, string> = {
  slate: "bg-gradient-to-br from-slate-700 to-slate-950",
  cyan: "bg-gradient-to-br from-cyan-400 via-cyan-600 to-blue-800",
  violet: "bg-gradient-to-br from-violet-400 via-violet-600 to-purple-900",
  emerald: "bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-900",
  rose: "bg-gradient-to-br from-rose-400 via-rose-600 to-pink-900",
  amber: "bg-gradient-to-br from-amber-300 via-orange-500 to-orange-800",
};

const formatStatusTime = (value: string): string => {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const differenceInSeconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000),
  );

  if (differenceInSeconds < 60) {
    return "Just now";
  }

  const differenceInMinutes = Math.floor(differenceInSeconds / 60);

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes}m ago`;
  }

  const differenceInHours = Math.floor(differenceInMinutes / 60);

  return `${differenceInHours}h ago`;
};

export default function StatusViewer({
  isOpen,
  initialGroup,
  onClose,
}: StatusViewerProps) {
  const { user } = useAuth();
  const { theme } = useChatTheme();

  const { statusGroups, viewStatus, reactToStatus, removeStatus } =
    useStatuses();

  const viewedStatusIdsRef = useRef(new Set<string>());

  const [isMounted, setIsMounted] = useState(false);

  const [activeAuthorId, setActiveAuthorId] = useState<string | null>(null);

  const [activeStatusIndex, setActiveStatusIndex] = useState(0);

  const [progress, setProgress] = useState(0);

  const [isManuallyPaused, setIsManuallyPaused] = useState(false);

  const [isDocumentHidden, setIsDocumentHidden] = useState(false);

  const [isReacting, setIsReacting] = useState(false);

  const [replyText, setReplyText] = useState("");

  const [isSendingReply, setIsSendingReply] = useState(false);

  const [isViewerListOpen, setIsViewerListOpen] = useState(false);

  const [viewers, setViewers] = useState<StatusViewerRecord[]>([]);

  const [isLoadingViewers, setIsLoadingViewers] = useState(false);

  const [viewerError, setViewerError] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  const uniqueViewers = useMemo(() => {
    const viewersByUserId = new Map<string, StatusViewerRecord>();

    for (const viewer of viewers) {
      const existingViewer = viewersByUserId.get(viewer.user._id);

      if (
        !existingViewer ||
        new Date(viewer.viewedAt).getTime() >
          new Date(existingViewer.viewedAt).getTime()
      ) {
        viewersByUserId.set(viewer.user._id, viewer);
      }
    }

    return [...viewersByUserId.values()].sort(
      (firstViewer, secondViewer) =>
        new Date(secondViewer.viewedAt).getTime() -
        new Date(firstViewer.viewedAt).getTime(),
    );
  }, [viewers]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const activeGroupIndex = useMemo(
    () =>
      statusGroups.findIndex((group) => group.author._id === activeAuthorId),
    [statusGroups, activeAuthorId],
  );

  const activeGroup =
    activeGroupIndex >= 0 ? statusGroups[activeGroupIndex] : null;

  const activeStatus = activeGroup?.statuses[activeStatusIndex] ?? null;

  const isOwnStatus = activeGroup?.author._id === user?._id;

  const isPaused =
    isManuallyPaused ||
    isDocumentHidden ||
    isViewerListOpen ||
    isReacting ||
    isSendingReply ||
    isDeleting;

  useEffect(() => {
    if (!isOpen || !initialGroup) {
      return;
    }

    viewedStatusIdsRef.current.clear();

    setActiveAuthorId(initialGroup.author._id);

    const firstUnviewedIndex = initialGroup.statuses.findIndex(
      (status) => !status.viewerHasViewed,
    );

    setActiveStatusIndex(firstUnviewedIndex >= 0 ? firstUnviewedIndex : 0);

    setProgress(0);
    setReplyText("");
    setIsViewerListOpen(false);
  }, [isOpen, initialGroup]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      setIsDocumentHidden(document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleNext = useCallback((): void => {
    if (!activeGroup) {
      onClose();
      return;
    }

    if (activeStatusIndex < activeGroup.statuses.length - 1) {
      setActiveStatusIndex((currentIndex) => currentIndex + 1);

      setProgress(0);
      setReplyText("");
      return;
    }

    const nextGroup = statusGroups[activeGroupIndex + 1];

    if (!nextGroup) {
      onClose();
      return;
    }

    const firstUnviewedIndex = nextGroup.statuses.findIndex(
      (status) => !status.viewerHasViewed,
    );

    setActiveAuthorId(nextGroup.author._id);

    setActiveStatusIndex(firstUnviewedIndex >= 0 ? firstUnviewedIndex : 0);

    setProgress(0);
    setReplyText("");
  }, [activeGroup, activeGroupIndex, activeStatusIndex, statusGroups, onClose]);

  const handlePrevious = useCallback((): void => {
    if (!activeGroup) {
      return;
    }

    if (activeStatusIndex > 0) {
      setActiveStatusIndex((currentIndex) => currentIndex - 1);

      setProgress(0);
      setReplyText("");
      return;
    }

    const previousGroup = statusGroups[activeGroupIndex - 1];

    if (!previousGroup) {
      return;
    }

    setActiveAuthorId(previousGroup.author._id);

    setActiveStatusIndex(Math.max(0, previousGroup.statuses.length - 1));

    setProgress(0);
    setReplyText("");
  }, [activeGroup, activeGroupIndex, activeStatusIndex, statusGroups]);

  useEffect(() => {
    if (!isOpen || !activeStatus || isPaused) {
      return;
    }

    let elapsed = (progress / 100) * STATUS_DURATION[activeStatus.type];

    let previousTime = performance.now();

    const intervalId = window.setInterval(() => {
      const currentTime = performance.now();

      elapsed += currentTime - previousTime;

      previousTime = currentTime;

      const nextProgress = Math.min(
        100,
        (elapsed / STATUS_DURATION[activeStatus.type]) * 100,
      );

      setProgress(nextProgress);

      if (nextProgress >= 100) {
        window.clearInterval(intervalId);

        handleNext();
      }
    }, 50);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isOpen, activeStatus?._id, activeStatus?.type, isPaused, handleNext]);

  useEffect(() => {
    if (
      !isOpen ||
      !activeStatus ||
      isOwnStatus ||
      activeStatus.viewerHasViewed ||
      viewedStatusIdsRef.current.has(activeStatus._id)
    ) {
      return;
    }

    viewedStatusIdsRef.current.add(activeStatus._id);

    void viewStatus(activeStatus._id).catch(() => {
      viewedStatusIdsRef.current.delete(activeStatus._id);
    });
  }, [isOpen, activeStatus, isOwnStatus, viewStatus]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        if (isViewerListOpen) {
          setIsViewerListOpen(false);
        } else {
          onClose();
        }

        return;
      }

      if (isViewerListOpen || isSendingReply) {
        return;
      }

      if (event.key === "ArrowRight") {
        handleNext();
      }

      if (event.key === "ArrowLeft") {
        handlePrevious();
      }

      if (event.key === " ") {
        event.preventDefault();

        setIsManuallyPaused((currentValue) => !currentValue);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isOpen,
    isViewerListOpen,
    isSendingReply,
    handleNext,
    handlePrevious,
    onClose,
  ]);

  useEffect(() => {
    if (!isOpen || !activeGroup || activeGroup.statuses.length > 0) {
      return;
    }

    onClose();
  }, [isOpen, activeGroup, onClose]);

  const handleReaction = async (emoji: StatusReactionEmoji): Promise<void> => {
    if (!activeStatus || isOwnStatus || isReacting) {
      return;
    }

    setIsReacting(true);

    try {
      const nextEmoji = activeStatus.viewerReaction === emoji ? null : emoji;

      await reactToStatus(activeStatus._id, nextEmoji);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsReacting(false);
    }
  };

  const handleSendReply = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!activeStatus || isOwnStatus || !replyText.trim() || isSendingReply) {
      return;
    }

    setIsSendingReply(true);

    try {
      const conversation = await createDirectConversation(
        activeStatus.author._id,
      );

      await sendConversationMessage(
        conversation._id,
        `↪ Replied to your status\n${replyText.trim()}`,
      );

      setReplyText("");

      toast.success(`Reply sent to ${activeStatus.author.name}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleOpenViewers = async (): Promise<void> => {
    if (!activeStatus || !isOwnStatus) {
      return;
    }

    setIsViewerListOpen(true);
    setIsLoadingViewers(true);
    setViewerError(null);

    try {
      const loadedViewers = await getStatusViewers(activeStatus._id);

      setViewers(loadedViewers);
    } catch (error) {
      setViewerError(getApiErrorMessage(error));
    } finally {
      setIsLoadingViewers(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!activeStatus || !isOwnStatus || isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this status? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      await removeStatus(activeStatus._id);

      toast.success("Status deleted successfully");

      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isMounted || !isOpen || !activeGroup || !activeStatus) {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${activeGroup.author.name}'s status`}
      data-chat-appearance={theme.appearance}
      data-chat-bubble-color={theme.bubbleColor}
      className="status-themed status-viewer-themed fixed inset-0 z-[110] bg-black"
    >
      <div
        className={`relative mx-auto flex h-dvh w-full max-w-2xl flex-col overflow-hidden ${
          activeStatus.type === "text"
            ? backgroundClasses[activeStatus.backgroundColor]
            : "bg-black"
        }`}
      >
        {activeStatus.type === "photo" && activeStatus.photo && (
          <img
            src={activeStatus.photo.url}
            alt={activeStatus.text || "Status"}
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/75" />

        <header className="relative z-30 shrink-0 px-3 pb-3 pt-3 sm:px-5">
          <div className="flex gap-1.5">
            {activeGroup.statuses.map((status, index) => (
              <div
                key={status._id}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-75"
                  style={{
                    width:
                      index < activeStatusIndex
                        ? "100%"
                        : index > activeStatusIndex
                          ? "0%"
                          : `${progress}%`,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <UserAvatar
              name={activeGroup.author.name}
              avatarUrl={activeGroup.author.avatarUrl}
              className="h-10 w-10"
              fallbackClassName="bg-white/20 font-semibold text-white"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {isOwnStatus ? "My status" : activeGroup.author.name}
              </p>

              <p className="text-xs text-white/70">
                {formatStatusTime(activeStatus.createdAt)}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsManuallyPaused((currentValue) => !currentValue)
              }
              aria-label={isManuallyPaused ? "Resume status" : "Pause status"}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/15"
            >
              {isManuallyPaused ? (
                <Play className="h-5 w-5" />
              ) : (
                <Pause className="h-5 w-5" />
              )}
            </button>

            {isOwnStatus && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                aria-label="Delete status"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-red-500/30 disabled:opacity-50"
              >
                {isDeleting ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close status"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <button
          type="button"
          onClick={handlePrevious}
          aria-label="Previous status"
          className="absolute bottom-28 left-0 top-24 z-[25] w-1/3 touch-manipulation cursor-default"
        />

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next status"
          className="absolute bottom-28 right-0 top-24 z-[25] w-1/3 touch-manipulation cursor-default"
        />

        <div className="relative z-20 flex min-h-0 flex-1 items-center justify-center px-6 py-8">
          {activeStatus.type === "text" && (
            <p
              className={`max-h-full overflow-y-auto whitespace-pre-wrap break-words text-center text-3xl font-bold leading-relaxed sm:text-4xl ${
                activeStatus.textColor === "light"
                  ? "text-white"
                  : "text-slate-950"
              }`}
            >
              {activeStatus.text}
            </p>
          )}
        </div>

        {activeStatus.type === "photo" && activeStatus.text && (
          <div className="relative z-30 px-6 pb-4 text-center">
            <p className="whitespace-pre-wrap break-words text-sm text-white">
              {activeStatus.text}
            </p>
          </div>
        )}

        <footer className="relative z-30 shrink-0 px-4 pb-5">
          {isOwnStatus ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => void handleOpenViewers()}
                className="flex items-center gap-2 rounded-full bg-black/35 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-black/50"
              >
                <Eye className="h-4 w-4" />
                {activeStatus.viewCount}{" "}
                {activeStatus.viewCount === 1 ? "view" : "views"}
              </button>

              {activeStatus.reactionSummary.length > 0 && (
                <div
                  aria-label={`${activeStatus.reactionCount} ${activeStatus.reactionCount === 1 ? "reaction" : "reactions"}`}
                  className="flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full bg-black/35 px-3 py-2 text-sm font-semibold text-white backdrop-blur"
                >
                  {activeStatus.reactionSummary.map(({ emoji, count }) => (
                    <span
                      key={emoji}
                      className="inline-flex items-center gap-1"
                    >
                      <span aria-hidden="true">{emoji}</span>
                      <span className="text-xs">{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 flex justify-center gap-2">
                {STATUS_REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => void handleReaction(emoji)}
                    disabled={isReacting}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition hover:-translate-y-1 ${
                      activeStatus.viewerReaction === emoji
                        ? "bg-white shadow-lg ring-2 ring-cyan-400"
                        : "bg-black/35 backdrop-blur hover:bg-white/20"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(event) => void handleSendReply(event)}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  maxLength={5000}
                  placeholder={`Reply to ${activeGroup.author.name}`}
                  className="min-w-0 flex-1 rounded-full border border-white/30 bg-black/30 px-4 py-3 text-sm text-white outline-none backdrop-blur placeholder:text-white/60 focus:border-white focus:ring-2 focus:ring-white/20"
                />

                <button
                  type="submit"
                  disabled={!replyText.trim() || isSendingReply}
                  aria-label="Send status reply"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white transition hover:bg-cyan-700 disabled:opacity-50"
                >
                  {isSendingReply ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <SendHorizontal className="h-5 w-5" />
                  )}
                </button>
              </form>
            </>
          )}
        </footer>

        {isViewerListOpen && (
          <div className="absolute inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-6">
            <div className="status-viewer-panel max-h-[75dvh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl">
              <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="font-bold text-slate-950">Viewed by</h2>

                  <p className="text-xs text-slate-500">
                    {activeStatus.viewCount}{" "}
                    {activeStatus.viewCount === 1 ? "viewer" : "viewers"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsViewerListOpen(false)}
                  aria-label="Close viewer list"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="max-h-[60dvh] overflow-y-auto">
                {isLoadingViewers ? (
                  <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-slate-500">
                    <LoaderCircle className="h-5 w-5 animate-spin text-cyan-600" />
                    Loading viewers...
                  </div>
                ) : viewerError ? (
                  <div className="px-6 py-12 text-center text-sm text-red-600">
                    {viewerError}
                  </div>
                ) : uniqueViewers.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <Eye className="mx-auto h-10 w-10 text-slate-300" />

                    <p className="mt-3 font-medium text-slate-700">
                      No views yet
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {uniqueViewers.map((viewer) => (
                      <div
                        key={`${viewer.user._id}-${viewer.viewedAt}`}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <UserAvatar
                          name={viewer.user.name}
                          avatarUrl={viewer.user.avatarUrl}
                          className="h-11 w-11"
                          fallbackClassName="bg-cyan-100 font-semibold text-cyan-800"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {viewer.user.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {formatStatusTime(viewer.viewedAt)}
                          </p>
                        </div>

                        {viewer.reaction ? (
                          <span
                            title="Reacted to this status"
                            aria-label={`Reacted ${viewer.reaction}`}
                            className="flex h-8 min-w-8 items-center justify-center rounded-full bg-cyan-50 px-1 text-base"
                          >
                            {viewer.reaction}
                          </span>
                        ) : (
                          <Eye className="h-4 w-4 text-cyan-600" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handlePrevious}
          aria-label="Previous"
          className="absolute left-3 top-1/2 z-40 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50 sm:flex"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next"
          className="absolute right-3 top-1/2 z-40 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50 sm:flex"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
