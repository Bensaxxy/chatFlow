import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  FriendRequestDirection,
  FriendRequestsPage,
  FriendsPage,
  FriendSuggestionsPage,
  FriendshipView,
} from "@/types/friend";

type FriendSuggestionsResponse = ApiSuccessResponse<FriendSuggestionsPage>;

type FriendsResponse = ApiSuccessResponse<FriendsPage>;

type FriendRequestsResponse = ApiSuccessResponse<FriendRequestsPage>;

interface FriendshipData {
  friendship: FriendshipView;
}

type FriendshipResponse = ApiSuccessResponse<FriendshipData>;

interface FriendPageOptions {
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
}

export const getFriendSuggestions = async ({
  cursor,
  limit = 20,
  signal,
}: FriendPageOptions = {}): Promise<FriendSuggestionsPage> => {
  const { data } = await apiClient.get<FriendSuggestionsResponse>(
    "/friends/discover",
    {
      params: {
        limit,
        ...(cursor
          ? {
              cursor,
            }
          : {}),
      },
      signal,
    },
  );

  return data.data;
};

export const getFriends = async ({
  cursor,
  limit = 20,
  signal,
}: FriendPageOptions = {}): Promise<FriendsPage> => {
  const { data } = await apiClient.get<FriendsResponse>("/friends", {
    params: {
      limit,
      ...(cursor
        ? {
            cursor,
          }
        : {}),
    },
    signal,
  });

  return data.data;
};

interface FriendRequestPageOptions extends FriendPageOptions {
  direction: FriendRequestDirection;
}

export const getFriendRequests = async ({
  direction,
  cursor,
  limit = 20,
  signal,
}: FriendRequestPageOptions): Promise<FriendRequestsPage> => {
  const { data } = await apiClient.get<FriendRequestsResponse>(
    "/friends/requests",
    {
      params: {
        direction,
        limit,
        ...(cursor
          ? {
              cursor,
            }
          : {}),
      },
      signal,
    },
  );

  return data.data;
};

export const sendFriendRequest = async (
  userId: string,
): Promise<FriendshipView> => {
  const { data } = await apiClient.post<FriendshipResponse>(
    `/friends/requests/${userId}`,
  );

  return data.data.friendship;
};

export const acceptFriendRequest = async (
  friendshipId: string,
): Promise<FriendshipView> => {
  const { data } = await apiClient.patch<FriendshipResponse>(
    `/friends/requests/${friendshipId}/accept`,
  );

  return data.data.friendship;
};

export const declineFriendRequest = async (
  friendshipId: string,
): Promise<void> => {
  await apiClient.delete(`/friends/requests/${friendshipId}/decline`);
};

export const cancelFriendRequest = async (
  friendshipId: string,
): Promise<void> => {
  await apiClient.delete(`/friends/requests/${friendshipId}/cancel`);
};

export const removeFriend = async (friendshipId: string): Promise<void> => {
  await apiClient.delete(`/friends/${friendshipId}`);
};
