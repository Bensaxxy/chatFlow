import type { ConversationUser } from "@/types/conversation";

export type MessageReactionEmoji = "👍" | "❤️" | "😂" | "😮" | "😢" | "🙏";

export interface MessageReaction {
  emoji: MessageReactionEmoji;
  user: string;
  reactedAt: string;
}

export interface MessageAttachment {
  url: string;
  fileName: string;
  mimeType: string;
  size?: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
}

export interface ChatMessage {
  _id: string;
  clientMessageId?: string | null;
  conversation: string;
  sender: ConversationUser;
  content: string;
  type: "text" | "image" | "file" | "audio";
  attachment: MessageAttachment | null;
  editedAt: string | null;
  deletedForEveryoneAt: string | null;
  reactions: MessageReaction[];
  createdAt: string;
  deliveryStatus?: "sending" | "failed";
}

export interface MessagePage {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}
