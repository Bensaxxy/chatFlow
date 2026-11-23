"use client";

import { Plus, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import UserAvatar from "@/components/chat/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useStatuses } from "@/contexts/StatusContext";
import type { StatusGroup } from "@/types/status";

interface StatusRailProps {
  onCreateStatus: () => void;
  onOpenStatusGroup: (group: StatusGroup) => void;
}

export default function StatusRail({
  onCreateStatus,
  onOpenStatusGroup,
}: StatusRailProps) {
  const railRef = useRef<HTMLElement | null>(null);
  const { user } = useAuth();
  const { statusGroups, isLoadingStatuses } = useStatuses();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const currentUserStatusGroup =
    statusGroups.find((group) => group.isCurrentUser) ?? null;
  const otherStatusGroups = statusGroups.filter((group) => !group.isCurrentUser);
  const unviewedGroups = otherStatusGroups.filter(
    (group) => group.hasUnviewedStatuses,
  );
  const ownStatusCount = currentUserStatusGroup?.statuses.length ?? 0;
  const hasActiveUpdates = ownStatusCount > 0 || otherStatusGroups.length > 0;

  useEffect(() => {
    if (!isPanelOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      if (
        event.target instanceof Node &&
        !railRef.current?.contains(event.target)
      ) {
        setIsPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isPanelOpen]);

  const openStatusGroup = (group: StatusGroup): void => {
    setIsPanelOpen(false);
    onOpenStatusGroup(group);
  };

  const createStatus = (): void => {
    setIsPanelOpen(false);
    onCreateStatus();
  };

  return (
    <aside
      ref={railRef}
      aria-label="Status shortcuts"
      className="relative hidden h-dvh w-16 shrink-0 flex-col items-center border-r border-[var(--chat-border)] bg-[var(--chat-sidebar)] px-1.5 py-3 md:flex"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--chat-accent-soft)] text-[11px] font-black tracking-tight text-[var(--chat-accent)]">
        CF
      </div>

      <div className="mt-5 flex w-full flex-col items-center">
        <button
          type="button"
          onClick={() => setIsPanelOpen((isOpen) => !isOpen)}
          aria-expanded={isPanelOpen}
          aria-controls="status-rail-panel"
          aria-label={`Open status updates${unviewedGroups.length ? `, ${unviewedGroups.length} unread` : ""}`}
          title={
            ownStatusCount > 0
              ? `Status updates · ${ownStatusCount} of your updates active`
              : "Status updates"
          }
          className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl border transition focus:outline-none focus:ring-2 focus:ring-[var(--chat-accent)] focus:ring-offset-2 focus:ring-offset-[var(--chat-sidebar)] ${
            isPanelOpen
              ? "border-[var(--chat-accent)]/25 bg-[var(--chat-accent-soft)] text-[var(--chat-accent)] shadow-sm"
              : "border-transparent text-[var(--chat-muted)] hover:border-[var(--chat-border)] hover:bg-[var(--chat-hover)] hover:text-[var(--chat-accent)]"
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
                name={user?.name ?? "ChatFlow user"}
                avatarUrl={user?.avatarUrl ?? null}
                className="h-7 w-7"
                fallbackClassName="bg-[var(--chat-accent-soft)] text-[9px] font-semibold text-[var(--chat-accent)]"
              />
            </span>
          </span>
          {unviewedGroups.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[var(--chat-sidebar)] bg-[var(--chat-accent)] px-1 text-[9px] font-bold text-white">
              {unviewedGroups.length > 9 ? "9+" : unviewedGroups.length}
            </span>
          )}
        </button>
        <span className="mt-1.5 text-[9px] font-semibold text-[var(--chat-muted)]">
          Status
        </span>
        {ownStatusCount > 1 && (
          <span className="-mt-0.5 text-[9px] font-medium text-[var(--chat-accent)]">
            {ownStatusCount} live
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={createStatus}
        aria-label="Add a new status"
        title="Add status"
        className="mt-3 flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--chat-border)] bg-[var(--chat-control)] text-[var(--chat-accent)] shadow-sm transition hover:scale-105 hover:border-[var(--chat-accent)]/30 hover:bg-[var(--chat-accent-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--chat-accent)] focus:ring-offset-2 focus:ring-offset-[var(--chat-sidebar)]"
      >
        <Plus className="h-4 w-4" />
      </button>
      <span className="mt-1 text-[9px] font-semibold text-[var(--chat-muted)]">
        New
      </span>

      {isPanelOpen && (
        <div
          id="status-rail-panel"
          role="dialog"
          aria-label="Status updates"
          className="absolute left-[calc(100%+10px)] top-3 z-50 flex max-h-[calc(100dvh-1.5rem)] w-80 flex-col overflow-hidden rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-[var(--chat-border)] px-4 py-3">
            <div>
              <p className="text-sm font-bold text-[var(--chat-text)]">Status updates</p>
              <p className="mt-0.5 text-[11px] text-[var(--chat-muted)]">
                {unviewedGroups.length > 0
                  ? `${unviewedGroups.length} unread ${unviewedGroups.length === 1 ? "update" : "updates"}`
                  : hasActiveUpdates
                    ? "Shared updates disappear after 24 hours"
                    : "Share an update with your contacts"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPanelOpen(false)}
              aria-label="Close status updates"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 overflow-y-auto p-3">
            <button
              type="button"
              onClick={createStatus}
              className="flex w-full items-center gap-3 rounded-xl bg-[var(--chat-accent-soft)] px-3 py-2.5 text-left transition hover:brightness-95"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-accent)] text-white">
                <Plus className="h-4 w-4" />
              </span>
              <span>
                  <span className="block text-sm font-bold text-[var(--chat-accent)]">
                    Add status
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[var(--chat-muted)]">
                    Share text or a photo
                  </span>
              </span>
            </button>

            {currentUserStatusGroup && user && (
              <button
                type="button"
                onClick={() => openStatusGroup(currentUserStatusGroup)}
                className="mt-3 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-[var(--chat-hover)]"
              >
                <span className="rounded-full bg-[var(--chat-accent)] p-[2px]">
                  <span className="block rounded-full bg-[var(--chat-surface)] p-[2px]">
                    <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="h-8 w-8" fallbackClassName="bg-[var(--chat-accent-soft)] text-[10px] font-semibold text-[var(--chat-accent)]" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--chat-text)]">
                    My status
                  </span>
                  <span className="block text-[11px] text-[var(--chat-muted)]">
                    {ownStatusCount} active {ownStatusCount === 1 ? "update" : "updates"}
                  </span>
                </span>
              </button>
            )}

            <div className="mt-3 border-t border-[var(--chat-border)] pt-3">
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="h-3.5 w-3.5 text-[var(--chat-accent)]" />
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--chat-muted)]">
                  Recent updates
                </p>
                {unviewedGroups.length > 0 && (
                  <span className="ml-auto rounded-full bg-[var(--chat-accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--chat-accent)]">
                    {unviewedGroups.length} new
                  </span>
                )}
              </div>

              {isLoadingStatuses ? (
                <p className="px-1 py-5 text-center text-xs text-[var(--chat-muted)]">Loading status updates…</p>
              ) : otherStatusGroups.length === 0 ? (
                <p className="px-1 py-5 text-center text-xs leading-5 text-[var(--chat-muted)]">No public status updates are available yet.</p>
              ) : (
                <div className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
                  {otherStatusGroups.map((group) => (
                    <button
                      key={group.author._id}
                      type="button"
                      onClick={() => openStatusGroup(group)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-[var(--chat-hover)]"
                    >
                      <span className={`rounded-full p-[2px] ${group.hasUnviewedStatuses ? "bg-[var(--chat-accent)]" : "bg-[var(--chat-border)]"}`}>
                        <span className="block rounded-full bg-[var(--chat-surface)] p-[2px]">
                          <UserAvatar name={group.author.name} avatarUrl={group.author.avatarUrl} className="h-8 w-8" fallbackClassName="bg-[var(--chat-input)] text-[10px] font-semibold text-[var(--chat-muted)]" />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--chat-text)]">{group.author.name}</span>
                        <span className="block text-[11px] text-[var(--chat-muted)]">
                          {group.statuses.length} {group.statuses.length === 1 ? "update" : "updates"}
                          {group.hasUnviewedStatuses ? " · New" : ""}
                        </span>
                      </span>
                      {group.hasUnviewedStatuses && <span className="h-2 w-2 rounded-full bg-[var(--chat-accent)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
