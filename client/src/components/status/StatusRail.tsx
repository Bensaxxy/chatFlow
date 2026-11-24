"use client";

import { Plus, UsersRound } from "lucide-react";

import UserAvatar from "@/components/chat/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useStatuses } from "@/contexts/StatusContext";

type SidebarView = "chats" | "statuses" | "friends";

interface StatusRailProps {
  activeView: SidebarView;
  onCreateStatus: () => void;
  onShowChats: () => void;
  onShowFriends: () => void;
  onShowStatuses: () => void;
}

export default function StatusRail({
  activeView,
  onCreateStatus,
  onShowChats,
  onShowFriends,
  onShowStatuses,
}: StatusRailProps) {
  const { user } = useAuth();
  const { statusGroups } = useStatuses();

  const currentUserStatusGroup =
    statusGroups.find((group) => group.isCurrentUser) ?? null;
  const unviewedGroupCount = statusGroups.filter(
    (group) => !group.isCurrentUser && group.hasUnviewedStatuses,
  ).length;

  return (
    <aside
      aria-label="Chat navigation"
      className="hidden h-dvh w-16 shrink-0 flex-col items-center border-r border-[var(--chat-border)] bg-[var(--chat-sidebar)] px-1.5 py-3 md:flex"
    >
      <button
        type="button"
        onClick={onShowChats}
        aria-label="Show chats"
        aria-current={activeView === "chats" ? "page" : undefined}
        title="Chats"
        className={`flex h-10 w-10 items-center justify-center rounded-2xl transition focus:outline-none focus:ring-2 focus:ring-[var(--chat-accent)] focus:ring-offset-2 focus:ring-offset-[var(--chat-sidebar)] ${
          activeView === "chats"
            ? "bg-[var(--chat-accent-soft)] shadow-sm"
            : "hover:bg-[var(--chat-hover)]"
        }`}
      >
        <img src="/icon.svg" alt="ChatFlow" className="h-8 w-8 rounded-xl" />
      </button>

      <div className="mt-5 flex w-full flex-col items-center">
        <button
          type="button"
          onClick={onShowStatuses}
          aria-label={`Show status updates${unviewedGroupCount ? `, ${unviewedGroupCount} unread` : ""}`}
          aria-current={activeView === "statuses" ? "page" : undefined}
          title="Status updates"
          className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl border transition focus:outline-none focus:ring-2 focus:ring-[var(--chat-accent)] focus:ring-offset-2 focus:ring-offset-[var(--chat-sidebar)] ${
            activeView === "statuses"
              ? "border-[var(--chat-accent)]/25 bg-[var(--chat-accent-soft)] shadow-sm"
              : "border-transparent hover:border-[var(--chat-border)] hover:bg-[var(--chat-hover)]"
          }`}
        >
          <span
            className={`rounded-full p-[2px] transition group-hover:scale-105 ${
              currentUserStatusGroup
                ? "bg-[var(--chat-accent)]"
                : "bg-[var(--chat-border)]"
            }`}
          >
            <span className="block rounded-full bg-[var(--chat-sidebar)] p-[2px]">
              <UserAvatar
                name={user?.name}
                avatarUrl={user?.avatarUrl}
                className="h-7 w-7"
                fallbackClassName="bg-[var(--chat-accent-soft)] text-[9px] font-semibold text-[var(--chat-accent)]"
              />
            </span>
          </span>

          {unviewedGroupCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[var(--chat-sidebar)] bg-[var(--chat-accent)] px-1 text-[9px] font-bold text-white">
              {unviewedGroupCount > 9 ? "9+" : unviewedGroupCount}
            </span>
          )}
        </button>

        <span className="mt-1.5 text-[9px] font-semibold text-[var(--chat-muted)]">
          Status
        </span>
      </div>

      <div className="mt-4 flex w-full flex-col items-center">
        <button
          type="button"
          onClick={onShowFriends}
          aria-label="Find friends"
          aria-current={activeView === "friends" ? "page" : undefined}
          title="Find friends"
          className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition focus:outline-none focus:ring-2 focus:ring-[var(--chat-accent)] focus:ring-offset-2 focus:ring-offset-[var(--chat-sidebar)] ${
            activeView === "friends"
              ? "border-[var(--chat-accent)]/25 bg-[var(--chat-accent-soft)] text-[var(--chat-accent)] shadow-sm"
              : "border-transparent text-[var(--chat-muted)] hover:border-[var(--chat-border)] hover:bg-[var(--chat-hover)] hover:text-[var(--chat-accent)]"
          }`}
        >
          <UsersRound className="h-4.5 w-4.5" />
        </button>
        <span className="mt-1.5 text-[9px] font-semibold text-[var(--chat-muted)]">
          People
        </span>
      </div>

      <button
        type="button"
        onClick={onCreateStatus}
        aria-label="Create a status"
        title="New status"
        className="mt-4 flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--chat-border)] bg-[var(--chat-control)] text-[var(--chat-accent)] shadow-sm transition hover:scale-105 hover:border-[var(--chat-accent)]/30 hover:bg-[var(--chat-accent-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--chat-accent)] focus:ring-offset-2 focus:ring-offset-[var(--chat-sidebar)]"
      >
        <Plus className="h-4 w-4" />
      </button>
      <span className="mt-1 text-[9px] font-semibold text-[var(--chat-muted)]">
        New
      </span>
    </aside>
  );
}
