"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api/client";
import { chatSocket, type ChatSocket } from "@/lib/socket/client";
import type {
  RealtimeUserProfile,
  UserProfileUpdatedPayload,
} from "@/types/user";

interface SocketContextValue {
  socket: ChatSocket;
  isConnected: boolean;
  onlineUserIds: ReadonlySet<string>;
  lastSeenByUser: ReadonlyMap<string, string>;
  updatedProfiles: ReadonlyMap<string, RealtimeUserProfile>;

  connectSocket: () => void;
  disconnectSocket: () => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { user, isAuthenticated, isAuthLoading, refreshUser } = useAuth();

  const [isConnected, setIsConnected] = useState(chatSocket.connected);

  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [lastSeenByUser, setLastSeenByUser] = useState<Map<string, string>>(
    () => new Map(),
  );

  const [updatedProfiles, setUpdatedProfiles] = useState<
    Map<string, RealtimeUserProfile>
  >(() => new Map());

  const refreshInProgress = useRef(false);

  const currentUserId = user?._id;

  const connectSocket = useCallback((): void => {
    if (!chatSocket.connected) {
      chatSocket.connect();
    }
  }, []);

  const disconnectSocket = useCallback((): void => {
    chatSocket.disconnect();

    setIsConnected(false);
    setOnlineUserIds(new Set());
    setLastSeenByUser(new Map());
    setUpdatedProfiles(new Map());
  }, []);

  useEffect(() => {
    const handleConnect = (): void => {
      refreshInProgress.current = false;
      setIsConnected(true);
    };

    const handleDisconnect = (): void => {
      setIsConnected(false);
      setOnlineUserIds(new Set());
    };

    const handleReady = (payload: { userId: string }): void => {
      console.log(`Socket authenticated for user ${payload.userId}`);
    };

    const handlePresenceSnapshot = (payload: {
      onlineUserIds: string[];
    }): void => {
      setOnlineUserIds(new Set(payload.onlineUserIds));
    };

    const handlePresenceUpdate = (payload: {
      userId: string;
      isOnline: boolean;
      lastSeenAt: string | null;
    }): void => {
      setOnlineUserIds((currentOnlineUsers) => {
        const nextOnlineUsers = new Set(currentOnlineUsers);

        if (payload.isOnline) {
          nextOnlineUsers.add(payload.userId);
        } else {
          nextOnlineUsers.delete(payload.userId);
        }

        return nextOnlineUsers;
      });

      setLastSeenByUser((currentLastSeen) => {
        const nextLastSeen = new Map(currentLastSeen);

        if (payload.lastSeenAt) {
          nextLastSeen.set(payload.userId, payload.lastSeenAt);
        } else {
          nextLastSeen.delete(payload.userId);
        }

        return nextLastSeen;
      });
    };

    const handleProfileUpdated = (payload: UserProfileUpdatedPayload): void => {
      setUpdatedProfiles((currentProfiles) => {
        const nextProfiles = new Map(currentProfiles);

        nextProfiles.set(payload.user._id, payload.user);

        return nextProfiles;
      });

      /*
       * Keep the authenticated user synchronized
       * across their other tabs and devices.
       */
      if (payload.user._id === currentUserId) {
        void refreshUser();
      }
    };

    const handleConnectionError = async (error: Error): Promise<void> => {
      setIsConnected(false);
      setOnlineUserIds(new Set());

      const isAuthenticationError =
        error.message === "INVALID_ACCESS_TOKEN" ||
        error.message === "AUTHENTICATION_REQUIRED";

      if (!isAuthenticationError || refreshInProgress.current) {
        return;
      }

      refreshInProgress.current = true;

      try {
        await apiClient.post("/auth/refresh");

        chatSocket.connect();
      } catch {
        chatSocket.disconnect();
      } finally {
        refreshInProgress.current = false;
      }
    };

    chatSocket.on("connect", handleConnect);

    chatSocket.on("disconnect", handleDisconnect);

    chatSocket.on("socket:ready", handleReady);

    chatSocket.on("presence:snapshot", handlePresenceSnapshot);

    chatSocket.on("presence:update", handlePresenceUpdate);

    chatSocket.on("user:profile-updated", handleProfileUpdated);

    chatSocket.on("connect_error", handleConnectionError);

    if (!isAuthLoading && isAuthenticated) {
      connectSocket();
    }

    if (!isAuthLoading && !isAuthenticated) {
      disconnectSocket();
    }

    return () => {
      chatSocket.off("connect", handleConnect);

      chatSocket.off("disconnect", handleDisconnect);

      chatSocket.off("socket:ready", handleReady);

      chatSocket.off("presence:snapshot", handlePresenceSnapshot);

      chatSocket.off("presence:update", handlePresenceUpdate);

      chatSocket.off("user:profile-updated", handleProfileUpdated);

      chatSocket.off("connect_error", handleConnectionError);
    };
  }, [
    isAuthenticated,
    isAuthLoading,
    currentUserId,
    refreshUser,
    connectSocket,
    disconnectSocket,
  ]);

  const value = useMemo<SocketContextValue>(
    () => ({
      socket: chatSocket,
      isConnected,
      onlineUserIds,
      lastSeenByUser,
      updatedProfiles,
      connectSocket,
      disconnectSocket,
    }),
    [
      isConnected,
      onlineUserIds,
      lastSeenByUser,
      updatedProfiles,
      connectSocket,
      disconnectSocket,
    ],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export const useSocket = (): SocketContextValue => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used inside SocketProvider");
  }

  return context;
};
