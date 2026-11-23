export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
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

export interface MobileAuthData {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}
