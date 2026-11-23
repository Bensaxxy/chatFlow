import type {
  ChatThemeSettings,
  NotificationSettings,
  PrivacySettings,
} from "@/types/settings";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  chatTheme: ChatThemeSettings;
  privacySettings: PrivacySettings;
  notificationSettings: NotificationSettings;
  isEmailVerified: boolean;
  emailVerifiedAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface VerifyEmailInput {
  email: string;
  code: string;
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

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface MobileAuthData {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}
