import { parse } from "cookie";
import { isValidObjectId } from "mongoose";
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

import { env } from "../config/env";
import { Conversation } from "../models/conversation.model";
import { verifyAccessToken, verifySocketToken } from "../utils/auth-tokens";
import { User } from "../models/user.model";

interface SocketResult {
  success: boolean;
  message: string;
}

interface TypingUpdatePayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

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
        .select("participants")
        .lean();

      if (!conversation) {
        return;
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

    /**
     * Remove typing indicators if the browser closes before
     * it sends typing:stop.
     */
    socket.on("disconnecting", () => {
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
