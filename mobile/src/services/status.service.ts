import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type { ChatStatus, StatusBackground, StatusReactionEmoji } from "@/types/status";

interface StatusData {
  status: ChatStatus;
}

interface StatusesData {
  statuses: ChatStatus[];
}

interface CreateTextStatusInput {
  text: string;
  backgroundColor: StatusBackground;
}

interface CreatePhotoStatusInput {
  uri: string;
  fileName: string;
  mimeType: string;
  caption: string;
}

export const getMobileStatuses = async (): Promise<ChatStatus[]> => {
  const { data } = await apiClient.get<ApiSuccessResponse<StatusesData>>(
    "/statuses",
  );

  return data.data.statuses;
};

export const createMobileTextStatus = async ({
  text,
  backgroundColor,
}: CreateTextStatusInput): Promise<ChatStatus> => {
  const { data } = await apiClient.post<ApiSuccessResponse<StatusData>>(
    "/statuses/text",
    {
      text,
      backgroundColor,
      textColor: backgroundColor === "amber" ? "dark" : "light",
      audience: "people_i_chat_with",
      selectedUserIds: [],
      excludedUserIds: [],
    },
  );

  return data.data.status;
};

export const createMobilePhotoStatus = async ({
  uri,
  fileName,
  mimeType,
  caption,
}: CreatePhotoStatusInput): Promise<ChatStatus> => {
  const formData = new FormData();

  formData.append(
    "photo",
    {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob,
  );
  formData.append("caption", caption);
  formData.append("audience", "people_i_chat_with");
  formData.append("selectedUserIds", "[]");
  formData.append("excludedUserIds", "[]");

  const { data } = await apiClient.post<ApiSuccessResponse<StatusData>>(
    "/statuses/photo",
    formData,
    {
      timeout: 120_000,
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  return data.data.status;
};

export const viewMobileStatus = async (statusId: string): Promise<ChatStatus> => {
  const { data } = await apiClient.post<ApiSuccessResponse<StatusData>>(
    `/statuses/${statusId}/view`,
  );

  return data.data.status;
};

export const reactToMobileStatus = async (
  statusId: string,
  emoji: StatusReactionEmoji | null,
): Promise<ChatStatus> => {
  const { data } = await apiClient.patch<ApiSuccessResponse<StatusData>>(
    `/statuses/${statusId}/reaction`,
    { emoji },
  );

  return data.data.status;
};

export const deleteMobileStatus = async (statusId: string): Promise<void> => {
  await apiClient.delete(`/statuses/${statusId}`);
};
