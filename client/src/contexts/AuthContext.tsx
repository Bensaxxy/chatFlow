"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  changeUserPassword,
} from "@/services/auth.service";
import {
  removeMyAvatar,
  updateMyChatTheme,
  updateMyPrivacySettings,
  updateMyProfile,
  uploadMyAvatar,
} from "@/services/profile.service";
import type { ChatThemeSettings } from "@/types/chat-theme";
import type { PrivacySettings } from "@/types/privacy";
import type {
  AuthUser,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;

  login: (input: LoginInput) => Promise<AuthUser>;

  register: (input: RegisterInput) => Promise<AuthUser>;

  logout: () => Promise<void>;

  refreshUser: () => Promise<AuthUser | null>;

  updateProfile: (input: UpdateProfileInput) => Promise<AuthUser>;
  changePassword: (input: ChangePasswordInput) => Promise<string>;

  updateAvatar: (file: File) => Promise<AuthUser>;

  removeAvatar: () => Promise<AuthUser>;

  updateChatTheme: (theme: ChatThemeSettings) => Promise<AuthUser>;
  updatePrivacySettings: (privacySettings: PrivacySettings) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const initialCheckStarted = useRef(false);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const currentUser = await getCurrentUser();

      setUser(currentUser);

      return currentUser;
    } catch {
      setUser(null);

      return null;
    }
  }, []);

  useEffect(() => {
    if (initialCheckStarted.current) {
      return;
    }

    initialCheckStarted.current = true;

    const restoreSession = async (): Promise<void> => {
      try {
        await refreshUser();
      } finally {
        setIsAuthLoading(false);
      }
    };

    void restoreSession();
  }, [refreshUser]);

  const login = useCallback(async (input: LoginInput): Promise<AuthUser> => {
    const authenticatedUser = await loginUser(input);

    setUser(authenticatedUser);

    return authenticatedUser;
  }, []);

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthUser> => {
      return registerUser(input);
    },
    [],
  );

  const updateProfile = useCallback(
    async (input: UpdateProfileInput): Promise<AuthUser> => {
      const updatedUser = await updateMyProfile(input);

      setUser(updatedUser);

      return updatedUser;
    },
    [],
  );

  const updateAvatar = useCallback(async (file: File): Promise<AuthUser> => {
    const updatedUser = await uploadMyAvatar(file);

    setUser(updatedUser);

    return updatedUser;
  }, []);

  const removeAvatar = useCallback(async (): Promise<AuthUser> => {
    const updatedUser = await removeMyAvatar();

    setUser(updatedUser);

    return updatedUser;
  }, []);

  const updateChatTheme = useCallback(
    async (theme: ChatThemeSettings): Promise<AuthUser> => {
      const updatedUser = await updateMyChatTheme(theme);

      setUser(updatedUser);

      return updatedUser;
    },
    [],
  );

  const updatePrivacySettings = useCallback(
    async (privacySettings: PrivacySettings): Promise<AuthUser> => {
      const updatedUser = await updateMyPrivacySettings(privacySettings);

      setUser(updatedUser);

      return updatedUser;
    },
    [],
  );

  const changePassword = useCallback(
    async (input: ChangePasswordInput): Promise<string> => {
      const message = await changeUserPassword(input);

      /*
       * The backend clears the authentication cookies
       * after a successful password change.
       */
      setUser(null);

      return message;
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAuthLoading,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      updateAvatar,
      removeAvatar,
      updateChatTheme,
      updatePrivacySettings,
      changePassword,
    }),
    [
      user,
      isAuthLoading,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      updateAvatar,
      removeAvatar,
      updateChatTheme,
      updatePrivacySettings,
      changePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
