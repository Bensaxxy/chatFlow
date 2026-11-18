"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";

import type { ChatMessage } from "@/types/message";

interface MessageSearchDrawerProps {
  isOpen: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  results: ChatMessage[];
  isSearching: boolean;
  hasSearchRun: boolean;
  errorMessage: string | null;
  currentUserId: string;
  onClose: () => void;
  onQueryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelectResult: (message: ChatMessage) => void;
}

const formatMessageDate = (value: string): string => {
  const messageDate = new Date(value);

  if (Number.isNaN(messageDate.getTime())) {
    return "";
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (messageDate.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (messageDate.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return messageDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year:
      messageDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
};

export default function MessageSearchDrawer({
  isOpen,
  inputRef,
  query,
  results,
  isSearching,
  hasSearchRun,
  errorMessage,
  currentUserId,
  onClose,
  onQueryChange,
  onSelectResult,
}: MessageSearchDrawerProps) {
  return (
    <>
      <button
        type="button"
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        aria-label="Close message search"
        className={[
          "absolute inset-0 z-30 bg-slate-950/25 backdrop-blur-[1px] transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <aside
        aria-label="Message search"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={[
          "absolute inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="font-semibold text-slate-950">Search messages</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Results update as you type
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close message search"
            title="Close"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-200 p-5">
          <label className="sr-only" htmlFor="message-search">
            Search this conversation
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              ref={inputRef}
              id="message-search"
              type="search"
              value={query}
              onChange={onQueryChange}
              placeholder="Type to search this chat"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            />

            {isSearching && (
              <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-600" />
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {errorMessage && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {errorMessage}
            </p>
          )}

          {!query.trim() && !errorMessage && (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <Search className="h-9 w-9 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                Find a message
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Start typing to search this conversation.
              </p>
            </div>
          )}

          {!isSearching &&
            !errorMessage &&
            hasSearchRun &&
            query.trim() &&
            results.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No messages found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Try another word or phrase.
                </p>
              </div>
            )}

          {results.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 pb-1 text-xs font-medium text-slate-500">
                {results.length} result{results.length === 1 ? "" : "s"}
              </p>

              {results.map((message) => {
                const isOwnMessage = message.sender._id === currentUserId;
                const senderName = isOwnMessage
                  ? "You"
                  : (message.sender.name ?? "Unknown user");

                return (
                  <button
                    key={message._id}
                    type="button"
                    disabled={isSearching}
                    onClick={() => onSelectResult(message)}
                    className="flex w-full flex-col gap-1 rounded-xl px-3 py-3 text-left transition hover:bg-slate-100 disabled:cursor-wait"
                  >
                    <span className="text-xs font-semibold text-slate-700">
                      {senderName}
                      <span className="ml-2 font-normal text-slate-400">
                        {formatMessageDate(message.createdAt)}
                      </span>
                    </span>

                    <span className="line-clamp-2 text-sm leading-5 text-slate-600">
                      {message.content}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
