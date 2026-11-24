"use client";

import { LoaderCircle, Plus, RefreshCw, Sparkles } from "lucide-react";

import UserAvatar from "@/components/chat/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useStatuses } from "@/contexts/StatusContext";
import type { StatusGroup } from "@/types/status";

interface StatusSidebarProps {
  onCreateStatus: () => void;
  onOpenStatusGroup: (group: StatusGroup) => void;
}

export default function StatusSidebar({
  onCreateStatus,
  onOpenStatusGroup,
}: StatusSidebarProps) {
  const { user } = useAuth();
  const {
    statusGroups,
    isLoadingStatuses,
    statusErrorMessage,
    refreshStatuses,
  } = useStatuses();

  const currentUserStatusGroup =
    statusGroups.find((group) => group.isCurrentUser) ?? null;
  const otherStatusGroups = statusGroups.filter(
    (group) => !group.isCurrentUser,
  );
  const unviewedGroupCount = otherStatusGroups.filter(
    (group) => group.hasUnviewedStatuses,
  ).length;
  const ownStatusCount = currentUserStatusGroup?.statuses.length ?? 0;

  return (
    <section
      aria-label="Status updates"
      className="flex min-h-0 flex-1 flex-col"
    >
      {/* <header className="flex items-center justify-between border-b border-[var(--chat-border)] px-4 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[var(--chat-text)]">
                Status
              </h1>
              <p className="mt-0.5 text-xs text-[var(--chat-muted)]">
                {unviewedGroupCount > 0
                  ? `${unviewedGroupCount} unread ${unviewedGroupCount === 1 ? "update" : "updates"}`
                  : "Updates disappear after 24 hours"}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onCreateStatus}
          aria-label="Create a status"
          title="New status"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-sent)] text-white transition hover:bg-[var(--chat-sent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--chat-accent)] focus:ring-offset-2 focus:ring-offset-[var(--chat-sidebar)]"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header> */}

      {statusErrorMessage && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2.5">
          <p className="min-w-0 flex-1 text-xs text-red-600 dark:text-red-300">
            {statusErrorMessage}
          </p>
          <button
            type="button"
            onClick={() => void refreshStatuses()}
            aria-label="Retry loading statuses"
            title="Retry"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-500/15 dark:text-red-300"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        <button
          type="button"
          onClick={onCreateStatus}
          className="flex w-full items-center gap-3 rounded-2xl bg-[var(--chat-accent-soft)] p-3 text-left transition hover:brightness-95"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-accent)] text-white shadow-sm">
            <Plus className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-[var(--chat-accent)]">
              Add status
            </span>
            <span className="mt-0.5 block text-xs text-[var(--chat-muted)]">
              Share a photo or text update
            </span>
          </span>
        </button>

        {currentUserStatusGroup && user && (
          <button
            type="button"
            onClick={() => onOpenStatusGroup(currentUserStatusGroup)}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[var(--chat-hover)]"
          >
            <span className="rounded-full bg-[var(--chat-accent)] p-[2px]">
              <span className="block rounded-full bg-[var(--chat-sidebar)] p-[2px]">
                <UserAvatar
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  className="h-10 w-10"
                  fallbackClassName="bg-[var(--chat-accent-soft)] text-xs font-semibold text-[var(--chat-accent)]"
                />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--chat-text)]">
                My status
              </span>
              <span className="mt-0.5 block text-xs text-[var(--chat-muted)]">
                {ownStatusCount} active {ownStatusCount === 1 ? "update" : "updates"}
              </span>
            </span>
          </button>
        )}

        <div className="mt-3 border-t border-[var(--chat-border)] pt-4">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-3.5 w-3.5 text-[var(--chat-accent)]" />
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-[var(--chat-muted)]">
              Recent updates
            </h2>
            {unviewedGroupCount > 0 && (
              <span className="ml-auto rounded-full bg-[var(--chat-accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--chat-accent)]">
                {unviewedGroupCount} new
              </span>
            )}
          </div>

          {isLoadingStatuses && otherStatusGroups.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-[var(--chat-muted)]">
              <LoaderCircle className="h-5 w-5 animate-spin text-[var(--chat-accent)]" />
              Loading updates…
            </div>
          ) : otherStatusGroups.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-[var(--chat-border)]" />
              <p className="mt-3 text-sm font-semibold text-[var(--chat-text)]">
                No updates yet
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--chat-muted)]">
                When your contacts share a status, it will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-2 space-y-1">
              {otherStatusGroups.map((group) => (
                <button
                  key={group.author._id}
                  type="button"
                  onClick={() => onOpenStatusGroup(group)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[var(--chat-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--chat-accent)]"
                >
                  <span
                    className={`rounded-full p-[3px] ${
                      group.hasUnviewedStatuses
                        ? "bg-[var(--chat-accent)] shadow-[0_0_0_2px_var(--chat-accent-soft)]"
                        : "bg-[var(--chat-border)]"
                    }`}
                  >
                    <span className="block rounded-full bg-[var(--chat-sidebar)] p-[2px]">
                      <UserAvatar
                        name={group.author.name}
                        avatarUrl={group.author.avatarUrl}
                        className="h-10 w-10"
                        fallbackClassName="bg-[var(--chat-input)] text-xs font-semibold text-[var(--chat-muted)]"
                      />
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--chat-text)]">
                      {group.author.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--chat-muted)]">
                      {group.statuses.length} {group.statuses.length === 1 ? "update" : "updates"}
                      {group.hasUnviewedStatuses ? " · New" : ""}
                    </span>
                  </span>

                  {group.hasUnviewedStatuses && (
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--chat-accent)]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
