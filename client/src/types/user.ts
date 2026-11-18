export interface SearchUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface PublicUserProfile {
  _id: string;
  name: string;
  avatarUrl: string | null;
  bio: string;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RealtimeUserProfile {
  _id: string;
  name: string;
  avatarUrl: string | null;
  bio: string;
  updatedAt: string;
}

export interface UserProfileUpdatedPayload {
  user: RealtimeUserProfile;
}
