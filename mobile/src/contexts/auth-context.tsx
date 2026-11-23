import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { setAuthenticationFailureHandler } from "@/lib/api/client";
import { restoreMobileSession } from "@/lib/auth/mobile-session";
import { loginMobileUser, logoutMobileUser } from "@/services/auth.service";
import type { AuthUser, LoginInput } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUserSession: () => Promise<AuthUser | null>;
  updateCurrentUser: (nextUser: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const refreshUserSession = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const session = await restoreMobileSession();

      const restoredUser = session?.user ?? null;

      setUser(restoredUser);

      return restoredUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async (): Promise<void> => {
      try {
        const session = await restoreMobileSession();

        if (isMounted) {
          setUser(session?.user ?? null);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setAuthenticationFailureHandler(() => {
      setUser(null);
    });

    return () => {
      setAuthenticationFailureHandler(null);
    };
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<AuthUser> => {
    const authenticatedUser = await loginMobileUser(input);

    setUser(authenticatedUser);

    return authenticatedUser;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutMobileUser();
    } finally {
      setUser(null);
    }
  }, []);

  const updateCurrentUser = useCallback((nextUser: AuthUser): void => {
    setUser(nextUser);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAuthLoading,
      login,
      logout,
      refreshUserSession,
      updateCurrentUser,
    }),
    [user, isAuthLoading, login, logout, refreshUserSession, updateCurrentUser],
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
