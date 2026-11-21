import type { ChatThemeSettings } from "@/types/chat-theme";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  chatTheme: ChatThemeSettings;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUserData {
  user: AuthUser;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  bio?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
