"use client";

import {
  ArrowLeft,
  Check,
  Inbox,
  LoaderCircle,
  MessageCircle,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import UserAvatar from "@/components/chat/UserAvatar";
import { useSocket } from "@/contexts/SocketContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import { createDirectConversation } from "@/services/conversation.service";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriends,
  getFriendSuggestions,
  removeFriend,
  sendFriendRequest,
} from "@/services/friend.service";
import type { FriendUser, FriendshipView } from "@/types/friend";

type FriendsTab = "discover" | "friends" | "requests";

interface FriendsDrawerProps {
  isOpen?: boolean;
  onClose: () => void;
  embedded?: boolean;
}

export default function FriendsDrawer({
  isOpen = false,
  onClose,
  embedded = false,
}: FriendsDrawerProps) {
  const router = useRouter();
  const { socket } = useSocket();

  const isVisible = embedded || isOpen;

  const [activeTab, setActiveTab] = useState<FriendsTab>("discover");

  const [suggestions, setSuggestions] = useState<FriendUser[]>([]);

  const [friends, setFriends] = useState<FriendshipView[]>([]);

  const [incomingRequests, setIncomingRequests] = useState<FriendshipView[]>(
    [],
  );

  const [outgoingRequests, setOutgoingRequests] = useState<FriendshipView[]>(
    [],
  );

  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [operationId, setOperationId] = useState<string | null>(null);

  const loadSuggestions = useCallback(async (signal?: AbortSignal) => {
    const result = await getFriendSuggestions({
      limit: 20,
      signal,
    });

    setSuggestions(result.users);
  }, []);

  const loadFriends = useCallback(async (signal?: AbortSignal) => {
    const result = await getFriends({
      limit: 20,
      signal,
    });

    setFriends(result.friends);
  }, []);

  const loadRequests = useCallback(async (signal?: AbortSignal) => {
    const [incomingResult, outgoingResult] = await Promise.all([
      getFriendRequests({
        direction: "incoming",
        limit: 20,
        signal,
      }),

      getFriendRequests({
        direction: "outgoing",
        limit: 20,
        signal,
      }),
    ]);

    setIncomingRequests(incomingResult.requests);
    setOutgoingRequests(outgoingResult.requests);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const controller = new AbortController();

    const loadActiveTab = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        if (activeTab === "discover") {
          await loadSuggestions(controller.signal);
        } else if (activeTab === "friends") {
          await loadFriends(controller.signal);
        } else {
          await loadRequests(controller.signal);
        }
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

    void loadActiveTab();

    return () => {
      controller.abort();
    };
  }, [activeTab, isVisible, loadFriends, loadRequests, loadSuggestions]);

  useEffect(() => {
    if (!isVisible || embedded) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [embedded, isVisible, onClose]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const refreshActiveTab = (): void => {
      if (activeTab === "discover") {
        void loadSuggestions();
      } else if (activeTab === "friends") {
        void loadFriends();
      } else {
        void loadRequests();
      }
    };

    socket.on("friendship:changed", refreshActiveTab);

    return () => {
      socket.off("friendship:changed", refreshActiveTab);
    };
  }, [activeTab, isVisible, loadFriends, loadRequests, loadSuggestions, socket]);

  const handleOpenProfile = (userId: string): void => {
    onClose();
    router.push(`/users/${userId}`);
  };

  const handleStartConversation = async (userId: string): Promise<void> => {
    try {
      setOperationId(`message:${userId}`);

      const conversation = await createDirectConversation(userId);

      onClose();
      router.push(`/chats/${conversation._id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setOperationId(null);
    }
  };

  const handleSendRequest = async (user: FriendUser): Promise<void> => {
    try {
      setOperationId(`send:${user._id}`);

      await sendFriendRequest(user._id);

      setSuggestions((current) =>
        current.filter((candidate) => candidate._id !== user._id),
      );

      toast.success(`Friend request sent to ${user.name}`);

      void loadRequests();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setOperationId(null);
    }
  };

  const handleAcceptRequest = async (
    request: FriendshipView,
  ): Promise<void> => {
    try {
      setOperationId(`accept:${request.friendshipId}`);

      const friendship = await acceptFriendRequest(request.friendshipId);

      setIncomingRequests((current) =>
        current.filter((item) => item.friendshipId !== request.friendshipId),
      );

      setFriends((current) => [
        friendship,
        ...current.filter(
          (item) => item.friendshipId !== friendship.friendshipId,
        ),
      ]);

      toast.success(`You and ${request.user.name} are now friends`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setOperationId(null);
    }
  };

  const handleDeclineRequest = async (
    request: FriendshipView,
  ): Promise<void> => {
    try {
      setOperationId(`decline:${request.friendshipId}`);

      await declineFriendRequest(request.friendshipId);

      setIncomingRequests((current) =>
        current.filter((item) => item.friendshipId !== request.friendshipId),
      );

      toast.success("Friend request declined");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setOperationId(null);
    }
  };

  const handleCancelRequest = async (
    request: FriendshipView,
  ): Promise<void> => {
    try {
      setOperationId(`cancel:${request.friendshipId}`);

      await cancelFriendRequest(request.friendshipId);

      setOutgoingRequests((current) =>
        current.filter((item) => item.friendshipId !== request.friendshipId),
      );

      toast.success("Friend request cancelled");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setOperationId(null);
    }
  };

  const handleRemoveFriend = async (
    friendship: FriendshipView,
  ): Promise<void> => {
    const confirmed = window.confirm(
      `Remove ${friendship.user.name} from your friends?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setOperationId(`remove:${friendship.friendshipId}`);

      await removeFriend(friendship.friendshipId);

      setFriends((current) =>
        current.filter((item) => item.friendshipId !== friendship.friendshipId),
      );

      toast.success(`${friendship.user.name} was removed`);

      void loadSuggestions();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setOperationId(null);
    }
  };

  const renderEmptyState = (
    icon: React.ReactNode,
    title: string,
    description: string,
  ) => (
    <div className="flex min-h-72 items-center justify-center px-6 text-center">
      <div className="max-w-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
          {icon}
        </div>

        <p className="mt-4 font-semibold text-[var(--chat-text)]">{title}</p>

        <p className="mt-1 text-sm text-[var(--chat-muted)]">{description}</p>
      </div>
    </div>
  );

  const renderUserDetails = (user: FriendUser) => (
    <>
      <UserAvatar
        name={user.name}
        avatarUrl={user.avatarUrl}
        className="h-12 w-12"
        fallbackClassName="bg-[var(--chat-accent-soft)] font-semibold text-[var(--chat-accent)]"
      />

      <button
        type="button"
        onClick={() => handleOpenProfile(user._id)}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate font-semibold text-[var(--chat-text)]">
          {user.name}
        </p>

        <p className="mt-0.5 truncate text-sm text-[var(--chat-muted)]">
          {user.bio || "ChatFlow member"}
        </p>
      </button>
    </>
  );

  if (!isVisible) {
    return null;
  }

  const content = (
    <section
      role={embedded ? undefined : "dialog"}
      aria-modal={embedded ? undefined : true}
      aria-label="Find Friends"
      className={
        embedded
          ? "flex min-h-0 flex-1 flex-col"
          : "absolute inset-y-0 right-0 flex w-full flex-col border-l border-[var(--chat-border)] bg-[var(--chat-sidebar)] shadow-2xl sm:max-w-md"
      }
    >
        <header className="flex items-center gap-3 border-b border-[var(--chat-border)] px-4 py-4">
          {embedded && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to chats"
              title="Back to chats"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)] md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
            <UsersRound className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-[var(--chat-text)]">Find Friends</h2>

            <p className="text-xs text-[var(--chat-muted)]">
              Discover and connect with people on ChatFlow
            </p>
          </div>

          {!embedded && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Find Friends"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </header>

        <div className="grid grid-cols-3 border-b border-[var(--chat-border)] px-3 pt-2">
          {(
            [
              ["discover", "Discover"],
              ["friends", "Friends"],
              ["requests", "Requests"],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-2 py-3 text-sm font-semibold transition ${
                activeTab === tab
                  ? "border-[var(--chat-accent)] text-[var(--chat-accent)]"
                  : "border-transparent text-[var(--chat-muted)] hover:text-[var(--chat-text)]"
              }`}
            >
              {label}

              {tab === "requests" && incomingRequests.length > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">
                  {incomingRequests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-[var(--chat-muted)]">
              <LoaderCircle className="h-5 w-5 animate-spin text-[var(--chat-accent)]" />
              Loading...
            </div>
          ) : errorMessage ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-rose-500">{errorMessage}</p>
            </div>
          ) : activeTab === "discover" ? (
            suggestions.length === 0 ? (
              renderEmptyState(
                <UsersRound className="h-6 w-6" />,
                "No suggestions right now",
                "New ChatFlow members will appear here.",
              )
            ) : (
              <div className="divide-y divide-[var(--chat-border)]">
                {suggestions.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--chat-hover)]"
                  >
                    {renderUserDetails(user)}

                    <button
                      type="button"
                      onClick={() => void handleSendRequest(user)}
                      disabled={operationId !== null}
                      aria-label={`Add ${user.name} as a friend`}
                      title="Add friend"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--chat-accent-soft)] text-[var(--chat-accent)] transition hover:brightness-95 disabled:opacity-50"
                    >
                      {operationId === `send:${user._id}` ? (
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                      ) : (
                        <UserPlus className="h-5 w-5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleStartConversation(user._id)}
                      disabled={operationId !== null}
                      aria-label={`Message ${user.name}`}
                      title="Message"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)] disabled:opacity-50"
                    >
                      {operationId === `message:${user._id}` ? (
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                      ) : (
                        <MessageCircle className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === "friends" ? (
            friends.length === 0 ? (
              renderEmptyState(
                <UserPlus className="h-6 w-6" />,
                "No friends yet",
                "Visit Discover to connect with people.",
              )
            ) : (
              <div className="divide-y divide-[var(--chat-border)]">
                {friends.map((friendship) => (
                  <div
                    key={friendship.friendshipId}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--chat-hover)]"
                  >
                    {renderUserDetails(friendship.user)}

                    <button
                      type="button"
                      onClick={() =>
                        void handleStartConversation(friendship.user._id)
                      }
                      disabled={operationId !== null}
                      aria-label={`Message ${friendship.user.name}`}
                      title="Message"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--chat-accent-soft)] text-[var(--chat-accent)] disabled:opacity-50"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleRemoveFriend(friendship)}
                      disabled={operationId !== null}
                      aria-label={`Remove ${friendship.user.name}`}
                      title="Remove friend"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-rose-500 transition hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      {operationId === `remove:${friendship.friendshipId}` ? (
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                      ) : (
                        <UserMinus className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
            renderEmptyState(
              <Inbox className="h-6 w-6" />,
              "No friend requests",
              "Incoming and sent requests will appear here.",
            )
          ) : (
            <div>
              {incomingRequests.length > 0 && (
                <section>
                  <p className="border-b border-[var(--chat-border)] bg-[var(--chat-app)] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[var(--chat-muted)]">
                    Incoming
                  </p>

                  {incomingRequests.map((request) => (
                    <div
                      key={request.friendshipId}
                      className="flex items-center gap-3 border-b border-[var(--chat-border)] px-4 py-3"
                    >
                      {renderUserDetails(request.user)}

                      <button
                        type="button"
                        onClick={() =>
                          void handleStartConversation(request.user._id)
                        }
                        disabled={operationId !== null}
                        aria-label={`Message ${request.user.name}`}
                        title="Message"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--chat-accent-soft)] text-[var(--chat-accent)] transition hover:brightness-95 disabled:opacity-50"
                      >
                        {operationId === `message:${request.user._id}` ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleAcceptRequest(request)}
                        disabled={operationId !== null}
                        aria-label={`Accept ${request.user.name}`}
                        title="Accept"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white disabled:opacity-50"
                      >
                        {operationId === `accept:${request.friendshipId}` ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDeclineRequest(request)}
                        disabled={operationId !== null}
                        aria-label={`Decline ${request.user.name}`}
                        title="Decline"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </section>
              )}

              {outgoingRequests.length > 0 && (
                <section>
                  <p className="border-b border-[var(--chat-border)] bg-[var(--chat-app)] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[var(--chat-muted)]">
                    Sent
                  </p>

                  {outgoingRequests.map((request) => (
                    <div
                      key={request.friendshipId}
                      className="flex items-center gap-3 border-b border-[var(--chat-border)] px-4 py-3"
                    >
                      {renderUserDetails(request.user)}

                      <button
                        type="button"
                        onClick={() =>
                          void handleStartConversation(request.user._id)
                        }
                        disabled={operationId !== null}
                        aria-label={`Message ${request.user.name}`}
                        title="Message"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--chat-accent-soft)] text-[var(--chat-accent)] transition hover:brightness-95 disabled:opacity-50"
                      >
                        {operationId === `message:${request.user._id}` ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleCancelRequest(request)}
                        disabled={operationId !== null}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </section>
              )}
            </div>
          )}
        </div>
    </section>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close Find Friends"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
      />

      {content}
    </div>
  );
}
