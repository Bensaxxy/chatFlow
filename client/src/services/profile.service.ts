import { apiClient } from "@/lib/api/client";

import type { ApiSuccessResponse } from "@/types/api";
import type { AuthUser, AuthUserData, UpdateProfileInput } from "@/types/auth";
import type { ChatThemeSettings } from "@/types/chat-theme";
import type { PrivacySettings } from "@/types/privacy";

type ProfileResponse = ApiSuccessResponse<AuthUserData>;

export const getMyProfile = async (): Promise<AuthUser> => {
  const { data } = await apiClient.get<ProfileResponse>("/users/me");

  return data.data.user;
};

export const updateMyProfile = async (
  input: UpdateProfileInput,
): Promise<AuthUser> => {
  const { data } = await apiClient.patch<ProfileResponse>("/users/me", input);

  return data.data.user;
};

export const updateMyChatTheme = async (
  theme: ChatThemeSettings,
): Promise<AuthUser> => {
  const { data } = await apiClient.patch<ProfileResponse>(
    "/users/me/chat-theme",
    theme,
  );

  return data.data.user;
};

export const updateMyPrivacySettings = async (
  privacySettings: PrivacySettings,
): Promise<AuthUser> => {
  const { data } = await apiClient.patch<ProfileResponse>(
    "/users/me/privacy",
    privacySettings,
  );

  return data.data.user;
};

export const uploadMyAvatar = async (file: File): Promise<AuthUser> => {
  const formData = new FormData();

  formData.append("avatar", file);

  const { data } = await apiClient.patch<ProfileResponse>(
    "/users/me/avatar",
    formData,
  );

  return data.data.user;
};

export const removeMyAvatar = async (): Promise<AuthUser> => {
  const { data } = await apiClient.delete<ProfileResponse>("/users/me/avatar");

  return data.data.user;
};
