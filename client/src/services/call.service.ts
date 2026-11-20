import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";
import type { CallHistoryEntry } from "@/types/call";

interface CallIceServersData {
  iceServers: RTCIceServer[];
  hasTurnServer: boolean;
}

type CallIceServersResponse = ApiSuccessResponse<CallIceServersData>;
type CallHistoryResponse = ApiSuccessResponse<{ calls: CallHistoryEntry[] }>;

export const getCallIceServers = async (): Promise<CallIceServersData> => {
  const { data } = await apiClient.get<CallIceServersResponse>(
    "/calls/ice-servers",
  );

  return data.data;
};

export const getConversationCallHistory = async (
  conversationId: string,
): Promise<CallHistoryEntry[]> => {
  const { data } = await apiClient.get<CallHistoryResponse>("/calls/history", {
    params: { conversationId },
  });

  return data.data.calls;
};
