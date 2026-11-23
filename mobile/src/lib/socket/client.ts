import { io, type Socket } from "socket.io-client";

import { apiClient } from "@/lib/api/client";
import { API_URL } from "@/lib/api/config";
import type { ApiSuccessResponse } from "@/types/api";
import type { ChatMessage } from "@/types/message";

interface SocketResult {
  success: boolean;
  message: string;
}

interface ServerToClientEvents {
  "socket:ready": (payload: { userId: string }) => void;
  "message:new": (payload: { message: ChatMessage }) => void;
  "conversation:updated": (payload: {
    conversationId: string;
    message: ChatMessage;
    updatedAt: string;
    incrementUnread: boolean;
  }) => void;
  "message:updated": (payload: {
    conversationId: string;
    message: ChatMessage;
  }) => void;
  "message:deleted": (payload: {
    conversationId: string;
    messageId: string;
    deletedByUserId: string;
    scope: "me" | "everyone";
    deletedForEveryoneAt: string | null;
  }) => void;
  "typing:update": (payload: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  }) => void;
}

interface ClientToServerEvents {
  "conversation:join": (
    conversationId: string,
    acknowledge: (result: SocketResult) => void,
  ) => void;
  "conversation:leave": (conversationId: string) => void;
  "typing:start": (conversationId: string) => void;
  "typing:stop": (conversationId: string) => void;
}

interface SocketTokenData {
  token: string;
}

export type MobileChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const socketUrl = API_URL.replace(/\/api$/, "");

const loadSocketAuthentication = (
  callback: (auth: Record<string, string>) => void,
): void => {
  void apiClient
    .post<ApiSuccessResponse<SocketTokenData>>("/auth/socket-token")
    .then(({ data }) => callback({ token: data.data.token }))
    .catch(() => callback({}));
};

export const mobileChatSocket: MobileChatSocket = io(socketUrl, {
  autoConnect: false,
  auth: loadSocketAuthentication,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1_000,
  reconnectionDelayMax: 5_000,
});
