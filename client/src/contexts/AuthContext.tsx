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
} from "@/services/auth.service";
import {
  removeMyAvatar,
  updateMyProfile,
  uploadMyAvatar,
} from "@/services/profile.service";
import type {
  AuthUser,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
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

  updateAvatar: (file: File) => Promise<AuthUser>;

  removeAvatar: () => Promise<AuthUser>;
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
