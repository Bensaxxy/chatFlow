"use client";

import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "@/contexts/AuthContext";
import { AudioCallProvider } from "@/contexts/AudioCallContext";
import { ChatThemeProvider } from "@/contexts/ChatThemeContext";
import { SocketProvider } from "@/contexts/SocketContext";
import MessageNotificationFeedback from "@/components/shared/MessageNotificationFeedback";

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <ChatThemeProvider>
        <SocketProvider>
          <AudioCallProvider>{children}</AudioCallProvider>
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
