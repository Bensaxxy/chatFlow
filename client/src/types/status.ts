export const STATUS_AUDIENCES = [
  "everyone",
  "people_i_chat_with",
  "selected_users",
  "except_users",
] as const;

export type StatusAudience = (typeof STATUS_AUDIENCES)[number];

export const STATUS_BACKGROUNDS = [
  "slate",
  "cyan",
  "violet",
  "emerald",
  "rose",
  "amber",
] as const;

export type StatusBackground = (typeof STATUS_BACKGROUNDS)[number];

export const STATUS_REACTION_EMOJIS = [
  "❤️",
  "😂",
  "😮",
  "😢",
  "🔥",
  "👏",
] as const;

export type StatusReactionEmoji = (typeof STATUS_REACTION_EMOJIS)[number];

export interface StatusAuthor {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio?: string;
  lastSeenAt?: string | null;
}

export interface StatusPhoto {
  url: string;
  width: number | null;
  height: number | null;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  size: number;
}

export interface ChatStatus {
  _id: string;
  author: StatusAuthor;
  type: "text" | "photo";
  text: string;
  photo: StatusPhoto | null;
  backgroundColor: StatusBackground;
  textColor: "light" | "dark";
  audience: StatusAudience;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  reactionCount: number;
  viewerHasViewed: boolean;
  viewerReaction: StatusReactionEmoji | null;
}

export interface StatusViewer {
  user: StatusAuthor;
  viewedAt: string;
}

export interface CreateTextStatusInput {
  text: string;
  backgroundColor: StatusBackground;
  textColor: "light" | "dark";
  audience: StatusAudience;
  selectedUserIds: string[];
  excludedUserIds: string[];
}

export interface CreatePhotoStatusInput {
  photo: File;
  caption?: string;
  audience: StatusAudience;
  selectedUserIds: string[];
  excludedUserIds: string[];
}

export interface StatusNewPayload {
  statusId: string;
  authorId: string;
}

export interface StatusViewedPayload {
  statusId: string;
  viewerId: string;
  viewedAt: string;
}

export interface StatusReactionPayload {
  statusId: string;
  userId: string;
  emoji: StatusReactionEmoji | null;
  reactedAt: string;
}

export interface StatusDeletedPayload {
  statusId: string;
  authorId: string;
}

export interface StatusGroup {
  author: StatusAuthor;
  statuses: ChatStatus[];
  hasUnviewedStatuses: boolean;
  latestStatusCreatedAt: string;
  isCurrentUser: boolean;
}
