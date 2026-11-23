"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  createPhotoStatus as createPhotoStatusRequest,
  createTextStatus as createTextStatusRequest,
  deleteStatus as deleteStatusRequest,
  getStatusById,
  getStatuses,
  markStatusAsViewed,
  updateStatusReaction,
} from "@/services/status.service";
import type {
  ChatStatus,
  CreatePhotoStatusInput,
  CreateTextStatusInput,
  StatusDeletedPayload,
  StatusGroup,
  StatusNewPayload,
  StatusReactionEmoji,
  StatusReactionPayload,
  StatusViewedPayload,
} from "@/types/status";

interface StatusContextValue {
  statuses: ChatStatus[];
  statusGroups: StatusGroup[];
  isLoadingStatuses: boolean;
  statusErrorMessage: string | null;

  refreshStatuses: () => Promise<void>;

  createTextStatus: (input: CreateTextStatusInput) => Promise<ChatStatus>;

  createPhotoStatus: (input: CreatePhotoStatusInput) => Promise<ChatStatus>;

  viewStatus: (statusId: string) => Promise<ChatStatus>;

  reactToStatus: (
    statusId: string,
    emoji: StatusReactionEmoji | null,
  ) => Promise<ChatStatus>;

  removeStatus: (statusId: string) => Promise<void>;
}

const StatusContext = createContext<StatusContextValue | undefined>(undefined);

interface StatusProviderProps {
  children: ReactNode;
}

const statusIsActive = (status: ChatStatus): boolean =>
  new Date(status.expiresAt).getTime() > Date.now();

const sortStatuses = (statuses: ChatStatus[]): ChatStatus[] =>
  [...statuses].sort(
    (firstStatus, secondStatus) =>
      new Date(firstStatus.createdAt).getTime() -
      new Date(secondStatus.createdAt).getTime(),
  );

export function StatusProvider({ children }: StatusProviderProps) {
  const { user, isAuthenticated, isAuthLoading } = useAuth();

  const { socket } = useSocket();

  const [statuses, setStatuses] = useState<ChatStatus[]>([]);

  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);

  const [statusErrorMessage, setStatusErrorMessage] = useState<string | null>(
    null,
  );

  const upsertStatus = useCallback((status: ChatStatus): void => {
    if (!statusIsActive(status)) {
      setStatuses((currentStatuses) =>
        currentStatuses.filter(
          (currentStatus) => currentStatus._id !== status._id,
        ),
      );

      return;
    }

    setStatuses((currentStatuses) => {
      const existingStatusIndex = currentStatuses.findIndex(
        (currentStatus) => currentStatus._id === status._id,
      );

      if (existingStatusIndex === -1) {
        return sortStatuses([...currentStatuses, status]);
      }

      const nextStatuses = [...currentStatuses];

      nextStatuses[existingStatusIndex] = status;

      return sortStatuses(nextStatuses);
    });
  }, []);

  const loadStatuses = useCallback(
    async (signal?: AbortSignal, showLoading = true): Promise<void> => {
      if (!isAuthenticated) {
        setStatuses([]);
        setStatusErrorMessage(null);
        return;
      }

      if (showLoading) {
        setIsLoadingStatuses(true);
      }

      setStatusErrorMessage(null);

      try {
        const loadedStatuses = await getStatuses(signal);

        if (signal?.aborted) {
          return;
        }

        setStatuses(sortStatuses(loadedStatuses.filter(statusIsActive)));
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        setStatusErrorMessage(getApiErrorMessage(error));
      } finally {
        if (!signal?.aborted && showLoading) {
          setIsLoadingStatuses(false);
        }
      }
    },
    [isAuthenticated],
  );

  const refreshStatuses = useCallback(async (): Promise<void> => {
    await loadStatuses(undefined, true);
  }, [loadStatuses]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      setStatuses([]);
      setStatusErrorMessage(null);
      setIsLoadingStatuses(false);
      return;
    }

    const controller = new AbortController();

    void loadStatuses(controller.signal, true);

    return () => {
      controller.abort();
    };
  }, [isAuthLoading, isAuthenticated, loadStatuses]);

  /**
   * Schedule a local removal for the closest expiry time. The API also
   * filters expired statuses, while the backend cleanup removes storage.
   */
  useEffect(() => {
    if (statuses.length === 0) {
      return;
    }

    const now = Date.now();

    const closestExpiryTime = Math.min(
      ...statuses.map((status) => new Date(status.expiresAt).getTime()),
    );

    const delay = Math.max(0, closestExpiryTime - now + 100);

    const maximumTimeout = 2_147_483_647;

    const timeoutId = window.setTimeout(
      () => {
        setStatuses((currentStatuses) =>
          currentStatuses.filter(statusIsActive),
        );
      },
      Math.min(delay, maximumTimeout),
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [statuses]);

  const hydrateStatusSilently = useCallback(
    async (statusId: string): Promise<void> => {
      try {
        const status = await getStatusById(statusId);

        upsertStatus(status);
      } catch {
        /**
         * The status may have expired, been deleted, or become unavailable
         * because its audience changed.
         */
        setStatuses((currentStatuses) =>
          currentStatuses.filter((status) => status._id !== statusId),
        );
      }
    },
    [upsertStatus],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleStatusNew = (payload: StatusNewPayload): void => {
      void hydrateStatusSilently(payload.statusId);
    };

    const handleStatusViewed = (payload: StatusViewedPayload): void => {
      setStatuses((currentStatuses) =>
        currentStatuses.map((status) => {
          if (
            status._id !== payload.statusId ||
            status.author._id !== user?._id
          ) {
            return status;
          }

          return {
            ...status,
            viewCount: status.viewCount + 1,
          };
        }),
      );
    };

    const handleStatusReaction = (payload: StatusReactionPayload): void => {
      void hydrateStatusSilently(payload.statusId);
    };

    const handleStatusDeleted = (payload: StatusDeletedPayload): void => {
      setStatuses((currentStatuses) =>
        currentStatuses.filter((status) => status._id !== payload.statusId),
      );
    };

    socket.on("status:new", handleStatusNew);

    socket.on("status:viewed", handleStatusViewed);

    socket.on("status:reaction", handleStatusReaction);

    socket.on("status:deleted", handleStatusDeleted);

    return () => {
      socket.off("status:new", handleStatusNew);

      socket.off("status:viewed", handleStatusViewed);

      socket.off("status:reaction", handleStatusReaction);

      socket.off("status:deleted", handleStatusDeleted);
    };
  }, [socket, isAuthenticated, user?._id, hydrateStatusSilently]);

  const createTextStatus = useCallback(
    async (input: CreateTextStatusInput): Promise<ChatStatus> => {
      const status = await createTextStatusRequest(input);

      upsertStatus(status);

      return status;
    },
    [upsertStatus],
  );

  const createPhotoStatus = useCallback(
    async (input: CreatePhotoStatusInput): Promise<ChatStatus> => {
      const status = await createPhotoStatusRequest(input);

      upsertStatus(status);

      return status;
    },
    [upsertStatus],
  );

  const viewStatus = useCallback(
    async (statusId: string): Promise<ChatStatus> => {
      const status = await markStatusAsViewed(statusId);

      upsertStatus(status);

      return status;
    },
    [upsertStatus],
  );

  const reactToStatus = useCallback(
    async (
      statusId: string,
      emoji: StatusReactionEmoji | null,
    ): Promise<ChatStatus> => {
      const status = await updateStatusReaction(statusId, emoji);

      upsertStatus(status);

      return status;
    },
    [upsertStatus],
  );

  const removeStatus = useCallback(async (statusId: string): Promise<void> => {
    await deleteStatusRequest(statusId);

    setStatuses((currentStatuses) =>
      currentStatuses.filter((status) => status._id !== statusId),
    );
  }, []);

  const statusGroups = useMemo<StatusGroup[]>(() => {
    const groupsByAuthor = new Map<string, ChatStatus[]>();

    for (const status of statuses) {
      const existingStatuses = groupsByAuthor.get(status.author._id) ?? [];

      existingStatuses.push(status);

      groupsByAuthor.set(status.author._id, existingStatuses);
    }

    const groups: StatusGroup[] = [];

    for (const [authorId, authorStatuses] of groupsByAuthor) {
      const sortedAuthorStatuses = sortStatuses(authorStatuses);

      const latestStatus =
        sortedAuthorStatuses[sortedAuthorStatuses.length - 1];

      if (!latestStatus) {
        continue;
      }

      const isCurrentUser = authorId === user?._id;

      groups.push({
        author: latestStatus.author,
        statuses: sortedAuthorStatuses,

        hasUnviewedStatuses:
          !isCurrentUser &&
          sortedAuthorStatuses.some((status) => !status.viewerHasViewed),

        latestStatusCreatedAt: latestStatus.createdAt,

        isCurrentUser,
      });
    }

    return groups.sort((firstGroup, secondGroup) => {
      if (firstGroup.isCurrentUser && !secondGroup.isCurrentUser) {
        return -1;
      }

      if (!firstGroup.isCurrentUser && secondGroup.isCurrentUser) {
        return 1;
      }

      return (
        new Date(secondGroup.latestStatusCreatedAt).getTime() -
        new Date(firstGroup.latestStatusCreatedAt).getTime()
      );
    });
  }, [statuses, user?._id]);

  const value = useMemo<StatusContextValue>(
    () => ({
      statuses,
      statusGroups,
      isLoadingStatuses,
      statusErrorMessage,
      refreshStatuses,
      createTextStatus,
      createPhotoStatus,
      viewStatus,
      reactToStatus,
      removeStatus,
    }),
    [
      statuses,
      statusGroups,
      isLoadingStatuses,
      statusErrorMessage,
      refreshStatuses,
      createTextStatus,
      createPhotoStatus,
      viewStatus,
      reactToStatus,
      removeStatus,
    ],
  );

  return (
    <StatusContext.Provider value={value}>{children}</StatusContext.Provider>
  );
}

export const useStatuses = (): StatusContextValue => {
  const context = useContext(StatusContext);

  if (!context) {
    throw new Error("useStatuses must be used inside StatusProvider");
  }

  return context;
};
