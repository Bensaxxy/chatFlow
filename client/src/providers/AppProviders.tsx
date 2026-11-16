"use client";

import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <SocketProvider>
        {children}

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
    </AuthProvider>
  );
}
