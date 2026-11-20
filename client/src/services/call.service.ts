import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";

interface CallIceServersData {
  iceServers: RTCIceServer[];
  hasTurnServer: boolean;
}

type CallIceServersResponse = ApiSuccessResponse<CallIceServersData>;

export const getCallIceServers = async (): Promise<CallIceServersData> => {
  const { data } = await apiClient.get<CallIceServersResponse>(
    "/calls/ice-servers",
  );

  return data.data;
};
