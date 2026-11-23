"use client";

import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CircleCheck,
  Clock3,
  Download,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Pencil,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import UserAvatar from "@/components/chat/UserAvatar";
import ChatFlowLoader from "@/components/shared/ChatFlowLoader";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import { createDirectConversation } from "@/services/conversation.service";
import {
  blockUser,
  getPublicUserProfile,
  unblockUser,
} from "@/services/user.service";
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
  if (!value) return "Last seen unavailable";

  const lastSeenDate = new Date(value);

  if (Number.isNaN(lastSeenDate.getTime())) {
    return "Last seen unavailable";
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

  const { onlineUserIds, lastSeenByUser, updatedProfiles } = useSocket();

  const userId = params.userId;

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isStartingConversation, setIsStartingConversation] = useState(false);

  const [isUpdatingBlock, setIsUpdatingBlock] = useState(false);

  const [isBlockConfirmModalOpen, setIsBlockConfirmModalOpen] =
    useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!expandedImage) return;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setExpandedImage(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expandedImage]);

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
    if (
      !profile ||
      !currentUser ||
      isStartingConversation ||
      profile.canMessage === false
    ) {
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

  const handleBlockToggle = async (): Promise<void> => {
    if (!profile || !currentUser || isUpdatingBlock) {
      return;
    }

    try {
      setIsUpdatingBlock(true);

      const blockStatus = profile.isBlockedByCurrentUser
        ? await unblockUser(profile._id)
        : await blockUser(profile._id);

      setProfile((current) =>
        current
          ? {
              ...current,
              ...blockStatus,
            }
          : current,
      );

      toast.success(
        blockStatus.isBlockedByCurrentUser
          ? "User blocked"
          : "User unblocked",
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsUpdatingBlock(false);
      setIsBlockConfirmModalOpen(false);
    }
  };

  if (isLoading) {
    return <ChatFlowLoader message="Loading profile..." />;
  }

  if (errorMessage || !profile) {
    return (
      <div className="public-profile-page flex h-full w-full flex-col bg-slate-50">
        <header className="flex h-20 shrink-0 items-center border-b border-[var(--chat-border)] bg-[var(--chat-surface)] px-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
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

  const updatedProfile = updatedProfiles.get(profile._id);

  const lastSeenAt = updatedProfile
    ? updatedProfile.lastSeenAt
    : (lastSeenByUser.get(profile._id) ?? profile.lastSeenAt);

  const isMessagingUnavailable = !isOwnProfile && profile.canMessage === false;

  return (
    <section className="public-profile-page relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--chat-app)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-36 h-96 w-96 rounded-full bg-cyan-200/40 blur-3xl"
      />

      <header className="relative z-10 flex h-16 shrink-0 items-center gap-2 border-b border-[var(--chat-border)] bg-[var(--chat-surface)] px-2 backdrop-blur sm:h-20 sm:gap-3 sm:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="font-semibold text-[var(--chat-text)]">Profile</h1>

          <p className="truncate text-xs text-[var(--chat-muted)]">
            View profile information
          </p>
        </div>
      </header>

      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
            <div className="relative h-28 overflow-hidden bg-gradient-to-br from-cyan-700 via-cyan-600 to-sky-500 sm:h-40">
              {profile.coverPhotoUrl && (
                <button type="button" onClick={() => setExpandedImage({ src: profile.coverPhotoUrl!, alt: `${profile.name}'s cover photo` })} aria-label="View cover photo" className="absolute inset-0 z-10 cursor-zoom-in">
                  <img src={profile.coverPhotoUrl} alt="" className="h-full w-full object-cover" />
                </button>
              )}
              <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full border-[28px] border-white/10" />
              <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-cyan-300/20 blur-2xl" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/10 to-transparent" />
            </div>

            <div className="px-4 pb-5 sm:px-8 sm:pb-8">
              <div className="-mt-14 flex flex-col items-center sm:-mt-16 sm:items-start">
                <div className="relative">
                  {(updatedProfile ? updatedProfile.avatarUrl : profile.avatarUrl) ? (
                    <button type="button" onClick={() => setExpandedImage({ src: (updatedProfile ? updatedProfile.avatarUrl : profile.avatarUrl)!, alt: `${profile.name}'s profile picture` })} aria-label="View profile picture" className="block cursor-zoom-in rounded-full focus:outline-none focus:ring-4 focus:ring-cyan-300">
                      <UserAvatar name={profile.name} avatarUrl={updatedProfile ? updatedProfile.avatarUrl : profile.avatarUrl} className="h-28 w-28 border-4 border-white text-2xl shadow-xl sm:h-32 sm:w-32 sm:text-3xl" fallbackClassName="bg-cyan-100 font-bold text-cyan-800" />
                    </button>
                  ) : (
                    <UserAvatar name={profile.name} avatarUrl={null} className="h-28 w-28 border-4 border-white text-2xl shadow-xl sm:h-32 sm:w-32 sm:text-3xl" fallbackClassName="bg-cyan-100 font-bold text-cyan-800" />
                  )}

                  {isOnline && (
                    <span
                      title="Online"
                      aria-label="Online"
                      className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-white bg-emerald-500 shadow-sm sm:bottom-2 sm:right-2"
                    />
                  )}
                </div>

                <div className="mt-4 w-full text-center sm:mt-5 sm:text-left">
                  <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="max-w-full truncate text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                      {profile.name}
                    </h2>

                    {isOwnProfile ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                        <CircleCheck className="h-3.5 w-3.5" />
                        Your profile
                      </span>
                    ) : profile.isBlockedByCurrentUser ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        <Ban className="h-3.5 w-3.5" />
                        Blocked
                      </span>
                    ) : isOnline ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Online
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {isOwnProfile
                      ? "This is your public profile."
                      : profile.isBlockedByCurrentUser
                        ? "You have blocked this user. Unblock them when you are ready to message."
                        : isMessagingUnavailable
                          ? "Messaging is unavailable for this profile."
                          : isOnline
                            ? "Available to chat now"
                            : formatLastSeen(lastSeenAt)}
                  </p>
                </div>

                <div className="mt-5 grid w-full gap-2 sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => void handlePrimaryAction()}
                    disabled={
                      isStartingConversation ||
                      isUpdatingBlock ||
                      isMessagingUnavailable
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
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
                        ? "Opening chat..."
                        : isMessagingUnavailable
                          ? "Messaging unavailable"
                          : "Message"}
                  </button>

                  {!isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => setIsBlockConfirmModalOpen(true)}
                      disabled={isUpdatingBlock || isStartingConversation}
                      className={[
                        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                        profile.isBlockedByCurrentUser
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-red-200 bg-white text-red-700 hover:bg-red-50",
                      ].join(" ")}
                    >
                      {isUpdatingBlock ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : profile.isBlockedByCurrentUser ? (
                        <ShieldCheck className="h-4 w-4" />
                      ) : (
                        <Ban className="h-4 w-4" />
                      )}

                      {isUpdatingBlock
                        ? "Updating..."
                        : profile.isBlockedByCurrentUser
                          ? "Unblock user"
                          : "Block user"}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:mt-8 sm:grid-cols-[minmax(0,1fr)_15rem] sm:gap-6 sm:pt-7">
                <section
                  aria-labelledby="about-title"
                  className="rounded-2xl bg-slate-50 p-4 sm:p-5"
                >
                  <h3
                    id="about-title"
                    className="text-sm font-semibold text-slate-950"
                  >
                    About
                  </h3>

                  {profile.bio ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {profile.bio}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm italic leading-6 text-slate-400">
                      No bio has been added yet.
                    </p>
                  )}
                </section>

                <aside className="space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                      <CalendarDays className="h-5 w-5" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">
                        Member since
                      </p>
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {formatJoinedDate(profile.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <LockKeyhole className="h-4 w-4" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">
                        Privacy
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        Email kept private
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </section>

          {!isOnline && !isOwnProfile && !isMessagingUnavailable && (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
              <Clock3 className="h-3.5 w-3.5" />
              Presence updates when this user is active.
            </p>
          )}
        </div>
      </main>

      <ConfirmModal
        isOpen={isBlockConfirmModalOpen}
        title={
          profile.isBlockedByCurrentUser ? "Unblock this user?" : "Block this user?"
        }
        description={
          profile.isBlockedByCurrentUser
            ? `You will be able to message ${profile.name} again.`
            : `You will no longer be able to message ${profile.name} until you unblock them.`
        }
        confirmLabel={profile.isBlockedByCurrentUser ? "Unblock user" : "Block user"}
        tone={profile.isBlockedByCurrentUser ? "primary" : "danger"}
        isConfirming={isUpdatingBlock}
        onConfirm={() => void handleBlockToggle()}
        onClose={() => setIsBlockConfirmModalOpen(false)}
      />
      {expandedImage && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" onClick={() => setExpandedImage(null)}>
          <button type="button" aria-label="Close image" className="absolute inset-0 cursor-zoom-out" />
          <div className="absolute right-5 top-5 z-20 flex items-center gap-2">
            <a href={expandedImage.src} download aria-label="Export image" title="Export image" onClick={(event) => event.stopPropagation()} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"><Download className="h-5 w-5" /></a>
            <button type="button" aria-label="Close image viewer" title="Close" onClick={(event) => { event.stopPropagation(); setExpandedImage(null); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"><X className="h-5 w-5" /></button>
          </div>
          <img src={expandedImage.src} alt={expandedImage.alt} className="relative z-10 max-h-[90dvh] max-w-[92vw] rounded-xl object-contain shadow-2xl" />
        </div>
      )}
    </section>
  );
}
