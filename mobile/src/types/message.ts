import type { ConversationUser } from "@/types/conversation";

export interface ChatMessage {
  _id: string;
  clientMessageId?: string | null;
  conversation: string;
  sender: ConversationUser;
  content: string;
  type: "text" | "image" | "file" | "audio";
  attachment: {
    url: string;
    fileName: string;
    mimeType: string;
  } | null;
  editedAt: string | null;
  deletedForEveryoneAt: string | null;
  createdAt: string;
  deliveryStatus?: "sending" | "failed";
}

export interface MessagePage {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}
