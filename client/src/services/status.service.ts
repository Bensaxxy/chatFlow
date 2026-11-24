import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  ChatStatus,
  CreatePhotoStatusInput,
  CreateTextStatusInput,
  StatusReactionEmoji,
  StatusViewer,
} from "@/types/status";

interface StatusData {
  status: ChatStatus;
}

interface StatusesData {
  statuses: ChatStatus[];
}

interface StatusViewersData {
  viewers: StatusViewer[];
}

type StatusResponse = ApiSuccessResponse<StatusData>;

type StatusesResponse = ApiSuccessResponse<StatusesData>;

type StatusViewersResponse = ApiSuccessResponse<StatusViewersData>;

export const getStatuses = async (
  signal?: AbortSignal,
): Promise<ChatStatus[]> => {
  const { data } = await apiClient.get<StatusesResponse>("/statuses", {
    signal,
  });

  return data.data.statuses;
};

export const getStatusById = async (
  statusId: string,
  signal?: AbortSignal,
): Promise<ChatStatus> => {
  const { data } = await apiClient.get<StatusResponse>(
    `/statuses/${statusId}`,
    {
      signal,
    },
  );

  return data.data.status;
};

export const createTextStatus = async (
  input: CreateTextStatusInput,
): Promise<ChatStatus> => {
  const { data } = await apiClient.post<StatusResponse>(
    "/statuses/text",
    input,
  );

  return data.data.status;
};

export const createPhotoStatus = async (
  input: CreatePhotoStatusInput,
): Promise<ChatStatus> => {
  const formData = new FormData();

  formData.append("photo", input.photo);
  formData.append("caption", input.caption ?? "");
  formData.append("audience", input.audience);

  formData.append("selectedUserIds", JSON.stringify(input.selectedUserIds));

  formData.append("excludedUserIds", JSON.stringify(input.excludedUserIds));

  /**
   * Do not manually set Content-Type. Axios will include the required
   * multipart boundary automatically.
   */
  const { data } = await apiClient.post<StatusResponse>(
    "/statuses/photo",
    formData,
  );

  return data.data.status;
};

export const markStatusAsViewed = async (
  statusId: string,
): Promise<ChatStatus> => {
  const { data } = await apiClient.post<StatusResponse>(
    `/statuses/${statusId}/view`,
  );

  return data.data.status;
};

export const updateStatusReaction = async (
  statusId: string,
  emoji: StatusReactionEmoji | null,
): Promise<ChatStatus> => {
  const { data } = await apiClient.patch<StatusResponse>(
    `/statuses/${statusId}/reaction`,
    {
      emoji,
    },
  );

  return data.data.status;
};

export const getStatusViewers = async (
  statusId: string,
  signal?: AbortSignal,
): Promise<StatusViewer[]> => {
  const { data } = await apiClient.get<StatusViewersResponse>(
    `/statuses/${statusId}/viewers`,
    {
      signal,
    },
  );

  return data.data.viewers;
};

export const deleteStatus = async (statusId: string): Promise<void> => {
  await apiClient.delete(`/statuses/${statusId}`);
};
