"use client";

import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";

import UserAvatar from "@/components/chat/UserAvatar";

interface ConversationHeaderProps {
  displayName: string;
  avatarUrl: string | null;
  canViewProfile: boolean;
  isOtherUserOnline: boolean;
  isOtherUserTyping: boolean;
  statusText: string;
  isMessageSearchOpen: boolean;
  onViewProfile: () => void;
  onOpenSearch: () => void;
}

export default function ConversationHeader({
  displayName,
  avatarUrl,
  canViewProfile,
  isOtherUserOnline,
  isOtherUserTyping,
  statusText,
  isMessageSearchOpen,
  onViewProfile,
  onOpenSearch,
}: ConversationHeaderProps) {
  return (
    <header className="flex h-20 shrink-0 items-center gap-3 border-b border-slate-200 px-4 sm:px-6">
      <Link
        href="/chats"
        aria-label="Back to conversations"
        className="rounded-full p-2 text-slate-600 hover:bg-slate-100 md:hidden"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <button
        type="button"
        disabled={!canViewProfile}
        onClick={onViewProfile}
        aria-label={"View " + displayName + "'s profile"}
        title={"View " + displayName + "'s profile"}
        className="relative shrink-0 rounded-full disabled:cursor-default"
      >
        <UserAvatar
          name={displayName}
          avatarUrl={avatarUrl}
          className="h-11 w-11"
          fallbackClassName="bg-cyan-100 font-semibold text-cyan-800"
        />

        {isOtherUserOnline && (
          <span
            title="Online"
            aria-label="Online"
            className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm"
          />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold text-slate-950">{displayName}</h1>

        {isOtherUserTyping ? (
          <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-cyan-600">
            <span>Typing</span>

            <span className="flex items-center gap-0.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-600 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-600 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-600" />
            </span>
          </div>
        ) : (
          <p
            className={[
              "truncate text-xs",
              isOtherUserOnline
                ? "font-medium text-emerald-600"
                : "text-slate-500",
            ].join(" ")}
          >
            {isOtherUserOnline ? "Online" : statusText}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Search messages"
        aria-expanded={isMessageSearchOpen}
        title="Search messages"
        className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
      >
        <Search className="h-5 w-5" />
      </button>
    </header>
  );
}
