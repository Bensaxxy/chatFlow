"use client";

import { ArrowLeft, Images, Search } from "lucide-react";
import Link from "next/link";

import UserAvatar from "@/components/chat/UserAvatar";

interface ConversationHeaderProps {
  displayName: string;
  avatarUrl: string | null;
  canViewProfile: boolean;
  isOtherUserOnline: boolean;
  statusText: string;
  isMessageSearchOpen: boolean;
  onViewProfile: () => void;
  onOpenSearch: () => void;
  onOpenMediaGallery: () => void;
}

export default function ConversationHeader({
  displayName,
  avatarUrl,
  canViewProfile,
  isOtherUserOnline,
  statusText,
  isMessageSearchOpen,
  onViewProfile,
  onOpenSearch,
  onOpenMediaGallery,
}: ConversationHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-[var(--chat-border)] bg-[var(--chat-surface)] px-2 text-[var(--chat-text)] sm:h-20 sm:gap-3 sm:px-6">
      <Link
        href="/chats"
        aria-label="Back to conversations"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
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
          className="h-10 w-10 sm:h-11 sm:w-11"
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
        <h1 className="truncate font-semibold text-[var(--chat-text)]">{displayName}</h1>

        <p
          className={[
            "truncate text-xs",
            isOtherUserOnline
              ? "font-medium text-emerald-600"
              : "text-[var(--chat-muted)]",
          ].join(" ")}
        >
          {isOtherUserOnline ? "Online" : statusText}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenMediaGallery}
        aria-label="Open shared media"
        title="Shared media"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)] sm:h-11 sm:w-11"
      >
        <Images className="h-5 w-5" />
      </button>

      {/* Call history is intentionally hidden until audio calling is released. */}

      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Search messages"
        aria-expanded={isMessageSearchOpen}
        title="Search messages"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)] sm:h-11 sm:w-11"
      >
        <Search className="h-5 w-5" />
      </button>
    </header>
  );
}
