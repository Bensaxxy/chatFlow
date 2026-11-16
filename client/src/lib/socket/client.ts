import { io, type Socket } from "socket.io-client";

import type { ChatMessage, MessageDeletedPayload } from "@/types/message";

export interface SocketResult {
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

  "conversation:read": (payload: {
    conversationId: string;
    userId: string;
    readAt: string;
  }) => void;

  "typing:update": (payload: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  }) => void;

  "presence:snapshot": (payload: { onlineUserIds: string[] }) => void;

  "presence:update": (payload: {
    userId: string;
    isOnline: boolean;
    lastSeenAt: string | null;
  }) => void;

  "message:updated": (payload: {
    conversationId: string;
    message: ChatMessage;
  }) => void;

  "message:deleted": (payload: MessageDeletedPayload) => void;
}

interface ClientToServerEvents {
  "conversation:join": (
    conversationId: string,
    acknowledge: (result: SocketResult) => void,
  ) => void;

  "conversation:leave": (
    conversationId: string,
    acknowledge?: (result: SocketResult) => void,
  ) => void;

  "typing:start": (conversationId: string) => void;

  "typing:stop": (conversationId: string) => void;
}

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

if (!socketUrl) {
  throw new Error("NEXT_PUBLIC_SOCKET_URL is missing from .env.local");
}

export const chatSocket: ChatSocket = io(socketUrl, {
  autoConnect: false,
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
