import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  FriendRequestDirection,
  FriendRequestsPage,
  FriendsPage,
  FriendSuggestionsPage,
  FriendshipView,
} from "@/types/friend";

interface FriendshipData {
  friendship: FriendshipView;
}

interface FriendRequestOptions {
  direction: FriendRequestDirection;
  signal?: AbortSignal;
}

export const getMobileFriendSuggestions = async (
  signal?: AbortSignal,
): Promise<FriendSuggestionsPage> => {
  const { data } = await apiClient.get<ApiSuccessResponse<FriendSuggestionsPage>>(
    "/friends/discover",
    { params: { limit: 20 }, signal },
  );

  return data.data;
};

export const getMobileFriends = async (
  signal?: AbortSignal,
): Promise<FriendsPage> => {
  const { data } = await apiClient.get<ApiSuccessResponse<FriendsPage>>(
    "/friends",
    { params: { limit: 20 }, signal },
  );

  return data.data;
};

export const getMobileFriendRequests = async ({
  direction,
  signal,
}: FriendRequestOptions): Promise<FriendRequestsPage> => {
  const { data } = await apiClient.get<ApiSuccessResponse<FriendRequestsPage>>(
    "/friends/requests",
    { params: { direction, limit: 20 }, signal },
  );

  return data.data;
};

export const sendMobileFriendRequest = async (
  userId: string,
): Promise<FriendshipView> => {
  const { data } = await apiClient.post<ApiSuccessResponse<FriendshipData>>(
    `/friends/requests/${userId}`,
  );

  return data.data.friendship;
};

export const acceptMobileFriendRequest = async (
  friendshipId: string,
): Promise<FriendshipView> => {
  const { data } = await apiClient.patch<ApiSuccessResponse<FriendshipData>>(
    `/friends/requests/${friendshipId}/accept`,
  );

  return data.data.friendship;
};

export const declineMobileFriendRequest = async (
  friendshipId: string,
): Promise<void> => {
  await apiClient.delete(`/friends/requests/${friendshipId}/decline`);
};

export const cancelMobileFriendRequest = async (
  friendshipId: string,
): Promise<void> => {
  await apiClient.delete(`/friends/requests/${friendshipId}/cancel`);
};

export const removeMobileFriend = async (friendshipId: string): Promise<void> => {
  await apiClient.delete(`/friends/${friendshipId}`);
};
