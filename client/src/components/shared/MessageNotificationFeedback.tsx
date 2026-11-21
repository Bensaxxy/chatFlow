"use client";

import { useEffect } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { playMessageFeedback } from "@/lib/notifications/message-feedback";
import type { ChatMessage } from "@/types/message";

export default function MessageNotificationFeedback() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!user || !isConnected) {
      return;
    }

    const handleIncomingMessage = ({ message }: { message: ChatMessage }) => {
      if (
        message.sender._id === user._id ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      playMessageFeedback({
        sound: user.notificationSettings?.messageSound ?? "chime",
        vibration: user.notificationSettings?.vibration !== false,
      });
    };

    socket.on("message:new", handleIncomingMessage);

    return () => {
      socket.off("message:new", handleIncomingMessage);
    };
  }, [isConnected, socket, user]);

  return null;
}
