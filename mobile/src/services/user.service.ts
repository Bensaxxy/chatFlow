import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type { SearchUser } from "@/types/conversation";

interface UserSearchData {
  users: SearchUser[];
}

export const searchMobileUsers = async (query: string): Promise<SearchUser[]> => {
  const { data } = await apiClient.get<ApiSuccessResponse<UserSearchData>>(
    "/users/search",
    { params: { q: query.trim(), limit: 20 } },
  );

  return data.data.users;
};
