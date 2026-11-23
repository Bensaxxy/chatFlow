import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type { CallHistoryEntry, IceServer } from "@/types/call";

interface IceServerData {
  iceServers: IceServer[];
  hasTurnServer: boolean;
}

export const getMobileCallIceServers = async (): Promise<IceServerData> => {
  const { data } = await apiClient.get<ApiSuccessResponse<IceServerData>>(
    "/calls/ice-servers",
  );
  return data.data;
};

export const getMobileCallHistory = async (
  conversationId: string,
): Promise<CallHistoryEntry[]> => {
  const { data } = await apiClient.get<
    ApiSuccessResponse<{ calls: CallHistoryEntry[] }>
  >("/calls/history", { params: { conversationId } });
  return data.data.calls;
};
