"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_CHAT_THEME,
  type ChatThemeSettings,
} from "@/types/chat-theme";

interface ChatThemeContextValue {
  theme: ChatThemeSettings;
  isSavingTheme: boolean;
  updateTheme: (changes: Partial<ChatThemeSettings>) => Promise<void>;
}

const ChatThemeContext = createContext<ChatThemeContextValue | undefined>(
  undefined,
);

interface ChatThemeProviderProps {
  children: ReactNode;
}

export function ChatThemeProvider({ children }: ChatThemeProviderProps) {
  const { user, updateChatTheme } = useAuth();
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  const theme = useMemo<ChatThemeSettings>(
    () => ({
      ...DEFAULT_CHAT_THEME,
      ...user?.chatTheme,
    }),
    [user?.chatTheme],
  );

  const updateTheme = useCallback(
    async (changes: Partial<ChatThemeSettings>): Promise<void> => {
      if (!user || isSavingTheme) {
        return;
      }

      setIsSavingTheme(true);

      try {
        await updateChatTheme({
          ...theme,
          ...changes,
        });
      } finally {
        setIsSavingTheme(false);
      }
    },
    [isSavingTheme, theme, updateChatTheme, user],
  );

  const value = useMemo<ChatThemeContextValue>(
    () => ({
      theme,
      isSavingTheme,
      updateTheme,
    }),
    [isSavingTheme, theme, updateTheme],
  );

  return (
    <ChatThemeContext.Provider value={value}>
      {children}
    </ChatThemeContext.Provider>
  );
}

export const useChatTheme = (): ChatThemeContextValue => {
  const context = useContext(ChatThemeContext);

  if (!context) {
    throw new Error("useChatTheme must be used inside ChatThemeProvider");
  }

  return context;
};
