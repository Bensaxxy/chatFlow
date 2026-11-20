import { parse } from "cookie";
import { isValidObjectId } from "mongoose";
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

import { env } from "../config/env";
import { Conversation } from "../models/conversation.model";
import {
  completeCallHistory,
  createCallHistory,
  markCallHistoryAnswered,
  type CallHistoryStatus,
} from "../services/call-history.service";
import { verifyAccessToken, verifySocketToken } from "../utils/auth-tokens";
import { User } from "../models/user.model";
import { getDirectMessagingAccess } from "../services/user.service";

interface SocketResult {
  success: boolean;
  message: string;
}

interface TypingUpdatePayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

type AudioCallEndReason =
  | "ended"
  | "cancelled"
  | "declined"
  | "missed"
  | "failed";

interface WebRtcSessionDescriptionPayload {
  type: "offer" | "answer";
  sdp: string;
}

interface WebRtcIceCandidatePayload {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment?: string | null;
}

interface ActiveAudioCall {
  callId: string;
  conversationId: string;
  callerId: string;
  callerSocketId: string;
  recipientId: string;
  recipientSocketId: string | null;
  historyId: string;
  status: "ringing" | "active";
  ringTimeout: NodeJS.Timeout;
  callerDisconnectTimeout: NodeJS.Timeout | null;
  recipientDisconnectTimeout: NodeJS.Timeout | null;
}

const isValidCallId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9-]{16,128}$/.test(value);

const isValidSessionDescription = (
  value: unknown,
  expectedType: "offer" | "answer",
): value is WebRtcSessionDescriptionPayload =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  "sdp" in value &&
  value.type === expectedType &&
  typeof value.sdp === "string" &&
  value.sdp.length > 0 &&
  value.sdp.length <= 200_000;

const isValidIceCandidate = (
  value: unknown,
): value is WebRtcIceCandidatePayload =>
  typeof value === "object" &&
  value !== null &&
  "candidate" in value &&
  "sdpMid" in value &&
  "sdpMLineIndex" in value &&
  typeof value.candidate === "string" &&
  value.candidate.length <= 8_000 &&
  (typeof value.sdpMid === "string" || value.sdpMid === null) &&
  (typeof value.sdpMLineIndex === "number" || value.sdpMLineIndex === null);

interface ServerToClientEvents {
  "socket:ready": (payload: { userId: string }) => void;

  "message:new": (payload: { message: unknown }) => void;

  "conversation:updated": (payload: {
    conversationId: string;
    message: unknown;
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
  }) => void;

  "typing:update": (payload: TypingUpdatePayload) => void;

  "presence:snapshot": (payload: { onlineUserIds: string[] }) => void;

  "presence:update": (payload: {
    userId: string;
    isOnline: boolean;
    lastSeenAt: string | null;
  }) => void;

  "message:deleted": (payload: {
    conversationId: string;
    messageId: string;
    deletedByUserId: string;
    scope: "me" | "everyone";
    deletedForEveryoneAt: string | null;
  }) => void;

  "message:updated": (payload: {
    conversationId: string;
    message: unknown;
  }) => void;

  "user:profile-updated": (payload: {
    user: {
      _id: string;
      name: string;
      avatarUrl: string | null;
      bio: string;
      updatedAt: string;
    };
  }) => void;

  "call:incoming": (payload: {
    callId: string;
    conversationId: string;
    callerId: string;
    offer: WebRtcSessionDescriptionPayload;
  }) => void;

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
    payload: { callId: string; conversationId: string },
    acknowledge: (result: SocketResult) => void,
  ) => void;
}

interface InterServerEvents {}

interface SocketData {
  userId: string;
}

export type ChatSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let socketServer: ChatSocketServer | undefined;

export const initializeSocketServer = (
  httpServer: HttpServer,
): ChatSocketServer => {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },

    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: false,
    },
  });

  /**
   * Stores how many active sockets each user has.
   * This supports multiple tabs and devices.
   */
  const connectedUserCounts = new Map<string, number>();
  const activeCalls = new Map<string, ActiveAudioCall>();
  const activeCallByUserId = new Map<string, string>();

  const getCallHistoryStatus = (
    call: ActiveAudioCall,
    reason: AudioCallEndReason,
  ): CallHistoryStatus => {
    if (reason === "missed") return "missed";
    if (reason === "declined") return "declined";
    if (reason === "failed") return "failed";
    if (call.status === "active") return "completed";
    return "cancelled";
  };

  const endActiveCall = (
    call: ActiveAudioCall,
    reason: AudioCallEndReason,
    endedByUserId: string | null,
  ): void => {
    clearTimeout(call.ringTimeout);
    if (call.callerDisconnectTimeout) {
      clearTimeout(call.callerDisconnectTimeout);
    }
    if (call.recipientDisconnectTimeout) {
      clearTimeout(call.recipientDisconnectTimeout);
    }
    activeCalls.delete(call.callId);

    void completeCallHistory(
      call.historyId,
      getCallHistoryStatus(call, reason),
      endedByUserId,
    ).catch((error) => {
      console.error("Could not complete call history:", error);
    });

    if (activeCallByUserId.get(call.callerId) === call.callId) {
      activeCallByUserId.delete(call.callerId);
    }

    if (activeCallByUserId.get(call.recipientId) === call.callId) {
      activeCallByUserId.delete(call.recipientId);
    }

    const payload = {
      callId: call.callId,
      conversationId: call.conversationId,
      endedByUserId,
      reason,
    };

    io.to(`user:${call.callerId}`).emit("call:ended", payload);
    io.to(`user:${call.recipientId}`).emit("call:ended", payload);
  };

  io.use((socket, next) => {
    try {
      const socketToken = socket.handshake.auth.token;

      if (typeof socketToken === "string" && socketToken) {
        const payload = verifySocketToken(socketToken);

        socket.data.userId = payload.userId;
        next();
        return;
      }

      const rawCookie = socket.handshake.headers.cookie;

      if (!rawCookie) {
        next(new Error("AUTHENTICATION_REQUIRED"));
        return;
      }

      const cookies = parse(rawCookie);
      const accessToken = cookies.accessToken;

      if (!accessToken) {
        next(new Error("AUTHENTICATION_REQUIRED"));
        return;
      }

      const payload = verifyAccessToken(accessToken);

      socket.data.userId = payload.userId;

      next();
    } catch {
      next(new Error("INVALID_ACCESS_TOKEN"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    const previousConnectionCount = connectedUserCounts.get(userId) ?? 0;

    connectedUserCounts.set(userId, previousConnectionCount + 1);

    const activeTypingConversations = new Set<string>();

    console.log(`Socket connected for user ${userId}: ${socket.id}`);

    /**
     * All browser tabs and devices belonging to this user
     * join the same personal room.
     */
    void socket.join(`user:${userId}`);
    /**
     * Give the newly connected browser the complete list
     * of users who are currently online.
     */
    socket.emit("presence:snapshot", {
      onlineUserIds: Array.from(connectedUserCounts.keys()),
    });

    /**
     * Only announce online status when this is the user's
     * first active socket.
     */
    if (previousConnectionCount === 0) {
      io.emit("presence:update", {
        userId,
        isOnline: true,
        lastSeenAt: null,
      });
    }

    socket.emit("socket:ready", {
      userId,
    });

    socket.on("conversation:join", async (conversationId, acknowledge) => {
      try {
        if (!isValidObjectId(conversationId)) {
          acknowledge({
            success: false,
            message: "Conversation ID is invalid",
          });

          return;
        }

        const isParticipant = await Conversation.exists({
          _id: conversationId,
          participants: userId,
        });

        if (!isParticipant) {
          acknowledge({
            success: false,
            message: "Conversation was not found",
          });

          return;
        }

        await socket.join(`conversation:${conversationId}`);

        acknowledge({
          success: true,
          message: "Conversation joined successfully",
        });
      } catch (error) {
        console.error("Could not join conversation:", error);

        acknowledge({
          success: false,
          message: "Could not join the conversation",
        });
      }
    });

    socket.on("conversation:leave", async (conversationId, acknowledge) => {
      activeTypingConversations.delete(conversationId);

      await socket.leave(`conversation:${conversationId}`);

      acknowledge?.({
        success: true,
        message: "Conversation left successfully",
      });
    });

    /**
     * Send a typing update directly to every other
     * participant's personal room.
     *
     * This avoids losing typing events because one browser
     * has not joined the conversation room yet.
     */
    const emitTypingUpdate = async (
      conversationId: string,
      isTyping: boolean,
    ): Promise<void> => {
      if (!isValidObjectId(conversationId)) {
        return;
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      })
        .select("type participants")
        .lean();

      if (!conversation) {
        return;
      }

      if (conversation.type === "direct") {
        const otherParticipantId = conversation.participants
          .map((participantId) => participantId.toString())
          .find((participantId) => participantId !== userId);

        if (!otherParticipantId) {
          return;
        }

        const access = await getDirectMessagingAccess(
          userId,
          otherParticipantId,
        );

        if (!access.canMessage) {
          return;
        }
      }

      const payload: TypingUpdatePayload = {
        conversationId,
        userId,
        isTyping,
      };

      for (const participant of conversation.participants) {
        const participantId = participant.toString();

        if (participantId === userId) {
          continue;
        }

        io.to(`user:${participantId}`).emit("typing:update", payload);
      }
    };

    socket.on("typing:start", (conversationId) => {
      activeTypingConversations.add(conversationId);

      void emitTypingUpdate(conversationId, true).catch((error) => {
        console.error("Could not send typing:start:", error);
      });
    });

    socket.on("typing:stop", (conversationId) => {
      activeTypingConversations.delete(conversationId);

      void emitTypingUpdate(conversationId, false).catch((error) => {
        console.error("Could not send typing:stop:", error);
      });
    });

    socket.on("call:initiate", async (payload, acknowledge) => {
      try {
        if (
          !isValidCallId(payload.callId) ||
          !isValidObjectId(payload.conversationId) ||
          !isValidSessionDescription(payload.offer, "offer")
        ) {
          acknowledge({
            success: false,
            message: "Call details are invalid",
          });
          return;
        }

        if (
          activeCalls.has(payload.callId) ||
          activeCallByUserId.has(userId)
        ) {
          acknowledge({
            success: false,
            message: "You already have an active call",
          });
          return;
        }

        const conversation = await Conversation.findOne({
          _id: payload.conversationId,
          type: "direct",
          participants: userId,
        })
          .select("participants type")
          .lean();

        if (!conversation || conversation.participants.length !== 2) {
          acknowledge({
            success: false,
            message: "Audio calls are only available in direct conversations",
          });
          return;
        }

        const recipientId = conversation.participants
          .map((participantId) => participantId.toString())
          .find((participantId) => participantId !== userId);

        if (!recipientId) {
          acknowledge({
            success: false,
            message: "The other participant could not be found",
          });
          return;
        }

        if (activeCallByUserId.has(recipientId)) {
          acknowledge({
            success: false,
            message: "This person is already on a call",
          });
          return;
        }

        const access = await getDirectMessagingAccess(userId, recipientId);

        if (!access.canMessage) {
          acknowledge({
            success: false,
            message: "Audio calling is unavailable in this conversation",
          });
          return;
        }

        const historyId = await createCallHistory(
          payload.conversationId,
          userId,
          recipientId,
        );

        const recipientSockets = await io
          .in(`user:${recipientId}`)
          .fetchSockets();

        if (recipientSockets.length === 0) {
          await completeCallHistory(historyId, "missed", null);
          acknowledge({
            success: false,
            message: "This person is not available for a call right now",
          });
          return;
        }

        const ringTimeout = setTimeout(() => {
          const activeCall = activeCalls.get(payload.callId);

          if (activeCall) {
            endActiveCall(activeCall, "missed", null);
          }
        }, 45_000);

        const call: ActiveAudioCall = {
          callId: payload.callId,
          conversationId: payload.conversationId,
          callerId: userId,
          callerSocketId: socket.id,
          recipientId,
          recipientSocketId: null,
          historyId,
          status: "ringing",
          ringTimeout,
          callerDisconnectTimeout: null,
          recipientDisconnectTimeout: null,
        };

        activeCalls.set(call.callId, call);
        activeCallByUserId.set(call.callerId, call.callId);
        activeCallByUserId.set(call.recipientId, call.callId);

        io.to(`user:${recipientId}`).emit("call:incoming", {
          callId: call.callId,
          conversationId: call.conversationId,
          callerId: call.callerId,
          offer: payload.offer,
        });

        acknowledge({
          success: true,
          message: "Call is ringing",
        });
      } catch (error) {
        console.error("Could not initiate call:", error);
        acknowledge({
          success: false,
          message: "Could not start the call",
        });
      }
    });

    socket.on("call:answer", (payload, acknowledge) => {
      if (
        !isValidCallId(payload.callId) ||
        !isValidObjectId(payload.conversationId) ||
        !isValidSessionDescription(payload.answer, "answer")
      ) {
        acknowledge({
          success: false,
          message: "Call details are invalid",
        });
        return;
      }

      const call = activeCalls.get(payload.callId);

      if (
        !call ||
        call.conversationId !== payload.conversationId ||
        call.recipientId !== userId
      ) {
        acknowledge({
          success: false,
          message: "This call is no longer available",
        });
        return;
      }

      if (call.status !== "ringing") {
        acknowledge({
          success: false,
          message: "This call has already been answered",
        });
        return;
      }

      clearTimeout(call.ringTimeout);
      call.status = "active";
      call.recipientSocketId = socket.id;
      void markCallHistoryAnswered(call.historyId).catch((error) => {
        console.error("Could not mark call history as answered:", error);
      });

      const acceptedPayload = {
        callId: call.callId,
        conversationId: call.conversationId,
        acceptedByUserId: userId,
        acceptedBySocketId: socket.id,
        answer: payload.answer,
      };

      io.to(`user:${call.callerId}`).emit("call:accepted", acceptedPayload);
      io.to(`user:${call.recipientId}`).emit("call:accepted", acceptedPayload);

      acknowledge({
        success: true,
        message: "Call connected",
      });
    });

    socket.on("call:ice-candidate", (payload) => {
      if (
        !isValidCallId(payload.callId) ||
        !isValidObjectId(payload.conversationId) ||
        !isValidIceCandidate(payload.candidate)
      ) {
        return;
      }

      const call = activeCalls.get(payload.callId);

      if (!call || call.conversationId !== payload.conversationId) {
        return;
      }

      const recipientId =
        call.callerId === userId
          ? call.recipientId
          : call.recipientId === userId
            ? call.callerId
            : null;

      if (!recipientId) {
        return;
      }

      io.to(`user:${recipientId}`).emit("call:ice-candidate", {
        callId: call.callId,
        conversationId: call.conversationId,
        candidate: payload.candidate,
      });
    });

    socket.on("call:renegotiate-offer", (payload) => {
      if (
        !isValidCallId(payload.callId) ||
        !isValidObjectId(payload.conversationId) ||
        !isValidSessionDescription(payload.offer, "offer")
      ) {
        return;
      }

      const call = activeCalls.get(payload.callId);

      if (
        !call ||
        call.status !== "active" ||
        call.conversationId !== payload.conversationId ||
        call.callerId !== userId
      ) {
        return;
      }

      io.to(`user:${call.recipientId}`).emit("call:renegotiate-offer", {
        callId: call.callId,
        conversationId: call.conversationId,
        offer: payload.offer,
      });
    });

    socket.on("call:renegotiate-answer", (payload) => {
      if (
        !isValidCallId(payload.callId) ||
        !isValidObjectId(payload.conversationId) ||
        !isValidSessionDescription(payload.answer, "answer")
      ) {
        return;
      }

      const call = activeCalls.get(payload.callId);

      if (
        !call ||
        call.status !== "active" ||
        call.conversationId !== payload.conversationId ||
        call.recipientId !== userId
      ) {
        return;
      }

      io.to(`user:${call.callerId}`).emit("call:renegotiate-answer", {
        callId: call.callId,
        conversationId: call.conversationId,
        answer: payload.answer,
      });
    });

    socket.on("call:end", (payload, acknowledge) => {
      if (
        !isValidCallId(payload.callId) ||
        !isValidObjectId(payload.conversationId)
      ) {
        acknowledge?.({
          success: false,
          message: "Call details are invalid",
        });
        return;
      }

      const call = activeCalls.get(payload.callId);

      if (
        !call ||
        call.conversationId !== payload.conversationId ||
        (call.callerId !== userId && call.recipientId !== userId)
      ) {
        acknowledge?.({
          success: false,
          message: "This call is no longer available",
        });
        return;
      }

      const reason: AudioCallEndReason =
        payload.reason === "cancelled" ||
        payload.reason === "declined" ||
        payload.reason === "failed"
          ? payload.reason
          : "ended";

      endActiveCall(call, reason, userId);

      acknowledge?.({
        success: true,
        message: "Call ended",
      });
    });

    socket.on("call:resume", (payload, acknowledge) => {
      const call = activeCalls.get(payload.callId);

      if (
        !isValidCallId(payload.callId) ||
        !isValidObjectId(payload.conversationId) ||
        !call ||
        call.conversationId !== payload.conversationId
      ) {
        acknowledge({ success: false, message: "This call is no longer available" });
        return;
      }

      if (call.callerId === userId) {
        if (call.callerDisconnectTimeout) {
          clearTimeout(call.callerDisconnectTimeout);
          call.callerDisconnectTimeout = null;
        }
        call.callerSocketId = socket.id;
      } else if (call.recipientId === userId) {
        if (call.recipientDisconnectTimeout) {
          clearTimeout(call.recipientDisconnectTimeout);
          call.recipientDisconnectTimeout = null;
        }
        call.recipientSocketId = socket.id;
      } else {
        acknowledge({ success: false, message: "This call is no longer available" });
        return;
      }

      acknowledge({ success: true, message: "Call reconnected" });
    });

    /**
     * Remove typing indicators if the browser closes before
     * it sends typing:stop.
     */
    socket.on("disconnecting", () => {
      const activeCallId = activeCallByUserId.get(userId);
      const activeCall = activeCallId
        ? activeCalls.get(activeCallId)
        : undefined;

      const socketOwnsActiveCall =
        activeCall &&
        ((activeCall.callerId === userId &&
          activeCall.callerSocketId === socket.id) ||
          (activeCall.recipientId === userId &&
            activeCall.recipientSocketId === socket.id));

      if (socketOwnsActiveCall) {
        const timeoutKey = activeCall.callerId === userId
          ? "callerDisconnectTimeout"
          : "recipientDisconnectTimeout";

        activeCall[timeoutKey] = setTimeout(() => {
          const currentCall = activeCalls.get(activeCall.callId);

          if (currentCall === activeCall) {
            endActiveCall(currentCall, "failed", userId);
          }
        }, 20_000);
      }

      for (const conversationId of activeTypingConversations) {
        void emitTypingUpdate(conversationId, false).catch((error) => {
          console.error("Could not clear typing indicator:", error);
        });
      }

      activeTypingConversations.clear();
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected for user ${userId}: ${reason}`);

      const currentConnectionCount = connectedUserCounts.get(userId) ?? 0;

      /**
       * The user still has another browser tab or device open.
       */
      if (currentConnectionCount > 1) {
        connectedUserCounts.set(userId, currentConnectionCount - 1);

        return;
      }

      /**
       * This was the user's final active socket.
       */
      connectedUserCounts.delete(userId);

      const lastSeenAt = new Date();

      io.emit("presence:update", {
        userId,
        isOnline: false,
        lastSeenAt: lastSeenAt.toISOString(),
      });

      void User.findByIdAndUpdate(userId, {
        lastSeenAt,
      }).catch((error) => {
        console.error(`Could not update last seen for user ${userId}:`, error);
      });
    });
  });

  socketServer = io;

  console.log("Socket.IO server initialized");

  return io;
};

export const getSocketServer = (): ChatSocketServer => {
  if (!socketServer) {
    throw new Error("Socket.IO server has not been initialized");
  }

  return socketServer;
};
