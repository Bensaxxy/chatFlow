"use client";

import {
  ArrowLeft,
  CalendarDays,
  LoaderCircle,
  MessageCircle,
  Pencil,
  UserRound,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import UserAvatar from "@/components/chat/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import { createDirectConversation } from "@/services/conversation.service";
import { getPublicUserProfile } from "@/services/user.service";
import type { PublicUserProfile } from "@/types/user";

const formatJoinedDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

const formatLastSeen = (value: string | null): string => {
  if (!value) return "Offline";

  const lastSeenDate = new Date(value);

  if (Number.isNaN(lastSeenDate.getTime())) {
    return "Offline";
  }

  const now = new Date();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const time = lastSeenDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (lastSeenDate.toDateString() === now.toDateString()) {
    return `Last seen today at ${time}`;
  }

  if (lastSeenDate.toDateString() === yesterday.toDateString()) {
    return `Last seen yesterday at ${time}`;
  }

  const date = lastSeenDate.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year:
      lastSeenDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });

  return `Last seen ${date} at ${time}`;
};

export default function PublicProfilePage() {
  const params = useParams<{
    userId: string;
  }>();

  const router = useRouter();

  const { user: currentUser } = useAuth();

  const { onlineUserIds, lastSeenByUser } = useSocket();

  const userId = params.userId;

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isStartingConversation, setIsStartingConversation] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadProfile = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const result = await getPublicUserProfile(userId, controller.signal);

        if (controller.signal.aborted) {
          return;
        }

        setProfile(result);
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(getApiErrorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      controller.abort();
    };
  }, [userId]);

  const handlePrimaryAction = async (): Promise<void> => {
    if (!profile || !currentUser || isStartingConversation) {
      return;
    }

    if (profile._id === currentUser._id) {
      router.push("/profile");
      return;
    }

    try {
      setIsStartingConversation(true);

      const conversation = await createDirectConversation(profile._id);

      router.push(`/chats/${conversation._id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsStartingConversation(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <LoaderCircle className="h-6 w-6 animate-spin text-cyan-600" />
          Loading profile...
        </div>
      </div>
    );
  }

  if (errorMessage || !profile) {
    return (
      <div className="flex h-full w-full flex-col bg-slate-50">
        <header className="flex h-20 shrink-0 items-center border-b border-slate-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div>
            <UserRound className="mx-auto h-12 w-12 text-slate-300" />

            <p className="mt-4 font-medium text-red-600">
              {errorMessage ?? "Profile could not be loaded"}
            </p>

            <button
              type="button"
              onClick={() => router.push("/chats")}
              className="mt-5 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Return to chats
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?._id === profile._id;

  const isOnline = !isOwnProfile && onlineUserIds.has(profile._id);

  const lastSeenAt = lastSeenByUser.get(profile._id) ?? profile.lastSeenAt;

  return (
    <section className="flex h-full w-full flex-col bg-slate-50">
      <header className="flex h-20 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div>
          <h1 className="font-semibold text-slate-950">Public profile</h1>

          <p className="text-xs text-slate-500">View profile information</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-32 bg-gradient-to-r from-cyan-600 via-cyan-500 to-sky-500" />

            <div className="px-5 pb-6 sm:px-8">
              <div className="-mt-16 flex flex-col items-center sm:flex-row sm:items-end">
                <div className="relative">
                  <UserAvatar
                    name={profile.name}
                    avatarUrl={profile.avatarUrl}
                    className="h-32 w-32 border-4 border-white text-3xl shadow-lg"
                    fallbackClassName="bg-cyan-100 font-bold text-cyan-800"
                  />

                  {isOnline && (
                    <span
                      title="Online"
                      aria-label="Online"
                      className="absolute bottom-2 right-2 h-5 w-5 rounded-full border-[3px] border-white bg-emerald-500"
                    />
                  )}
                </div>

                <div className="mt-4 min-w-0 flex-1 text-center sm:mb-2 sm:ml-5 sm:mt-0 sm:text-left">
                  <h2 className="truncate text-2xl font-bold text-slate-950">
                    {profile.name}
                  </h2>

                  {isOwnProfile ? (
                    <p className="mt-1 text-sm font-medium text-cyan-700">
                      This is your profile
                    </p>
                  ) : isOnline ? (
                    <p className="mt-1 text-sm font-medium text-emerald-600">
                      Online
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">
                      {formatLastSeen(lastSeenAt)}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handlePrimaryAction()}
                  disabled={isStartingConversation}
                  className="mt-5 inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 sm:mb-2 sm:mt-0"
                >
                  {isStartingConversation ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : isOwnProfile ? (
                    <Pencil className="h-4 w-4" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}

                  {isOwnProfile
                    ? "Edit profile"
                    : isStartingConversation
                      ? "Opening..."
                      : "Message"}
                </button>
              </div>

              <div className="mt-8 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-950">About</h3>

                {profile.bio ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="mt-2 text-sm italic text-slate-400">
                    No bio has been added yet.
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                  <CalendarDays className="h-5 w-5" />
                </span>

                <div>
                  <p className="text-xs text-slate-500">Member since</p>

                  <p className="text-sm font-semibold text-slate-700">
                    {formatJoinedDate(profile.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            Email addresses are kept private.
          </p>
        </div>
      </div>
    </section>
  );
}
