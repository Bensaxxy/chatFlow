"use client";

import {
  LoaderCircle,
  MessageCirclePlus,
  SearchX,
  UserRoundSearch,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import UserAvatar from "@/components/chat/UserAvatar";
import { useSocket } from "@/contexts/SocketContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import { createDirectConversation } from "@/services/conversation.service";
import { searchUsers } from "@/services/user.service";
import type { SearchUser } from "@/types/user";

interface UserSearchResultsProps {
  query: string;
}

export default function UserSearchResults({ query }: UserSearchResultsProps) {
  const router = useRouter();
  const { updatedProfiles } = useSocket();

  const [users, setUsers] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startingUserId, setStartingUserId] = useState<string | null>(null);

  const handleStartConversation = async (
    participantId: string,
  ): Promise<void> => {
    try {
      setStartingUserId(participantId);

      const conversation = await createDirectConversation(participantId);

      router.push(`/chats/${conversation._id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setStartingUserId(null);
    }
  };

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setUsers([]);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    const controller = new AbortController();

    setUsers([]);
    setIsLoading(true);
    setErrorMessage(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await searchUsers(normalizedQuery, controller.signal);

        setUsers(results);
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(getApiErrorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  if (query.trim().length < 2) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10">
        <div className="max-w-xs text-center">
          <UserRoundSearch className="mx-auto h-10 w-10 text-slate-300" />

          <p className="mt-3 text-sm text-slate-500">
            Enter at least two characters to search for someone.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-slate-500">
        <LoaderCircle className="h-5 w-5 animate-spin text-cyan-600" />
        Searching users...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-sm text-red-600">{errorMessage}</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10">
        <div className="max-w-xs text-center">
          <SearchX className="mx-auto h-10 w-10 text-slate-300" />

          <p className="mt-3 font-medium text-slate-700">No users found</p>

          <p className="mt-1 text-sm text-slate-500">
            Try a different name or email address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        People
      </p>

      <div className="divide-y divide-slate-100">
        {users.map((searchUser) => {
          const updatedProfile = updatedProfiles.get(searchUser._id);

          const displayName = updatedProfile?.name ?? searchUser.name;

          const avatarUrl = updatedProfile
            ? updatedProfile.avatarUrl
            : searchUser.avatarUrl;

          const bio = updatedProfile?.bio ?? searchUser.bio;

          return (
            <div
              key={searchUser._id}
              className="flex items-center gap-2 px-4 py-3 transition hover:bg-slate-50"
            >
              <button
                type="button"
                onClick={() => router.push(`/users/${searchUser._id}`)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <UserAvatar
                  name={displayName}
                  avatarUrl={avatarUrl}
                  className="h-12 w-12"
                  fallbackClassName="bg-cyan-100 font-semibold text-cyan-800"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-950">
                    {displayName}
                  </p>

                  <p className="truncate text-sm text-slate-500">
                    {searchUser.email}
                  </p>

                  {bio && (
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {bio}
                    </p>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => void handleStartConversation(searchUser._id)}
                disabled={startingUserId !== null}
                aria-label={`Message ${displayName}`}
                title={`Message ${displayName}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-wait disabled:opacity-60"
              >
                {startingUserId === searchUser._id ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <MessageCirclePlus className="h-5 w-5" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
