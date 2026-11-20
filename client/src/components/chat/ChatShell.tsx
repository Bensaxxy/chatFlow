"use client";

import {
  LogOut,
  MessageCircleMore,
  Search,
  UserRound,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "react-toastify";

import ConversationList from "./ConversationList";
import UserSearchResults from "./UserSearchResults";

import ActionMenu from "@/components/ui/ActionMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { getApiErrorMessage } from "@/lib/api/errors";

interface ChatShellProps {
  children: ReactNode;
}

const getInitials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export default function ChatShell({ children }: ChatShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, logout } = useAuth();
  const { isConnected } = useSocket();

  const [searchQuery, setSearchQuery] = useState("");

  const conversationIsOpen = pathname !== "/chats";

  const handleOpenProfile = (): void => {
    router.push("/profile");
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();

      toast.success("Logged out successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <div className="flex h-dvh min-w-0 w-full overflow-hidden bg-slate-100">
      <aside
        className={`w-full shrink-0 flex-col border-r border-slate-200 bg-white md:flex md:w-[380px] ${
          conversationIsOpen ? "hidden" : "flex"
        }`}
      >
        <header className="relative flex min-h-16 items-center gap-3 border-b border-slate-200 px-4 py-2 sm:min-h-20 sm:py-3">
          <button
            type="button"
            onClick={handleOpenProfile}
            aria-label="Open profile"
            title="Open profile"
            className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-100 font-semibold text-cyan-800 transition hover:ring-4 hover:ring-cyan-100"
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
            <p className="truncate font-semibold text-slate-950">
              {user?.name ?? "ChatFlow user"}
            </p>

            <p className="truncate text-xs text-slate-500">{user?.email}</p>

            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />

              <span className="text-[11px] text-slate-500">
                {isConnected ? "Connected" : "Reconnecting..."}
              </span>
            </div>
          </div>

          <ActionMenu
            label="Account options"
            menuLabel="Account options"
            triggerClassName="h-11 w-11 hover:bg-slate-100"
            items={[
              {
                id: "profile",
                label: "View profile",
                icon: UserRound,
                onSelect: handleOpenProfile,
              },
              {
                id: "logout",
                label: "Log out",
                icon: LogOut,
                tone: "danger",
                dividerBefore: true,
                onSelect: () => void handleLogout(),
              },
            ]}
          />
        </header>

        <div className="border-b border-slate-200 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search people"
              aria-label="Search people"
              className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-950">Chats</h1>

            <p className="mt-0.5 text-xs text-slate-500">
              Your recent conversations
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
            <MessageCircleMore className="h-5 w-5" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {searchQuery.trim() ? (
            <UserSearchResults query={searchQuery} />
          ) : (
            <ConversationList />
          )}
        </div>
      </aside>

      <main
        className={`min-w-0 flex-1 ${
          conversationIsOpen ? "flex" : "hidden md:flex"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
