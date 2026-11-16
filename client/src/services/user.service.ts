import { apiClient } from "@/lib/api/client";

import type { ApiSuccessResponse } from "@/types/api";
import type { PublicUserProfile, SearchUser } from "@/types/user";

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
