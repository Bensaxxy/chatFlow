export const STATUS_BACKGROUNDS = [
  "slate",
  "cyan",
  "violet",
  "emerald",
  "rose",
  "amber",
] as const;

export type StatusBackground = (typeof STATUS_BACKGROUNDS)[number];

export type StatusReactionEmoji = "❤️" | "😂" | "😮" | "😢" | "🔥" | "👏";

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
  expiresAt: string;
  createdAt: string;
  viewCount: number;
  reactionCount: number;
  viewerHasViewed: boolean;
  viewerReaction: StatusReactionEmoji | null;
}

export interface StatusGroup {
  author: StatusAuthor;
  statuses: ChatStatus[];
  hasUnviewedStatuses: boolean;
  latestStatusCreatedAt: string;
  isCurrentUser: boolean;
}

export interface StatusNewPayload {
  statusId: string;
  authorId: string;
}

export interface StatusDeletedPayload {
  statusId: string;
  authorId: string;
}
