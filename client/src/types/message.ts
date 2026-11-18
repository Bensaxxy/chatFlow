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

export interface RepliedMessage {
  _id: string;
  content: string;
  sender: MessageSender;
  deletedFor: string[];
  deletedForEveryoneAt: string | null;
  editedAt: string | null;
  createdAt: string;
}

export interface ChatMessage {
  _id: string;
  conversation: string;
  sender: MessageSender;
  type: "text";
  content: string;
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
