"use client";

import { LoaderCircle, Plus, RefreshCw, Sparkles } from "lucide-react";

import UserAvatar from "@/components/chat/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useStatuses } from "@/contexts/StatusContext";
import type { StatusGroup } from "@/types/status";

interface StatusStripProps {
  onCreateStatus: () => void;
  onOpenStatusGroup: (group: StatusGroup) => void;
}

export default function StatusStrip({ onCreateStatus, onOpenStatusGroup }: StatusStripProps) {
  const { user } = useAuth();
  const { statusGroups, isLoadingStatuses, statusErrorMessage, refreshStatuses } = useStatuses();

  if (!user) {
    return null;
  }

  const currentUserStatusGroup = statusGroups.find((group) => group.isCurrentUser) ?? null;
  const otherStatusGroups = statusGroups.filter((group) => !group.isCurrentUser);

  const handleOpenMyStatus = (): void => {
    if (currentUserStatusGroup) {
      onOpenStatusGroup(currentUserStatusGroup);
      return;
    }

    onCreateStatus();
  };

  return (
    <section aria-label="Status updates" className="chat-status-strip border-b border-[var(--chat-border)] bg-[var(--chat-sidebar)]">
      <div className="flex h-10 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-xs font-bold text-[var(--chat-text)]">Status</h2>
          <span className="text-[10px] text-[var(--chat-muted)]">24h updates</span>
        </div>

        <button type="button" onClick={onCreateStatus} aria-label="Create status" title="Create status" className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--chat-accent-soft)] text-[var(--chat-accent)] transition hover:scale-105 hover:bg-[var(--chat-accent)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--chat-accent)] focus:ring-offset-2 focus:ring-offset-[var(--chat-sidebar)]">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {statusErrorMessage && (
        <div className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-lg border border-red-400/35 bg-red-500/10 px-2.5 py-1.5">
          <p className="min-w-0 flex-1 truncate text-[11px] text-red-600 dark:text-red-300">{statusErrorMessage}</p>
          <button type="button" onClick={() => void refreshStatuses()} aria-label="Retry loading statuses" title="Retry" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-red-600 transition hover:bg-red-500/15 dark:text-red-300">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex min-w-0 gap-2.5 overflow-x-auto px-4 pb-3 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="w-[52px] shrink-0 text-center">
          <div className="relative mx-auto h-11 w-11">
            <button type="button" onClick={handleOpenMyStatus} aria-label={currentUserStatusGroup ? "View my status" : "Create my status"} title={currentUserStatusGroup ? "View my status" : "Create status"} className="group block rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--chat-accent)] focus:ring-offset-2 focus:ring-offset-[var(--chat-sidebar)]">
              <span className={`block rounded-full p-[2px] ${currentUserStatusGroup ? "bg-[var(--chat-accent)]" : "bg-[var(--chat-border)]"}`}>
                <span className="block rounded-full bg-[var(--chat-sidebar)] p-[2px]">
                  <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="h-9 w-9" fallbackClassName="bg-[var(--chat-accent-soft)] text-[10px] font-semibold text-[var(--chat-accent)]" />
                </span>
              </span>
            </button>
            <button type="button" onClick={onCreateStatus} aria-label="Add new status" title="Add new status" className="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-[var(--chat-sidebar)] bg-[var(--chat-accent)] text-white shadow-sm transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[var(--chat-accent)]">
              <Plus className="h-2.5 w-2.5" />
            </button>
          </div>
          <p className="mt-1 truncate text-[10px] font-semibold text-[var(--chat-text)]">You</p>
        </div>

        {isLoadingStatuses && otherStatusGroups.length === 0 && [0, 1, 2, 3].map((skeletonIndex) => (
          <div key={skeletonIndex} className="w-[52px] shrink-0 animate-pulse text-center">
            <div className="mx-auto h-11 w-11 rounded-full bg-[var(--chat-border)]" />
            <div className="mx-auto mt-1.5 h-2 w-9 rounded bg-[var(--chat-border)]" />
          </div>
        ))}

        {!isLoadingStatuses && otherStatusGroups.length === 0 && (
          <div className="flex min-w-[92px] flex-1 items-center px-1 text-[11px] text-[var(--chat-muted)]">No updates yet</div>
        )}

        {otherStatusGroups.map((group) => (
          <div key={group.author._id} className="w-[52px] shrink-0 text-center">
            <button type="button" onClick={() => onOpenStatusGroup(group)} aria-label={`View ${group.author.name}'s status`} title={`View ${group.author.name}'s status`} className="group mx-auto block rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--chat-accent)] focus:ring-offset-2 focus:ring-offset-[var(--chat-sidebar)]">
              <span className={`block rounded-full p-[2px] transition group-hover:scale-105 ${group.hasUnviewedStatuses ? "bg-[var(--chat-accent)]" : "bg-[var(--chat-border)]"}`}>
                <span className="block rounded-full bg-[var(--chat-sidebar)] p-[2px]">
                  <UserAvatar name={group.author.name} avatarUrl={group.author.avatarUrl} className="h-9 w-9" fallbackClassName="bg-[var(--chat-input)] text-[10px] font-semibold text-[var(--chat-muted)]" />
                </span>
              </span>
            </button>
            <p className={`mt-1 truncate text-[10px] ${group.hasUnviewedStatuses ? "font-bold text-[var(--chat-text)]" : "font-medium text-[var(--chat-muted)]"}`}>{group.author.name}</p>
          </div>
        ))}

        {isLoadingStatuses && otherStatusGroups.length > 0 && (
          <div className="flex w-8 shrink-0 items-center justify-center"><LoaderCircle className="h-4 w-4 animate-spin text-[var(--chat-accent)]" /></div>
        )}
      </div>
    </section>
  );
}
