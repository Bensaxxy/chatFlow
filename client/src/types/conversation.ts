import type { MessageAttachment, MessageLinkPreview } from "@/types/message";
import type { SearchUser } from "@/types/user";

export interface ConversationParticipant {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  lastSeenAt: string | null;
}

export interface MessageSender {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface ConversationLastMessage {
  _id: string;
  clientMessageId?: string | null;
  content: string;
  type: "text" | "image" | "file" | "audio";
  attachment: MessageAttachment | null;
  linkPreview?: MessageLinkPreview | null;
  sender: MessageSender;
  createdAt: string;
  editedAt: string | null;
  deletedFor: string[];
  deletedForEveryoneAt: string | null;
  isForwarded?: boolean;
}

export interface Conversation {
  _id: string;
  type: "direct" | "group";
  participants: SearchUser[];
  name: string | null;
  avatarUrl: string | null;
  admins: string[];
  createdBy: string;
  lastMessage: ConversationLastMessage | null;
  unreadCount?: number;
  isPinned?: boolean;
  isMarkedUnread?: boolean;
  clearedAt?: string | null;
  directMessagingAccess?: {
    isBlockedByCurrentUser: boolean;
    canMessage: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationPreferences {
  isPinned: boolean;
  isMarkedUnread: boolean;
  clearedAt: string | null;
}

export interface CreateDirectConversationData {
  conversation: Conversation;
  created: boolean;
}
