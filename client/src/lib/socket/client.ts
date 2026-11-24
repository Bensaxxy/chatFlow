import { io, type Socket } from "socket.io-client";

import { apiClient } from "@/lib/api/client";
import type { ChatMessage, MessageDeletedPayload } from "@/types/message";
import type { ApiSuccessResponse } from "@/types/api";
import { UserProfileUpdatedPayload } from "@/types/user";
import type {
  AudioCallEndReason,
  IncomingAudioCallPayload,
  WebRtcIceCandidatePayload,
  WebRtcSessionDescriptionPayload,
} from "@/types/call";
import { StatusDeletedPayload, StatusNewPayload, StatusReactionPayload, StatusViewedPayload } from "@/types/status";

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

  "conversation:preferences-updated": (payload: {
    conversationId: string;
    isPinned: boolean;
    isMarkedUnread: boolean;
    clearedAt: string | null;
    mutedUntil: string | null;
    isMuted: boolean;
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

  "user:profile-updated": (payload: UserProfileUpdatedPayload) => void;

  "call:incoming": (payload: IncomingAudioCallPayload) => void;

  "call:accepted": (payload: {
    callId: string;
    conversationId: string;
    acceptedByUserId: string;
    acceptedBySocketId: string;
    answer: WebRtcSessionDescriptionPayload;
  }) => void;

  "call:ice-candidate": (payload: {
    callId: string;
    conversationId: string;
    candidate: WebRtcIceCandidatePayload;
  }) => void;

  "call:renegotiate-offer": (payload: {
    callId: string;
    conversationId: string;
    offer: WebRtcSessionDescriptionPayload;
  }) => void;

  "call:renegotiate-answer": (payload: {
    callId: string;
    conversationId: string;
    answer: WebRtcSessionDescriptionPayload;
  }) => void;

  "call:ended": (payload: {
    callId: string;
    conversationId: string;
    endedByUserId: string | null;
    reason: AudioCallEndReason;
  }) => void;

  "status:new": (payload: StatusNewPayload) => void;

  "status:viewed": (payload: StatusViewedPayload) => void;

  "status:reaction": (payload: StatusReactionPayload) => void;

  "status:deleted": (payload: StatusDeletedPayload) => void;
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

  "call:initiate": (
    payload: {
      callId: string;
      conversationId: string;
      offer: WebRtcSessionDescriptionPayload;
    },
    acknowledge: (result: SocketResult) => void,
  ) => void;

  "call:answer": (
    payload: {
      callId: string;
      conversationId: string;
      answer: WebRtcSessionDescriptionPayload;
    },
    acknowledge: (result: SocketResult) => void,
  ) => void;

  "call:ice-candidate": (payload: {
    callId: string;
    conversationId: string;
    candidate: WebRtcIceCandidatePayload;
  }) => void;

  "call:renegotiate-offer": (payload: {
    callId: string;
    conversationId: string;
    offer: WebRtcSessionDescriptionPayload;
  }) => void;

  "call:renegotiate-answer": (payload: {
    callId: string;
    conversationId: string;
    answer: WebRtcSessionDescriptionPayload;
  }) => void;

  "call:end": (
    payload: {
      callId: string;
      conversationId: string;
      reason?: AudioCallEndReason;
    },
    acknowledge?: (result: SocketResult) => void,
  ) => void;

  "call:resume": (
    payload: {
      callId: string;
      conversationId: string;
    },
    acknowledge: (result: SocketResult) => void,
  ) => void;
}

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

if (!socketUrl) {
  throw new Error("NEXT_PUBLIC_SOCKET_URL is missing from .env.local");
}

interface SocketTokenData {
  token: string;
}

const loadSocketAuthentication = (
  callback: (auth: Record<string, string>) => void,
): void => {
  void apiClient
    .post<ApiSuccessResponse<SocketTokenData>>("/auth/socket-token")
    .then(({ data }) => {
      callback({ token: data.data.token });
    })
    .catch(() => {
      callback({});
    });
};

export const chatSocket: ChatSocket = io(socketUrl, {
  autoConnect: false,
  withCredentials: true,
  auth: loadSocketAuthentication,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
