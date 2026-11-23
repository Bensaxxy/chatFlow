import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/contexts/auth-context";
import { mobileChatSocket, type MobileChatSocket } from "@/lib/socket/client";

interface SocketContextValue {
  socket: MobileChatSocket;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const [isConnected, setIsConnected] = useState(mobileChatSocket.connected);

  useEffect(() => {
    const handleConnect = (): void => setIsConnected(true);
    const handleDisconnect = (): void => setIsConnected(false);

    mobileChatSocket.on("connect", handleConnect);
    mobileChatSocket.on("disconnect", handleDisconnect);

    if (!isAuthLoading && isAuthenticated && !mobileChatSocket.connected) {
      mobileChatSocket.connect();
    }

    if (!isAuthLoading && !isAuthenticated) {
      mobileChatSocket.disconnect();
    }

    return () => {
      mobileChatSocket.off("connect", handleConnect);
      mobileChatSocket.off("disconnect", handleDisconnect);
    };
  }, [isAuthenticated, isAuthLoading]);

  const value = useMemo<SocketContextValue>(
    () => ({ socket: mobileChatSocket, isConnected }),
    [isConnected],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = (): SocketContextValue => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used inside SocketProvider");
  }

  return context;
};
