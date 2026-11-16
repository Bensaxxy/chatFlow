export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
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
