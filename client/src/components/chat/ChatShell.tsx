"use client";

import {
  LogOut,
  MessageCircleMore,
  Palette,
  Search,
  UserRound,
} from "lucide-react";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import {
  useState,
  type ReactNode,
} from "react";
import { toast } from "react-toastify";

import ChatThemeDrawer from "./ChatThemeDrawer";
import ConversationList from "./ConversationList";
import UserSearchResults from "./UserSearchResults";

import StatusComposerModal from "@/components/status/StatusComposerModal";
import StatusRail from "@/components/status/StatusRail";
import StatusSidebar from "@/components/status/StatusSidebar";
import StatusStrip from "@/components/status/StatusStrip";
import StatusViewer from "@/components/status/StatusViewer";
import ActionMenu from "@/components/ui/ActionMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useChatTheme } from "@/contexts/ChatThemeContext";
import { useSocket } from "@/contexts/SocketContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import { disablePushNotifications } from "@/services/push-notification.service";
import type { StatusGroup } from "@/types/status";

interface ChatShellProps {
  children: ReactNode;
}

type SidebarView = "chats" | "statuses";

const getInitials = (
  name: string,
): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part[0]?.toUpperCase(),
    )
    .join("");

export default function ChatShell({
  children,
}: ChatShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, logout } = useAuth();
  const { theme } = useChatTheme();
  const { isConnected } = useSocket();

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    sidebarView,
    setSidebarView,
  ] = useState<SidebarView>("chats");

  const [
    isThemeDrawerOpen,
    setIsThemeDrawerOpen,
  ] = useState(false);

  const [
    isStatusComposerOpen,
    setIsStatusComposerOpen,
  ] = useState(false);

  const [
    selectedStatusGroup,
    setSelectedStatusGroup,
  ] = useState<StatusGroup | null>(
    null,
  );

  const conversationIsOpen =
    pathname !== "/chats";

  const handleOpenProfile =
    (): void => {
      router.push("/profile");
    };

  const handleCreateStatus =
    (): void => {
      setSelectedStatusGroup(null);
      setIsStatusComposerOpen(true);
    };

  const handleShowChats = (): void => {
    setSearchQuery("");
    setSidebarView("chats");
  };

  const handleShowStatuses = (): void => {
    setSearchQuery("");
    setSidebarView("statuses");
  };

  const handleOpenStatusGroup = (
    group: StatusGroup,
  ): void => {
    setIsStatusComposerOpen(false);
    setSelectedStatusGroup(group);
  };

  const handleCloseStatusComposer =
    (): void => {
      setIsStatusComposerOpen(false);
    };

  const handleCloseStatusViewer =
    (): void => {
      setSelectedStatusGroup(null);
    };

  const handleLogout =
    async (): Promise<void> => {
      try {
        /**
         * Keep a shared browser from receiving this account's
         * push notifications after logout.
         */
        await disablePushNotifications().catch(
          () => undefined,
        );

        await logout();

        toast.success(
          "Logged out successfully",
        );
      } catch (error) {
        toast.error(
          getApiErrorMessage(error),
        );
      } finally {
        router.replace("/login");
        router.refresh();
      }
    };

  return (
    <div
      data-chat-appearance={
        theme.appearance
      }
      data-chat-wallpaper={
        theme.wallpaper
      }
      data-chat-bubble-color={
        theme.bubbleColor
      }
      className="chat-theme flex h-dvh min-w-0 w-full overflow-hidden bg-[var(--chat-app)] text-[var(--chat-text)]"
    >
      <StatusRail
        activeView={sidebarView}
        onCreateStatus={handleCreateStatus}
        onShowChats={handleShowChats}
        onShowStatuses={handleShowStatuses}
      />

      <aside
        className={`w-full shrink-0 flex-col border-r border-[var(--chat-border)] bg-[var(--chat-sidebar)] md:flex md:w-[380px] ${
          conversationIsOpen
            ? "hidden"
            : "flex"
        }`}
      >
        <header className="relative flex min-h-16 items-center gap-3 border-b border-[var(--chat-border)] px-4 py-2 sm:min-h-20 sm:py-3">
          <button
            type="button"
            onClick={
              handleOpenProfile
            }
            aria-label="Open profile"
            title="Open profile"
            className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--chat-accent-soft)] font-semibold text-[var(--chat-accent)] transition hover:ring-4 hover:ring-[var(--chat-accent-soft)]"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : user ? (
              getInitials(user.name)
            ) : (
              "CF"
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[var(--chat-text)]">
              {user?.name ??
                "ChatFlow user"}
            </p>

            <p className="truncate text-xs text-[var(--chat-muted)]">
              {user?.email}
            </p>

            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              />

              <span className="text-[11px] text-[var(--chat-muted)]">
                {isConnected
                  ? "Connected"
                  : "Reconnecting..."}
              </span>
            </div>
          </div>

          <ActionMenu
            label="Account options"
            menuLabel="Account options"
            triggerClassName="h-11 w-11"
            items={[
              {
                id: "theme",
                label: "Chat theme",
                icon: Palette,
                onSelect: () =>
                  setIsThemeDrawerOpen(
                    true,
                  ),
              },
              {
                id: "profile",
                label: "View profile",
                icon: UserRound,
                onSelect:
                  handleOpenProfile,
              },
              {
                id: "logout",
                label: "Log out",
                icon: LogOut,
                tone: "danger",
                dividerBefore: true,
                onSelect: () =>
                  void handleLogout(),
              },
            ]}
          />
        </header>

        {sidebarView === "statuses" ? (
          <StatusSidebar
            onCreateStatus={handleCreateStatus}
            onOpenStatusGroup={handleOpenStatusGroup}
          />
        ) : (
          <>
            <div className="md:hidden">
              <StatusStrip
                onCreateStatus={handleCreateStatus}
                onOpenStatusGroup={handleOpenStatusGroup}
              />
            </div>

            <div className="border-b border-[var(--chat-border)] p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--chat-muted)]" />

                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search people"
                  aria-label="Search people"
                  className="w-full rounded-xl border border-[var(--chat-border)] bg-[var(--chat-input)] py-2.5 pl-10 pr-4 text-sm text-[var(--chat-text)] outline-none transition placeholder:text-[var(--chat-muted)] focus:border-[var(--chat-accent)] focus:bg-[var(--chat-control)] focus:ring-4 focus:ring-[var(--chat-accent-soft)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <h1 className="text-xl font-bold text-[var(--chat-text)]">
                  Chats
                </h1>

                <p className="mt-0.5 text-xs text-[var(--chat-muted)]">
                  Your recent conversations
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chat-sent)] text-white">
                <MessageCircleMore className="h-5 w-5" />
              </div>
            </div>

            <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto">
              {searchQuery.trim() ? (
                <UserSearchResults query={searchQuery} />
              ) : (
                <ConversationList
                  onOpenStatusGroup={handleOpenStatusGroup}
                />
              )}
            </div>
          </>
        )}
      </aside>

      <main
        className={`min-w-0 flex-1 ${
          conversationIsOpen
            ? "flex"
            : "hidden md:flex"
        }`}
      >
        {children}
      </main>

      <ChatThemeDrawer
        isOpen={isThemeDrawerOpen}
        onClose={() =>
          setIsThemeDrawerOpen(false)
        }
      />

      <StatusComposerModal
        isOpen={
          isStatusComposerOpen
        }
        onClose={
          handleCloseStatusComposer
        }
      />

      <StatusViewer
        isOpen={
          selectedStatusGroup !== null
        }
        initialGroup={
          selectedStatusGroup
        }
        onClose={
          handleCloseStatusViewer
        }
      />
    </div>
  );
}
