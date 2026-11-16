import type { SearchUser } from "@/types/user";

export interface ConversationParticipant {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  lastSeenAt: string | null;
}

export interface Conversation {
  _id: string;
  type: "direct" | "group";
  participants: SearchUser[];
  name: string | null;
  avatarUrl: string | null;
  admins: string[];
  createdBy: string;

  lastMessage: {
    deletedFor: string[];
    _id: string;
    content: string;
    type: "text";
    sender: MessageSender;
    createdAt: string;
    editedAt: string | null;
    deletedForEveryoneAt: string | null;
  } | null;

  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDirectConversationData {
  conversation: Conversation;
  created: boolean;
}

export interface MessageSender {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}
