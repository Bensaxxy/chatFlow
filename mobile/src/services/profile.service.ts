import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type { AuthUser, UpdateProfileInput } from "@/types/auth";
import type {
  ChatThemeSettings,
  NotificationSettings,
  PrivacySettings,
} from "@/types/settings";

interface UserData {
  user: AuthUser;
}

type ProfileResponse = ApiSuccessResponse<UserData>;

export interface MobileAvatarInput {
  uri: string;
  fileName: string;
  mimeType: string;
}

export const getMobileProfile = async (): Promise<AuthUser> => {
  const { data } = await apiClient.get<ProfileResponse>("/users/me");
  return data.data.user;
};

export const updateMobileProfile = async (
  input: UpdateProfileInput,
): Promise<AuthUser> => {
  const { data } = await apiClient.patch<ProfileResponse>("/users/me", input);
  return data.data.user;
};

export const updateMobileChatTheme = async (
  theme: ChatThemeSettings,
): Promise<AuthUser> => {
  const { data } = await apiClient.patch<ProfileResponse>(
    "/users/me/chat-theme",
    theme,
  );
  return data.data.user;
};

export const updateMobilePrivacySettings = async (
  settings: PrivacySettings,
): Promise<AuthUser> => {
  const { data } = await apiClient.patch<ProfileResponse>(
    "/users/me/privacy",
    settings,
  );
  return data.data.user;
};

export const updateMobileNotificationSettings = async (
  settings: NotificationSettings,
): Promise<AuthUser> => {
  const { data } = await apiClient.patch<ProfileResponse>(
    "/users/me/notifications",
    settings,
  );
  return data.data.user;
};

export const uploadMobileAvatar = async (
  avatar: MobileAvatarInput,
): Promise<AuthUser> => {
  const formData = new FormData();
  formData.append(
    "avatar",
    {
      uri: avatar.uri,
      name: avatar.fileName,
      type: avatar.mimeType,
    } as unknown as Blob,
  );

  const { data } = await apiClient.patch<ProfileResponse>(
    "/users/me/avatar",
    formData,
    {
      timeout: 120_000,
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  return data.data.user;
};

export const removeMobileAvatar = async (): Promise<AuthUser> => {
  const { data } = await apiClient.delete<ProfileResponse>("/users/me/avatar");
  return data.data.user;
};
