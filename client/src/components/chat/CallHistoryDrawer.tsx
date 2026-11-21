"use client";

import {
  Clock3,
  LoaderCircle,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  PhoneOutgoing,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import UserAvatar from "@/components/chat/UserAvatar";
import { getConversationCallHistory } from "@/services/call.service";
import type { CallHistoryEntry } from "@/types/call";

interface CallHistoryDrawerProps {
  isOpen: boolean;
  conversationId: string;
  currentUserId: string;
  fallbackName: string;
  fallbackAvatarUrl: string | null;
  onClose: () => void;
}

const formatDuration = (durationInSeconds: number): string => {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;

  if (minutes === 0) {
    return `${seconds} sec`;
  }

  return `${minutes} min${seconds > 0 ? ` ${seconds} sec` : ""}`;
};

const formatCallDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const prefix = isToday
    ? "Today"
    : date.toDateString() === yesterday.toDateString()
      ? "Yesterday"
      : new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
          year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
        }).format(date);

  return `${prefix}, ${new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)}`;
};

const getCallDescription = (call: CallHistoryEntry): string => {
  if (call.status === "completed") {
    return `Audio call · ${formatDuration(call.durationSeconds)}`;
  }

  if (call.status === "missed") return "Missed audio call";
  if (call.status === "declined") return "Audio call declined";
  if (call.status === "cancelled") return "Cancelled audio call";
  if (call.status === "failed") return "Audio call could not connect";

  return "Audio call in progress";
};

const getCallTone = (call: CallHistoryEntry): string => {
  if (call.status === "missed" || call.status === "failed") {
    return "text-red-600";
  }

  if (call.status === "declined" || call.status === "cancelled") {
    return "text-amber-700";
  }

  return "text-slate-600";
};

export default function CallHistoryDrawer({
  isOpen,
  conversationId,
  currentUserId,
  fallbackName,
  fallbackAvatarUrl,
  onClose,
}: CallHistoryDrawerProps) {
  const [calls, setCalls] = useState<CallHistoryEntry[]>([]);
  const [loadedConversationId, setLoadedConversationId] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLoading =
    !errorMessage && loadedConversationId !== conversationId;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCurrent = true;

    void getConversationCallHistory(conversationId)
      .then((history) => {
        if (isCurrent) {
          setCalls(history);
          setLoadedConversationId(conversationId);
          setErrorMessage(null);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setErrorMessage("Call history could not be loaded. Please try again.");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [conversationId, isOpen]);

  const displayCalls = useMemo(
    () =>
      calls.map((call) => {
        const isOutgoing = call.caller._id === currentUserId;
        const participant = isOutgoing ? call.recipient : call.caller;

        return {
          call,
          isOutgoing,
          name: participant?.name || fallbackName,
          avatarUrl: participant?.avatarUrl ?? fallbackAvatarUrl,
        };
      }),
    [calls, currentUserId, fallbackAvatarUrl, fallbackName],
  );

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[70] bg-slate-950/20 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        aria-label="Call history"
        className={`chat-themed-drawer fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col border-l border-[var(--chat-border)] bg-[var(--chat-surface)] text-[var(--chat-text)] shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
            <Clock3 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-950">Call history</h2>
            <p className="text-xs text-slate-500">Audio calls in this chat</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close call history"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin text-cyan-600" />
              Loading calls…
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : displayCalls.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <PhoneCall className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">No calls yet</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Your completed, missed, and declined audio calls will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {displayCalls.map(({ call, isOutgoing, name, avatarUrl }) => {
                const Icon =
                  call.status === "missed" || call.status === "failed"
                    ? PhoneOff
                    : isOutgoing
                      ? PhoneOutgoing
                      : PhoneIncoming;

                return (
                  <li
                    key={call._id}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-50"
                  >
                    <UserAvatar
                      name={name}
                      avatarUrl={avatarUrl}
                      className="h-11 w-11 shrink-0"
                      fallbackClassName="bg-cyan-100 font-semibold text-cyan-800"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {name}
                        </p>
                        <Icon
                          className={`h-3.5 w-3.5 shrink-0 ${getCallTone(call)}`}
                          aria-label={isOutgoing ? "Outgoing call" : "Incoming call"}
                        />
                      </div>
                      <p className={`mt-0.5 text-xs ${getCallTone(call)}`}>
                        {getCallDescription(call)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatCallDate(call.startedAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
