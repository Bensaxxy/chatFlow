import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type { SearchUser } from "@/types/conversation";
import type { PublicUserProfile, UserMessagingStatus } from "@/types/user";

interface UserSearchData {
  users: SearchUser[];
}

interface PublicProfileData {
  user: PublicUserProfile;
}

interface BlockStatusData {
  blockStatus: UserMessagingStatus;
}

export const searchMobileUsers = async (query: string): Promise<SearchUser[]> => {
  const { data } = await apiClient.get<ApiSuccessResponse<UserSearchData>>(
    "/users/search",
    { params: { q: query.trim(), limit: 20 } },
  );

  return data.data.users;
};

export const getMobilePublicProfile = async (
  userId: string,
): Promise<PublicUserProfile> => {
  const { data } = await apiClient.get<ApiSuccessResponse<PublicProfileData>>(
    `/users/${userId}/profile`,
  );
  return data.data.user;
};

export const blockMobileUser = async (
  userId: string,
): Promise<UserMessagingStatus> => {
  const { data } = await apiClient.put<ApiSuccessResponse<BlockStatusData>>(
    `/users/${userId}/block`,
  );
  return data.data.blockStatus;
};

export const unblockMobileUser = async (
  userId: string,
): Promise<UserMessagingStatus> => {
  const { data } = await apiClient.delete<ApiSuccessResponse<BlockStatusData>>(
    `/users/${userId}/block`,
  );
  return data.data.blockStatus;
};
