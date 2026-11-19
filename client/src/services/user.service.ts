import { apiClient } from "@/lib/api/client";

import type { ApiSuccessResponse } from "@/types/api";
import type {
  PublicUserProfile,
  SearchUser,
  UserMessagingStatus,
} from "@/types/user";

interface SearchUsersData {
  users: SearchUser[];
}

type SearchUsersResponse = ApiSuccessResponse<SearchUsersData>;

export const searchUsers = async (
  query: string,
  signal?: AbortSignal,
): Promise<SearchUser[]> => {
  const { data } = await apiClient.get<SearchUsersResponse>("/users/search", {
    params: {
      q: query,
      limit: 10,
    },
    signal,
  });

  return data.data.users;
};

interface PublicProfileData {
  user: PublicUserProfile;
}

type PublicProfileResponse = ApiSuccessResponse<PublicProfileData>;

interface BlockUserData {
  blockStatus: UserMessagingStatus;
}

type BlockUserResponse = ApiSuccessResponse<BlockUserData>;

export const getPublicUserProfile = async (
  userId: string,
  signal?: AbortSignal,
): Promise<PublicUserProfile> => {
  const { data } = await apiClient.get<PublicProfileResponse>(
    `/users/${userId}/profile`,
    {
      signal,
    },
  );

  return data.data.user;
};

export const blockUser = async (
  userId: string,
): Promise<UserMessagingStatus> => {
  const { data } = await apiClient.put<BlockUserResponse>(
    "/users/" + userId + "/block",
  );

  return data.data.blockStatus;
};

export const unblockUser = async (
  userId: string,
): Promise<UserMessagingStatus> => {
  const { data } = await apiClient.delete<BlockUserResponse>(
    "/users/" + userId + "/block",
  );

  return data.data.blockStatus;
};
