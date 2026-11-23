"use client";

import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import MessageNotificationFeedback from "@/components/shared/MessageNotificationFeedback";
import { AudioCallProvider } from "@/contexts/AudioCallContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatThemeProvider } from "@/contexts/ChatThemeContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { StatusProvider } from "@/contexts/StatusContext";

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <ChatThemeProvider>
        <SocketProvider>
          <StatusProvider>
            <AudioCallProvider>{children}</AudioCallProvider>
          </StatusProvider>

          <MessageNotificationFeedback />

          <ToastContainer
            position="top-right"
            autoClose={4000}
            newestOnTop
            closeOnClick
            pauseOnHover
            limit={3}
            theme="colored"
          />
        </SocketProvider>
      </ChatThemeProvider>
    </AuthProvider>
  );
}
