import type { MessageSender } from "@/types/conversation";

export type DeleteMessageScope = "me" | "everyone";

export interface MessageDeletedPayload {
  conversationId: string;
  messageId: string;
  deletedByUserId: string;
  scope: DeleteMessageScope;
  deletedForEveryoneAt: string | null;
}

export const MESSAGE_REACTION_EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🙏",
] as const;

export type MessageReactionEmoji = (typeof MESSAGE_REACTION_EMOJIS)[number];

export interface MessageReaction {
  emoji: MessageReactionEmoji;
  user: string;
  reactedAt: string;
}

export interface MessageAttachment {
  url: string;
  resourceType: "image" | "raw" | "video";
  fileName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
}

export interface MessageLinkPreview {
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  status: "loading" | "ready" | "failed";
}

export interface RepliedMessage {
  _id: string;
  content: string;
  type: "text" | "image" | "file" | "audio";
  attachment: MessageAttachment | null;
  linkPreview?: MessageLinkPreview | null;
  sender: MessageSender;
  isForwarded: boolean;
  deletedFor: string[];
  deletedForEveryoneAt: string | null;
  editedAt: string | null;
  createdAt: string;
}

export interface ChatMessage {
  _id: string;
  conversation: string;
  sender: MessageSender;
  type: "text" | "image" | "file" | "audio";
  content: string;
  attachment: MessageAttachment | null;
  linkPreview?: MessageLinkPreview | null;
  replyTo: RepliedMessage | null;
  isForwarded: boolean;
  deliveredTo: string[];
  readBy: string[];
  reactions: MessageReaction[];
  editedAt: string | null;
  deletedFor: string[];
  deletedForEveryoneAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessagesPage {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}
